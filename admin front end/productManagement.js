document.addEventListener("DOMContentLoaded", () => {
    loadProducts();

    const form = document.querySelector("form");
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        await addProduct();
    });
});

async function loadProducts() {
    try {
        const res = await fetch("http://161.35.99.95:3000/api/products", {
            credentials: "include"
        });

        const data = await res.json();

        // Prevent `.forEach` from running on error object
        if (!Array.isArray(data)) {
            console.error("Expected an array, got:", data);
            return;
        }

        const container = document.querySelector(".card-list");
        container.innerHTML = "";

        data.forEach(product => {
            const card = document.createElement("div");
            card.className = "card-item";
            card.innerHTML = `
                <div class="section-header">Product: ${product.name}</div>
                <p>Description: ${product.description}</p>
                <p>Price: $${Number(product.price).toFixed(2)}</p>
                <p>Available: ${product.quantity}</p>
                <button class="claim-btn" onclick="editProduct(${product.product_id})">Edit</button>
                <button class="claim-btn" onclick="deleteProduct(${product.product_id})">Delete</button>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        console.error("Error loading products:", err);
    }
}


// Add new product
async function addProduct() {
    const name = document.querySelector('input[placeholder="Product Name"]').value;
    const description = document.querySelector('textarea[placeholder="Product Description"]').value;
    const price = parseFloat(document.querySelector('input[placeholder="Price"]').value);
    const quantity = parseInt(document.querySelector('input[placeholder="Quantity Available"]').value);

    if (!name || !description || isNaN(price) || isNaN(quantity)) {
        alert("Please fill out all fields correctly.");
        return;
    }

    try {
        const res = await fetch("http://161.35.99.95:3000/api/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ name, description, price, quantity })
        });

        const data = await res.json();
        alert(data.message);
        document.querySelector("form").reset();
        await loadProducts();
    } catch (err) {
        console.error("Error adding product:", err);
        alert("Failed to add product.");
    }
}

// Delete product
async function deleteProduct(productId) {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
        const res = await fetch(`http://161.35.99.95:3000/api/products/${productId}`, {
            method: "DELETE",
            credentials: "include"
        });

        const data = await res.json();
        alert(data.message);
        await loadProducts();
    } catch (err) {
        console.error("Error deleting product:", err);
        alert("Failed to delete product.");
    }
}

async function editProduct(productId) {
    const card = [...document.querySelectorAll(".card-item")]
        .find(el => el.innerHTML.includes(`editProduct(${productId})`));

    if (!card) return;

    // Get the current product data
    const res = await fetch(`http://161.35.99.95:3000/api/products/${productId}`, {
        credentials: "include"
    });
    const product = await res.json();

    card.innerHTML = `
        <div class="section-header">Editing Product #${product.product_id}</div>
        <label>Name:</label>
        <input type="text" value="${product.name}" id="edit-name-${productId}" />
        <label>Description:</label>
        <textarea id="edit-description-${productId}">${product.description}</textarea>
        <label>Price:</label>
        <input type="number" value="${product.price}" id="edit-price-${productId}" />
        <label>Quantity:</label>
        <input type="number" value="${product.quantity}" id="edit-quantity-${productId}" />
        <button class="claim-btn" onclick="saveProduct(${productId})">Save</button>
        <button class="claim-btn" onclick="loadProducts()">Cancel</button>
    `;
}
async function saveProduct(productId) {
    const name = document.getElementById(`edit-name-${productId}`).value;
    const description = document.getElementById(`edit-description-${productId}`).value;
    const price = parseFloat(document.getElementById(`edit-price-${productId}`).value);
    const quantity = parseInt(document.getElementById(`edit-quantity-${productId}`).value);

    if (!name || !description || isNaN(price) || isNaN(quantity)) {
        alert("Please fill out all fields correctly.");
        return;
    }

    try {
        const res = await fetch(`http://161.35.99.95:3000/api/products/${productId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ name, description, price, quantity })
        });

        const data = await res.json();
        alert(data.message);
        await loadProducts();
    } catch (err) {
        console.error("Error saving product:", err);
        alert("Failed to save product.");
    }
}

