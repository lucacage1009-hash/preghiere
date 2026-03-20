#!/usr/bin/env node
'use strict';
/**
 * fetch-gospels.js
 * Finestra mobile: scarica i prossimi N giorni dall'API Evangelizo.
 * Tenta anche il vangelo ambrosiano da laparola.it.
 * Uso: node fetch-gospels.js [giorni]   default=28
 */
const https = require('https');
const http  = require('http');
const fs    = require('fs');
const path  = require('path');

const OUTPUT   = path.join(__dirname, 'gospels.json');
const EVA_BASE = 'https://feed.evangelizo.org/v2/reader.php';
const DAYS     = parseInt(process.argv[2]) || 28;
const DELAY    = 350;
const SAVE_N   = 8;
const sleep    = ms => new Promise(r => setTimeout(r, ms));

function isoDate(d) { return d.toISOString().slice(0,10); }
function evaDate(d) {
  return String(d.getFullYear())
    + String(d.getMonth()+1).padStart(2,'0')
    + String(d.getDate()).padStart(2,'0');
}

function httpGet(url, hops=5) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, {
      timeout: 20000,
      headers: {'User-Agent':'Mozilla/5.0 (compatible; GospelBot/3.0)'}
    }, res => {
      if ([301,302,303,307,308].includes(res.statusCode)
          && res.headers.location && hops > 0)
        return resolve(httpGet(res.headers.location, hops-1));
      let d = ''; res.setEncoding('utf8');
      res.on('data', c => d += c);
      res.on('end',  () => resolve(d.trim()));
    });
    req.on('error',   reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function clean(raw) {
  return (raw || '')
    .replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/&nbsp;/g,' ').replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(n))
    .replace(/Copyright[^\n]*/gi,'')
    .replace(/Per ricevere il Vangelo[^\n]*/gi,'')
    .replace(/vangelodelgiorno\.org[^\n]*/gi,'')
    .split('\n').map(l=>l.trim()).filter(l=>l.length>0).join('\n');
}

async function evaGet(params) {
  const url = EVA_BASE + '?' + new URLSearchParams(params);
  return clean(await httpGet(url));
}

async function fetchRomano(dateStr) {
  const base = { date: dateStr, lang: 'IT' };
  const [ref, text, ct, ca, cb] = await Promise.all([
    evaGet({...base, type:'reading_lt', content:'GSP'}),
    evaGet({...base, type:'reading',    content:'GSP'}),
    evaGet({...base, type:'comment_t'}),
    evaGet({...base, type:'comment_a'}),
    evaGet({...base, type:'comment'}),
  ]);
  return { reference:ref, text, commentTitle:ct, commentAuthor:ca, commentText:cb };
}

// Ambrosiano: usa laparola.it
async function fetchAmbrosiano(d) {
  // laparola.it mostra il vangelo ambrosiano del giorno corrente
  // Non ha URL per data specifica, quindi va bene solo per oggi.
  // Per i giorni futuri usiamo il testo romano come fallback.
  const today = new Date();
  const isToday = isoDate(d) === isoDate(today);
  if (!isToday) return null;

  const url = 'https://www.laparola.it/ambrosiano/liturgia-della-parola/';
  try {
    const html = await httpGet(url);
    if (!html || html.length < 400) return null;

    // Cerca il titolo del vangelo (Dal Vangelo...)
    let ref = '';
    const rm = html.match(/Dal Vangelo[^<"]{5,100}/i)
            || html.match(/Vangelo secondo[^<"]{5,80}/i);
    if (rm) ref = clean(rm[0]);

    // Cerca paragrafi del vangelo — laparola.it usa div.lettura o div.testo
    const blocks = [
      html.match(/<div[^>]+class="[^"]*lettura[^"]*"[^>]*>([\s\S]{100,6000}?)<\/div>/i),
      html.match(/<div[^>]+class="[^"]*testo[^"]*"[^>]*>([\s\S]{100,6000}?)<\/div>/i),
      html.match(/<div[^>]+class="[^"]*vangelo[^"]*"[^>]*>([\s\S]{100,6000}?)<\/div>/i),
      html.match(/<article[^>]*>([\s\S]{200,10000}?)<\/article>/i),
    ];

    for (const m of blocks) {
      if (!m) continue;
      const lines = clean(m[1]).split('\n').filter(l => l.length > 20).slice(0, 20);
      if (lines.length >= 2) {
        return { reference: ref || 'Vangelo Ambrosiano del Giorno', text: lines.join('\n') };
      }
    }
  } catch(e) { /* fallback */ }
  return null;
}

async function main() {
  let gospels = {};
  if (fs.existsSync(OUTPUT)) {
    try { gospels = JSON.parse(fs.readFileSync(OUTPUT,'utf8')); } catch(_) {}
  }

  const dates = [];
  for (let i = -1; i <= DAYS; i++) {
    const d = new Date(); d.setDate(d.getDate() + i); dates.push(new Date(d));
  }

  let dl=0, sk=0, err=0;
  const fmt = d => isoDate(d);
  console.log('\n' + String.fromCodePoint(0x271D) + '  Vangeli  ['
    + fmt(dates[0]) + ' \u2192 ' + fmt(dates[dates.length-1]) + ']\n');

  for (let i=0; i<dates.length; i++) {
    const d   = dates[i];
    const iso = isoDate(d);
    const ds  = evaDate(d);

    if (gospels[iso] && gospels[iso].romano && gospels[iso].romano.text) {
      sk++;
      process.stdout.write('\r   [' + (i+1) + '/' + dates.length + '] ' + iso + ' gia\u2019 presente');
      continue;
    }

    process.stdout.write('\r   [' + (i+1) + '/' + dates.length + '] ' + iso + ' ...           ');

    try {
      const romano = await fetchRomano(ds);
      if (!romano.text) throw new Error('testo vuoto');
      await sleep(DELAY);

      let ambrosiano = null;
      try { ambrosiano = await fetchAmbrosiano(d); await sleep(DELAY/2); } catch(_) {}

      gospels[iso] = {
        romano,
        ambrosiano: ambrosiano
          ? {
              reference:     ambrosiano.reference,
              text:          ambrosiano.text,
              commentTitle:  romano.commentTitle,
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

      dl++;
      if (dl % SAVE_N === 0)
        fs.writeFileSync(OUTPUT, JSON.stringify(gospels, null, 2), 'utf8');
    } catch(e) {
      err++;
      process.stdout.write('\n   !! ' + iso + ': ' + e.message + '\n');
    }
  }

  const sorted = Object.fromEntries(
    Object.entries(gospels)
      .filter(([,v]) => v.romano && v.romano.text)
      .sort(([a],[b]) => a.localeCompare(b))
  );
  fs.writeFileSync(OUTPUT, JSON.stringify(sorted, null, 2), 'utf8');
  const kb = Math.round(fs.statSync(OUTPUT).size / 1024);
  console.log('\n\nFatto: ' + dl + ' nuovi, ' + sk + ' saltati, ' + err + ' errori | '
    + Object.keys(sorted).length + ' totale (' + kb + ' KB)\n');
}

main().catch(e => { console.error(e); process.exit(1); });
