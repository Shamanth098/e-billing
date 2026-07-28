// public/js/app.js
// Main Frontend Application Logic for QuantumBill

// ================= GLOBAL APP STATE =================
let currentUser = null;
let catalogProducts = [];
let catalogCategories = [];
let cart = [];
let billsHistory = [];
let notesChecklist = [];
let productImageBase64 = null; // Holds temporary base64 image data URL

let activeSection = 'billing-section';
let productSubTab = 'items';
let noteFilter = 'all';
let selectedCategory = 'all';

// Initialize App
window.addEventListener('DOMContentLoaded', () => {
  checkSession();
});

// ================= TOAST NOTIFICATION HELPERS =================
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');
  
  toastMessage.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.remove('hidden');
  
  // Clear any existing timeout
  if (window.toastTimeout) {
    clearTimeout(window.toastTimeout);
  }
  
  window.toastTimeout = setTimeout(() => {
    toast.classList.add('hidden');
  }, 4000);
}

// Copy Shop ID utility
function copyShopId() {
  if (currentUser && currentUser.shopId) {
    navigator.clipboard.writeText(currentUser.shopId);
    showToast('Shop ID copied to clipboard: ' + currentUser.shopId);
  }
}

// ================= SESSION & AUTH MANAGEMENT =================
async function checkSession() {
  try {
    const res = await fetch('/api/auth/me');
    if (res.ok) {
      const data = await res.json();
      currentUser = data.user;
      setupDashboardUI();
    } else {
      showAuthScreen();
    }
  } catch (err) {
    console.error('Session check error:', err);
    showAuthScreen();
  }
}

function showAuthScreen() {
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('dashboard-screen').classList.add('hidden');
}

function setupDashboardUI() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('dashboard-screen').classList.remove('hidden');
  
  // Populate UI Badges
  document.getElementById('user-shop-name').textContent = currentUser.shopName;
  document.getElementById('user-shop-place').textContent = currentUser.place;
  document.getElementById('user-display-name').textContent = currentUser.name;
  
  const roleBadge = document.getElementById('user-display-role');
  roleBadge.textContent = currentUser.role === 'shopkeeper' ? 'Shopkeeper' : 'Worker';
  roleBadge.className = `role-badge ${currentUser.role}`;
  
  document.getElementById('user-display-id').textContent = currentUser.userId;
  document.getElementById('header-shop-id').textContent = currentUser.shopId;
  
  // Load core data
  loadDashboardData();
  
  // Show default section
  showSection('billing-section');
}

async function handleLogin(e) {
  e.preventDefault();
  const userId = document.getElementById('login-user-id').value;
  const password = document.getElementById('login-password').value;
  
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, password })
    });
    
    const data = await res.json();
    if (res.ok) {
      currentUser = data.user;
      showToast('Login successful! Welcome back.');
      setupDashboardUI();
      // Clear forms
      document.getElementById('login-form').reset();
    } else {
      showToast(data.error || 'Login failed.', 'error');
    }
  } catch (err) {
    console.error('Login error:', err);
    showToast('Server error during login.', 'error');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const role = document.getElementById('reg-role').value;
  const name = document.getElementById('reg-name').value;
  const shopName = document.getElementById('reg-shop-name').value;
  const place = document.getElementById('reg-place').value;
  const shopId = document.getElementById('reg-shop-id').value;
  const password = document.getElementById('reg-password').value;
  
  const body = { role, name, password };
  if (role === 'shopkeeper') {
    body.shopName = shopName;
    body.place = place;
  } else {
    body.shopId = shopId;
  }
  
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    const data = await res.json();
    if (res.ok) {
      // Prompt user of IDs generated
      alert(`Registration Successful!\n\nIMPORTANT: Save these credentials to log in:\n- Generated USER ID: ${data.userId}\n- Shop ID: ${data.shopId}\n- Shop Name: ${data.shopName}\n\nYou must log in using your USER ID: "${data.userId}".`);
      
      // Auto-fill login User ID and switch tab
      document.getElementById('login-user-id').value = data.userId;
      switchAuthTab('login');
      document.getElementById('register-form').reset();
      toggleRegRoleFields();
    } else {
      showToast(data.error || 'Registration failed.', 'error');
    }
  } catch (err) {
    console.error('Registration error:', err);
    showToast('Server error during registration.', 'error');
  }
}

async function handleLogout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
    currentUser = null;
    cart = [];
    showToast('Logged out successfully.');
    showAuthScreen();
  } catch (err) {
    console.error('Logout error:', err);
    showToast('Logout request failed.', 'error');
  }
}

function switchAuthTab(tab) {
  const loginTab = document.getElementById('tab-login');
  const registerTab = document.getElementById('tab-register');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  
  if (tab === 'login') {
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
    loginForm.classList.add('active');
    registerForm.classList.remove('active');
  } else {
    registerTab.classList.add('active');
    loginTab.classList.remove('active');
    registerForm.classList.add('active');
    loginForm.classList.remove('active');
  }
}

function toggleRegRoleFields() {
  const role = document.getElementById('reg-role').value;
  const shopkeeperFields = document.getElementById('shopkeeper-fields');
  const workerFields = document.getElementById('worker-fields');
  
  const shopNameInput = document.getElementById('reg-shop-name');
  const placeInput = document.getElementById('reg-place');
  const shopIdInput = document.getElementById('reg-shop-id');
  
  if (role === 'shopkeeper') {
    shopkeeperFields.classList.remove('hidden');
    workerFields.classList.add('hidden');
    shopNameInput.required = true;
    placeInput.required = true;
    shopIdInput.required = false;
  } else {
    shopkeeperFields.classList.add('hidden');
    workerFields.classList.remove('hidden');
    shopNameInput.required = false;
    placeInput.required = false;
    shopIdInput.required = true;
  }
}

// ================= LOAD DATA WRAPPERS =================
async function loadDashboardData() {
  await Promise.all([
    loadCategories(),
    loadProducts(),
    loadBillsHistory(),
    loadNotes()
  ]);
}

async function loadCategories() {
  try {
    const res = await fetch('/api/products/categories');
    if (res.ok) {
      catalogCategories = await res.json();
      renderCategoriesFilter();
      renderCategoriesList();
      populateProductFormCategories();
    }
  } catch (err) {
    console.error('Load categories error:', err);
  }
}

