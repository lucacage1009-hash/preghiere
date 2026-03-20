#!/usr/bin/env node
/**
 * fetch-gospels.js — finestra mobile, testo pulito + commento
 * Uso: node fetch-gospels.js [giorni_avanti]   default = 28
 */
'use strict';

const https = require('https');
const http  = require('http');
const fs    = require('fs');
const path  = require('path');

const OUTPUT_FILE = path.join(__dirname, 'gospels.json');
const EVANGELIZO  = 'https://feed.evangelizo.org/v2/reader.php';
const DELAY_MS    = 320;
const SAVE_EVERY  = 8;
const DAYS_AHEAD  = parseInt(process.argv[2]) || 28;

const sleep = ms => new Promise(r => setTimeout(r, ms));

function isoDate(d)        { return d.toISOString().slice(0, 10); }
function evaDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}${m}${day}`;
}

// ─── HTTP GET (segue redirect) ───────────────────────────
function httpGet(url, redirects = 5) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { timeout: 20000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GospelFetcher/1.0)' }
    }, res => {
      if ([301,302,303,307,308].includes(res.statusCode) && res.headers.location && redirects > 0) {
        return resolve(httpGet(res.headers.location, redirects - 1));
      }
      let data = '';
      res.setEncoding('utf8');
      res.on('data', c => data += c);
      res.on('end',  () => resolve(data.trim()));
    });
    req.on('error',   reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

// ─── Pulisce il testo grezzo dell'API ────────────────────
function cleanText(raw) {
  return raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')              // strip tutti i tag HTML
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n))
    .replace(/&apos;/g, "'").replace(/&quot;/g, '"')
    // Rimuove la riga del copyright CEI / evangelizo
    .replace(/Copyright\s*@[^\n]*/gi, '')
    .replace(/Per ricevere il Vangelo[^\n]*/gi, '')
    .replace(/vangelodelgiorno\.org[^\n]*/gi, '')
    // Pulisce linee vuote in eccesso
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)
    .join('\n');
}

// ─── Evangelizo API ──────────────────────────────────────
async function apiGet(params) {
  const url = `${EVANGELIZO}?${new URLSearchParams(params)}`;
  return (await httpGet(url)) || '';
}

async function fetchEvangelize(dateStr, lang) {
  const base = { date: dateStr, lang };
  const [ref, text, commentTitle, commentAuthor, commentText] = await Promise.all([
    apiGet({ ...base, type: 'reading_lt', content: 'GSP' }),
    apiGet({ ...base, type: 'reading',    content: 'GSP' }),
    apiGet({ ...base, type: 'comment_t' }),
    apiGet({ ...base, type: 'comment_a' }),
    apiGet({ ...base, type: 'comment'   }),
  ]);
  return {
    reference:     cleanText(ref),
    text:          cleanText(text),
    commentTitle:  cleanText(commentTitle),
    commentAuthor: cleanText(commentAuthor),
    commentText:   cleanText(commentText),
  };
}

// ─── Vangelo Ambrosiano da vangelodelgiorno.org ──────────
async function fetchAmbrosiano(d) {
  const y   = d.getFullYear();
  const m   = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');

  // Prova URL con data specifica
  const urls = [
    `https://vangelodelgiorno.org/ambrosiano/${y}/${m}/${day}/`,
    `https://vangelodelgiorno.org/ambrosiano/`,
  ];

  for (const url of urls) {
    try {
      const html = await httpGet(url);
      if (!html || html.length < 500) continue;

      // Estrai testo e riferimento con regex semplici (no DOMParser in Node)
      // Cerca il titolo del vangelo
      let ref = '';
      const refMatch = html.match(/<h[123][^>]*>(Dal Vangelo[^<]*)<\/h[123]>/i)
                    || html.match(/class="[^"]*gospel[^"]*"[^>]*>(Dal Vangelo[^<]*)</i)
                    || html.match(/<strong>(Dal Vangelo[^<]*)<\/strong>/i);
      if (refMatch) ref = cleanText(refMatch[1]);

      // Cerca blocco testo principale
      let rawText = '';
      const articleMatch = html.match(/<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i)
                        || html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)
                        || html.match(/<div[^>]*class="[^"]*post-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
      if (articleMatch) {
        rawText = cleanText(articleMatch[1]);
        // Filtro: tieni solo righe abbastanza lunghe (corpo del vangelo)
        rawText = rawText.split('\n')
          .filter(l => l.length > 30)
          .slice(0, 20)
          .join('\n');
      }

      if (rawText && rawText.length > 100) {
        return { reference: ref || 'Vangelo del Giorno — Rito Ambrosiano', text: rawText };
      }
    } catch (_) { /* prova prossimo URL */ }
  }

  return null; // fallback al romano
}

