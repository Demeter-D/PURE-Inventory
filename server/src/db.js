const { Pool } = require("pg");

const CATEGORIES = ["Snacks", "Food", "Cellar", "Firewood", "Local Goods", "Essentials"];

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required (Postgres connection string)");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: false }
});

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_by TEXT
    );
  `);

  const { rows } = await pool.query("SELECT COUNT(*)::int AS c FROM products");
  if (rows[0].c === 0) {
    const values = CATEGORIES.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2}, 'seed')`).join(", ");
    const params = CATEGORIES.flatMap((category, i) => [category, i]);
    await pool.query(
      `INSERT INTO products (category, sort_order, updated_by) VALUES ${values}`,
      params
    );
  }
}

module.exports = { pool, init, CATEGORIES };
