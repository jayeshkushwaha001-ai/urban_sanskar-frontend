// admin.js (Fixed Cloudinary Widget, Dynamic Edit Modal Form & Image Removal Cross Engine)
const API_BASE_URL = "https://urban-sanskar-backend.onrender.com";
let uploadedImages = [];
let editUploadedImages = []; // Edit mode ke liye alag se image state tracker
window.allAdminProducts = []; // Saare products ko globally save rakhne ke liye

document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
        showLoginUI();
    } else {
        initDashboard();
    }
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

// 🛠️ RE-RENDER MAIN FORM IMAGE PREVIEWS WITH CROSS (X) REMOVAL BUTTON
function renderImagePreviews() {
    const previewContainer = document.getElementById('imagePreview');
    if (!previewContainer) return;

    previewContainer.innerHTML = uploadedImages.map((url, index) => `
        <div class="preview-img-container" style="position: relative; display: inline-block; margin: 5px;">
            <img src="${url}" style="width:80px; height:80px; object-fit:cover; border-radius:6px; border:1px solid #ddd;">
            <button type="button" onclick="removeUploadedImage(${index})" style="position: absolute; top: -6px; right: -6px; background: #ff0000; color: #fff; border: none; border-radius: 50%; width: 20px; height: 20px; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">×</button>
        </div>
    `).join('');
}

function removeUploadedImage(index) {
    uploadedImages.splice(index, 1);
    renderImagePreviews();
}

// CLOUDINARY ENGINE INTEGRATION (SMART CONTEXT CONFIGURED)
function setupCloudinaryWidget() {
    const uploadBtn = document.getElementById("upload_widget");
    if (!uploadBtn) return;

    const myWidget = cloudinary.createUploadWidget({
        cloudName: 'bg31kjy3',
        uploadPreset: 'urban_preset'
    }, (error, result) => {
        if (!error && result && result.event === "success") {
            const isModalOpen = document.getElementById("editProductModal");
            if (isModalOpen) {
                editUploadedImages.push(result.info.secure_url);
                renderEditImagePreviews();
            } else {
                uploadedImages.push(result.info.secure_url);
                renderImagePreviews();
            }
        }
    });

    uploadBtn.addEventListener("click", () => myWidget.open());
}

// STATS INTEGRATION ENGINE
async function fetchDashboardStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/stats`, {
            headers: { "Authorization": localStorage.getItem("adminToken") }
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
        isNewArrival: document.getElementById("isNewArrival").checked,
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
            headers: { "Authorization": localStorage.getItem("adminToken") }
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
                    <div class="order-row" style="margin-top:10px; border-top:1px solid #eee; padding-top:10px; display:flex; justify-content:space-between; align-items:baseline; flex-wrap:wrap; gap:10px;">
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

// SARE PRODUCTS LISTING
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

        window.allAdminProducts = data.products;

        container.innerHTML = data.products.map(p => {
            const isSoldOutVal = p.isSoldOut || false;
            const isNewArrivalVal = p.isNewArrival || false;

            return `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #f9f9f9; border-radius: 8px; border: 1px solid #eee; flex-wrap: wrap; gap: 12px;">
                    <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 250px;">
                        <img src="${p.images && p.images[0] ? p.images[0] : 'https://via.placeholder.com/50'}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 6px;">
                        <div>
                            <p style="font-weight: 700; margin: 0; color: #111;">
                                ${p.title}
                                ${isNewArrivalVal ? '<span style="background: #008000; color: #fff; font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; font-weight: bold; margin-left: 6px; text-transform: uppercase;">NEW ARRIVAL</span>' : ''}
                                ${isSoldOutVal ? '<span style="background: #ff0000; color: #fff; font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; font-weight: bold; margin-left: 6px; text-transform: uppercase;">SOLD OUT</span>' : ''}
                            </p>
                            <p style="color: #666; font-size: 0.85rem; margin: 2px 0 0 0;">
                                ₹${p.price.toLocaleString('en-IN')} | 
                                <span style="text-transform: uppercase; font-size: 0.75rem; background: #ddd; padding: 2px 6px; border-radius: 4px;">${p.category}</span>
                                ${p.collectionTag ? `| <span style="font-size: 0.75rem; color: #555; font-style: italic;">🏷️ ${p.collectionTag}</span>` : ''}
                            </p>
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button onclick="openEditModal('${p._id}')" style="background: #111; color: #fff; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer;">✏️ Edit</button>
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

// 📦 MODAL IMAGE RENDERING ENGINE
function renderEditImagePreviews() {
    const editPreviewContainer = document.getElementById('editImagePreviewContainer');
    if (!editPreviewContainer) return;

    editPreviewContainer.innerHTML = editUploadedImages.map((url, index) => `
        <div style="position: relative; display: inline-block; margin: 5px;">
            <img src="${url}" style="width:75px; height:75px; object-fit:cover; border-radius:6px; border:1px solid #ccc;">
            <button type="button" onclick="removeEditUploadedImage(${index})" style="position: absolute; top: -5px; right: -5px; background: #ff0000; color: #fff; border: none; border-radius: 50%; width: 18px; height: 18px; font-size: 11px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold; box-shadow: 0 1px 3px rgba(0,0,0,0.4);">×</button>
        </div>
    `).join('');
}

