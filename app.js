/* AMDG app.js */
'use strict';

var DEFAULT_PRAYERS = [
  {"id":"mattino","emoji":"\u2600","tag":"Mattino","name":"Guidami, Signore","isDefault":true,"text":"Signore, guidami in questo nuovo giorno, perch\u00e9 io possa riconoscere e abbracciare ci\u00f2 che \u00e8 bene e sconfiggere ci\u00f2 che \u00e8 male e le tentazioni che incontrer\u00f2.\n\nAiutami a far s\u00ec che tutto il mio lavoro e lo studio siano efficaci strumenti per Te, e manda lo Spirito Santo su di me per consigliarmi e guidarmi in ogni cosa.\n\nPer intercessione di Carlo Acutis, non dimenticarti di questo tuo servo.\n\nAmen."},
  {"id":"angelus","emoji":"\ud83d\udd14","tag":"Mezzogiorno","name":"Angelus Domini","isDefault":true,"text":"SPECIAL"},
  {"id":"tentazione","emoji":"\u2694","tag":"Tentazione","name":"Coraggio e Forza","isDefault":true,"text":"Signore Ges\u00f9, donami coraggio e forza in questo momento di tentazione. Aiutami a riconoscere ci\u00f2 che \u00e8 veramente bene e a non distrarmi n\u00e9 cedere a compromessi ingannevoli.\n\nFa\u2019 che sia in questi attimi, quando tutto sembra vacillare, che la mia fede si riveli e cresca.\n\nMaria, Madre potente, intercedi per me e proteggimi dal peccato.\n\nAmen."},
  {"id":"caduta","emoji":"\ud83d\udd4a","tag":"Dopo la Caduta","name":"Rialzami, Signore","isDefault":true,"text":"Signore, tu hai visto la mia lotta e sai che non volevo cadere, eppure sono caduto. Il mio cuore \u00e8 confuso e mi sento debole, ma non voglio allontanarmi da Te proprio adesso.\n\nPerdonami, Signore. Rialzami ancora una volta. Non lasciare che la mia caduta diventi disperazione o che il nemico mi convinca che ormai \u00e8 tutto perduto.\n\nTu conosci la mia fragilit\u00e0 meglio di me: insegnami a ricominciare con pi\u00f9 umilt\u00e0, con pi\u00f9 vigilanza e con pi\u00f9 fiducia nella Tua grazia.\n\nRimettimi in piedi, Signore, e guidami di nuovo sulla Tua strada.\n\nAmen."},
  {"id":"inizio","emoji":"\u270f","tag":"Prima di un Impegno","name":"Tutto a Te","isDefault":true,"text":"Ges\u00f9, mentre inizio ci\u00f2 che mi accingi a farmi vivere, ti affido tutto me stesso. Guidami affinch\u00e9 tutto ci\u00f2 che faccio possa servirTi davvero.\n\nIllumina i miei pensieri e guidami nelle scelte, fa\u2019 che ogni mio sforzo diventi strumento per Te.\n\nAmen."},
  {"id":"maria","emoji":"\ud83c\udf39","tag":"Mariana","name":"Santa Maria, Madre di Dio","isDefault":true,"text":"Santa Maria, Madre di Dio, tu che mai trascuri chi ti chiama, rendimi saldo nella fede e pronto al servizio di Dio. Fa\u2019 che la mia vita sia uno strumento nelle mani di Dio.\n\nIn questo momento affido a te i miei pensieri e desideri. Guida i miei passi, rafforza la mia volont\u00e0, e rendimi capace di compiere il bene che vuoi. Mantienimi saldo nelle prove, fai brillare la tua luce dove c\u2019\u00e8 oscurit\u00e0, e insegnami a camminare con coraggio sulla via della fede.\n\nAmen."},
  {"id":"sera","emoji":"\ud83c\udf19","tag":"Sera","name":"Ti Adoro, Mio Dio","isDefault":true,"text":"Ti adoro mio Dio e ti amo con tutto il cuore, ti ringrazio di avermi creato fatto cristiano e conservato in questo giorno, perdonami il male oggi commesso e se qualche bene ho compiuto accettalo custodiscimi nel riposo e liberami dai pericoli la grazia tua sia sempre con me e con tutti i miei cari.\n\nAmen."}
];

/* ── Helpers ── */
var html = document.documentElement;
function todayISO() { return new Date().toISOString().slice(0,10); }
function todayFmt() { var t=new Date(); return ''+t.getFullYear()+String(t.getMonth()+1).padStart(2,'0')+String(t.getDate()).padStart(2,'0'); }
function fmtDate(iso) { try { return new Date(iso).toLocaleDateString('it-IT',{day:'numeric',month:'long',year:'numeric'}); } catch(e) { return ''; } }

/* ── Theme ── */
var themeBtn = document.getElementById('theme-toggle');
html.setAttribute('data-theme', localStorage.getItem('amdg_theme')||'dark');
if(themeBtn) themeBtn.addEventListener('click', function() {
  var next = html.getAttribute('data-theme')==='dark'?'light':'dark';
  html.setAttribute('data-theme',next); localStorage.setItem('amdg_theme',next);
});

/* ── Date ── */
var dateEl = document.getElementById('site-date');
if(dateEl) dateEl.textContent = new Date().toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

/* ── Giussani ── */
function loadGiussani() {
  var el=document.getElementById('giussani-text'), src=document.getElementById('giussani-source');
  if(!el||!src) return;
  if(typeof GIUSSANI==='undefined'||!GIUSSANI.length){el.innerHTML='<p>Caricamento...</p>';return;}
  var doy=Math.floor((Date.now()-new Date(new Date().getFullYear(),0,0).getTime())/86400000);
  var q=GIUSSANI[doy%GIUSSANI.length];
  el.innerHTML='';
  q.text.split('\n').filter(function(p){return p.trim();}).forEach(function(t){var p=document.createElement('p');p.textContent=t;el.appendChild(p);});
  src.textContent=q.source;
}
document.addEventListener('DOMContentLoaded', loadGiussani);

/* ── Supabase ── */
var SUPA = null, currentUser = null;
window._cloudIntentions = [];
window._cloudNotes = [];

