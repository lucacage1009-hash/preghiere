'use strict';

/* ── Theme ─────────────────────────────── */
var html = document.documentElement;
var themeBtn = document.getElementById('theme-toggle');
html.setAttribute('data-theme', localStorage.getItem('amdg_theme') || 'dark');
themeBtn.addEventListener('click', function() {
  var next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('amdg_theme', next);
});

/* ── Date ───────────────────────────────── */
var dateEl = document.getElementById('site-date');
if (dateEl) dateEl.textContent = new Date().toLocaleDateString('it-IT', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
});
function todayISO() { return new Date().toISOString().slice(0, 10); }
function todayFmt() {
  var t = new Date();
  return '' + t.getFullYear() + String(t.getMonth()+1).padStart(2,'0') + String(t.getDate()).padStart(2,'0');
}

/* ── Giussani ───────────────────────────── */
function loadGiussani() {
  var el  = document.getElementById('giussani-text');
  var src = document.getElementById('giussani-source');
  if (!el || !src) return;
  if (typeof GIUSSANI === 'undefined' || !GIUSSANI.length) {
    el.innerHTML = '<p>Citazione non disponibile.</p>'; return;
  }
  var doy = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  var q = GIUSSANI[doy % GIUSSANI.length];
  el.innerHTML = '';
  q.text.split('\n').filter(function(p){ return p.trim(); }).forEach(function(t) {
    var p = document.createElement('p'); p.textContent = t; el.appendChild(p);
  });
  src.textContent = q.source;
}
document.addEventListener('DOMContentLoaded', loadGiussani);

/* ── Gospel ─────────────────────────────── */
var currentRite  = 'romano';
var gospelsCache = null;

var LINKS = {
  romano:     'https://www.vaticannews.va/it/vangelo-del-giorno-e-parola-del-giorno.html',
  ambrosiano: 'https://www.laparola.it/ambrosiano/liturgia-della-parola/'
};

function cleanText(raw) {
  return (raw||'')
    .replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]+>/g,'')
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/&nbsp;/g,' ')
    .replace(/&#(\d+);/g, function(_,n){ return String.fromCharCode(parseInt(n,10)); })
    .replace(/Copyright[^\n]*/gi,'').replace(/Per ricevere il Vangelo[^\n]*/gi,'')
    .replace(/vangelodelgiorno\.org[^\n]*/gi,'')
    .split('\n').map(function(l){return l.trim();}).filter(function(l){return l.length>0;}).join('\n');
}

function fillEl(el, text) {
  el.innerHTML = '';
  cleanText(text).split('\n').filter(function(p){return p.trim();}).forEach(function(t){
    var p = document.createElement('p'); p.textContent = t; el.appendChild(p);
  });
}

var gospelLoading  = document.getElementById('gospel-loading');
var gospelContent  = document.getElementById('gospel-content');
var gospelError    = document.getElementById('gospel-error');
var gospelRef      = document.getElementById('gospel-reference');
var gospelText     = document.getElementById('gospel-text');
var gospelLink     = document.getElementById('gospel-source-link');
var errorLinks     = document.getElementById('error-links');
var retryBtn       = document.getElementById('retry-btn');
var commentSection = document.getElementById('comment-section');
var commentTitle   = document.getElementById('comment-title');
var commentText    = document.getElementById('comment-text');
var commentAuthor  = document.getElementById('comment-author');

function showLoading() {
  gospelLoading.classList.remove('hidden');
  gospelContent.classList.add('hidden');
  gospelError.classList.add('hidden');
}

function showContent(data, rite) {
  gospelLoading.classList.add('hidden');
  gospelError.classList.add('hidden');
  gospelRef.textContent = cleanText(data.reference) || 'Vangelo del Giorno';
  fillEl(gospelText, data.text);
  gospelLink.href = LINKS[rite];
  /* Comment: show if present, hide otherwise */
  var ct = cleanText(data.commentText || '');
  if (ct.length > 30) {
    commentTitle.textContent  = cleanText(data.commentTitle)  || 'Commento al Vangelo';
    commentAuthor.textContent = cleanText(data.commentAuthor) ? '— '+cleanText(data.commentAuthor) : '';
    fillEl(commentText, data.commentText);
    commentSection.classList.remove('hidden');
  } else {
    commentSection.classList.add('hidden');
  }
  gospelContent.classList.remove('hidden');
}

function showError(rite) {
  gospelLoading.classList.add('hidden');
  gospelContent.classList.add('hidden');
  errorLinks.innerHTML = '';
  var links = rite === 'romano'
    ? [{t:'Vatican News', u:LINKS.romano},{t:'Evangelizo.org',u:'https://www.evangelizo.org/v2/it'}]
    : [{t:'La Parola — Ambrosiano',u:LINKS.ambrosiano},{t:'Diocesi di Milano',u:'https://www.diocesimilano.it'}];
  links.forEach(function(l){
    var a = document.createElement('a'); a.href=l.u; a.textContent=l.t;
    a.target='_blank'; a.rel='noopener noreferrer'; errorLinks.appendChild(a);
  });
  gospelError.classList.remove('hidden');
}