function removeEditUploadedImage(index) {
    editUploadedImages.splice(index, 1);
    renderEditImagePreviews();
}

// 🎨 OPEN DYNAMIC EDIT MODAL FORM (FIXED CATEGORIES SYNCED WITH HTML 💎)
function openEditModal(productId) {
    const product = window.allAdminProducts.find(p => p._id === productId);
    if (!product) return alert("Product data mismatch error!");

    editUploadedImages = [...(product.images || [])];

    const modalDiv = document.createElement("div");
    modalDiv.id = "editProductModal";
    modalDiv.style = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; justify-content: center; align-items: center; z-index: 10000; font-family: sans-serif; padding: 15px; box-sizing: border-box;";

    modalDiv.innerHTML = `
        <div style="background: #fff; width: 100%; max-width: 550px; max-height: 90vh; overflow-y: auto; border-radius: 12px; padding: 25px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); position: relative; box-sizing: border-box;">
            <button onclick="closeEditModal()" style="position: absolute; top: 15px; right: 15px; background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>
            <h3 style="margin-top: 0; color: #111; font-weight: 800; border-bottom: 2px solid #eee; padding-bottom: 10px; text-transform: uppercase; font-size: 1.2rem;">✏️ Edit Product Details</h3>
            
            <form id="modalEditForm" style="display: flex; flex-direction: column; gap: 12px; margin-top: 15px;">
                <div>
                    <label style="font-size: 0.8rem; font-weight: 700; color: #333; display: block; margin-bottom: 4px;">PRODUCT TITLE</label>
                    <input type="text" id="editTitle" value="${product.title}" required style="width:100%; padding:8px; border:1px solid #ccc; border-radius:6px; box-sizing: border-box;">
                </div>

                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 120px;">
                        <label style="font-size: 0.8rem; font-weight: 700; color: #333; display: block; margin-bottom: 4px;">PRICE (₹)</label>
                        <input type="number" id="editPrice" value="${product.price}" required style="width:100%; padding:8px; border:1px solid #ccc; border-radius:6px; box-sizing: border-box;">
                    </div>
                    <div style="flex: 1; min-width: 180px;">
                        <label style="font-size: 0.8rem; font-weight: 700; color: #333; display: block; margin-bottom: 4px;">CATEGORY</label>
                        <select id="editCategory" required style="width:100%; padding:8px; border:1px solid #ccc; border-radius:6px; box-sizing: border-box;">
                            <option value="">Select Category</option>
                            <option value="coord-sets" ${product.category === 'coord-sets' ? 'selected' : ''}>Co-ord Sets</option>
                            <option value="dress" ${product.category === 'dress' ? 'selected' : ''}>Dress</option>
                            <option value="hand-series" ${product.category === 'hand-series' ? 'selected' : ''}>Hand Painted Series</option>
                            <option value="handloom-dupatta" ${product.category === 'handloom-dupatta' ? 'selected' : ''}>Handloom Stoles & Dupatta</option>
                            <option value="stories" ${product.category === 'stories' ? 'selected' : ''}>Pieces that became stories</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label style="font-size: 0.8rem; font-weight: 700; color: #333; display: block; margin-bottom: 4px;">SIZES (Comma Separated)</label>
                    <input type="text" id="editSizes" value="${product.sizes ? product.sizes.join(', ') : 'S, M, L, XL'}" required style="width:100%; padding:8px; border:1px solid #ccc; border-radius:6px; box-sizing: border-box;">
                </div>

                <div>
                    <label style="font-size: 0.8rem; font-weight: 700; color: #333; display: block; margin-bottom: 4px;">COLLECTION TAG</label>
                    <input type="text" id="editTag" value="${product.collectionTag || ''}" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:6px; box-sizing: border-box;">
                </div>

                <div>
                    <label style="font-size: 0.8rem; font-weight: 700; color: #333; display: block; margin-bottom: 4px;">DESCRIPTION</label>
                    <textarea id="editDesc" rows="2" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:6px; box-sizing: border-box; resize: vertical;">${product.desc || ''}</textarea>
                </div>

                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 140px;">
                        <label style="font-size: 0.8rem; font-weight: 700; color: #333; display: block; margin-bottom: 4px;">FABRIC</label>
                        <input type="text" id="editFabric" value="${product.fabric || ''}" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:6px; box-sizing: border-box;">
                    </div>
                    <div style="flex: 1; min-width: 140px;">
                        <label style="font-size: 0.8rem; font-weight: 700; color: #333; display: block; margin-bottom: 4px;">FIT</label>
                        <input type="text" id="editFit" value="${product.fit || ''}" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:6px; box-sizing: border-box;">
                    </div>
                </div>

                <div>
                    <label style="font-size: 0.8rem; font-weight: 700; color: #333; display: block; margin-bottom: 4px;">ADDITIONAL DETAILS</label>
                    <input type="text" id="editDetails" value="${product.details || ''}" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:6px; box-sizing: border-box;">
                </div>

                <!-- IMAGE MANAGEMENT INTERFACE -->
                <div>
                    <label style="font-size: 0.8rem; font-weight: 700; color: #333; display: block; margin-bottom: 4px;">PRODUCT IMAGES</label>
                    <button type="button" onclick="document.getElementById('upload_widget').click()" style="background: #f3f4f6; color: #111; border: 1px dashed #bbb; padding: 8px; width: 100%; border-radius: 6px; cursor: pointer; font-weight: 600; margin-bottom: 8px;">+ Upload More via Cloudinary</button>
                    <div id="editImagePreviewContainer" style="display: flex; flex-wrap: wrap; gap: 5px; background: #fafafa; border: 1px solid #eee; padding: 8px; border-radius: 6px; min-height: 40px;"></div>
                </div>

                <!-- TAG STATUS TOGGLES -->
                <div style="display: flex; gap: 15px; background: #f9f9f9; padding: 10px; border-radius: 6px; border: 1px solid #eee; flex-wrap: wrap;">
                    <label style="display: flex; align-items: center; gap: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer;">
                        <input type="checkbox" id="editIsBestSeller" ${product.isBestSeller ? 'checked' : ''}> Best Seller
                    </label>
                    <label style="display: flex; align-items: center; gap: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer;">
                        <input type="checkbox" id="editIsNewArrival" ${product.isNewArrival ? 'checked' : ''}> New Arrival
                    </label>
                    <label style="display: flex; align-items: center; gap: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer; color: #ff0000;">
                        <input type="checkbox" id="editIsSoldOut" ${product.isSoldOut ? 'checked' : ''}> Sold Out
                    </label>
                </div>

                <button type="submit" style="background: #111; color: #fff; font-weight: 700; border: none; padding: 12px; border-radius: 6px; cursor: pointer; margin-top: 5px; letter-spacing: 0.5px; text-transform: uppercase;">Save Product Changes</button>
            </form>
        </div>
    `;

    document.body.appendChild(modalDiv);
    renderEditImagePreviews();

    document.getElementById("modalEditForm").addEventListener("submit", (e) => handleEditFormSubmit(e, productId));
}

