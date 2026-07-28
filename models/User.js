// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  USER_ID: { type: String, required: true, unique: true, index: true },
  NAME: { type: String, required: true },
  PASSWORD: { type: String, required: true },
  ROLE: { type: String, required: true, enum: ['shopkeeper', 'worker'] },
  SHOP_ID: { type: String, required: true }
});

module.exports = mongoose.model('User', userSchema);
