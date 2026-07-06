// admin.js (Fixed Cloudinary Widget & Double Event Listeners)
const API_BASE_URL = "https://urban-sanskar-backend.onrender.com";
let uploadedImages = [];

document.addEventListener("DOMContentLoaded", () => {
    // 🛡️ SECURITY CHECK: Agar localstorage me token nahi h, toh login screen dikhao
    const token = localStorage.getItem("adminToken");
    if (!token) {
        showLoginUI();
    } else {
        initDashboard();
    }

    // 🔥 FIX: Yahan se double event listener hata diya, kyuki wo showLoginUI ke andar handle ho rha h
});

function initDashboard() {
    fetchDashboardStats();
    setupCloudinaryWidget();

    const productForm = document.getElementById("prodForm");
    if (productForm) {
        productForm.addEventListener("submit", handleProductFormSubmission);
    }
}

// 🔐 ADMIN LOGIN HANDLER
async function handleAdminLogin(e) {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.success) {
            localStorage.setItem("adminToken", data.token);
            alert(data.message);
            window.location.reload();
        } else {
            alert("Login Failed: " + data.message);
        }
    } catch (error) {
        console.error("Login Error:", error);
        alert("Server network issue during login!");
    }
}

// LOGOUT SYSTEM
function handleAdminLogout() {
    localStorage.removeItem("adminToken");
    window.location.reload();
}

// DYNAMIC NAVIGATION ENGINE
function switchTab(targetSection) {
    if (targetSection === 'manage') fetchAdminProducts();
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));

    const activeBtn = document.querySelector(`.nav-item[data-tab="${targetSection}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    document.querySelectorAll('.admin-view-section').forEach(sec => sec.classList.remove('active'));
    const targetSecEl = document.getElementById(`section-${targetSection}`);
    if (targetSecEl) targetSecEl.classList.add('active');

    if (targetSection === 'orders') fetchLiveOrders();
    if (targetSection === 'dashboard') fetchDashboardStats();
}

// CLOUDINARY ENGINE INTEGRATION
function setupCloudinaryWidget() {
    const uploadBtn = document.getElementById("upload_widget");
    if (!uploadBtn) return;

    // 🔥 FIX: 'cloudPreset' ko badal kar 'uploadPreset' kar diya hai
    const myWidget = cloudinary.createUploadWidget({
        cloudName: 'bg31kjy3',
        uploadPreset: 'urban_preset'
    }, (error, result) => {
        if (!error && result && result.event === "success") {
            uploadedImages.push(result.info.secure_url);
            const previewContainer = document.getElementById('imagePreview');
            if (previewContainer) {
                previewContainer.innerHTML += `<img src="${result.info.secure_url}" class="preview-img" style="width:80px; height:80px; object-fit:cover; margin:5px; border-radius:6px;">`;
            }
        }
    });

    uploadBtn.addEventListener("click", () => myWidget.open());
}

// STATS INTEGRATION ENGINE
async function fetchDashboardStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/stats`, {
            headers: {
                "Authorization": localStorage.getItem("adminToken")
            }
        });

        if (response.status === 401) {
            handleAdminLogout();
            return;
        }

        const data = await response.json();

        if (data.success) {
            document.getElementById("total-sales-val").textContent = `₹${data.totalSales.toLocaleString('en-IN')}`;
            document.getElementById("total-orders-val").textContent = data.totalOrders;
        }
    } catch (error) {
        console.error("Critical: Stats sync engine offline.", error);
    }
}

// SUBMIT SYSTEM (Products create karne ke liye)
async function handleProductFormSubmission(e) {
    e.preventDefault();

    if (uploadedImages.length === 0) {
        alert("Select images on cloudinary first!");
        return;
    }

    const rawSizesInput = document.getElementById("prodSizes").value;
    const processedSizesArray = rawSizesInput.split(",").map(size => size.trim().toUpperCase());

    const finalProductPayload = {
        title: document.getElementById("prodTitle").value.trim(),
        price: parseInt(document.getElementById("prodPrice").value),
        desc: document.getElementById("prodDesc").value.trim(),
        images: uploadedImages,
        sizes: processedSizesArray,
        category: document.getElementById("prodCategory").value,
        collectionTag: document.getElementById("prodCollectionTag").value.trim() || "",
        fabric: document.getElementById("prodFabric").value.trim() || "100% Certified Organic Premium Linen",
        fit: document.getElementById("prodFit").value.trim() || "Relaxed",
        details: document.getElementById("prodDetails").value.trim() || "Minimalist Tailoring",
        isBestSeller: document.getElementById("isBestSeller").checked,
        isSoldOut: document.getElementById("isSoldOut").checked
    };

    try {
        const response = await fetch(`${API_BASE_URL}/api/products`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(finalProductPayload)
        });

        const result = await response.json();
        if (result.success) {
            alert("Boom! Product successfully synced to live collections pipeline. 🛍️");
            uploadedImages = [];
            document.getElementById("prodForm").reset();
            document.getElementById("imagePreview").innerHTML = "";
            switchTab('dashboard');
        } else {
            alert(`Error: ${result.message}`);
        }
    } catch (error) {
        console.error("Payload synchronization failed:", error);
    }
}

