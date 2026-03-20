'use strict';

/* ============================================================
   AMDG app.js
   Configura Supabase inserendo i tuoi dati (vedi SETUP_INTENZIONI.md)
   ============================================================ */

// --- SUPABASE CONFIG (inserisci i tuoi valori) ---
var SUPABASE_URL = '';   // es. https://abcxyz.supabase.co
var SUPABASE_KEY = '';   // anon/public key
// ---------------------------------------------------

/* Theme */
var html     = document.documentElement;
var themeBtn = document.getElementById('theme-toggle');
html.setAttribute('data-theme', localStorage.getItem('amdg_theme') || 'dark');
themeBtn.addEventListener('click', function() {
  var next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('amdg_theme', next);
});

/* Date */
var dateEl = document.getElementById('site-date');
if (dateEl) {
  dateEl.textContent = new Date().toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}

function todayISO() { return new Date().toISOString().slice(0, 10); }
function todayFmt() {
  var t = new Date();
  return '' + t.getFullYear()
    + String(t.getMonth()+1).padStart(2,'0')
    + String(t.getDate()).padStart(2,'0');
}

/* Giussani */
function loadGiussani() {
  var el  = document.getElementById('giussani-text');
  var src = document.getElementById('giussani-source');
  if (!el || !src) return;
  if (typeof GIUSSANI === 'undefined' || !GIUSSANI.length) {
    el.innerHTML = '<p>Citazione non disponibile.</p>';
    return;
  }
  var start = new Date(new Date().getFullYear(), 0, 1);
  var doy   = Math.round((Date.now() - start.getTime()) / 86400000);
  var q     = GIUSSANI[doy % GIUSSANI.length];
  el.innerHTML = '';
  q.text.split('\n').filter(function(p){ return p.trim(); }).forEach(function(t) {
    var p = document.createElement('p'); p.textContent = t; el.appendChild(p);
  });
  src.textContent = q.source;
}
loadGiussani();

/* ── Gospel ─────────────────────────────────────── */
var currentRite  = 'romano';
var gospelsCache = null;

var gLoading  = document.getElementById('gospel-loading');
var gContent  = document.getElementById('gospel-content');
var gError    = document.getElementById('gospel-error');
var gRef      = document.getElementById('gospel-reference');
var gText     = document.getElementById('gospel-text');
var gLink     = document.getElementById('gospel-source-link');
var errLinks  = document.getElementById('error-links');
var retryBtn  = document.getElementById('retry-btn');
var cSection  = document.getElementById('comment-section');
var cTitle    = document.getElementById('comment-title');
var cText     = document.getElementById('comment-text');
var cAuthor   = document.getElementById('comment-author');

function cleanText(raw) {
  return (raw || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, function(_, n) { return String.fromCharCode(n); })
    .replace(/Copyright[^\n]*/gi, '')
    .replace(/Per ricevere il Vangelo[^\n]*/gi, '')
    .replace(/vangelodelgiorno\.org[^\n]*/gi, '')
    .split('\n').map(function(l){ return l.trim(); }).filter(function(l){ return l.length > 0; }).join('\n');
}

function fillParagraphs(el, text) {
  el.innerHTML = '';
  cleanText(text).split('\n').filter(function(p){ return p.trim(); }).forEach(function(t) {
    var p = document.createElement('p'); p.textContent = t; el.appendChild(p);
  });
}

function showLoading() {
  gLoading.classList.remove('hidden');
  gContent.classList.add('hidden');
  gError.classList.add('hidden');
  cSection.classList.add('hidden');
}

function showContent(data, rite) {
  gLoading.classList.add('hidden');
  gError.classList.add('hidden');
  gRef.textContent = cleanText(data.reference) || 'Vangelo del Giorno';
  fillParagraphs(gText, data.text);

  // Source links fissi e corretti
  if (rite === 'romano') {
    gLink.href        = 'https://www.vaticannews.va/it/vangelo-del-giorno-e-parola-del-giorno.html';
    gLink.textContent = 'Vatican News - Vangelo del giorno';
  } else {
    gLink.href        = 'https://www.laparola.it/ambrosiano/liturgia-della-parola/';
    gLink.textContent = 'La Parola - Rito Ambrosiano';
  }

  gContent.classList.remove('hidden');

  var ct = cleanText(data.commentText || '');
  if (ct.length > 30) {
    cTitle.textContent  = cleanText(data.commentTitle) || 'Commento al Vangelo';
    cAuthor.textContent = cleanText(data.commentAuthor)
      ? ('\u2014 ' + cleanText(data.commentAuthor)) : '';
    fillParagraphs(cText, data.commentText);
    cSection.classList.remove('hidden');
  } else {
    cSection.classList.add('hidden');
  }
}

function showError(rite) {
  gLoading.classList.add('hidden');
  gContent.classList.add('hidden');
  cSection.classList.add('hidden');
  errLinks.innerHTML = '';
  var links = rite === 'romano'
    ? [{ text: 'Vatican News - Vangelo del giorno',
         url:  'https://www.vaticannews.va/it/vangelo-del-giorno-e-parola-del-giorno.html' },
       { text: 'Evangelizo',
         url:  'https://www.evangelizo.org/v2/it' }]
    : [{ text: 'La Parola - Rito Ambrosiano',
         url:  'https://www.laparola.it/ambrosiano/liturgia-della-parola/' },
       { text: 'Diocesi di Milano',
         url:  'https://www.diocesimilano.it' }];
  links.forEach(function(l) {
    var a = document.createElement('a');
    a.href = l.url; a.textContent = l.text;
    a.target = '_blank'; a.rel = 'noopener noreferrer';
    errLinks.appendChild(a);
  });
  gError.classList.remove('hidden');
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
  var qs  = Object.keys(params).map(function(k) {
    return k + '=' + encodeURIComponent(params[k]);
  }).join('&');
  var url = PROXY + encodeURIComponent(EVA + '?' + qs);
  var r   = await fetch(url);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return (await r.text()).trim();
}

