// server.js
// Main entry point for the Ebilling Node.js Backend

const express = require('express');
const session = require('express-session');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const db = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable trust proxy for cloud deployment platforms (Render, Railway, Heroku, etc.)
app.set('trust proxy', 1);

// Logging & CORS middleware
app.use(morgan('dev'));
app.use(cors({
  origin: true,
  credentials: true
}));

// Body parsing middleware (increased size limit to support base64 image uploads)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Session management setup
app.use(session({
  secret: process.env.SESSION_SECRET || 'ebilling_default_session_secret_7721',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: false, // Set to true if running over HTTPS
    httpOnly: true
  }
}));

// API Routes registration
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/bills', require('./routes/bills'));
app.use('/api/notes', require('./routes/notes'));

// Serve static frontend files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// SPA Fallback: route root to index.html (express.static also handles this)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize database pool and start server
async function startServer() {
  try {
    console.log('Connecting to database...');
    await db.init();
    
    // Quick self-test to verify read/write connectivity and query list of collections
    const mongoose = require('mongoose');
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collNames = collections.map(c => c.name).join(', ') || 'None (New Database)';
    
    app.listen(PORT, () => {
      console.log(`===========================================================`);
      console.log(`Ebilling App Server successfully running on port: ${PORT}`);
      console.log(`Local Access URL: http://localhost:${PORT}`);
      console.log(`DATABASE STATUS:  ✅ Connected & fully functional!`);
      console.log(`Collections List: [${collNames}]`);
      console.log(`===========================================================`);
    });
  } catch (err) {
    console.error('❌ Failed to start server due to Database connection failure:', err.message);
    process.exit(1);
  }
}

startServer();
