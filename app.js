'use strict';

/* ── Theme ─────────────────────────────────── */
const html     = document.documentElement;
const themeBtn = document.getElementById('theme-toggle');
html.setAttribute('data-theme', localStorage.getItem('amdg_theme') || 'dark');
themeBtn.addEventListener('click', () => {
  const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('amdg_theme', next);
});

/* ── Date ──────────────────────────────────── */
const dateEl = document.getElementById('site-date');
if (dateEl) dateEl.textContent = new Date().toLocaleDateString('it-IT', {
  weekday:'long', day:'numeric', month:'long', year:'numeric'
});

function todayISO() { return new Date().toISOString().slice(0, 10); }
function todayFmt() {
  const t = new Date();
  return '' + t.getFullYear() + String(t.getMonth()+1).padStart(2,'0') + String(t.getDate()).padStart(2,'0');
}

/* ── Giussani ──────────────────────────────── */
function loadGiussani() {
  const el = document.getElementById('giussani-text');
  const src = document.getElementById('giussani-source');
  if (!el || !src || typeof GIUSSANI === 'undefined') {
    if (el) { el.innerHTML = '<p>Caricamento...</p>'; }
    return;
  }
  const doy = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  const q = GIUSSANI[doy % GIUSSANI.length];
  el.innerHTML = '';
  q.text.split('\n').filter(p => p.trim()).forEach(t => {
    const p = document.createElement('p'); p.textContent = t; el.appendChild(p);
  });
  src.textContent = q.source;
}

/* ── Gospel ────────────────────────────────── */
let currentRite  = 'romano';
let gospelsCache = null;

const gospelLoading  = document.getElementById('gospel-loading');
const gospelContent  = document.getElementById('gospel-content');
const gospelError    = document.getElementById('gospel-error');
const gospelRefEl    = document.getElementById('gospel-reference');
const gospelTextEl   = document.getElementById('gospel-text');
const gospelLinkEl   = document.getElementById('gospel-source-link');
const errorLinksEl   = document.getElementById('error-links');
const retryBtn       = document.getElementById('retry-btn');
const commentSection = document.getElementById('comment-section');
const commentTitleEl = document.getElementById('comment-title');
const commentTextEl  = document.getElementById('comment-text');
const commentAuthEl  = document.getElementById('comment-author');

function cleanText(raw) {
  return (raw || '')
    .replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/&nbsp;/g,' ').replace(/&#(\d+);/g, function(_,n){ return String.fromCharCode(n); })
    .replace(/Copyright[^\n]*/gi,'').replace(/Per ricevere il Vangelo[^\n]*/gi,'')
    .replace(/vangelodelgiorno\.org[^\n]*/gi,'')
    .split('\n').map(function(l){return l.trim();}).filter(function(l){return l.length>0;}).join('\n');
}

function fillParagraphs(el, text) {
  el.innerHTML = '';
  cleanText(text).split('\n').filter(function(p){return p.trim();}).forEach(function(t) {
    var p = document.createElement('p'); p.textContent = t; el.appendChild(p);
  });
}

function showLoading() {
  gospelLoading.classList.remove('hidden');
  gospelContent.classList.add('hidden');
  gospelError.classList.add('hidden');
  commentSection.classList.add('hidden');
}

function showContent(data, rite) {
  gospelLoading.classList.add('hidden');
  gospelError.classList.add('hidden');
  gospelRefEl.textContent = cleanText(data.reference) || 'Vangelo del Giorno';
  fillParagraphs(gospelTextEl, data.text);
  gospelLinkEl.href = rite === 'romano'
    ? 'https://www.evangelizo.org/v2/it'
    : 'https://vangelodelgiorno.org/ambrosiano/';
  gospelContent.classList.remove('hidden');
  var ct = cleanText(data.commentText || '');
  if (ct.length > 30) {
    commentTitleEl.textContent = cleanText(data.commentTitle) || 'Commento al Vangelo';
    commentAuthEl.textContent  = cleanText(data.commentAuthor) ? ('— ' + cleanText(data.commentAuthor)) : '';
    fillParagraphs(commentTextEl, data.commentText);
    commentSection.classList.remove('hidden');
  } else {
    commentSection.classList.add('hidden');
  }
}

function showError(rite) {
  gospelLoading.classList.add('hidden');
  gospelContent.classList.add('hidden');
  commentSection.classList.add('hidden');
  errorLinksEl.innerHTML = '';
  var links = rite === 'romano'
    ? [{text:'Evangelizo.org', url:'https://www.evangelizo.org/v2/it'},
       {text:'Vatican News',   url:'https://www.vaticannews.va/it/vangelo-del-giorno-e-parola-del-giorno.html'}]
    : [{text:'Vangelo Ambrosiano', url:'https://vangelodelgiorno.org/ambrosiano/'},
       {text:'Diocesi di Milano',  url:'https://www.diocesimilano.it'}];
  links.forEach(function(l) {
    var a = document.createElement('a'); a.href=l.url; a.textContent=l.text;
    a.target='_blank'; a.rel='noopener noreferrer'; errorLinksEl.appendChild(a);
  });
  gospelError.classList.remove('hidden');
}