// LIVE ORDER ROUTER LOGS INTEGRATION
async function fetchLiveOrders() {
    const listContainer = document.getElementById('orders-list');
    if (!listContainer) return;
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/orders`, {
            headers: {
                "Authorization": localStorage.getItem("adminToken")
            }
        });

        if (response.status === 401) {
            handleAdminLogout();
            return;
        }

        const data = await response.json();

        if (!data.success || data.orders.length === 0) {
            listContainer.innerHTML = `<p style="text-align:center; color:#999; padding:20px;">No current order logs found.</p>`;
            return;
        }

        listContainer.innerHTML = data.orders.map(order => {
            const info = order.customerInfo || {};
            const address = info.address || {};
            const pricing = order.pricing || {};
            const items = order.orderItems || [];
            const payment = order.paymentInfo || {};

            const itemsListHTML = items.map(item => `
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.9rem; padding:6px 0; border-bottom:1px dashed #eee;">
                    <span style="color:#111;">
                        📦 <strong>${item.title}</strong> 
                        <span style="background:#000; color:#fff; padding:2px 6px; font-size:0.75rem; border-radius:4px; font-weight:bold; margin-left:6px;">
                            ${item.size}
                        </span>
                    </span>
                    <span style="color:#666; font-size:0.85rem;">Qty: ${item.quantity} x ₹${item.price}</span>
                </div>
            `).join('');

            return `
                <div class="order-card" style="background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:18px; margin-bottom:20px; box-shadow:0 2px 8px rgba(0,0,0,0.04);">
                    <div class="order-row" style="display:flex; justify-content:space-between; margin-bottom:12px;">
                        <span style="font-size:0.85rem; color:#888;">🆔 Order ID: ...${order._id.substring(12)}</span>
                        <span style="background:${payment.paymentStatus === 'Success' ? '#e6f4ea' : '#feebec'}; color:${payment.paymentStatus === 'Success' ? '#137333' : '#c5221f'}; padding:4px 10px; border-radius:20px; font-size:0.75rem; font-weight:700; text-transform:uppercase;">
                            💳 ${payment.paymentStatus || 'Pending'}
                        </span>
                    </div>
                    <div class="order-row" style="margin-bottom:12px;">
                        <div style="font-weight:700; color:#111; font-size:1.05rem; margin-bottom:4px;">👤 ${info.name || 'N/A'}</div>
                        <div style="font-size:0.85rem; color:#555; display:flex; gap:12px; flex-wrap:wrap;">
                            <span>📞 ${info.phone || 'N/A'}</span>
                            <span>✉️ ${info.email || 'N/A'}</span>
                        </div>
                    </div>
                    <div style="background:#f9fafb; border-radius:8px; padding:12px; margin-bottom:12px; border:1px solid #f3f4f6;">
                        ${itemsListHTML}
                    </div>
                    <div style="font-size:0.85rem; color:#4b5563; margin-bottom:14px; background:#fdfdfd; padding:8px 0; border-top:1px solid #f3f4f6;">
                        <strong>🏠 Shipping Destination:</strong>
                        <p style="margin:4px 0 0 0; line-height:1.4; color:#1f2937;">
                            ${address.street || ''}, ${address.city || ''}, ${address.state || ''} - <strong>${address.pincode || ''}</strong>
                        </p>
                    </div>
                    <div class="order-row" style="margin-top:10px; border-top:1px solid #eee; padding-top:10px; display:flex; justify-content:space-between; align-items:baseline;">
                        <span style="color:#666; font-size:0.85rem;">Items: ₹${pricing.subTotal || 0} | Delivery: ₹${pricing.shippingCharges || 0}</span>
                        <span style="font-weight:800; font-size:1.15rem; color:#111;">Total Bill: ₹${pricing.totalAmount ? pricing.totalAmount.toLocaleString('en-IN') : 0}</span>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error("Orders fetching error:", error);
    }
}

