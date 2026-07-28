// models/Bill.js
const mongoose = require('mongoose');

const billSchema = new mongoose.Schema({
  BILL_ID: { type: Number, required: true, unique: true, index: true },
  SHOP_ID: { type: String, required: true },
  BILL_NUMBER: { type: String, required: true, unique: true },
  CUSTOMER_NAME: { type: String, default: null },
  CUSTOMER_PHONE: { type: String, default: null },
  BILL_DATE: { type: Date, default: Date.now },
  TOTAL_AMOUNT: { type: Number, required: true },
  DISCOUNT: { type: Number, default: 0 },
  TAX: { type: Number, default: 0 },
  GRAND_TOTAL: { type: Number, required: true },
  CREATED_BY: { type: String, required: true }
});

module.exports = mongoose.model('Bill', billSchema);