async function fromLocalFile(rite) {
  if (!gospelsCache) {
    var r = await fetch('./gospels.json');
    if (!r.ok) throw new Error('no file');
    gospelsCache = await r.json();
  }
  var entry = gospelsCache[todayISO()];
  if (!entry) throw new Error('no date');
  var data = entry[rite];
  if (!data || !data.text) throw new Error('no text');
  return data;
}

var PROXY = 'https://api.allorigins.win/raw?url=';
var EVA   = 'https://feed.evangelizo.org/v2/reader.php';

async function evaFetch(params) {
  var qs = Object.keys(params).map(function(k){ return k+'='+encodeURIComponent(params[k]); }).join('&');
  var url = PROXY + encodeURIComponent(EVA + '?' + qs);
  var r = await fetch(url);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return (await r.text()).trim();
}

async function fromAPI() {
  var date = todayFmt(), lang = 'IT';
  var results = await Promise.all([
    evaFetch({date:date, lang:lang, type:'reading_lt', content:'GSP'}),
    evaFetch({date:date, lang:lang, type:'reading',    content:'GSP'}),
    evaFetch({date:date, lang:lang, type:'comment_t'}),
    evaFetch({date:date, lang:lang, type:'comment_a'}),
    evaFetch({date:date, lang:lang, type:'comment'}),
  ]);
  return {reference:results[0], text:results[1], commentTitle:results[2], commentAuthor:results[3], commentText:results[4]};
}

async function loadGospel(rite) {
  showLoading();
  var key = 'gospel_' + rite + '_' + todayISO();
  var cached = sessionStorage.getItem(key);
  if (cached) { try { showContent(JSON.parse(cached), rite); return; } catch(e){} }
  var data;
  try {
    try { data = await fromLocalFile(rite); }
    catch(e) { data = await fromAPI(); }
    sessionStorage.setItem(key, JSON.stringify(data));
    showContent(data, rite);
  } catch(err) {
    console.error('Gospel error:', err);
    showError(rite);
  }
}

document.querySelectorAll('.rite-tab').forEach(function(btn) {
  btn.addEventListener('click', function() {
    var rite = btn.dataset.rite;
    if (rite === currentRite) return;
    currentRite = rite;
    document.querySelectorAll('.rite-tab').forEach(function(b) {
      b.classList.toggle('active', b.dataset.rite === rite);
      b.setAttribute('aria-pressed', b.dataset.rite === rite ? 'true' : 'false');
    });
    loadGospel(rite);
  });
});
if (retryBtn) retryBtn.addEventListener('click', function(){ loadGospel(currentRite); });
loadGospel(currentRite);

/* ── Prayers ────────────────────────────────── */
document.querySelectorAll('.prayer-item').forEach(function(item) {
  var toggle = item.querySelector('.prayer-toggle');
  var body   = item.querySelector('.prayer-body');
  if (!toggle || !body) return;
  toggle.addEventListener('click', function() {
    var isOpen = toggle.getAttribute('aria-expanded') === 'true';
    document.querySelectorAll('.prayer-item').forEach(function(i) {
      if (i !== item) {
        i.classList.remove('open');
        var t = i.querySelector('.prayer-toggle');
        var b = i.querySelector('.prayer-body');
        if (t) t.setAttribute('aria-expanded','false');
        if (b) b.classList.add('hidden');
      }
    });
    toggle.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
    body.classList.toggle('hidden', isOpen);
    item.classList.toggle('open', !isOpen);
    if (!isOpen) setTimeout(function(){ item.scrollIntoView({behavior:'smooth',block:'nearest'}); }, 100);
  });
});

/* ── Intentions ─────────────────────────────── */
var IKEY    = 'amdg_intentions';
var intTA   = document.getElementById('intentions-text');
var saveBtn = document.getElementById('save-intentions');
var saveSt  = document.getElementById('save-status');
var clrBtn  = document.getElementById('clear-intentions');

if (intTA) {
  var sv = localStorage.getItem(IKEY); if (sv) intTA.value = sv;
  var timer = null;
  intTA.addEventListener('input', function() {
    clearTimeout(timer);
    timer = setTimeout(function(){ localStorage.setItem(IKEY, intTA.value); }, 800);
  });
}
if (saveBtn) saveBtn.addEventListener('click', function() {
  localStorage.setItem(IKEY, intTA.value);
  saveSt.textContent = 'Salvato \u2713';
  setTimeout(function(){ saveSt.textContent=''; }, 2500);
});
if (clrBtn) clrBtn.addEventListener('click', function() {
  if (!intTA.value.trim()) return;
  if (confirm('Cancellare le intenzioni?')) {
    intTA.value = ''; localStorage.removeItem(IKEY);
    saveSt.textContent = 'Cancellato.';
    setTimeout(function(){ saveSt.textContent=''; }, 2500);
  }
});

/* ── Init Giussani after DOM ready ───────────── */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadGiussani);
} else {
  loadGiussani();
}
