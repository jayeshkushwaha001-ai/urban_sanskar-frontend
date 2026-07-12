document.addEventListener("DOMContentLoaded", async function () {
    // 🔥 CONFIGURATION: Same port as collections.js
    const API_BASE_URL = "https://urban-sanskar-backend.onrender.com";

    const cartContainer = document.querySelector(".cart-items-wrapper");
    const subtotalElement = document.getElementById("cart-subtotal");
    const savingsRow = document.getElementById("summary-savings-row"); // New Row Ref
    const savingsElement = document.getElementById("cart-savings");   // New Span Ref
    const shippingElement = document.getElementById("cart-shipping");
    const totalElement = document.getElementById("cart-total");
    const checkoutBtn = document.getElementById("proceed-to-checkout-btn");

    // CONFIGURATION RULES
    const FREE_SHIPPING_THRESHOLD = 4999;
    const PAN_INDIA_FLAT_RATE = 99;

    // Global reference taaki billing engine bhi ise directly access kar sake
    let liveProducts = [];

    // 🔥 LIVE STOCK & SALE CHECK ENGINE (ASYNC RENDER)
    async function renderCart() {
        let cart = JSON.parse(localStorage.getItem("urbanCart")) || [];

        if (cart.length === 0) {
            cartContainer.innerHTML = `
            <div style="text-align:center; padding: 60px 20px;">
                <h2 style="font-family:sans-serif; font-weight: 400;">Your Bag is Empty</h2>
                <p style="color:#666; margin-bottom:20px; font-family:sans-serif;">Explore our premium collections to add items.</p>
                <a href="collections.html" style="background:#000; color:#fff; padding:12px 25px; text-decoration:none; display:inline-block; font-family:sans-serif; text-transform:uppercase; font-size:0.85rem; letter-spacing:1px;">Shop Now</a>
            </div>
        `;
            updateSummary("₹0", "₹0", "₹0");
            if (savingsRow) savingsRow.style.display = "none";

            if (checkoutBtn) {
                checkoutBtn.disabled = true;
                checkoutBtn.textContent = "Proceed To Checkout";
                checkoutBtn.style.background = "#999";
                checkoutBtn.style.cursor = "not-allowed";
            }
            return;
        }

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
        let hasSoldOutItems = false;

        cart.forEach(item => {
            const liveProduct = liveProducts.find(p => p._id === item.productId);

            // 🛡️ CRITICAL FIX: LocalStorage ke kachra price ko bypass karke DB ka sahi price uthao
            const actualPrice = liveProduct ? liveProduct.price : item.price;
            let itemTotal = actualPrice * item.quantity;

            const isItemSoldOut = liveProduct ? liveProduct.isSoldOut === true : false;
            if (isItemSoldOut) hasSoldOutItems = true;

            const isOnSale = liveProduct && liveProduct.mrpPrice && liveProduct.mrpPrice > actualPrice;
            let priceDisplay = "";

            if (isOnSale) {
                const discountPercent = Math.round(((liveProduct.mrpPrice - actualPrice) / liveProduct.mrpPrice) * 100);
                priceDisplay = `
                <span style="text-decoration: line-through; color: #999; margin-right: 10px; font-size: 0.9rem;">₹${liveProduct.mrpPrice.toLocaleString('en-IN')}</span>
                <span style="font-weight: 600; color: #111; margin-right: 10px; font-size: 1.05rem;">₹${actualPrice.toLocaleString('en-IN')}</span>
                <span style="background: #e8f5e9; color: #2e7d32; font-size: 0.75rem; padding: 2px 6px; border-radius: 4px; font-weight: 600; display: inline-block;">${discountPercent}% OFF</span>
            `;
            } else {
                priceDisplay = `<span style="font-weight: 600; color: #111; font-size: 1.05rem;">₹${actualPrice.toLocaleString('en-IN')}</span>`;
            }

            cartHTML += `
            <div class="cart-item-row" data-id="${item.id}" style="${isItemSoldOut ? 'border-left: 3px solid #cc0000; background: #fffcfc;' : ''}">
                <div class="item-main-info" style="${isItemSoldOut ? 'opacity: 0.75;' : ''}">
                    <img src="${item.image}" alt="${item.title}" width="80" height="100" style="cursor:pointer; object-fit:cover;" onclick="window.location.href='product-detail.html?id=${item.productId}'">
                    <div>
                        <h4 style="margin:0 0 5px 0; font-size:1rem; letter-spacing:0.05em; cursor:pointer;" onclick="window.location.href='product-detail.html?id=${item.productId}'">${item.title}</h4>
                        <p style="margin:0 0 8px 0; color:#777; font-size:0.85rem;">Size: <span style="color:#000; font-weight:500;">${item.size}</span></p>
                        <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 4px;">
                            ${priceDisplay}
                        </div>
                        ${isItemSoldOut ? `<p style="color: #cc0000; margin: 8px 0 0 0; font-weight: 600; font-size: 0.8rem; text-transform: uppercase;">⚠️ OUT OF STOCK</p>` : ''}
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
                <button class="remove-item-btn">✕</button>
            </div>
        `;
        });

        cartContainer.innerHTML = cartHTML;

        if (checkoutBtn) {
            if (hasSoldOutItems) {
                checkoutBtn.disabled = true;
                checkoutBtn.style.background = "#666";
            } else {
                checkoutBtn.disabled = false;
                checkoutBtn.style.background = "#a3b19b";
            }
        }

        setupQuantityControls();
        calculateBill();
    }

    // 4. AUTOMATIC BILLING LOGIC WITH FORMATTING & SAVINGS TRACKER
    function calculateBill() {
        let cart = JSON.parse(localStorage.getItem("urbanCart")) || [];

        let subtotal = 0;
        let totalSavings = 0;

        cart.forEach(item => {
            const liveProduct = liveProducts.find(p => p._id === item.productId);
            // 🛡️ Safe Variable Override
            const actualPrice = liveProduct ? liveProduct.price : item.price;

            subtotal += (actualPrice * item.quantity);

            if (liveProduct && liveProduct.mrpPrice && liveProduct.mrpPrice > actualPrice) {
                totalSavings += (liveProduct.mrpPrice - actualPrice) * item.quantity;
            }
        });

        if (subtotalElement) subtotalElement.textContent = `₹${subtotal.toLocaleString('en-IN')}`;

        if (totalSavings > 0 && savingsRow && savingsElement) {
            savingsElement.textContent = `-₹${totalSavings.toLocaleString('en-IN')}`;
            savingsRow.style.display = "flex";
        } else if (savingsRow) {
            savingsRow.style.display = "none";
        }

        if (subtotal >= FREE_SHIPPING_THRESHOLD) {
            if (shippingElement) { shippingElement.textContent = "FREE"; shippingElement.style.color = "green"; }
            if (totalElement) totalElement.textContent = `₹${subtotal.toLocaleString('en-IN')}`;
        } else {
            if (shippingElement) { shippingElement.textContent = `₹${PAN_INDIA_FLAT_RATE}`; shippingElement.style.color = "#000"; }
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
