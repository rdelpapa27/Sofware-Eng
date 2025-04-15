document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("admin-login-form");
  
    loginForm.addEventListener("submit", async function (event) {
      event.preventDefault();
  
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value.trim();
  
      if (!email || !password) {
        alert("Email and password are required.");
        return;
      }
  
      try {
        const response = await fetch("http://161.35.99.95:3000/api/admin-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email, password })
        });
  
        const data = await response.json();
  
        if (response.ok) {
          window.location.href = "adminProfile.html";
        } else {
          alert(data.message || "Invalid admin credentials.");
        }
      } catch (error) {
        console.error("Admin login error:", error);
        alert("An error occurred. Please try again.");
      }
    });
  
    checkAdminSession();
  });
  
  async function checkAdminSession() {
    try {
      const response = await fetch("http://161.35.99.95:3000/api/user", {
        method: "GET",
        credentials: "include"
      });
  
      if (response.ok) {
        const user = await response.json();
        if (user.role === "admin") {
          window.location.href = "adminProfile.html";
        }
      }
    } catch (err) {
      console.error("Error checking admin session:", err);
    }
  }
  