async function loadProducts() {
  try {
    const res = await fetch('/api/products');
    if (res.ok) {
      catalogProducts = await res.json();
      renderProductCatalog();
      renderProductListTable();
    }
  } catch (err) {
    console.error('Load products error:', err);
  }
}

async function loadBillsHistory() {
  try {
    const res = await fetch('/api/bills');
    if (res.ok) {
      billsHistory = await res.json();
      renderBillsHistoryTable();
    }
  } catch (err) {
    console.error('Load bills error:', err);
  }
}

async function loadNotes() {
  try {
    const res = await fetch('/api/notes');
    if (res.ok) {
      notesChecklist = await res.json();
      renderNotesList();
    }
  } catch (err) {
    console.error('Load notes error:', err);
  }
}

// ================= NAVIGATION =================
function toggleSidebar(shouldOpen) {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (shouldOpen) {
    sidebar.classList.add('open');
    overlay.classList.remove('hidden');
  } else {
    sidebar.classList.remove('open');
    overlay.classList.add('hidden');
  }
}

function showSection(sectionId) {
  activeSection = sectionId;
  
  // Auto-close sidebar on mobile after clicking item
  if (window.innerWidth <= 992) {
    toggleSidebar(false);
  }
  
  // Toggle Navigation Link State
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.getAttribute('data-section') === sectionId) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
  
  // Toggle Section Element State
  document.querySelectorAll('.dashboard-section').forEach(sec => {
    if (sec.id === sectionId) {
      sec.classList.add('active');
    } else {
      sec.classList.remove('active');
    }
  });
  
  // Update Header details
  const headerTitle = document.getElementById('section-title');
  const headerSubtitle = document.getElementById('section-subtitle');
  
  switch (sectionId) {
    case 'billing-section':
      headerTitle.textContent = 'Billing Panel';
      headerSubtitle.textContent = 'Process customer checkouts and generate invoices';
      renderProductCatalog();
      break;
    case 'products-section':
      headerTitle.textContent = 'Product & Stock Management';
      headerSubtitle.textContent = 'Add products, update stocks, and create categories';
      switchProductSubTab(productSubTab);
      break;
    case 'bills-section':
      headerTitle.textContent = 'Bills & Invoice History';
      headerSubtitle.textContent = 'Browse past orders, reprint invoices, and share logs';
      loadBillsHistory();
      break;
    case 'notes-section':
      headerTitle.textContent = 'Order Notes & Checklist';
      headerSubtitle.textContent = 'Note down items needed for your next inventory stock up';
      loadNotes();
      break;
  }
}

// ================= SECTION 1: BILLING CATALOG =================
function renderCategoriesFilter() {
  const container = document.getElementById('catalog-categories');
  // Keep the 'All' button
  container.innerHTML = `<button class="category-tab ${selectedCategory === 'all' ? 'active' : ''}" onclick="selectCatalogCategory('all')">All</button>`;
  
  catalogCategories.forEach(cat => {
    const activeClass = selectedCategory == cat.CATEGORY_ID ? 'active' : '';
    container.innerHTML += `<button class="category-tab ${activeClass}" onclick="selectCatalogCategory(${cat.CATEGORY_ID})">${escapeHTML(cat.NAME)}</button>`;
  });
}

function selectCatalogCategory(catId) {
  selectedCategory = catId;
  renderCategoriesFilter();
  renderProductCatalog();
}

function filterCatalog() {
  renderProductCatalog();
}

function renderProductCatalog() {
  const grid = document.getElementById('catalog-grid');
  const emptyState = document.getElementById('catalog-empty');
  const searchQuery = document.getElementById('catalog-search').value.toLowerCase().trim();
  
  // Filter products locally
  const filtered = catalogProducts.filter(p => {
    // Category check
    if (selectedCategory !== 'all' && p.CATEGORY_ID != selectedCategory) {
      return false;
    }
    // Search query check
    if (searchQuery && !p.NAME.toLowerCase().includes(searchQuery)) {
      return false;
    }
    return true;
  });
  
  if (filtered.length === 0) {
    grid.classList.add('hidden');
    emptyState.classList.remove('hidden');
    return;
  }
  
  grid.classList.remove('hidden');
  emptyState.classList.add('hidden');
  grid.innerHTML = '';
  
  filtered.forEach(p => {
    // Optional stock tracking: check stock if not null
    const hasStockTracking = p.STOCK !== null && p.STOCK !== undefined;
    const isOutOfStock = hasStockTracking && p.STOCK <= 0;
    const cardClass = isOutOfStock ? 'product-card out-of-stock' : 'product-card';
    const actionBtn = isOutOfStock 
      ? `<button class="btn-add-item" disabled><i class="fa-solid fa-ban"></i></button>`
      : `<button class="btn-add-item" onclick="addItemToCart(${p.PRODUCT_ID})"><i class="fa-solid fa-plus"></i></button>`;
    
    const stockText = hasStockTracking 
      ? `Stock: ${p.STOCK} ${escapeHTML(p.QUANTITY_UNIT)}` 
      : 'Stock: Unlimited';

    // Show dynamic image card if exists
    const imageHtml = p.IMAGE_URL
      ? `<img src="${p.IMAGE_URL}" class="product-card-image" alt="${escapeHTML(p.NAME)}">`
      : `<div class="product-card-image-placeholder"><i class="fa-solid fa-box-open"></i></div>`;
    
    grid.innerHTML += `
      <div class="${cardClass}">
        ${imageHtml}
        <div class="product-card-body" style="padding-top: 10px; display: flex; flex-direction: column; gap: 6px; flex: 1;">
          <span class="product-card-category">${escapeHTML(p.CATEGORY_NAME)}</span>
          <h4 class="product-card-name" style="margin-bottom: 2px;">${escapeHTML(p.NAME)}</h4>
          <span class="product-card-stock" style="font-weight: 500; font-size: 0.8rem;">${stockText}</span>
          <div class="product-card-footer" style="margin-top: auto; padding-top: 6px;">
            <div>
              <span class="product-card-price">Rs.${p.PRICE.toFixed(2)}</span>
              <span class="product-card-unit">/${escapeHTML(p.QUANTITY_UNIT)}</span>
            </div>
            ${actionBtn}
          </div>
        </div>
      </div>
    `;
  });
}

