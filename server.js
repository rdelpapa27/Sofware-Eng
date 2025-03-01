require('dotenv').config({ path: './dealer_db.env' });
const express = require("express");
const path = require("path");
const cors = require("cors");
const db = require("./db"); // MySQL database connection
const bcrypt = require("bcryptjs");
const session = require("express-session");
const cookieParser = require("cookie-parser");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors({ credentials: true, origin: "http://161.35.99.95:3000" }));
app.use(cookieParser());

// ✅ Configure session middleware
app.use(session({
    secret: "supersecretkey",  // 🔒 Change this to a strong secret
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,  // Prevents JavaScript access to session cookie
        secure: false,   // Set to `true` if using HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// ✅ Serve static files (Landing Page, Register, Login)
app.use(express.static(path.join(__dirname, "aboutMe"), { extensions: ["html", "png"] }));

// ✅ Homepage Route
app.get("/", (req, res) => {
    res.send("<h1>Welcome to Deluxury Autos Server</h1>");
});

// ✅ User Registration API
app.post("/api/register", async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: "All fields are required." });
    }

    try {
        // Check if username or email already exists
        const [existingUsers] = await db.query("SELECT * FROM users WHERE username = ? OR email = ?", [username, email]);
        if (existingUsers.length > 0) {
            return res.status(400).json({ message: "Username or email already exists." });
        }

        // Hash password before storing
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new user into MySQL
        await db.query("INSERT INTO users (username, email, password) VALUES (?, ?, ?)", [username, email, hashedPassword]);

        res.status(201).json({ message: "Registration successful! Please log in." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ✅ User Login API (Creates a Session)
app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        // Check if user exists
        const [users] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
        if (users.length === 0) {
            return res.status(401).json({ message: "Invalid email or password." });
        }

        const user = users[0];

        // Compare passwords
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid email or password." });
        }

        // ✅ Store session data
        req.session.user = {
            userId: user.id,
            username: user.username,
            email: user.email
        };

        res.status(200).json({ message: "Login successful!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ✅ Get Logged-in User (Session Check)
app.get("/api/user", (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: "Not logged in" });
    }
    res.json(req.session.user);
});

// ✅ Logout API (Destroys Session)
app.post("/api/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ message: "Error logging out." });
        }
        res.clearCookie("connect.sid"); // Clears session cookie
        res.json({ message: "Logout successful!" });
    });
});

// ✅ Fetch Orders for Logged-in User
app.get("/api/orders/:userId", async (req, res) => {
    const userId = req.params.userId;

    try {
        const [orders] = await db.query(`
            SELECT o.id, o.status, o.total_price, JSON_ARRAYAGG(
                JSON_OBJECT('name', p.name, 'price', p.price)
            ) AS items
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN products p ON oi.product_id = p.id
            WHERE o.user_id = ?
            GROUP BY o.id
            ORDER BY o.created_at DESC
        `, [userId]);

        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ✅ Start the Server
app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running at http://161.35.99.95:${PORT}/`);
});
