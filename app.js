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
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
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
  if (typeof GIUSSANI==='undefined'||!GIUSSANI.length){el.innerHTML='<p>Caricamento...</p>';return;}
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
var currentRite='romano', gospelsCache=null;
var LINKS={
  romano:'https://www.vaticannews.va/it/vangelo-del-giorno-e-parola-del-giorno.html',
  ambrosiano:'https://www.laparola.it/ambrosiano/liturgia-della-parola/'
};

function cleanText(raw){
  return (raw||'')
    .replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]+>/g,'')
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/&nbsp;/g,' ')
    .replace(/&#(\d+);/g,function(_,n){return String.fromCharCode(parseInt(n,10));})
    .replace(/Copyright[^\n]*/gi,'').replace(/Per ricevere il Vangelo[^\n]*/gi,'')
    .replace(/vangelodelgiorno\.org[^\n]*/gi,'')
    .split('\n').map(function(l){return l.trim();}).filter(function(l){return l.length>0;}).join('\n');
}
function fillEl(el,text){
  el.innerHTML='';
  cleanText(text).split('\n').filter(function(p){return p.trim();}).forEach(function(t){
    var p=document.createElement('p'); p.textContent=t; el.appendChild(p);
  });
}

var gospelLoading  =document.getElementById('gospel-loading');
var gospelContent  =document.getElementById('gospel-content');
var gospelError    =document.getElementById('gospel-error');
var gospelRef      =document.getElementById('gospel-reference');
var gospelText     =document.getElementById('gospel-text');
var gospelLink     =document.getElementById('gospel-source-link');
var errorLinks     =document.getElementById('error-links');
var retryBtn       =document.getElementById('retry-btn');
var commentSection =document.getElementById('comment-section');
var commentTitle   =document.getElementById('comment-title');
var commentText    =document.getElementById('comment-text');
var commentAuthor  =document.getElementById('comment-author');

function showLoading(){
  gospelLoading.classList.remove('hidden');
  gospelContent.classList.add('hidden');
  gospelError.classList.add('hidden');
}
function showContent(data,rite){
  gospelLoading.classList.add('hidden');
  gospelError.classList.add('hidden');
  gospelRef.textContent=cleanText(data.reference)||'Vangelo del Giorno';
  fillEl(gospelText,data.text);
  gospelLink.href=LINKS[rite];
  var ct=cleanText(data.commentText||'');
  if(ct.length>30){
    commentTitle.textContent=cleanText(data.commentTitle)||'Commento al Vangelo';
    commentAuthor.textContent=cleanText(data.commentAuthor)?'— '+cleanText(data.commentAuthor):'';
    fillEl(commentText,data.commentText);
    commentSection.classList.remove('hidden');
  } else {
    commentSection.classList.add('hidden');
  }
  gospelContent.classList.remove('hidden');
}
function showError(rite){
  gospelLoading.classList.add('hidden');
  gospelContent.classList.add('hidden');
  errorLinks.innerHTML='';
  var links=rite==='romano'
    ?[{t:'Vatican News',u:LINKS.romano},{t:'Evangelizo.org',u:'https://www.evangelizo.org/v2/it'}]
    :[{t:'La Parola — Ambrosiano',u:LINKS.ambrosiano},{t:'Diocesi di Milano',u:'https://www.diocesimilano.it'}];
  links.forEach(function(l){
    var a=document.createElement('a'); a.href=l.u; a.textContent=l.t;
    a.target='_blank'; a.rel='noopener noreferrer'; errorLinks.appendChild(a);
  });
  gospelError.classList.remove('hidden');
}

async function fromFile(rite){
  if(!gospelsCache){
    var r=await fetch('./gospels.json?v='+todayISO());
    if(!r.ok) throw new Error('no file');
    gospelsCache=await r.json();
  }
  var entry=gospelsCache[todayISO()];
  if(!entry) throw new Error('no date');
  var data=entry[rite];
  if(!data||!data.text) throw new Error('no text for '+rite);
  return data;
}

var PROXY='https://api.allorigins.win/raw?url=';
var EVA='https://feed.evangelizo.org/v2/reader.php';