// ================= BILLING PANEL: SALES CART =================
function addItemToCart(productId) {
  const product = catalogProducts.find(p => p.PRODUCT_ID === productId);
  if (!product) return;
  
  const existing = cart.find(item => item.productId === productId);
  const baseUnit = product.QUANTITY_UNIT.trim();
  const isKgItem = baseUnit.toLowerCase() === 'kg';
  
  if (existing) {
    // If stock limit is tracked, verify
    if (product.STOCK !== null && product.STOCK !== undefined) {
      const nextInputQty = existing.inputQty + (existing.selectedUnit === 'grams' ? 100 : 1);
      const calculatedQty = existing.selectedUnit === 'grams' ? (nextInputQty / 1000) : nextInputQty;
      if (calculatedQty > product.STOCK) {
        showToast(`Cannot add more. Only ${product.STOCK} kg available in stock.`, 'error');
        return;
      }
      existing.inputQty = nextInputQty;
    } else {
      existing.inputQty += (existing.selectedUnit === 'grams' ? 100 : 1);
    }
  } else {
    if (product.STOCK !== null && product.STOCK !== undefined && product.STOCK <= 0) {
      showToast('Product is out of stock.', 'error');
      return;
    }
    
    cart.push({
      productId: product.PRODUCT_ID,
      name: product.NAME,
      price: product.PRICE,
      inputQty: isKgItem ? 1 : 1, // Default billing qty 1
      unit: baseUnit, // base unit from product (e.g. kg, items)
      selectedUnit: isKgItem ? 'kg' : baseUnit, // current unit selected (kg vs grams)
      stockLimit: product.STOCK // stock limits from db (null means no track)
    });
  }
  
  renderCart();
  showToast(`Added ${product.NAME} to cart.`);
}

function updateCartQty(productId, newQty) {
  const item = cart.find(i => i.productId === productId);
  if (!item) return;
  
  const qty = parseFloat(newQty);
  if (isNaN(qty) || qty <= 0) {
    removeCartItem(productId);
    return;
  }
  
  // Stock limit validation if stock is tracked (not NULL)
  if (item.stockLimit !== null && item.stockLimit !== undefined) {
    const calculatedQty = item.selectedUnit === 'grams' ? (qty / 1000) : qty;
    if (calculatedQty > item.stockLimit) {
      const maxInput = item.selectedUnit === 'grams' ? (item.stockLimit * 1000) : item.stockLimit;
      showToast(`Requested quantity exceeds stock limit (${item.stockLimit} ${item.unit}). Max billing input set.`, 'warning');
      item.inputQty = maxInput;
    } else {
      item.inputQty = qty;
    }
  } else {
    item.inputQty = qty;
  }
  
  renderCart();
}

function changeCartQtyStep(productId, step) {
  const item = cart.find(i => i.productId === productId);
  if (!item) return;
  
  const stepVal = item.selectedUnit === 'grams' ? step * 100 : step;
  const newQty = item.inputQty + stepVal;
  updateCartQty(productId, newQty);
}

function changeCartUnit(productId, newUnit) {
  const item = cart.find(i => i.productId === productId);
  if (!item) return;
  
  const oldUnit = item.selectedUnit;
  if (oldUnit === newUnit) return;
  
  item.selectedUnit = newUnit;
  
  // Convert quantity input values
  if (oldUnit === 'kg' && newUnit === 'grams') {
    item.inputQty = item.inputQty * 1000;
  } else if (oldUnit === 'grams' && newUnit === 'kg') {
    item.inputQty = Number((item.inputQty / 1000).toFixed(3));
  }
  
  // Validate stock limits for the new unit selection
  updateCartQty(productId, item.inputQty);
}

function removeCartItem(productId) {
  cart = cart.filter(i => i.productId !== productId);
  renderCart();
}

function clearCart() {
  if (cart.length === 0) return;
  cart = [];
  document.getElementById('cart-customer-name').value = '';
  document.getElementById('cart-customer-phone').value = '';
  document.getElementById('cart-discount').value = 0;
  document.getElementById('cart-tax').value = 0;
  renderCart();
}

function renderCart() {
  const tbody = document.getElementById('cart-tbody');
  
  if (cart.length === 0) {
    tbody.innerHTML = `
      <tr class="cart-empty-row">
        <td colspan="5" class="text-center text-muted py-5">
          <i class="fa-solid fa-basket-shopping text-2xl d-block mb-2"></i>
          Cart is empty. Add products from the catalog.
        </td>
      </tr>
    `;
    calculateCartTotals();
    return;
  }
  
  tbody.innerHTML = '';
  cart.forEach(item => {
    const factor = item.selectedUnit === 'grams' ? 0.001 : 1;
    const total = (item.price * item.inputQty * factor).toFixed(2);
    
    // Add dropdown unit selector if base product unit is kg
    let unitDisplayHtml = `<span class="cart-item-unit">Unit: ${escapeHTML(item.unit)}</span>`;
    if (item.unit.toLowerCase() === 'kg') {
      unitDisplayHtml = `
        <div style="display: flex; align-items: center; gap: 4px; margin-top: 2px;">
          <span class="cart-item-unit">Unit:</span>
          <select onchange="changeCartUnit(${item.productId}, this.value)" style="background: var(--bg-input); border: 1px solid var(--border-color); border-radius: var(--border-radius-sm); font-size: 0.75rem; padding: 1px 4px; color: var(--text-primary); cursor: pointer; outline: none;">
            <option value="kg" ${item.selectedUnit === 'kg' ? 'selected' : ''}>kg</option>
            <option value="grams" ${item.selectedUnit === 'grams' ? 'selected' : ''}>g</option>
          </select>
        </div>
      `;
    }
    
    tbody.innerHTML += `
      <tr>
        <td>
          <span class="cart-item-name">${escapeHTML(item.name)}</span>
          ${unitDisplayHtml}
        </td>
        <td>Rs.${item.price.toFixed(2)}</td>
        <td>
          <div class="qty-control">
            <button class="qty-btn" onclick="changeCartQtyStep(${item.productId}, -1)">-</button>
            <input type="number" value="${item.inputQty}" step="any" min="0.01" onchange="updateCartQty(${item.productId}, this.value)">
            <button class="qty-btn" onclick="changeCartQtyStep(${item.productId}, 1)">+</button>
          </div>
        </td>
        <td>Rs.${total}</td>
        <td>
          <button class="btn-icon-only text-danger" onclick="removeCartItem(${item.productId})">
            <i class="fa-regular fa-trash-can"></i>
          </button>
        </td>
      </tr>
    `;
  });
  
  calculateCartTotals();
}

