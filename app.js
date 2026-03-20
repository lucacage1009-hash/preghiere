/* ======================================================
   AD MAIOREM DEI GLORIAM — app.js
   Vangelo: legge da gospels.json (locale) se disponibile,
            altrimenti chiama l'API Evangelizo in tempo reale.
   ====================================================== */
'use strict';

// ─── Data di oggi ───────────────────────────────────────
const dateEl = document.getElementById('site-date');
if (dateEl) {
  dateEl.textContent = new Date().toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}

function todayISO() {
  const t = new Date();
  return t.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function todayFormatted() {
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, '0');
  const d = String(t.getDate()).padStart(2, '0');
  return `${y}${m}${d}`; // "YYYYMMDD" per Evangelizo API
}

// ─── Stato ──────────────────────────────────────────────
let currentRite  = 'romano';
let gospelsCache = null; // contenuto di gospels.json in memoria

const gospelLoading = document.getElementById('gospel-loading');
const gospelContent = document.getElementById('gospel-content');
const gospelError   = document.getElementById('gospel-error');
const gospelRefEl   = document.getElementById('gospel-reference');
const gospelTextEl  = document.getElementById('gospel-text');
const gospelLinkEl  = document.getElementById('gospel-source-link');
const errorLinksEl  = document.getElementById('error-links');
const retryBtn      = document.getElementById('retry-btn');

// ─── UI helpers ─────────────────────────────────────────
function showLoading() {
  gospelLoading.classList.remove('hidden');
  gospelContent.classList.add('hidden');
  gospelError.classList.add('hidden');
}

function renderText(raw) {
  return raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n));
}

function showContent(reference, text, sourceUrl) {
  gospelLoading.classList.add('hidden');
  gospelError.classList.add('hidden');
  gospelRefEl.textContent = reference;
  gospelTextEl.innerHTML  = '';
  renderText(text).split(/\n+/).filter(p => p.trim()).forEach(para => {
    const p = document.createElement('p');
    p.textContent = para.trim();
    gospelTextEl.appendChild(p);
  });
  gospelLinkEl.href = sourceUrl;
  gospelContent.classList.remove('hidden');
}

function showError(rite) {
  gospelLoading.classList.add('hidden');
  gospelContent.classList.add('hidden');
  errorLinksEl.innerHTML = '';
  const links = rite === 'romano'
    ? [{ text: 'Evangelizo — Vangelo del Giorno →',  url: 'https://www.evangelizo.org/v2/it' },
       { text: 'Vatican News — Vangelo del Giorno →', url: 'https://www.vaticannews.va/it/vangelo-del-giorno-e-parola-del-giorno.html' }]
    : [{ text: 'Evangelizo — Ambrosiano →',           url: 'https://vangelodelgiorno.org/ambrosiano/' },
       { text: 'Chiesa di Milano — Liturgia →',        url: 'https://www.diocesimilano.it/chiesa-e-comunita/liturgia/' }];
  links.forEach(l => {
    const a = document.createElement('a');
    a.href = l.url; a.textContent = l.text;
    a.target = '_blank'; a.rel = 'noopener noreferrer';
    errorLinksEl.appendChild(a);
  });
  gospelError.classList.remove('hidden');
}

// ─── Sorgente 1: gospels.json locale ────────────────────
async function loadFromLocalFile(rite) {
  // Carica il JSON una sola volta e lo tiene in memoria
  if (!gospelsCache) {
    const res = await fetch('./gospels.json');
    if (!res.ok) throw new Error('gospels.json non trovato');
    gospelsCache = await res.json();
  }

  const entry = gospelsCache[todayISO()];
  if (!entry) throw new Error(`Data ${todayISO()} non presente in gospels.json`);

  const data = entry[rite];
  if (!data || !data.text) throw new Error('Testo non disponibile per questo rito');

  return {
    reference: data.reference || 'Vangelo del Giorno',
    text:      data.text,
    sourceUrl: rite === 'romano'
      ? 'https://www.evangelizo.org/v2/it'
      : 'https://vangelodelgiorno.org/ambrosiano/',
  };
}