function initSupabase() {
  if(typeof SUPABASE_URL==='undefined'||!SUPABASE_URL||SUPABASE_URL.length<10) {
    console.warn('AMDG: SUPABASE_URL non configurato in config.js');
    return;
  }
  if(typeof supabase==='undefined') {
    console.error('AMDG: libreria supabase-js non caricata');
    return;
  }
  try {
    SUPA = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: true,      /* Salva il token in localStorage → non serve rifare login */
        autoRefreshToken: true,    /* Rinnova automaticamente il token prima che scada */
        storageKey: 'amdg_sb_auth' /* Chiave localStorage dedicata */
      }
    });
  } catch(e) {
    console.error('AMDG: errore createClient Supabase (chiave non valida?):', e);
    return;
  }

  /* Get current session immediately on load */
  SUPA.auth.getSession().then(function(res) {
    currentUser = (res.data && res.data.session) ? res.data.session.user : null;
    updateAuthUI();
    if(currentUser) {
      loadAllUserData();
    }
  }).catch(function(e){ console.error('AMDG: getSession error:', e); });

  SUPA.auth.onAuthStateChange(function(event, session) {
    currentUser = session ? session.user : null;
    updateAuthUI();
    if(currentUser) {
      loadAllUserData();
    } else {
      showLoggedOutState();
    }
  });
}
initSupabase();

function toEmail(username) { return username.trim().toLowerCase() + '@amdg.app'; }

function updateAuthUI() {
  var btn=document.getElementById('auth-btn'), lbl=document.getElementById('auth-btn-label');
  var notesBtn=document.getElementById('notes-btn');
  if(!btn||!lbl) return;

  /* Personal sections */
  var personalSections = document.querySelectorAll('.personal-section');
  var loginPrompt = document.getElementById('login-prompt');
  var prayerControls = document.querySelectorAll('.prayer-edit-btn, #add-prayer-btn, #reset-prayers-btn');
  var streakBar = document.getElementById('streak-bar');

  if(currentUser) {
    btn.classList.add('logged-in');
    lbl.textContent = (currentUser.email||'').replace('@amdg.app','') || 'Account';
    if(notesBtn) notesBtn.style.display='flex';
    personalSections.forEach(function(s){s.style.display='';});
    if(loginPrompt) loginPrompt.classList.add('hidden');
    prayerControls.forEach(function(b){b.style.display='';});
    if(streakBar) streakBar.style.display='block';
  } else {
    btn.classList.remove('logged-in');
    lbl.textContent = 'Accedi';
    if(notesBtn) notesBtn.style.display='none';
    personalSections.forEach(function(s){s.style.display='none';});
    if(loginPrompt) loginPrompt.classList.remove('hidden');
    prayerControls.forEach(function(b){b.style.display='none';});
    if(streakBar) streakBar.style.display='none';
  }
}

function showLoggedOutState() {
  window._cloudIntentions = [];
  window._cloudPrayers = null;
  window._cloudNotes = [];
  var intList=document.getElementById('int-list');
  if(intList) intList.innerHTML='';
  var notePreviewList = document.getElementById('note-preview-list');
  if(notePreviewList) notePreviewList.innerHTML='';
  renderPrayers();
  renderStreak();
  updateAuthUI();
}

async function loadAllUserData() {
  await Promise.all([
    loadIntentionsFromCloud(),
    loadPrayersFromCloud(),
    loadStreakFromCloud(),
    loadNotesPreview()
  ]);
  recordVisit(); /* Register today's visit before rendering */
  renderIntentions();
  renderPrayers();
  renderStreak();
  renderNotesPreview();
}

/* ── Auth Modal ── */
var authOverlay = document.getElementById('auth-overlay');
var isRegister = false;

function openAuth() { if(authOverlay) authOverlay.classList.remove('hidden'); }
function closeAuth() { if(authOverlay) authOverlay.classList.add('hidden'); }

var authBtn = document.getElementById('auth-btn');
var authClose = document.getElementById('auth-close');

if(authBtn) authBtn.addEventListener('click', function() {
  if(currentUser) {
    if(confirm('Vuoi uscire dal tuo account?')) {
      if(SUPA) SUPA.auth.signOut();
    }
  } else { openAuth(); }
});
if(authClose) authClose.addEventListener('click', closeAuth);
if(authOverlay) authOverlay.addEventListener('click', function(e){ if(e.target===authOverlay) closeAuth(); });

var loginPromptBtn = document.getElementById('login-prompt-btn');
if(loginPromptBtn) loginPromptBtn.addEventListener('click', openAuth);

var authSwitch = document.getElementById('auth-switch');
if(authSwitch) authSwitch.addEventListener('click', function() {
  isRegister = !isRegister;
  var title=document.getElementById('auth-title'), sub=document.getElementById('auth-submit');
  if(title) title.textContent = isRegister?'Crea Account':'Accedi';
  if(sub) sub.textContent = isRegister?'Crea Account':'Accedi';
  authSwitch.innerHTML = isRegister?'Hai gi\u00e0 un account? <strong>Accedi</strong>':'Non hai un account? <strong>Crea account</strong>';
  var ae=document.getElementById('auth-error'); if(ae) ae.classList.add('hidden');
});

