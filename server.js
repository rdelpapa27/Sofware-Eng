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
        httpOnly: true,
        secure: false,   
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// ✅ Middleware to restrict employee-only routes
function requireEmployee(req, res, next) {
    if (!(req.session.employee || req.session.admin)) {
        return res.status(403).json({ message: "Access denied" });
    }
    next();
}

function requireAdminOrEmployee(req, res, next) {
    if (!(req.session.admin || req.session.employee)) {
        return res.status(403).json({ message: "Access denied" });
    }
    next();
}

function requireCustomer(req, res, next) {
    if (!req.session.user || req.session.user.role !== "user") {
        return res.status(403).json({ message: "Customer access only." });
    }
    next();
}

// Route to get all unclaimed orders for employees
app.get("/api/employee/orders", requireEmployee, async (req, res) => {
    try {
        const [orders] = await db.query(`
            SELECT 
                o.id AS order_id,
                o.status,
                o.total_price,
                o.order_date,
                u.username AS customer_name,
                GROUP_CONCAT(p.name SEPARATOR ', ') AS products
            FROM orders o
            JOIN users u ON o.user_id = u.id
            JOIN order_items oi ON o.id = oi.order_id
            JOIN Products p ON oi.product_id = p.product_id
            WHERE o.employee_id IS NULL AND o.status != 'Complete'
            GROUP BY o.id
            ORDER BY o.order_date ASC
        `);
        

        res.json(orders);
    } catch (error) {
        console.error("❌ Error fetching unclaimed orders:", error);
        res.status(500).json({ error: error.message });
    }
});

app.post("/api/employee/claim-order/:orderId", requireEmployee, async (req, res) => {
    const employeeId = req.session.employee.employeeId;
    const orderId = req.params.orderId;

    try {
        const [result] = await db.query(
            "UPDATE orders SET employee_id = ? WHERE id = ? AND employee_id IS NULL",
            [employeeId, orderId]
        );

        if (result.affectedRows === 0) {
            return res.status(400).json({ message: "Order is already claimed or does not exist." });
        }

        res.json({ message: "Order successfully claimed." });
    } catch (error) {
        console.error("❌ Error claiming order:", error);
        res.status(500).json({ error: error.message });
    }
});

app.get("/api/employee/claimed-orders", requireEmployee, async (req, res) => {
    const employeeId = req.session.employee.employeeId;

    try {
        const [orders] = await db.query(`
            SELECT 
                o.id AS order_id,
                o.status,
                o.order_date,
                o.total_price,
                GROUP_CONCAT(p.name SEPARATOR ', ') AS items
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN Products p ON oi.product_id = p.product_id
            WHERE o.employee_id = ?
            GROUP BY o.id, o.status, o.order_date, o.total_price
            ORDER BY o.order_date ASC
        `, [employeeId]);

        res.json(orders);
    } catch (error) {
        console.error("❌ Error fetching claimed orders:", error);
        res.status(500).json({ error: error.message });
    }
});


app.get("/api/employee/me", requireEmployee, (req, res) => {
    res.json({
        employeeId: req.session.employee.employeeId,
        username: req.session.employee.username,
        email: req.session.employee.email
    });
});

app.post("/api/employee/release-order/:orderId", requireEmployee, async (req, res) => {
    const employeeId = req.session.employee.employeeId;
    const orderId = req.params.orderId;

    try {
        const [result] = await db.query(
            "UPDATE orders SET employee_id = NULL WHERE id = ? AND employee_id = ?",
            [orderId, employeeId]
        );

        if (result.affectedRows === 0) {
            return res.status(400).json({ message: "Order not found or not owned by you." });
        }

        res.json({ message: "Order released back to queue." });
    } catch (error) {
        console.error("❌ Error releasing order:", error);
        res.status(500).json({ error: error.message });
    }
});

app.post("/api/employee/complete-order/:orderId", requireEmployee, async (req, res) => {
    const employeeId = req.session.employee.employeeId;
    const orderId = req.params.orderId;

    try {
        const [result] = await db.query(
            "UPDATE orders SET status = 'Complete', employee_id = NULL WHERE id = ? AND employee_id = ?",
            [orderId, employeeId]
        );

        if (result.affectedRows === 0) {
            return res.status(400).json({ message: "Order not found or not owned by you." });
        }

        res.json({ message: "Order marked as complete." });
    } catch (error) {
        console.error("❌ Error completing order:", error);
        res.status(500).json({ error: error.message });
    }
});

