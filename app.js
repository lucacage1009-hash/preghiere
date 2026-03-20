'use strict';

/* ── Theme ── */
var html = document.documentElement;
var themeBtn = document.getElementById('theme-toggle');
html.setAttribute('data-theme', localStorage.getItem('amdg_theme') || 'dark');
themeBtn.addEventListener('click', function() {
  var next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('amdg_theme', next);
});

/* ── Date ── */
var dateEl = document.getElementById('site-date');
if (dateEl) dateEl.textContent = new Date().toLocaleDateString('it-IT', {
  weekday:'long', day:'numeric', month:'long', year:'numeric'
});
function todayISO() { return new Date().toISOString().slice(0,10); }
function todayFmt() {
  var t = new Date();
  return ''+t.getFullYear()+String(t.getMonth()+1).padStart(2,'0')+String(t.getDate()).padStart(2,'0');
}

/* ── Giussani ── */
function loadGiussani() {
  var el  = document.getElementById('giussani-text');
  var src = document.getElementById('giussani-source');
  if (!el||!src) return;
  if (typeof GIUSSANI==='undefined'||!GIUSSANI.length){el.innerHTML='<p>Citazione non disponibile.</p>';return;}
  var doy = Math.floor((Date.now()-new Date(new Date().getFullYear(),0,0).getTime())/86400000);
  var q = GIUSSANI[doy % GIUSSANI.length];
  el.innerHTML='';
  q.text.split('\n').filter(function(p){return p.trim();}).forEach(function(t){
    var p=document.createElement('p'); p.textContent=t; el.appendChild(p);
  });
  src.textContent=q.source;
}
document.addEventListener('DOMContentLoaded', loadGiussani);

/* ── Gospel ── */
var currentRite = 'romano';
var gospelsCache = null;
var LINKS = {
  romano:'https://www.vaticannews.va/it/vangelo-del-giorno-e-parola-del-giorno.html',
  ambrosiano:'https://www.laparola.it/ambrosiano/liturgia-della-parola/'
};

function cleanText(raw) {
  return (raw||'')
    .replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]+>/g,'')
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/&nbsp;/g,' ')
    .replace(/&#(\d+);/g,function(_,n){return String.fromCharCode(parseInt(n,10));})
    .replace(/Copyright[^\n]*/gi,'').replace(/Per ricevere il Vangelo[^\n]*/gi,'')
    .replace(/vangelodelgiorno\.org[^\n]*/gi,'')
    .split('\n').map(function(l){return l.trim();}).filter(function(l){return l.length>0;}).join('\n');
}

