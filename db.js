// db.js
// MongoDB Database Connection Wrapper using Mongoose

const mongoose = require('mongoose');
require('dotenv').config();

let isConnected = false;

async function init() {
  if (isConnected) {
    return;
  }
  
  // Use environment URI, or fallback to local MongoDB
  let uri = process.env.MONGODB_URI;
  
  if (!uri || uri.includes('<db_password>')) {
    console.log('No valid MONGODB_URI found (or password placeholder present). Falling back to local MongoDB...');
    uri = 'mongodb://127.0.0.1:27017/e-billing';
  } else {
    // Auto-detect and URL-encode special characters (like '@') in password to prevent connection string parsing errors
    const schemeSplit = uri.split('://');
    if (schemeSplit.length === 2) {
      const scheme = schemeSplit[0];
      const remaining = schemeSplit[1];
      
      const lastAt = remaining.lastIndexOf('@');
      if (lastAt !== -1) {
        const credentials = remaining.substring(0, lastAt);
        const hostAndQuery = remaining.substring(lastAt);
        
        const colonIndex = credentials.indexOf(':');
        if (colonIndex !== -1) {
          const username = credentials.substring(0, colonIndex);
          const password = credentials.substring(colonIndex + 1);
          
          if (password.includes('@') || password.includes(':') || password.includes('/') || password.includes('+')) {
            const encodedPassword = encodeURIComponent(password);
            uri = `${scheme}://${username}:${encodedPassword}${hostAndQuery}`;
          }
        }
      }
    }
  }

  try {
    await mongoose.connect(uri);
    isConnected = true;
    console.log('MongoDB successfully connected using Mongoose.');
  } catch (err) {
    console.error('Error connecting to MongoDB database:', err);
    throw err;
  }
}

module.exports = {
  init
};
