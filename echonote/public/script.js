// ---------- THEME SYSTEM ----------
function setTheme(themeName) {
  document.body.className = themeName;
  localStorage.setItem('echonote_theme', themeName);
  if (themeName === 'custom') {
    const customColor = localStorage.getItem('custom_primary') || '#4f46e5';
    document.documentElement.style.setProperty('--custom-primary', customColor);
    document.querySelectorAll('.btn-primary-grad').forEach(btn => {
      btn.style.background = `linear-gradient(100deg, ${customColor}, ${customColor}dd)`;
    });
  } else {
    document.querySelectorAll('.btn-primary-grad').forEach(btn => {
      btn.style.background = '';
    });
  }
}

function applyCustomColor(color) {
  localStorage.setItem('custom_primary', color);
  if (document.body.className === 'custom') {
    document.querySelectorAll('.btn-primary-grad').forEach(btn => {
      btn.style.background = `linear-gradient(100deg, ${color}, ${color}dd)`;
    });
  }
}

// Load saved theme
const savedTheme = localStorage.getItem('echonote_theme');
if (savedTheme && ['light','dark','ocean','sunset','forest','custom'].includes(savedTheme)) {
  setTheme(savedTheme);
} else {
  setTheme('light');
}

// Theme buttons
document.querySelectorAll('.theme-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const theme = btn.getAttribute('data-theme');
    setTheme(theme);
  });
});

// Custom color picker
const customColorBtn = document.getElementById('customColorBtn');
const colorPicker = document.getElementById('customColorPicker');
customColorBtn.addEventListener('click', () => colorPicker.click());
colorPicker.addEventListener('input', (e) => {
  setTheme('custom');
  applyCustomColor(e.target.value);
});
if (localStorage.getItem('custom_primary')) {
  colorPicker.value = localStorage.getItem('custom_primary');
}

// ---------- NOTES CORE ----------
const STORAGE_KEY = 'echonote_data';
let notesArray = [];
let currentEditId = null;
let currentSearchTerm = '';

// DOM elements
const notesGrid = document.getElementById('notesGrid');
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const notesCounterSpan = document.getElementById('notesCounter');
const clearAllBtn = document.getElementById('clearAllNotesBtn');
const saveNoteBtn = document.getElementById('saveNoteBtn');
const noteModalElem = document.getElementById('noteModal');
const noteTitle = document.getElementById('noteTitle');
const noteContent = document.getElementById('noteContent');
const editNoteId = document.getElementById('editNoteId');
const modalLabel = document.getElementById('noteModalLabel');
const openAddBtn = document.getElementById('openAddBtn');
const voiceInputBtn = document.getElementById('voiceInputBtn');
const micIcon = document.getElementById('micIcon');
const voiceLangSelect = document.getElementById('voiceLanguage');
const randomBtn = document.getElementById('randomEchoBtn');
const exportBtn = document.getElementById('exportNotesBtn');
const importBtn = document.getElementById('importNotesBtn');
const importFile = document.getElementById('importFile');

let bsModal = null;
let recognition = null;
let isListening = false;
let currentLang = 'en-IN';

