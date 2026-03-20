#!/usr/bin/env node
'use strict';
/* fetch-gospels.js — scarica vangeli (romano + ambrosiano) da Evangelizo + vangelodelgiorno.org */
const https = require('https');
const http  = require('http');
const fs    = require('fs');
const path  = require('path');

const OUTPUT  = path.join(__dirname, 'gospels.json');
const EVA     = 'https://feed.evangelizo.org/v2/reader.php';
const DAYS    = parseInt(process.argv[2]) || 28;
const DELAY   = 350;
const SAVE_N  = 8;
const sleep   = ms => new Promise(r => setTimeout(r, ms));

function isoDate(d) { return d.toISOString().slice(0,10); }
function evaDate(d) {
  return d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0');
}

function httpGet(url, hops=5) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, {
      timeout: 25000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GospelBot/3.0)',
        'Accept': 'text/html,application/xhtml+xml,*/*',
        'Accept-Language': 'it-IT,it;q=0.9',
      }
    }, res => {
      if ([301,302,303,307,308].includes(res.statusCode) && res.headers.location && hops>0)
        return resolve(httpGet(res.headers.location, hops-1));
      let d=''; res.setEncoding('utf8');
      res.on('data', c => d+=c);
      res.on('end', () => resolve(d));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function clean(raw) {
  return (raw||'')
    .replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]+>/g,'')
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/&nbsp;/g,' ').replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(n))
    .replace(/&apos;/g,"'").replace(/&quot;/g,'"')
    .replace(/Copyright[^\n]*/gi,'').replace(/Per ricevere il Vangelo[^\n]*/gi,'')
    .replace(/vangelodelgiorno\.org[^\n]*/gi,'')
    .split('\n').map(l=>l.trim()).filter(l=>l.length>0).join('\n');
}

async function evaGet(params) {
  const url = `${EVA}?${new URLSearchParams(params)}`;
  return clean(await httpGet(url));
}

async function fetchRomano(ds) {
  const base = {date:ds, lang:'IT'};
  const [ref,text,ct,ca,cb] = await Promise.all([
    evaGet({...base, type:'reading_lt', content:'GSP'}),
    evaGet({...base, type:'reading',    content:'GSP'}),
    evaGet({...base, type:'comment_t'}),
    evaGet({...base, type:'comment_a'}),
    evaGet({...base, type:'comment'}),
  ]);
  return {reference:ref, text, commentTitle:ct, commentAuthor:ca, commentText:cb};
}