function calculateCartTotals() {
  let subtotal = 0;
  cart.forEach(item => {
    const factor = item.selectedUnit === 'grams' ? 0.001 : 1;
    subtotal += item.price * item.inputQty * factor;
  });
  
  const discountVal = parseFloat(document.getElementById('cart-discount').value) || 0;
  const taxVal = parseFloat(document.getElementById('cart-tax').value) || 0;
  
  const grandTotal = Math.max(0, subtotal - discountVal + taxVal);
  
  document.getElementById('cart-subtotal').textContent = `Rs. ${subtotal.toFixed(2)}`;
  document.getElementById('cart-grand-total').textContent = `Rs. ${grandTotal.toFixed(2)}`;
}

async function submitCheckout() {
  if (cart.length === 0) {
    showToast('Add products to cart first.', 'error');
    return;
  }
  
  const customerName = document.getElementById('cart-customer-name').value;
  const customerPhone = document.getElementById('cart-customer-phone').value;
  const discount = parseFloat(document.getElementById('cart-discount').value) || 0;
  const tax = parseFloat(document.getElementById('cart-tax').value) || 0;
  
  // Maps item quantities converted to base unit for checkout database deduct
  const items = cart.map(item => ({
    productId: item.productId,
    quantity: item.selectedUnit === 'grams' ? (item.inputQty / 1000) : item.inputQty,
    selectedUnit: item.selectedUnit,
    inputQty: item.inputQty
  }));
  
  try {
    const res = await fetch('/api/bills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName, customerPhone, discount, tax, items })
    });
    
    const data = await res.json();
    if (res.ok) {
      showToast('Bill created successfully!');
      clearCart();
      loadProducts(); // Reload products to get updated stock values
      openReceiptModal(data.billId); // Open bill print modal
    } else {
      showToast(data.error || 'Checkout failed.', 'error');
    }
  } catch (err) {
    console.error('Checkout error:', err);
    showToast('Checkout transaction failed.', 'error');
  }
}

