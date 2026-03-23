/* AMDG app.js */
'use strict';

var DEFAULT_PRAYERS=[{"id": "mattino", "emoji": "\u2600", "tag": "Mattino", "name": "Guidami, Signore", "isDefault": true, "text": "Signore, guidami in questo nuovo giorno, perch\u00e9 io possa riconoscere e abbracciare ci\u00f2 che \u00e8 bene.\n\nAiutami a far s\u00ec che tutto il mio lavoro e lo studio siano efficaci strumenti per Te.\n\nPer intercessione di Carlo Acutis, non dimenticarti di questo tuo servo.\n\nAmen."}, {"id": "angelus", "emoji": "\ud83d\udd14", "tag": "Mezzogiorno", "name": "Angelus Domini", "isDefault": true, "text": "SPECIAL"}, {"id": "tentazione", "emoji": "\u2694", "tag": "Tentazione", "name": "Coraggio e Forza", "isDefault": true, "text": "Signore Ges\u00f9, donami coraggio e forza. Aiutami a riconoscere ci\u00f2 che \u00e8 veramente bene.\n\nFa\u2019 che la mia fede si riveli e cresca.\n\nMaria, Madre potente, intercedi per me.\n\nAmen."}, {"id": "caduta", "emoji": "\ud83d\udd4a", "tag": "Dopo la Caduta", "name": "Rialzami, Signore", "isDefault": true, "text": "Signore, tu hai visto la mia lotta e sai che non volevo cadere, eppure sono caduto.\n\nPerdonami. Rialzami ancora una volta. Non lasciare che la mia caduta diventi disperazione.\n\nInsegnami a ricominciare con pi\u00f9 umilt\u00e0 e pi\u00f9 fiducia nella Tua grazia.\n\nAmen."}, {"id": "inizio", "emoji": "\u270f", "tag": "Prima di un Impegno", "name": "Tutto a Te", "isDefault": true, "text": "Ges\u00f9, mentre inizio ci\u00f2 che mi accingi a farmi vivere, ti affido tutto me stesso.\n\nIllumina i miei pensieri, fa\u2019 che ogni mio sforzo diventi strumento per Te.\n\nAmen."}, {"id": "maria", "emoji": "\ud83c\udf39", "tag": "Mariana", "name": "Santa Maria, Madre di Dio", "isDefault": true, "text": "Santa Maria, Madre di Dio, tu che mai trascuri chi ti chiama, rendimi saldo nella fede.\n\nGuida i miei passi, rafforza la mia volont\u00e0, rendimi capace di compiere il bene.\n\nAmen."}, {"id": "sera", "emoji": "\ud83c\udf19", "tag": "Sera", "name": "Ti Adoro, Mio Dio", "isDefault": true, "text": "Ti adoro mio Dio e ti amo con tutto il cuore, ti ringrazio di avermi creato fatto cristiano e conservato in questo giorno, perdonami il male oggi commesso e se qualche bene ho compiuto accettalo custodiscimi nel riposo e liberami dai pericoli la grazia tua sia sempre con me e con tutti i miei cari.\n\nAmen."}];

