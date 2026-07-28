// models/Category.js
const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  CATEGORY_ID: { type: Number, required: true, unique: true, index: true },
  SHOP_ID: { type: String, required: true },
  NAME: { type: String, required: true }
});

module.exports = mongoose.model('Category', categorySchema);