app.post("/api/employee/update-status/:orderId", requireEmployee, async (req, res) => {
    const employeeId = req.session.employee.employeeId;
    const orderId = req.params.orderId;
    const { status } = req.body;

    const validStatuses = ["Processing", "In Progress", "Ready", "Shipped", "Complete"];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status value." });
    }

    try {
        const [result] = await db.query(
            "UPDATE orders SET status = ? WHERE id = ? AND employee_id = ?",
            [status, orderId, employeeId]
        );

        if (result.affectedRows === 0) {
            return res.status(400).json({ message: "Order not found or not owned by you." });
        }

        res.json({ message: `Order status updated to ${status}` });
    } catch (error) {
        console.error("❌ Error updating status:", error);
        res.status(500).json({ error: error.message });
    }
});


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
            email: user.email,
            role: user.role
        };

        res.status(200).json({ message: "Login successful!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get("/api/user", (req, res) => {
    if (req.session.admin) {
        return res.json({
            userId: req.session.admin.adminId,
            username: req.session.admin.username,
            email: req.session.admin.email,
            role: "admin"
        });
    } else if (req.session.employee) {
        return res.json({
            userId: req.session.employee.employeeId,
            username: req.session.employee.username,
            email: req.session.employee.email,
            role: "employee"
        });
    } else if (req.session.user) {
        return res.json({
            userId: req.session.user.userId,
            username: req.session.user.username,
            email: req.session.user.email,
            role: req.session.user.role || "user"
        });
    } else {
        return res.status(401).json({ message: "Not logged in" });
    }
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

// ✅ PLACE ORDER (Saves order to the database)
app.post("/api/place-order", async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: "You must be logged in to place an order." });
    }

    const userId = req.session.user.userId;
    const { cart } = req.body;

    if (!cart || cart.length === 0) {
        return res.status(400).json({ message: "Your cart is empty." });
    }

    try {
        // Insert order into orders table
        const [orderResult] = await db.query(
            "INSERT INTO orders (user_id, total_price, status) VALUES (?, ?, ?)", 
            [userId, 0, "Processing"]
        );
        const orderId = orderResult.insertId;
        
        let total = 0;
        
        // Insert each item in order_items table
        for (const item of cart) {
            const [product] = await db.query("SELECT product_id, price FROM Products WHERE name = ?", [item.title]);
            if (product.length > 0) {
                total += parseFloat(product[0].price);
                await db.query("INSERT INTO order_items (order_id, product_id, price) VALUES (?, ?, ?)", 
                               [orderId, product[0].product_id, product[0].price]);
            }
        }

        // Update total price in orders table
        await db.query("UPDATE orders SET total_price = ? WHERE id = ?", [total, orderId]);

        res.status(201).json({ message: "Order placed successfully!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post("/api/reviews", async (req, res) => {
    console.log("SESSION DEBUG:", req.session); // Add this

    if (!req.session.user || req.session.user.role !== "user") {
        return res.status(403).json({ message: "Only logged-in customers can submit reviews." });
    }

    const { name, reviewText, rating } = req.body;
    const userId = req.session.user.userId;

    if (!name || !reviewText || !rating || rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Invalid review data." });
    }

    try {
        await db.query(
            "INSERT INTO reviews (user_id, name, review_text, rating) VALUES (?, ?, ?, ?)",
            [userId, name, reviewText, rating]
        );
        res.status(201).json({ message: "Review submitted!" });
    } catch (err) {
        console.error("❌ Review Insert Error:", err);
        res.status(500).json({ error: err.message });
    }
});



// ✅ FETCH USER'S ORDERS FROM DATABASE
app.get("/api/orders", async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: "Not logged in" });
    }

    try {
        const [orders] = await db.query(`
            SELECT o.id, GROUP_CONCAT(p.name SEPARATOR ', ') AS items, o.status, o.total_price 
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN Products p ON oi.product_id = p.product_id
            WHERE o.user_id = ?
            GROUP BY o.id, o.status, o.total_price
        `, [req.session.user.userId]);

        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ✅ Start the Server
app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running at http://161.35.99.95:${PORT}/`);
});