// ================= SECTION 2: PRODUCTS STOCK =================
function switchProductSubTab(tab) {
  productSubTab = tab;
  document.querySelectorAll('.inner-tab').forEach(btn => {
    if (btn.innerText.toLowerCase().includes(tab)) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  if (tab === 'items') {
    document.getElementById('subtab-items').classList.add('active');
    document.getElementById('subtab-categories').classList.remove('active');
    renderProductListTable();
  } else {
    document.getElementById('subtab-items').classList.remove('active');
    document.getElementById('subtab-categories').classList.add('active');
    renderCategoriesList();
  }
}

function filterProductList() {
  renderProductListTable();
}

function renderProductListTable() {
  const tbody = document.getElementById('product-list-tbody');
  const searchQuery = document.getElementById('product-list-search').value.toLowerCase().trim();
  
  const filtered = catalogProducts.filter(p => 
    p.NAME.toLowerCase().includes(searchQuery) || 
    p.CATEGORY_NAME.toLowerCase().includes(searchQuery) ||
    String(p.PRODUCT_ID).includes(searchQuery)
  );
  
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">No products in stock list.</td></tr>`;
    return;
  }
  
  tbody.innerHTML = '';
  filtered.forEach(p => {
    // Optional stock tracking display
    const stockDisplay = (p.STOCK !== null && p.STOCK !== undefined) ? p.STOCK : 'Unlimited';
    
    // Thumbnail display
    const imgHtml = p.IMAGE_URL
      ? `<img src="${p.IMAGE_URL}" style="width: 40px; height: 40px; border-radius: 4px; object-fit: cover; border: 1px solid var(--border-color);">`
      : `<div style="width: 40px; height: 40px; border-radius: 4px; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center;"><i class="fa-solid fa-box-open text-muted" style="font-size: 0.9rem;"></i></div>`;
    
    tbody.innerHTML += `
      <tr>
        <td>${imgHtml}</td>
        <td>#${p.PRODUCT_ID}</td>
        <td class="font-semibold">${escapeHTML(p.NAME)}</td>
        <td><span class="product-card-category">${escapeHTML(p.CATEGORY_NAME)}</span></td>
        <td>Rs.${p.PRICE.toFixed(2)}</td>
        <td class="${p.STOCK !== null && p.STOCK <= 2 ? 'text-danger font-semibold' : ''}">${stockDisplay}</td>
        <td>${escapeHTML(p.QUANTITY_UNIT)}</td>
        <td>
          <div class="note-actions">
            <button class="btn-note-action text-success" onclick="openProductModal('edit', ${p.PRODUCT_ID})">
              <i class="fa-regular fa-pen-to-square"></i>
            </button>
            <button class="btn-note-action text-danger" onclick="deleteProduct(${p.PRODUCT_ID})">
              <i class="fa-regular fa-trash-can"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  });
}

// Image file reader previews
function previewProductImage(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    productImageBase64 = e.target.result;
    const preview = document.getElementById('modal-image-preview');
    preview.src = productImageBase64;
    document.getElementById('modal-image-preview-wrapper').classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

function removeSelectedImage() {
  productImageBase64 = null;
  document.getElementById('prod-image').value = '';
  document.getElementById('modal-image-preview').src = '';
  document.getElementById('modal-image-preview-wrapper').classList.add('hidden');
}

// Product modal logic
function openProductModal(mode, productId = null) {
  const modal = document.getElementById('product-modal');
  const form = document.getElementById('product-modal-form');
  const title = document.getElementById('product-modal-title');
  const idInput = document.getElementById('product-modal-id');
  
  form.reset();
  document.getElementById('prod-unit-custom-wrapper').classList.add('hidden');
  
  // Reset image upload previews
  productImageBase64 = null;
  document.getElementById('modal-image-preview-wrapper').classList.add('hidden');
  document.getElementById('modal-image-preview').src = '';
  document.getElementById('prod-image').value = '';
  
  if (mode === 'add') {
    title.textContent = 'Add New Product';
    idInput.value = '';
  } else {
    title.textContent = 'Edit Product Details';
    const prod = catalogProducts.find(p => p.PRODUCT_ID === productId);
    if (!prod) return;
    
    idInput.value = prod.PRODUCT_ID;
    document.getElementById('prod-name').value = prod.NAME;
    document.getElementById('prod-category').value = prod.CATEGORY_ID;
    document.getElementById('prod-price').value = prod.PRICE;
    document.getElementById('prod-stock').value = (prod.STOCK !== null && prod.STOCK !== undefined) ? prod.STOCK : '';
    
    // Display thumbnail preview if product has an image URL
    if (prod.IMAGE_URL) {
      productImageBase64 = undefined; // undefined = keep existing image
      document.getElementById('modal-image-preview').src = prod.IMAGE_URL;
      document.getElementById('modal-image-preview-wrapper').classList.remove('hidden');
    }
    
    // Select standard unit, or fallback to custom
    const unitSelect = document.getElementById('prod-unit');
    const standardUnits = ['kg', 'grams', 'items'];
    if (standardUnits.includes(prod.QUANTITY_UNIT)) {
      unitSelect.value = prod.QUANTITY_UNIT;
    } else {
      unitSelect.value = 'custom_option';
      document.getElementById('prod-unit-custom-wrapper').classList.remove('hidden');
      document.getElementById('prod-unit-custom').value = prod.QUANTITY_UNIT;
    }
  }
  
  modal.classList.remove('hidden');
}

function closeProductModal() {
  document.getElementById('product-modal').classList.add('hidden');
}

function handleUnitSelectChange() {
  const val = document.getElementById('prod-unit').value;
  const customWrapper = document.getElementById('prod-unit-custom-wrapper');
  if (val === 'custom_option') {
    customWrapper.classList.remove('hidden');
    document.getElementById('prod-unit-custom').required = true;
  } else {
    customWrapper.classList.add('hidden');
    document.getElementById('prod-unit-custom').required = false;
  }
}

async function handleProductSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('product-modal-id').value;
  const name = document.getElementById('prod-name').value;
  const categoryId = parseInt(document.getElementById('prod-category').value);
  const price = parseFloat(document.getElementById('prod-price').value);
  const stock = document.getElementById('prod-stock').value; // Keep as string to verify empty fields
  
  let quantityUnit = document.getElementById('prod-unit').value;
  if (quantityUnit === 'custom_option') {
    quantityUnit = document.getElementById('prod-unit-custom').value;
  }
  
  // Set optional stock representation as empty string (which maps to null in express API)
  const payload = { 
    name, 
    categoryId, 
    price, 
    stock: stock.trim() === '' ? '' : parseFloat(stock), 
    quantityUnit,
    image: productImageBase64
  };
  
  const isEdit = id !== '';
  const url = isEdit ? `/api/products/${id}` : '/api/products';
  const method = isEdit ? 'PUT' : 'POST';
  
  try {
    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    if (res.ok) {
      showToast(isEdit ? 'Product updated successfully.' : 'Product added successfully.');
      closeProductModal();
      loadProducts();
    } else {
      showToast(data.error || 'Operation failed.', 'error');
    }
  } catch (err) {
    console.error('Product save error:', err);
    showToast('Failed to save product details.', 'error');
  }
}

async function deleteProduct(productId) {
  if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
    return;
  }
  
  try {
    const res = await fetch(`/api/products/${productId}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (res.ok) {
      showToast('Product deleted.');
      loadProducts();
    } else {
      showToast(data.error || 'Failed to delete product.', 'error');
    }
  } catch (err) {
    console.error('Delete product error:', err);
    showToast('Failed to delete product.', 'error');
  }
}

// Category lists operations
function populateProductFormCategories() {
  const select = document.getElementById('prod-category');
  select.innerHTML = '<option value="" disabled selected>Select Category</option>';
  catalogCategories.forEach(cat => {
    select.innerHTML += `<option value="${cat.CATEGORY_ID}">${escapeHTML(cat.NAME)}</option>`;
  });
}

function renderCategoriesList() {
  const ul = document.getElementById('categories-ul');
  if (catalogCategories.length === 0) {
    ul.innerHTML = '<li class="text-center text-muted py-4">No categories created yet.</li>';
    return;
  }
  
  ul.innerHTML = '';
  catalogCategories.forEach(cat => {
    // Count how many products are in this category
    const prodCount = catalogProducts.filter(p => p.CATEGORY_ID == cat.CATEGORY_ID).length;
    ul.innerHTML += `
      <li class="category-item">
        <span class="font-semibold">${escapeHTML(cat.NAME)}</span>
        <span class="category-badge-count">${prodCount} products</span>
      </li>
    `;
  });
}

async function handleAddCategory(e) {
  e.preventDefault();
  const input = document.getElementById('new-category-name');
  const name = input.value;
  
  try {
    const res = await fetch('/api/products/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    
    const data = await res.json();
    if (res.ok) {
      showToast('Category created.');
      input.value = '';
      await loadCategories();
    } else {
      showToast(data.error || 'Failed to create category.', 'error');
    }
  } catch (err) {
    console.error('Category creation error:', err);
    showToast('Failed to create category.', 'error');
  }
}

// ================= SECTION 3: BILLS HISTORY =================
function filterBillsHistory() {
  renderBillsHistoryTable();
}

function renderBillsHistoryTable() {
  const tbody = document.getElementById('bills-tbody');
  const searchQuery = document.getElementById('bills-search').value.toLowerCase().trim();
  
  const filtered = billsHistory.filter(b => 
    b.BILL_NUMBER.toLowerCase().includes(searchQuery) ||
    (b.CUSTOMER_NAME && b.CUSTOMER_NAME.toLowerCase().includes(searchQuery)) ||
    (b.CUSTOMER_PHONE && b.CUSTOMER_PHONE.includes(searchQuery)) ||
    b.CREATED_BY_NAME.toLowerCase().includes(searchQuery)
  );
  
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">No matching invoices found.</td></tr>`;
    return;
  }
  
  tbody.innerHTML = '';
  filtered.forEach(b => {
    const dateFormatted = new Date(b.BILL_DATE).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    tbody.innerHTML += `
      <tr>
        <td class="font-semibold text-success">${escapeHTML(b.BILL_NUMBER)}</td>
        <td>${dateFormatted}</td>
        <td>${escapeHTML(b.CUSTOMER_NAME || 'Walking Client')}</td>
        <td>${escapeHTML(b.CUSTOMER_PHONE || '-')}</td>
        <td>Rs.${b.TOTAL_AMOUNT.toFixed(2)}</td>
        <td class="font-semibold">Rs.${b.GRAND_TOTAL.toFixed(2)}</td>
        <td>${escapeHTML(b.CREATED_BY_NAME)}</td>
        <td class="text-center">
          <button class="btn btn-secondary btn-icon-only text-success" onclick="openReceiptModal(${b.BILL_ID})" title="View Invoice">
            <i class="fa-regular fa-eye"></i>
          </button>
          <button class="btn btn-secondary btn-icon-only text-primary" onclick="quickShareWhatsApp(${b.BILL_ID})" title="WhatsApp Share">
            <i class="fa-brands fa-whatsapp"></i>
          </button>
        </td>
      </tr>
    `;
  });
}

// ================= SECTION 4: ORDER NOTES =================
function filterNotes(status) {
  noteFilter = status;
  document.querySelectorAll('.note-filter').forEach(btn => {
    if (btn.innerText.toLowerCase().includes(status)) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  renderNotesList();
}

function renderNotesList() {
  const container = document.getElementById('notes-list-container');
  
  const filtered = notesChecklist.filter(n => {
    if (noteFilter === 'all') return true;
    return n.STATUS === noteFilter;
  });
  
  if (filtered.length === 0) {
    container.innerHTML = `<div class="text-center text-muted py-5">No checklist items found.</div>`;
    return;
  }
  
  container.innerHTML = '';
  filtered.forEach(n => {
    // Actions mapping depending on status
    let actionButtons = '';
    if (n.STATUS === 'pending') {
      actionButtons += `<button class="btn-note-action text-warning" onclick="updateNoteStatus(${n.NOTE_ID}, 'ordered')"><i class="fa-solid fa-truck-fast"></i> Mark Ordered</button>`;
    } else if (n.STATUS === 'ordered') {
      actionButtons += `<button class="btn-note-action text-success" onclick="updateNoteStatus(${n.NOTE_ID}, 'received')"><i class="fa-solid fa-square-check"></i> Mark Received</button>`;
    }
    
    // Always show delete option
    actionButtons += `<button class="btn-note-action text-danger" onclick="deleteNote(${n.NOTE_ID})"><i class="fa-regular fa-trash-can"></i> Delete</button>`;
    
    const qtyBadge = n.QUANTITY ? `<span class="note-qty-badge">${escapeHTML(n.QUANTITY)}</span>` : '';
    
    container.innerHTML += `
      <div class="note-card">
        <div class="note-card-header">
          <div>
            <h4 class="note-card-title">${escapeHTML(n.ITEM_NAME)}</h4>
            ${qtyBadge}
          </div>
          <span class="note-status-badge ${n.STATUS}">${n.STATUS}</span>
        </div>
        <div class="note-card-body">
          <p>${escapeHTML(n.NOTES || 'No additional details.')}</p>
        </div>
        <div class="note-card-footer">
          <span class="text-muted text-xs">Added: ${new Date(n.CREATED_AT).toLocaleDateString()}</span>
          <div class="note-actions">
            ${actionButtons}
          </div>
        </div>
      </div>
    `;
  });
}

async function handleAddNote(e) {
  e.preventDefault();
  const itemName = document.getElementById('note-item-name').value;
  const quantity = document.getElementById('note-quantity').value;
  const notes = document.getElementById('note-text').value;
  
  try {
    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemName, quantity, notes })
    });
    
    const data = await res.json();
    if (res.ok) {
      showToast('Order checklist note saved.');
      document.getElementById('note-item-name').value = '';
      document.getElementById('note-quantity').value = '';
      document.getElementById('note-text').value = '';
      loadNotes();
    } else {
      showToast(data.error || 'Failed to save note.', 'error');
    }
  } catch (err) {
    console.error('Add note error:', err);
    showToast('Failed to save note.', 'error');
  }
}