// ─── Sorgente 2: Evangelizo API (fallback live) ──────────
const EVANGELIZO = 'https://feed.evangelizo.org/v2/reader.php';
const PROXY      = 'https://api.allorigins.win/raw?url=';

async function evangelizoFetch(params) {
  const url     = `${EVANGELIZO}?${new URLSearchParams(params)}`;
  const res     = await fetch(PROXY + encodeURIComponent(url));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  if (!text?.trim()) throw new Error('Risposta vuota');
  return text.trim();
}

async function loadFromAPI(rite) {
  const date = todayFormatted();
  const lang = 'IT'; // Evangelizo: IT = rito romano italiano

  const [reference, text] = await Promise.all([
    evangelizoFetch({ date, lang, type: 'reading_lt', content: 'GSP' }),
    evangelizoFetch({ date, lang, type: 'reading',    content: 'GSP' }),
  ]);

  const note = rite === 'ambrosiano'
    ? ' (rito romano — testo ambrosiano non disponibile online oggi)'
    : '';

  return {
    reference: reference + note,
    text,
    sourceUrl: rite === 'romano'
      ? 'https://www.evangelizo.org/v2/it'
      : 'https://vangelodelgiorno.org/ambrosiano/',
  };
}

// ─── Loader principale ───────────────────────────────────
async function loadGospel(rite) {
  showLoading();

  // Cache di sessione
  const cacheKey = `gospel_${rite}_${todayISO()}`;
  const cached   = sessionStorage.getItem(cacheKey);
  if (cached) {
    try {
      const { reference, text, sourceUrl } = JSON.parse(cached);
      showContent(reference, text, sourceUrl);
      return;
    } catch (_) {}
  }

  try {
    // 1ª scelta: file locale gospels.json
    let result;
    try {
      result = await loadFromLocalFile(rite);
    } catch (localErr) {
      // 2ª scelta: API live
      result = await loadFromAPI(rite);
    }

    sessionStorage.setItem(cacheKey, JSON.stringify(result));
    showContent(result.reference, result.text, result.sourceUrl);
  } catch (err) {
    console.warn('Gospel non disponibile:', err);
    showError(rite);
  }
}

// ─── Toggle rito ────────────────────────────────────────
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
    const body     = document.getElementById(`body-${prayerId}`);
    if (!body) return;
    const isOpen = card.getAttribute('aria-expanded') === 'true';

    document.querySelectorAll('.prayer-card').forEach(c => {
      if (c !== card) {
        c.setAttribute('aria-expanded', 'false');
        const o = document.getElementById(`body-${c.dataset.prayer}`);
        if (o) o.classList.add('hidden');
      }
    });

    card.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
    body.classList.toggle('hidden', isOpen);
    if (!isOpen) setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
  });
});

// ─── Intenzioni ──────────────────────────────────────────
const INTENTIONS_KEY = 'admdg_intentions';
const intentionsTA   = document.getElementById('intentions-text');
const saveBtn        = document.getElementById('save-intentions');
const saveStatus     = document.getElementById('save-status');
const clearBtn       = document.getElementById('clear-intentions');

if (intentionsTA) {
  const saved = localStorage.getItem(INTENTIONS_KEY);
  if (saved) intentionsTA.value = saved;

  let timer = null;
  intentionsTA.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => localStorage.setItem(INTENTIONS_KEY, intentionsTA.value), 800);
  });
}

if (saveBtn) {
  saveBtn.addEventListener('click', () => {
    localStorage.setItem(INTENTIONS_KEY, intentionsTA.value);
    saveStatus.textContent = 'Salvato ✓';
    setTimeout(() => { saveStatus.textContent = ''; }, 2500);
  });
}

if (clearBtn) {
  clearBtn.addEventListener('click', () => {
    if (!intentionsTA.value.trim()) return;
    if (confirm('Vuoi cancellare tutte le tue intenzioni salvate?')) {
      intentionsTA.value = '';
      localStorage.removeItem(INTENTIONS_KEY);
      saveStatus.textContent = 'Cancellato.';
      setTimeout(() => { saveStatus.textContent = ''; }, 2500);
    }
  });
}
