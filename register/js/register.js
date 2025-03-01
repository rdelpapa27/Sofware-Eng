document.addEventListener("DOMContentLoaded", function () {
    const registerForm = document.getElementById("register-form");

    registerForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        // Get form values
        const username = document.getElementById("username").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value.trim();

        try {
            const response = await fetch("http://161.35.99.95:3000/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, email, password })
            });

            const data = await response.json();
            if (response.ok) {
                alert("Registration successful! Redirecting to login...");
                window.location.href = "../login/login.html"; // Redirect to login page
            } else {
                alert(data.message || "Registration failed. Please try again.");
            }
        } catch (error) {
            console.error("Error registering user:", error);
            alert("An error occurred. Please try again later.");
        }
    });
});
