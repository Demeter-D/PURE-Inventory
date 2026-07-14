const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "..", "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, "inventory.db"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL DEFAULT 'Snacks',
    product TEXT NOT NULL DEFAULT '',
    size TEXT NOT NULL DEFAULT '',
    unit TEXT NOT NULL DEFAULT '',
    sku TEXT NOT NULL DEFAULT '',
    wholesale TEXT NOT NULL DEFAULT '',
    stock TEXT NOT NULL DEFAULT '',
    reorder TEXT NOT NULL DEFAULT '',
    supplier TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'Active',
    notes TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_by TEXT
  );
`);

const CATEGORIES = ["Snacks", "Food", "Cellar", "Firewood", "Local Goods", "Essentials"];

const seedCount = db.prepare("SELECT COUNT(*) AS c FROM products").get().c;
if (seedCount === 0) {
  const insert = db.prepare(`
    INSERT INTO products (id, category, sort_order, updated_by)
    VALUES (@id, @category, @sort_order, 'seed')
  `);
  const seedMany = db.transaction((rows) => {
    rows.forEach((r) => insert.run(r));
  });
  seedMany(
    CATEGORIES.map((category, i) => ({
      id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
      category,
      sort_order: i
    }))
  );
}

module.exports = { db, CATEGORIES };
