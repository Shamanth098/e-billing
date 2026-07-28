// routes/products.js
// Products and Categories Router using Mongoose & MongoDB

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const Category = require('../models/Category');
const Product = require('../models/Product');
const { getNextSequence } = require('../models/Counter');

// Helper to save Base64 Image string to public/uploads directory
function saveBase64Image(base64Str) {
  if (!base64Str || !base64Str.startsWith('data:image')) {
    return null;
  }
  try {
    const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return null;
    }
    const ext = matches[1].split('/')[1] || 'png';
    const buffer = Buffer.from(matches[2], 'base64');
    const filename = `img_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
    
    const uploadDir = path.join(__dirname, '../public/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    fs.writeFileSync(path.join(uploadDir, filename), buffer);
    return `/uploads/${filename}`;
  } catch (err) {
    console.error('Error saving image:', err);
    return null;
  }
}

// Middleware to check authentication
function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }
}

// GET ALL CATEGORIES
router.get('/categories', requireAuth, async (req, res) => {
  const { shopId } = req.session.user;
  try {
    const result = await Category.find({ SHOP_ID: shopId }).sort({ NAME: 1 }).lean();
    return res.json(result);
  } catch (err) {
    console.error('Error fetching categories:', err);
    return res.status(500).json({ error: 'Failed to fetch categories.' });
  }
});

// CREATE A CATEGORY
router.post('/categories', requireAuth, async (req, res) => {
  const { shopId } = req.session.user;
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Category name is required.' });
  }

  const categoryName = name.trim();

  try {
    // Check if category already exists in this shop
    const duplicate = await Category.findOne({
      SHOP_ID: shopId,
      NAME: { $regex: new RegExp('^' + categoryName + '$', 'i') }
    });

    if (duplicate) {
      return res.status(400).json({ error: 'A category with this name already exists in your shop.' });
    }

    // Get sequence ID
    const categoryId = await getNextSequence('category_id');

    // Create and save new category
    const newCategory = new Category({
      CATEGORY_ID: categoryId,
      SHOP_ID: shopId,
      NAME: categoryName
    });
    await newCategory.save();

    return res.status(201).json({ category_id: categoryId, name: categoryName });
  } catch (err) {
    console.error('Error creating category:', err);
    return res.status(500).json({ error: 'Failed to create category.' });
  }
});

// GET ALL PRODUCTS
router.get('/', requireAuth, async (req, res) => {
  const { shopId } = req.session.user;
  try {
    const products = await Product.find({ SHOP_ID: shopId }).lean();
    const categories = await Category.find({ SHOP_ID: shopId }).lean();

    // Map Category IDs to Category Names to mimic SQL JOIN
    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat.CATEGORY_ID] = cat.NAME;
    });

    const responseData = products.map(p => ({
      ...p,
      CATEGORY_NAME: categoryMap[p.CATEGORY_ID] || 'Unknown'
    })).sort((a, b) => a.NAME.localeCompare(b.NAME));

    return res.json(responseData);
  } catch (err) {
    console.error('Error fetching products:', err);
    return res.status(500).json({ error: 'Failed to fetch products.' });
  }
});

// CREATE A NEW PRODUCT
router.post('/', requireAuth, async (req, res) => {
  const { shopId } = req.session.user;
  const { name, categoryId, price, stock, quantityUnit, image } = req.body;

  if (!name || !categoryId || price === undefined || !quantityUnit) {
    return res.status(400).json({ error: 'Product name, category, price, and quantity unit are required.' });
  }

  const prodPrice = parseFloat(price);
  if (isNaN(prodPrice) || prodPrice < 0) {
    return res.status(400).json({ error: 'Price must be a valid positive number.' });
  }

  // Stock is optional
  let prodStock = null;
  if (stock !== undefined && stock !== null && stock !== '') {
    prodStock = parseFloat(stock);
    if (isNaN(prodStock) || prodStock < 0) {
      return res.status(400).json({ error: 'Stock must be a valid non-negative number.' });
    }
  }

  try {
    // Check if the selected category belongs to this shop
    const category = await Category.findOne({ CATEGORY_ID: categoryId, SHOP_ID: shopId });
    if (!category) {
      return res.status(400).json({ error: 'Selected category does not exist in your shop.' });
    }

    // Save image if present
    const imageUrl = saveBase64Image(image);

    // Get sequence ID
    const productId = await getNextSequence('product_id');

    // Create and save product
    const newProduct = new Product({
      PRODUCT_ID: productId,
      SHOP_ID: shopId,
      NAME: name.trim(),
      CATEGORY_ID: categoryId,
      PRICE: prodPrice,
      STOCK: prodStock,
      QUANTITY_UNIT: quantityUnit.trim(),
      IMAGE_URL: imageUrl
    });
    await newProduct.save();

    return res.status(201).json({
      product_id: productId,
      name: name.trim(),
      category_id: categoryId,
      price: prodPrice,
      stock: prodStock,
      quantity_unit: quantityUnit.trim(),
      image_url: imageUrl
    });
  } catch (err) {
    console.error('Error creating product:', err);
    return res.status(500).json({ error: 'Failed to create product.' });
  }
});

// UPDATE A PRODUCT
router.put('/:id', requireAuth, async (req, res) => {
  const { shopId } = req.session.user;
  const productId = parseInt(req.params.id);
  const { name, categoryId, price, stock, quantityUnit, image } = req.body;

  if (isNaN(productId)) {
    return res.status(400).json({ error: 'Invalid product ID.' });
  }

  if (!name || !categoryId || price === undefined || !quantityUnit) {
    return res.status(400).json({ error: 'Product name, category, price, and quantity unit are required.' });
  }

  const prodPrice = parseFloat(price);
  if (isNaN(prodPrice) || prodPrice < 0) {
    return res.status(400).json({ error: 'Price must be a valid positive number.' });
  }

  // Stock is optional
  let prodStock = null;
  if (stock !== undefined && stock !== null && stock !== '') {
    prodStock = parseFloat(stock);
    if (isNaN(prodStock) || prodStock < 0) {
      return res.status(400).json({ error: 'Stock must be a valid non-negative number.' });
    }
  }

  try {
    // Check if product exists in this shop
    const product = await Product.findOne({ PRODUCT_ID: productId, SHOP_ID: shopId });
    if (!product) {
      return res.status(404).json({ error: 'Product not found in your shop.' });
    }

    // Check category validity
    const category = await Category.findOne({ CATEGORY_ID: categoryId, SHOP_ID: shopId });
    if (!category) {
      return res.status(400).json({ error: 'Selected category does not exist in your shop.' });
    }

    // Prepare updates
    product.NAME = name.trim();
    product.CATEGORY_ID = categoryId;
    product.PRICE = prodPrice;
    product.STOCK = prodStock;
    product.QUANTITY_UNIT = quantityUnit.trim();

    if (image === null) {
      product.IMAGE_URL = null;
    } else if (image && image.startsWith('data:image')) {
      const imageUrl = saveBase64Image(image);
      if (imageUrl) {
        product.IMAGE_URL = imageUrl;
      }
    }

    await product.save();
    return res.json({ message: 'Product updated successfully.' });
  } catch (err) {
    console.error('Error updating product:', err);
    return res.status(500).json({ error: 'Failed to update product.' });
  }
});

// DELETE A PRODUCT
router.delete('/:id', requireAuth, async (req, res) => {
  const { shopId } = req.session.user;
  const productId = parseInt(req.params.id);

  if (isNaN(productId)) {
    return res.status(400).json({ error: 'Invalid product ID.' });
  }

  try {
    const product = await Product.findOne({ PRODUCT_ID: productId, SHOP_ID: shopId });
    if (!product) {
      return res.status(404).json({ error: 'Product not found in your shop.' });
    }

    await Product.deleteOne({ PRODUCT_ID: productId, SHOP_ID: shopId });
    return res.json({ message: 'Product deleted successfully.' });
  } catch (err) {
    console.error('Error deleting product:', err);
    return res.status(500).json({ error: 'Failed to delete product.' });
  }
});

module.exports = router;
