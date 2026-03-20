/* ======================================================
   AD MAIOREM DEI GLORIAM — app.js
   Handles: date display, gospel fetch, prayer cards,
            intentions save/load
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

/**
 * Show the gospel loading state
 */
function showLoading() {
  gospelLoading.classList.remove('hidden');
  gospelContent.classList.add('hidden');
  gospelError.classList.add('hidden');
}

/**
 * Show gospel content
 */
function showContent(reference, text, sourceUrl) {
  gospelLoading.classList.add('hidden');
  gospelError.classList.add('hidden');

  gospelRefEl.textContent = reference;

  // Render paragraphs
  gospelTextEl.innerHTML = '';
  const paragraphs = text.split(/\n+/).filter(p => p.trim());
  paragraphs.forEach(para => {
    const p = document.createElement('p');
    p.textContent = para.trim();
    gospelTextEl.appendChild(p);
  });

  gospelLinkEl.href = sourceUrl;
  gospelContent.classList.remove('hidden');
}

/**
 * Show error state
 */
function showError(rite) {
  gospelLoading.classList.add('hidden');
  gospelContent.classList.add('hidden');

  errorLinksEl.innerHTML = '';
  const links = rite === 'romano'
    ? [
        { text: 'Vatican News — Vangelo del Giorno →', url: 'https://www.vaticannews.va/it/vangelo-del-giorno-e-parola-del-giorno.html' },
        { text: 'La Bibbia CEI online →', url: 'https://www.bibliacatolica.com.br/bibbia-cei/' }
      ]
    : [
        { text: 'Chiesa di Milano — Vangelo Ambrosiano →', url: 'https://www.chiesadimilano.it/news/chiesa-e-diocesi/liturgia-ambrosiana/' },
        { text: 'Calendario Ambrosiano →', url: 'https://www.diocesimilano.it/chiesa-e-comunita/liturgia/' }
      ];

  links.forEach(l => {
    const a = document.createElement('a');
    a.href = l.url;
    a.textContent = l.text;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    errorLinksEl.appendChild(a);
  });

  gospelError.classList.remove('hidden');
}

// ─── Gospel Fetch ───────────────────────────────────────
/**
 * Attempt to fetch Vatican News page via allorigins proxy,
 * parse the gospel text from it.
 */
async function fetchVaticanNewsGospel() {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');

  const targetUrl = `https://www.vaticannews.va/it/vangelo-del-giorno-e-parola-del-giorno/${y}/${m}/${d}/vangelo.html`;
  const proxyUrl  = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;

  const res = await fetch(proxyUrl, { cache: 'default' });
  if (!res.ok) throw new Error('Network response not ok');

  const data = await res.json();
  const html  = data.contents;
  const parser = new DOMParser();
  const doc    = parser.parseFromString(html, 'text/html');

  // Try to extract the gospel text from Vatican News article
  let text = '';
  let reference = '';

  // Vatican News article body selectors (may change over time)
  const bodySelectors = [
    '.article-body',
    '.article-content',
    '.content-body',
    'article .text',
    '.single-text',
    'main p',
  ];

  for (const sel of bodySelectors) {
    const el = doc.querySelector(sel);
    if (el && el.textContent.trim().length > 100) {
      text = el.innerText || el.textContent;
      text = text.trim();
      break;
    }
  }

  // Try to get the title / reference
  const titleEl = doc.querySelector('h1, .article-title, .entry-title');
  if (titleEl) reference = titleEl.textContent.trim();

  if (!text || text.length < 80) {
    throw new Error('Could not parse gospel text');
  }

  // Clean up text — strip navigation noise
  text = text.split('\n')
    .filter(line => line.trim().length > 30)
    .slice(0, 20)
    .join('\n\n');

  return { reference: reference || 'Vangelo del Giorno', text, sourceUrl: targetUrl };
}

/**
 * Attempt to fetch Ambrosian rite gospel via ChiesaDiMilano proxy
 */