var authForm = document.getElementById('auth-form');
if(authForm) authForm.addEventListener('submit', async function(e) {
  e.preventDefault();
  if(!SUPA) { showAuthErr('Supabase non configurato. Aggiungi le credenziali in config.js'); return; }
  var userInput = document.getElementById('auth-user');
  var pwInput = document.getElementById('auth-password');
  var sub = document.getElementById('auth-submit');
  var username = (userInput?userInput.value:'').trim();
  var pw = pwInput?pwInput.value:'';
  if(!username || username.length<3) { showAuthErr('Nome utente troppo corto (min. 3 caratteri)'); return; }
  if(!/^[a-zA-Z0-9_]+$/.test(username)) { showAuthErr('Solo lettere, numeri e _ nel nome utente'); return; }
  var email = toEmail(username);
  sub.disabled=true; sub.textContent='...';
  try {
    var result;
    if(isRegister) {
      result = await SUPA.auth.signUp({email:email, password:pw, options:{emailRedirectTo:null, data:{username:username}}});
      if(result.error) throw result.error;
      var signIn = await SUPA.auth.signInWithPassword({email:email, password:pw});
      if(signIn.error) {
        showAuthErr('Account creato! Ora accedi con le stesse credenziali.');
        sub.disabled=false; sub.textContent='Crea Account'; return;
      }
    } else {
      result = await SUPA.auth.signInWithPassword({email:email, password:pw});
      if(result.error) throw result.error;
    }
    closeAuth();
  } catch(err) {
    var msg = err.message||'Errore.';
    if(msg.includes('Invalid login')) msg='Nome utente o password errati.';
    if(msg.includes('already registered')) msg='Nome utente gi\u00e0 esistente. Accedi o scegli un altro nome.';
    showAuthErr(msg);
  }
  sub.disabled=false; sub.textContent=isRegister?'Crea Account':'Accedi';
});

function showAuthErr(msg) {
  var ae=document.getElementById('auth-error');
  if(ae){ae.textContent=msg; ae.classList.remove('hidden');}
}

/* ── Gospel ── */
var currentRite='romano', gospelsCache=null;
var LINKS={romano:'https://www.vaticannews.va/it/vangelo-del-giorno-e-parola-del-giorno.html',ambrosiano:'https://www.laparola.it/ambrosiano/liturgia-della-parola/'};

function cleanText(raw){
  return(raw||'').replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]+>/g,'')
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ')
    .replace(/&#(\d+);/g,function(_,n){return String.fromCharCode(parseInt(n,10));})
    .replace(/Copyright[^\n]*/gi,'').replace(/Per ricevere il Vangelo[^\n]*/gi,'')
    .replace(/vangelodelgiorno\.org[^\n]*/gi,'')
    .split('\n').map(function(l){return l.trim();}).filter(function(l){return l.length>0;}).join('\n');
}
function fillEl(el,text){
  el.innerHTML='';
  cleanText(text).split('\n').filter(function(p){return p.trim();}).forEach(function(t){var p=document.createElement('p');p.textContent=t;el.appendChild(p);});
}

var gLoad=document.getElementById('gospel-loading'),gContent=document.getElementById('gospel-content'),gError=document.getElementById('gospel-error');
var gRef=document.getElementById('gospel-reference'),gText=document.getElementById('gospel-text'),gLink=document.getElementById('gospel-source-link');
var errLinks=document.getElementById('error-links'),retryBtn=document.getElementById('retry-btn');
var cSection=document.getElementById('comment-section'),cTitle=document.getElementById('comment-title'),cText=document.getElementById('comment-text'),cAuth=document.getElementById('comment-author');

function showLoading(){if(gLoad)gLoad.classList.remove('hidden');if(gContent)gContent.classList.add('hidden');if(gError)gError.classList.add('hidden');}
function showContent(data,rite){
  if(gLoad)gLoad.classList.add('hidden');if(gError)gError.classList.add('hidden');
  if(gRef)gRef.textContent=cleanText(data.reference)||'Vangelo del Giorno';
  if(gText)fillEl(gText,data.text);
  if(gLink)gLink.href=LINKS[rite];
  var ct=cleanText(data.commentText||'');
  if(cSection){
    if(ct.length>30){if(cTitle)cTitle.textContent=cleanText(data.commentTitle)||'Commento';if(cAuth)cAuth.textContent=cleanText(data.commentAuthor)?'\u2014 '+cleanText(data.commentAuthor):'';if(cText)fillEl(cText,data.commentText);cSection.classList.remove('hidden');}
    else cSection.classList.add('hidden');
  }
  if(gContent)gContent.classList.remove('hidden');
}
function showError(rite){
  if(gLoad)gLoad.classList.add('hidden');if(gContent)gContent.classList.add('hidden');
  if(errLinks){errLinks.innerHTML='';var links=rite==='romano'?[{t:'Vatican News',u:LINKS.romano}]:[{t:'La Parola Ambrosiano',u:LINKS.ambrosiano}];links.forEach(function(l){var a=document.createElement('a');a.href=l.u;a.textContent=l.t;a.target='_blank';a.rel='noopener noreferrer';errLinks.appendChild(a);});}
  if(gError)gError.classList.remove('hidden');
}
async function fromFile(rite){
  if(!gospelsCache){var r=await fetch('./gospels.json?v='+todayISO());if(!r.ok)throw new Error('no file');gospelsCache=await r.json();}
  var entry=gospelsCache[todayISO()];if(!entry)throw new Error('no date');
  var data=entry[rite];if(!data||!data.text)throw new Error('no text');return data;
}
var PROXY='https://api.allorigins.win/raw?url=',EVA='https://feed.evangelizo.org/v2/reader.php';
var APOSTOLE_AMB='https://www.apostolesacrocuore.org/vangelo-oggi-ambrosiano.php';
async function evaFetch(p){var qs=Object.keys(p).map(function(k){return encodeURIComponent(k)+'='+encodeURIComponent(p[k]);}).join('&');var r=await fetch(PROXY+encodeURIComponent(EVA+'?'+qs));if(!r.ok)throw new Error('HTTP '+r.status);return(await r.text()).trim();}
async function fromAPI(){var d=todayFmt(),l='IT';var res=await Promise.all([evaFetch({date:d,lang:l,type:'reading_lt',content:'GSP'}),evaFetch({date:d,lang:l,type:'reading',content:'GSP'}),evaFetch({date:d,lang:l,type:'comment_t'}),evaFetch({date:d,lang:l,type:'comment_a'}),evaFetch({date:d,lang:l,type:'comment'})]);if(!res[1]||res[1].length<20)throw new Error('empty');return{reference:res[0],text:res[1],commentTitle:res[2],commentAuthor:res[3],commentText:res[4]};}

/* Real-time Ambrosian gospel: apostolesacrocuore.org
   The page contains the FULL liturgy of the word (prayers, readings, psalms, preface…).
   We isolate ONLY the "Lettura del Vangelo" section. */