var html=document.documentElement;
var themeBtn=document.getElementById('theme-toggle');
html.setAttribute('data-theme',localStorage.getItem('amdg_theme')||'dark');
themeBtn.addEventListener('click',function(){
  var next=html.getAttribute('data-theme')==='dark'?'light':'dark';
  html.setAttribute('data-theme',next);localStorage.setItem('amdg_theme',next);
});
var dateEl=document.getElementById('site-date');
if(dateEl) dateEl.textContent=new Date().toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
function todayISO(){return new Date().toISOString().slice(0,10);}
function todayFmt(){var t=new Date();return ''+t.getFullYear()+String(t.getMonth()+1).padStart(2,'0')+String(t.getDate()).padStart(2,'0');}
function fmtDateIt(iso){try{return new Date(iso).toLocaleDateString('it-IT',{day:'numeric',month:'long'});}catch(e){return '';}}
function loadGiussani(){
  var el=document.getElementById('giussani-text'),src=document.getElementById('giussani-source');
  if(!el||!src)return;
  if(typeof GIUSSANI==='undefined'||!GIUSSANI.length){el.innerHTML='<p>Caricamento...</p>';return;}
  var doy=Math.floor((Date.now()-new Date(new Date().getFullYear(),0,0).getTime())/86400000);
  var q=GIUSSANI[doy%GIUSSANI.length];
  el.innerHTML='';
  q.text.split('\n').filter(function(p){return p.trim();}).forEach(function(t){var p=document.createElement('p');p.textContent=t;el.appendChild(p);});
  src.textContent=q.source;
}
document.addEventListener('DOMContentLoaded',loadGiussani);
var SUPA=null,currentUser=null;
(function(){
  if(typeof SUPABASE_URL==='undefined'||!SUPABASE_URL||SUPABASE_URL.length<10)return;
  if(typeof supabase==='undefined')return;
  SUPA=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
  SUPA.auth.onAuthStateChange(function(_,session){
    currentUser=session?session.user:null;
    updateAuthUI();
    if(currentUser) loadAllCloudData();
  });
  SUPA.auth.getSession().then(function(r){
    currentUser=r.data&&r.data.session?r.data.session.user:null;
    updateAuthUI();
  });
})();

function updateAuthUI(){
  var btn=document.getElementById('auth-btn'),lbl=document.getElementById('auth-btn-label');
  if(!btn||!lbl)return;
  if(currentUser){btn.classList.add('logged-in');lbl.textContent=currentUser.email.split('@')[0];}
  else{btn.classList.remove('logged-in');lbl.textContent='Accedi';}
}
var authOverlay=document.getElementById('auth-overlay');
var isRegister=false;
function openAuth(){if(authOverlay)authOverlay.classList.remove('hidden');}
function closeAuth(){if(authOverlay)authOverlay.classList.add('hidden');}
var authBtn=document.getElementById('auth-btn');
var authClose=document.getElementById('auth-close');
if(authBtn) authBtn.addEventListener('click',function(){
  if(currentUser){if(confirm('Uscire dal tuo account?')){if(SUPA)SUPA.auth.signOut();}}
  else openAuth();
});
if(authClose) authClose.addEventListener('click',closeAuth);
if(authOverlay) authOverlay.addEventListener('click',function(e){if(e.target===authOverlay)closeAuth();});

var authSwitch=document.getElementById('auth-switch');
if(authSwitch) authSwitch.addEventListener('click',function(){
  isRegister=!isRegister;
  document.getElementById('auth-title').textContent=isRegister?'Crea Account':'Accedi';
  document.getElementById('auth-submit').textContent=isRegister?'Crea Account':'Accedi';
  authSwitch.innerHTML=isRegister?'Hai gi\u00e0 un account? <strong>Accedi</strong>':'Non hai un account? <strong>Registrati</strong>';
  var ae=document.getElementById('auth-error');if(ae)ae.classList.add('hidden');
});

var authForm=document.getElementById('auth-form');
if(authForm) authForm.addEventListener('submit',async function(e){
  e.preventDefault();
  if(!SUPA){showAuthErr('Configura Supabase in config.js per attivare il login.');return;}
  var email=document.getElementById('auth-email').value;
  var pw=document.getElementById('auth-password').value;
  var sub=document.getElementById('auth-submit');
  sub.disabled=true; sub.textContent='...';
  try{
    var result=isRegister
      ?await SUPA.auth.signUp({email:email,password:pw})
      :await SUPA.auth.signInWithPassword({email:email,password:pw});
    if(result.error)throw result.error;
    if(isRegister&&result.data.user&&!result.data.session){showAuthErr('Account creato! Controlla la tua email.');sub.disabled=false;sub.textContent='Crea Account';return;}
    closeAuth();
  }catch(err){showAuthErr(err.message||'Errore.');}
  sub.disabled=false;sub.textContent=isRegister?'Crea Account':'Accedi';
});

