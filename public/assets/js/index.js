// Note Taker front end

const els = {
  title: document.querySelector('.note-title'),
  text: document.querySelector('.note-textarea'),
  save: document.querySelector('.save-note'),
  del: document.querySelector('.delete-note'),
  newNote: document.querySelector('.new-note'),
  list: document.querySelector('.note-list'),
  search: document.querySelector('#search'),
  status: document.querySelector('#status'),
};

let notes = [];
let activeId = null; // null = writing a new note

// ---------- API ----------
const api = {
  list: () => fetch('/api/notes').then((r) => r.json()),
  create: (note) => send('/api/notes', 'POST', note),
  update: (id, note) => send(`/api/notes/${id}`, 'PUT', note),
  remove: (id) => fetch(`/api/notes/${id}`, { method: 'DELETE' }),
};

async function send(url, method, body) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json()).message || 'Request failed');
  return res.json();
}

// ---------- UI ----------
function flash(message) {
  els.status.textContent = message;
  clearTimeout(flash.timer);
  flash.timer = setTimeout(() => (els.status.textContent = ''), 2500);
}

function formatDate(iso) {
  return iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
}

function updateSaveState() {
  const hasContent = els.title.value.trim() && els.text.value.trim();
  const active = notes.find((n) => n.id === activeId);
  const changed = !active || active.title !== els.title.value.trim() || active.text !== els.text.value.trim();
  els.save.disabled = !(hasContent && changed);
}

function renderList() {
  const q = els.search.value.trim().toLowerCase();
  const shown = notes
    .filter((n) => !q || n.title.toLowerCase().includes(q) || n.text.toLowerCase().includes(q))
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));

  els.list.innerHTML = '';

  if (!shown.length) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = q ? 'No notes match your search.' : 'No notes yet. Write your first one →';
    els.list.appendChild(li);
    return;
  }

  shown.forEach((note) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `note-item${note.id === activeId ? ' active' : ''}`;
    btn.innerHTML = `<span class="note-item-title"></span><span class="note-item-text"></span><span class="note-item-date">${formatDate(note.updatedAt)}</span>`;
    btn.querySelector('.note-item-title').textContent = note.title;
    btn.querySelector('.note-item-text').textContent = note.text;
    btn.addEventListener('click', () => openNote(note.id));
    li.appendChild(btn);
    els.list.appendChild(li);
  });
}

function openNote(id) {
  activeId = id;
  const note = notes.find((n) => n.id === id);
  els.title.value = note ? note.title : '';
  els.text.value = note ? note.text : '';
  els.del.hidden = !note;
  els.save.textContent = note ? 'Save changes' : 'Save note';
  updateSaveState();
  renderList();
  (note ? els.text : els.title).focus();
}

async function load() {
  try {
    notes = await api.list();
  } catch {
    flash('Could not load notes.');
  }
  renderList();
}

// ---------- Actions ----------
async function saveNote() {
  if (els.save.disabled) return;
  const payload = { title: els.title.value.trim(), text: els.text.value.trim() };
  try {
    if (activeId) {
      const updated = await api.update(activeId, payload);
      notes = notes.map((n) => (n.id === activeId ? updated : n));
    } else {
      const created = await api.create(payload);
      notes.push(created);
      activeId = created.id;
    }
    openNote(activeId);
    flash('Saved');
  } catch (err) {
    flash(err.message);
  }
}

async function deleteNote() {
  if (!activeId || !confirm('Delete this note?')) return;
  try {
    await api.remove(activeId);
    notes = notes.filter((n) => n.id !== activeId);
    openNote(null);
    flash('Note deleted');
  } catch {
    flash('Could not delete the note.');
  }
}

els.save.addEventListener('click', saveNote);
els.del.addEventListener('click', deleteNote);
els.newNote.addEventListener('click', () => openNote(null));
els.title.addEventListener('input', updateSaveState);
els.text.addEventListener('input', updateSaveState);
els.search.addEventListener('input', renderList);

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    saveNote();
  }
});

load();