async function updateNoteStatus(noteId, newStatus) {
  const note = notesChecklist.find(n => n.NOTE_ID === noteId);
  if (!note) return;
  
  const payload = {
    itemName: note.ITEM_NAME,
    quantity: note.QUANTITY,
    notes: note.NOTES,
    status: newStatus
  };
  
  try {
    const res = await fetch(`/api/notes/${noteId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (res.ok) {
      showToast(`Status updated to ${newStatus}`);
      loadNotes();
    } else {
      const data = await res.json();
      showToast(data.error || 'Failed to update note status.', 'error');
    }
  } catch (err) {
    console.error('Update note error:', err);
    showToast('Error changing note status.', 'error');
  }
}

async function deleteNote(noteId) {
  if (!confirm('Are you sure you want to delete this checklist item?')) return;
  
  try {
    const res = await fetch(`/api/notes/${noteId}`, {
      method: 'DELETE'
    });
    
    if (res.ok) {
      showToast('Checklist item deleted.');
      loadNotes();
    } else {
      const data = await res.json();
      showToast(data.error || 'Failed to delete note.', 'error');
    }
  } catch (err) {
    console.error('Delete note error:', err);
    showToast('Error removing checklist item.', 'error');
  }
}

// ================= RECEIPT PREVIEW & ACTIONS =================
let activeReceiptBill = null;
let activeReceiptCanvas = null;
let activeReceiptDataUrl = null;

async function openReceiptModal(billId) {
  try {
    const res = await fetch(`/api/bills/${billId}`);
    if (!res.ok) {
      showToast('Failed to fetch invoice details.', 'error');
      return;
    }
    
    const bill = await res.json();
    activeReceiptBill = bill;
    
    // Fill values
    document.getElementById('receipt-shop-name').textContent = bill.SHOP_NAME.toUpperCase();
    document.getElementById('receipt-shop-place').textContent = bill.PLACE.toUpperCase();
    document.getElementById('receipt-bill-number').textContent = bill.BILL_NUMBER;
    
    const dt = new Date(bill.BILL_DATE);
    const dateFormatted = dt.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    document.getElementById('receipt-bill-date').textContent = dateFormatted;
    
    // Customer Section
    const custSec = document.getElementById('receipt-customer-section');
    if (bill.CUSTOMER_NAME || bill.CUSTOMER_PHONE) {
      custSec.classList.remove('hidden');
      document.getElementById('receipt-customer-name').textContent = bill.CUSTOMER_NAME || 'Walking Client';
      document.getElementById('receipt-customer-phone').textContent = bill.CUSTOMER_PHONE || '-';
    } else {
      custSec.classList.add('hidden');
    }
    
    // Items table
    const tbody = document.getElementById('receipt-items-tbody');
    tbody.innerHTML = '';
    bill.items.forEach(item => {
      tbody.innerHTML += `
        <tr>
          <td align="left">${escapeHTML(item.PRODUCT_NAME)}</td>
          <td align="center">${item.QUANTITY}</td>
          <td align="right">${item.PRICE.toFixed(2)}</td>
          <td align="right">${item.SUBTOTAL.toFixed(2)}</td>
        </tr>
      `;
    });
    
    // Totals
    document.getElementById('receipt-subtotal').textContent = `Rs. ${bill.TOTAL_AMOUNT.toFixed(2)}`;
    document.getElementById('receipt-discount').textContent = `Rs. ${bill.DISCOUNT.toFixed(2)}`;
    document.getElementById('receipt-tax').textContent = `Rs. ${bill.TAX.toFixed(2)}`;
    document.getElementById('receipt-grand-total').textContent = `Rs. ${bill.GRAND_TOTAL.toFixed(2)}`;
    
    // Footer Billed By
    document.getElementById('receipt-billed-by').textContent = bill.CREATED_BY_NAME;
    
    // Prepare elements for capturing
    const printArea = document.getElementById('receipt-print-area');
    const imageContainer = document.getElementById('receipt-image-container');
    
    // Keep print area visible so canvas engine can read dimensions
    printArea.classList.remove('screen-hidden');
    imageContainer.innerHTML = '<div class="text-center text-muted p-4" style="color: var(--text-secondary);"><i class="fa-solid fa-spinner fa-spin mr-2"></i> Generating receipt preview...</div>';
    
    // Show Modal
    document.getElementById('receipt-modal').classList.remove('hidden');
    
    // Delay to let the browser compute fonts/layouts and render the high-fidelity screenshot
    setTimeout(async () => {
      try {
        const canvas = await captureReceiptCanvas();
        const dataUrl = canvas.toDataURL('image/png');
        
        activeReceiptCanvas = canvas;
        activeReceiptDataUrl = dataUrl;
        
        imageContainer.innerHTML = `
          <img src="${dataUrl}" class="receipt-preview-image" style="width: 100%; border: 1px solid var(--border-color); border-radius: var(--border-radius-sm); max-width: 100%; cursor: pointer;">
          <p class="text-center mt-2" style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.4; margin: 0;">
            <i class="fa-solid fa-info-circle text-info"></i> <b>Long-press</b> or <b>Right-click</b> the image to Copy or Save directly!<br>
            Paste (Ctrl+V) directly into WhatsApp.
          </p>
        `;
        
        // Hide print area on screen so user interacts only with preview image
        printArea.classList.add('screen-hidden');
      } catch (err) {
        console.error('Error rendering receipt preview:', err);
        imageContainer.innerHTML = '<div class="text-center text-danger p-4"><i class="fa-solid fa-triangle-exclamation mr-2"></i> Failed to render preview image.</div>';
      }
    }, 300);
  } catch (err) {
    console.error('Receipt modal error:', err);
    showToast('Failed to open receipt.', 'error');
  }
}

function closeReceiptModal() {
  document.getElementById('receipt-modal').classList.add('hidden');
  activeReceiptBill = null;
  activeReceiptCanvas = null;
  activeReceiptDataUrl = null;
}

function printReceipt() {
  window.print();
}

// Generate formatted sharing text
function generateSharingText(bill) {
  const dt = new Date(bill.BILL_DATE);
  const dateFormatted = dt.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  let text = `*INVOICE: ${bill.BILL_NUMBER}*\n`;
  text += `*${bill.SHOP_NAME.toUpperCase()}*\n`;
  text += `Location: ${bill.PLACE}\n`;
  text += `Date: ${dateFormatted}\n`;
  text += `--------------------------------\n`;
  text += `*ITEMS:*\n`;
  
  bill.items.forEach(item => {
    text += `- ${item.PRODUCT_NAME}: ${item.QUANTITY} x Rs.${item.PRICE.toFixed(2)} = Rs.${item.SUBTOTAL.toFixed(2)}\n`;
  });
  
  text += `--------------------------------\n`;
  text += `Subtotal: Rs. ${bill.TOTAL_AMOUNT.toFixed(2)}\n`;
  if (bill.DISCOUNT > 0) text += `Discount: Rs. ${bill.DISCOUNT.toFixed(2)}\n`;
  if (bill.TAX > 0) text += `Tax/GST: Rs. ${bill.TAX.toFixed(2)}\n`;
  text += `*GRAND TOTAL: Rs. ${bill.GRAND_TOTAL.toFixed(2)}*\n`;
  text += `--------------------------------\n`;
  text += `Billed by: ${bill.CREATED_BY_NAME}\n`;
  text += `*Thank you for your business!*`;
  
  return encodeURIComponent(text);
}

// Canvas Receipt capturing helpers
function captureReceiptCanvas() {
  return html2canvas(document.getElementById('receipt-print-area'), {
    scale: 2, // High resolution crisp text rendering
    useCORS: true,
    backgroundColor: '#ffffff'
  });
}

async function uploadReceiptImage(billId, canvas) {
  const imageBase64 = canvas.toDataURL('image/png');
  try {
    const res = await fetch(`/api/bills/${billId}/image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageBase64 })
    });
    if (res.ok) {
      const data = await res.json();
      return data.imageUrl; // Returns static server file path
    }
  } catch (err) {
    console.error('Error uploading receipt screenshot:', err);
  }
  return null;
}

