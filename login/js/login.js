document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("login-form");

    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        // Get form values
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value.trim();

        try {
            const response = await fetch("http://161.35.99.95:3000/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();
            if (response.ok) {
                alert("Login successful! Redirecting to catalog...");
                window.location.href = "../catalog.html"; // Redirect to catalog page
            } else {
                alert(data.message || "Invalid credentials. Please try again.");
            }
        } catch (error) {
            console.error("Error logging in:", error);
            alert("An error occurred. Please try again later.");
        }
    });
});
