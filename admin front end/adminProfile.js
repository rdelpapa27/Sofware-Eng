document.addEventListener("DOMContentLoaded", async () => {
    await loadAdminInfo();
    await loadRecentUsers();
    await loadActiveEmployees();
    await loadRecentOrders();
    await loadClaimedOrders();
});

async function loadAdminInfo() {
    try {
        const res = await fetch("http://161.35.99.95:3000/api/admin/me", {
            method: "GET",
            credentials: "include"
        });
        if (res.ok) {
            const admin = await res.json();
            document.getElementById("admin-name").textContent = admin.username;
            document.getElementById("admin-email").textContent = admin.email;
        } else {
            window.location.href = "adminLoginPage.html";
        }
    } catch (err) {
        console.error("Error loading admin info:", err);
    }
}

async function loadRecentUsers() {
    try {
        const res = await fetch("http://161.35.99.95:3000/api/admin/recent-users", {
            method: "GET",
            credentials: "include"
        });
        const users = await res.json();
        const container = document.getElementById("recent-users");
        container.innerHTML = "";

        users.forEach(user => {
            const card = document.createElement("div");
            card.className = "card-item";
            card.innerHTML = `
                <div class="section-header">User: ${user.username}</div>
                <p>Email: ${user.email}</p>
                <p>Registration Date: ${new Date(user.created_at).toLocaleString()}</p>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        console.error("Error loading recent users:", err);
    }
}

async function loadActiveEmployees() {
    try {
        const res = await fetch("http://161.35.99.95:3000/api/admin/active-employees", {
            method: "GET",
            credentials: "include"
        });
        const employees = await res.json();
        const container = document.getElementById("active-employees");
        container.innerHTML = "";

        employees.forEach(emp => {
            const card = document.createElement("div");
            card.className = "card-item";
            card.innerHTML = `
                <div class="section-header">Employee: ${emp.username}</div>
                <p>Email: ${emp.email}</p>
                <p>Last Active: ${new Date(emp.last_active).toLocaleString()}</p>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        console.error("Error loading active employees:", err);
    }
}

async function loadRecentOrders() {
    try {
        const res = await fetch("http://161.35.99.95:3000/api/admin/recent-orders", {
            method: "GET",
            credentials: "include"
        });
        const orders = await res.json();
        const container = document.getElementById("recent-orders");
        container.innerHTML = "";

        orders.forEach(order => {
            const card = document.createElement("div");
            card.className = "card-item";
            card.innerHTML = `
                <div class="section-header">Order #${order.id}</div>
                <p>Customer: ${order.customer}</p>
                <p>Items: ${order.items}</p>
                <p>Date: ${new Date(order.order_date).toLocaleString()}</p>
                <button class="claim-btn" onclick="claimOrder(${order.id})">Claim Order</button>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        console.error("Error loading recent orders:", err);
    }
}

async function loadClaimedOrders() {
    try {
        const res = await fetch("http://161.35.99.95:3000/api/admin/claimed-orders", {
            method: "GET",
            credentials: "include"
        });
        const orders = await res.json();
        const container = document.getElementById("claimed-orders");
        container.innerHTML = "";

        orders.forEach(order => {
            const card = document.createElement("div");
            card.className = "card-item";
            card.innerHTML = `
                <div class="section-header">Order #${order.id}</div>
                <p>Customer: ${order.customer}</p>
                <p>Status: ${order.status}</p>
                <button class="claim-btn" onclick="editOrderStatus(${order.id})">Edit Order Status</button>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        console.error("Error loading claimed orders:", err);
    }
}

// Claim an order
async function claimOrder(orderId) {
    try {
        const res = await fetch(`http://161.35.99.95:3000/api/admin/claim-order/${orderId}`, {
            method: "POST",
            credentials: "include"
        });
        const data = await res.json();
        alert(data.message);
        await loadRecentOrders();
        await loadClaimedOrders();
    } catch (err) {
        console.error("Error claiming order:", err);
    }
}


let selectedOrderId = null;

function editOrderStatus(orderId) {
    selectedOrderId = orderId;
    document.getElementById("statusModal").style.display = "block";
}

function closeStatusModal() {
    selectedOrderId = null;
    document.getElementById("statusModal").style.display = "none";
}

async function submitStatusUpdate() {
    const status = document.getElementById("statusSelect").value;

    try {
        const res = await fetch(`http://161.35.99.95:3000/api/admin/update-status/${selectedOrderId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ status })
        });

        const data = await res.json();
        alert(data.message);
        closeStatusModal();
        await loadClaimedOrders(); // Refresh the section
    } catch (error) {
        console.error("Error updating order status:", error);
        alert("Failed to update order status.");
    }
}

