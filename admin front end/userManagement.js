document.addEventListener("DOMContentLoaded", () => {
    loadUsers();

    document.querySelector(".add-user-form").addEventListener("submit", handleCreateUser);

    document.querySelectorAll(".filter-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const role = btn.textContent.toLowerCase();
            loadUsers(role === "all" ? null : role);
        });
    });
});

async function loadUsers(role = null) {
    let url = "http://161.35.99.95:3000/api/admin/users";
    if (role) {
        url += "?role=" + role;
    }

    try {
        const res = await fetch(url, { credentials: "include" });
        const users = await res.json();

        const container = document.querySelector(".card-list");
        container.innerHTML = "";

        users.forEach(user => {
            const card = document.createElement("div");
            card.className = "card-item";
            card.innerHTML = `
                <div><strong>Name:</strong> ${user.username}</div>
                <div><strong>Email:</strong> ${user.email}</div>
                <div><strong>Role:</strong> ${user.role}</div>
                <div><strong>Registered:</strong> ${new Date(user.created_at).toLocaleString()}</div>
                <div class="user-actions">
                    <button style="background-color: red; color: white;" onclick="deleteUser(${user.id})">Delete</button>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        console.error("Error loading users:", err);
    }
}

async function handleCreateUser(e) {
    e.preventDefault();

    const form = e.target;
    const inputs = form.querySelectorAll("input, select");

    const data = {
        username: inputs[0].value,
        email: inputs[1].value,
        role: inputs[2].value,
        password: inputs[3].value
    };

    try {
        const res = await fetch("http://161.35.99.95:3000/api/admin/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(data)
        });

        const result = await res.json();
        alert(result.message);
        loadUsers();
        form.reset();
    } catch (err) {
        console.error("Error creating user:", err);
        alert("Failed to create user.");
    }
}

async function deleteUser(userId) {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
        const res = await fetch(`http://161.35.99.95:3000/api/admin/users/${userId}`, {
            method: "DELETE",
            credentials: "include"
        });

        const result = await res.json();
        alert(result.message);
        loadUsers();
    } catch (err) {
        console.error("Error deleting user:", err);
        alert("Failed to delete user.");
    }
}