async function fromAmbAPIRealtime(){
  var iso=todayISO();
  var url=APOSTOLE_AMB+'?data='+iso;
  var raw=await fetch(PROXY+encodeURIComponent(url)).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.text();});

  /* Strip HTML tags → plain text */
  var text=raw
    .replace(/<br\s*\/?>/gi,'\n')
    .replace(/<\/p>/gi,'\n')
    .replace(/<\/li>/gi,'\n')
    .replace(/<[^>]+>/g,' ')
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ')
    .replace(/&#(\d+);/g,function(_,n){return String.fromCharCode(parseInt(n,10));})
    .split('\n').map(function(l){return l.trim();}).filter(function(l){return l.length>0;}).join('\n');

  /* ── Find "Lettura del Vangelo" line (the LAST occurrence — it's the gospel section) ── */
  var gspRegex=/Lettura del Vangelo secondo\s+\S+/i;
  var gspIdx=-1;
  var match;
  var searchFrom=0;
  /* Walk forward finding all occurrences, keep the last */
  while(true){
    var sub=text.slice(searchFrom);
    var m=sub.match(gspRegex);
    if(!m)break;
    gspIdx=searchFrom+sub.indexOf(m[0]);
    searchFrom=gspIdx+m[0].length;
  }
  if(gspIdx<0) throw new Error('gospel section not found');

  /* Build reference: "Lettura del Vangelo secondo Marco\nMc 8, 27-33" */
  var refLineEnd=text.indexOf('\n',gspIdx);
  var refLine=text.slice(gspIdx,refLineEnd>0?refLineEnd:gspIdx+100).trim();
  /* Next line is typically the citation (e.g. "Mc 8, 27-33") */
  var nextLineStart=refLineEnd+1;
  var nextLineEnd=text.indexOf('\n',nextLineStart);
  var citation=text.slice(nextLineStart,nextLineEnd>0?nextLineEnd:nextLineStart+30).trim();
  var ref=(refLine+(citation&&/^[A-Z][a-z]/.test(citation)?'\n'+citation:'')).replace(/Lettura del /i,'Dal ');

  /* Gospel body: from "In quel tempo" (or first line after citation) to end markers */
  var bodyStart=text.indexOf('In quel tempo',gspIdx);
  if(bodyStart<0) bodyStart=nextLineEnd+1;

  var endMarkers=['https://','http://','Il Signore si ricordò','A CONCLUSIONE','DOPO IL VANGELO',
                  'O Dio forte','Gradisci, o Padre','Porgi ascolto','SUI DONI','PREFAZIO',
                  'Ascolta, Signore, la voce','Condividi','Il Vangelo Rito Ambrosiano'];
  var bodyEnd=text.length;
  endMarkers.forEach(function(m){
    var i=text.indexOf(m,bodyStart);
    if(i>0&&i<bodyEnd)bodyEnd=i;
  });

  var lines=text.slice(bodyStart,bodyEnd)
    .split('\n')
    .map(function(l){return l.trim();})
    .filter(function(l){return l.length>20;})
    .slice(0,40);

  if(lines.length<2) throw new Error('gospel body too short');
  return{reference:ref||'Vangelo — Rito Ambrosiano',text:lines.join('\n'),commentTitle:'',commentAuthor:'',commentText:''};
}

/* Real-time Ambrosian comment — primary: qumran2.net, fallback: tiraccontolaparola.it */
var IT_MONTHS_AMB=['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];

async function fetchQumranComment(){
  /* qumran2 shows the first ambrosian comment for today directly via ?rito=ambrosiano&data=YYYY-MM-DD */
  var url='https://www.qumran2.net/parolenuove/commenti.php?rito=ambrosiano&criteri=1&data='+todayISO()+'&tipo=testo';
  var raw=await fetch(PROXY+encodeURIComponent(url)).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.text();});
  if(raw.length<500||raw.includes('Nessun commento'))return null;

  /* Title: first <a> inside a TESTO block */
  var ct='',ca='',ctxt='';
  var titleM=raw.match(/TESTO\d+\.\s*<[^>]+>\s*\*?\*?([^\[<\n]{10,200}?)\*?\*?\s*<\/a>/i);
  if(!titleM)titleM=raw.match(/class="tit_com"[^>]*>\s*([^<]{10,200})\s*</i);
  if(!titleM)titleM=raw.match(/\[([^\]]{10,120})\]\(https?:\/\/www\.qumran/);
  if(titleM)ct=titleM[1].replace(/\*/g,'').trim();

  /* Author */
  var authorM=raw.match(/\[([^\]]{4,60})\]\(https?:\/\/www\.qumran2\.net\/parolenuove\/commenti\.php\?criteri=1&autore=/);
  if(authorM)ca=authorM[1].replace(/\*/g,'').trim();

  /* Body: strip HTML, take first substantial block between title and next TESTO/footer */
  var bodyStart=titleM?raw.indexOf(titleM[0]):raw.indexOf('<p>');
  var bodyEnd=raw.length;
  var nextTESTO=raw.indexOf('TESTO',bodyStart+titleM[0].length+1);
  if(nextTESTO>0)bodyEnd=nextTESTO;
  ['Iscriviti','Cookie Policy','Qumran2.net, dal'].forEach(function(m){var i=raw.indexOf(m,bodyStart);if(i>0&&i<bodyEnd)bodyEnd=i;});

  var slice=raw.slice(bodyStart,bodyEnd)
    .replace(/<br\s*\/?>/gi,'\n').replace(/<\/p>/gi,'\n').replace(/<[^>]+>/g,' ')
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ')
    .replace(/&#(\d+);/g,function(_,n){return String.fromCharCode(parseInt(n,10));});
  var lines=slice.split('\n').map(function(l){return l.trim();})
    .filter(function(l){return l.length>40&&!/^(inserito|visto|commenti per|Vangelo:|TESTO|VIDEO|AUDIO)/i.test(l)});
  if(lines.length<2)return null;
  ctxt=lines.join('\n');
  return{commentTitle:ct||'Commento Ambrosiano',commentAuthor:ca||'Qumran2',commentText:ctxt};
}

async function fetchTRLPComment(){
  var d=new Date();
  var url='https://www.tiraccontolaparola.it/rito-ambrosiano-commento-al-vangelo-del-'+d.getDate()+'-'+IT_MONTHS_AMB[d.getMonth()]+'-'+d.getFullYear()+'/';
  try{
    var html=await fetch(PROXY+encodeURIComponent(url)).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.text();});
    if(html.includes('Pagina non trovata')||html.length<1000)return null;
    var ct='',ca='';
    var titleM=html.match(/<strong[^>]*>"([^"<]{10,200})"<\/strong>/i)||html.match(/<strong[^>]*>«([^»<]{10,200})»<\/strong>/i);
    if(titleM)ct=titleM[1].trim();
    var authorM=html.match(/<em>([A-Z][a-zàèéìòù]+ [A-Z][a-zàèéìòù]+)<\/em>/);
    if(authorM)ca=authorM[1].trim();
    var startIdx=titleM?html.indexOf(titleM[0]):-1;
    if(startIdx<0){var ol=html.lastIndexOf('</ol>');startIdx=ol>0?ol:html.indexOf('<p>');}
    var endIdx=html.length;
    ['Iscriviti alla Newsletter','Cookie Policy','Privacy Policy'].forEach(function(m){var i=html.indexOf(m,startIdx);if(i>0&&i<endIdx)endIdx=i;});
    var lines=html.slice(startIdx,endIdx)
      .replace(/<br\s*\/?>/gi,'\n').replace(/<\/p>/gi,'\n').replace(/<[^>]+>/g,' ')
      .replace(/&amp;/g,'&').replace(/&nbsp;/g,' ')
      .replace(/&#(\d+);/g,function(_,n){return String.fromCharCode(parseInt(n,10));})
      .split('\n').map(function(l){return l.trim();})
      .filter(function(l){return l.length>40&&!/^(iscriviti|cookie|privacy|nome|cognome|email|invia|accetto|copyright)/i.test(l);});
    if(lines.length<3)return null;
    return{commentTitle:ct||'Commento al Vangelo',commentAuthor:ca||'Ti racconto la Parola',commentText:lines.join('\n')};
  }catch(e){return null;}
}