/* Ambrosiano from vangelodelgiorno.org/ambrosiano/
   The page has a daily update — we try:
   1. /ambrosiano/YYYY/MM/DD/
   2. /YYYY/MM/DD/ with keyword filter
   3. /ambrosiano/ (today's page)
*/
async function fetchAmbrosiano(d) {
  const y  = d.getFullYear();
  const m  = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');

  const urls = [
    `https://vangelodelgiorno.org/ambrosiano/${y}/${m}/${dd}/`,
    `https://vangelodelgiorno.org/ambrosiano/`,
  ];

  for (const url of urls) {
    try {
      const html = await httpGet(url);
      if (!html || html.length < 400) continue;

      /* Reference: look for "Dal Vangelo..." pattern */
      let ref = '';
      const rm = html.match(/Dal\s+Vangelo\s+di\s+Ges[^<"]{5,100}/i)
              || html.match(/Dal\s+Vangelo\s+secondo\s+[^<"]{5,80}/i)
              || html.match(/Vangelo\s+secondo\s+[^<"]{5,80}/i);
      if (rm) ref = clean(rm[0]).slice(0,120);

      /* Extract text from multiple possible containers */
      const selectors = [
        /<div[^>]+class="[^"]*entry-content[^"]*"[^>]*>([\s\S]{200,8000}?)<\/div>/i,
        /<div[^>]+class="[^"]*post-content[^"]*"[^>]*>([\s\S]{200,8000}?)<\/div>/i,
        /<div[^>]+class="[^"]*td-post-content[^"]*"[^>]*>([\s\S]{200,8000}?)<\/div>/i,
        /<div[^>]+class="[^"]*content[^"]*"[^>]*>([\s\S]{200,8000}?)<\/div>/i,
        /<article[^>]*>([\s\S]{300,12000}?)<\/article>/i,
      ];

      for (const re of selectors) {
        const m2 = html.match(re);
        if (!m2) continue;
        const lines = clean(m2[1]).split('\n')
          .filter(l => l.length > 30 && !/menu|footer|header|cookie|copyright|subscribe/i.test(l))
          .slice(0, 30);
        if (lines.length >= 3 && lines.join(' ').length > 150) {
          return { reference: ref || 'Vangelo del Giorno — Rito Ambrosiano', text: lines.join('\n') };
        }
      }
    } catch(e) {
      console.log('      ambrosiano fetch error:', url, e.message);
    }
  }
  return null;
}

async function main() {
  let gospels = {};
  if (fs.existsSync(OUTPUT)) { try { gospels = JSON.parse(fs.readFileSync(OUTPUT,'utf8')); } catch(_){} }

  const dates = [];
  for (let i=-1; i<=DAYS; i++) {
    const d = new Date(); d.setDate(d.getDate()+i); dates.push(new Date(d));
  }

  let dl=0, sk=0, err=0, ambOk=0;
  console.log(`\n✝  Vangeli — ${DAYS} giorni [${isoDate(dates[0])} → ${isoDate(dates[dates.length-1])}]\n`);

  for (let i=0; i<dates.length; i++) {
    const d   = dates[i];
    const iso = isoDate(d);
    const ds  = evaDate(d);

    /* Skip only if BOTH roman and ambrosian are present with real text */
    const existing = gospels[iso];
    const romanOk  = existing?.romano?.text?.length > 20;
    const ambOkNow = existing?.ambrosiano?.text?.length > 20 &&
                     !existing.ambrosiano.reference?.includes('rito romano');

    if (romanOk && ambOkNow) {
      sk++;
      process.stdout.write(`\r   [${i+1}/${dates.length}] ⏩  ${iso}`);
      continue;
    }

    process.stdout.write(`\r   [${i+1}/${dates.length}] ⬇  ${iso} ...              `);

    try {
      /* Fetch romano (always) */
      const romano = romanOk ? existing.romano : await fetchRomano(ds);
      if (!romano.text || romano.text.length < 20) throw new Error('romano testo vuoto');
      if (!romanOk) await sleep(DELAY);

      /* Fetch ambrosiano */
      let ambrosiano = null;
      if (!ambOkNow) {
        try {
          ambrosiano = await fetchAmbrosiano(d);
          if (ambrosiano) { ambOk++; process.stdout.write(' [amb ✓]'); }
          await sleep(DELAY/2);
        } catch(e) {}
      } else {
        ambrosiano = existing.ambrosiano;
      }

      gospels[iso] = {
        romano,
        ambrosiano: ambrosiano
          ? { ...ambrosiano,
              commentTitle:  romano.commentTitle,
              commentAuthor: romano.commentAuthor,
              commentText:   romano.commentText }
          : { reference: romano.reference+' (rito romano)',
              text: romano.text,
              commentTitle:  romano.commentTitle,
              commentAuthor: romano.commentAuthor,
              commentText:   romano.commentText },
      };

      dl++;
      if (dl % SAVE_N === 0) fs.writeFileSync(OUTPUT, JSON.stringify(gospels,null,2),'utf8');
    } catch(e) {
      err++;
      process.stdout.write(`\n   ❌  ${iso}: ${e.message}\n`);
    }
  }

  const sorted = Object.fromEntries(
    Object.entries(gospels).filter(([,v])=>v.romano?.text).sort(([a],[b])=>a.localeCompare(b))
  );
  fs.writeFileSync(OUTPUT, JSON.stringify(sorted,null,2),'utf8');
  const kb = Math.round(fs.statSync(OUTPUT).size/1024);
  const total = Object.keys(sorted).length;
  const ambTotal = Object.values(sorted).filter(v => !v.ambrosiano?.reference?.includes('rito romano')).length;

  console.log(`\n\n✅  Scaricati:${dl}  Saltati:${sk}  Errori:${err}`);
  console.log(`   Totale:${total} giorni  Ambrosiano reale:${ambTotal}  (${kb}KB)\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
