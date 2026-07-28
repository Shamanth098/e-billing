# QuantumBill - Smart Ebilling Dashboard

QuantumBill is a premium, fully responsive web application designed for shopkeepers and retail stores to manage products, categories, stock levels, and generate invoices with inline screenshot sharing capabilities.

---

## 🚀 Key Features

* **Role-Based Authentication**: Custom sequential ID generation for Shopkeepers (`SK-XXX`) and Workers (`WK-XXX`).
* **Inventory Management**: Add and manage products with optional stock tracking and image uploads. Support for custom product categories.
* **Dual-Unit Staple Billing**: Dynamic cart logic supporting dual units (`Kilograms` and `Grams`). Selecting grams automatically computes proportional pricing (e.g. `Price * Grams * 0.001`) and checks stock limits proportionally.
* **Image Receipt Capturing & Sharing**:
  * **Interactive previews**: Renders high-fidelity PNG images of receipts dynamically.
  * **Direct Copy**: Right-click or long-press the receipt image to copy or save it directly.
  * **Auto Copy-to-Clipboard**: Clicking **Share WhatsApp** or **Send SMS** automatically copies the invoice image to the system clipboard, prompting you to paste (`Ctrl+V`) it directly inside your chat.
  * **Native share sheet**: Leverages Web Share API files support on mobile screens.
  * **Thermal Vector Print**: Keeps vector-quality text for crisp thermal paper printing.
* **Responsive Layouts**: Overlay side drawer menus and backdrop layer blocks optimized for landscape and portrait viewports on phones and tablets.
* **Database Backend**: Fully integrated with **MongoDB Atlas** using Mongoose schemas.

---

## 🛠️ Technology Stack

* **Backend**: Node.js, Express.js, MongoDB (Mongoose), Express-session, bcryptjs, Morgan
* **Frontend**: Vanilla HTML5, CSS3, JavaScript, html2canvas, FontAwesome, Google Fonts (Inter, Outfit)

---

## ⚙️ Project Setup

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) (v16+) installed.

### 2. Configure Environment Variables
Copy the `.env.example` template to a new file named `.env`:
```bash
cp .env.example .env
```
Open `.env` and fill in your actual configurations (such as your MongoDB Atlas password):
```env
PORT=3000
SESSION_SECRET=your_session_secret_key
MONGODB_URI=mongodb+srv://shamanthgb0987_db_user:<YOUR_ACTUAL_PASSWORD_HERE>@cluster0.sxvvaki.mongodb.net/ebilling?retryWrites=true&w=majority&appName=Cluster0
```
*(Note: `.env` is ignored by Git automatically and will not be pushed to GitHub).*

### 3. Install Dependencies
Open a terminal in the project directory and run:
```bash
npm install
```

### 4. Run the Server
* **For Development**:
  ```bash
  npm run dev
  ```
* **For Production**:
  ```bash
  npm start
  ```
The application will run locally at: **[http://localhost:3000](http://localhost:3000)**

---

## 📁 Repository Directory Structure

```text
├── models/             # Mongoose MongoDB models
│   ├── Bill.js
│   ├── BillItem.js
│   ├── Category.js
│   ├── Counter.js       # Auto-incrementing integer ID sequence generator
│   ├── Note.js
│   ├── Product.js
│   ├── Shop.js
│   └── User.js
├── public/             # Static frontend web assets
│   ├── css/
│   │   └── style.css   # Main layout and responsive viewport sheets
│   ├── js/
│   │   └── app.js      # Frontend logic, cart computations, and canvas captures
│   ├── uploads/        # Directory containing product image uploads (Git ignored)
│   │   └── receipts/   # Saved receipt screenshots (Git ignored)
│   └── index.html      # Single page dashboard structure
├── routes/             # Express.js REST API router endpoints
│   ├── auth.js         # User registration and logins
│   ├── bills.js        # Checkout logs, stock deductions, and image uploads
│   ├── notes.js        # Order replenishment checklists
│   └── products.js     # Product and category CRUD
├── .env.example        # Environment variables configuration template
├── .gitignore          # Repository git ignore configuration
├── db.js               # Database connection wrapper and password encoder
├── package.json        # Project scripts and dependencies
├── schema.sql          # Legacy Oracle SQL database schema reference
└── server.js           # Server initializer and startup script
```
