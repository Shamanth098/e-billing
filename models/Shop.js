// models/Shop.js
const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema({
  SHOP_ID: { type: String, required: true, unique: true, index: true },
  SHOP_NAME: { type: String, required: true },
  PLACE: { type: String, required: true }
});

module.exports = mongoose.model('Shop', shopSchema);