async function fetchAmbCommentRealtime(){
  try{var r=await fetchQumranComment();if(r&&r.commentText.length>100)return r;}catch(e){}
  try{var r2=await fetchTRLPComment();if(r2&&r2.commentText.length>100)return r2;}catch(e){}
  return null;
}
async function loadGospel(rite){
  showLoading();
  try{
    /* 1) Try pre-fetched JSON first (always preferred) */
    var data,ok=false;
    try{data=await fromFile(rite);ok=true;}catch(e){}
    if(!ok){
      if(rite==='ambrosiano'){
        /* 2a) Real-time Ambrosian gospel source */
        try{data=await fromAmbAPIRealtime();}catch(e){
          /* 2b) Last resort: Romano text */
          data=await fromAPI();data.reference+=' (rito romano)';
        }
      } else {
        data=await fromAPI();
      }
    }
    /* 3) If ambrosiano comment is missing, try fetching it real-time */
    if(rite==='ambrosiano'&&(!data.commentText||data.commentText.length<30)){
      try{
        var c=await fetchAmbCommentRealtime();
        if(c){data.commentTitle=c.commentTitle;data.commentAuthor=c.commentAuthor;data.commentText=c.commentText;}
      }catch(e){}
    }
    showContent(data,rite);
  }catch(err){showError(rite);}
}
document.querySelectorAll('.rite-tab').forEach(function(btn){btn.addEventListener('click',function(){var rite=btn.dataset.rite;if(rite===currentRite)return;currentRite=rite;document.querySelectorAll('.rite-tab').forEach(function(b){b.classList.toggle('active',b.dataset.rite===rite);b.setAttribute('aria-pressed',b.dataset.rite===rite?'true':'false');});loadGospel(rite);});});
if(retryBtn)retryBtn.addEventListener('click',function(){loadGospel(currentRite);});
document.addEventListener('DOMContentLoaded',function(){loadGospel(currentRite);});