/* local file */
async function fromFile(rite) {
  if (!gospelsCache) {
    var r = await fetch('./gospels.json?v='+todayISO());
    if (!r.ok) throw new Error('no file');
    gospelsCache = await r.json();
  }
  var entry = gospelsCache[todayISO()];
  if (!entry) throw new Error('no date: '+todayISO());
  var data = entry[rite];
  if (!data || !data.text) throw new Error('no text for '+rite);
  return data;
}

/* live API fallback */
var PROXY = 'https://api.allorigins.win/raw?url=';
var EVA   = 'https://feed.evangelizo.org/v2/reader.php';

async function evaFetch(params) {
  var qs = Object.keys(params).map(function(k){
    return encodeURIComponent(k)+'='+encodeURIComponent(params[k]);
  }).join('&');
  var r = await fetch(PROXY+encodeURIComponent(EVA+'?'+qs));
  if (!r.ok) throw new Error('HTTP '+r.status);
  return (await r.text()).trim();
}

async function fromAPIRomano() {
  var date=todayFmt(), lang='IT';
  var res = await Promise.all([
    evaFetch({date:date,lang:lang,type:'reading_lt',content:'GSP'}),
    evaFetch({date:date,lang:lang,type:'reading',   content:'GSP'}),
    evaFetch({date:date,lang:lang,type:'comment_t'}),
    evaFetch({date:date,lang:lang,type:'comment_a'}),
    evaFetch({date:date,lang:lang,type:'comment'}),
  ]);
  if (!res[1] || res[1].length < 20) throw new Error('empty');
  return {reference:res[0],text:res[1],commentTitle:res[2],commentAuthor:res[3],commentText:res[4]};
}

async function loadGospel(rite) {
  showLoading();
  /* IMPORTANT: always clear session cache to avoid stale data without comment */
  var key = 'g_'+rite+'_'+todayISO();
  try {
    var data;
    /* 1 — local gospels.json (produced by GitHub Action, has ambrosiano) */
    var fromLocal = false;
    try { data = await fromFile(rite); fromLocal = true; } catch(e) { console.log('local fail:',e.message); }
    /* 2 — live API (romano only; ambrosiano falls back to romano) */
    if (!fromLocal) {
      data = await fromAPIRomano();
      if (rite === 'ambrosiano') data.reference += ' (rito romano — ambrosiano non ancora disponibile oggi)';
    }
    sessionStorage.setItem(key, JSON.stringify(data));
    showContent(data, rite);
  } catch(err) {
    console.error('Gospel error:', err);
    showError(rite);
  }
}

document.querySelectorAll('.rite-tab').forEach(function(btn){
  btn.addEventListener('click', function(){
    var rite = btn.dataset.rite;
    if (rite === currentRite) return;
    currentRite = rite;
    document.querySelectorAll('.rite-tab').forEach(function(b){
      b.classList.toggle('active', b.dataset.rite===rite);
      b.setAttribute('aria-pressed', b.dataset.rite===rite?'true':'false');
    });
    loadGospel(rite);
  });
});
if (retryBtn) retryBtn.addEventListener('click', function(){ loadGospel(currentRite); });
document.addEventListener('DOMContentLoaded', function(){ loadGospel(currentRite); });

/* ── Prayers ─────────────────────────────── */
document.querySelectorAll('.prayer-item').forEach(function(item){
  var toggle = item.querySelector('.prayer-toggle');
  var body   = item.querySelector('.prayer-body');
  if (!toggle||!body) return;
  toggle.addEventListener('click', function(){
    var isOpen = toggle.getAttribute('aria-expanded')==='true';
    document.querySelectorAll('.prayer-item').forEach(function(i){
      if (i!==item){
        i.classList.remove('open');
        var t=i.querySelector('.prayer-toggle'), b=i.querySelector('.prayer-body');
        if(t) t.setAttribute('aria-expanded','false');
        if(b) b.classList.add('hidden');
      }
    });
    toggle.setAttribute('aria-expanded', isOpen?'false':'true');
    body.classList.toggle('hidden', isOpen);
    item.classList.toggle('open', !isOpen);
    if (!isOpen) setTimeout(function(){ item.scrollIntoView({behavior:'smooth',block:'nearest'}); },100);
  });
});

/* ── Intentions ──────────────────────────── */
var supaUrl = (typeof SUPABASE_URL!=='undefined') ? SUPABASE_URL : '';
var supaKey = (typeof SUPABASE_KEY!=='undefined') ? SUPABASE_KEY : '';
var supaOk  = supaUrl.length > 10 && supaKey.length > 10;

