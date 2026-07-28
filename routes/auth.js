// routes/auth.js
// Authentication and Registration Router using Mongoose & MongoDB

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Shop = require('../models/Shop');
const User = require('../models/User');
const { getNextSequence } = require('../models/Counter');

// Helper to generate uppercase initials from a string
function getInitials(str) {
  if (!str) return 'XX';
  const cleanStr = str.trim().toUpperCase();
  const words = cleanStr.split(/\s+/);
  let initials = words.map(w => w.charAt(0)).join('');
  initials = initials.replace(/[^A-Z]/g, ''); // Keep only alphabet chars
  return initials.slice(0, 3) || 'XX';
}

// REGISTER ENDPOINT
router.post('/register', async (req, res) => {
  const { name, shopName, place, role, password, shopId } = req.body;

  if (!name || !role || !password) {
    return res.status(400).json({ error: 'Name, Role, and Password are required fields.' });
  }

  if (role !== 'shopkeeper' && role !== 'worker') {
    return res.status(400).json({ error: 'Role must be either shopkeeper or worker.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    if (role === 'shopkeeper') {
      if (!shopName || !place) {
        return res.status(400).json({ error: 'Shop Name and Place are required for Shopkeeper registration.' });
      }

      // Generate sequence numbers
      const shopNum = await getNextSequence('shop_num');
      const userNum = await getNextSequence('user_num');
      
      const generatedShopId = `SH-${getInitials(shopName)}-${shopNum}`;
      const generatedUserId = `SK-${getInitials(name)}-${userNum}`;

      // Create and save Shop
      const newShop = new Shop({
        SHOP_ID: generatedShopId,
        SHOP_NAME: shopName.trim(),
        PLACE: place.trim()
      });
      await newShop.save();

      // Create and save User
      const newUser = new User({
        USER_ID: generatedUserId,
        NAME: name.trim(),
        PASSWORD: hashedPassword,
        ROLE: 'shopkeeper',
        SHOP_ID: generatedShopId
      });
      await newUser.save();

      return res.status(201).json({
        message: 'Shop and Shopkeeper registered successfully!',
        userId: generatedUserId,
        shopId: generatedShopId,
        shopName: shopName.trim()
      });

    } else {
      // Role is Worker
      if (!shopId) {
        return res.status(400).json({ error: 'Shop ID is required for Worker registration.' });
      }

      const cleanShopId = shopId.trim().toUpperCase();
      const shopCheck = await Shop.findOne({ SHOP_ID: cleanShopId });

      if (!shopCheck) {
        return res.status(400).json({ error: 'The provided Shop ID does not exist. Please ask your shopkeeper for the correct ID.' });
      }

      // Generate sequence number for user
      const userNum = await getNextSequence('user_num');
      const generatedUserId = `WK-${getInitials(name)}-${userNum}`;

      const newUser = new User({
        USER_ID: generatedUserId,
        NAME: name.trim(),
        PASSWORD: hashedPassword,
        ROLE: 'worker',
        SHOP_ID: shopCheck.SHOP_ID
      });
      await newUser.save();

      return res.status(201).json({
        message: 'Worker registered successfully!',
        userId: generatedUserId,
        shopId: shopCheck.SHOP_ID,
        shopName: shopCheck.SHOP_NAME
      });
    }

  } catch (err) {
    console.error('Registration API error:', err);
    return res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

// LOGIN ENDPOINT
router.post('/login', async (req, res) => {
  const { userId, password } = req.body;

  if (!userId || !password) {
    return res.status(400).json({ error: 'User ID and Password are required.' });
  }

  try {
    const uppercaseUserId = userId.trim().toUpperCase();

    // Query user
    const user = await User.findOne({ USER_ID: uppercaseUserId });
    if (!user) {
      return res.status(401).json({ error: 'Invalid User ID or password.' });
    }

    // Verify Password
    const passwordMatch = await bcrypt.compare(password, user.PASSWORD);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid User ID or password.' });
    }

    // Fetch Shop info
    const shop = await Shop.findOne({ SHOP_ID: user.SHOP_ID });
    if (!shop) {
      return res.status(404).json({ error: 'Associated shop not found.' });
    }

    // Set Session values (uppercase properties matching Oracle return structure)
    req.session.user = {
      userId: user.USER_ID,
      name: user.NAME,
      role: user.ROLE,
      shopId: user.SHOP_ID,
      shopName: shop.SHOP_NAME,
      place: shop.PLACE
    };

    return res.json({
      message: 'Login successful!',
      user: {
        userId: user.USER_ID,
        name: user.NAME,
        role: user.ROLE,
        shopId: user.SHOP_ID,
        shopName: shop.SHOP_NAME,
        place: shop.PLACE
      }
    });

  } catch (err) {
    console.error('Login API error:', err);
    return res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// LOGOUT ENDPOINT
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Failed to log out.' });
    }
    res.clearCookie('connect.sid');
    return res.json({ message: 'Logout successful.' });
  });
});

// ME (CHECK CURRENT SESSION)
router.get('/me', (req, res) => {
  if (req.session && req.session.user) {
    return res.json({ user: req.session.user });
  }
  return res.status(401).json({ error: 'Not authenticated.' });
});

module.exports = router;
