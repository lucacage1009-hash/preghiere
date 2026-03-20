#!/usr/bin/env node
'use strict';
/*
  fetch-gospels.js
  Scarica vangeli Romano (Evangelizo API) + Ambrosiano (vangelodelgiorno.org)
  per una finestra mobile di N giorni.
  
  Uso: node fetch-gospels.js [giorni]    default 30
       node fetch-gospels.js 60          prossimi 60 giorni
*/
const https = require('https');
const http  = require('http');
const fs    = require('fs');
const path  = require('path');

const OUTPUT = path.join(__dirname,'gospels.json');
const EVA    = 'https://feed.evangelizo.org/v2/reader.php';
const DAYS   = parseInt(process.argv[2])||30;
const DELAY  = 400;
const SAVE_N = 5;
const sleep  = ms => new Promise(r=>setTimeout(r,ms));

function isoDate(d){return d.toISOString().slice(0,10);}
function evaDate(d){
  return d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0');
}

function httpGet(url,hops=6){
  return new Promise((resolve,reject)=>{
    const lib=url.startsWith('https')?https:http;
    const req=lib.get(url,{
      timeout:30000,
      headers:{'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36','Accept-Language':'it-IT,it;q=0.9,en;q=0.5','Accept':'text/html,*/*'}
    },res=>{
      if([301,302,303,307,308].includes(res.statusCode)&&res.headers.location&&hops>0)
        return resolve(httpGet(res.headers.location,hops-1));
      let d=''; res.setEncoding('utf8');
      res.on('data',c=>d+=c); res.on('end',()=>resolve(d));
    });
    req.on('error',reject);
    req.on('timeout',()=>{req.destroy();reject(new Error('timeout'));});
  });
}

function clean(raw){
  return (raw||'')
    .replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]+>/g,'')
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/&nbsp;/g,' ').replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(n))
    .replace(/&apos;/g,"'").replace(/&quot;/g,'"')
    .replace(/Copyright[^\n]*/gi,'').replace(/Per ricevere il Vangelo[^\n]*/gi,'')
    .replace(/vangelodelgiorno\.org[^\n]*/gi,'').replace(/evangelizo\.org[^\n]*/gi,'')
    .split('\n').map(l=>l.trim()).filter(l=>l.length>0).join('\n');
}

async function evaGet(params){
  const url=`${EVA}?${new URLSearchParams(params)}`;
  return clean(await httpGet(url));
}

async function fetchRomano(ds){
  const base={date:ds,lang:'IT'};
  const [ref,text,ct,ca,cb]=await Promise.all([
    evaGet({...base,type:'reading_lt',content:'GSP'}),
    evaGet({...base,type:'reading',content:'GSP'}),
    evaGet({...base,type:'comment_t'}),
    evaGet({...base,type:'comment_a'}),
    evaGet({...base,type:'comment'}),
  ]);
  return {reference:ref,text,commentTitle:ct,commentAuthor:ca,commentText:cb};
}

/* Ambrosiano: vangelodelgiorno.org/ambrosiano/ 
   The site has a WordPress structure with daily posts.
   We try date-specific URLs first, then the homepage. */
