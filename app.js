'use strict';

/* ── Theme ─────────────────────────────────────────── */
const html       = document.documentElement;
const themeBtn   = document.getElementById('theme-toggle');
const savedTheme = localStorage.getItem('amdg_theme') || 'dark';
html.setAttribute('data-theme', savedTheme);

themeBtn.addEventListener('click', () => {
  const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('amdg_theme', next);
});

/* ── Date ──────────────────────────────────────────── */
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

/* ── Don Giussani Quotes ───────────────────────────── */
const GIUSSANI = [
  { text: `La cosa più grande che può accadere all'uomo è che Qualcuno di divino lo ami e si faccia trovare da lui. Non è l'uomo che va a Dio, ma Dio che viene all'uomo. La fede cristiana non è un sistema di idee da credere, né un codice morale da seguire: è l'incontro con una Presenza, con Qualcuno che è entrato nella storia ed è ancora qui, vivente, identificabile, incontrabile.`, source: 'Il Senso Religioso' },
  { text: `Il cuore dell'uomo è un desiderio inesorabile di felicità, di verità, di giustizia, di bellezza. Questo desiderio non è una nostra costruzione: ci è stato dato. E proprio perché ci è stato dato, chiede una risposta adeguata. Non c'è sistema di pensiero, non c'è ideologia, non c'è nessuna realtà mondana che possa rispondere pienamente a questa attesa. Solo una Presenza infinita può rispondere a un desiderio infinito.`, source: 'Il Senso Religioso' },
  { text: `La fede non è una risposta emotiva, non è un salto nel buio: è la risposta più ragionevole che l'uomo possa dare di fronte all'evidenza di un avvenimento straordinario. Cristo è entrato nella storia. I testimoni lo hanno visto, lo hanno toccato, hanno mangiato con lui dopo la resurrezione. La fede cristiana si appoggia su questo: su una testimonianza che si trasmette, su una presenza che continua ad essere vivente nella storia.`, source: 'Perché la Chiesa' },
  { text: `L'educazione autentica non è trasmissione di nozioni ma introduzione alla realtà. Il compito dell'educatore è quello di far sì che il giovane si confronti con la totalità dell'esperienza umana, senza amputare nulla. Un'educazione che non pone i grandi interrogativi, che non sfida la ragione e l'affettività nella loro profondità, tradisce il giovane, lo riduce, lo prepara non a vivere ma a sopravvivere.`, source: 'Il Rischio Educativo' },
  { text: `Il rischio più grande per un giovane non è fare errori, ma non essere educato a fare domande vere. Chi non domanda, chi accetta passivamente ciò che gli viene dato, chi si lascia formare dall'ambiente senza critica, è già perduto come soggetto. La libertà vera nasce solo dove c'è una proposta forte, una provocazione seria, una compagnia che osa stare davanti all'infinito.`, source: 'Il Rischio Educativo' },
  { text: `L'io non esiste senza un rapporto. La persona non è un'isola. Siamo fatti per la comunione, per la dipendenza creativa da qualcosa di più grande di noi. La solitudine assoluta non è libertà: è morte. La libertà autentica è la capacità di aderire a ciò che è vero, a ciò che corrisponde alla propria natura più profonda. E la propria natura più profonda è orientata verso Dio.`, source: "L'io, il potere, le opere" },
  { text: `Essere cristiani non è vivere secondo una norma, non è seguire una regola morale più o meno soddisfacente. Essere cristiani è riconoscere che Qualcuno di vivo mi ama, mi chiama per nome, è interessato a me più di quanto io stesso lo sia. Questa scoperta cambia tutto: cambia il modo di guardare se stessi, di guardare gli altri, di affrontare le difficoltà.`, source: 'Il Senso Religioso' },
  { text: `La preghiera non è un atto devozionale aggiunto alla vita: è il respiro dell'anima. Come il corpo non può vivere senza respirare, così la persona non può stare in piedi senza questo riferimento costante, questa apertura verso l'Altro. La preghiera è riconoscere la propria dipendenza, è il contrario dell'autosufficienza, è il primo gesto della libertà vera.`, source: 'Il Senso Religioso' },
  { text: `La grazia non elimina la fatica, non risparmia il dolore, non risolve magicamente i problemi. La grazia trasforma il modo in cui si sta dentro la fatica, il dolore, i problemi. Chi è accompagnato da Cristo non cammina su una strada diversa dagli altri: cammina sulla stessa strada, ma non è solo. E questo cambia completamente il sapore dell'esperienza.`, source: 'Il Cammino al Vero è un'Esperienza' },
  { text: `Non si può capire il cristianesimo se non si parte dall'avvenimento. Non da un'idea, non da un principio, non da una legge morale: da un fatto accaduto nel tempo e nello spazio. Dio si è fatto carne, è entrato nella storia, si è lasciato toccare, mangiare, incontrare. Questo fatto scandalo per la ragione ordinaria è la fonte inesauribile della novità cristiana.`, source: 'Perché la Chiesa' },
  { text: `Il dolore non è il contrario della fede: può diventarne la porta. Molti si avvicinano a Dio attraverso la sofferenza, non malgrado essa. Quando l'uomo tocca i propri limiti, quando si accorge che non basta a se stesso, quando le sue costruzioni crollano, allora può aprirsi qualcosa. Non automaticamente: la sofferenza può anche chiudere. Ma quando è vissuta con un cuore aperto, diventa la via più diretta all'essenziale.`, source: 'Il Senso Religioso' },
  { text: `La Chiesa non è un'istituzione umana che si chiama cristiana: è il prolungamento della presenza di Cristo nella storia. È il luogo dove si trova ancora oggi, concretamente, quella Presenza che ha cambiato il mondo. Criticare la Chiesa ha senso solo se si parte da questo: è la sua umanità che la rende criticabile; è la sua origine divina che la rende indispensabile.`, source: 'Perché la Chiesa' },
  { text: `La vera libertà non è fare quello che si vuole: è essere quello che si è. E ciò che si è, nella verità più profonda, è figli di Dio, creati per la comunione con Lui. Ogni altra libertà è parziale, relativa, transitoria. La libertà dei figli di Dio è quella che niente e nessuno può togliere, nemmeno la morte, nemmeno il peccato, perché è fondata su qualcosa di eterno.`, source: "L'io, il potere, le opere" },
  { text: `La comunità cristiana non è un gruppo di amici che si vogliono bene: è qualcosa di più strano e di più bello. È un'aggregazione di persone diverse, a volte in conflitto, a volte lontane per sensibilità e storia, unite da una sola cosa: dall'aver incontrato lo stesso Signore. Questa unità non viene da noi, non è il frutto della nostra simpatia: è un dono, e come tale va custodito con fatica e gratitudine.`, source: 'Perché la Chiesa' },
  { text: `Ogni mattina è una proposta. Il giorno che si apre non è una ripetizione del precedente: è un nuovo inizio, un'occasione offerta che non tornerà. Il modo in cui si inizia il giorno dice molto di ciò che si crede. Chi inizia il giorno rivolgendosi a Dio non sta compiendo un rito vuoto: sta riconoscendo da chi dipende, da chi viene, verso chi va.`, source: 'Il Cammino al Vero è un'Esperienza' },
  { text: `Il peccato non è la trasgressione di una norma: è il rifiuto di una relazione. Quando peco, non violo semplicemente una legge: mi allontano da Qualcuno che mi ama. Per questo la conversione non è semplicemente smettere di sbagliare: è tornare, è riprendere il cammino verso di Lui. E Lui è sempre lì ad aspettare, non con il registro degli errori in mano, ma con le braccia aperte.`, source: 'Il Senso Religioso' },
  { text: `La bellezza è un annuncio. Ogni cosa bella parla di qualcosa di più grande di sé. La musica che ti spezza il cuore, il tramonto che ti lascia senza parole, il volto di una persona amata: tutto questo è un rimando, un segnale puntato verso qualcosa che non finisce. Chi sa guardare la bellezza senza fermarsi ad essa, chi sa attraversarla senza idolatrarla, scopre che essa porta verso l'Infinito.`, source: 'Il Senso Religioso' },
  { text: `Educare alla fede non è trasmettere informazioni sulla fede: è mostrare che la vita ha un senso. È vivere davanti ai giovani in modo tale che essi vedano che credere non è una debolezza ma una pienezza, non una rinuncia ma una scoperta, non una fuga dalla realtà ma il modo più pieno di starci dentro. La testimonianza vale più di mille discorsi.`, source: 'Il Rischio Educativo' },
  { text: `Dio non ha paura delle domande. Anzi, le domande grandi, le domande vere, quelle che fanno tremare, sono già un movimento verso di Lui. Chi si interroga su se stesso, sul senso dell'esistenza, sulla morte, sul bene e il male, sta già camminando nella direzione giusta. L'ateismo vero non è il dubbio: è la decisione di non fare più domande, di accontentarsi della superficie.`, source: 'Il Senso Religioso' },
  { text: `La Vergine Maria è il modello della risposta umana a Dio. Non perché abbia fatto grandi cose, ma perché ha detto sì in modo totale, senza riserve, senza contrattare. Il suo "fiat" non è la resa di un soggetto schiacciato: è la massima espressione della libertà umana, perché è il consenso di tutta la persona a ciò che è più vero, più buono, più bello.`, source: 'Perché la Chiesa' },
  { text: `La vera amicizia è rara perché esige qualcosa di preciso: che il bene dell'altro mi stia a cuore più del mio tornaconto. L'amicizia cristiana ha una caratteristica in più: è fondata su una terza presenza, su Cristo che è in mezzo. Quando due persone si amano in Cristo, la loro amicizia diventa qualcosa di più grande di loro stessi: diventa un segno della sua presenza nel mondo.`, source: "L'io, il potere, le opere" },
  { text: `La ragione non è nemica della fede: è sua alleata. Una fede che teme le domande razionali è una fede debole. Una ragione che rifiuta l'esperienza religiosa è una ragione mutilata. Il vero cammino dell'uomo è quello in cui ragione e fede si interrogano a vicenda, si provocano, si purificano. Solo così si arriva a qualcosa di reale, non a un'idea astratta di Dio, ma a Lui.`, source: 'Il Cammino al Vero è un'Esperienza' },
  { text: `Nessuno trova la fede da solo. Sempre qualcuno l'ha testimoniata prima, sempre qualcuno l'ha portata, l'ha trasmessa, l'ha vissuta in modo credibile. La fede è sempre un incontro, non una conquista solitaria. Per questo la comunità è essenziale: non come struttura sociologica, ma come luogo in cui continua a verificarsi l'incontro con Cristo.`, source: 'Perché la Chiesa' },
  { text: `Il sacrificio non è la negazione del desiderio: è il suo compimento più alto. Quando offro qualcosa di prezioso per amore, non mi privo di qualcosa: divento più pienamente me stesso. Il martirio dei santi non è una follia masochista: è la testimonianza che c'è qualcosa che vale più della vita biologica. E questo qualcosa ha un nome.`, source: 'Il Senso Religioso' },
  { text: `La speranza cristiana non è ottimismo. L'ottimismo è una disposizione psicologica che dipende dai dati di fatto: va bene quando le cose vanno bene. La speranza è altra cosa: è la certezza che il destino dell'uomo è buono, nonostante i dati di fatto. È una virtù teologale, non un temperamento. Si può essere pieni di speranza nel mezzo della tragedia, perché la speranza non si appoggia su di noi.`, source: 'Il Cammino al Vero è un'Esperienza' },
  { text: `Il lavoro, lo studio, le relazioni: tutto ciò che riempie la giornata può essere vissuto come un peso o come un'offerta. La differenza non sta nelle cose stesse, ma nell'atteggiamento con cui le si affronta. Chi porta tutto a Dio, chi fa delle cose ordinarie un'occasione di incontro, scopre che non esiste una separazione tra il sacro e il profano: tutto può essere trasfigurato.`, source: 'Il Cammino al Vero è un'Esperienza' },
];

function loadGiussani() {
  const doy     = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  const entry   = GIUSSANI[doy % GIUSSANI.length];
  const textEl  = document.getElementById('giussani-text');
  const srcEl   = document.getElementById('giussani-source');
  if (!textEl || !srcEl) return;
  textEl.innerHTML = '';
  entry.text.split('\n').filter(p => p.trim()).forEach(para => {
    const p = document.createElement('p'); p.textContent = para.trim(); textEl.appendChild(p);
  });
  srcEl.textContent = entry.source;
}
loadGiussani();

/* ── Gospel ─────────────────────────────────────────── */
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
    .replace(/&nbsp;/g,' ').replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(n))
    .replace(/&apos;/g,"'").replace(/&quot;/g,'"')
    .replace(/Copyright\s*@[^\n]*/gi,'')
    .replace(/Per ricevere il Vangelo[^\n]*/gi,'')
    .replace(/vangelodelgiorno\.org[^\n]*/gi,'')
    .split('\n').map(l=>l.trim()).filter(l=>l.length>0).join('\n');
}

function fillParagraphs(el, text) {
  el.innerHTML = '';
  cleanText(text).split('\n').filter(p=>p.trim()).forEach(t => {
    const p = document.createElement('p'); p.textContent = t; el.appendChild(p);
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

  if (data.commentText && cleanText(data.commentText).length > 30) {
    commentTitleEl.textContent  = cleanText(data.commentTitle)  || 'Commento al Vangelo';
    commentAuthEl.textContent   = cleanText(data.commentAuthor) ? `— ${cleanText(data.commentAuthor)}` : '';
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
  const links = rite === 'romano'
    ? [{ text:'Evangelizo →', url:'https://www.evangelizo.org/v2/it' },
       { text:'Vatican News →', url:'https://www.vaticannews.va/it/vangelo-del-giorno-e-parola-del-giorno.html' }]
    : [{ text:'Vangelo Ambrosiano →', url:'https://vangelodelgiorno.org/ambrosiano/' },
       { text:'Diocesi di Milano →', url:'https://www.diocesimilano.it' }];
  links.forEach(l => {
    const a = document.createElement('a'); a.href=l.url; a.textContent=l.text;
    a.target='_blank'; a.rel='noopener noreferrer'; errorLinksEl.appendChild(a);
  });
  gospelError.classList.remove('hidden');
}

async function fromLocalFile(rite) {
  if (!gospelsCache) {
    const r = await fetch('./gospels.json'); if (!r.ok) throw new Error('no local');
    gospelsCache = await r.json();
  }
  const entry = gospelsCache[todayISO()];
  if (!entry) throw new Error('no date');
  const data = entry[rite]; if (!data?.text) throw new Error('no text');
  return data;
}

const PROXY = 'https://api.allorigins.win/raw?url=';
const EVA   = 'https://feed.evangelizo.org/v2/reader.php';

async function evaFetch(params) {
  const r = await fetch(PROXY + encodeURIComponent(`${EVA}?${new URLSearchParams(params)}`));
  if (!r.ok) throw new Error(`${r.status}`);
  return (await r.text()).trim();
}

async function fromAPI() {
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

async function loadGospel(rite) {
  showLoading();
  const key = `gospel_${rite}_${todayISO()}`;
  const cached = sessionStorage.getItem(key);
  if (cached) { try { showContent(JSON.parse(cached), rite); return; } catch(_){} }
  try {
    let data;
    try        { data = await fromLocalFile(rite); }
    catch(_)   { data = await fromAPI(); }
    sessionStorage.setItem(key, JSON.stringify(data));
    showContent(data, rite);
  } catch(err) { console.warn(err); showError(rite); }
}

document.querySelectorAll('.rite-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    const rite = btn.dataset.rite;
    if (rite === currentRite) return;
    currentRite = rite;
    document.querySelectorAll('.rite-tab').forEach(b => {
      b.classList.toggle('active', b.dataset.rite === rite);
      b.setAttribute('aria-pressed', b.dataset.rite === rite ? 'true' : 'false');
    });
    loadGospel(rite);
  });
});
if (retryBtn) retryBtn.addEventListener('click', () => loadGospel(currentRite));
loadGospel(currentRite);

/* ── Prayers ─────────────────────────────────────────── */
document.querySelectorAll('.prayer-item').forEach(item => {
  const toggle = item.querySelector('.prayer-toggle');
  const body   = item.querySelector('.prayer-body');
  if (!toggle || !body) return;
  toggle.addEventListener('click', () => {
    const isOpen = toggle.getAttribute('aria-expanded') === 'true';
    document.querySelectorAll('.prayer-item').forEach(i => {
      if (i !== item) {
        i.classList.remove('open');
        i.querySelector('.prayer-toggle')?.setAttribute('aria-expanded','false');
        i.querySelector('.prayer-body')?.classList.add('hidden');
      }
    });
    toggle.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
    body.classList.toggle('hidden', isOpen);
    item.classList.toggle('open', !isOpen);
    if (!isOpen) setTimeout(() => item.scrollIntoView({ behavior:'smooth', block:'nearest' }), 100);
  });
});

/* ── Intentions ──────────────────────────────────────── */
const IKEY    = 'amdg_intentions';
const intTA   = document.getElementById('intentions-text');
const saveBtn = document.getElementById('save-intentions');
const saveSt  = document.getElementById('save-status');
const clrBtn  = document.getElementById('clear-intentions');

if (intTA) {
  const s = localStorage.getItem(IKEY); if (s) intTA.value = s;
  let t = null;
  intTA.addEventListener('input', () => { clearTimeout(t); t = setTimeout(()=>localStorage.setItem(IKEY,intTA.value),800); });
}
if (saveBtn) saveBtn.addEventListener('click', () => {
  localStorage.setItem(IKEY, intTA.value);
  saveSt.textContent = 'Salvato ✓'; setTimeout(()=>{saveSt.textContent='';},2500);
});
if (clrBtn) clrBtn.addEventListener('click', () => {
  if (!intTA.value.trim()) return;
  if (confirm('Cancellare le intenzioni?')) {
    intTA.value=''; localStorage.removeItem(IKEY);
    saveSt.textContent='Cancellato.'; setTimeout(()=>{saveSt.textContent='';},2500);
  }
});
