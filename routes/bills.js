// routes/bills.js
// Bills and Invoicing Router using Mongoose & MongoDB

const express = require('express');
const router = express.Router();
const Bill = require('../models/Bill');
const BillItem = require('../models/BillItem');
const Product = require('../models/Product');
const User = require('../models/User');
const Shop = require('../models/Shop');
const { getNextSequence } = require('../models/Counter');

// Middleware to check authentication
function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }
}

// GET ALL BILLS
router.get('/', requireAuth, async (req, res) => {
  const { shopId } = req.session.user;
  try {
    const bills = await Bill.find({ SHOP_ID: shopId }).sort({ BILL_DATE: -1 }).lean();
    
    // Map created_by user ID to user name to mimic SQL JOIN
    const userIds = [...new Set(bills.map(b => b.CREATED_BY))];
    const users = await User.find({ USER_ID: { $in: userIds } }).lean();

    const userMap = {};
    users.forEach(u => {
      userMap[u.USER_ID] = u.NAME;
    });

    const responseData = bills.map(b => ({
      ...b,
      CREATED_BY_NAME: userMap[b.CREATED_BY] || 'Unknown'
    }));

    return res.json(responseData);
  } catch (err) {
    console.error('Error fetching bills:', err);
    return res.status(500).json({ error: 'Failed to fetch bills list.' });
  }
});

// GET SPECIFIC BILL & ITEMS
router.get('/:id', requireAuth, async (req, res) => {
  const { shopId } = req.session.user;
  const billId = parseInt(req.params.id);

  if (isNaN(billId)) {
    return res.status(400).json({ error: 'Invalid bill ID.' });
  }

  try {
    // 1. Fetch bill metadata
    const bill = await Bill.findOne({ BILL_ID: billId, SHOP_ID: shopId }).lean();
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found.' });
    }

    // Fetch user and shop details to mimic SQL JOINs
    const creator = await User.findOne({ USER_ID: bill.CREATED_BY }).lean();
    const shop = await Shop.findOne({ SHOP_ID: bill.SHOP_ID }).lean();

    // 2. Fetch bill items
    const items = await BillItem.find({ BILL_ID: billId }).sort({ BILL_ITEM_ID: 1 }).lean();

    const responseData = {
      ...bill,
      CREATED_BY_NAME: creator ? creator.NAME : 'Unknown',
      SHOP_NAME: shop ? shop.SHOP_NAME : 'Unknown',
      PLACE: shop ? shop.PLACE : 'Unknown',
      items: items
    };

    return res.json(responseData);
  } catch (err) {
    console.error('Error fetching bill details:', err);
    return res.status(500).json({ error: 'Failed to fetch bill details.' });
  }
});

