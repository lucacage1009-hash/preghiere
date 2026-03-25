#!/usr/bin/env node
'use strict';
/*
  fetch-gospels.js — scarica vangeli romano + ambrosiano
  Romano: Evangelizo API (affidabile, ufficiale)
  Ambrosiano: apostolesacrocuore.org come fonte principale

  Uso: node fetch-gospels.js [giorni]   default=30
*/
const https = require('https');
const http  = require('http');
const fs    = require('fs');
const path  = require('path');
const {URL} = require('url');

const OUTPUT = path.join(__dirname,'gospels.json');
const EVA    = 'https://feed.evangelizo.org/v2/reader.php';
const DAYS   = parseInt(process.argv[2])||30;
const DELAY  = 500;
const sleep  = ms => new Promise(r=>setTimeout(r,ms));

function isoDate(d){return d.toISOString().slice(0,10);}
function evaDate(d){
  return d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0');
}

/* ── HTTP helper with redirect + timeout ── */
function httpGet(rawUrl, hops=8){
  return new Promise((resolve,reject)=>{
    let parsedUrl;
    try { parsedUrl=new URL(rawUrl); } catch(e){ return reject(e); }
    const lib = parsedUrl.protocol==='https:'?https:http;
    const opts = {
      hostname: parsedUrl.hostname,
      port:     parsedUrl.port||undefined,
      path:     parsedUrl.pathname+parsedUrl.search,
      timeout:  25000,
      headers:{
        'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36',
        'Accept':'text/html,application/xhtml+xml,*/*;q=0.9',
        'Accept-Language':'it-IT,it;q=0.9,en;q=0.5',
        'Accept-Encoding':'identity',
        'Cache-Control':'no-cache',
      }
    };
    const req=lib.get(opts, res=>{
      if([301,302,303,307,308].includes(res.statusCode)&&res.headers.location&&hops>0){
        let loc=res.headers.location;
        if(!loc.startsWith('http')) loc=parsedUrl.origin+loc;
        res.resume(); return resolve(httpGet(loc,hops-1));
      }
      let d=''; res.setEncoding('utf8');
      res.on('data',c=>d+=c);
      res.on('end',()=>resolve(d));
    });
    req.on('error',reject);
    req.on('timeout',()=>{req.destroy();reject(new Error('timeout: '+rawUrl));});
  });
}

/* ── Text cleaner ── */
function clean(raw){
  return (raw||'')
    .replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]+>/g,'')
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/&nbsp;/g,' ').replace(/&apos;/g,"'").replace(/&quot;/g,'"')
    .replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(n))
    .replace(/Copyright[^\n]*/gi,'').replace(/Per ricevere il Vangelo[^\n]*/gi,'')
    .replace(/vangelodelgiorno\.org[^\n]*/gi,'').replace(/evangelizo\.org[^\n]*/gi,'')
    .split('\n').map(l=>l.trim()).filter(l=>l.length>0).join('\n');
}

/* ── Evangelizo API (romano) ── */
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

/* ── Extract gospel from apostolesacrocuore.org HTML ── */
function extractApostole(html){
  if(!html||html.length<200) return null;

  /* Converti tutto l'HTML in testo pulito PRIMA di cercare il vangelo */
  const text = html
    .replace(/<br\s*\/?>/gi,'\n').replace(/<\/p>\s*/gi,'\n')
    .replace(/<\/li>\s*/gi,'\n').replace(/<\/h[1-6]>\s*/gi,'\n')
    .replace(/<\/div>\s*/gi,'\n').replace(/<[^>]+>/g,'')
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/&nbsp;/g,' ').replace(/&apos;/g,"'").replace(/&quot;/g,'"')
    .replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(n))
    .replace(/&#x([0-9a-f]+);/gi,(_,h)=>String.fromCharCode(parseInt(h,16)))
    .replace(/\*\*/g,'');

  const lines = text.split('\n').map(l=>l.trim()).filter(l=>l.length>0);

  /* Trova l'ULTIMA occorrenza di "Lettura del Vangelo" / "Dal Vangelo" */
  let gspLineIdx = -1;
  for(let i=lines.length-1;i>=0;i--){
    if(/^(Lettura del Vangelo|Dal Vangelo di Ges|Dal Vangelo secondo)/i.test(lines[i])){
      gspLineIdx=i; break;
    }
  }
  if(gspLineIdx<0) return null;

  /* Riferimento */
  const ref = lines[gspLineIdx].replace(/^Lettura del /i,'Dal ');

  /* Corpo: cerca l'inizio del testo evangelico e raccoglie fino ai marcatori di fine */
  const STARTERS = /^(In quel tempo|Nel sesto mese|Il Signore Ges|Il Signore disse|Ges\u00f9 disse|In quel giorno|Allora Ges\u00f9)/i;
  const ENDERS   = /^(https?:\/\/|Il Signore si ricord|A CONCLUSIONE|DOPO IL VANGELO|Ascolta, Signore|O Dio forte|Gradisci|SUI DONI|PREFAZIO|\u00c8 veramente cosa|Santo)/i;

  const bodyLines = [];
  let inBody = false;
  for(let j=gspLineIdx+1;j<lines.length;j++){
    const l = lines[j];
    if(!inBody && STARTERS.test(l)){ inBody=true; }
    if(!inBody) continue;
    if(ENDERS.test(l)) break;
    if(l.length>10) bodyLines.push(l);
    if(bodyLines.length>=50) break;
  }

  if(bodyLines.length<2) return null;
  return{reference:ref, text:bodyLines.join('\n')};
}

