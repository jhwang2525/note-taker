const express = require('express');
const path = require('path');
const fs = require('fs/promises');
const { randomUUID } = require('crypto');

const app = express();
const PORT = process.env.PORT || 3001;
const DB_PATH = path.join(__dirname, 'db', 'db.json');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Helpers ----------
async function readNotes() {
  try {
    const data = await fs.readFile(DB_PATH, 'utf8');
    return JSON.parse(data || '[]');
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

const writeNotes = (notes) => fs.writeFile(DB_PATH, JSON.stringify(notes, null, 2));

// ---------- API ----------
app.get('/api/notes', async (req, res, next) => {
  try {
    res.json(await readNotes());
  } catch (err) {
    next(err);
  }
});

app.post('/api/notes', async (req, res, next) => {
  try {
    const title = String(req.body.title || '').trim();
    const text = String(req.body.text || '').trim();
    if (!title || !text) {
      return res.status(400).json({ message: 'A note needs a title and text.' });
    }

    const notes = await readNotes();
    const note = { id: randomUUID(), title, text, updatedAt: new Date().toISOString() };
    notes.push(note);
    await writeNotes(notes);
    res.status(201).json(note);
  } catch (err) {
    next(err);
  }
});

app.put('/api/notes/:id', async (req, res, next) => {
  try {
    const notes = await readNotes();
    const note = notes.find((n) => n.id === req.params.id);
    if (!note) return res.status(404).json({ message: 'Note not found.' });

    const title = String(req.body.title ?? note.title).trim();
    const text = String(req.body.text ?? note.text).trim();
    if (!title || !text) {
      return res.status(400).json({ message: 'A note needs a title and text.' });
    }

    Object.assign(note, { title, text, updatedAt: new Date().toISOString() });
    await writeNotes(notes);
    res.json(note);
  } catch (err) {
    next(err);
  }
});

app.delete('/api/notes/:id', async (req, res, next) => {
  try {
    const notes = await readNotes();
    const remaining = notes.filter((n) => n.id !== req.params.id);
    if (remaining.length === notes.length) {
      return res.status(404).json({ message: 'Note not found.' });
    }
    await writeNotes(remaining);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// ---------- Pages ----------
app.get('/notes', (req, res) => res.sendFile(path.join(__dirname, 'public', 'notes.html')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// ---------- Errors ----------
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Something went wrong.' });
});

app.listen(PORT, () => console.log(`Note Taker running at http://localhost:${PORT}`));