var intText     = document.getElementById('intentions-text');
var charCount   = document.getElementById('char-count');
var sendBtn     = document.getElementById('send-intention');
var saveSt      = document.getElementById('save-status');
var boardLoading= document.getElementById('board-loading');
var boardList   = document.getElementById('board-list');
var boardEmpty  = document.getElementById('board-empty');
var noBackend   = document.getElementById('no-backend-note');

/* char counter */
if (intText && charCount) {
  intText.addEventListener('input', function(){
    charCount.textContent = intText.value.length;
  });
}

function timeAgo(iso) {
  var diff = Math.round((Date.now()-new Date(iso).getTime())/1000);
  if (diff<60)    return 'adesso';
  if (diff<3600)  return Math.floor(diff/60)+' min fa';
  if (diff<86400) return Math.floor(diff/3600)+' h fa';
  return Math.floor(diff/86400)+' g fa';
}

async function loadIntentions() {
  if (!supaOk) {
    if (boardLoading) boardLoading.classList.add('hidden');
    if (noBackend)   noBackend.classList.remove('hidden');
    /* Show local-only demo intentions from localStorage */
    showLocalIntentions();
    return;
  }
  if (boardLoading) boardLoading.classList.remove('hidden');
  try {
    var r = await fetch(supaUrl+'/rest/v1/intentions?select=id,text,created_at&order=created_at.desc&limit=50', {
      headers:{'apikey':supaKey,'Authorization':'Bearer '+supaKey}
    });
    if (!r.ok) throw new Error('fetch failed');
    var rows = await r.json();
    if (boardLoading) boardLoading.classList.add('hidden');
    renderIntentions(rows);
  } catch(e) {
    if (boardLoading) boardLoading.classList.add('hidden');
    if (noBackend) noBackend.classList.remove('hidden');
    showLocalIntentions();
  }
}

function renderIntentions(rows) {
  boardList.innerHTML = '';
  if (!rows || rows.length===0) { if (boardEmpty) boardEmpty.classList.remove('hidden'); return; }
  if (boardEmpty) boardEmpty.classList.add('hidden');
  rows.forEach(function(row){
    var div = document.createElement('div'); div.className='intention-item';
    div.innerHTML = '<p class="intention-text">'+
      (row.text||'').replace(/</g,'&lt;').replace(/>/g,'&gt;')+
      '</p><div class="intention-meta">'+
      '<span>'+timeAgo(row.created_at||new Date().toISOString())+'</span>'+
      '<span class="intention-pray">&#9829; Prego per te</span></div>';
    boardList.appendChild(div);
  });
}

function showLocalIntentions() {
  try {
    var stored = JSON.parse(localStorage.getItem('amdg_local_intentions') || '[]');
    renderIntentions(stored);
  } catch(e) { if (boardEmpty) boardEmpty.classList.remove('hidden'); }
}

document.addEventListener('DOMContentLoaded', loadIntentions);

if (sendBtn) {
  sendBtn.addEventListener('click', async function(){
    var text = (intText ? intText.value : '').trim();
    if (!text) return;
    sendBtn.disabled = true; sendBtn.textContent = 'Invio...';

    if (supaOk) {
      try {
        var r = await fetch(supaUrl+'/rest/v1/intentions', {
          method:'POST',
          headers:{
            'apikey':supaKey,'Authorization':'Bearer '+supaKey,
            'Content-Type':'application/json','Prefer':'return=minimal'
          },
          body: JSON.stringify({text:text.slice(0,400)})
        });
        if (!r.ok) throw new Error('post failed');
        intText.value=''; if(charCount) charCount.textContent='0';
        saveSt.textContent='Intenzione condivisa. Grazie.';
        setTimeout(function(){ saveSt.textContent=''; },4000);
        await loadIntentions();
      } catch(e) {
        saveSt.textContent='Errore. Riprova.';
        setTimeout(function(){ saveSt.textContent=''; },3000);
      }
    } else {
      /* Save locally */
      try {
        var stored = JSON.parse(localStorage.getItem('amdg_local_intentions')||'[]');
        stored.unshift({id:Date.now()+'', text:text.slice(0,400), created_at:new Date().toISOString()});
        if (stored.length>30) stored = stored.slice(0,30);
        localStorage.setItem('amdg_local_intentions', JSON.stringify(stored));
        intText.value=''; if(charCount) charCount.textContent='0';
        saveSt.textContent='Salvato localmente.';
        setTimeout(function(){ saveSt.textContent=''; },3000);
        showLocalIntentions();
      } catch(e) {}
    }
    sendBtn.disabled=false; sendBtn.textContent='Condividi + Prega';
  });
}
