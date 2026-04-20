// ============================================================
//  Bookstore Frontend
// ============================================================

// Firebase Cloud Functions base URL
const FIREBASE_PROJECT_ID = "onlinebookstore-880c4";
const FIREBASE_REGION = "us-central1";
const API_BASE = `https://${FIREBASE_REGION}-${FIREBASE_PROJECT_ID}.cloudfunctions.net`;

// API routing helper
const API = {
  books: {
    get: () => `${API_BASE}/booksGet`,
    create: () => `${API_BASE}/bookAdd`,
    update: () => `${API_BASE}/bookUpdate`,
    delete: () => `${API_BASE}/bookDelete`
  },
  orders: {
    get: () => `${API_BASE}/ordersGet`,
    create: () => `${API_BASE}/orderPlace`,
    updateStatus: () => `${API_BASE}/orderStatusUpdate`
  },
  users: {
    register: () => `${API_BASE}/userRegister`,
    get: () => `${API_BASE}/userGet`,
    update: () => `${API_BASE}/userUpdate`,
    delete: () => `${API_BASE}/userDelete`
  },
  wishlist: {
    get: () => `${API_BASE}/wishlistGet`,
    add: () => `${API_BASE}/wishlistAdd`,
    remove: () => `${API_BASE}/wishlistRemove`
  }
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBSi10Wf6e8g0QmxLZJMzNZNny2UwQRSyA",
  authDomain: "onlinebookstore-880c4.firebaseapp.com",
  projectId: "onlinebookstore-880c4",
  storageBucket: "onlinebookstore-880c4.firebasestorage.app",
  messagingSenderId: "537120441943",
  appId: "1:537120441943:web:17b8beabe1911e609d4512",
  measurementId: "G-L96T2C9V89"
};

console.log("Firebase config loaded:", firebaseConfig);

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const DEBUG_API = true;
function debugLog(...args) {
  if (DEBUG_API && console && console.debug) {
    console.debug("[Bookstore DEBUG]", ...args);
  }
}

async function debugFetch(name, url, options = {}) {
  debugLog("Request", name, { url, options });
  const res = await fetch(url, options);
  const contentType = res.headers.get("content-type") || "";
  let body = null;
  try {
    if (contentType.includes("application/json")) {
      body = await res.clone().json();
    } else {
      body = await res.clone().text();
    }
  } catch (err) {
    body = "<unavailable>";
  }
  debugLog("Response", name, { url, status: res.status, ok: res.ok, body });
  return res;
}

window.debugLog = debugLog;
window.DEBUG_API = DEBUG_API;

let currentUser = null;
let activeView = "home";
let activeTab = "login";
let categoryFilter = "";
let searchQuery = "";
let cart = JSON.parse(localStorage.getItem('bookstore-cart') || '[]'); // Array of {bookId, title, author, price, quantity}
let wishlist = [];

const $ = id => document.getElementById(id);

function showToast(message) {
  const toast = $("toast");
  toast.innerText = message;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 3000);
}

function toggleAuthState(user) {
  const loggedOut = $("auth-logged-out");
  const loggedIn = $("auth-logged-in");
  const greeting = $("user-greeting");
  const addBookBtn = $("add-book-btn");

  if (user) {
    loggedOut.classList.add("hidden");
    loggedIn.classList.remove("hidden");
    greeting.innerText = `Hi, ${user.email}`;
    if (addBookBtn) addBookBtn.classList.remove("hidden");
  } else {
    loggedOut.classList.remove("hidden");
    loggedIn.classList.add("hidden");
    greeting.innerText = "";
    if (addBookBtn) addBookBtn.classList.add("hidden");
  }
}

function updateCartCount() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartCount = $("cart-count");
  cartCount.innerText = `(${count})`;
  cartCount.style.display = count > 0 ? "inline" : "none";
  localStorage.setItem('bookstore-cart', JSON.stringify(cart));
}

function updateWishlistCount() {
  const count = wishlist.length;
  const wishlistCount = $("wishlist-count");
  if (!wishlistCount) return;
  wishlistCount.innerText = `(${count})`;
  wishlistCount.style.display = count > 0 ? "inline" : "none";
}

function addToCart(bookId, title, author, price) {
  const existingItem = cart.find(item => item.bookId === bookId);
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({ bookId, title, author, price, quantity: 1 });
  }
  updateCartCount();
  showToast(`${title} added to cart.`);
}

