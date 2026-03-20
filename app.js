'use strict';

// ─── Data ────────────────────────────────────────────────
const dateEl = document.getElementById('site-date');
if (dateEl) {
  dateEl.textContent = new Date().toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}

function todayISO() { return new Date().toISOString().slice(0, 10); }
function todayFmt() {
  const t = new Date();
  return `${t.getFullYear()}${String(t.getMonth()+1).padStart(2,'0')}${String(t.getDate()).padStart(2,'0')}`;
}

// ─── Stato ───────────────────────────────────────────────
let currentRite  = 'romano';
let gospelsCache = null;

const $ = id => document.getElementById(id);
const gospelLoading     = $('gospel-loading');
const gospelContent     = $('gospel-content');
const gospelError       = $('gospel-error');
const gospelRefEl       = $('gospel-reference');
const gospelTextEl      = $('gospel-text');
const gospelLinkEl      = $('gospel-source-link');
const errorLinksEl      = $('error-links');
const retryBtn          = $('retry-btn');
const commentSection    = $('comment-section');
const commentTitleEl    = $('comment-title');
const commentAuthorEl   = $('comment-author');
const commentTextEl     = $('comment-text');

// ─── Pulizia testo ───────────────────────────────────────
function cleanText(raw) {
  return (raw || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/&nbsp;/g,' ').replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(n))
    .replace(/&apos;/g,"'").replace(/&quot;/g,'"')
    .replace(/Copyright\s*@[^\n]*/gi,'')
    .replace(/Per ricevere il Vangelo[^\n]*/gi,'')
    .replace(/vangelodelgiorno\.org[^\n]*/gi,'')
    .split('\n').map(l=>l.trim()).filter(l=>l.length>0).join('\n');
}

// ─── UI ──────────────────────────────────────────────────
function showLoading() {
  gospelLoading.classList.remove('hidden');
  gospelContent.classList.add('hidden');
  gospelError.classList.add('hidden');
  commentSection.classList.add('hidden');
}

function renderParagraphs(container, text) {
  container.innerHTML = '';
  cleanText(text).split('\n').filter(p=>p.trim()).forEach(para => {
    const p = document.createElement('p');
    p.textContent = para.trim();
    container.appendChild(p);
  });
}

