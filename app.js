// Dono files (app.js aur admin.js) me ye badal do:
const API_BASE_URL = "https://urban-sanskar-backend.onrender.com";

// --- EXISTING NAVBAR DRAWER ACTIONS CODE ---
document.addEventListener('DOMContentLoaded', () => {
    const openMenuBtn = document.getElementById('menu-open-btn');
    const closeMenuBtn = document.getElementById('menu-close-btn');
    const drawerOverlay = document.getElementById('mobile-drawer-overlay');
    const navDrawer = document.getElementById('mobile-nav-drawer');

    function openMobileDrawer() {
        if (navDrawer && drawerOverlay) {
            navDrawer.classList.add('is-open');
            drawerOverlay.classList.add('is-visible');
            document.body.style.overflow = 'hidden';
            history.pushState({ mobileMenuState: 'activeOpen' }, '');
        }
    }

    function closeMobileDrawer() {
        if (navDrawer && drawerOverlay) {
            navDrawer.classList.remove('is-open');
            drawerOverlay.classList.remove('is-visible');
            document.body.style.overflow = '';
            if (history.state && history.state.mobileMenuState === 'activeOpen') {
                history.back();
            }
        }
    }

    if (openMenuBtn && closeMenuBtn && drawerOverlay && navDrawer) {
        openMenuBtn.addEventListener('click', openMobileDrawer);
        closeMenuBtn.addEventListener('click', closeMobileDrawer);
        drawerOverlay.addEventListener('click', closeMobileDrawer);
    }

    window.addEventListener('popstate', (nativeEvent) => {
        if (navDrawer && navDrawer.classList.contains('is-open')) {
            navDrawer.classList.remove('is-open');
            if (drawerOverlay) drawerOverlay.classList.remove('is-visible');
            document.body.style.overflow = '';
        }
    });

    // --- CINEMATIC HERO REVEAL ENGINE ---
    const heroSection = document.getElementById('hero-section');
    if (heroSection) {
        setTimeout(() => {
            heroSection.classList.add('is-activated');
        }, 150);
    }
});

// --- UNIVERSAL HORIZONTAL SCROLL ENGINE ---
function initializeSlider(trackId, leftBtnId, rightBtnId) {
    const sliderTrack = document.getElementById(trackId);
    const leftArrow = document.getElementById(leftBtnId);
    const rightArrow = document.getElementById(rightBtnId);

    if (sliderTrack && leftArrow && rightArrow) {
        const getScrollAmount = () => {
            const firstCard = sliderTrack.querySelector('.product-card');
            return firstCard ? firstCard.clientWidth + 24 : 320;
        };

        rightArrow.addEventListener('click', () => {
            sliderTrack.scrollBy({ left: getScrollAmount(), behavior: 'smooth' });
        });

        leftArrow.addEventListener('click', () => {
            sliderTrack.scrollBy({ left: -getScrollAmount(), behavior: 'smooth' });
        });
    }
}

// 🚀 1. NEW ARRIVALS SLIDER INITIALIZATION
initializeSlider('new-arrivals-track', 'arrival-slide-left-btn', 'arrival-slide-right-btn');

// 🚀 2. BEST SELLERS SLIDER INITIALIZATION
initializeSlider('product-slider-track', 'slide-left-btn', 'slide-right-btn');

// 🚀 3. RECOMMENDATIONS SLIDER INITIALIZATION (Baaki pages ke liye)
initializeSlider('rec-slider-track', 'slide-left-btn', 'slide-right-btn');


// ==========================================================================
// 🔥 DYNAMIC API DATA FETCH ENGINE
// ==========================================================================

// 1. DYNAMIC DETAIL INJECTOR (For product-detail.html)
async function loadProductDetails(productId) {
    if (!productId) return;

    try {
        const res = await fetch(`${API_BASE_URL}/api/products/${productId}`);
        const data = await res.json();

        if (!data.success || !data.product) {
            console.warn(`Product ID '${productId}' database me nahi mila!`);
            return;
        }

        const product = data.product;

        const titleEl = document.getElementById('dyn-title');
        if (!titleEl) return;

        titleEl.innerText = product.title;
        document.getElementById('dyn-price').innerText = `₹${product.price.toLocaleString('en-IN')}`;
        document.getElementById('dyn-desc').innerText = product.desc;
        document.title = `${product.title} | Urban Sanskar`;

        if (document.getElementById('dyn-collection')) {
            document.getElementById('dyn-collection').innerText = product.collectionTag;
        }
        if (document.getElementById('dyn-fabric')) {
            document.getElementById('dyn-fabric').innerText = product.fabric || "100% Certified Organic Premium Linen";
        }
        if (document.getElementById('dyn-fit')) {
            document.getElementById('dyn-fit').innerText = product.fit || "Relaxed";
        }
        if (document.getElementById('dyn-details')) {
            document.getElementById('dyn-details').innerText = product.details || "Minimalist Tailoring";
        }

        const stageImg = document.getElementById('stage-display-img');
        if (stageImg && product.images && product.images.length > 0) {
            stageImg.src = product.images[0].replace("/upload/", "/upload/f_auto,q_auto,w_800/");
        }

        const thumbs = document.querySelectorAll('.thumb-img');
        thumbs.forEach((thumb, index) => {
            if (product.images && product.images[index]) {
                thumb.src = product.images[index];
                thumb.style.display = "block";
                if (index === 0) thumb.classList.add('active');
                else thumb.classList.remove('active');
            } else {
                thumb.style.display = "none";
            }
        });

        generateRecommendations(product.category, product._id);

    } catch (err) {
        console.error("Product detail load karne me error aayi:", err);
    }
}