async function fetchAmbrosiano(d){
  const y=d.getFullYear();
  const m=String(d.getMonth()+1).padStart(2,'0');
  const dd=String(d.getDate()).padStart(2,'0');

  /* vangelodelgiorno uses WordPress date permalinks */
  const urlsToTry=[
    `https://vangelodelgiorno.org/ambrosiano/${y}/${m}/${dd}/`,
    `https://vangelodelgiorno.org/${y}/${m}/${dd}/ambrosiano/`,
    `https://vangelodelgiorno.org/ambrosiano/`,
  ];

  for (const url of urlsToTry){
    try{
      const html=await httpGet(url);
      if(!html||html.length<500) continue;

      /* Find reference: "Dal Vangelo di..." */
      let ref='';
      const rm=html.match(/Dal\s+Vangelo\s+di\s+Ges[^\n<"]{5,80}/i)
             ||html.match(/Dal\s+Vangelo\s+secondo\s+[^\n<"]{5,60}/i);
      if(rm) ref=clean(rm[0]).slice(0,120);

      /* Try multiple WordPress content containers */
      const containers=[
        html.match(/<div[^>]+class="[^"]*entry-content[^"]*"[^>]*>([\s\S]{300,10000}?)<\/(div|article)>/i),
        html.match(/<div[^>]+class="[^"]*td-post-content[^"]*"[^>]*>([\s\S]{300,10000}?)<\/div>/i),
        html.match(/<div[^>]+class="[^"]*post-content[^"]*"[^>]*>([\s\S]{300,10000}?)<\/div>/i),
        html.match(/<div[^>]+class="[^"]*single[^"]*content[^"]*"[^>]*>([\s\S]{300,10000}?)<\/div>/i),
        html.match(/<article[^>]*>([\s\S]{400,15000}?)<\/article>/i),
      ];

      for(const cm of containers){
        if(!cm) continue;
        /* Filter lines: keep gospel-like text, skip navigation/ads */
        const lines=clean(cm[1]).split('\n')
          .filter(l=>
            l.length>25 &&
            !/^(menu|nav|footer|header|cookie|privacy|abbonati|newsletter|seguici|contatti|cerca|home|categor)/i.test(l) &&
            !/^\d+$/.test(l.trim())
          )
          .slice(0,35);
        if(lines.length>=3&&lines.join(' ').length>200){
          return {reference:ref||'Vangelo del Giorno — Rito Ambrosiano',text:lines.join('\n')};
        }
      }
    } catch(e){
      /* silently try next URL */
    }
    await sleep(200);
  }
  return null; /* signal: use romano as fallback */
}

async function main(){
  let gospels={};
  if(fs.existsSync(OUTPUT)){try{gospels=JSON.parse(fs.readFileSync(OUTPUT,'utf8'));}catch(_){}}

  /* Build date range: yesterday → DAYS ahead */
  const dates=[];
  for(let i=-1;i<=DAYS;i++){
    const d=new Date(); d.setDate(d.getDate()+i); dates.push(new Date(d));
  }

  let dl=0,sk=0,err=0,ambReal=0;
  console.log(`\n✝  Gospel Fetcher — ${DAYS} giorni`);
  console.log(`   ${isoDate(dates[0])} → ${isoDate(dates[dates.length-1])}\n`);

  for(let i=0;i<dates.length;i++){
    const d  =dates[i];
    const iso=isoDate(d);
    const ds =evaDate(d);

    const ex      =gospels[iso];
    const romanOk =ex?.romano?.text?.length>20;
    /* Consider ambrosiano ok only if it has DISTINCT text from romano */
    const ambDistinct=ex?.ambrosiano?.text&&
                      !ex.ambrosiano.reference?.includes('rito romano')&&
                      ex.ambrosiano.text!==ex?.romano?.text;

    if(romanOk&&ambDistinct){
      sk++;
      process.stdout.write(`\r   [${i+1}/${dates.length}] ⏩  ${iso}`);
      continue;
    }

    process.stdout.write(`\r   [${i+1}/${dates.length}] ⬇  ${iso}...          `);

    try{
      /* Romano */
      let romano=romanOk?ex.romano:await fetchRomano(ds);
      if(!romano.text||romano.text.length<20) throw new Error('romano empty');
      if(!romanOk) await sleep(DELAY);

      /* Ambrosiano */
      let ambrosiano=null;
      if(!ambDistinct){
        try{
          ambrosiano=await fetchAmbrosiano(d);
          if(ambrosiano){ambReal++;process.stdout.write(' [amb✓]');}
          await sleep(DELAY/2);
        }catch(e){}
      } else {
        ambrosiano=ex.ambrosiano;
      }

      gospels[iso]={
        romano,
        ambrosiano:ambrosiano
          ?{...ambrosiano,commentTitle:romano.commentTitle,commentAuthor:romano.commentAuthor,commentText:romano.commentText}
          :{reference:romano.reference+' (rito romano)',text:romano.text,
            commentTitle:romano.commentTitle,commentAuthor:romano.commentAuthor,commentText:romano.commentText},
      };
      dl++;
      if(dl%SAVE_N===0) fs.writeFileSync(OUTPUT,JSON.stringify(gospels,null,2),'utf8');
    }catch(e){
      err++;
      process.stdout.write(`\n   ERR ${iso}: ${e.message}\n`);
    }
  }

  const sorted=Object.fromEntries(
    Object.entries(gospels).filter(([,v])=>v.romano?.text).sort(([a],[b])=>a.localeCompare(b))
  );
  fs.writeFileSync(OUTPUT,JSON.stringify(sorted,null,2),'utf8');
  const kb=Math.round(fs.statSync(OUTPUT).size/1024);
  const tot=Object.keys(sorted).length;
  const ambTot=Object.values(sorted).filter(v=>!v.ambrosiano?.reference?.includes('rito romano')).length;
  console.log(`\n\n✅  Scaricati:${dl} Saltati:${sk} Errori:${err}`);
  console.log(`   Totale:${tot} giorni | Ambrosiano reale:${ambTot} | ${kb}KB\n`);
}

main().catch(e=>{console.error(e);process.exit(1);});
