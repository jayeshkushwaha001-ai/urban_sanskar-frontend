// 1. DYNAMIC DATA ARRAY - Isko upar hi rehne do
let collectionsProductsList = [];

// 2. SAFELY EXECUTE ENGINE ONCE DOM IS READY
document.addEventListener('DOMContentLoaded', async () => {

    // 🔥 API_BASE_URL ko global se hata kar is block ke andar daal diya!
    // Isse app.js waale variable se iska koi lafda nahi hoga.
    const API_BASE_URL = "https://urban-sanskar-backend.onrender.com";

    const productsGrid = document.getElementById('products-grid');
    const filterChips = document.querySelectorAll('.filter-chip');

    if (!productsGrid) return; // Fail-safe fallback

    // FUNCTION TO RENDER THE GRID CARDS (DB Schema Compatible)
    function displayProducts(productsToRender) {
        productsGrid.innerHTML = "";

        if (productsToRender.length === 0) {
            productsGrid.innerHTML = `<div class="no-products-msg"><p>No items found in this curation.</p></div>`;
            return;
        }

        productsToRender.forEach(product => {
            const primaryImg = product.images && product.images[0] ? product.images[0].replace('/upload/', '/upload/f_auto,q_auto,w_500/') : 'images/default.jpg';
            const secondaryImg = product.images && product.images[1] ? product.images[1].replace('/upload/', '/upload/f_auto,q_auto,w_500/') : primaryImg;
            const displayTag = product.collectionTag || "";

            // 🔥 STEP 2 FIX: Check if product is sold out
            const isSoldOut = product.isSoldOut === true;

            // ✨ NEW FIX: Check if product is on SALE (MRP vs Selling Price)
            const isOnSale = product.mrpPrice && product.mrpPrice > product.price;
            
            // Dynamic price string compilation
            const priceDisplay = isOnSale 
                ? `<span style="text-decoration: line-through; color: #999; margin-right: 8px; font-size: 0.85rem; font-weight: normal;">₹${product.mrpPrice.toLocaleString('en-IN')}</span><span style="font-weight: 700; color: #111;">₹${product.price.toLocaleString('en-IN')}</span>`
                : `₹${product.price.toLocaleString('en-IN')}`;

            // Sold Out Ribbon/Overlay Template
            const soldOutOverlay = isSoldOut ? `
                <div class="sold-out-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(255, 255, 255, 0.2); display: flex; align-items: center; justify-content: center; z-index: 3; pointer-events: none;">
                    <span style="background: rgba(34, 34, 34, 0.85); color: #ffffff; padding: 6px 14px; font-size: 0.7rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; border-radius: 2px; backdrop-filter: blur(2px);">Sold Out</span>
                </div>
            ` : '';

            const cardHTML = `
                <div class="product-card" onclick="navigateToDetail('${product._id}')" style="position: relative; cursor: pointer;">
                    <div class="product-card-media-box" style="position: relative; ${isSoldOut ? 'opacity: 0.65;' : ''}">
                        ${soldOutOverlay}
                        ${displayTag ? `<span class="prod-badge-tag">${displayTag}</span>` : ''}
                        <img src="${primaryImg}" alt="${product.title}" class="img-primary">
                        <img src="${secondaryImg}" alt="${product.title}" class="img-secondary">
                    </div>
                    <div class="product-card-meta-details" style="${isSoldOut ? 'color: #888;' : ''}">
                        <h3 class="product-item-title">${product.title}</h3>
                        <div class="product-item-price-row" style="display: flex; align-items: center; wrap: nowrap;">
                            ${priceDisplay}
                            ${isSoldOut ? `<span style="font-size: 0.75rem; color: #cc0000; margin-left: 8px; font-weight: 500;">[Out of Stock]</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
            productsGrid.insertAdjacentHTML('beforeend', cardHTML);
        });
    }

    // FETCH ENGINE: Backend se live data laane ke liye
    async function loadCollectionsData() {
        try {
            productsGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #888;">Loading premium luxury...</div>`;

            const res = await fetch(`${API_BASE_URL}/api/products`);
            const data = await res.json();

            if (data.success && data.products) {
                collectionsProductsList = data.products;
                displayProducts(collectionsProductsList);

                // LIVE URL FILTER FIX
                handleUrlFilter();
            } else {
                productsGrid.innerHTML = `<div class="no-products-msg"><p>No products found in the database.</p></div>`;
            }
        } catch (err) {
            console.error("Backend se data fetch karne me error:", err);
            productsGrid.innerHTML = `<div class="no-products-msg"><p style="color: red;">Failed to load collections. Connection error.</p></div>`;
        }
    }

    // Helper: URL Parameter check
    function handleUrlFilter() {
        const urlParams = new URLSearchParams(window.location.search);
        const categoryFilter = urlParams.get('category');

        if (categoryFilter) {
            const targetChip = document.querySelector(`.filter-chip[data-category="${categoryFilter}"]`);
            if (targetChip) {
                targetChip.click();
            }
        }
    }

    // FILTER NAVIGATION CHIPS BUTTON LOGIC
    filterChips.forEach(chip => {
        chip.addEventListener('click', (e) => {
            const currentActive = document.querySelector('.filter-chip.active');
            if (currentActive) {
                currentActive.classList.remove('active');
            }

            e.currentTarget.classList.add('active');
            const selectedCategory = e.currentTarget.getAttribute('data-category');

            if (selectedCategory === 'all') {
                displayProducts(collectionsProductsList);
            } else {
                const filtered = collectionsProductsList.filter(p => p.category === selectedCategory);
                displayProducts(filtered);
            }
        });
    });

    // Main Initialization Trigger
    await loadCollectionsData();
});

// 3. GLOBAL ROUTING VIA QUERY PARAMETERS
function navigateToDetail(productId) {
    window.location.href = `product-detail.html?id=${productId}`;
}