// 2. DYNAMIC RECOMMENDATIONS GENERATOR (Detail page ke neeche ke liye)
async function generateRecommendations(currentCategory, currentProductId) {
    const recTrack = document.getElementById('rec-slider-track');
    if (!recTrack) return;

    recTrack.innerHTML = "";

    try {
        const res = await fetch(`${API_BASE_URL}/api/products`);
        const data = await res.json();

        if (!data.success || !data.products) return;

        let matchCount = 0;

        data.products.forEach(product => {
            if (product.category === currentCategory && product._id !== currentProductId) {
                matchCount++;
                recTrack.innerHTML += createCardHTML(product);
            }
        });

        if (matchCount === 0) {
            data.products.forEach(product => {
                if (product._id !== currentProductId) {
                    recTrack.innerHTML += createCardHTML(product);
                }
            });
        }
    } catch (err) {
        console.error("Recommendations fetch karne me error:", err);
    }
}

// 3. HOMEPAGE BEST SELLERS LOADER (For index.html slider)
async function loadHomepageBestSellers() {
    const homeSliderTrack = document.getElementById('product-slider-track');
    if (!homeSliderTrack) return;

    homeSliderTrack.innerHTML = "";

    try {
        const res = await fetch(`${API_BASE_URL}/api/products/bestsellers`);
        const data = await res.json();

        if (data.success && data.products) {
            data.products.forEach(product => {
                homeSliderTrack.innerHTML += createCardHTML(product);
            });
        }
    } catch (err) {
        console.error("Best sellers load karne me dikkat aayi:", err);
    }
}

// 🌟 3b. NEW ADDITION: HOMEPAGE NEW ARRIVALS LOADER (For index.html slider)
async function loadHomepageNewArrivals() {
    const newArrivalsTrack = document.getElementById('new-arrivals-track');
    if (!newArrivalsTrack) return; // Agar homepage par ye element nahi h toh ruk jao

    newArrivalsTrack.innerHTML = "";

    try {
        const res = await fetch(`${API_BASE_URL}/api/products/newarrivals`);
        const data = await res.json();

        if (data.success && data.products) {
            data.products.forEach(product => {
                newArrivalsTrack.innerHTML += createCardHTML(product);
            });
        }
    } catch (err) {
        console.error("New arrivals load karne me dikkat aayi:", err);
    }
}

// Helper Function: Card HTML Generator (MongoDB `_id` compatible)
function createCardHTML(product) {
    return `
        <div onclick="redirectFromRecs('${product._id}')" class="product-card" style="cursor:pointer;">
            <div class="prod-image-holder">
                <img src="${product.images[0]}" class="prod-main-img" alt="${product.title}">
            </div>
            <div class="prod-details-meta">
                <h4 class="prod-display-name">${product.title}</h4>
                <span class="prod-display-price">₹${product.price.toLocaleString('en-IN')}</span>
            </div>
        </div>
    `;
}

function redirectFromRecs(id) {
    window.location.href = `product-detail.html?id=${id}`;
}

// ==========================================================================
// 4. CORE ENGINE INITIALIZATION ON DOM LOAD
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (productId) {
        loadProductDetails(productId);
    } else {
        // 🔥 Dono loaders safely side-by-side call ho rhe hain homepage par
        loadHomepageNewArrivals();
        loadHomepageBestSellers();
    }

    // Live Thumbnail Switching Interaction
    const thumbnails = document.querySelectorAll('.thumb-img');
    const stageDisplay = document.getElementById('stage-display-img');

    if (thumbnails.length > 0 && stageDisplay) {
        thumbnails.forEach(thumb => {
            thumb.addEventListener('click', () => {
                stageDisplay.src = thumb.src;
                stageDisplay.alt = thumb.alt;
                thumbnails.forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
            });
        });
    }

    // Size Picker Chips Logic
    const sizeChips = document.querySelectorAll('.size-chip-btn');
    if (sizeChips.length > 0) {
        sizeChips.forEach(chip => {
            chip.addEventListener('click', () => {
                sizeChips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
            });
        });
    }
});

// --- GLOBAL CART BADGE LOGIC ---
document.addEventListener("DOMContentLoaded", function () {
    function updateGlobalCartBadge() {
        let cart = JSON.parse(localStorage.getItem("urbanCart")) || [];
        let totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

        const cartBadge = document.querySelector(".cart-badge-dot");
        if (cartBadge) {
            cartBadge.textContent = totalItems;
            if (totalItems > 0) {
                cartBadge.style.display = "flex";
            } else {
                cartBadge.style.display = "none";
            }
        }
    }
    updateGlobalCartBadge();
});