function showContent(data, rite) {
  gospelLoading.classList.add('hidden');
  gospelError.classList.add('hidden');

  gospelRefEl.textContent = cleanText(data.reference) || 'Vangelo del Giorno';
  renderParagraphs(gospelTextEl, data.text);
  gospelLinkEl.href = rite === 'romano'
    ? 'https://www.evangelizo.org/v2/it'
    : 'https://vangelodelgiorno.org/ambrosiano/';
  gospelContent.classList.remove('hidden');

  // Commento / predica
  if (data.commentText && data.commentText.trim().length > 30) {
    commentTitleEl.textContent  = cleanText(data.commentTitle)  || 'Commento al Vangelo';
    commentAuthorEl.textContent = cleanText(data.commentAuthor) ? `— ${cleanText(data.commentAuthor)}` : '';
    renderParagraphs(commentTextEl, data.commentText);
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
  const links = rite === 'romano'
    ? [{ text:'Evangelizo — Vangelo del Giorno →', url:'https://www.evangelizo.org/v2/it' },
       { text:'Vatican News →', url:'https://www.vaticannews.va/it/vangelo-del-giorno-e-parola-del-giorno.html' }]
    : [{ text:'Vangelo Ambrosiano →', url:'https://vangelodelgiorno.org/ambrosiano/' },
       { text:'Chiesa di Milano →', url:'https://www.diocesimilano.it' }];
  links.forEach(l => {
    const a = document.createElement('a');
    a.href=l.url; a.textContent=l.text; a.target='_blank'; a.rel='noopener noreferrer';
    errorLinksEl.appendChild(a);
  });
  gospelError.classList.remove('hidden');
}

// ─── Sorgenti ────────────────────────────────────────────
async function fromLocalFile(rite) {
  if (!gospelsCache) {
    const r = await fetch('./gospels.json');
    if (!r.ok) throw new Error('gospels.json non trovato');
    gospelsCache = await r.json();
  }
  const entry = gospelsCache[todayISO()];
  if (!entry) throw new Error('data non presente');
  const data = entry[rite];
  if (!data?.text) throw new Error('testo mancante');
  return data;
}

const PROXY = 'https://api.allorigins.win/raw?url=';
const EVA   = 'https://feed.evangelizo.org/v2/reader.php';

async function evaFetch(params) {
  const r = await fetch(PROXY + encodeURIComponent(`${EVA}?${new URLSearchParams(params)}`));
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return (await r.text()).trim();
}

async function fromAPI(rite) {
  const date = todayFmt(), lang = 'IT';
  const [reference, text, commentTitle, commentAuthor, commentText] = await Promise.all([
    evaFetch({ date, lang, type:'reading_lt', content:'GSP' }),
    evaFetch({ date, lang, type:'reading',    content:'GSP' }),
    evaFetch({ date, lang, type:'comment_t' }),
    evaFetch({ date, lang, type:'comment_a' }),
    evaFetch({ date, lang, type:'comment'   }),
  ]);
  return { reference, text, commentTitle, commentAuthor, commentText };
}

// ─── Loader principale ───────────────────────────────────
async function loadGospel(rite) {
  showLoading();
  const key = `gospel_${rite}_${todayISO()}`;
  const cached = sessionStorage.getItem(key);
  if (cached) {
    try { showContent(JSON.parse(cached), rite); return; } catch(_) {}
  }
  try {
    let data;
    try        { data = await fromLocalFile(rite); }
    catch(_)   { data = await fromAPI(rite); }
    sessionStorage.setItem(key, JSON.stringify(data));
    showContent(data, rite);
  } catch(err) {
    console.warn('Gospel non disponibile:', err);
    showError(rite);
  }
}

// ─── Toggle rito ─────────────────────────────────────────
document.querySelectorAll('.rite-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const rite = btn.dataset.rite;
    if (rite === currentRite) return;
    currentRite = rite;
    document.querySelectorAll('.rite-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.rite === rite);
      b.setAttribute('aria-pressed', b.dataset.rite === rite ? 'true' : 'false');
    });
    loadGospel(rite);
  });
});
if (retryBtn) retryBtn.addEventListener('click', () => loadGospel(currentRite));
loadGospel(currentRite);

// ─── Preghiere ───────────────────────────────────────────
document.querySelectorAll('.prayer-card').forEach(card => {
  card.addEventListener('click', () => {
    const prayerId = card.dataset.prayer;
    const body = document.getElementById(`body-${prayerId}`);
    if (!body) return;
    const isOpen = card.getAttribute('aria-expanded') === 'true';
    document.querySelectorAll('.prayer-card').forEach(c => {
      if (c !== card) {
        c.setAttribute('aria-expanded','false');
        const o = document.getElementById(`body-${c.dataset.prayer}`);
        if (o) o.classList.add('hidden');
      }
    });
    card.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
    body.classList.toggle('hidden', isOpen);
    if (!isOpen) setTimeout(() => card.scrollIntoView({ behavior:'smooth', block:'nearest' }), 100);
  });
});

// ─── Intenzioni ──────────────────────────────────────────
const IKEY       = 'admdg_intentions';
const intTA      = $('intentions-text');
const saveBtn    = $('save-intentions');
const saveStatus = $('save-status');
const clearBtn   = $('clear-intentions');

if (intTA) {
  const saved = localStorage.getItem(IKEY);
  if (saved) intTA.value = saved;
  let t = null;
  intTA.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(() => localStorage.setItem(IKEY, intTA.value), 800);
  });
}
if (saveBtn) saveBtn.addEventListener('click', () => {
  localStorage.setItem(IKEY, intTA.value);
  saveStatus.textContent = 'Salvato ✓';
  setTimeout(() => { saveStatus.textContent=''; }, 2500);
});
if (clearBtn) clearBtn.addEventListener('click', () => {
  if (!intTA.value.trim()) return;
  if (confirm('Vuoi cancellare tutte le tue intenzioni?')) {
    intTA.value=''; localStorage.removeItem(IKEY);
    saveStatus.textContent='Cancellato.';
    setTimeout(()=>{saveStatus.textContent='';},2500);
  }
});