// ✅ Fetch Orders for a Specific User
app.get("/api/orders/:userId", async (req, res) => {
  const userId = req.params.userId;

  try {
      const [orders] = await db.query(`
          SELECT 
              o.id AS order_id, 
              o.status, 
              o.total_price, 
              o.order_date,
              p.name AS product_name,
              oi.price AS product_price
          FROM orders o
          LEFT JOIN order_items oi ON o.id = oi.order_id
          LEFT JOIN Products p ON oi.product_id = p.product_id
          WHERE o.user_id = ?
          ORDER BY o.order_date DESC
      `, [userId]);

      // Group orders with multiple items together
      const groupedOrders = orders.reduce((acc, order) => {
          const existingOrder = acc.find(o => o.order_id === order.order_id);
          if (existingOrder) {
              existingOrder.items.push({ name: order.product_name, price: order.product_price });
          } else {
              acc.push({
                  id: order.order_id,
                  status: order.status,
                  total_price: order.total_price,
                  order_date: order.order_date,
                  items: [{ name: order.product_name, price: order.product_price }]
              });
          }
          return acc;
      }, []);

      res.json(groupedOrders);
  } catch (error) {
      console.error("❌ Error fetching orders:", error);
      res.status(500).json({ error: error.message });
  }
});

app.post("/api/employee-login", async (req, res) => {
    const { email, password } = req.body;

    try {
        const [employees] = await db.query("SELECT * FROM users WHERE email = ? AND role = 'employee'", [email]);
        if (employees.length === 0) {
            return res.status(401).json({ message: "Invalid credentials or not an employee." });
        }

        const employee = employees[0];
        const isMatch = await bcrypt.compare(password, employee.password);

        if (!isMatch) {
            return res.status(401).json({ message: "Incorrect password." });
        }

        // Store employee session
        req.session.employee = {
            employeeId: employee.id,
            username: employee.username,
            email: employee.email
        };

        res.status(200).json({ message: "Employee login successful!" });
    } catch (error) {
        console.error("❌ Employee login error:", error);
        res.status(500).json({ error: error.message });
    }
});
app.get("/api/reviews", async (req, res) => {
    try {
        const [reviews] = await db.query("SELECT name, review_text, rating, created_at FROM reviews ORDER BY created_at DESC");
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/api/admin-login", async (req, res) => {
    const { email, password } = req.body;

    try {
        const [admins] = await db.query("SELECT * FROM users WHERE email = ? AND role = 'admin'", [email]);
        if (admins.length === 0) {
            return res.status(401).json({ message: "Invalid credentials or not an admin." });
        }

        const admin = admins[0];
        const isMatch = await bcrypt.compare(password, admin.password);

        if (!isMatch) {
            return res.status(401).json({ message: "Incorrect password." });
        }

        // Store admin session
        req.session.admin = {
            adminId: admin.id,
            username: admin.username,
            email: admin.email
        };
        

        res.status(200).json({ message: "Admin login successful!" });
    } catch (error) {
        console.error("❌ Admin login error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.post("/api/employee/complete-order/:orderId", requireEmployee, async (req, res) => {
    const employeeId = req.session.employee.employeeId;
    const orderId = req.params.orderId;

    const connection = await db.getConnection(); // start transaction
    try {
        await connection.beginTransaction();

        // Get the full order
        const [orderRows] = await connection.query("SELECT * FROM orders WHERE id = ? AND employee_id = ?", [orderId, employeeId]);
        if (orderRows.length === 0) {
            await connection.release();
            return res.status(400).json({ message: "Order not found or not owned by you." });
        }
        const order = orderRows[0];

        // Archive order
        const [archiveResult] = await connection.query(`
            INSERT INTO archived_orders (original_order_id, user_id, employee_id, status, total_price, order_date)
            VALUES (?, ?, ?, 'Complete', ?, ?, ?)`,
            [order.id, order.user_id, order.employee_id, order.total_price, order.order_date]
        );
        const archivedOrderId = archiveResult.insertId;

        // Get order items
        const [items] = await connection.query("SELECT * FROM order_items WHERE order_id = ?", [orderId]);

        // Archive each item
        for (const item of items) {
            await connection.query(`
                INSERT INTO archived_order_items (archived_order_id, product_id, price)
                VALUES (?, ?, ?)`,
                [archivedOrderId, item.product_id, item.price]
            );
        }

        // Delete original items and order
        await connection.query("DELETE FROM order_items WHERE order_id = ?", [orderId]);
        await connection.query("DELETE FROM orders WHERE id = ?", [orderId]);

        await connection.commit();
        await connection.release();

        res.json({ message: "Order successfully archived and removed from active queue." });

    } catch (error) {
        await connection.rollback();
        await connection.release();
        console.error("❌ Error completing & archiving order:", error);
        res.status(500).json({ error: error.message });
    }
});

function requireAdmin(req, res, next) {
    if (!req.session.admin) return res.status(403).json({ message: "Admin access only." });
    next();
}

// Admin session route
app.get("/api/admin/me", requireAdmin, (req, res) => {
    res.json({
        adminId: req.session.admin.adminId,
        username: req.session.admin.username,
        email: req.session.admin.email,
        role: "admin"
    });
});

// Recently registered users
app.get("/api/admin/recent-users", requireAdmin, async (req, res) => {
    try {
        const [users] = await db.query(`
            SELECT username, email, created_at
            FROM users
            ORDER BY created_at DESC
            LIMIT 3
        `);
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Recently active employees (based on last claimed/completed order)
app.get("/api/admin/active-employees", requireAdmin, async (req, res) => {
    try {
        const [employees] = await db.query(`
            SELECT u.username, u.email, MAX(o.order_date) as last_active
            FROM orders o
            JOIN users u ON o.employee_id = u.id
            WHERE u.role = 'employee'
            GROUP BY u.id
            ORDER BY last_active DESC
            LIMIT 2
        `);
        res.json(employees);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Recently placed orders
app.get("/api/admin/recent-orders", requireAdmin, async (req, res) => {
    try {
        const [orders] = await db.query(`
            SELECT o.id, u.username as customer, o.order_date,
                GROUP_CONCAT(p.name SEPARATOR ', ') AS items
            FROM orders o
            JOIN users u ON o.user_id = u.id
            JOIN order_items oi ON o.id = oi.order_id
            JOIN Products p ON oi.product_id = p.product_id
            GROUP BY o.id
            ORDER BY o.order_date DESC
            LIMIT 5
        `);
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Orders claimed by admin
app.get("/api/admin/claimed-orders", requireAdmin, async (req, res) => {
    const adminId = req.session.admin.adminId;
    try {
        const [orders] = await db.query(`
            SELECT o.id, u.username as customer, o.status
            FROM orders o
            JOIN users u ON o.user_id = u.id
            WHERE o.employee_id = ?
        `, [adminId]);
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/api/admin/users", requireAdmin, async (req, res) => {
    const { role } = req.query;

    try {
        const query = role 
            ? "SELECT * FROM users WHERE role = ? ORDER BY created_at DESC"
            : "SELECT * FROM users ORDER BY created_at DESC";
        const params = role ? [role] : [];

        const [users] = await db.query(query, params);
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/api/admin/users", requireAdmin, async (req, res) => {
    const { username, email, role, password } = req.body;

    if (!username || !email || !role || !password) {
        return res.status(400).json({ message: "All fields are required." });
    }

    try {
        const [existing] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
        if (existing.length > 0) {
            return res.status(400).json({ message: "Email already in use." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await db.query(
            "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)",
            [username, email, hashedPassword, role]
        );

        res.status(201).json({ message: "User created successfully." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
    const userId = req.params.id;

    try {
        const [result] = await db.query("DELETE FROM users WHERE id = ?", [userId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "User not found." });
        }

        res.json({ message: "User deleted successfully." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Middleware to restrict admin-only routes
function requireAdmin(req, res, next) {
    if (!req.session.admin) return res.status(403).json({ message: "Admin access only." });
    next();
}

// ✅ GET all products
app.get("/api/products", requireAdmin, async (req, res) => {
    try {
        const [products] = await db.query("SELECT * FROM Products ORDER BY product_id DESC");
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/api/products", requireAdmin, async (req, res) => {
    const { name, description, price, quantity } = req.body;

    if (!name || !description || isNaN(price) || isNaN(quantity)) {
        return res.status(400).json({ message: "Invalid input fields." });
    }

    try {
        await db.query(
            "INSERT INTO Products (name, description, price, quantity, image_url) VALUES (?, ?, ?, ?, ?)",
            [name, description, price, quantity, ""]
        );

        res.status(201).json({ message: "Product added successfully." });
    } catch (error) {
        console.error("❌ Error adding product:", error);
        res.status(500).json({ message: "Server error while adding product." });
    }
});


// ✅ DELETE product
app.delete("/api/products/:id", requireAdmin, async (req, res) => {
    const productId = req.params.id;

    try {
        const [result] = await db.query("DELETE FROM Products WHERE product_id = ?", [productId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Product not found." });
        }

        res.json({ message: "Product deleted successfully." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update product by ID
app.put("/api/products/:productId", requireAdmin, async (req, res) => {
    const productId = req.params.productId;
    const { name, description, price, quantity } = req.body;

    if (!name || !description || isNaN(price) || isNaN(quantity)) {
        return res.status(400).json({ message: "Invalid input." });
    }

    try {
        const [result] = await db.query(
            "UPDATE Products SET name = ?, description = ?, price = ?, quantity = ? WHERE product_id = ?",
            [name, description, price, quantity, productId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Product not found." });
        }

        res.json({ message: "Product updated successfully." });
    } catch (error) {
        console.error("❌ Error updating product:", error);
        res.status(500).json({ message: "Failed to update product." });
    }
});

// Get a single product by ID
app.get("/api/products/:productId", requireAdmin, async (req, res) => {
    const productId = req.params.productId;

    try {
        const [rows] = await db.query(
            "SELECT * FROM Products WHERE product_id = ?",
            [productId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Product not found." });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error("❌ Error fetching product:", error);
        res.status(500).json({ message: "Failed to retrieve product." });
    }
});

app.get("/api/admin/orders", requireAdminOrEmployee, async (req, res) => {
    try {
        const [orders] = await db.query(`
            SELECT 
                o.id AS order_id,
                o.status,
                o.total_price,
                o.order_date,
                u.username AS customer_name,
                GROUP_CONCAT(p.name SEPARATOR ', ') AS products
            FROM orders o
            JOIN users u ON o.user_id = u.id
            JOIN order_items oi ON o.id = oi.order_id
            JOIN Products p ON oi.product_id = p.product_id
            WHERE o.employee_id IS NULL AND o.status != 'Complete'
            GROUP BY o.id
            ORDER BY o.order_date ASC
        `);
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/api/admin/claim-order/:orderId", requireAdminOrEmployee, async (req, res) => {
    const adminId = req.session.admin?.adminId;
    const orderId = req.params.orderId;

    try {
        const [result] = await db.query(
            "UPDATE orders SET employee_id = ? WHERE id = ? AND employee_id IS NULL",
            [adminId, orderId]
        );

        if (result.affectedRows === 0) {
            return res.status(400).json({ message: "Order is already claimed or does not exist." });
        }

        res.json({ message: "Order successfully claimed by admin." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/api/admin/claimed-orders-full", requireAdminOrEmployee, async (req, res) => {
    const adminId = req.session.admin?.adminId;

    try {
        const [orders] = await db.query(`
            SELECT 
                o.id AS order_id,
                o.status,
                o.order_date,
                o.total_price,
                GROUP_CONCAT(p.name SEPARATOR ', ') AS items
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN Products p ON oi.product_id = p.product_id
            WHERE o.employee_id = ?
            GROUP BY o.id, o.status, o.order_date, o.total_price
            ORDER BY o.order_date ASC
        `, [adminId]);

        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/api/admin/complete-order/:orderId", requireAdminOrEmployee, async (req, res) => {
    const adminId = req.session.admin?.adminId;
    const orderId = req.params.orderId;

    try {
        const [result] = await db.query(
            "UPDATE orders SET status = 'Complete', employee_id = NULL WHERE id = ? AND employee_id = ?",
            [orderId, adminId]
        );

        if (result.affectedRows === 0) {
            return res.status(400).json({ message: "Order not found or not owned by admin." });
        }

        res.json({ message: "Order marked as complete by admin." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/api/admin/update-status/:orderId", requireAdminOrEmployee, async (req, res) => {
    const adminId = req.session.admin?.adminId;
    const orderId = req.params.orderId;
    const { status } = req.body;

    const validStatuses = ["Processing", "In Progress", "Ready", "Shipped", "Complete"];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status value." });
    }

    try {
        const [result] = await db.query(
            "UPDATE orders SET status = ? WHERE id = ? AND employee_id = ?",
            [status, orderId, adminId]
        );

        if (result.affectedRows === 0) {
            return res.status(400).json({ message: "Order not found or not owned by admin." });
        }

        res.json({ message: `Order status updated to ${status}` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});




