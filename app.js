/* AMDG app.js */
'use strict';

var DEFAULT_PRAYERS = [{"id": "mattino", "emoji": "\u2600", "tag": "Mattino", "name": "Guidami, Signore", "isDefault": true, "text": "Signore, guidami in questo nuovo giorno, perch\u00e9 io possa riconoscere e abbracciare ci\u00f2 che \u00e8 bene.\n\nAiutami a far s\u00ec che tutto il mio lavoro e lo studio siano efficaci strumenti per Te.\n\nPer intercessione di Carlo Acutis, non dimenticarti di questo tuo servo.\n\nAmen."}, {"id": "angelus", "emoji": "\ud83d\udd14", "tag": "Mezzogiorno", "name": "Angelus Domini", "isDefault": true, "text": "SPECIAL"}, {"id": "tentazione", "emoji": "\u2694", "tag": "Tentazione", "name": "Coraggio e Forza", "isDefault": true, "text": "Signore Ges\u00f9, donami coraggio e forza. Aiutami a riconoscere ci\u00f2 che \u00e8 veramente bene.\n\nFa\u2019 che la mia fede si riveli e cresca.\n\nMaria, Madre potente, intercedi per me.\n\nAmen."}, {"id": "caduta", "emoji": "\ud83d\udd4a", "tag": "Dopo la Caduta", "name": "Rialzami, Signore", "isDefault": true, "text": "Signore, tu hai visto la mia lotta e sai che non volevo cadere, eppure sono caduto.\n\nPerdonami. Rialzami ancora una volta. Non lasciare che la mia caduta diventi disperazione.\n\nInsegnami a ricominciare con pi\u00f9 umilt\u00e0 e pi\u00f9 fiducia nella Tua grazia.\n\nAmen."}, {"id": "inizio", "emoji": "\u270f", "tag": "Prima di un Impegno", "name": "Tutto a Te", "isDefault": true, "text": "Ges\u00f9, mentre inizio ci\u00f2 che mi accingi a farmi vivere, ti affido tutto me stesso.\n\nIllumina i miei pensieri, fa\u2019 che ogni mio sforzo diventi strumento per Te.\n\nAmen."}, {"id": "maria", "emoji": "\ud83c\udf39", "tag": "Mariana", "name": "Santa Maria, Madre di Dio", "isDefault": true, "text": "Santa Maria, Madre di Dio, tu che mai trascuri chi ti chiama, rendimi saldo nella fede.\n\nGuida i miei passi, rafforza la mia volont\u00e0, rendimi capace di compiere il bene.\n\nAmen."}, {"id": "sera", "emoji": "\ud83c\udf19", "tag": "Sera", "name": "Ti Adoro, Mio Dio", "isDefault": true, "text": "Ti adoro mio Dio e ti amo con tutto il cuore, ti ringrazio di avermi creato fatto cristiano e conservato in questo giorno, perdonami il male oggi commesso e se qualche bene ho compiuto accettalo custodiscimi nel riposo e liberami dai pericoli la grazia tua sia sempre con me e con tutti i miei cari.\n\nAmen."}];

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