/* ── Prayers ── */
var PRAYER_KEY='amdg_prayers_v3';
function getPrayers(){
  /* 1) Logged in + cloud loaded → use cloud */
  if(currentUser && window._cloudPrayers) return JSON.parse(JSON.stringify(window._cloudPrayers));
  /* 2) Fallback: localStorage (works offline and before cloud loads) */
  try { var stored=localStorage.getItem(PRAYER_KEY); if(stored){var p=JSON.parse(stored);if(Array.isArray(p)&&p.length)return p;} } catch(e){}
  /* 3) Absolute fallback: built-in defaults */
  return JSON.parse(JSON.stringify(DEFAULT_PRAYERS));
}
/* BUG FIX: always save to localStorage, not only when logged in */
function savePrayersLocal(a){ try{localStorage.setItem(PRAYER_KEY,JSON.stringify(a));}catch(e){} }
async function loadPrayersFromCloud(){
  if(!SUPA||!currentUser)return;
  try{
    var r=await SUPA.from('settings').select('prayers').eq('user_id',currentUser.id).single();
    if(r.error){
      /* PGRST116 = nessuna riga trovata: normale per nuovi utenti, non è un errore */
      if(r.error.code!=='PGRST116') console.error('AMDG: loadPrayers error:', r.error);
      return;
    }
    if(r.data&&r.data.prayers){
      window._cloudPrayers=r.data.prayers;
      localStorage.setItem(PRAYER_KEY,JSON.stringify(r.data.prayers));
    }
  }catch(e){ console.error('AMDG: loadPrayers exception:', e); }
}
async function savePrayersToCloud(a){
  if(!SUPA||!currentUser)return;
  window._cloudPrayers=a;
  try{
    var r=await SUPA.from('settings').upsert({user_id:currentUser.id,prayers:a},{onConflict:'user_id'});
    if(r.error) console.error('AMDG: savePrayers error:', r.error);
  }catch(e){ console.error('AMDG: savePrayers exception:', e); }
}
function makeAngelusBody(){
  return '<div class="angelus-grid"><div class="angelus-col"><span class="lang-badge">Italiano</span><div class="angelus-verses"><p><span class="verse-v">V.</span> L\u2019Angelo del Signore port\u00f2 l\u2019annunzio a Maria</p><p><span class="verse-r">R.</span> Ed ella concep\u00ec per opera dello Spirito Santo.</p><p class="verse-italic">Ave Maria\u2026</p><p><span class="verse-v">V.</span> Eccomi, sono la serva del Signore.</p><p><span class="verse-r">R.</span> Si compia in me la tua parola.</p><p class="verse-italic">Ave Maria\u2026</p><p><span class="verse-v">V.</span> E il Verbo si fece carne.</p><p><span class="verse-r">R.</span> E venne ad abitare in mezzo a noi.</p><p class="verse-italic">Ave Maria\u2026</p><p><span class="verse-v">V.</span> Prega per noi, santa Madre di Dio.</p><p><span class="verse-r">R.</span> Perch\u00e9 siamo resi degni delle promesse di Cristo.</p><p class="verse-prayer">Preghiamo. Infondi nel nostro spirito la Tua grazia, o Padre; Tu, che nell\u2019annunzio dell\u2019angelo ci hai rivelato l\u2019incarnazione del Tuo Figlio, per la Sua passione e la Sua croce guidaci alla gloria della risurrezione. Per Cristo nostro Signore.</p><p class="amen">Amen.</p></div></div><div class="angelus-divider"></div><div class="angelus-col"><span class="lang-badge lang-badge--de">Deutsch</span><div class="angelus-verses"><p><span class="verse-v">V.</span> Der Engel des Herrn brachte Maria die Botschaft, und sie empfing vom Heiligen Geist.</p><p><span class="verse-r">R.</span> Gegr\u00fc\u00dfet seist du, Maria\u2026</p><p><span class="verse-v">V.</span> Maria sprach: Siehe, ich bin eine Magd des Herrn, mir geschehe nach Deinem Wort.</p><p><span class="verse-r">R.</span> Gegr\u00fc\u00dfet seist du, Maria\u2026</p><p><span class="verse-v">V.</span> Und das Wort ist Fleisch geworden und hat unter uns gewohnt.</p><p><span class="verse-r">R.</span> Gegr\u00fc\u00dfet seist du, Maria\u2026</p><p><span class="verse-v">V.</span> Bitte f\u00fcr uns, o heilige Gottsgeb\u00e4rerin,</p><p><span class="verse-r">R.</span> auf dass wir w\u00fcrdig werden der Verhe\u00dfungen Christi.</p><p class="verse-prayer">Lasset uns beten: Allm\u00e4chtiger Gott, gie\u00dfe deine Gnade in unsere Herzen ein. Durch die Botschaft des Engels haben wir die Menschwerdung Christi, deines Sohnes, erkannt. Lass uns durch sein Leiden und Kreuz zur Herrlichkeit der Auferstehung gelangen. Darum bitten wir durch Christus, unseren Herrn.</p><p class="amen">Amen.</p></div></div></div>';
}
function makePrayerBody(p){
  if(p.id==='angelus')return makeAngelusBody();
  var out='';
  p.text.split('\n').filter(function(l){return l.trim();}).forEach(function(line){
    if(line.trim()==='Amen.'||line.trim()==='Amen')out+='<p class="amen">Amen.</p>';
    else out+='<p>'+line.replace(/</g,'&lt;')+'</p>';
  });
  return out;
}
function renderPrayers(){
  var list=document.getElementById('prayers-list');if(!list)return;
  var prayers=getPrayers();list.innerHTML='';
  var loggedIn=!!currentUser;
  prayers.forEach(function(p,idx){
    var item=document.createElement('div');item.className='prayer-item';
    var editBtn=loggedIn?'<button class="prayer-edit-btn" data-idx="'+idx+'" title="Modifica">\u270f</button>':'';
    item.innerHTML='<div class="prayer-toggle-row"><button class="prayer-toggle" aria-expanded="false"><span class="prayer-icon">'+p.emoji+'</span><span class="prayer-info"><span class="prayer-tag">'+p.tag+'</span><span class="prayer-name">'+p.name+'</span></span><span class="prayer-chevron" aria-hidden="true"></span></button>'+editBtn+'</div><div class="prayer-body hidden">'+makePrayerBody(p)+'</div>';
    list.appendChild(item);
    var toggle=item.querySelector('.prayer-toggle'),body=item.querySelector('.prayer-body');
    toggle.addEventListener('click',function(){var isOpen=toggle.getAttribute('aria-expanded')==='true';list.querySelectorAll('.prayer-item').forEach(function(i){if(i!==item){i.classList.remove('open');var t=i.querySelector('.prayer-toggle'),b=i.querySelector('.prayer-body');if(t)t.setAttribute('aria-expanded','false');if(b)b.classList.add('hidden');}});toggle.setAttribute('aria-expanded',isOpen?'false':'true');body.classList.toggle('hidden',isOpen);item.classList.toggle('open',!isOpen);});
    if(loggedIn){
      var editEl=item.querySelector('.prayer-edit-btn');
      if(editEl)editEl.addEventListener('click',function(){openPE(idx);});
    }
  });
  /* Show/hide add & reset buttons based on login */
  var addBtn=document.getElementById('add-prayer-btn'),resetBtn=document.getElementById('reset-prayers-btn');
  if(addBtn)addBtn.style.display=loggedIn?'':'none';
  if(resetBtn)resetBtn.style.display=loggedIn?'':'none';
}

