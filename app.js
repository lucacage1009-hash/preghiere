/* ======================================================
   AD MAIOREM DEI GLORIAM — app.js
   Handles: date display, gospel fetch (Evangelizo API),
            prayer cards, intentions save/load
   ====================================================== */

'use strict';

// ─── Date Display ──────────────────────────────────────
const dateEl = document.getElementById('site-date');
if (dateEl) {
  const today = new Date();
  dateEl.textContent = today.toLocaleDateString('it-IT', {
    weekday: 'long',
    day:     'numeric',
    month:   'long',
    year:    'numeric'
  });
}

// ─── Gospel State ──────────────────────────────────────
let currentRite = 'romano';

const gospelLoading = document.getElementById('gospel-loading');
const gospelContent = document.getElementById('gospel-content');
const gospelError   = document.getElementById('gospel-error');
const gospelRefEl   = document.getElementById('gospel-reference');
const gospelTextEl  = document.getElementById('gospel-text');
const gospelLinkEl  = document.getElementById('gospel-source-link');
const errorLinksEl  = document.getElementById('error-links');
const retryBtn      = document.getElementById('retry-btn');

// ─── UI State Helpers ───────────────────────────────────
function showLoading() {
  gospelLoading.classList.remove('hidden');
  gospelContent.classList.add('hidden');
  gospelError.classList.add('hidden');
}

