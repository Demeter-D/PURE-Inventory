require("dotenv").config();
const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const http = require("http");
const { Server } = require("socket.io");

const { pool, init, CATEGORIES } = require("./db");
const { login, verify, requireAuth, COOKIE_NAME, COLLABORATORS } = require("./auth");

const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const STATUSES = ["Active", "Seasonal", "Discontinued"];
const EDITABLE_FIELDS = [
  "category",
  "product",
  "size",
  "unit",
  "sku",
  "wholesale",
  "stock",
  "reorder",
  "supplier",
  "status",
  "notes",
  "saleActual"
];
const FIELD_TO_COLUMN = { saleActual: "sale_actual" };

const app = express();
// Render (and most PaaS hosts) sit behind a reverse proxy; trust its
// X-Forwarded-For so rate limiting keys on the real client IP.
if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: CLIENT_ORIGIN, credentials: true }
});

app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Try again later." }
});

const isProd = process.env.NODE_ENV === "production";
const cookieOpts = {
  httpOnly: true,
  sameSite: "lax",
  secure: isProd,
  maxAge: 30 * 24 * 60 * 60 * 1000
};

function serializeProduct(row) {
  return {
    id: row.id,
    category: row.category,
    product: row.product,
    size: row.size,
    unit: row.unit,
    sku: row.sku,
    wholesale: row.wholesale,
    stock: row.stock,
    reorder: row.reorder,
    supplier: row.supplier,
    status: row.status,
    notes: row.notes,
    saleActual: row.sale_actual,
    sortOrder: row.sort_order,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
    updatedBy: row.updated_by
  };
}

function asyncRoute(handler) {
  return (req, res, next) => handler(req, res, next).catch(next);
}

// ---- Auth routes ----

app.get("/api/auth/me", (req, res) => {
  const token = req.cookies?.[COOKIE_NAME];
  const user = token && verify(token);
  if (!user) return res.status(401).json({ error: "Not authenticated" });
  res.json({ user });
});

app.post("/api/auth/login", loginLimiter, (req, res) => {
  const { userId, passcode } = req.body || {};
  const result = login(String(userId || "").toLowerCase(), String(passcode || ""));
  if (!result) return res.status(401).json({ error: "Invalid name or passcode" });
  res.cookie(COOKIE_NAME, result.token, cookieOpts);
  res.json({ user: { id: result.id, name: result.name } });
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie(COOKIE_NAME, { ...cookieOpts, maxAge: undefined });
  res.json({ ok: true });
});

app.get("/api/collaborators", (req, res) => {
  res.json({
    collaborators: Object.entries(COLLABORATORS).map(([id, c]) => ({ id, name: c.name }))
  });
});

// ---- Product routes (all require auth) ----

app.use("/api/products", requireAuth);

app.get(
  "/api/products",
  asyncRoute(async (req, res) => {
    const { rows } = await pool.query("SELECT * FROM products ORDER BY sort_order ASC");
    res.json({ products: rows.map(serializeProduct), categories: CATEGORIES, statuses: STATUSES });
  })
);

app.post(
  "/api/products",
  asyncRoute(async (req, res) => {
    const { rows: maxRows } = await pool.query("SELECT COALESCE(MAX(sort_order), 0) AS m FROM products");
    const nextOrder = maxRows[0].m + 1;
    const category = CATEGORIES.includes(req.body?.category) ? req.body.category : CATEGORIES[0];
    const { rows } = await pool.query(
      `INSERT INTO products (category, sort_order, updated_by)
       VALUES ($1, $2, $3) RETURNING *`,
      [category, nextOrder, req.user.name]
    );
    const product = serializeProduct(rows[0]);
    io.emit("product:created", { product, by: req.user.name });
    res.status(201).json({ product });
  })
);

app.patch(
  "/api/products/:id",
  asyncRoute(async (req, res) => {
    const updates = {};
    for (const field of EDITABLE_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(req.body || {}, field)) {
        updates[field] = String(req.body[field] ?? "");
      }
    }
    if (updates.category && !CATEGORIES.includes(updates.category)) delete updates.category;
    if (updates.status && !STATUSES.includes(updates.status)) delete updates.status;

    const keys = Object.keys(updates);
    if (keys.length === 0) {
      const { rows } = await pool.query("SELECT * FROM products WHERE id = $1", [req.params.id]);
      if (!rows[0]) return res.status(404).json({ error: "Not found" });
      return res.json({ product: serializeProduct(rows[0]) });
    }

    const setClause = keys.map((k, i) => `${FIELD_TO_COLUMN[k] || k} = $${i + 1}`).join(", ");
    const values = keys.map((k) => updates[k]);
    const { rows } = await pool.query(
      `UPDATE products SET ${setClause}, updated_at = now(), updated_by = $${keys.length + 1}
       WHERE id = $${keys.length + 2} RETURNING *`,
      [...values, req.user.name, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Not found" });

    const product = serializeProduct(rows[0]);
    io.emit("product:updated", { product, by: req.user.name });
    res.json({ product });
  })
);

app.delete(
  "/api/products/:id",
  asyncRoute(async (req, res) => {
    const { rows } = await pool.query("DELETE FROM products WHERE id = $1 RETURNING id", [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    io.emit("product:deleted", { id: req.params.id, by: req.user.name });
    res.json({ ok: true });
  })
);

// ---- Serve built frontend in production ----

const clientDist = path.join(__dirname, "..", "..", "client", "dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

function parseCookie(header, name) {
  if (!header) return null;
  const match = header.split(";").map((s) => s.trim()).find((s) => s.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

io.use((socket, next) => {
  const token = parseCookie(socket.handshake.headers.cookie, COOKIE_NAME);
  const user = token && verify(token);
  if (!user) return next(new Error("unauthorized"));
  socket.user = user;
  next();
});

io.on("connection", (socket) => {
  socket.on("disconnect", () => {});
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

init()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`PURE Cabin Shop Inventory server listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  });