async function fetchAmbrosianoGospel() {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');

  const targetUrl = `https://www.diocesimilano.it/chiesa-e-comunita/liturgia/`;
  const proxyUrl  = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;

  const res = await fetch(proxyUrl, { cache: 'default' });
  if (!res.ok) throw new Error('Network response not ok');

  const data = await res.json();
  if (!data.contents || data.contents.length < 200) throw new Error('Empty response');

  const parser = new DOMParser();
  const doc    = parser.parseFromString(data.contents, 'text/html');

  const bodyEl = doc.querySelector('main') || doc.querySelector('article') || doc.querySelector('.content');
  if (!bodyEl) throw new Error('Could not find content');

  const paragraphs = Array.from(bodyEl.querySelectorAll('p'))
    .filter(p => p.textContent.trim().length > 40)
    .slice(0, 8);

  if (!paragraphs.length) throw new Error('Could not parse text');

  const text = paragraphs.map(p => p.textContent.trim()).join('\n\n');
  const titleEl = doc.querySelector('h1, h2');
  const reference = titleEl ? titleEl.textContent.trim() : 'Vangelo del Giorno — Rito Ambrosiano';

  return { reference, text, sourceUrl: targetUrl };
}

/**
 * Main gospel loader — tries multiple sources, falls back to error
 */
async function loadGospel(rite) {
  showLoading();

  // Check if we already fetched today
  const cacheKey = `gospel_${rite}_${todayKey()}`;
  const cached   = sessionStorage.getItem(cacheKey);

  if (cached) {
    try {
      const { reference, text, sourceUrl } = JSON.parse(cached);
      showContent(reference, text, sourceUrl);
      return;
    } catch (_) {/* fall through */}
  }

  try {
    let result;
    if (rite === 'romano') {
      result = await fetchVaticanNewsGospel();
    } else {
      result = await fetchAmbrosianoGospel();
    }

    sessionStorage.setItem(cacheKey, JSON.stringify(result));
    showContent(result.reference, result.text, result.sourceUrl);
  } catch (err) {
    console.warn('Gospel fetch failed:', err);
    showError(rite);
  }
}

function todayKey() {
  const t = new Date();
  return `${t.getFullYear()}-${t.getMonth()}-${t.getDate()}`;
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

// Initial gospel load
loadGospel(currentRite);

// ─── Prayer Cards ───────────────────────────────────────
document.querySelectorAll('.prayer-card').forEach(card => {
  card.addEventListener('click', () => {
    const prayerId = card.dataset.prayer;
    const body     = document.getElementById(`body-${prayerId}`);
    if (!body) return;

    const isOpen   = card.getAttribute('aria-expanded') === 'true';

    // Close all others
    document.querySelectorAll('.prayer-card').forEach(c => {
      if (c !== card) {
        c.setAttribute('aria-expanded', 'false');
        const otherId = c.dataset.prayer;
        const other   = document.getElementById(`body-${otherId}`);
        if (other) other.classList.add('hidden');
      }
    });

    // Toggle current
    card.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
    body.classList.toggle('hidden', isOpen);

    // Smooth scroll into view when opening
    if (!isOpen) {
      setTimeout(() => {
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  });
});

// ─── Intentions — Save / Load ───────────────────────────
const INTENTIONS_KEY = 'admdg_intentions';
const intentionsTA   = document.getElementById('intentions-text');
const saveBtn        = document.getElementById('save-intentions');
const saveStatus     = document.getElementById('save-status');
const clearBtn       = document.getElementById('clear-intentions');

// Load on start
if (intentionsTA) {
  const saved = localStorage.getItem(INTENTIONS_KEY);
  if (saved) intentionsTA.value = saved;
}

// Auto-save while typing (debounced)
let autoSaveTimer = null;
if (intentionsTA) {
  intentionsTA.addEventListener('input', () => {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
      localStorage.setItem(INTENTIONS_KEY, intentionsTA.value);
    }, 800);
  });
}

// Manual save
if (saveBtn) {
  saveBtn.addEventListener('click', () => {
    localStorage.setItem(INTENTIONS_KEY, intentionsTA.value);
    saveStatus.textContent = 'Salvato ✓';
    setTimeout(() => { saveStatus.textContent = ''; }, 2500);
  });
}

// Clear
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