function initSupabase() {
  if(typeof SUPABASE_URL==='undefined'||!SUPABASE_URL||SUPABASE_URL.length<10) return;
  if(typeof supabase==='undefined') return;
  SUPA = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  SUPA.auth.onAuthStateChange(function(event, session) {
    var wasLoggedIn = !!currentUser;
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

/* Username -> fake email conversion so no real email needed */
function toEmail(username) { return username.trim().toLowerCase() + '@amdg.app'; }

function updateAuthUI() {
  var btn=document.getElementById('auth-btn'), lbl=document.getElementById('auth-btn-label');
  var notesBtn=document.getElementById('notes-btn');
  if(!btn||!lbl) return;
  if(currentUser) {
    btn.classList.add('logged-in');
    var username = (currentUser.email||'').replace('@amdg.app','');
    lbl.textContent = username || 'Account';
    if(notesBtn) notesBtn.style.display='flex';
  } else {
    btn.classList.remove('logged-in');
    lbl.textContent = 'Accedi';
    if(notesBtn) notesBtn.style.display='none';
  }
  /* Show/hide personal sections */
  var personalSections = document.querySelectorAll('.personal-section');
  var loginPrompt = document.getElementById('login-prompt');
  if(currentUser) {
    personalSections.forEach(function(s){s.style.display='';});
    if(loginPrompt) loginPrompt.classList.add('hidden');
  } else {
    personalSections.forEach(function(s){s.style.display='none';});
    if(loginPrompt) loginPrompt.classList.remove('hidden');
  }
}

function showLoggedOutState() {
  /* Clear all personal data from UI */
  var intList=document.getElementById('int-list');
  var intEmpty=document.getElementById('int-empty');
  if(intList) intList.innerHTML='';
  if(intEmpty) intEmpty.classList.remove('hidden');
  updateAuthUI();
}

async function loadAllUserData() {
  await Promise.all([loadIntentionsFromCloud(), loadStreakFromCloud(), loadPrayersFromCloud()]);
  renderIntentions();
  renderPrayers();
  renderStreak();
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
      /* Auto-confirm: try to sign in immediately */
      var signIn = await SUPA.auth.signInWithPassword({email:email, password:pw});
      if(signIn.error) {
        showAuthErr('Account creato! Prova ad accedere con le stesse credenziali.');
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
async function evaFetch(p){var qs=Object.keys(p).map(function(k){return encodeURIComponent(k)+'='+encodeURIComponent(p[k]);}).join('&');var r=await fetch(PROXY+encodeURIComponent(EVA+'?'+qs));if(!r.ok)throw new Error('HTTP '+r.status);return(await r.text()).trim();}
async function fromAPI(){var d=todayFmt(),l='IT';var res=await Promise.all([evaFetch({date:d,lang:l,type:'reading_lt',content:'GSP'}),evaFetch({date:d,lang:l,type:'reading',content:'GSP'}),evaFetch({date:d,lang:l,type:'comment_t'}),evaFetch({date:d,lang:l,type:'comment_a'}),evaFetch({date:d,lang:l,type:'comment'})]);if(!res[1]||res[1].length<20)throw new Error('empty');return{reference:res[0],text:res[1],commentTitle:res[2],commentAuthor:res[3],commentText:res[4]};}
async function loadGospel(rite){
  showLoading();
  try{var data,ok=false;try{data=await fromFile(rite);ok=true;}catch(e){}
  if(!ok){data=await fromAPI();if(rite==='ambrosiano')data.reference+=' (rito romano)';}
  showContent(data,rite);}catch(err){showError(rite);}
}
document.querySelectorAll('.rite-tab').forEach(function(btn){btn.addEventListener('click',function(){var rite=btn.dataset.rite;if(rite===currentRite)return;currentRite=rite;document.querySelectorAll('.rite-tab').forEach(function(b){b.classList.toggle('active',b.dataset.rite===rite);b.setAttribute('aria-pressed',b.dataset.rite===rite?'true':'false');});loadGospel(rite);});});
if(retryBtn)retryBtn.addEventListener('click',function(){loadGospel(currentRite);});
document.addEventListener('DOMContentLoaded',function(){loadGospel(currentRite);});

/* ── Prayers ── */
var PRAYER_KEY='amdg_prayers_v3';
function getPrayers(){try{var s=localStorage.getItem(PRAYER_KEY);if(s){var a=JSON.parse(s);if(a&&a.length>0)return a;}}catch(e){}return JSON.parse(JSON.stringify(DEFAULT_PRAYERS));}
function savePrayersLocal(a){localStorage.setItem(PRAYER_KEY,JSON.stringify(a));}
async function loadPrayersFromCloud(){
  if(!SUPA||!currentUser)return;
  try{var r=await SUPA.from('settings').select('prayers').eq('user_id',currentUser.id).single();if(r.data&&r.data.prayers)localStorage.setItem(PRAYER_KEY,JSON.stringify(r.data.prayers));}catch(e){}
}
async function savePrayersToCloud(a){
  if(!SUPA||!currentUser)return;
  try{await SUPA.from('settings').upsert({user_id:currentUser.id,prayers:a},{onConflict:'user_id'});}catch(e){}
}
function makeAngelusBody(){
  return '<div class="angelus-grid"><div class="angelus-col"><span class="lang-badge">Italiano</span><div class="angelus-verses"><p><span class="verse-v">V.</span> L\u2019Angelo del Signore port\u00f2 l\u2019annunzio a Maria</p><p><span class="verse-r">R.</span> Ed ella concep\u00ec per opera dello Spirito Santo.</p><p class="verse-italic">Ave Maria\u2026</p><p><span class="verse-v">V.</span> Eccomi, sono la serva del Signore.</p><p><span class="verse-r">R.</span> Si compia in me la tua parola.</p><p class="verse-italic">Ave Maria\u2026</p><p><span class="verse-v">V.</span> E il Verbo si fece carne.</p><p><span class="verse-r">R.</span> E venne ad abitare in mezzo a noi.</p><p class="verse-italic">Ave Maria\u2026</p><p><span class="verse-v">V.</span> Prega per noi, santa Madre di Dio.</p><p><span class="verse-r">R.</span> Perch\u00e9 siamo resi degni delle promesse di Cristo.</p><p class="verse-prayer">Preghiamo. Infondi nel nostro spirito la Tua grazia, o Padre; Tu, che nell\u2019annunzio dell\u2019angelo ci hai rivelato l\u2019incarnazione del Tuo Figlio, per la Sua passione e la Sua croce guidaci alla gloria della risurrezione. Per Cristo nostro Signore.</p><p class="amen">Amen.</p></div></div><div class="angelus-divider"></div><div class="angelus-col"><span class="lang-badge lang-badge--de">Deutsch</span><div class="angelus-verses"><p><span class="verse-v">V.</span> Der Engel des Herrn brachte Maria die Botschaft, und sie empfing vom Heiligen Geist.</p><p><span class="verse-r">R.</span> Gegr\u00fc\u00dfet seist du, Maria\u2026</p><p><span class="verse-v">V.</span> Maria sprach: Siehe, ich bin eine Magd des Herrn, mir geschehe nach Deinem Wort.</p><p><span class="verse-r">R.</span> Gegr\u00fc\u00dfet seist du, Maria\u2026</p><p><span class="verse-v">V.</span> Und das Wort ist Fleisch geworden und hat unter uns gewohnt.</p><p><span class="verse-r">R.</span> Gegr\u00fc\u00dfet seist du, Maria\u2026</p><p><span class="verse-v">V.</span> Bitte f\u00fcr uns, o heilige Gottsgeb\u00e4rerin,</p><p><span class="verse-r">R.</span> auf dass wir w\u00fcrdig werden der Verhe\u00dfungen Christi.</p><p class="verse-prayer">Lasset uns beten: Allm\u00e4chtiger Gott, gie\u00dfe deine Gnade in unsere Herzen ein. Durch die Botschaft des Engels haben wir die Menschwerdung Christi, deines Sohnes, erkannt. Lass uns durch sein Leiden und Kreuz zur Herrlichkeit der Auferstehung gelangen. Darum bitten wir durch Christus, unseren Herrn.</p><p class="amen">Amen.</p></div></div></div>';
}
function makePrayerBody(p){
  if(p.id==='angelus')return makeAngelusBody();
  var html='';
  p.text.split('\n').filter(function(l){return l.trim();}).forEach(function(line){
    if(line.trim()==='Amen.'||line.trim()==='Amen')html+='<p class="amen">Amen.</p>';
    else html+='<p>'+line.replace(/</g,'&lt;')+'</p>';
  });
  return html;
}
function renderPrayers(){
  var list=document.getElementById('prayers-list');if(!list)return;
  var prayers=getPrayers();list.innerHTML='';
  prayers.forEach(function(p,idx){
    var item=document.createElement('div');item.className='prayer-item';
    item.innerHTML='<div class="prayer-toggle-row"><button class="prayer-toggle" aria-expanded="false"><span class="prayer-icon">'+p.emoji+'</span><span class="prayer-info"><span class="prayer-tag">'+p.tag+'</span><span class="prayer-name">'+p.name+'</span></span><span class="prayer-chevron" aria-hidden="true"></span></button><button class="prayer-edit-btn" data-idx="'+idx+'" title="Modifica">\u270f</button></div><div class="prayer-body hidden">'+makePrayerBody(p)+'</div>';
    list.appendChild(item);
    var toggle=item.querySelector('.prayer-toggle'),body=item.querySelector('.prayer-body');
    toggle.addEventListener('click',function(){var isOpen=toggle.getAttribute('aria-expanded')==='true';list.querySelectorAll('.prayer-item').forEach(function(i){if(i!==item){i.classList.remove('open');var t=i.querySelector('.prayer-toggle'),b=i.querySelector('.prayer-body');if(t)t.setAttribute('aria-expanded','false');if(b)b.classList.add('hidden');}});toggle.setAttribute('aria-expanded',isOpen?'false':'true');body.classList.toggle('hidden',isOpen);item.classList.toggle('open',!isOpen);});
    item.querySelector('.prayer-edit-btn').addEventListener('click',function(){openPE(idx);});
  });
}
var peOverlay=document.getElementById('pe-overlay'),peEditIdx=-1;
function openPE(idx){peEditIdx=idx;var prayers=getPrayers();var p=idx>=0&&idx<prayers.length?prayers[idx]:null;document.getElementById('pe-title').textContent=p?'Modifica Preghiera':'Nuova Preghiera';document.getElementById('pe-emoji').value=p?p.emoji:'\u2728';document.getElementById('pe-tag').value=p?p.tag:'';document.getElementById('pe-name').value=p?p.name:'';document.getElementById('pe-text').value=p?(p.id==='angelus'?'(Angelus - testo fisso, non modificabile)':p.text):'';var del=document.getElementById('pe-delete');if(del)del.classList.toggle('hidden',!(p&&!p.isDefault));if(peOverlay)peOverlay.classList.remove('hidden');}
function closePE(){if(peOverlay)peOverlay.classList.add('hidden');peEditIdx=-1;}
var peClose=document.getElementById('pe-close'),peCancel=document.getElementById('pe-cancel');
if(peClose)peClose.addEventListener('click',closePE);if(peCancel)peCancel.addEventListener('click',closePE);
if(peOverlay)peOverlay.addEventListener('click',function(e){if(e.target===peOverlay)closePE();});
var peForm=document.getElementById('pe-form');
if(peForm)peForm.addEventListener('submit',function(e){e.preventDefault();var prayers=getPrayers();var nd={emoji:document.getElementById('pe-emoji').value||'\u2728',tag:document.getElementById('pe-tag').value,name:document.getElementById('pe-name').value,text:document.getElementById('pe-text').value};if(peEditIdx>=0&&peEditIdx<prayers.length)Object.assign(prayers[peEditIdx],nd);else prayers.push({id:'c'+Date.now(),...nd,isDefault:false});savePrayersLocal(prayers);savePrayersToCloud(prayers);renderPrayers();closePE();});
var peDel=document.getElementById('pe-delete');
if(peDel)peDel.addEventListener('click',function(){if(!confirm('Eliminare?'))return;var prayers=getPrayers();if(peEditIdx>=0)prayers.splice(peEditIdx,1);savePrayersLocal(prayers);savePrayersToCloud(prayers);renderPrayers();closePE();});
var addPBtn=document.getElementById('add-prayer-btn');if(addPBtn)addPBtn.addEventListener('click',function(){openPE(-1);});
var resetPBtn=document.getElementById('reset-prayers-btn');
if(resetPBtn)resetPBtn.addEventListener('click',function(){if(!confirm('Ripristinare le preghiere predefinite?'))return;var def=JSON.parse(JSON.stringify(DEFAULT_PRAYERS));savePrayersLocal(def);savePrayersToCloud(def);renderPrayers();});
document.addEventListener('DOMContentLoaded',renderPrayers);

/* ── Intentions (cloud only when logged in) ── */
async function loadIntentionsFromCloud(){
  if(!SUPA||!currentUser)return;
  try{
    var r=await SUPA.from('intentions').select('*').eq('user_id',currentUser.id).order('created_at',{ascending:false});
    if(r.data)window._cloudIntentions=r.data;
  }catch(e){}
}
function getInts(){return window._cloudIntentions||[];}

function renderIntentions(){
  var list=document.getElementById('int-list'),empty=document.getElementById('int-empty');if(!list||!empty)return;
  var arr=getInts();list.innerHTML='';
  if(!arr.length){empty.classList.remove('hidden');return;}empty.classList.add('hidden');
  arr.forEach(function(item,idx){
    var div=document.createElement('div');div.className='int-item'+(item.done?' int-done':'');
    div.innerHTML='<div class="int-dot"></div><div class="int-body"><p class="int-text">'+item.text.replace(/</g,'&lt;')+'</p><p class="int-date">'+fmtDate(item.created_at)+(item.done?' \u2022 Esaudita':'')+'</p></div><div class="int-actions"><button class="int-btn int-done-btn" data-id="'+(item.id||idx)+'" title="'+(item.done?'Riapri':'Esaudita')+'">'+(item.done?'\u21b7':'\u2713')+'</button><button class="int-btn int-del-btn" data-id="'+(item.id||idx)+'" title="Elimina">\u00d7</button></div>';
    list.appendChild(div);
  });
  list.querySelectorAll('.int-done-btn').forEach(function(btn){btn.addEventListener('click',async function(){
    var id=btn.dataset.id;var arr=getInts();var idx=arr.findIndex(function(i){return(i.id||String(idx))===id;});
    if(idx>=0){arr[idx].done=!arr[idx].done;window._cloudIntentions=arr;if(SUPA&&currentUser){try{await SUPA.from('intentions').update({done:arr[idx].done}).eq('id',id).eq('user_id',currentUser.id);}catch(e){}}renderIntentions();}
  });});
  list.querySelectorAll('.int-del-btn').forEach(function(btn){btn.addEventListener('click',async function(){
    if(!confirm('Eliminare?'))return;var id=btn.dataset.id;
    window._cloudIntentions=(getInts()).filter(function(i){return(i.id||'')!==id;});
    if(SUPA&&currentUser){try{await SUPA.from('intentions').delete().eq('id',id).eq('user_id',currentUser.id);}catch(e){}}
    renderIntentions();
  });});
}

var intInput=document.getElementById('int-input'),intChars=document.getElementById('int-chars'),intAddBtn=document.getElementById('int-add-btn');
if(intInput&&intChars)intInput.addEventListener('input',function(){intChars.textContent=intInput.value.length;});
if(intAddBtn)intAddBtn.addEventListener('click',async function(){
  if(!currentUser){openAuth();return;}
  var text=(intInput?intInput.value:'').trim();if(!text)return;
  if(SUPA&&currentUser){
    try{
      var r=await SUPA.from('intentions').insert({user_id:currentUser.id,text:text.slice(0,500),done:false}).select().single();
      if(r.data){var arr=getInts();arr.unshift(r.data);window._cloudIntentions=arr;}
    }catch(e){}
  }
  intInput.value='';if(intChars)intChars.textContent='0';renderIntentions();
});
if(intInput)intInput.addEventListener('keydown',function(e){if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)&&intAddBtn)intAddBtn.click();});
document.addEventListener('DOMContentLoaded',renderIntentions);

/* ── Streak (cloud when logged in, local when not) ── */
var STREAK_KEY='amdg_streak_v2';
function getVisits(){try{return JSON.parse(localStorage.getItem(STREAK_KEY)||'[]');}catch(e){return[];}}
function saveVisitsLocal(a){localStorage.setItem(STREAK_KEY,JSON.stringify(a));}
async function loadStreakFromCloud(){
  if(!SUPA||!currentUser)return;
  try{var r=await SUPA.from('streak').select('visits').eq('user_id',currentUser.id).single();if(r.data&&r.data.visits){var merged=Array.from(new Set([...getVisits(),...r.data.visits]));saveVisitsLocal(merged);}}catch(e){}
}
async function saveStreakToCloud(a){if(!SUPA||!currentUser)return;try{await SUPA.from('streak').upsert({user_id:currentUser.id,visits:a},{onConflict:'user_id'});}catch(e){}}
function recordVisit(){var today=todayISO(),arr=getVisits();if(!arr.includes(today)){arr.push(today);saveVisitsLocal(arr);saveStreakToCloud(arr);}}
function renderStreak(){
  var bar=document.getElementById('streak-bar');if(!bar)return;
  var arr=getVisits().sort();var today=todayISO();var total=arr.length;
  var streak=0;var cur=new Date();while(true){var iso=cur.toISOString().slice(0,10);if(arr.includes(iso)){streak++;cur.setDate(cur.getDate()-1);}else break;}
  var allDays=[];if(arr.length>0){var start=new Date(arr[0]);var end=new Date(today);var d=new Date(start);while(d<=end){allDays.push(d.toISOString().slice(0,10));d.setDate(d.getDate()+1);}}else allDays=[today];
  var streakTxt=streak>=2?streak+' giorni':streak===1?'Qui oggi':'';
  bar.innerHTML='<div class="streak-wrap"><div class="streak-header"><span class="streak-label">Il tuo cammino \u2014 '+total+' '+(total===1?'giornata':'giornate')+'</span>'+(streakTxt?'<span class="streak-count">'+streakTxt+'</span>':'')+' </div><div class="streak-scroll" id="ss"><div class="streak-dots" id="sd"></div></div></div>';
  var sd=bar.querySelector('#sd');allDays.forEach(function(iso){var dot=document.createElement('div');dot.className='streak-dot';dot.title=iso;if(iso===today)dot.classList.add('today');else if(arr.includes(iso))dot.classList.add('visited');sd.appendChild(dot);});
  var sc=bar.querySelector('#ss');if(sc)setTimeout(function(){sc.scrollLeft=sc.scrollWidth;},50);
}
recordVisit();
document.addEventListener('DOMContentLoaded',renderStreak);