function removeFromCart(bookId) {
  cart = cart.filter(item => item.bookId !== bookId);
  updateCartCount();
  renderCart();
}

function updateCartQuantity(bookId, newQuantity) {
  if (newQuantity <= 0) {
    removeFromCart(bookId);
    return;
  }
  const item = cart.find(item => item.bookId === bookId);
  if (item) {
    item.quantity = newQuantity;
    updateCartCount();
    renderCart();
  }
}

window.removeFromCart = removeFromCart;
window.updateCartQuantity = updateCartQuantity;

function renderCart() {
  const cartList = $("cart-list");
  const cartTotal = $("cart-total");
  const totalAmount = $("cart-total-amount");

  if (!cart.length) {
    cartList.innerHTML = `<p class="empty-state">Your cart is empty.</p>`;
    cartTotal.classList.add("hidden");
    return;
  }

  cartList.innerHTML = "";
  let total = 0;

  cart.forEach(item => {
    const subtotal = item.price * item.quantity;
    total += subtotal;

    const itemDiv = document.createElement("div");
    itemDiv.className = "cart-item";
    itemDiv.innerHTML = `
      <div class="cart-item-info">
        <h4>${item.title}</h4>
        <p>${item.author}</p>
        <p>₹${item.price} each</p>
      </div>
      <div class="cart-item-controls">
        <button class="btn btn-sm" onclick="updateCartQuantity('${item.bookId}', ${item.quantity - 1})">-</button>
        <span>${item.quantity}</span>
        <button class="btn btn-sm" onclick="updateCartQuantity('${item.bookId}', ${item.quantity + 1})">+</button>
        <button class="btn btn-outline btn-sm" onclick="removeFromCart('${item.bookId}')">Remove</button>
      </div>
      <div class="cart-item-total">₹${subtotal}</div>
    `;
    cartList.appendChild(itemDiv);
  });

  totalAmount.innerText = total;
  cartTotal.classList.remove("hidden");
}

