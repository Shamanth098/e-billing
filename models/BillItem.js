// models/BillItem.js
const mongoose = require('mongoose');

const billItemSchema = new mongoose.Schema({
  BILL_ITEM_ID: { type: Number, required: true, unique: true, index: true },
  BILL_ID: { type: Number, required: true, index: true },
  PRODUCT_ID: { type: Number, required: true },
  PRODUCT_NAME: { type: String, required: true },
  QUANTITY: { type: Number, required: true },
  PRICE: { type: Number, required: true },
  SUBTOTAL: { type: Number, required: true }
});

module.exports = mongoose.model('BillItem', billItemSchema);
