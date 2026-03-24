/* AMDG notes.js — pagina appunti */
'use strict';

var html = document.documentElement;
var themeBtn = document.getElementById('theme-toggle');
html.setAttribute('data-theme', localStorage.getItem('amdg_theme')||'dark');
if(themeBtn) themeBtn.addEventListener('click', function(){
  var next=html.getAttribute('data-theme')==='dark'?'light':'dark';
  html.setAttribute('data-theme',next); localStorage.setItem('amdg_theme',next);
});

/* ── Supabase ── */
var SUPA=null, currentUser=null, allNotes=[];

function initSupabase(){
  if(typeof SUPABASE_URL==='undefined'||!SUPABASE_URL||SUPABASE_URL.length<10)return;
  if(typeof supabase==='undefined')return;
  SUPA=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
  SUPA.auth.onAuthStateChange(function(event,session){
    currentUser=session?session.user:null;
    updateAuthUI();
    if(currentUser) loadNotes();
    else showLoginPrompt();
  });
}
initSupabase();

function toEmail(u){return u.trim().toLowerCase()+'@amdg.app';}

function updateAuthUI(){
  var btn=document.getElementById('auth-btn'),lbl=document.getElementById('auth-btn-label');
  if(!btn||!lbl)return;
  if(currentUser){btn.classList.add('logged-in');lbl.textContent=(currentUser.email||'').replace('@amdg.app','');}
  else{btn.classList.remove('logged-in');lbl.textContent='Accedi';}
}

/* ── Auth Modal ── */
var authOverlay=document.getElementById('auth-overlay'),isRegister=false;
function openAuth(){if(authOverlay)authOverlay.classList.remove('hidden');}
function closeAuth(){if(authOverlay)authOverlay.classList.add('hidden');}
var authBtn=document.getElementById('auth-btn'),authClose=document.getElementById('auth-close');
if(authBtn)authBtn.addEventListener('click',function(){if(currentUser){if(confirm('Uscire?')){if(SUPA)SUPA.auth.signOut();}}else openAuth();});
if(authClose)authClose.addEventListener('click',closeAuth);
if(authOverlay)authOverlay.addEventListener('click',function(e){if(e.target===authOverlay)closeAuth();});
var authSwitch=document.getElementById('auth-switch');
if(authSwitch)authSwitch.addEventListener('click',function(){isRegister=!isRegister;var t=document.getElementById('auth-title'),s=document.getElementById('auth-submit');if(t)t.textContent=isRegister?'Crea Account':'Accedi';if(s)s.textContent=isRegister?'Crea Account':'Accedi';authSwitch.innerHTML=isRegister?'Hai gi\u00e0 un account? <strong>Accedi</strong>':'Non hai un account? <strong>Crea account</strong>';var ae=document.getElementById('auth-error');if(ae)ae.classList.add('hidden');});
var authForm=document.getElementById('auth-form');
if(authForm)authForm.addEventListener('submit',async function(e){
  e.preventDefault();
  if(!SUPA){showAuthErr('Configura Supabase in config.js');return;}
  var u=document.getElementById('auth-user'),p=document.getElementById('auth-password'),s=document.getElementById('auth-submit');
  var username=(u?u.value:'').trim(),pw=p?p.value:'',email=toEmail(username);
  s.disabled=true;s.textContent='...';
  try{
    var res;
    if(isRegister){res=await SUPA.auth.signUp({email:email,password:pw});if(res.error)throw res.error;var si=await SUPA.auth.signInWithPassword({email:email,password:pw});if(si.error){showAuthErr('Account creato! Ora accedi.');s.disabled=false;s.textContent='Crea Account';return;}}
    else{res=await SUPA.auth.signInWithPassword({email:email,password:pw});if(res.error)throw res.error;}
    closeAuth();
  }catch(err){var m=err.message||'Errore.';if(m.includes('Invalid login'))m='Nome utente o password errati.';if(m.includes('already registered'))m='Nome utente gi\u00e0 esistente.';showAuthErr(m);}
  s.disabled=false;s.textContent=isRegister?'Crea Account':'Accedi';
});
function showAuthErr(m){var ae=document.getElementById('auth-error');if(ae){ae.textContent=m;ae.classList.remove('hidden');}}

var notesLoginBtn=document.getElementById('notes-login-btn');
if(notesLoginBtn)notesLoginBtn.addEventListener('click',openAuth);

/* ── Notes CRUD ── */
async function loadNotes(){
  if(!SUPA||!currentUser)return;
  try{
    var r=await SUPA.from('notes').select('*').eq('user_id',currentUser.id).order('updated_at',{ascending:false});
    allNotes=r.data||[];
    renderSidebar();
    showEmptyState();
  }catch(e){}
}

function showLoginPrompt(){
  var lp=document.getElementById('notes-login-prompt'),sl=document.getElementById('notes-list-sidebar');
  if(lp)lp.classList.remove('hidden');if(sl)sl.innerHTML='';
  showEmptyState();
}

var currentSort='updated';