function showContent(reference, text, sourceUrl) {
  gospelLoading.classList.add('hidden');
  gospelError.classList.add('hidden');

  gospelRefEl.textContent = reference;

  gospelTextEl.innerHTML = '';
  const cleaned = text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n));

  const paragraphs = cleaned.split(/\n+/).filter(p => p.trim().length > 0);
  paragraphs.forEach(para => {
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
    ? [
        { text: 'Evangelizo — Vangelo del Giorno →',   url: 'https://www.evangelizo.org/v2/it' },
        { text: 'Vatican News — Vangelo del Giorno →', url: 'https://www.vaticannews.va/it/vangelo-del-giorno-e-parola-del-giorno.html' },
      ]
    : [
        { text: 'Evangelizo — Calendario Ambrosiano →', url: 'https://vangelodelgiorno.org/ambrosiano/' },
        { text: 'Chiesa di Milano — Liturgia →',        url: 'https://www.diocesimilano.it/chiesa-e-comunita/liturgia/' },
      ];

  links.forEach(l => {
    const a = document.createElement('a');
    a.href        = l.url;
    a.textContent = l.text;
    a.target      = '_blank';
    a.rel         = 'noopener noreferrer';
    errorLinksEl.appendChild(a);
  });

  gospelError.classList.remove('hidden');
}

// ─── Evangelizo Official API ────────────────────────────
// Docs: https://feed.evangelizo.org/v2/reader.php
// Returns plain text per request. We use the allorigins CORS
// proxy so it works from an HTTPS GitHub Pages site.

const EVANGELIZO_BASE = 'https://feed.evangelizo.org/v2/reader.php';
const ALLORIGINS      = 'https://api.allorigins.win/raw?url=';

function todayFormatted() {
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, '0');
  const d = String(t.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function todayKey() {
  const t = new Date();
  return `${t.getFullYear()}-${t.getMonth()}-${t.getDate()}`;
}

async function evangelizoFetch(params) {
  const qs      = new URLSearchParams(params).toString();
  const url     = `${EVANGELIZO_BASE}?${qs}`;
  const proxied = ALLORIGINS + encodeURIComponent(url);
  const res     = await fetch(proxied, { cache: 'default' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  if (!text || text.trim() === '') throw new Error('Empty response');
  return text.trim();
}

async function fetchRomanoGospel() {
  const date = todayFormatted();
  const lang = 'IT';
  const [reference, text] = await Promise.all([
    evangelizoFetch({ date, lang, type: 'reading_lt', content: 'GSP' }),
    evangelizoFetch({ date, lang, type: 'reading',    content: 'GSP' }),
  ]);
  return { reference, text, sourceUrl: 'https://www.evangelizo.org/v2/it' };
}

async function fetchAmbrosianoGospel() {
  // Evangelizo supports Ambrosian calendar — we scrape vangelodelgiorno.org/ambrosiano/
  // as primary source; fall back to Roman Evangelizo text if scraping fails.
  const targetUrl = 'https://vangelodelgiorno.org/ambrosiano/';
  const proxied   = ALLORIGINS + encodeURIComponent(targetUrl);

  try {
    const res = await fetch(proxied, { cache: 'default' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();

    const parser = new DOMParser();
    const doc    = parser.parseFromString(html, 'text/html');

    const containers = [
      doc.querySelector('.entry-content'),
      doc.querySelector('article'),
      doc.querySelector('main'),
    ].filter(Boolean);

    let reference = '';
    let text      = '';

    for (const container of containers) {
      const hEl = container.querySelector('h1, h2, h3');
      if (hEl) reference = hEl.textContent.trim();

      const paras = Array.from(container.querySelectorAll('p'))
        .filter(p => p.textContent.trim().length > 40)
        .slice(0, 15);

      if (paras.length >= 2) {
        text = paras.map(p => p.textContent.trim()).join('\n\n');
        break;
      }
    }

    if (text && text.length > 80) {
      return {
        reference: reference || 'Vangelo del Giorno — Rito Ambrosiano',
        text,
        sourceUrl: targetUrl,
      };
    }
  } catch (_) { /* fall through to Roman fallback */ }

  // Fallback: serve Roman rite text from Evangelizo with a note
  const roman = await fetchRomanoGospel();
  return {
    ...roman,
    reference: roman.reference + ' (Rito Romano – testo Ambrosiano non disponibile oggi)',
    sourceUrl: 'https://vangelodelgiorno.org/ambrosiano/',
  };
}

// ─── Main Gospel Loader ─────────────────────────────────
async function loadGospel(rite) {
  showLoading();

  const cacheKey = `gospel_${rite}_${todayKey()}`;
  const cached   = sessionStorage.getItem(cacheKey);
  if (cached) {
    try {
      const { reference, text, sourceUrl } = JSON.parse(cached);
      showContent(reference, text, sourceUrl);
      return;
    } catch (_) { /* fall through */ }
  }

  try {
    const result = rite === 'romano'
      ? await fetchRomanoGospel()
      : await fetchAmbrosianoGospel();

    sessionStorage.setItem(cacheKey, JSON.stringify(result));
    showContent(result.reference, result.text, result.sourceUrl);
  } catch (err) {
    console.warn('Gospel fetch failed:', err);
    showError(rite);
  }
}

// ─── Rite Toggle ────────────────────────────────────────
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

if (retryBtn) {
  retryBtn.addEventListener('click', () => loadGospel(currentRite));
}

loadGospel(currentRite);

// ─── Prayer Cards ───────────────────────────────────────
document.querySelectorAll('.prayer-card').forEach(card => {
  card.addEventListener('click', () => {
    const prayerId = card.dataset.prayer;
    const body     = document.getElementById(`body-${prayerId}`);
    if (!body) return;

    const isOpen = card.getAttribute('aria-expanded') === 'true';

    document.querySelectorAll('.prayer-card').forEach(c => {
      if (c !== card) {
        c.setAttribute('aria-expanded', 'false');
        const other = document.getElementById(`body-${c.dataset.prayer}`);
        if (other) other.classList.add('hidden');
      }
    });

    card.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
    body.classList.toggle('hidden', isOpen);

    if (!isOpen) {
      setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
    }
  });
});

// ─── Intentions — Save / Load ───────────────────────────
const INTENTIONS_KEY = 'admdg_intentions';
const intentionsTA   = document.getElementById('intentions-text');
const saveBtn        = document.getElementById('save-intentions');
const saveStatus     = document.getElementById('save-status');
const clearBtn       = document.getElementById('clear-intentions');

if (intentionsTA) {
  const saved = localStorage.getItem(INTENTIONS_KEY);
  if (saved) intentionsTA.value = saved;
}

let autoSaveTimer = null;
if (intentionsTA) {
  intentionsTA.addEventListener('input', () => {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
      localStorage.setItem(INTENTIONS_KEY, intentionsTA.value);
    }, 800);
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
