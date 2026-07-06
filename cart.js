document.addEventListener("DOMContentLoaded", async function () {
    // 🔥 CONFIGURATION: Same port as collections.js
    const API_BASE_URL = "https://urban-sanskar-backend.onrender.com";

    const cartContainer = document.querySelector(".cart-items-wrapper");
    const subtotalElement = document.getElementById("cart-subtotal");
    const shippingElement = document.getElementById("cart-shipping");
    const totalElement = document.getElementById("cart-total");
    const checkoutBtn = document.getElementById("proceed-to-checkout-btn");

    // CONFIGURATION RULES
    const FREE_SHIPPING_THRESHOLD = 4999;
    const PAN_INDIA_FLAT_RATE = 99;

    // 🔥 LIVE STOCK CHECK ENGINE (ASYNC RENDER)
    async function renderCart() {
        let cart = JSON.parse(localStorage.getItem("urbanCart")) || [];

        // 1. CHECK IF CART IS EMPTY
        if (cart.length === 0) {
            cartContainer.innerHTML = `
                <div style="text-align:center; padding: 60px 20px;">
                    <h2 style="font-family:sans-serif; font-weight: 400;">Your Bag is Empty</h2>
                    <p style="color:#666; margin-bottom:20px; font-family:sans-serif;">Explore our premium collections to add items.</p>
                    <a href="collections.html" style="background:#000; color:#fff; padding:12px 25px; text-decoration:none; display:inline-block; font-family:sans-serif; text-transform:uppercase; font-size:0.85rem; letter-spacing:1px;">Shop Now</a>
                </div>
            `;
            updateSummary("₹0", "₹0", "₹0");

            if (checkoutBtn) {
                checkoutBtn.disabled = true;
                checkoutBtn.textContent = "Proceed To Checkout";
                checkoutBtn.style.background = "#999";
                checkoutBtn.style.cursor = "not-allowed";
            }
            return;
        }

        // Fetch live product updates from database to verify stock status
        let liveProducts = [];
        try {
            const res = await fetch(`${API_BASE_URL}/api/products`);
            const data = await res.json();
            if (data.success && data.products) {
                liveProducts = data.products;
            }
        } catch (err) {
            console.error("Live stock validation fetch failed:", err);
        }

        let cartHTML = "";
        let hasSoldOutItems = false; // Flag to track out-of-stock items

        // 2. RENDER PRODUCTS WITH LIVE INVENTORY GUARD
        cart.forEach(item => {
            let itemTotal = item.price * item.quantity;

            // Find match in live DB list
            const liveProduct = liveProducts.find(p => p._id === item.productId);
            const isItemSoldOut = liveProduct ? liveProduct.isSoldOut === true : false;

            if (isItemSoldOut) {
                hasSoldOutItems = true;
            }

            cartHTML += `
                <div class="cart-item-row" data-id="${item.id}" style="${isItemSoldOut ? 'border-left: 3px solid #cc0000; background: #fffcfc;' : ''}">
                    <div class="item-main-info" style="${isItemSoldOut ? 'opacity: 0.75;' : ''}">
                        <img src="${item.image}" alt="${item.title}" width="80" height="100" style="cursor:pointer; object-fit:cover;" onclick="window.location.href='product-detail.html?id=${item.productId}'">
                        <div>
                            <h4 style="margin:0 0 5px 0; font-size:1rem; letter-spacing:0.05em; cursor:pointer;" onclick="window.location.href='product-detail.html?id=${item.productId}'">${item.title}</h4>
                            <p style="margin:0 0 5px 0; color:#777; font-size:0.85rem;">Size: <span style="color:#000; font-weight:500;">${item.size}</span></p>
                            <p style="margin:0; font-weight:600; font-size:0.95rem;">₹${item.price.toLocaleString('en-IN')}</p>
                            
                            ${isItemSoldOut ? `
                                <p style="color: #cc0000; margin: 8px 0 0 0; font-weight: 600; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em;">
                                    ⚠️ OUT OF STOCK - Please remove to checkout
                                </p>
                            ` : ''}
                        </div>
                    </div>
                    <div class="item-qty-actions" style="${isItemSoldOut ? 'opacity: 0.5; pointer-events: none;' : ''}">
                        <div style="display:flex; align-items:center; gap:12px;">
                            <button class="qty-btn minus-qty">-</button>
                            <span style="font-weight:600; font-size:0.95rem;">${item.quantity}</span>
                            <button class="qty-btn plus-qty">+</button>
                        </div>
                        <div class="item-row-total">₹${itemTotal.toLocaleString('en-IN')}</div>
                    </div>
                    <button class="remove-item-btn" style="color: ${isItemSoldOut ? '#cc0000' : '#000'}">✕</button>
                </div>
            `;
        });

        cartContainer.innerHTML = cartHTML;

        // 3. CHECKOUT BUTTON SAFETY ENFORCEMENT
        if (checkoutBtn) {
            if (hasSoldOutItems) {
                checkoutBtn.disabled = true;
                checkoutBtn.textContent = "Remove Out of Stock Items";
                checkoutBtn.style.background = "#666666";
                checkoutBtn.style.cursor = "not-allowed";
            } else {
                checkoutBtn.disabled = false;
                checkoutBtn.textContent = "Proceed To Checkout";
                checkoutBtn.style.background = "#000000";
                checkoutBtn.style.cursor = "pointer";
            }
        }

        setupQuantityControls();
        calculateBill();
    }

    // 4. AUTOMATIC BILLING LOGIC WITH FORMATTING
    function calculateBill() {
        let cart = JSON.parse(localStorage.getItem("urbanCart")) || [];
        let subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        if (subtotalElement) subtotalElement.textContent = `₹${subtotal.toLocaleString('en-IN')}`;

        if (subtotal >= FREE_SHIPPING_THRESHOLD) {
            if (shippingElement) {
                shippingElement.textContent = "FREE";
                shippingElement.style.color = "green";
            }
            if (totalElement) totalElement.textContent = `₹${subtotal.toLocaleString('en-IN')}`;
        } else {
            if (shippingElement) {
                shippingElement.textContent = `₹${PAN_INDIA_FLAT_RATE}`;
                shippingElement.style.color = "#000";
            }
            if (totalElement) totalElement.textContent = `₹${(subtotal + PAN_INDIA_FLAT_RATE).toLocaleString('en-IN')}`;
        }
    }

    function setupQuantityControls() {
        document.querySelectorAll(".plus-qty").forEach(btn => {
            btn.onclick = function () {
                let cart = JSON.parse(localStorage.getItem("urbanCart")) || [];
                const id = this.closest(".cart-item-row").getAttribute("data-id");
                const index = cart.findIndex(item => item.id === id);
                if (index > -1) {
                    cart[index].quantity += 1;
                    saveAndRefresh(cart);
                }
            };
        });

        document.querySelectorAll(".minus-qty").forEach(btn => {
            btn.onclick = function () {
                let cart = JSON.parse(localStorage.getItem("urbanCart")) || [];
                const id = this.closest(".cart-item-row").getAttribute("data-id");
                const index = cart.findIndex(item => item.id === id);
                if (index > -1) {
                    if (cart[index].quantity > 1) {
                        cart[index].quantity -= 1;
                    } else {
                        cart.splice(index, 1);
                    }
                    saveAndRefresh(cart);
                }
            };
        });

        document.querySelectorAll(".remove-item-btn").forEach(btn => {
            btn.onclick = function () {
                let cart = JSON.parse(localStorage.getItem("urbanCart")) || [];
                const id = this.closest(".cart-item-row").getAttribute("data-id");
                cart = cart.filter(item => item.id !== id);
                saveAndRefresh(cart);
            };
        });
    }

    function saveAndRefresh(updatedCart) {
        localStorage.setItem("urbanCart", JSON.stringify(updatedCart));
        renderCart();
        if (typeof updateGlobalCartBadge === 'function') {
            updateGlobalCartBadge();
        }
    }

    function updateSummary(sub, ship, tot) {
        if (subtotalElement) subtotalElement.textContent = sub;
        if (shippingElement) shippingElement.textContent = ship;
        if (totalElement) totalElement.textContent = tot;
    }

    if (checkoutBtn) {
        checkoutBtn.addEventListener("click", function () {
            window.location.href = "checkout.html";
        });
    }

    // Initial Execution
    await renderCart();
});