function fillEl(el,text) {
  el.innerHTML='';
  cleanText(text).split('\n').filter(function(p){return p.trim();}).forEach(function(t){
    var p=document.createElement('p'); p.textContent=t; el.appendChild(p);
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
  gospelRef.textContent = cleanText(data.reference)||'Vangelo del Giorno';
  fillEl(gospelText, data.text);
  gospelLink.href = LINKS[rite];
  var ct = cleanText(data.commentText||'');
  if (ct.length>30) {
    commentTitle.textContent  = cleanText(data.commentTitle)||'Commento al Vangelo';
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
  errorLinks.innerHTML='';
  var links = rite==='romano'
    ? [{t:'Vatican News',u:LINKS.romano},{t:'Evangelizo.org',u:'https://www.evangelizo.org/v2/it'}]
    : [{t:'La Parola — Ambrosiano',u:LINKS.ambrosiano},{t:'Diocesi di Milano',u:'https://www.diocesimilano.it'}];
  links.forEach(function(l){
    var a=document.createElement('a'); a.href=l.u; a.textContent=l.t;
    a.target='_blank'; a.rel='noopener noreferrer'; errorLinks.appendChild(a);
  });
  gospelError.classList.remove('hidden');
}

async function fromFile(rite) {
  if (!gospelsCache) {
    var r=await fetch('./gospels.json?v='+todayISO());
    if (!r.ok) throw new Error('no file');
    gospelsCache=await r.json();
  }
  var entry=gospelsCache[todayISO()];
  if (!entry) throw new Error('no date: '+todayISO());
  var data=entry[rite];
  if (!data||!data.text) throw new Error('no text for '+rite);
  return data;
}

var PROXY='https://api.allorigins.win/raw?url=';
var EVA='https://feed.evangelizo.org/v2/reader.php';

async function evaFetch(params) {
  var qs=Object.keys(params).map(function(k){return encodeURIComponent(k)+'='+encodeURIComponent(params[k]);}).join('&');
  var r=await fetch(PROXY+encodeURIComponent(EVA+'?'+qs));
  if (!r.ok) throw new Error('HTTP '+r.status);
  return (await r.text()).trim();
}

async function fromAPIRomano() {
  var date=todayFmt(),lang='IT';
  var res=await Promise.all([
    evaFetch({date:date,lang:lang,type:'reading_lt',content:'GSP'}),
    evaFetch({date:date,lang:lang,type:'reading',content:'GSP'}),
    evaFetch({date:date,lang:lang,type:'comment_t'}),
    evaFetch({date:date,lang:lang,type:'comment_a'}),
    evaFetch({date:date,lang:lang,type:'comment'}),
  ]);
  if (!res[1]||res[1].length<20) throw new Error('empty');
  return {reference:res[0],text:res[1],commentTitle:res[2],commentAuthor:res[3],commentText:res[4]};
}

async function loadGospel(rite) {
  showLoading();
  try {
    var data;
    var ok=false;
    try {data=await fromFile(rite); ok=true;} catch(e){console.log('local:',e.message);}
    if (!ok) {
      data=await fromAPIRomano();
      if (rite==='ambrosiano') data.reference+=' (rito romano)';
    }
    showContent(data,rite);
  } catch(err){console.error('gospel:',err); showError(rite);}
}

document.querySelectorAll('.rite-tab').forEach(function(btn){
  btn.addEventListener('click',function(){
    var rite=btn.dataset.rite;
    if (rite===currentRite) return;
    currentRite=rite;
    document.querySelectorAll('.rite-tab').forEach(function(b){
      b.classList.toggle('active',b.dataset.rite===rite);
      b.setAttribute('aria-pressed',b.dataset.rite===rite?'true':'false');
    });
    loadGospel(rite);
  });
});
if (retryBtn) retryBtn.addEventListener('click',function(){loadGospel(currentRite);});
document.addEventListener('DOMContentLoaded',function(){loadGospel(currentRite);});

/* ── Prayers ── */
document.querySelectorAll('.prayer-item').forEach(function(item){
  var toggle=item.querySelector('.prayer-toggle');
  var body=item.querySelector('.prayer-body');
  if (!toggle||!body) return;
  toggle.addEventListener('click',function(){
    var isOpen=toggle.getAttribute('aria-expanded')==='true';
    document.querySelectorAll('.prayer-item').forEach(function(i){
      if (i!==item){
        i.classList.remove('open');
        var t=i.querySelector('.prayer-toggle'),b=i.querySelector('.prayer-body');
        if(t) t.setAttribute('aria-expanded','false');
        if(b) b.classList.add('hidden');
      }
    });
    toggle.setAttribute('aria-expanded',isOpen?'false':'true');
    body.classList.toggle('hidden',isOpen);
    item.classList.toggle('open',!isOpen);
    if (!isOpen) setTimeout(function(){item.scrollIntoView({behavior:'smooth',block:'nearest'});},100);
  });
});

/* ── Personal Intentions ── */
var INT_KEY = 'amdg_int_v2';

function loadIntentions() {
  try { return JSON.parse(localStorage.getItem(INT_KEY)||'[]'); }
  catch(e) { return []; }
}
function saveIntentions(arr) {
  localStorage.setItem(INT_KEY, JSON.stringify(arr));
}
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('it-IT',{day:'numeric',month:'long',year:'numeric'});
}
function renderIntentions() {
  var list = document.getElementById('int-list');
  var empty = document.getElementById('int-empty');
  if (!list||!empty) return;
  var arr = loadIntentions();
  list.innerHTML='';
  if (!arr.length) { empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  arr.forEach(function(item, idx){
    var div=document.createElement('div'); div.className='int-item';
    div.innerHTML=
      '<div class="int-item-dot"></div>'+
      '<div class="int-item-body">'+
        '<p class="int-item-text">'+item.text.replace(/</g,'&lt;')+'</p>'+
        '<p class="int-item-date">'+fmtDate(item.date)+'</p>'+
      '</div>'+
      '<button class="int-item-del" data-idx="'+idx+'" aria-label="Elimina">&#215;</button>';
    list.appendChild(div);
  });
  list.querySelectorAll('.int-item-del').forEach(function(btn){
    btn.addEventListener('click',function(){
      var idx=parseInt(btn.dataset.idx,10);
      var arr=loadIntentions();
      arr.splice(idx,1);
      saveIntentions(arr);
      renderIntentions();
    });
  });
}

var intInput = document.getElementById('int-input');
var intChars = document.getElementById('int-chars');
var intAddBtn = document.getElementById('int-add-btn');

if (intInput&&intChars) {
  intInput.addEventListener('input',function(){intChars.textContent=intInput.value.length;});
}
if (intAddBtn) {
  intAddBtn.addEventListener('click',function(){
    var text=(intInput?intInput.value:'').trim();
    if (!text) return;
    var arr=loadIntentions();
    arr.unshift({text:text.slice(0,500), date:new Date().toISOString()});
    saveIntentions(arr);
    intInput.value=''; if(intChars) intChars.textContent='0';
    renderIntentions();
  });
}
if (intInput) {
  intInput.addEventListener('keydown',function(e){
    if (e.key==='Enter'&&(e.ctrlKey||e.metaKey)) intAddBtn&&intAddBtn.click();
  });
}
document.addEventListener('DOMContentLoaded', renderIntentions);

/* ── Streak Tracker ── */
var STREAK_KEY = 'amdg_streak_v1';

function getStreak() {
  try { return JSON.parse(localStorage.getItem(STREAK_KEY)||'[]'); }
  catch(e) { return []; }
}
function saveStreak(arr) { localStorage.setItem(STREAK_KEY,JSON.stringify(arr)); }

function recordVisit() {
  var today = todayISO();
  var arr = getStreak();
  if (!arr.includes(today)) { arr.push(today); saveStreak(arr); }
}

function renderStreak() {
  var bar = document.getElementById('streak-bar');
  if (!bar) return;
  var arr = getStreak();
  var today = todayISO();

  /* Show last 60 days */
  var days = [];
  for (var i=59; i>=0; i--) {
    var d=new Date(); d.setDate(d.getDate()-i);
    days.push(d.toISOString().slice(0,10));
  }

  /* Count current streak */
  var streak=0;
  var cursor=new Date();
  while(true){
    var iso=cursor.toISOString().slice(0,10);
    if (arr.includes(iso)){streak++;cursor.setDate(cursor.getDate()-1);}
    else break;
  }

  var total=arr.length;
  var streakTxt = streak>1 ? streak+' giorni di fila' : streak===1 ? 'Oggi sei qui' : '';

  bar.innerHTML=
    '<div class="streak-inner">'+
      '<div class="streak-header">'+
        '<span>Il tuo cammino — ultimi 60 giorni</span>'+
        (streakTxt ? '<span class="streak-count">&#9679; '+streakTxt+'</span>' : '')+
      '</div>'+
      '<div class="streak-dots" id="streak-dots" aria-hidden="true"></div>'+
    '</div>';

  var dotsEl=bar.querySelector('#streak-dots');
  days.forEach(function(iso){
    var dot=document.createElement('div');
    dot.className='streak-dot';
    if (iso===today) dot.classList.add('today');
    else if (arr.includes(iso)) dot.classList.add('visited');
    dot.title=iso;
    dotsEl.appendChild(dot);
  });
}

recordVisit();
document.addEventListener('DOMContentLoaded', renderStreak);