async function evaFetch(params){
  var qs=Object.keys(params).map(function(k){
    return encodeURIComponent(k)+'='+encodeURIComponent(params[k]);
  }).join('&');
  var r=await fetch(PROXY+encodeURIComponent(EVA+'?'+qs));
  if(!r.ok) throw new Error('HTTP '+r.status);
  return (await r.text()).trim();
}
async function fromAPIRomano(){
  var date=todayFmt(),lang='IT';
  var res=await Promise.all([
    evaFetch({date:date,lang:lang,type:'reading_lt',content:'GSP'}),
    evaFetch({date:date,lang:lang,type:'reading',content:'GSP'}),
    evaFetch({date:date,lang:lang,type:'comment_t'}),
    evaFetch({date:date,lang:lang,type:'comment_a'}),
    evaFetch({date:date,lang:lang,type:'comment'}),
  ]);
  if(!res[1]||res[1].length<20) throw new Error('empty');
  return {reference:res[0],text:res[1],commentTitle:res[2],commentAuthor:res[3],commentText:res[4]};
}

async function loadGospel(rite){
  showLoading();
  try{
    var data, ok=false;
    try{data=await fromFile(rite); ok=true;}catch(e){console.log('local:',e.message);}
    if(!ok){
      data=await fromAPIRomano();
      if(rite==='ambrosiano') data.reference+=' (rito romano)';
    }
    showContent(data,rite);
  }catch(err){console.error('gospel:',err); showError(rite);}
}
document.querySelectorAll('.rite-tab').forEach(function(btn){
  btn.addEventListener('click',function(){
    var rite=btn.dataset.rite;
    if(rite===currentRite) return;
    currentRite=rite;
    document.querySelectorAll('.rite-tab').forEach(function(b){
      b.classList.toggle('active',b.dataset.rite===rite);
      b.setAttribute('aria-pressed',b.dataset.rite===rite?'true':'false');
    });
    loadGospel(rite);
  });
});
if(retryBtn) retryBtn.addEventListener('click',function(){loadGospel(currentRite);});
document.addEventListener('DOMContentLoaded',function(){loadGospel(currentRite);});

/* ── Prayers ── */
document.querySelectorAll('.prayer-item').forEach(function(item){
  var toggle=item.querySelector('.prayer-toggle');
  var body=item.querySelector('.prayer-body');
  if(!toggle||!body) return;
  toggle.addEventListener('click',function(){
    var isOpen=toggle.getAttribute('aria-expanded')==='true';
    document.querySelectorAll('.prayer-item').forEach(function(i){
      if(i!==item){
        i.classList.remove('open');
        var t=i.querySelector('.prayer-toggle'),b=i.querySelector('.prayer-body');
        if(t) t.setAttribute('aria-expanded','false');
        if(b) b.classList.add('hidden');
      }
    });
    toggle.setAttribute('aria-expanded',isOpen?'false':'true');
    body.classList.toggle('hidden',isOpen);
    item.classList.toggle('open',!isOpen);
    if(!isOpen) setTimeout(function(){item.scrollIntoView({behavior:'smooth',block:'nearest'});},100);
  });
});

/* ── Personal Intentions ── */
var INT_KEY='amdg_int_v2';
function loadInts(){try{return JSON.parse(localStorage.getItem(INT_KEY)||'[]');}catch(e){return [];}}
function saveInts(a){localStorage.setItem(INT_KEY,JSON.stringify(a));}
function fmtDate(iso){
  try{return new Date(iso).toLocaleDateString('it-IT',{day:'numeric',month:'long',year:'numeric'});}
  catch(e){return iso.slice(0,10);}
}

function renderInts(){
  var list=document.getElementById('int-list');
  var empty=document.getElementById('int-empty');
  if(!list||!empty) return;
  var arr=loadInts();
  list.innerHTML='';
  if(!arr.length){empty.classList.remove('hidden');return;}
  empty.classList.add('hidden');
  arr.forEach(function(item,idx){
    var div=document.createElement('div');
    div.className='int-item'+(item.done?' int-done':'');
    div.innerHTML=
      '<div class="int-dot"></div>'+
      '<div class="int-body">'+
        '<p class="int-text">'+item.text.replace(/</g,'&lt;')+'</p>'+
        '<p class="int-date">'+fmtDate(item.date)+(item.done?' &#8226; Esaudita':'')+'</p>'+
      '</div>'+
      '<div class="int-actions">'+
        '<button class="int-btn int-done-btn" data-idx="'+idx+'" title="'+(item.done?'Riapri':'Esaudita')+'">'+
          (item.done?'&#8617;':'&#10003;')+
        '</button>'+
        '<button class="int-btn int-del-btn" data-idx="'+idx+'" title="Elimina">&#215;</button>'+
      '</div>';
    list.appendChild(div);
  });
  list.querySelectorAll('.int-done-btn').forEach(function(btn){
    btn.addEventListener('click',function(e){
      e.stopPropagation();
      var idx=parseInt(btn.dataset.idx,10);
      var arr=loadInts(); arr[idx].done=!arr[idx].done;
      saveInts(arr); renderInts();
    });
  });
  list.querySelectorAll('.int-del-btn').forEach(function(btn){
    btn.addEventListener('click',function(e){
      e.stopPropagation();
      if(!confirm('Eliminare questa intenzione?')) return;
      var idx=parseInt(btn.dataset.idx,10);
      var arr=loadInts(); arr.splice(idx,1);
      saveInts(arr); renderInts();
    });
  });
}