async function fromAPI() {
  var date = todayFmt(), lang = 'IT';
  var res = await Promise.all([
    evaFetch({ date: date, lang: lang, type: 'reading_lt', content: 'GSP' }),
    evaFetch({ date: date, lang: lang, type: 'reading',    content: 'GSP' }),
    evaFetch({ date: date, lang: lang, type: 'comment_t' }),
    evaFetch({ date: date, lang: lang, type: 'comment_a' }),
    evaFetch({ date: date, lang: lang, type: 'comment'   }),
  ]);
  return {
    reference: res[0], text: res[1],
    commentTitle: res[2], commentAuthor: res[3], commentText: res[4]
  };
}

async function loadGospel(rite) {
  showLoading();
  var key    = 'gospel_' + rite + '_' + todayISO();
  var cached = sessionStorage.getItem(key);
  if (cached) {
    try { showContent(JSON.parse(cached), rite); return; } catch(e) {}
  }
  try {
    var data;
    try        { data = await fromLocalFile(rite); }
    catch(e1)  { data = await fromAPI(); }
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
if (retryBtn) retryBtn.addEventListener('click', function() { loadGospel(currentRite); });
loadGospel(currentRite);

/* ── Prayers ─────────────────────────────────── */
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
        if (t) t.setAttribute('aria-expanded', 'false');
        if (b) b.classList.add('hidden');
      }
    });
    toggle.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
    body.classList.toggle('hidden', isOpen);
    item.classList.toggle('open', !isOpen);
    if (!isOpen) {
      setTimeout(function() {
        item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 80);
    }
  });
});

/* ── Shared Intentions (Supabase) ────────────── */
var intTA   = document.getElementById('intentions-text');
var saveBtn = document.getElementById('save-intentions');
var saveSt  = document.getElementById('save-status');
var charCt  = document.getElementById('char-count');
var confEl  = document.getElementById('intentions-config');
var chapEl  = document.getElementById('chapel-list');
var loadMsg = document.getElementById('chapel-loading');

function supabaseConfigured() {
  return SUPABASE_URL && SUPABASE_URL.length > 10
      && SUPABASE_KEY && SUPABASE_KEY.length > 10;
}

// Char counter
if (intTA && charCt) {
  intTA.addEventListener('input', function() {
    charCt.textContent = intTA.value.length;
  });
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
}

async function loadChapel() {
  if (!chapEl) return;
  if (!supabaseConfigured()) {
    if (loadMsg) loadMsg.textContent = 'Cappella non configurata (vedi SETUP_INTENZIONI.md).';
    if (confEl)  confEl.classList.remove('hidden');
    return;
  }
  try {
    var res = await fetch(
      SUPABASE_URL + '/rest/v1/intentions?select=testo,created_at&order=created_at.desc&limit=60',
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY } }
    );
    if (!res.ok) throw new Error('HTTP ' + res.status);
    var rows = await res.json();
    if (loadMsg) loadMsg.style.display = 'none';
    chapEl.innerHTML = '';
    if (!rows.length) {
      var e = document.createElement('p');
      e.className = 'chapel-empty';
      e.textContent = 'Nessuna intenzione ancora. Sii il primo a pregare.';
      chapEl.appendChild(e);
      return;
    }
    rows.forEach(function(row) {
      var div  = document.createElement('div');
      div.className = 'chapel-item';
      var txt  = document.createElement('p');
      txt.className = 'chapel-item-text';
      txt.textContent = row.testo;
      var dt   = document.createElement('p');
      dt.className = 'chapel-item-date';
      dt.textContent = formatDate(row.created_at);
      div.appendChild(txt);
      div.appendChild(dt);
      chapEl.appendChild(div);
    });
  } catch(err) {
    console.error('Chapel load error:', err);
    if (loadMsg) loadMsg.textContent = 'Errore nel caricamento delle intenzioni.';
  }
}

if (saveBtn) {
  saveBtn.addEventListener('click', async function() {
    var text = (intTA ? intTA.value.trim() : '');
    if (!text) { saveSt.textContent = 'Scrivi prima la tua intenzione.'; return; }
    if (!supabaseConfigured()) {
      saveSt.textContent = 'Configura Supabase prima (vedi SETUP_INTENZIONI.md).';
      return;
    }
    saveBtn.disabled = true;
    saveSt.textContent = 'Invio in corso\u2026';
    try {
      var res = await fetch(
        SUPABASE_URL + '/rest/v1/intentions',
        {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': 'Bearer ' + SUPABASE_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ testo: text })
        }
      );
      if (!res.ok) throw new Error('HTTP ' + res.status);
      intTA.value = '';
      if (charCt) charCt.textContent = '0';
      saveSt.textContent = 'Affidata alla cappella \u2713';
      setTimeout(function() { saveSt.textContent = ''; }, 3000);
      loadChapel();
    } catch(err) {
      console.error('Save intention error:', err);
      saveSt.textContent = 'Errore. Riprova.';
    } finally {
      saveBtn.disabled = false;
    }
  });
}

loadChapel();
