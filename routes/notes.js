// routes/notes.js
// Notes and Order Checklist Router using Mongoose & MongoDB

const express = require('express');
const router = express.Router();
const Note = require('../models/Note');
const { getNextSequence } = require('../models/Counter');

// Middleware to check authentication
function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }
}

// GET ALL NOTES FOR THE SHOP
router.get('/', requireAuth, async (req, res) => {
  const { shopId } = req.session.user;
  try {
    const result = await Note.find({ SHOP_ID: shopId }).sort({ CREATED_AT: -1 }).lean();
    return res.json(result);
  } catch (err) {
    console.error('Error fetching notes:', err);
    return res.status(500).json({ error: 'Failed to fetch notes.' });
  }
});

// CREATE A NOTE
router.post('/', requireAuth, async (req, res) => {
  const { shopId } = req.session.user;
  const { itemName, quantity, notes } = req.body;

  if (!itemName || !itemName.trim()) {
    return res.status(400).json({ error: 'Item name is required for adding a note.' });
  }

  try {
    // Get sequence ID
    const noteId = await getNextSequence('note_id');

    // Create and save note
    const newNote = new Note({
      NOTE_ID: noteId,
      SHOP_ID: shopId,
      ITEM_NAME: itemName.trim(),
      QUANTITY: quantity ? quantity.trim() : null,
      NOTES: notes ? notes.trim() : null,
      STATUS: 'pending'
    });
    await newNote.save();

    return res.status(201).json({
      note_id: noteId,
      item_name: itemName.trim(),
      quantity: quantity || null,
      notes: notes || null,
      status: 'pending'
    });
  } catch (err) {
    console.error('Error creating note:', err);
    return res.status(500).json({ error: 'Failed to create note.' });
  }
});

// UPDATE A NOTE
router.put('/:id', requireAuth, async (req, res) => {
  const { shopId } = req.session.user;
  const noteId = parseInt(req.params.id);
  const { itemName, quantity, notes, status } = req.body;

  if (isNaN(noteId)) {
    return res.status(400).json({ error: 'Invalid note ID.' });
  }

  if (!itemName || !itemName.trim() || !status) {
    return res.status(400).json({ error: 'Item name and status are required for updating a note.' });
  }

  const validStatuses = ['pending', 'ordered', 'received'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid note status. Must be pending, ordered, or received.' });
  }

  try {
    const note = await Note.findOne({ NOTE_ID: noteId, SHOP_ID: shopId });
    if (!note) {
      return res.status(404).json({ error: 'Note not found in your shop.' });
    }

    // Update note
    note.ITEM_NAME = itemName.trim();
    note.QUANTITY = quantity ? quantity.trim() : null;
    note.NOTES = notes ? notes.trim() : null;
    note.STATUS = status;
    await note.save();

    return res.json({ message: 'Note updated successfully.' });
  } catch (err) {
    console.error('Error updating note:', err);
    return res.status(500).json({ error: 'Failed to update note.' });
  }
});

// DELETE A NOTE
router.delete('/:id', requireAuth, async (req, res) => {
  const { shopId } = req.session.user;
  const noteId = parseInt(req.params.id);

  if (isNaN(noteId)) {
    return res.status(400).json({ error: 'Invalid note ID.' });
  }

  try {
    const note = await Note.findOne({ NOTE_ID: noteId, SHOP_ID: shopId });
    if (!note) {
      return res.status(404).json({ error: 'Note not found in your shop.' });
    }

    await Note.deleteOne({ NOTE_ID: noteId, SHOP_ID: shopId });
    return res.json({ message: 'Note deleted successfully.' });
  } catch (err) {
    console.error('Error deleting note:', err);
    return res.status(500).json({ error: 'Failed to delete note.' });
  }
});

module.exports = router;