// ─── Main ─────────────────────────────────────────────────
async function main() {
  let gospels = {};
  if (fs.existsSync(OUTPUT_FILE)) {
    try { gospels = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8')); }
    catch (_) {}
  }

  const dates = [];
  for (let i = -1; i <= DAYS_AHEAD; i++) {
    const d = new Date(); d.setDate(d.getDate() + i); dates.push(new Date(d));
  }

  let downloaded = 0, skipped = 0, errors = 0;
  console.log(`\n✝  Evangelizo — ${DAYS_AHEAD} giorni  (${isoDate(dates[0])} → ${isoDate(dates[dates.length-1])})\n`);

  for (let i = 0; i < dates.length; i++) {
    const d       = dates[i];
    const iso     = isoDate(d);
    const dateStr = evaDate(d);

    if (gospels[iso]?.romano?.text) {
      skipped++;
      process.stdout.write(`\r   [${i+1}/${dates.length}] ⏩  ${iso}`);
      continue;
    }

    process.stdout.write(`\r   [${i+1}/${dates.length}] ⬇  ${iso} ...              `);

    try {
      const romano = await fetchEvangelize(dateStr, 'IT');
      if (!romano.text) throw new Error('testo vuoto');

      await sleep(DELAY_MS);

      // Prova ambrosiano reale, altrimenti usa romano come base
      let ambrosiano = null;
      try { ambrosiano = await fetchAmbrosiano(d); } catch (_) {}
      await sleep(DELAY_MS / 2);

      gospels[iso] = {
        romano: {
          reference:     romano.reference,
          text:          romano.text,
          commentTitle:  romano.commentTitle,
          commentAuthor: romano.commentAuthor,
          commentText:   romano.commentText,
        },
        ambrosiano: ambrosiano
          ? {
              reference:     ambrosiano.reference,
              text:          ambrosiano.text,
              commentTitle:  romano.commentTitle,   // stesso commento
              commentAuthor: romano.commentAuthor,
              commentText:   romano.commentText,
            }
          : {
              reference:     romano.reference + ' (rito romano)',
              text:          romano.text,
              commentTitle:  romano.commentTitle,
              commentAuthor: romano.commentAuthor,
              commentText:   romano.commentText,
            },
      };

      downloaded++;
      if (downloaded % SAVE_EVERY === 0)
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(gospels, null, 2), 'utf8');

    } catch (err) {
      errors++;
      process.stdout.write(`\n   ❌  ${iso}: ${err.message}\n`);
    }
  }

  const sorted = Object.fromEntries(
    Object.entries(gospels)
      .filter(([, v]) => v.romano?.text)
      .sort(([a],[b]) => a.localeCompare(b))
  );
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(sorted, null, 2), 'utf8');

  const total = Object.keys(sorted).length;
  const kb    = Math.round(fs.statSync(OUTPUT_FILE).size / 1024);
  console.log(`\n\n✅  Nuovi: ${downloaded}  |  Saltati: ${skipped}  |  Errori: ${errors}`);
  console.log(`   Totale: ${total} giorni  (${kb} KB)\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