async function checkout() {
  if (!currentUser) {
    showToast("Please log in to place an order.");
    openModal("modal-auth");
    setActiveTab("login");
    return;
  }

  if (!cart.length) {
    showToast("Your cart is empty.");
    return;
  }

  try {
    const items = cart.map(item => ({
      book_id: item.bookId,
      quantity: item.quantity
    }));

    const res = await fetch(API.orders.create(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: currentUser.uid,
        items
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Unable to place order.");

    showToast(`Order placed! Total ₹${data.total}`);
    cart = [];
    updateCartCount();
    renderCart();
    switchView("orders");
  } catch (err) {
    showToast(err.message);
  }
}

function openModal(modalId) {
  $(modalId).classList.remove("hidden");
}

function closeModal(modalId) {
  $(modalId).classList.add("hidden");
}

// Expose helpers globally so module scope doesn't break inline event handlers / old deployments.
window.closeModal = closeModal;
window.openModal = openModal;

function setActiveTab(tab) {
  activeTab = tab;
  const loginTab = document.querySelector(".auth-tab[data-tab='login']");
  const signupTab = document.querySelector(".auth-tab[data-tab='signup']");
  const nameField = $("signup-name-field");
  const submitBtn = $("auth-submit-btn");

  if (tab === "login") {
    loginTab.classList.add("active");
    signupTab.classList.remove("active");
    nameField.classList.add("hidden");
    submitBtn.innerText = "Log In";
  } else {
    loginTab.classList.remove("active");
    signupTab.classList.add("active");
    nameField.classList.remove("hidden");
    submitBtn.innerText = "Sign Up";
  }
}

async function fetchBooks() {
  try {
    const params = new URLSearchParams();
    if (categoryFilter) params.set("category", categoryFilter);
    if (searchQuery) params.set("search", searchQuery);

    const res = await debugFetch("booksGet", `${API.books.get()}?${params.toString()}`);
    if (!res.ok) throw new Error("Unable to load books");

    const books = await res.json();
    const grid = $("books-grid");
    grid.innerHTML = "";

    if (!books.length) {
      grid.innerHTML = `<p class="empty-state">No books found.</p>`;
      return;
    }

    books.forEach(book => {
      const card = document.createElement("article");
      card.className = "book-card";
      card.innerHTML = `
        <div class="book-card-body">
          <h3>${book.title}</h3>
          <p class="book-author">${book.author || "Unknown author"}</p>
          <p class="book-price">₹${book.price}</p>
          <div class="book-card-actions">
            <button class="btn btn-primary" data-book-id="${book.id}" data-title="${book.title}" data-author="${book.author}" data-price="${book.price}">Add to Cart</button>
            <button class="btn btn-secondary btn-sm" data-wishlist-book-id="${book.id}" data-title="${book.title}">❤️ Wishlist</button>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });

    grid.querySelectorAll("button[data-book-id]").forEach(button => {
      button.addEventListener("click", () => {
        const bookId = button.dataset.bookId;
        const title = button.dataset.title;
        const author = button.dataset.author;
        const price = parseFloat(button.dataset.price);
        addToCart(bookId, title, author, price);
      });
    });

    grid.querySelectorAll("button[data-wishlist-book-id]").forEach(button => {
      button.addEventListener("click", () => {
        const bookId = button.dataset.wishlistBookId;
        const title = button.dataset.title;
        addToWishlist(bookId, title);
      });
    });
  } catch (err) {
    showToast(err.message);
  }
}

async function fetchWishlist() {
  const wishlistList = $("wishlist-list");
  wishlistList.innerHTML = "";

  if (!currentUser) {
    wishlistList.innerHTML = `<p class="empty-state">Please log in to view your wishlist.</p>`;
    return;
  }

  try {
    const res = await debugFetch("wishlistGet", `${API.wishlist.get()}?user_id=${currentUser.uid}`);
    if (!res.ok) throw new Error("Unable to load wishlist");

    const items = await res.json();
    wishlist = items;
    updateWishlistCount();

    if (!items.length) {
      wishlistList.innerHTML = `<p class="empty-state">Your wishlist is empty.</p>`;
      return;
    }

    items.forEach(item => {
      const book = item.book || {};
      const card = document.createElement("article");
      card.className = "book-card";
      card.innerHTML = `
        <div class="book-card-body">
          <h3>${book.title || "Unknown title"}</h3>
          <p class="book-author">${book.author || "Unknown author"}</p>
          <p class="book-price">₹${book.price || 0}</p>
          <button class="btn btn-outline btn-sm" data-remove-wishlist-book-id="${item.book_id}">Remove</button>
        </div>
      `;
      wishlistList.appendChild(card);
    });

    wishlistList.querySelectorAll("button[data-remove-wishlist-book-id]").forEach(button => {
      button.addEventListener("click", () => {
        removeFromWishlist(button.dataset.removeWishlistBookId);
      });
    });
  } catch (err) {
    showToast(err.message);
  }
}

async function addToWishlist(bookId, title) {
  if (!currentUser) {
    showToast("Please log in to add to wishlist.");
    openModal("modal-auth");
    setActiveTab("login");
    return;
  }

  try {
    const res = await debugFetch("wishlistAdd", API.wishlist.add(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: currentUser.uid, book_id: bookId })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.message || "Unable to add to wishlist.");

    showToast(`${title} added to wishlist.`);
    if (activeView === "wishlist") {
      fetchWishlist();
    } else {
      wishlist.push({ book_id: bookId });
      updateWishlistCount();
    }
  } catch (err) {
    showToast(err.message);
  }
}

async function removeFromWishlist(bookId) {
  if (!currentUser) {
    showToast("Please log in to manage your wishlist.");
    return;
  }

  try {
    const res = await debugFetch("wishlistRemove", `${API.wishlist.remove()}?user_id=${currentUser.uid}&book_id=${bookId}`, {
      method: "DELETE"
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.message || "Unable to remove from wishlist.");

    showToast("Removed from wishlist.");
    fetchWishlist();
  } catch (err) {
    showToast(err.message);
  }
}

async function fetchOrders() {
  const ordersList = $("orders-list");
  ordersList.innerHTML = "";

  if (!currentUser) {
    ordersList.innerHTML = `<p class="empty-state">Please log in to view your orders.</p>`;
    return;
  }

  try {
    const res = await debugFetch("ordersGet", `${API.orders.get()}?user_id=${currentUser.uid}`);
    if (!res.ok) throw new Error("Unable to load orders");

    const orders = await res.json();
    if (!orders.length) {
      ordersList.innerHTML = `<p class="empty-state">No orders yet.</p>`;
      return;
    }

    orders.forEach(order => {
      const item = document.createElement("div");
      item.className = "order-card";
      item.innerHTML = `
        <h3>Order ${order.id}</h3>
        <p>Total: ?${order.total}</p>
        <p>Status: ${order.status}</p>
        <p>Items: ${order.items.length}</p>
      `;
      ordersList.appendChild(item);
    });
  } catch (err) {
    showToast(err.message);
  }
}

async function submitAuthForm(event) {
  event.preventDefault();

  const email = $("auth-email").value.trim();
  const password = $("auth-password").value.trim();
  const name = $("auth-name").value.trim();

  if (!email || !password) {
    showToast("Email and password are required.");
    return;
  }

  try {
    if (activeTab === "login") {
      await signInWithEmailAndPassword(auth, email, password);
      showToast("Logged in successfully.");
    } else {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await debugFetch("userRegister", API.users.register(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: cred.user.uid,
          email,
          name: name || email.split("@")[0]
        })
      });
      showToast("Account created successfully.");
    }

    closeModal("modal-auth");
    $("auth-form").reset();
  } catch (err) {
    const message = err.code
      ? `${err.code}: ${err.message}`
      : err.message || "Authentication failed.";
    console.error("Auth error", err);
    showToast(message);
  }
}

async function signOutUser() {
  try {
    await signOut(auth);
    showToast("Logged out.");
    fetchOrders();
  } catch (err) {
    showToast(err.message);
  }
}

async function handleAddBookSubmit(event) {
  event.preventDefault();

  const title = $("book-title").value.trim();
  const author = $("book-author").value.trim();
  const price = parseFloat($("book-price").value);
  const category = $("book-category").value.trim();
  const stock = parseInt($("book-stock").value, 10);
  const description = $("book-description").value.trim();
  const image_url = $("book-image").value.trim();

  if (!title || !author || !category || Number.isNaN(price)) {
    showToast("Title, author, category, and price are required.");
    return;
  }

  try {
const res = await debugFetch("bookAdd", API.books.create(), {
       method: "POST",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify({
         title,
         author,
         price,
         category,
         stock: Number.isNaN(stock) ? 0 : stock,
         description,
         image_url: image_url || null
       })
     });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Unable to add book.");
    }

    showToast("Book added successfully.");
    closeModal("modal-add-book");
    $("add-book-form").reset();
    fetchBooks();
  } catch (err) {
    showToast(err.message || "Failed to add book.");
  }
}

function switchView(view) {
  activeView = view;
  $("view-home").classList.toggle("hidden", view !== "home");
  $("view-cart").classList.toggle("hidden", view !== "cart");
  $("view-wishlist").classList.toggle("hidden", view !== "wishlist");
  $("view-orders").classList.toggle("hidden", view !== "orders");
  document.querySelectorAll(".nav-link").forEach(link => {
    link.classList.toggle("active", link.dataset.view === view);
  });

  if (view === "cart") {
    renderCart();
  } else if (view === "wishlist") {
    fetchWishlist();
  } else if (view === "orders") {
    fetchOrders();
  }
}

function init() {
  $("login-btn").addEventListener("click", () => { openModal("modal-auth"); setActiveTab("login"); });
  $("signup-btn").addEventListener("click", () => { openModal("modal-auth"); setActiveTab("signup"); });
  $("logout-btn").addEventListener("click", signOutUser);
  $("add-book-btn").addEventListener("click", () => openModal("modal-add-book"));
  $("close-auth-modal").addEventListener("click", () => closeModal("modal-auth"));
  $("close-book-modal").addEventListener("click", () => closeModal("modal-book"));
  $("close-add-book-modal").addEventListener("click", () => closeModal("modal-add-book"));
  $("auth-form").addEventListener("submit", submitAuthForm);
  $("add-book-form").addEventListener("submit", handleAddBookSubmit);
  $("checkout-btn").addEventListener("click", checkout);

  document.querySelectorAll(".auth-tab").forEach(tab => {
    tab.addEventListener("click", () => setActiveTab(tab.dataset.tab));
  });

  document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", event => { event.preventDefault(); switchView(link.dataset.view); });
  });

  $("search-btn").addEventListener("click", () => {
    searchQuery = $("search-input").value.trim();
    fetchBooks();
  });

  document.querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      categoryFilter = chip.dataset.cat || "";
      fetchBooks();
    });
  });

  onAuthStateChanged(auth, user => {
    currentUser = user;
    toggleAuthState(user);

    if (!user) {
      wishlist = [];
      updateWishlistCount();
    }

    if (activeView === "orders") {
      fetchOrders();
    }

    if (user) {
      fetchWishlist();
    }
  });

  updateCartCount();
  fetchBooks();
}

init();
