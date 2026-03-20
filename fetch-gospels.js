#!/usr/bin/env node
/**
 * fetch-gospels.js
 * Scarica i vangeli da Evangelizo.org per uno o più anni
 * e li aggiunge a gospels.json (aggiorna senza sovrascrivere i giorni già presenti).
 *
 * Uso: node fetch-gospels.js 2026
 *      node fetch-gospels.js 2026 2027
 */

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const OUTPUT_FILE  = path.join(__dirname, 'gospels.json');
const EVANGELIZO   = 'https://feed.evangelizo.org/v2/reader.php';
const DELAY_MS     = 250; // pausa tra richieste per non sovraccaricare il server
const SAVE_EVERY   = 20;  // checkpoint ogni N giorni

// ─── Argomenti ───────────────────────────────────────────
const args  = process.argv.slice(2).map(Number).filter(y => y > 2000 && y < 2100);
if (!args.length) {
  console.error('Uso: node fetch-gospels.js ANNO [ANNO2 ...]');
  console.error('Es:  node fetch-gospels.js 2027');
  process.exit(1);
}

const startYear = Math.min(...args);
const endYear   = Math.max(...args);
const startDate = new Date(startYear, 0, 1);
const endDate   = new Date(endYear, 11, 31);

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
  const txt = await httpGet(url);
  return txt || '';
}

// Recupera riferimento + testo del vangelo per una data e lingua
async function fetchGospelDay(dateStr, lang) {
  const base = { date: dateStr, lang };
  const [reference, text] = await Promise.all([
    apiGet({ ...base, type: 'reading_lt', content: 'GSP' }),
    apiGet({ ...base, type: 'reading',    content: 'GSP' }),
  ]);
  return { reference, text };
}

// Tutte le date nell'intervallo
function dateRange(start, end) {
  const dates = [];
  const cur   = new Date(start);
  while (cur <= end) { dates.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }
  return dates;
}

// ─── Main ─────────────────────────────────────────────────
async function main() {
  // Carica il file esistente (se c'è)
  let gospels = {};
  if (fs.existsSync(OUTPUT_FILE)) {
    try { gospels = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8')); }
    catch (_) { gospels = {}; }
  }

  const dates = dateRange(startDate, endDate);
  let downloaded = 0, skipped = 0, errors = 0;

  console.log(`\n✝  Evangelizo Gospel Fetcher — anni ${startYear}–${endYear}`);
  console.log(`   Giorni da elaborare: ${dates.length}\n`);

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

    process.stdout.write(`\r   [${i+1}/${dates.length}] ⬇  ${iso} ...                   `);

    try {
      // Rito Romano (IT) — testo ufficiale
      const romano = await fetchGospelDay(dateStr, 'IT');
      await sleep(DELAY_MS);

      gospels[iso] = {
        romano: {
          reference: romano.reference,
          text:      romano.text,
        },
        // Per l'ambrosiano usiamo lo stesso testo romano come base
        // (Evangelizo non ha un calendario ambrosiano italiano separato)
        ambrosiano: {
          reference: romano.reference,
          text:      romano.text,
        },
      };

      downloaded++;

      if (downloaded % SAVE_EVERY === 0) {
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(gospels, null, 2), 'utf8');
      }

    } catch (err) {
      errors++;
      process.stdout.write(`\r   [${i+1}/${dates.length}] ❌  ${iso}: ${err.message}\n`);
      gospels[iso] = gospels[iso] || {
        romano:     { reference: '', text: '' },
        ambrosiano: { reference: '', text: '' },
      };
    }
  }

  // Salvataggio finale ordinato per data
  const sorted = Object.fromEntries(
    Object.entries(gospels).sort(([a], [b]) => a.localeCompare(b))
  );
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(sorted, null, 2), 'utf8');

  const totalDays = Object.keys(sorted).length;
  const sizeKB    = Math.round(fs.statSync(OUTPUT_FILE).size / 1024);

  console.log(`\n\n✅  Completato!`);
  console.log(`   Nuovi giorni scaricati : ${downloaded}`);
  console.log(`   Già presenti (saltati) : ${skipped}`);
  console.log(`   Errori                 : ${errors}`);
  console.log(`   Totale giorni nel file : ${totalDays}`);
  console.log(`   Dimensione gospels.json: ${sizeKB} KB\n`);
}

main().catch(err => { console.error('\nErrore:', err); process.exit(1); });
