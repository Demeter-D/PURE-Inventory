require("dotenv").config();
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const http = require("http");
const { Server } = require("socket.io");

const { db, CATEGORIES } = require("./db");
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
  "notes"
];

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: CLIENT_ORIGIN, credentials: true }
});

app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

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
    sortOrder: row.sort_order,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by
  };
}

// ---- Auth routes ----

app.get("/api/auth/me", (req, res) => {
  const token = req.cookies?.[COOKIE_NAME];
  const user = token && verify(token);
  if (!user) return res.status(401).json({ error: "Not authenticated" });
  res.json({ user });
});

app.post("/api/auth/login", (req, res) => {
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

app.get("/api/products", (req, res) => {
  const rows = db.prepare("SELECT * FROM products ORDER BY sort_order ASC").all();
  res.json({ products: rows.map(serializeProduct), categories: CATEGORIES, statuses: STATUSES });
});

app.post("/api/products", (req, res) => {
  const maxOrder = db.prepare("SELECT MAX(sort_order) AS m FROM products").get().m || 0;
  const id = crypto.randomUUID();
  const category = CATEGORIES.includes(req.body?.category) ? req.body.category : CATEGORIES[0];
  db.prepare(
    `INSERT INTO products (id, category, sort_order, updated_by, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))`
  ).run(id, category, maxOrder + 1, req.user.name);
  const row = db.prepare("SELECT * FROM products WHERE id = ?").get(id);
  const product = serializeProduct(row);
  io.emit("product:created", { product, by: req.user.name });
  res.status(201).json({ product });
});

app.patch("/api/products/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Not found" });

  const updates = {};
  for (const field of EDITABLE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(req.body || {}, field)) {
      updates[field] = String(req.body[field] ?? "");
    }
  }
  if (updates.category && !CATEGORIES.includes(updates.category)) delete updates.category;
  if (updates.status && !STATUSES.includes(updates.status)) delete updates.status;

  const keys = Object.keys(updates);
  if (keys.length === 0) return res.json({ product: serializeProduct(existing) });

  const setClause = keys.map((k) => `${k} = @${k}`).join(", ");
  db.prepare(
    `UPDATE products SET ${setClause}, updated_at = datetime('now'), updated_by = @updated_by WHERE id = @id`
  ).run({ ...updates, updated_by: req.user.name, id: req.params.id });

  const row = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
  const product = serializeProduct(row);
  io.emit("product:updated", { product, by: req.user.name });
  res.json({ product });
});

app.delete("/api/products/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Not found" });
  db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
  io.emit("product:deleted", { id: req.params.id, by: req.user.name });
  res.json({ ok: true });
});

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

server.listen(PORT, () => {
  console.log(`PURE Cabin Shop Inventory server listening on port ${PORT}`);
});