/* ── Ambrosiano source 1 (PRIMARY): apostolesacrocuore.org ── */
async function tryApostole(d){
  const iso=isoDate(d);
  try{
    const html=await httpGet(`https://www.apostolesacrocuore.org/vangelo-oggi-ambrosiano.php?data=${iso}`);
    const result=extractApostole(html);
    if(result&&result.text.length>100){
      console.log(`    [amb OK] apostolesacrocuore`);
      return result;
    }
  }catch(e){ console.error('  apostole err:',e.message); }
  return null;
}

/* ── Ambrosiano source 2 (FALLBACK): vangelodelgiorno.org ── */
async function tryVdg(d){
  const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),dd=String(d.getDate()).padStart(2,'0');
  try{
    const html=await httpGet(`https://vangelodelgiorno.org/ambrosiano/${y}/${m}/${dd}/`);
    if(html&&html.length>500){
      /* Usa la stessa logica di extractApostole */
      const result=extractApostole(html);
      if(result&&result.text.length>100){
        console.log(`    [amb OK] vangelodelgiorno`);
        return result;
      }
    }
  }catch(e){}
  return null;
}

async function fetchAmbrosiano(d){
  return await tryApostole(d) || await tryVdg(d) || null;
}

/* ── tiraccontolaparola.it — Ambrosian comment ── */
const IT_MONTHS = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];

function extractTRLPComment(html){
  if(!html||html.length<500) return null;
  let commentTitle='',commentAuthor='';
  const titleM = html.match(/<strong[^>]*>"([^"<]{10,200})"<\/strong>/i)
               || html.match(/<strong[^>]*>\u00ab([^\u00bb<]{10,200})\u00bb<\/strong>/i);
  if(titleM) commentTitle = titleM[1].trim();
  const authorM = html.match(/<em>([A-Z][a-z\u00e0\u00e8\u00e9\u00ec\u00f2\u00f9]+ [A-Z][a-z\u00e0\u00e8\u00e9\u00ec\u00f2\u00f9]+)<\/em>/);
  if(authorM) commentAuthor = authorM[1].trim();
  let startIdx = titleM ? html.indexOf(titleM[0]) : -1;
  if(startIdx < 0){const olEnd = html.lastIndexOf('</ol>');startIdx = olEnd > 0 ? olEnd : html.indexOf('<p>');}
  let endIdx = html.length;
  ['Iscriviti alla Newsletter','Cookie Policy','Privacy Policy','class="wp-block-group"'].forEach(m=>{const i=html.indexOf(m,startIdx);if(i>0&&i<endIdx)endIdx=i;});
  const lines = html.slice(startIdx,endIdx)
    .replace(/<br\s*\/?>/gi,'\n').replace(/<\/p>/gi,'\n').replace(/<[^>]+>/g,' ')
    .replace(/&amp;/g,'&').replace(/&nbsp;/g,' ')
    .replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(n))
    .split('\n').map(l=>l.trim())
    .filter(l=>l.length>30 && !/^(iscriviti|cookie|privacy|nome|cognome|email|telefono|invia|accetto|copyright)/i.test(l));
  if(!lines.length) return null;
  return{commentTitle:commentTitle||'Commento al Vangelo',commentAuthor:commentAuthor||'Ti racconto la Parola',commentText:lines.join('\n')};
}