function renderSidebar(){
  var list=document.getElementById('notes-list-sidebar'),lp=document.getElementById('notes-login-prompt');
  if(!list)return;
  if(lp)lp.classList.add('hidden');
  var notes=[...allNotes];
  if(currentSort==='title') notes.sort(function(a,b){return(a.title||'').localeCompare(b.title||'');});
  else if(currentSort==='created') notes.sort(function(a,b){return new Date(b.created_at||0)-new Date(a.created_at||0);});
  else notes.sort(function(a,b){return new Date(b.updated_at||b.created_at||0)-new Date(a.updated_at||a.created_at||0);});

  list.innerHTML='';
  if(!notes.length){list.innerHTML='<p style="padding:1rem;font-size:0.85rem;color:var(--t3);font-style:italic;">Nessun appunto ancora.</p>';return;}
  notes.forEach(function(note){
    var div=document.createElement('div');div.className='note-sidebar-item';
    if(currentNoteId===note.id)div.classList.add('active');
    var preview=(note.content||'').replace(/<[^>]+>/g,' ').slice(0,60);
    div.innerHTML='<p class="note-sb-title">'+(note.title||'Senza titolo').replace(/</g,'&lt;')+'</p><p class="note-sb-preview">'+(preview||'\u2014').replace(/</g,'&lt;')+'</p>';
    div.addEventListener('click',function(){openNote(note.id);});
    list.appendChild(div);
  });
}

document.querySelectorAll('.sort-btn').forEach(function(btn){
  btn.addEventListener('click',function(){
    currentSort=btn.dataset.sort;
    document.querySelectorAll('.sort-btn').forEach(function(b){b.classList.remove('active');});
    btn.classList.add('active');
    renderSidebar();
  });
});

var currentNoteId=null;

function showEmptyState(){
  var es=document.getElementById('notes-empty-state'),ed=document.getElementById('notes-editor');
  if(es)es.classList.remove('hidden');if(ed)ed.classList.add('hidden');
  currentNoteId=null;
}

function openNote(id){
  var note=allNotes.find(function(n){return n.id===id;});if(!note)return;
  currentNoteId=id;
  var es=document.getElementById('notes-empty-state'),ed=document.getElementById('notes-editor');
  if(es)es.classList.add('hidden');if(ed)ed.classList.remove('hidden');
  var ti=document.getElementById('notes-title-input'),ce=document.getElementById('notes-content-editor');
  if(ti)ti.value=note.title||'';
  if(ce)ce.innerHTML=note.content||'';
  var meta=document.getElementById('notes-editor-meta');
  if(meta){
    var d=new Date(note.updated_at||note.created_at||'');
    meta.textContent=isNaN(d)?'':d.toLocaleDateString('it-IT',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'});
  }
  renderSidebar();
}

var newNoteBtn=document.getElementById('new-note-btn'),emptyNewBtn=document.getElementById('notes-empty-new');
function createNewNote(){
  if(!currentUser){openAuth();return;}
  var es=document.getElementById('notes-empty-state'),ed=document.getElementById('notes-editor');
  if(es)es.classList.add('hidden');if(ed)ed.classList.remove('hidden');
  currentNoteId=null;
  var ti=document.getElementById('notes-title-input'),ce=document.getElementById('notes-content-editor');
  if(ti){ti.value='';ti.focus();}if(ce)ce.innerHTML='';
  var meta=document.getElementById('notes-editor-meta');if(meta)meta.textContent='Nuovo appunto';
}
if(newNoteBtn)newNoteBtn.addEventListener('click',createNewNote);
if(emptyNewBtn)emptyNewBtn.addEventListener('click',createNewNote);

/* Toolbar */
document.querySelectorAll('.toolbar-btn').forEach(function(btn){
  btn.addEventListener('click',function(){
    var cmd=btn.dataset.cmd;
    if(cmd==='highlight'){document.execCommand('hiliteColor',false,'rgba(232,168,32,0.35)');}
    else{document.execCommand(cmd,false,null);}
    document.getElementById('notes-content-editor').focus();
  });
});

/* Save */
var saveBtn=document.getElementById('notes-save-btn'),saveStatus=document.getElementById('notes-save-status');
async function saveCurrentNote(){
  if(!currentUser){openAuth();return;}
  var ti=document.getElementById('notes-title-input'),ce=document.getElementById('notes-content-editor');
  if(!ti||!ce)return;
  var title=ti.value.trim()||'Senza titolo';
  var content=ce.innerHTML;
  var now=new Date().toISOString();
  if(saveStatus){saveStatus.textContent='Salvataggio...';} 
  try{
    if(currentNoteId){
      await SUPA.from('notes').update({title:title,content:content,updated_at:now}).eq('id',currentNoteId).eq('user_id',currentUser.id);
      var idx=allNotes.findIndex(function(n){return n.id===currentNoteId;});
      if(idx>=0){allNotes[idx].title=title;allNotes[idx].content=content;allNotes[idx].updated_at=now;}
    }else{
      var r=await SUPA.from('notes').insert({user_id:currentUser.id,title:title,content:content}).select().single();
      if(r.data){allNotes.unshift(r.data);currentNoteId=r.data.id;}
    }
    renderSidebar();
    if(saveStatus){saveStatus.textContent='Salvato \u2713';setTimeout(function(){saveStatus.textContent='';},2000);}
    var meta=document.getElementById('notes-editor-meta');if(meta){var d=new Date(now);meta.textContent=d.toLocaleDateString('it-IT',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'});}
  }catch(e){if(saveStatus)saveStatus.textContent='Errore nel salvataggio.';}
}
if(saveBtn)saveBtn.addEventListener('click',saveCurrentNote);

/* Auto-save on Ctrl+S */
document.addEventListener('keydown',function(e){if((e.ctrlKey||e.metaKey)&&e.key==='s'){e.preventDefault();saveCurrentNote();}});

/* Delete */
var deleteBtn=document.getElementById('notes-delete-btn');
if(deleteBtn)deleteBtn.addEventListener('click',async function(){
  if(!currentNoteId||!confirm('Eliminare questo appunto?'))return;
  try{
    await SUPA.from('notes').delete().eq('id',currentNoteId).eq('user_id',currentUser.id);
    allNotes=allNotes.filter(function(n){return n.id!==currentNoteId;});
    showEmptyState();renderSidebar();
  }catch(e){}
});
