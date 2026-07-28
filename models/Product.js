// models/Product.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  PRODUCT_ID: { type: Number, required: true, unique: true, index: true },
  SHOP_ID: { type: String, required: true },
  NAME: { type: String, required: true },
  CATEGORY_ID: { type: Number, required: true },
  PRICE: { type: Number, required: true },
  STOCK: { type: Number, default: null }, // Nullable for optional stock tracking
  QUANTITY_UNIT: { type: String, required: true },
  IMAGE_URL: { type: String, default: null }
});

module.exports = mongoose.model('Product', productSchema);
