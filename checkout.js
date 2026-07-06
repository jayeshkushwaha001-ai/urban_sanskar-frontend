document.addEventListener("DOMContentLoaded", function () {
    const subtotalEl = document.getElementById("review-subtotal");
    const shippingEl = document.getElementById("review-shipping");
    const totalEl = document.getElementById("review-total");
    const payBtn = document.getElementById("razorpay-trigger-btn");
    const shippingForm = document.getElementById("shipping-form");

    const FREE_SHIPPING_THRESHOLD = 4999;
    const FLAT_SHIPPING_CHARGE = 99;

    // 🌍 🔥 FIX 1: Localhost badal kar 127.0.0.1 kiya taaki fast gateway processing ho
    const API_BASE_URL = "https://urban-sanskar-backend.onrender.com";

    let finalCalculatedAmount = 0; // Absolute total to pass securely

    // ==========================================
    // 1. LOAD PRICING DATA ON PAGE LOAD
    // ==========================================
    function loadOrderSummary() {
        let cart = JSON.parse(localStorage.getItem("urbanCart")) || [];

        if (cart.length === 0) {
            alert("Your cart is empty. Redirecting to collections.");
            window.location.href = "collections.html";
            return;
        }

        let subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        let shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_CHARGE;
        finalCalculatedAmount = subtotal + shipping;

        // Render to screen with Premium Currency Formatting
        if (subtotalEl) subtotalEl.textContent = `₹${subtotal.toLocaleString('en-IN')}`;
        if (shippingEl) {
            shippingEl.textContent = shipping === 0 ? "FREE" : `₹${shipping.toLocaleString('en-IN')}`;
            shippingEl.style.color = shipping === 0 ? "green" : "#111";
        }
        if (totalEl) totalEl.textContent = `₹${finalCalculatedAmount.toLocaleString('en-IN')}`;
    }

    loadOrderSummary();

    // ==========================================
    // 2. SECURE FORM VALIDATION SHIELD
    // ==========================================
    if (payBtn) {
        payBtn.addEventListener("click", function () {
            if (!shippingForm.checkValidity()) {
                shippingForm.reportValidity();
                return;
            }

            // Button ko temporarily disable karo taaki user double click na kare
            payBtn.disabled = true;
            payBtn.textContent = "Processing Checkout...";

            console.log("Validation Passed! Ready to communicate with Node.js API.");
            initiateProductionPayment();
        });
    }

    // ==========================================
    // 3. BACKEND GATEWAY HANDSHAKE (INTEGRATED)
    // ==========================================
    async function initiateProductionPayment() {
        const rawCartItems = JSON.parse(localStorage.getItem("urbanCart")) || [];

        // Payload ke liye price recalculation taaki tampering na ho sake
        const subtotal = rawCartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_CHARGE;
        const totalAmount = subtotal + shipping;

        // Structure the payload to perfectly match the backend Order Schema
        const orderPayload = {
            customerInfo: {
                name: document.getElementById("cust-name").value.trim(),
                phone: document.getElementById("cust-phone").value.trim(),
                email: document.getElementById("cust-email").value.trim(),
                address: {
                    street: document.getElementById("cust-address").value.trim(),
                    city: document.getElementById("cust-city").value.trim(),
                    state: document.getElementById("cust-state").value.trim(),
                    pincode: document.getElementById("cust-pincode").value.trim()
                }
            },
            orderItems: rawCartItems.map(item => ({
                product: item.productId || item.id,
                title: item.title,
                size: item.size || "M", // 🔥 Selected size yahan se pass ho rha hai
                quantity: item.quantity || 1,
                price: item.price
            })),
            // 🔥 FIX 2: Jo 'pricing' object schema me required tha use yahan add kiya
            pricing: {
                subTotal: subtotal,
                shippingCharges: shipping,
                totalAmount: totalAmount
            }
        };

        try {
            // Step A: Hit Backend to create Razorpay Order
            const response = await fetch(`${API_BASE_URL}/api/orders/checkout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(orderPayload)
            });

            const data = await response.json();

            if (!data.success) {
                alert("Checkout Failed: " + data.message);
                resetPayButton();
                return;
            }

            // Step B: Configure Razorpay Gateway Options
            const options = {
                "key": data.keyId,
                "amount": data.totalAmount * 100, // Amount in paisa
                "currency": "INR",
                "name": "Urban Sanskar",
                "description": "Secure Fashion Checkout",
                "order_id": data.razorpayOrderId,

                // Step C: Triggered automatically on successful authorization
                "handler": async function (razorpayResponse) {
                    try {
                        payBtn.textContent = "Verifying Payment...";

                        // Send verification tokens back to server
                        const verifyResponse = await fetch(`${API_BASE_URL}/api/orders/verify`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                razorpay_order_id: razorpayResponse.razorpay_order_id,
                                razorpay_payment_id: razorpayResponse.razorpay_payment_id,
                                razorpay_signature: razorpayResponse.razorpay_signature
                            })
                        });

                        const verifyData = await verifyResponse.json();

                        if (verifyData.success) {
                            localStorage.removeItem("urbanCart"); // Clear the cart safely
                            window.location.href = "success.html"; // Redirect to success page
                        } else {
                            alert("Payment Verification Failed: " + verifyData.message);
                            resetPayButton();
                        }
                    } catch (err) {
                        console.error("Verification Error:", err);
                        alert("Network error during payment verification!");
                        resetPayButton();
                    }
                },
                "prefill": {
                    "name": orderPayload.customerInfo.name,
                    "email": orderPayload.customerInfo.email,
                    "contact": orderPayload.customerInfo.phone
                },
                "theme": {
                    "color": "#111111"
                },
                "modal": {
                    "ondismiss": function () {
                        console.log("Customer closed the payment gateway modal.");
                        resetPayButton();
                    }
                }
            };

            const rzp = new Razorpay(options);
            rzp.open();

        } catch (error) {
            console.error("Server Error:", error);
            alert("Could not connect to backend server. Make sure your Node.js port is active.");
            resetPayButton();
        }
    }

    function resetPayButton() {
        if (payBtn) {
            payBtn.disabled = false;
            payBtn.textContent = "Proceed to Payment";
        }
    }
});