async function fetchAmbComment(d){
  const day=d.getDate(), month=IT_MONTHS[d.getMonth()], year=d.getFullYear();
  const url=`https://www.tiraccontolaparola.it/rito-ambrosiano-commento-al-vangelo-del-${day}-${month}-${year}/`;
  try{
    const html=await httpGet(url);
    if(html.includes('Pagina non trovata')||html.includes('404')||html.length<1000) return null;
    const result=extractTRLPComment(html);
    if(result&&result.commentText.length>100){
      console.log(`    [comment OK] tiraccontolaparola.it`);
      return result;
    }
  }catch(e){ console.error('  TRLP comment err:',e.message); }
  return null;
}

/* ── Main ── */
async function main(){
  let gospels={};
  if(fs.existsSync(OUTPUT)){try{gospels=JSON.parse(fs.readFileSync(OUTPUT,'utf8'));}catch(_){}}

  const dates=[];
  for(let i=-1;i<=DAYS;i++){const d=new Date();d.setDate(d.getDate()+i);dates.push(new Date(d));}

  let dl=0,sk=0,err=0,ambReal=0;
  console.log(`\n  Gospel Fetcher | ${DAYS} giorni | ${isoDate(dates[0])} -> ${isoDate(dates[dates.length-1])}\n`);

  for(let i=0;i<dates.length;i++){
    const d=dates[i], iso=isoDate(d), ds=evaDate(d);
    const ex=gospels[iso];
    const romanOk=ex?.romano?.text?.length>20;
    /* Valida il dato ambrosiano: scarta se contiene la liturgia intera */
    const ambValid = ex?.ambrosiano?.text &&
      ex.ambrosiano.text.length > 20 &&
      ex.ambrosiano.text.length < 3000 &&
      !ex.ambrosiano.reference?.includes('rito romano') &&
      !/PREFAZIO|SUI DONI|A CONCLUSIONE|perdona le nostre colpe|salvaci\./i.test(ex.ambrosiano.text);
    const ambOk = ambValid;

    if(romanOk&&ambOk){sk++;process.stdout.write(`\r  [${i+1}/${dates.length}] skip ${iso}`);continue;}

    process.stdout.write(`\r  [${i+1}/${dates.length}] fetch ${iso}...          `);

    try{
      const romano=romanOk?ex.romano:await fetchRomano(ds);
      if(!romano.text||romano.text.length<20) throw new Error('romano empty');
      if(!romanOk) await sleep(DELAY);

      let amb=ambOk?ex.ambrosiano:null;
      if(!ambOk){
        try{
          amb=await fetchAmbrosiano(d);
          if(amb){ambReal++;process.stdout.write(` [amb OK]`);}
        }catch(e){}
        await sleep(DELAY/2);
      }

      /* Commento ambrosiano */
      const ambHasComment=amb&&amb.commentText&&amb.commentText.length>50;
      let ambComment={commentTitle:romano.commentTitle,commentAuthor:romano.commentAuthor,commentText:romano.commentText};
      if(!ambHasComment){
        try{
          const trlp=await fetchAmbComment(d);
          if(trlp) ambComment={commentTitle:trlp.commentTitle,commentAuthor:trlp.commentAuthor,commentText:trlp.commentText};
        }catch(e){}
        await sleep(DELAY/2);
      } else {
        ambComment={commentTitle:amb.commentTitle,commentAuthor:amb.commentAuthor,commentText:amb.commentText};
      }

      gospels[iso]={
        romano,
        ambrosiano:amb
          ?{...amb,commentTitle:ambComment.commentTitle,commentAuthor:ambComment.commentAuthor,commentText:ambComment.commentText}
          :{reference:romano.reference+' (rito romano)',text:romano.text,
            commentTitle:ambComment.commentTitle,commentAuthor:ambComment.commentAuthor,commentText:ambComment.commentText},
      };
      dl++;
      if(dl%5===0) fs.writeFileSync(OUTPUT,JSON.stringify(gospels,null,2),'utf8');
    }catch(e){
      err++;
      process.stdout.write(`\n  ERR ${iso}: ${e.message}\n`);
    }
  }

  const sorted=Object.fromEntries(
    Object.entries(gospels).filter(([,v])=>v.romano?.text).sort(([a],[b])=>a.localeCompare(b))
  );
  fs.writeFileSync(OUTPUT,JSON.stringify(sorted,null,2),'utf8');
  const kb=Math.round(fs.statSync(OUTPUT).size/1024);
  const tot=Object.keys(sorted).length;
  const ambTot=Object.values(sorted).filter(v=>!v.ambrosiano?.reference?.includes('rito romano')).length;
  console.log(`\n\n  Scaricati:${dl} | Saltati:${sk} | Errori:${err}`);
  console.log(`  Totale:${tot} | Ambrosiano reale:${ambTot} | ${kb}KB\n`);
}
main().catch(e=>{console.error(e);process.exit(1);});