function escapeHtml(str) { if(!str) return ''; return str.replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[m])); }
function formatDate(ts) { if(!ts) return 'Just now'; return new Date(ts).toLocaleString(undefined, {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}); }
function showMsg(msg, type='success') { 
  const container = document.getElementById('liveToastContainer');
  const div = document.createElement('div');
  div.className = `toast align-items-center text-white bg-${type} border-0 mb-2`;
  div.setAttribute('role','alert');
  div.innerHTML = `<div class="d-flex"><div class="toast-body">${escapeHtml(msg)}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>`;
  container.appendChild(div);
  const t = new bootstrap.Toast(div, {delay:2000}); t.show();
  div.addEventListener('hidden.bs.toast',()=>div.remove());
}
function persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify(notesArray)); }
function genId() { return Date.now()+'-'+Math.random().toString(36).substring(2,8); }
function loadNotes() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if(stored) notesArray = JSON.parse(stored);
  if(!notesArray.length) notesArray = [
    {id:genId(), title:'🎤 Welcome to EchoNote', content:'You can type, use mic, or say voice commands like "New note" or "Delete last". Themes are at bottom left!', createdAt:Date.now(), updatedAt:Date.now()},
    {id:genId(), title:'✨ Theme selector', content:'Click the colorful circles at bottom left to change look. Also pick custom color!', createdAt:Date.now()-86400000, updatedAt:Date.now()-86400000}
  ];
  persist();
}
function getFiltered() {
  if(!currentSearchTerm.trim()) return [...notesArray];
  const term = currentSearchTerm.trim().toLowerCase();
  return notesArray.filter(n=> n.title.toLowerCase().includes(term) || n.content.toLowerCase().includes(term));
}
function render() {
  const filtered = getFiltered();
  notesCounterSpan.innerText = notesArray.length;
  if(filtered.length===0) {
    notesGrid.innerHTML = `<div class="col-12"><div class="empty-echo"><i class="bi bi-chat-square-quote fs-1"></i><h5 class="mt-3">No echoes</h5><button class="btn btn-primary-grad mt-2" data-bs-toggle="modal" data-bs-target="#noteModal">Create one</button></div></div>`;
    return;
  }
  let html = '';
  filtered.forEach(n => {
    const preview = n.content.length>100 ? n.content.substring(0,100)+'…' : n.content;
    html += `<div class="col-sm-6 col-md-4 col-lg-3">
      <div class="card-note p-3 h-100 d-flex flex-column">
        <h5 class="note-title mb-2">${escapeHtml(n.title)||'Untitled'}</h5>
        <div class="note-content-preview flex-grow-1 mb-2">${escapeHtml(preview)||'<em>No content</em>'}</div>
        <div class="d-flex justify-content-between align-items-center mt-2">
          <small class="text-secondary"><i class="bi bi-clock"></i> ${formatDate(n.updatedAt)}</small>
          <div>
            <button class="btn btn-sm btn-outline-secondary rounded-pill edit-note" data-id="${n.id}"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-sm btn-outline-danger rounded-pill delete-note" data-id="${n.id}"><i class="bi bi-trash"></i></button>
          </div>
        </div>
      </div>
    </div>`;
  });
  notesGrid.innerHTML = html;
  document.querySelectorAll('.edit-note').forEach(btn => btn.addEventListener('click', (e) => { e.preventDefault(); openEdit(btn.getAttribute('data-id')); }));
  document.querySelectorAll('.delete-note').forEach(btn => btn.addEventListener('click', (e) => { e.preventDefault(); deleteNote(btn.getAttribute('data-id')); }));
}
function deleteNote(id) { if(confirm('Delete?')){ notesArray = notesArray.filter(n=> n.id!==id); persist(); render(); showMsg('Deleted','danger'); if(currentEditId===id) resetModal(); } }
function clearAll() { if(confirm('Delete ALL notes?')){ notesArray=[]; persist(); render(); showMsg('All cleared','danger'); resetModal(); } }
function openEdit(id) { const n = notesArray.find(n=>n.id===id); if(n){ currentEditId=id; editNoteId.value=id; noteTitle.value=n.title; noteContent.value=n.content; modalLabel.innerHTML='<i class="bi bi-pencil-square me-2"></i>Edit Echo'; if(bsModal) bsModal.show(); } }
function resetModal() { currentEditId=null; editNoteId.value=''; noteTitle.value=''; noteContent.value=''; modalLabel.innerHTML='<i class="bi bi-pencil-square me-2"></i>New Echo'; }
function saveNote() { let title=noteTitle.value.trim(); const content=noteContent.value.trim(); if(!title){ showMsg('Title required','danger'); return; } const now=Date.now(); if(currentEditId){ const idx=notesArray.findIndex(n=>n.id===currentEditId); if(idx!==-1){ notesArray[idx].title=title; notesArray[idx].content=content; notesArray[idx].updatedAt=now; persist(); showMsg('Updated'); } } else { notesArray.unshift({id:genId(),title,content,createdAt:now,updatedAt:now}); persist(); showMsg('Saved'); } if(bsModal) bsModal.hide(); resetModal(); render(); }

