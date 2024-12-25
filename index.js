const express = require("express");
const cors = require("cors");
require("dotenv").config();
const cookieParser = require("cookie-parser");
const multer = require("multer");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg"); 


const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, 
  },
});

pool
  .connect()
  .then(() => console.log("PostgreSQL database connected."))
  .catch((err) => console.error("Error connecting to PostgreSQL:", err));

const bcryptSalt = bcrypt.genSaltSync(10);
const jwtSecret = process.env.JWT_SECRET || "your_jwt_secret";

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    credentials: true,
    origin: "http://localhost:5173", 
  })
);


app.use("/uploads", express.static(path.join(__dirname, "uploads")));


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); 
  },
});
const upload = multer({ storage });

const isAdmin = (user) => user && user.role === "admin";

const createDefaultAdmin = async () => {
  try {
    const result = await pool.query("SELECT * FROM users WHERE role = 'admin'");
    if (result.rows.length === 0) {
      await pool.query(
        `INSERT INTO users (name, email, password, role)
         VALUES ('Admin', 'admin@example.com', $1, 'admin')`,
        [bcrypt.hashSync("admin123", bcryptSalt)]
      );
      console.log("Default admin created");
    }
  } catch (err) {
    console.error("Error creating default admin:", err);
  }
};
createDefaultAdmin();

app.get("/test", (req, res) => res.json("test ok"));

app.post("/register", async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    const userRole = role || "user";
    const hashedPassword = bcrypt.hashSync(password, bcryptSalt);
    const result = await pool.query(
      "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING *",
      [name, email, hashedPassword, userRole]
    );

    res.status(201).json({ message: "Registration successful", user: result.rows[0] });
  } catch (error) {
    console.error("Error during registration:", error);

  
    if (error.code === "23505") {
      return res.status(400).json({
        error: "Duplicate entry",
        details: "This email is already registered. Please log in instead.",
      });
    }

    res.status(500).json({ error: "Registration failed", details: error.message });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query(
      "SELECT id, name, email, password, role FROM users WHERE email = $1",
      [email]
    );
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: "User not found" });

    const passOk = bcrypt.compareSync(password, user.password);
    if (!passOk) return res.status(401).json({ error: "Invalid password" });

    const token = jwt.sign(
      { email: user.email, id: user.id, role: user.role },
      jwtSecret,
      { expiresIn: "1h" }
    );

    res.cookie("token", token, { httpOnly: true }).json({ user, token });
  } catch (e) {
    console.error("Error during login:", e);
    res.status(500).json({ error: "Login failed", details: e.message });
  }
});

app.get("/profile", async (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    const decoded = jwt.verify(token, jwtSecret);
    const result = await pool.query(
      "SELECT id, name, email, role FROM users WHERE id = $1",
      [decoded.id]
    );
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
  } catch (err) {
    console.error("Error verifying token:", err);
    res.status(401).json({ error: "Failed to authenticate token" });
  }
});

app.post("/createEvent", upload.single("image"), async (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    const decoded = jwt.verify(token);
    const result = await pool.query(
      "SELECT * FROM users WHERE id = $1",
      [decoded.id]
    );
    const user = result.rows[0];

    if (!isAdmin(user)) {
      return res.status(403).json({ error: "Only admins can create events" });
    }

    const { title, description, eventDate, eventTime, location } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : "";

    if (!title || !description || !eventDate || !eventTime || !location) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const eventData = { title, description, date: eventDate, time: eventTime, location, image };
    const eventResult = await pool.query(
      "INSERT INTO events (title, description, date, time, location, image, organizer) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
      [title, description, eventDate, eventTime, location, image]
    );

    res.status(201).json(eventResult.rows[0]);
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({ error: "Failed to create event", details: error.message });
  }
});

app.get("/events", async (req, res) => {

  try {
    const result = await pool.query("SELECT * FROM events");
    res.json(result.rows);
  } catch (error) {
    console.error("Failed to fetch events:", error);
    res.status(500).json({ error: "Failed to fetch events", details: error.message });
  }
});

app.get("/event/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query("SELECT * FROM events WHERE id = $1", [id]);
    const event = result.rows[0];
    if (!event) return res.status(404).json({ error: "Event not found" });

    res.json(event);
  } catch (error) {
    console.error("Error fetching event:", error);
    res.status(500).json({ error: "Failed to fetch event", details: error.message });
  }
});

app.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.status(200).json({ message: "Logged out successfully" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