// Shares files native web share on phones/tablets
async function shareReceiptNative(bill, canvas) {
  return new Promise((resolve) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        resolve(false);
        return;
      }
      const file = new File([blob], `receipt_${bill.BILL_NUMBER}.png`, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `Invoice ${bill.BILL_NUMBER}`,
            text: `Receipt from ${bill.SHOP_NAME}.`
          });
          resolve(true);
        } catch (err) {
          console.log('Native share error/cancelled:', err);
          resolve(false);
        }
      } else {
        resolve(false);
      }
    }, 'image/png');
  });
}

function sendTextWhatsApp(bill) {
  const message = generateSharingText(bill);
  const phone = bill.CUSTOMER_PHONE ? bill.CUSTOMER_PHONE.replace(/[^0-9]/g, '') : '';
  const url = phone ? `https://wa.me/${phone}?text=${message}` : `https://wa.me/?text=${message}`;
  window.open(url, '_blank');
}

function sendTextSMS(bill) {
  const message = generateSharingText(bill);
  const phone = bill.CUSTOMER_PHONE ? bill.CUSTOMER_PHONE.replace(/[^0-9]/g, '') : '';
  const url = phone ? `sms:${phone}?body=${message}` : `sms:?body=${message}`;
  window.location.href = url;
}

async function shareWhatsApp() {
  if (!activeReceiptBill || !activeReceiptCanvas) {
    showToast('Receipt preview is still rendering, please wait...', 'warning');
    return;
  }
  showToast('Copying invoice image...', 'info');
  
  try {
    // Copy image directly to Clipboard for desktop/web client pasting
    try {
      const blob = await new Promise(resolve => activeReceiptCanvas.toBlob(resolve, 'image/png'));
      const item = new ClipboardItem({ 'image/png': blob });
      await navigator.clipboard.write([item]);
      showToast('Receipt image copied to clipboard! Paste (Ctrl+V) it in WhatsApp.', 'success');
    } catch (clipErr) {
      console.warn('Clipboard writing not supported or blocked in this context.', clipErr);
    }
    
    // Try browser native share sheet (on mobile/tablets)
    const didShare = await shareReceiptNative(activeReceiptBill, activeReceiptCanvas);
    if (didShare) {
      return;
    }
    
    // Otherwise open WhatsApp Web chat redirect
    const phone = activeReceiptBill.CUSTOMER_PHONE ? activeReceiptBill.CUSTOMER_PHONE.replace(/[^0-9]/g, '') : '';
    const messageText = `*INVOICE: ${activeReceiptBill.BILL_NUMBER}*\n*${activeReceiptBill.SHOP_NAME.toUpperCase()}*\nGrand Total: Rs. ${activeReceiptBill.GRAND_TOTAL.toFixed(2)}\n\n(Please paste Ctrl+V here to send the receipt image)`;
    const url = phone 
      ? `https://wa.me/${phone}?text=${encodeURIComponent(messageText)}` 
      : `https://wa.me/?text=${encodeURIComponent(messageText)}`;
      
    window.open(url, '_blank');
  } catch (err) {
    console.error('WhatsApp share fail:', err);
    sendTextWhatsApp(activeReceiptBill);
  }
}