// GENERATE NEW BILL (CHECKOUT TRANSACTION)
router.post('/', requireAuth, async (req, res) => {
  const { shopId, userId } = req.session.user;
  const { customerName, customerPhone, discount, tax, items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'At least one product item is required to generate a bill.' });
  }

  const parsedDiscount = discount !== undefined ? parseFloat(discount) : 0;
  const parsedTax = tax !== undefined ? parseFloat(tax) : 0;

  if (isNaN(parsedDiscount) || parsedDiscount < 0) {
    return res.status(400).json({ error: 'Discount must be a valid positive number.' });
  }
  if (isNaN(parsedTax) || parsedTax < 0) {
    return res.status(400).json({ error: 'Tax must be a valid positive number.' });
  }

  try {
    // 1. Generate unique invoice number: BILL-YYYYMMDD-XXXX
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const date = String(now.getDate()).padStart(2, '0');
    const dateString = `${year}${month}${date}`;

    // Get count of bills in this shop
    const totalCount = await Bill.countDocuments({ SHOP_ID: shopId });
    const nextSequence = (totalCount + 1).toString().padStart(4, '0');
    const billNumber = `BILL-${dateString}-${nextSequence}`;

    // Get Next Bill ID from sequence helper
    const billId = await getNextSequence('bill_id');

    // 2. Process items, calculate subtotals, and deduct stock
    let calculatedTotalAmount = 0;
    const processedItems = [];

    for (const item of items) {
      const prodId = parseInt(item.productId);
      const qty = parseFloat(item.quantity);

      if (isNaN(prodId) || isNaN(qty) || qty <= 0) {
        return res.status(400).json({ error: 'Invalid product or quantity in cart.' });
      }

      // Fetch product info
      const product = await Product.findOne({ PRODUCT_ID: prodId, SHOP_ID: shopId });
      if (!product) {
        return res.status(400).json({ error: `Product ID ${prodId} does not exist in your shop.` });
      }

      // Validate stock if tracked
      if (product.STOCK !== null && product.STOCK !== undefined) {
        if (product.STOCK < qty) {
          return res.status(400).json({
            error: `Insufficient stock for "${product.NAME}". Available: ${product.STOCK} ${product.QUANTITY_UNIT}, requested: ${qty}.`
          });
        }
      }

      const subtotal = Number((product.PRICE * qty).toFixed(2));
      calculatedTotalAmount += subtotal;

      // Format custom display name for items
      let displayName = product.NAME;
      if (item.selectedUnit && item.inputQty) {
        const displayUnit = item.selectedUnit === 'grams' ? 'g' : item.selectedUnit;
        displayName += ` (${item.inputQty}${displayUnit})`;
      } else {
        displayName += ` (${qty}${product.QUANTITY_UNIT})`;
      }

      processedItems.push({
        productId: prodId,
        productName: displayName,
        quantity: qty,
        price: product.PRICE,
        subtotal: subtotal,
        productModel: product // Store model instance to update stock later
      });
    }

    // Deduct stock and save line items
    for (const pItem of processedItems) {
      const product = pItem.productModel;
      
      // Save Bill Item
      const billItemId = await getNextSequence('bill_item_id');
      const newBillItem = new BillItem({
        BILL_ITEM_ID: billItemId,
        BILL_ID: billId,
        PRODUCT_ID: pItem.productId,
        PRODUCT_NAME: pItem.productName,
        QUANTITY: pItem.quantity,
        PRICE: pItem.price,
        SUBTOTAL: pItem.subtotal
      });
      await newBillItem.save();

      // Deduct stock if tracked
      if (product.STOCK !== null && product.STOCK !== undefined) {
        product.STOCK = Number((product.STOCK - pItem.quantity).toFixed(3));
        await product.save();
      }
    }

    // 3. Save Bill Metadata
    calculatedTotalAmount = Number(calculatedTotalAmount.toFixed(2));
    const grandTotal = Number((calculatedTotalAmount - parsedDiscount + parsedTax).toFixed(2));

    const newBill = new Bill({
      BILL_ID: billId,
      SHOP_ID: shopId,
      BILL_NUMBER: billNumber,
      CUSTOMER_NAME: customerName ? customerName.trim() : null,
      CUSTOMER_PHONE: customerPhone ? customerPhone.trim() : null,
      TOTAL_AMOUNT: calculatedTotalAmount,
      DISCOUNT: parsedDiscount,
      TAX: parsedTax,
      GRAND_TOTAL: grandTotal < 0 ? 0 : grandTotal,
      CREATED_BY: userId
    });
    await newBill.save();

    return res.status(201).json({
      message: 'Bill generated successfully!',
      billId: billId,
      billNumber: billNumber,
      grandTotal: grandTotal
    });

  } catch (err) {
    console.error('Checkout failed:', err);
    return res.status(400).json({ error: err.message || 'Transaction failed. Please try again.' });
  }
});

// SAVE RECEIPT IMAGE ON SERVER
router.post('/:id/image', requireAuth, async (req, res) => {
  const billId = parseInt(req.params.id);
  const { image } = req.body;

  if (isNaN(billId)) {
    return res.status(400).json({ error: 'Invalid bill ID.' });
  }

  if (!image || !image.startsWith('data:image')) {
    return res.status(400).json({ error: 'Valid base64 image data is required.' });
  }

  try {
    const fs = require('fs');
    const path = require('path');

    const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'Invalid image format.' });
    }

    const buffer = Buffer.from(matches[2], 'base64');
    const filename = `bill_${billId}.png`;
    const receiptsDir = path.join(__dirname, '../public/uploads/receipts');

    if (!fs.existsSync(receiptsDir)) {
      fs.mkdirSync(receiptsDir, { recursive: true });
    }

    fs.writeFileSync(path.join(receiptsDir, filename), buffer);

    return res.json({ imageUrl: `/uploads/receipts/${filename}` });
  } catch (err) {
    console.error('Error saving invoice image:', err);
    return res.status(500).json({ error: 'Failed to store receipt image on server.' });
  }
});

module.exports = router;