var peOverlay=document.getElementById('pe-overlay'),peEditIdx=-1;
function openPE(idx){peEditIdx=idx;var prayers=getPrayers();var p=idx>=0&&idx<prayers.length?prayers[idx]:null;document.getElementById('pe-title').textContent=p?'Modifica Preghiera':'Nuova Preghiera';document.getElementById('pe-emoji').value=p?p.emoji:'\u2728';document.getElementById('pe-tag').value=p?p.tag:'';document.getElementById('pe-name').value=p?p.name:'';document.getElementById('pe-text').value=p?(p.id==='angelus'?'(Angelus \u2014 testo fisso)':p.text):'';var del=document.getElementById('pe-delete');if(del)del.classList.toggle('hidden',!(p&&!p.isDefault));if(peOverlay)peOverlay.classList.remove('hidden');}
function closePE(){if(peOverlay)peOverlay.classList.add('hidden');peEditIdx=-1;}
var peClose=document.getElementById('pe-close'),peCancel=document.getElementById('pe-cancel');
if(peClose)peClose.addEventListener('click',closePE);if(peCancel)peCancel.addEventListener('click',closePE);
if(peOverlay)peOverlay.addEventListener('click',function(e){if(e.target===peOverlay)closePE();});
var peForm=document.getElementById('pe-form');
if(peForm)peForm.addEventListener('submit',function(e){
  e.preventDefault();
  if(!currentUser){openAuth();return;}
  var prayers=getPrayers();
  var nd={emoji:document.getElementById('pe-emoji').value||'\u2728',tag:document.getElementById('pe-tag').value,name:document.getElementById('pe-name').value,text:document.getElementById('pe-text').value};
  if(peEditIdx>=0&&peEditIdx<prayers.length)Object.assign(prayers[peEditIdx],nd);
  else prayers.push({id:'c'+Date.now(),isDefault:false,emoji:nd.emoji,tag:nd.tag,name:nd.name,text:nd.text});
  savePrayersLocal(prayers);savePrayersToCloud(prayers);renderPrayers();closePE();
});
var peDel=document.getElementById('pe-delete');
if(peDel)peDel.addEventListener('click',function(){if(!confirm('Eliminare questa preghiera?'))return;var prayers=getPrayers();if(peEditIdx>=0)prayers.splice(peEditIdx,1);savePrayersLocal(prayers);savePrayersToCloud(prayers);renderPrayers();closePE();});
var addPBtn=document.getElementById('add-prayer-btn');if(addPBtn)addPBtn.addEventListener('click',function(){if(!currentUser){openAuth();return;}openPE(-1);});
var resetPBtn=document.getElementById('reset-prayers-btn');
if(resetPBtn)resetPBtn.addEventListener('click',function(){if(!currentUser){openAuth();return;}if(!confirm('Ripristinare le preghiere predefinite?'))return;var def=JSON.parse(JSON.stringify(DEFAULT_PRAYERS));savePrayersLocal(def);savePrayersToCloud(def);renderPrayers();});
document.addEventListener('DOMContentLoaded',renderPrayers);

/* ── Intentions (cloud only, visible only when logged in) ── */
async function loadIntentionsFromCloud(){
  if(!SUPA||!currentUser)return;
  try{
    var r=await SUPA.from('intentions').select('*').eq('user_id',currentUser.id).order('created_at',{ascending:false});
    if(r.error){console.error('AMDG: loadIntentions error:', r.error);throw r.error;}
    window._cloudIntentions=r.data||[];
  }catch(e){
    console.error('AMDG: loadIntentions exception:', e);
    window._cloudIntentions=[];
  }
}
function getInts(){return window._cloudIntentions||[];}

function renderIntentions(){
  var list=document.getElementById('int-list'),empty=document.getElementById('int-empty');
  if(!list||!empty)return;
  var arr=getInts();list.innerHTML='';
  if(!arr.length){empty.classList.remove('hidden');return;}
  empty.classList.add('hidden');
  arr.forEach(function(item){
    var div=document.createElement('div');div.className='int-item'+(item.done?' int-done':'');
    var doneLabel=item.done?'\u2022 Esaudita \u2713':'';
    div.innerHTML='<div class="int-dot"></div><div class="int-body"><p class="int-text">'+item.text.replace(/</g,'&lt;')+'</p><p class="int-date">'+fmtDate(item.created_at)+(doneLabel?' <span class="int-esaudita">'+doneLabel+'</span>':'')+'</p></div><div class="int-actions"><button class="int-btn int-done-btn" data-id="'+item.id+'" title="'+(item.done?'Riapri':'Segna come esaudita')+'">'+(item.done?'\u21b7':'\u2713')+'</button><button class="int-btn int-del-btn" data-id="'+item.id+'" title="Elimina">\u00d7</button></div>';
    list.appendChild(div);
  });

  list.querySelectorAll('.int-done-btn').forEach(function(btn){
    btn.addEventListener('click',async function(){
      var id=btn.dataset.id;
      var arr=getInts();
      var foundIdx=arr.findIndex(function(i){return i.id===id;});
      if(foundIdx>=0){
        var newDone=!arr[foundIdx].done;
        arr[foundIdx].done=newDone;
        window._cloudIntentions=arr;
        if(SUPA&&currentUser){
          var r=await SUPA.from('intentions').update({done:newDone}).eq('id',id).eq('user_id',currentUser.id);
          if(r.error)console.error('toggle done error:',r.error);
        }
        renderIntentions();
      }
    });
  });

  list.querySelectorAll('.int-del-btn').forEach(function(btn){
    btn.addEventListener('click',async function(){
      if(!confirm('Eliminare questa intenzione?'))return;
      var id=btn.dataset.id;
      window._cloudIntentions=getInts().filter(function(i){return i.id!==id;});
      renderIntentions();
      if(SUPA&&currentUser){
        var r=await SUPA.from('intentions').delete().eq('id',id).eq('user_id',currentUser.id);
        if(r.error)console.error('delete intention error:',r.error);
      }
    });
  });
}

var intInput=document.getElementById('int-input'),intChars=document.getElementById('int-chars'),intAddBtn=document.getElementById('int-add-btn');
if(intInput&&intChars)intInput.addEventListener('input',function(){intChars.textContent=intInput.value.length;});

function showIntError(msg){var e=document.getElementById('int-error');if(e){e.textContent=msg;e.classList.remove('hidden');}}
function hideIntError(){var e=document.getElementById('int-error');if(e)e.classList.add('hidden');}