// SARE PRODUCTS LISTING (WITH SOLD OUT SUPPORT 🚫)
async function fetchAdminProducts() {
    const container = document.getElementById('admin-products-list');
    if (!container) return;
    container.innerHTML = "<p style='color:#666;'>Inventory scanning...</p>";
    try {
        const res = await fetch(`${API_BASE_URL}/api/products`);
        const data = await res.json();
        if (!data.success || !data.products || data.products.length === 0) {
            container.innerHTML = "<p style='color:red;'>Inventory khali hai bhai!</p>";
            return;
        }
        container.innerHTML = data.products.map(p => {
            const sizesStr = p.sizes ? p.sizes.join(',') : 'S,M,L,XL';
            const safeTitle = p.title.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            const safeTag = (p.collectionTag || "").replace(/'/g, "\\'").replace(/"/g, '&quot;');
            const isSoldOutVal = p.isSoldOut || false;

            return `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #f9f9f9; border-radius: 8px; border: 1px solid #eee;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <img src="${p.images && p.images[0] ? p.images[0] : 'https://via.placeholder.com/50'}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 6px;">
                        <div>
                            <p style="font-weight: 700; margin: 0; color: #111;">
                                ${p.title}
                                ${isSoldOutVal ? '<span style="background: #ff0000; color: #fff; font-size: 0.72rem; padding: 2px 6px; border-radius: 4px; font-weight: bold; margin-left: 6px;">SOLD OUT</span>' : ''}
                            </p>
                            <p style="color: #666; font-size: 0.85rem; margin: 2px 0 0 0;">
                                ₹${p.price.toLocaleString('en-IN')} | 
                                <span style="text-transform: uppercase; font-size: 0.75rem; background: #ddd; padding: 2px 6px; border-radius: 4px;">${p.category}</span>
                                ${p.collectionTag ? `| <span style="font-size: 0.75rem; color: #555; font-style: italic;">🏷️ ${p.collectionTag}</span>` : ''}
                            </p>
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button onclick="editProductPrompt('${p._id}', '${safeTitle}', ${p.price}, '${sizesStr}', '${safeTag}', ${isSoldOutVal})" style="background: #111; color: #fff; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer;">✏️ Edit</button>
                        <button onclick="deleteProduct('${p._id}')" style="background: #ffebe6; color: #ff0000; border: 1px solid #ffd1c7; padding: 6px 12px; border-radius: 6px; cursor: pointer;">🗑️ Delete</button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        container.innerHTML = "<p style='color:red;'>Data lane me lafda hua!</p>";
    }
}

// PRODUCT DELETE
async function deleteProduct(id) {
    if (!confirm("Are you sure to delete this product?")) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/products/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            alert("Product removed cleanly! 🗑️");
            fetchAdminProducts();
            if (typeof fetchDashboardStats === 'function') fetchDashboardStats();
        }
    } catch (err) {
        alert("Server failure during deletion!");
    }
}

// QUICK EDIT PROMPT (UPDATED WITH TAG & SOLD OUT DIALOGS ⚙️)
async function editProductPrompt(id, oldTitle, oldPrice, oldSizes, oldTag, oldSoldOut) {
    const newTitle = prompt("Title:", oldTitle); if (newTitle === null) return;
    const newPrice = prompt("Price(₹):", oldPrice); if (newPrice === null) return;
    const newSizesStr = prompt("Sizes:", oldSizes); if (newSizesStr === null) return;
    const newTag = prompt("Collection Tag:", oldTag); if (newTag === null) return;

    const newSoldOut = confirm(`Kya yeh product SOLD OUT mark karna hai?\n\n[Current Status: ${oldSoldOut === 'true' || oldSoldOut === true ? "SOLD OUT" : "AVAILABLE"}]\n\n(Click OK for SOLD OUT, Click CANCEL for AVAILABLE)`);

    if (!newTitle.trim()) return alert("Fill Title!");
    if (isNaN(newPrice) || parseInt(newPrice) <= 0) return alert("Check Price!");

    const sizesArray = newSizesStr.split(',').map(s => s.trim().toUpperCase()).filter(s => s !== "");

    try {
        const res = await fetch(`${API_BASE_URL}/api/products/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: newTitle.trim(),
                price: parseInt(newPrice),
                sizes: sizesArray,
                collectionTag: newTag.trim(),
                isSoldOut: newSoldOut
            })
        });
        const data = await res.json();
        if (data.success) {
            alert("Product updated cleanly! 🔄");
            fetchAdminProducts();
        }
    } catch (err) {
        alert("Server issue during updatation!");
    }
}

// UI Tweak Logic if token missing
function showLoginUI() {
    document.body.innerHTML = `
        <div style="display:flex; justify-content:center; align-items:center; height:100vh; background:#111; font-family:sans-serif;">
            <form id="adminLoginForm" style="background:#fff; padding:30px; border-radius:12px; width:320px; box-shadow:0 10px 25px rgba(0,0,0,0.3);">
                <h2 style="margin-top:0; text-align:center; color:#111; font-weight:800;">URBAN SANSKAR</h2>
                <p style="text-align:center; color:#666; font-size:0.85rem; margin-bottom:20px;">Secure Admin Gateway</p>
                
                <label style="display:block; font-size:0.8rem; font-weight:700; margin-bottom:5px; color:#333;">EMAIL ADDRESS</label>
                <input type="email" id="loginEmail" required style="width:100%; padding:10px; border:1px solid #ccc; border-radius:6px; margin-bottom:15px; box-sizing:border-box;">
                
                <label style="display:block; font-size:0.8rem; font-weight:700; margin-bottom:5px; color:#333;">PASSWORD</label>
                <input type="password" id="loginPassword" required style="width:100%; padding:10px; border:1px solid #ccc; border-radius:6px; margin-bottom:20px; box-sizing:border-box;">
                
                <button type="submit" style="width:100%; background:#111; color:#fff; border:none; padding:12px; border-radius:6px; font-weight:700; cursor:pointer; letter-spacing:0.5px;">ENTER DASHBOARD</button>
            </form>
        </div>
    `;
    document.getElementById("adminLoginForm").addEventListener("submit", handleAdminLogin);
}