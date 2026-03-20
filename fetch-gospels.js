#!/usr/bin/env node
/**
 * fetch-gospels.js
 * Scarica i vangeli da Evangelizo.org per i prossimi N giorni
 * e li aggiunge a gospels.json senza cancellare quelli già presenti.
 *
 * LIMITE API: Evangelizo non permette date oltre 30 giorni nel futuro.
 * Per questo lo script scarica una finestra mobile di giorni.
 *
 * Uso: node fetch-gospels.js          → prossimi 35 giorni (default)
 *      node fetch-gospels.js 60       → prossimi 60 giorni
 */

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const OUTPUT_FILE = path.join(__dirname, 'gospels.json');
const EVANGELIZO  = 'https://feed.evangelizo.org/v2/reader.php';
const DELAY_MS    = 300;
const SAVE_EVERY  = 10;

// Quanti giorni nel futuro scaricare (max 30 per i limiti API)
const DAYS_AHEAD  = parseInt(process.argv[2]) || 28;

// ─── Helpers ─────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function evangelizoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 20000 }, res => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', c => data += c);
      res.on('end',  () => resolve(data.trim()));
    });
    req.on('error',   reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function apiGet(params) {
  const url = `${EVANGELIZO}?${new URLSearchParams(params)}`;
  return (await httpGet(url)) || '';
}

async function fetchGospelDay(dateStr, lang) {
  const base = { date: dateStr, lang };
  const [reference, text] = await Promise.all([
    apiGet({ ...base, type: 'reading_lt', content: 'GSP' }),
    apiGet({ ...base, type: 'reading',    content: 'GSP' }),
  ]);
  return { reference, text };
}

// ─── Main ─────────────────────────────────────────────────
async function main() {
  // Carica il file esistente
  let gospels = {};
  if (fs.existsSync(OUTPUT_FILE)) {
    try { gospels = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8')); }
    catch (_) { gospels = {}; }
  }

  // Finestra di date: da ieri a DAYS_AHEAD giorni nel futuro
  const dates = [];
  for (let i = -1; i <= DAYS_AHEAD; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dates.push(d);
  }

  let downloaded = 0, skipped = 0, errors = 0;

  console.log(`\n✝  Evangelizo — finestra mobile di ${DAYS_AHEAD} giorni`);
  console.log(`   Da: ${isoDate(dates[0])} → ${isoDate(dates[dates.length-1])}\n`);

  for (let i = 0; i < dates.length; i++) {
    const d       = dates[i];
    const iso     = isoDate(d);
    const dateStr = evangelizoDate(d);

    // Salta se già presente con testo
    if (gospels[iso]?.romano?.text) {
      skipped++;
      process.stdout.write(`\r   [${i+1}/${dates.length}] ⏩  ${iso} già presente`);
      continue;
    }

    process.stdout.write(`\r   [${i+1}/${dates.length}] ⬇  ${iso} ...              `);

    try {
      const romano = await fetchGospelDay(dateStr, 'IT');
      await sleep(DELAY_MS);

      if (!romano.text) {
        throw new Error('testo vuoto (data fuori range API?)');
      }

      gospels[iso] = {
        romano:     { reference: romano.reference, text: romano.text },
        ambrosiano: { reference: romano.reference, text: romano.text },
      };

      downloaded++;

      if (downloaded % SAVE_EVERY === 0) {
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(gospels, null, 2), 'utf8');
      }

    } catch (err) {
      errors++;
      process.stdout.write(`\r   [${i+1}/${dates.length}] ❌  ${iso}: ${err.message}\n`);
    }
  }

  // Salva finale ordinato per data
  const sorted = Object.fromEntries(
    Object.entries(gospels)
      .filter(([, v]) => v.romano?.text)          // rimuovi voci vuote
      .sort(([a], [b]) => a.localeCompare(b))
  );

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(sorted, null, 2), 'utf8');

  const total  = Object.keys(sorted).length;
  const sizeKB = Math.round(fs.statSync(OUTPUT_FILE).size / 1024);

  console.log(`\n\n✅  Completato!`);
  console.log(`   Nuovi: ${downloaded}  |  Saltati: ${skipped}  |  Errori: ${errors}`);
  console.log(`   Totale giorni salvati: ${total}  (${sizeKB} KB)\n`);
}

main().catch(err => { console.error('\nErrore:', err); process.exit(1); });