if(intAddBtn)intAddBtn.addEventListener('click',async function(){
  if(!currentUser){openAuth();return;}
  var text=(intInput?intInput.value:'').trim();
  if(!text)return;
  if(!SUPA){showIntError('Sincronizzazione non disponibile. Configura Supabase in config.js.');return;}
  hideIntError();
  intAddBtn.disabled=true;
  intAddBtn.textContent='…';
  try{
    var r=await SUPA.from('intentions').insert({user_id:currentUser.id,text:text.slice(0,500),done:false}).select().single();
    if(r.error)throw r.error;
    window._cloudIntentions=[r.data].concat(getInts());
    if(intInput){intInput.value='';if(intChars)intChars.textContent='0';}
    renderIntentions();
  }catch(e){
    console.error('intentions insert error:',e);
    showIntError('Errore nel salvataggio: '+(e.message||'riprova.'));
  }
  intAddBtn.disabled=false;
  intAddBtn.textContent='Aggiungi';
});
if(intInput)intInput.addEventListener('keydown',function(e){if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)&&intAddBtn)intAddBtn.click();});
document.addEventListener('DOMContentLoaded',function(){if(currentUser)renderIntentions();});

/* ── Notes Preview (on main page) ── */

async function loadNotesPreview(){
  if(!SUPA||!currentUser)return;
  try{
    var r=await SUPA.from('notes').select('id,title,content,updated_at,created_at').eq('user_id',currentUser.id).order('updated_at',{ascending:false}).limit(6);
    window._cloudNotes=r.data||[];
  }catch(e){window._cloudNotes=[];}
}

function renderNotesPreview(){
  var section=document.getElementById('notes-preview-section');
  var list=document.getElementById('note-preview-list');
  if(!section||!list)return;
  var notes=window._cloudNotes||[];
  if(!notes.length){
    list.innerHTML='<p class="note-preview-empty">Nessun appunto ancora. Inizia a scrivere nella pagina Appunti.</p>';
    return;
  }
  list.innerHTML='';
  notes.forEach(function(note){
    var preview=(note.content||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,120);
    var dateStr='';try{dateStr=new Date(note.updated_at||note.created_at).toLocaleDateString('it-IT',{day:'numeric',month:'short'});}catch(e){}
    var card=document.createElement('div');card.className='note-preview-card';
    card.innerHTML='<div class="note-preview-header"><span class="note-preview-title">'+(note.title||'Senza titolo').replace(/</g,'&lt;')+'</span><span class="note-preview-date">'+dateStr+'</span></div><div class="note-preview-body hidden"><p class="note-preview-text">'+(preview||'\u2014').replace(/</g,'&lt;')+'</p></div><button class="note-preview-toggle" aria-expanded="false"><span class="note-preview-toggle-icon"></span></button>';
    list.appendChild(card);
    var toggleBtn=card.querySelector('.note-preview-toggle');
    var body=card.querySelector('.note-preview-body');
    toggleBtn.addEventListener('click',function(){
      var open=toggleBtn.getAttribute('aria-expanded')==='true';
      toggleBtn.setAttribute('aria-expanded',open?'false':'true');
      body.classList.toggle('hidden',open);
      card.classList.toggle('expanded',!open);
    });
  });
}

/* ── Streak (cloud only when logged in) ── */
var STREAK_KEY='amdg_streak_v2';
function getVisits(){
  if(currentUser) try{return JSON.parse(localStorage.getItem(STREAK_KEY+'_'+currentUser.id)||'[]');}catch(e){return[];}
  return [];
}
function saveVisitsLocal(a,uid){localStorage.setItem(STREAK_KEY+'_'+uid,JSON.stringify(a));}
async function loadStreakFromCloud(){
  if(!SUPA||!currentUser)return;
  try{
    var r=await SUPA.from('streak').select('visits').eq('user_id',currentUser.id).single();
    if(r.error&&r.error.code!=='PGRST116'){console.error('AMDG: loadStreak error:',r.error);return;}
    if(r.data&&r.data.visits){
      var merged=Array.from(new Set([].concat(getVisits(),r.data.visits)));
      saveVisitsLocal(merged,currentUser.id);
    }
  }catch(e){ console.error('AMDG: loadStreak exception:',e); }
}
async function saveStreakToCloud(a){
  if(!SUPA||!currentUser)return;
  try{
    var r=await SUPA.from('streak').upsert({user_id:currentUser.id,visits:a},{onConflict:'user_id'});
    if(r.error) console.error('AMDG: saveStreak error:',r.error);
  }catch(e){ console.error('AMDG: saveStreak exception:',e); }
}
function recordVisit(){
  if(!currentUser)return;
  var today=todayISO(),arr=getVisits();
  if(!arr.includes(today)){arr.push(today);saveVisitsLocal(arr,currentUser.id);saveStreakToCloud(arr);}
}
function renderStreak(){
  var bar=document.getElementById('streak-bar');if(!bar)return;
  if(!currentUser){bar.innerHTML='';return;}
  var arr=getVisits().sort();var today=todayISO();var total=arr.length;
  var streak=0;var cur=new Date();
  while(true){var iso=cur.toISOString().slice(0,10);if(arr.includes(iso)){streak++;cur.setDate(cur.getDate()-1);}else break;}
  var allDays=[];
  if(arr.length>0){var start=new Date(arr[0]);var end=new Date(today);var d=new Date(start);while(d<=end){allDays.push(d.toISOString().slice(0,10));d.setDate(d.getDate()+1);}}
  else allDays=[today];
  var streakTxt=streak>=2?streak+' giorni':streak===1?'Qui oggi':'';
  bar.innerHTML='<div class="streak-wrap"><div class="streak-header"><span class="streak-label">Il tuo cammino \u2014 '+total+' '+(total===1?'giornata':'giornate')+'</span>'+(streakTxt?'<span class="streak-count">'+streakTxt+'</span>':'')+' </div><div class="streak-scroll" id="ss"><div class="streak-dots" id="sd"></div></div></div>';
  var sd=bar.querySelector('#sd');
  allDays.forEach(function(iso){var dot=document.createElement('div');dot.className='streak-dot';dot.title=iso;if(iso===today)dot.classList.add('today');else if(arr.includes(iso))dot.classList.add('visited');sd.appendChild(dot);});
  var sc=bar.querySelector('#ss');if(sc)setTimeout(function(){sc.scrollLeft=sc.scrollWidth;},50);
}

/* Render on load */
document.addEventListener('DOMContentLoaded',function(){
  renderPrayers();
  updateAuthUI();
});