function showAuthErr(msg){var ae=document.getElementById('auth-error');if(ae){ae.textContent=msg;ae.classList.remove('hidden');}}
async function cloudGet(tbl){if(!SUPA||!currentUser)return null;try{var r=await SUPA.from(tbl).select('*').eq('user_id',currentUser.id).single();return r.data;}catch(e){return null;}}
async function cloudUpsert(tbl,data){if(!SUPA||!currentUser)return;try{await SUPA.from(tbl).upsert({...data,user_id:currentUser.id},{onConflict:'user_id'});}catch(e){}}
async function cloudGetAll(tbl,order){if(!SUPA||!currentUser)return null;try{var q=SUPA.from(tbl).select('*').eq('user_id',currentUser.id);if(order)q=q.order(order,{ascending:false});var r=await q;return r.data||[];}catch(e){return null;}}
async function loadAllCloudData(){await Promise.all([loadIntentionsCloud(),loadNotesCloud(),loadPrayersCloud(),loadStreakCloud()]);renderIntentions();renderNotes();renderPrayers();renderStreak();}
var currentRite='romano',gospelsCache=null;
var LINKS={romano:'https://www.vaticannews.va/it/vangelo-del-giorno-e-parola-del-giorno.html',ambrosiano:'https://www.laparola.it/ambrosiano/liturgia-della-parola/'};
function cleanText(raw){return(raw||'').replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ').replace(/&#(\d+);/g,function(_,n){return String.fromCharCode(parseInt(n,10));}).replace(/Copyright[^\n]*/gi,'').replace(/Per ricevere il Vangelo[^\n]*/gi,'').replace(/vangelodelgiorno\.org[^\n]*/gi,'').split('\n').map(function(l){return l.trim();}).filter(function(l){return l.length>0;}).join('\n');}
function fillEl(el,text){el.innerHTML='';cleanText(text).split('\n').filter(function(p){return p.trim();}).forEach(function(t){var p=document.createElement('p');p.textContent=t;el.appendChild(p);});}

var gLoad=document.getElementById('gospel-loading'),gContent=document.getElementById('gospel-content'),gError=document.getElementById('gospel-error');
var gRef=document.getElementById('gospel-reference'),gText=document.getElementById('gospel-text'),gLink=document.getElementById('gospel-source-link');
var errLinks=document.getElementById('error-links'),retryBtn=document.getElementById('retry-btn');
var cSection=document.getElementById('comment-section'),cTitle=document.getElementById('comment-title'),cText=document.getElementById('comment-text'),cAuth=document.getElementById('comment-author');

function showLoading(){gLoad.classList.remove('hidden');gContent.classList.add('hidden');gError.classList.add('hidden');}
function showContent(data,rite){
  gLoad.classList.add('hidden');gError.classList.add('hidden');
  gRef.textContent=cleanText(data.reference)||'Vangelo del Giorno';
  fillEl(gText,data.text);gLink.href=LINKS[rite];
  var ct=cleanText(data.commentText||'');
  if(ct.length>30){cTitle.textContent=cleanText(data.commentTitle)||'Commento';cAuth.textContent=cleanText(data.commentAuthor)?'\u2014 '+cleanText(data.commentAuthor):'';fillEl(cText,data.commentText);cSection.classList.remove('hidden');}
  else cSection.classList.add('hidden');
  gContent.classList.remove('hidden');
  loadGospelNote();
}
function showError(rite){
  gLoad.classList.add('hidden');gContent.classList.add('hidden');errLinks.innerHTML='';
  var links=rite==='romano'?[{t:'Vatican News',u:LINKS.romano},{t:'Evangelizo',u:'https://www.evangelizo.org/v2/it'}]:[{t:'La Parola Ambrosiano',u:LINKS.ambrosiano}];
  links.forEach(function(l){var a=document.createElement('a');a.href=l.u;a.textContent=l.t;a.target='_blank';a.rel='noopener noreferrer';errLinks.appendChild(a);});
  gError.classList.remove('hidden');
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
function gospelNoteKey(){return 'gnote_'+todayISO()+'_'+currentRite;}
function loadGospelNote(){var ta=document.getElementById('gospel-note');if(!ta)return;ta.value=localStorage.getItem(gospelNoteKey())||'';}
var saveGNoteBtn=document.getElementById('save-gospel-note'),gNoteStatus=document.getElementById('note-save-status');
if(saveGNoteBtn)saveGNoteBtn.addEventListener('click',async function(){
  var ta=document.getElementById('gospel-note');if(!ta)return;
  localStorage.setItem(gospelNoteKey(),ta.value);
  if(SUPA&&currentUser){try{await SUPA.from('gospel_notes').upsert({user_id:currentUser.id,date:todayISO(),rite:currentRite,note:ta.value},{onConflict:'user_id,date,rite'});}catch(e){}}
  if(gNoteStatus){gNoteStatus.textContent='Salvata';setTimeout(function(){gNoteStatus.textContent='';},2000);}
});
var PRAYER_KEY='amdg_prayers_v3';
function getPrayers(){try{var s=localStorage.getItem(PRAYER_KEY);if(s){var a=JSON.parse(s);if(a&&a.length>0)return a;}}catch(e){}return JSON.parse(JSON.stringify(DEFAULT_PRAYERS));}
function savePrayers(a){localStorage.setItem(PRAYER_KEY,JSON.stringify(a));}
async function loadPrayersCloud(){if(!SUPA||!currentUser)return;try{var r=await SUPA.from('settings').select('prayers').eq('user_id',currentUser.id).single();if(r.data&&r.data.prayers)localStorage.setItem(PRAYER_KEY,JSON.stringify(r.data.prayers));}catch(e){}}
async function savePrayersCloud(a){if(!SUPA||!currentUser)return;try{await SUPA.from('settings').upsert({user_id:currentUser.id,prayers:a},{onConflict:'user_id'});}catch(e){}}

function makeAngelusIT(){return '<div class="angelus-col"><span class="lang-badge">Italiano</span><div class="angelus-verses"><p><span class="verse-v">V.</span> L\u2019Angelo del Signore port\u00f2 l\u2019annunzio a Maria</p><p><span class="verse-r">R.</span> Ed ella concep\u00ec per opera dello Spirito Santo.</p><p class="verse-italic">Ave Maria\u2026</p><p><span class="verse-v">V.</span> Eccomi, sono la serva del Signore.</p><p><span class="verse-r">R.</span> Si compia in me la tua parola.</p><p class="verse-italic">Ave Maria\u2026</p><p><span class="verse-v">V.</span> E il Verbo si fece carne.</p><p><span class="verse-r">R.</span> E venne ad abitare in mezzo a noi.</p><p class="verse-italic">Ave Maria\u2026</p><p><span class="verse-v">V.</span> Prega per noi, santa Madre di Dio.</p><p><span class="verse-r">R.</span> Perch\u00e9 siamo resi degni delle promesse di Cristo.</p><p class="verse-prayer">Preghiamo. Infondi nel nostro spirito la Tua grazia, o Padre; Tu, che nell\u2019annunzio dell\u2019angelo ci hai rivelato l\u2019incarnazione del Tuo Figlio, per la Sua passione e la Sua croce guidaci alla gloria della risurrezione. Per Cristo nostro Signore.</p><p class="amen">Amen.</p></div></div>';}
function makeAngelusDE(){return '<div class="angelus-col"><span class="lang-badge lang-badge--de">Deutsch</span><div class="angelus-verses"><p><span class="verse-v">V.</span> Der Engel des Herrn brachte Maria die Botschaft, und sie empfing vom Heiligen Geist.</p><p><span class="verse-r">R.</span> Gegr\u00fc\u00dfet seist du, Maria\u2026</p><p><span class="verse-v">V.</span> Maria sprach: Siehe, ich bin eine Magd des Herrn, mir geschehe nach Deinem Wort.</p><p><span class="verse-r">R.</span> Gegr\u00fc\u00dfet seist du, Maria\u2026</p><p><span class="verse-v">V.</span> Und das Wort ist Fleisch geworden und hat unter uns gewohnt.</p><p><span class="verse-r">R.</span> Gegr\u00fc\u00dfet seist du, Maria\u2026</p><p><span class="verse-v">V.</span> Bitte f\u00fcr uns, o heilige Gottsgeb\u00e4rerin,</p><p><span class="verse-r">R.</span> auf dass wir w\u00fcrdig werden der Verhe\u00dfungen Christi.</p><p class="verse-prayer">Lasset uns beten: Allm\u00e4chtiger Gott, gie\u00dfe deine Gnade in unsere Herzen ein. Durch die Botschaft des Engels haben wir die Menschwerdung Christi, deines Sohnes, erkannt. Lass uns durch sein Leiden und Kreuz zur Herrlichkeit der Auferstehung gelangen. Darum bitten wir durch Christus, unseren Herrn.</p><p class="amen">Amen.</p></div></div>';}

function makePrayerBody(p){
  if(p.id==='angelus')return '<div class="angelus-grid">'+makeAngelusIT()+'<div class="angelus-divider" aria-hidden="true"></div>'+makeAngelusDE()+'</div>';
  var html='';
  p.text.split('\n').filter(function(l){return l.trim();}).forEach(function(line){
    if(line.trim()==='Amen.'||line.trim()==='Amen')html+='<p class="amen">Amen.</p>';
    else html+='<p>'+line.replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</p>';
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
    toggle.addEventListener('click',function(){
      var isOpen=toggle.getAttribute('aria-expanded')==='true';
      list.querySelectorAll('.prayer-item').forEach(function(i){if(i!==item){i.classList.remove('open');var t=i.querySelector('.prayer-toggle'),b=i.querySelector('.prayer-body');if(t)t.setAttribute('aria-expanded','false');if(b)b.classList.add('hidden');}});
      toggle.setAttribute('aria-expanded',isOpen?'false':'true');body.classList.toggle('hidden',isOpen);item.classList.toggle('open',!isOpen);
    });
    item.querySelector('.prayer-edit-btn').addEventListener('click',function(){openPE(idx);});
  });
}

var peOverlay=document.getElementById('prayer-editor-overlay'),peEditIdx=-1;
function openPE(idx){
  peEditIdx=idx;var prayers=getPrayers();var p=idx>=0&&idx<prayers.length?prayers[idx]:null;
  document.getElementById('pe-title').textContent=p?'Modifica Preghiera':'Nuova Preghiera';
  document.getElementById('pe-emoji').value=p?p.emoji:'\u2728';
  document.getElementById('pe-tag').value=p?p.tag:'';
  document.getElementById('pe-name').value=p?p.name:'';
  document.getElementById('pe-text').value=p?(p.id==='angelus'?'(Angelus - testo fisso)':p.text):'';
  var del=document.getElementById('pe-delete');if(del)del.classList.toggle('hidden',!(p&&!p.isDefault));
  if(peOverlay)peOverlay.classList.remove('hidden');
}
function closePE(){if(peOverlay)peOverlay.classList.add('hidden');peEditIdx=-1;}
var peClose=document.getElementById('pe-close'),peCancel=document.getElementById('pe-cancel');
if(peClose)peClose.addEventListener('click',closePE);
if(peCancel)peCancel.addEventListener('click',closePE);
if(peOverlay)peOverlay.addEventListener('click',function(e){if(e.target===peOverlay)closePE();});
var peForm=document.getElementById('pe-form');
if(peForm)peForm.addEventListener('submit',function(e){
  e.preventDefault();
  var prayers=getPrayers();
  var nd={emoji:document.getElementById('pe-emoji').value||'\u2728',tag:document.getElementById('pe-tag').value,name:document.getElementById('pe-name').value,text:document.getElementById('pe-text').value};
  if(peEditIdx>=0&&peEditIdx<prayers.length)Object.assign(prayers[peEditIdx],nd);
  else prayers.push({id:'c'+Date.now(),...nd,isDefault:false});
  savePrayers(prayers);savePrayersCloud(prayers);renderPrayers();closePE();
});
var peDel=document.getElementById('pe-delete');
if(peDel)peDel.addEventListener('click',function(){
  if(!confirm('Eliminare?'))return;
  var prayers=getPrayers();if(peEditIdx>=0)prayers.splice(peEditIdx,1);
  savePrayers(prayers);savePrayersCloud(prayers);renderPrayers();closePE();
});
var addPBtn=document.getElementById('add-prayer-btn');if(addPBtn)addPBtn.addEventListener('click',function(){openPE(-1);});
var resetPBtn=document.getElementById('reset-prayers-btn');
if(resetPBtn)resetPBtn.addEventListener('click',function(){
  if(!confirm('Ripristinare le preghiere predefinite?'))return;
  var def=JSON.parse(JSON.stringify(DEFAULT_PRAYERS));savePrayers(def);savePrayersCloud(def);renderPrayers();
});
document.addEventListener('DOMContentLoaded',renderPrayers);
var INT_KEY='amdg_int_v2';
function getInts(){try{return JSON.parse(localStorage.getItem(INT_KEY)||'[]');}catch(e){return[];}}
function saveIntsLocal(a){localStorage.setItem(INT_KEY,JSON.stringify(a));}
async function loadIntentionsCloud(){if(!SUPA||!currentUser)return;try{var r=await cloudGetAll('intentions','created_at');if(r&&r.length>0)localStorage.setItem(INT_KEY,JSON.stringify(r));}catch(e){}}
function renderIntentions(){
  var list=document.getElementById('int-list'),empty=document.getElementById('int-empty');if(!list||!empty)return;
  var arr=getInts();list.innerHTML='';
  if(!arr.length){empty.classList.remove('hidden');return;}empty.classList.add('hidden');
  arr.forEach(function(item,idx){
    var div=document.createElement('div');div.className='int-item'+(item.done?' int-done':'');
    div.innerHTML='<div class="int-dot"></div><div class="int-body"><p class="int-text">'+item.text.replace(/</g,'&lt;')+'</p><p class="int-date">'+fmtDateIt(item.date||item.created_at)+(item.done?' \u2022 Esaudita':'')+'</p></div><div class="int-actions"><button class="int-btn int-done-btn" data-idx="'+idx+'" title="'+(item.done?'Riapri':'Esaudita')+'">'+(item.done?'\u21b7':'\u2713')+'</button><button class="int-btn int-del-btn" data-idx="'+idx+'" title="Elimina">\u00d7</button></div>';
    list.appendChild(div);
  });
  list.querySelectorAll('.int-done-btn').forEach(function(btn){btn.addEventListener('click',async function(){var idx=parseInt(btn.dataset.idx,10);var arr=getInts();arr[idx].done=!arr[idx].done;saveIntsLocal(arr);if(SUPA&&currentUser&&arr[idx].id){try{await SUPA.from('intentions').update({done:arr[idx].done}).eq('id',arr[idx].id).eq('user_id',currentUser.id);}catch(e){}}renderIntentions();});});
  list.querySelectorAll('.int-del-btn').forEach(function(btn){btn.addEventListener('click',async function(){if(!confirm('Eliminare?'))return;var idx=parseInt(btn.dataset.idx,10);var arr=getInts();var item=arr[idx];arr.splice(idx,1);saveIntsLocal(arr);if(SUPA&&currentUser&&item.id){try{await SUPA.from('intentions').delete().eq('id',item.id).eq('user_id',currentUser.id);}catch(e){}}renderIntentions();});});
}
var intInput=document.getElementById('int-input'),intChars=document.getElementById('int-chars'),intAddBtn=document.getElementById('int-add-btn');
if(intInput&&intChars)intInput.addEventListener('input',function(){intChars.textContent=intInput.value.length;});
if(intAddBtn)intAddBtn.addEventListener('click',async function(){
  var text=(intInput?intInput.value:'').trim();if(!text)return;
  var newItem={text:text.slice(0,500),date:new Date().toISOString(),done:false};
  if(SUPA&&currentUser){try{var r=await SUPA.from('intentions').insert({user_id:currentUser.id,text:newItem.text,done:false}).select().single();if(r.data)newItem={...r.data};}catch(e){}}
  var arr=getInts();arr.unshift(newItem);saveIntsLocal(arr);intInput.value='';if(intChars)intChars.textContent='0';renderIntentions();
});
if(intInput)intInput.addEventListener('keydown',function(e){if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)&&intAddBtn)intAddBtn.click();});
document.addEventListener('DOMContentLoaded',renderIntentions);
var NOTES_KEY='amdg_notes_v1';
function getNotes(){try{return JSON.parse(localStorage.getItem(NOTES_KEY)||'[]');}catch(e){return[];}}
function saveNotesLocal(a){localStorage.setItem(NOTES_KEY,JSON.stringify(a));}
async function loadNotesCloud(){if(!SUPA||!currentUser)return;try{var r=await cloudGetAll('notes','updated_at');if(r&&r.length>0)saveNotesLocal(r);}catch(e){}}
var editingNoteIdx=-1;
function renderNotes(){
  var nl=document.getElementById('notes-list'),ne=document.getElementById('notes-empty');if(!nl)return;
  var notes=getNotes();nl.innerHTML='';
  if(!notes.length){if(ne)ne.classList.remove('hidden');}else{if(ne)ne.classList.add('hidden');}
  notes.forEach(function(note,idx){
    var div=document.createElement('div');div.className='note-list-item';
    var prev=(note.content||'').slice(0,55).replace(/\n/g,' ');
    div.innerHTML='<div class="note-list-dot"></div><div class="note-list-body"><p class="note-list-title">'+(note.title||'Senza titolo').replace(/</g,'&lt;')+'</p><p class="note-list-preview">'+(prev||'\u2014').replace(/</g,'&lt;')+'</p></div><span class="note-list-date">'+fmtDateIt(note.updated_at||note.date)+'</span>';
    div.addEventListener('click',function(){openNoteEditor(idx);});
    nl.appendChild(div);
  });
}
function openNoteEditor(idx){
  editingNoteIdx=idx;var notes=getNotes();var note=idx>=0&&idx<notes.length?notes[idx]:null;
  var te=document.getElementById('note-title-input'),ce=document.getElementById('note-content-input'),editor=document.getElementById('note-editor'),del=document.getElementById('delete-note-btn');
  if(!te||!ce||!editor)return;
  te.value=note?note.title||'':'';ce.value=note?note.content||'':'';
  if(del)del.classList.toggle('hidden',!note);
  editor.classList.remove('hidden');te.focus();
}
var addNoteBtn=document.getElementById('add-note-btn');if(addNoteBtn)addNoteBtn.addEventListener('click',function(){openNoteEditor(-1);});
var cancelNoteBtn=document.getElementById('cancel-note-btn');if(cancelNoteBtn)cancelNoteBtn.addEventListener('click',function(){var ed=document.getElementById('note-editor');if(ed)ed.classList.add('hidden');editingNoteIdx=-1;});
var saveNoteBtn=document.getElementById('save-note-btn');
if(saveNoteBtn)saveNoteBtn.addEventListener('click',async function(){
  var te=document.getElementById('note-title-input'),ce=document.getElementById('note-content-input'),st=document.getElementById('note-editor-status');
  if(!te||!ce)return;
  var title=te.value.trim()||'Senza titolo',content=ce.value,now=new Date().toISOString();
  var notes=getNotes();
  if(editingNoteIdx>=0&&editingNoteIdx<notes.length){
    notes[editingNoteIdx].title=title;notes[editingNoteIdx].content=content;notes[editingNoteIdx].updated_at=now;
    if(SUPA&&currentUser&&notes[editingNoteIdx].id){try{await SUPA.from('notes').update({title:title,content:content,updated_at:now}).eq('id',notes[editingNoteIdx].id).eq('user_id',currentUser.id);}catch(e){}}
  }else{
    var nn={title:title,content:content,date:now,updated_at:now};
    if(SUPA&&currentUser){try{var r=await SUPA.from('notes').insert({user_id:currentUser.id,title:title,content:content}).select().single();if(r.data)nn={...r.data};}catch(e){}}
    notes.unshift(nn);
  }
  saveNotesLocal(notes);renderNotes();
  if(st){st.textContent='Salvato';setTimeout(function(){st.textContent='';},2000);}
});
var delNoteBtn=document.getElementById('delete-note-btn');
if(delNoteBtn)delNoteBtn.addEventListener('click',async function(){
  if(!confirm('Eliminare questo appunto?'))return;
  var notes=getNotes();if(editingNoteIdx>=0&&editingNoteIdx<notes.length){
    var note=notes[editingNoteIdx];
    if(SUPA&&currentUser&&note.id){try{await SUPA.from('notes').delete().eq('id',note.id).eq('user_id',currentUser.id);}catch(e){}}
    notes.splice(editingNoteIdx,1);saveNotesLocal(notes);
  }
  var ed=document.getElementById('note-editor');if(ed)ed.classList.add('hidden');editingNoteIdx=-1;renderNotes();
});
document.addEventListener('DOMContentLoaded',renderNotes);
var STREAK_KEY='amdg_streak_v2';
function getVisits(){try{return JSON.parse(localStorage.getItem(STREAK_KEY)||'[]');}catch(e){return[];}}
function saveVisits(a){localStorage.setItem(STREAK_KEY,JSON.stringify(a));}
async function loadStreakCloud(){if(!SUPA||!currentUser)return;try{var r=await SUPA.from('streak').select('visits').eq('user_id',currentUser.id).single();if(r.data&&r.data.visits)saveVisits(r.data.visits);}catch(e){}}
async function saveStreakCloud(a){if(!SUPA||!currentUser)return;try{await SUPA.from('streak').upsert({user_id:currentUser.id,visits:a},{onConflict:'user_id'});}catch(e){}}
function recordVisit(){var today=todayISO(),arr=getVisits();if(!arr.includes(today)){arr.push(today);saveVisits(arr);saveStreakCloud(arr);}}
function renderStreak(){
  var bar=document.getElementById('streak-bar');if(!bar)return;
  var arr=getVisits().sort();var today=todayISO();var total=arr.length;
  var streak=0;var cur=new Date();
  while(true){var iso=cur.toISOString().slice(0,10);if(arr.includes(iso)){streak++;cur.setDate(cur.getDate()-1);}else break;}
  var allDays=[];
  if(arr.length>0){var start=new Date(arr[0]);var end=new Date(today);var d=new Date(start);while(d<=end){allDays.push(d.toISOString().slice(0,10));d.setDate(d.getDate()+1);}}else allDays=[today];
  var streakTxt=streak>=2?streak+' giorni':streak===1?'Qui oggi':'';
  bar.innerHTML='<div class="streak-wrap"><div class="streak-header"><span class="streak-label">Il tuo cammino \u2014 '+total+' '+(total===1?'giornata':'giornate')+'</span>'+(streakTxt?'<span class="streak-count">'+streakTxt+'</span>':'')+' </div><div class="streak-scroll" id="ss"><div class="streak-dots" id="sd"></div></div></div>';
  var sd=bar.querySelector('#sd');
  allDays.forEach(function(iso){var dot=document.createElement('div');dot.className='streak-dot';dot.title=iso;if(iso===today)dot.classList.add('today');else if(arr.includes(iso))dot.classList.add('visited');sd.appendChild(dot);});
  var sc=bar.querySelector('#ss');if(sc)setTimeout(function(){sc.scrollLeft=sc.scrollWidth;},50);
}
recordVisit();
document.addEventListener('DOMContentLoaded',renderStreak);
