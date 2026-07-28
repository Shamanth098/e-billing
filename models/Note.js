// models/Note.js
const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  NOTE_ID: { type: Number, required: true, unique: true, index: true },
  SHOP_ID: { type: String, required: true },
  ITEM_NAME: { type: String, required: true },
  QUANTITY: { type: String, default: null },
  NOTES: { type: String, default: null },
  STATUS: { type: String, enum: ['pending', 'ordered', 'received'], default: 'pending' },
  CREATED_AT: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Note', noteSchema);