// Voice typing
function initVoice() {
  if(!('webkitSpeechRecognition' in window)) { showMsg('Voice not supported','danger'); return; }
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = currentLang;
  recognition.onstart = () => { isListening=true; micIcon.className='bi bi-mic-fill text-danger'; showMsg('Listening...','secondary'); };
  recognition.onend = () => { isListening=false; micIcon.className='bi bi-mic'; };
  recognition.onresult = (e) => { let t=''; for(let i=e.resultIndex;i<e.results.length;i++) t+=e.results[i][0].transcript; if(t && noteContent) noteContent.value = noteContent.value ? noteContent.value+' '+t : t; };
  recognition.onerror = (e) => { showMsg('Voice error: '+e.error,'danger'); isListening=false; micIcon.className='bi bi-mic'; };
}
function toggleVoice() { if(!recognition) initVoice(); if(isListening) recognition.stop(); else { recognition.lang = voiceLangSelect.value; currentLang = voiceLangSelect.value; recognition.start(); } }

// Voice commands
let cmdRecognition = null;
let isCmdListening = false;
function startCmdListening() {
  if(!('webkitSpeechRecognition' in window)) return;
  cmdRecognition = new (window.SpeechRecognition||window.webkitSpeechRecognition)();
  cmdRecognition.continuous = true;
  cmdRecognition.interimResults = false;
  cmdRecognition.lang = 'en-IN';
  cmdRecognition.onstart = () => { isCmdListening=true; document.getElementById('cmdMicIcon').className='bi bi-mic-fill text-danger'; showMsg('Voice commands ON. Say: New note, Delete last, Clear all, Random note, Search for...','secondary'); };
  cmdRecognition.onend = () => { isCmdListening=false; document.getElementById('cmdMicIcon').className='bi bi-mic'; };
  cmdRecognition.onresult = (e) => {
    let cmd = e.results[e.results.length-1][0].transcript.toLowerCase();
    if(cmd.includes('new note')) { openAddBtn.click(); showMsg('Opening new note'); }
    else if(cmd.includes('delete last') && notesArray.length) { deleteNote(notesArray[0].id); }
    else if(cmd.includes('clear all')) clearAll();
    else if(cmd.includes('random note')) { if(notesArray.length) openEdit(notesArray[Math.floor(Math.random()*notesArray.length)].id); else showMsg('No notes'); }
    else if(cmd.includes('search for')) { let term = cmd.replace('search for','').trim(); searchInput.value = term; currentSearchTerm=term; render(); showMsg(`Search: ${term}`); }
  };
  cmdRecognition.start();
}
function stopCmdListening() { if(cmdRecognition) cmdRecognition.stop(); }

// Random note
function randomNote() { if(notesArray.length) openEdit(notesArray[Math.floor(Math.random()*notesArray.length)].id); else showMsg('No notes'); }
// Export/Import
function exportNotes() { const data = JSON.stringify(notesArray,null,2); const blob = new Blob([data],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='echonote_backup.json'; a.click(); URL.revokeObjectURL(a.href); showMsg('Exported'); }
function importNotes(file) { const reader = new FileReader(); reader.onload = (e) => { try{ const imported = JSON.parse(e.target.result); if(Array.isArray(imported)) { notesArray = imported; persist(); render(); showMsg('Imported!'); } else throw new Error(); } catch(err){ showMsg('Invalid file','danger'); } }; reader.readAsText(file); }

// Event binding
function bindEvents() {
  searchInput.addEventListener('input', (e) => { currentSearchTerm=e.target.value; render(); });
  clearSearchBtn.addEventListener('click', () => { searchInput.value=''; currentSearchTerm=''; render(); });
  clearAllBtn.addEventListener('click', clearAll);
  saveNoteBtn.addEventListener('click', saveNote);
  openAddBtn.addEventListener('click', resetModal);
  if(noteModalElem) noteModalElem.addEventListener('hidden.bs.modal', () => { if(isListening) recognition?.stop(); resetModal(); });
  voiceInputBtn.addEventListener('click', toggleVoice);
  voiceLangSelect.addEventListener('change', (e) => { currentLang = e.target.value; if(recognition) recognition.lang = currentLang; });
  randomBtn.addEventListener('click', randomNote);
  exportBtn.addEventListener('click', exportNotes);
  importBtn.addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', (e) => { if(e.target.files[0]) importNotes(e.target.files[0]); importFile.value=''; });
  document.getElementById('startCmdBtn').addEventListener('click', () => { if(isCmdListening) stopCmdListening(); else startCmdListening(); });
}

function init() {
  if(typeof bootstrap !== 'undefined') bsModal = new bootstrap.Modal(noteModalElem);
  loadNotes();
  initVoice();
  bindEvents();
  render();
}
init();