async function shareSMS() {
  if (!activeReceiptBill || !activeReceiptCanvas) {
    showToast('Receipt preview is still rendering, please wait...', 'warning');
    return;
  }
  showToast('Copying invoice image...', 'info');
  
  try {
    // Copy image directly to Clipboard
    try {
      const blob = await new Promise(resolve => activeReceiptCanvas.toBlob(resolve, 'image/png'));
      const item = new ClipboardItem({ 'image/png': blob });
      await navigator.clipboard.write([item]);
      showToast('Receipt image copied to clipboard! Paste (Ctrl+V) it in SMS.', 'success');
    } catch (clipErr) {
      console.warn('Clipboard writing not supported or blocked in this context.', clipErr);
    }
    
    const didShare = await shareReceiptNative(activeReceiptBill, activeReceiptCanvas);
    if (didShare) {
      return;
    }
    
    const phone = activeReceiptBill.CUSTOMER_PHONE ? activeReceiptBill.CUSTOMER_PHONE.replace(/[^0-9]/g, '') : '';
    const messageText = `Invoice: ${activeReceiptBill.BILL_NUMBER}\nShop: ${activeReceiptBill.SHOP_NAME}\nTotal: Rs. ${activeReceiptBill.GRAND_TOTAL.toFixed(2)}\n\n(Please paste the copied receipt image here)`;
    const url = phone 
      ? `sms:${phone}?body=${encodeURIComponent(messageText)}` 
      : `sms:?body=${encodeURIComponent(messageText)}`;
      
    window.location.href = url;
  } catch (err) {
    console.error('SMS share fail:', err);
    sendTextSMS(activeReceiptBill);
  }
}

async function downloadReceiptImage() {
  if (!activeReceiptBill || !activeReceiptCanvas) {
    showToast('Receipt preview is still rendering, please wait...', 'warning');
    return;
  }
  showToast('Saving receipt download...', 'info');
  
  try {
    // Convert canvas directly to binary Blob to prevent data URL truncation/corruption bugs in browsers
    activeReceiptCanvas.toBlob((blob) => {
      if (!blob) {
        showToast('Failed to generate receipt image file.', 'error');
        return;
      }
      
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const cleanNum = activeReceiptBill.BILL_NUMBER.replace(/[^a-zA-Z0-9-]/g, '_');
      
      link.download = `receipt_${cleanNum}.png`;
      link.href = blobUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Revoke the object URL after download starts to free system memory
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      showToast('Receipt PNG downloaded successfully!');
    }, 'image/png');
  } catch (err) {
    console.error('Capture download error:', err);
    showToast('Failed to generate PNG file download.', 'error');
  }
}

// Quick Share action directly from bills history list
async function quickShareWhatsApp(billId) {
  try {
    const res = await fetch(`/api/bills/${billId}`);
    if (res.ok) {
      const bill = await res.json();
      sendTextWhatsApp(bill);
    } else {
      showToast('Error sharing bill details.', 'error');
    }
  } catch (err) {
    console.error('Quick share error:', err);
    showToast('Failed to share invoice.', 'error');
  }
}

// ================= UTILITY ESCAPERS =================
function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