function closeEditModal() {
    const modal = document.getElementById("editProductModal");
    if (modal) modal.remove();
    editUploadedImages = [];
}

// 🔄 SAVE DYNAMIC MODAL CHANGES TO LIVE DATABASE PIPELINE
async function handleEditFormSubmit(e, id) {
    e.preventDefault();

    if (editUploadedImages.length === 0) {
        alert("Bhai, kam se kam ek product image toh rkho!");
        return;
    }

    const sizesStr = document.getElementById("editSizes").value;
    const processedSizes = sizesStr.split(',').map(s => s.trim().toUpperCase()).filter(s => s !== "");

    const updatedPayload = {
        title: document.getElementById("editTitle").value.trim(),
        price: parseInt(document.getElementById("editPrice").value),
        category: document.getElementById("editCategory").value,
        sizes: processedSizes,
        collectionTag: document.getElementById("editTag").value.trim(),
        desc: document.getElementById("editDesc").value.trim(),
        fabric: document.getElementById("editFabric").value.trim(),
        fit: document.getElementById("editFit").value.trim(),
        details: document.getElementById("editDetails").value.trim(),
        images: editUploadedImages,
        isBestSeller: document.getElementById("editIsBestSeller").checked,
        isNewArrival: document.getElementById("editIsNewArrival").checked,
        isSoldOut: document.getElementById("editIsSoldOut").checked
    };

    try {
        const res = await fetch(`${API_BASE_URL}/api/products/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedPayload)
        });

        const data = await res.json();
        if (data.success) {
            alert("Product updated flawlessly! 🔄");
            closeEditModal();
            fetchAdminProducts();
        } else {
            alert("Error: " + data.message);
        }
    } catch (err) {
        console.error(err);
        alert("Server issue during updatation!");
    }
}

// UI Tweak Logic if token missing
function showLoginUI() {
    document.body.innerHTML = `
        <div style="display:flex; justify-content:center; align-items:center; height:100vh; background:#111; font-family:sans-serif; padding:15px; box-sizing:border-box;">
            <form id="adminLoginForm" style="background:#fff; padding:30px; border-radius:12px; width:100%; max-width:340px; box-shadow:0 10px 25px rgba(0,0,0,0.3); box-sizing:border-box;">
                <h2 style="margin-top:0; text-align:center; color:#111; font-weight:800; font-size:1.5rem;">URBAN SANSKAR</h2>
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
