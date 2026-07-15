import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Login from "./components/Login.jsx";
import ProductTable from "./components/ProductTable.jsx";
import { api } from "./lib/api.js";
import { getSocket } from "./lib/socket.js";
import { CATEGORIES, categoryColor } from "./lib/categories.js";
import { exportCSV } from "./lib/csv.js";

const SAVE_DEBOUNCE_MS = 500;

export default function App() {
  const [authState, setAuthState] = useState("loading"); // loading | anon | authed
  const [user, setUser] = useState(null);
  const [collaborators, setCollaborators] = useState([]);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState(1);
  const [online, setOnline] = useState(false);

  const pendingSaves = useRef(new Map());

  useEffect(() => {
    api
      .collaborators()
      .then((d) => setCollaborators(d.collaborators))
      .catch(() => {});
    api
      .me()
      .then((d) => {
        setUser(d.user);
        setAuthState("authed");
      })
      .catch(() => setAuthState("anon"));
  }, []);

  useEffect(() => {
    if (authState !== "authed") return;
    let cancelled = false;
    api.listProducts().then((d) => {
      if (!cancelled) setRows(d.products);
    });
    return () => {
      cancelled = true;
    };
  }, [authState]);

  useEffect(() => {
    if (authState !== "authed") return;
    const socket = getSocket();
    socket.connect();

    const handleCreated = ({ product, by }) => {
      if (by === user?.name) return;
      setRows((prev) => (prev.some((r) => r.id === product.id) ? prev : [...prev, product]));
    };
    const handleUpdated = ({ product, by }) => {
      if (by === user?.name) return;
      setRows((prev) => prev.map((r) => (r.id === product.id ? product : r)));
    };
    const handleDeleted = ({ id, by }) => {
      if (by === user?.name) return;
      setRows((prev) => prev.filter((r) => r.id !== id));
    };

    socket.on("connect", () => setOnline(true));
    socket.on("disconnect", () => setOnline(false));
    socket.on("product:created", handleCreated);
    socket.on("product:updated", handleUpdated);
    socket.on("product:deleted", handleDeleted);

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("product:created", handleCreated);
      socket.off("product:updated", handleUpdated);
      socket.off("product:deleted", handleDeleted);
      socket.disconnect();
    };
  }, [authState, user?.name]);

  function handleLoggedIn(u) {
    setUser(u);
    setAuthState("authed");
  }

  async function handleLogout() {
    await api.logout().catch(() => {});
    setUser(null);
    setRows([]);
    setAuthState("anon");
  }

  const handleFieldChange = useCallback((id, field, value) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));

    const key = id;
    const existing = pendingSaves.current.get(key) || { timer: null, fields: {} };
    existing.fields[field] = value;
    clearTimeout(existing.timer);
    existing.timer = setTimeout(() => {
      const fields = existing.fields;
      pendingSaves.current.delete(key);
      api.updateProduct(id, fields).catch(() => {});
    }, SAVE_DEBOUNCE_MS);
    pendingSaves.current.set(key, existing);
  }, []);

  async function handleAddRow() {
    const category = filterCategory !== "All" ? filterCategory : CATEGORIES[0];
    const { product } = await api.createProduct(category);
    setRows((prev) => [...prev, product]);
  }

  async function handleDelete(id) {
    setRows((prev) => prev.filter((r) => r.id !== id));
    pendingSaves.current.delete(id);
    await api.deleteProduct(id).catch(() => {});
  }

  function handleSort(key) {
    setSortDir((prevDir) => (sortKey === key ? -prevDir : 1));
    setSortKey(key);
  }

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    let filtered = rows.filter((r) => {
      const matchesSearch =
        !q ||
        (r.product || "").toLowerCase().includes(q) ||
        (r.sku || "").toLowerCase().includes(q) ||
        (r.supplier || "").toLowerCase().includes(q);
      const matchesFilter = filterCategory === "All" || r.category === filterCategory;
      return matchesSearch && matchesFilter;
    });

    if (sortKey) {
      filtered = filtered.slice().sort((a, b) => {
        let av = a[sortKey];
        let bv = b[sortKey];
        if (sortKey === "wholesale" || sortKey === "stock") {
          av = parseFloat(av) || 0;
          bv = parseFloat(bv) || 0;
        } else {
          av = (av || "").toString().toLowerCase();
          bv = (bv || "").toString().toLowerCase();
        }
        if (av < bv) return -1 * sortDir;
        if (av > bv) return 1 * sortDir;
        return 0;
      });
    }
    return filtered;
  }, [rows, search, filterCategory, sortKey, sortDir]);

  const totalCount = rows.length;
  const lowStockCount = rows.filter((r) => {
    const s = r.stock !== "" ? parseFloat(r.stock) : NaN;
    const re = r.reorder !== "" ? parseFloat(r.reorder) : NaN;
    return !Number.isNaN(s) && !Number.isNaN(re) && s <= re;
  }).length;
  const totalWholesale = rows.reduce(
    (sum, r) => sum + (parseFloat(r.wholesale) || 0) * (parseFloat(r.stock) || 0),
    0
  );

  if (authState === "loading") {
    return <div className="loading-shell">Loading…</div>;
  }

  if (authState === "anon") {
    return <Login collaborators={collaborators} onLoggedIn={handleLoggedIn} />;
  }

  return (
    <div className="app-shell">
      <div className="header-row">
        <div>
          <div className="eyebrow">PURE × Stockley</div>
          <h1 className="page-title">Cabin Shop Inventory</h1>
        </div>
        <div className="header-actions">
          <div className="who-am-i">
            <span className={`sync-dot ${online ? "online" : "offline"}`} title={online ? "Live sync connected" : "Reconnecting…"} />
            Signed in as <strong>{user?.name}</strong>
            <button onClick={handleLogout}>Sign out</button>
          </div>
          <button className="btn" onClick={() => exportCSV(rows)}>
            ⇩ Export CSV
          </button>
          <button className="btn btn-primary" onClick={handleAddRow}>
            + Add product
          </button>
        </div>
      </div>

      <div className="summary-strip">
        <div className="stat-card">
          <div className="stat-label">Products</div>
          <div className="stat-value mono">{totalCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Low stock</div>
          <div className="stat-value mono" style={{ color: lowStockCount > 0 ? "oklch(0.55 0.15 30)" : "inherit" }}>
            {lowStockCount}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Wholesale value</div>
          <div className="stat-value mono">£{totalWholesale.toFixed(2)}</div>
        </div>
      </div>

      <div className="controls-row">
        <input
          className="search-input"
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="chip-row">
          {["All", ...CATEGORIES].map((cat) => {
            const active = filterCategory === cat;
            let bg, fg, border;
            if (cat === "All") {
              if (active) {
                bg = "oklch(0.35 0.05 55)";
                fg = "white";
                border = "oklch(0.35 0.05 55)";
              } else {
                bg = "white";
                fg = "oklch(0.4 0.02 60)";
                border = "oklch(0.86 0.01 70)";
              }
            } else {
              const cc = categoryColor(cat);
              if (active) {
                bg = cc.fg;
                fg = "white";
                border = cc.fg;
              } else {
                bg = cc.bg;
                fg = cc.fg;
                border = cc.border;
              }
            }
            return (
              <button
                key={cat}
                className="chip"
                style={{ background: bg, color: fg, borderColor: border }}
                onClick={() => setFilterCategory(cat)}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      <ProductTable
        rows={filteredSorted}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={handleSort}
        onFieldChange={handleFieldChange}
        onDelete={handleDelete}
      />

      <div className="footnotes">
        <span className="footnote-red">● red stock = at or below reorder threshold</span>
      </div>
    </div>
  );
}
