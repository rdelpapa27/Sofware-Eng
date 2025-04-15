document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("login-form");

    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value.trim();

        if (!email || !password) {
            alert("Email and password are required.");
            return;
        }

        try {
            console.log("🔍 Attempting employee login...");

            const response = await fetch("http://161.35.99.95:3000/api/employee-login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();
            console.log("📩 Server Response:", data);

            if (response.ok) {
                console.log("✅ Employee login successful! Redirecting...");
                window.location.href = "http://161.35.99.95:3000/employeeProfile.html";
            } else {
                console.log("❌ Login failed:", data.message);
                alert(data.message || "Invalid email or password. Try again.");
            }
        } catch (error) {
            console.error("🚨 Employee login error:", error);
            alert("An error occurred. Please try again later.");
        }
    });

    checkLoggedInEmployee();
});

async function checkLoggedInEmployee() {
    try {
        console.log("🔍 Checking employee session...");

        const response = await fetch("http://161.35.99.95:3000/api/user", {
            method: "GET",
            credentials: "include"
        });

        if (response.ok) {
            const userData = await response.json();
            console.log("✅ Session found:", userData);

            if (userData.role === "employee") {
                console.log("🔁 Already logged in as employee. Redirecting...");
                window.location.href = "http://161.35.99.95:3000/employeeProfile.html";
            }
        }
    } catch (error) {
        console.error("❌ Error checking session:", error);
    }
}