var intInput=document.getElementById('int-input');
var intChars=document.getElementById('int-chars');
var intAddBtn=document.getElementById('int-add-btn');
if(intInput&&intChars){
  intInput.addEventListener('input',function(){intChars.textContent=intInput.value.length;});
}
if(intAddBtn){
  intAddBtn.addEventListener('click',function(){
    var text=(intInput?intInput.value:'').trim();
    if(!text) return;
    var arr=loadInts();
    arr.unshift({text:text.slice(0,500),date:new Date().toISOString(),done:false});
    saveInts(arr);
    intInput.value=''; if(intChars) intChars.textContent='0';
    renderInts();
  });
}
if(intInput){
  intInput.addEventListener('keydown',function(e){
    if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)&&intAddBtn) intAddBtn.click();
  });
}
document.addEventListener('DOMContentLoaded',renderInts);

/* ── Streak Tracker ── */
var STREAK_KEY='amdg_streak_v2';
function getVisits(){try{return JSON.parse(localStorage.getItem(STREAK_KEY)||'[]');}catch(e){return [];}}
function saveVisits(a){localStorage.setItem(STREAK_KEY,JSON.stringify(a));}

function recordVisit(){
  var today=todayISO(), arr=getVisits();
  if(!arr.includes(today)){arr.push(today); saveVisits(arr);}
}

function renderStreak(){
  var bar=document.getElementById('streak-bar');
  if(!bar) return;
  var arr=getVisits().sort();
  var today=todayISO();
  var totalDays=arr.length;

  /* Current consecutive streak */
  var streak=0;
  var cur=new Date();
  while(true){
    var iso=cur.toISOString().slice(0,10);
    if(arr.includes(iso)){streak++; cur.setDate(cur.getDate()-1);}
    else break;
  }

  /* Build full day list from first visit to today */
  var allDays=[];
  if(arr.length>0){
    var start=new Date(arr[0]);
    var end=new Date(today);
    var d=new Date(start);
    while(d<=end){allDays.push(d.toISOString().slice(0,10)); d.setDate(d.getDate()+1);}
  } else {
    allDays=[today];
  }

  var streakTxt = streak>=2 ? streak+' giorni consecutivi'
                : streak===1 ? 'Qui oggi'
                : '';

  bar.innerHTML=
    '<div class="streak-wrap">'+
      '<div class="streak-header">'+
        '<span class="streak-label">Il tuo cammino &mdash; '+totalDays+' '+(totalDays===1?'giornata':'giornate')+'</span>'+
        (streakTxt?'<span class="streak-count">'+streakTxt+'</span>':'')+
      '</div>'+
      '<div class="streak-scroll" id="streak-scroll" tabindex="0" role="img" aria-label="Giorni di preghiera">'+
        '<div class="streak-dots" id="streak-dots"></div>'+
      '</div>'+
    '</div>';

  var dotsEl=bar.querySelector('#streak-dots');
  allDays.forEach(function(iso){
    var dot=document.createElement('div');
    dot.className='streak-dot';
    dot.setAttribute('title',iso);
    if(iso===today) dot.classList.add('today');
    else if(arr.includes(iso)) dot.classList.add('visited');
    dotsEl.appendChild(dot);
  });

  /* Auto-scroll to end (today) */
  var sc=bar.querySelector('#streak-scroll');
  if(sc) setTimeout(function(){sc.scrollLeft=sc.scrollWidth;},50);
}

recordVisit();
document.addEventListener('DOMContentLoaded',renderStreak);
