import { useMemo } from "react";
import { CATEGORIES, STATUSES, categoryColor, statusColor } from "../lib/categories.js";
import { saleValue } from "../lib/csv.js";
import { measureTextWidth } from "../lib/measureText.js";

const SORTABLE = {
  category: "category",
  product: "product",
  wholesale: "wholesale",
  stock: "stock",
};

const SANS = (weight, size) => `${weight} ${size}px 'IBM Plex Sans', sans-serif`;
const MONO = (weight, size) => `${weight} ${size}px 'IBM Plex Mono', monospace`;
const HEADER_FONT = SANS(600, 13.5);

// Each column measures its own header label plus every row's rendered value
// (or placeholder) in the exact font/weight it's displayed with, so the
// column width always matches the real font actually rendering — not a
// guess tuned against whatever font happened to be available while testing.
const TEXT_OVERHEAD = 40; // td padding + input padding + a little breathing room
const SELECT_OVERHEAD = 40;
const SELECT_ARROW_OVERHEAD = 56; // native <select> arrow needs extra room
const CURRENCY_OVERHEAD = 58; // td + input padding + "£" prefix + flex gap
const COMPUTED_CELL_OVERHEAD = 40; // td padding + .sale-cell's own padding

const COLUMNS = [
  {
    key: "category",
    label: "Category",
    font: SANS(600, 12.5),
    overhead: SELECT_OVERHEAD,
    value: (row) => row.category,
  },
  {
    key: "product",
    label: "Product",
    font: SANS(500, 13.5),
    overhead: TEXT_OVERHEAD,
    value: (row) => row.product || "Product name",
  },
  {
    key: "size",
    label: "Size",
    font: SANS(400, 13.5),
    overhead: TEXT_OVERHEAD,
    value: (row) => row.size || "—",
  },
  {
    key: "unit",
    label: "Unit",
    font: SANS(400, 13.5),
    overhead: TEXT_OVERHEAD,
    value: (row) => row.unit || "each",
  },
  {
    key: "sku",
    label: "SKU",
    font: MONO(400, 12.5),
    overhead: TEXT_OVERHEAD,
    value: (row) => row.sku || "—",
  },
  {
    key: "wholesale",
    label: "Wholesale",
    font: MONO(400, 13.5),
    overhead: CURRENCY_OVERHEAD,
    value: (row) => row.wholesale || "0.00",
  },
  {
    key: "sale35",
    label: "Sale (+35%)",
    font: MONO(600, 13.5),
    overhead: COMPUTED_CELL_OVERHEAD,
    value: (row) => {
      const v = saleValue(row.wholesale, 1.35);
      return v == null ? "—" : `£${v.toFixed(2)}`;
    },
  },
  {
    key: "sale50",
    label: "Sale (+50%)",
    font: MONO(600, 13.5),
    overhead: COMPUTED_CELL_OVERHEAD,
    value: (row) => {
      const v = saleValue(row.wholesale, 1.5);
      return v == null ? "—" : `£${v.toFixed(2)}`;
    },
  },
  {
    key: "saleActual",
    label: "Sale Actual",
    font: MONO(400, 13.5),
    overhead: CURRENCY_OVERHEAD,
    value: (row) => row.saleActual || "—",
  },
  {
    key: "stock",
    label: "Stock",
    font: MONO(700, 13.5),
    overhead: TEXT_OVERHEAD,
    value: (row) => row.stock || "—",
  },
  {
    key: "reorder",
    label: "Reorder at",
    font: MONO(400, 13.5),
    overhead: TEXT_OVERHEAD,
    value: (row) => row.reorder || "—",
  },
  {
    key: "supplier",
    label: "Supplier",
    font: SANS(400, 13.5),
    overhead: TEXT_OVERHEAD,
    value: (row) => row.supplier || "—",
  },
  {
    key: "status",
    label: "Status",
    font: SANS(600, 12.5),
    overhead: SELECT_ARROW_OVERHEAD,
    value: (row) => row.status,
  },
  {
    key: "notes",
    label: "Notes",
    font: SANS(400, 13.5),
    overhead: TEXT_OVERHEAD,
    value: (row) => row.notes || "—",
  },
];

function useColumnWidths(rows) {
  return useMemo(() => {
    const widths = {};
    for (const col of COLUMNS) {
      let max = measureTextWidth(col.label, HEADER_FONT);
      for (const row of rows) {
        const w = measureTextWidth(col.value(row), col.font);
        if (w > max) max = w;
      }
      widths[col.key] = Math.ceil(max) + col.overhead;
    }
    return widths;
  }, [rows]);
}

function SortHeader({ label, sortKey, colKey, sortDir, onSort, align, ...rest }) {
  const active = sortKey === colKey;
  const arrow = active ? (sortDir === 1 ? " ↑" : " ↓") : "";
  return (
    <th
      className={`sortable${align === "right" ? " num" : ""}`}
      onClick={() => onSort(colKey)}
      {...rest}
    >
      {label}
      {arrow}
    </th>
  );
}

function isLowStock(stock, reorder) {
  const s = stock !== "" ? parseFloat(stock) : NaN;
  const r = reorder !== "" ? parseFloat(reorder) : NaN;
  return !Number.isNaN(s) && !Number.isNaN(r) && s <= r;
}

export default function ProductTable({ rows, sortKey, sortDir, onSort, onFieldChange, onDelete }) {
  const w = useColumnWidths(rows);

  return (
    <div className="table-card">
      <table className="inv-table">
        <thead>
          <tr>
            <SortHeader label="Category" colKey={SORTABLE.category} sortKey={sortKey} sortDir={sortDir} onSort={onSort} style={{ width: w.category }} />
            <SortHeader label="Product" colKey={SORTABLE.product} sortKey={sortKey} sortDir={sortDir} onSort={onSort} style={{ width: w.product }} />
            <th style={{ width: w.size }}>Size</th>
            <th style={{ width: w.unit }}>Unit</th>
            <th style={{ width: w.sku }}>SKU</th>
            <SortHeader label="Wholesale" colKey={SORTABLE.wholesale} sortKey={sortKey} sortDir={sortDir} onSort={onSort} align="right" style={{ width: w.wholesale }} />
            <th className="num" style={{ width: w.sale35 }}>Sale (+35%)</th>
            <th className="num" style={{ width: w.sale50 }}>Sale (+50%)</th>
            <th className="num" style={{ width: w.saleActual }}>Sale Actual</th>
            <SortHeader label="Stock" colKey={SORTABLE.stock} sortKey={sortKey} sortDir={sortDir} onSort={onSort} align="right" style={{ width: w.stock }} />
            <th className="num" style={{ width: w.reorder }}>Reorder at</th>
            <th style={{ width: w.supplier }}>Supplier</th>
            <th style={{ width: w.status }}>Status</th>
            <th style={{ width: w.notes }}>Notes</th>
            <th style={{ width: 36 }} />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const low = isLowStock(row.stock, row.reorder);
            const cc = categoryColor(row.category);
            const sale35 = saleValue(row.wholesale, 1.35);
            const sale50 = saleValue(row.wholesale, 1.5);
            const rowBg = low ? "oklch(0.98 0.03 30)" : "white";
            return (
              <tr key={row.id} style={{ background: rowBg }}>
                <td>
                  <select
                    className="category-select"
                    value={row.category}
                    onChange={(e) => onFieldChange(row.id, "category", e.target.value)}
                    style={{ background: cc.bg, color: cc.fg }}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    className="cell-input"
                    style={{ fontWeight: 500 }}
                    value={row.product}
                    placeholder="Product name"
                    onChange={(e) => onFieldChange(row.id, "product", e.target.value)}
                  />
                </td>
                <td>
                  <input
                    className="cell-input"
                    value={row.size}
                    placeholder="—"
                    onChange={(e) => onFieldChange(row.id, "size", e.target.value)}
                  />
                </td>
                <td>
                  <input
                    className="cell-input"
                    value={row.unit}
                    placeholder="each"
                    onChange={(e) => onFieldChange(row.id, "unit", e.target.value)}
                  />
                </td>
                <td>
                  <input
                    className="cell-input mono"
                    style={{ fontSize: 12.5 }}
                    value={row.sku}
                    placeholder="—"
                    onChange={(e) => onFieldChange(row.id, "sku", e.target.value)}
                  />
                </td>
                <td>
                  <div className="wholesale-cell">
                    <span className="currency-prefix">£</span>
                    <input
                      className="cell-input mono num"
                      inputMode="decimal"
                      value={row.wholesale}
                      placeholder="0.00"
                      onChange={(e) => onFieldChange(row.id, "wholesale", e.target.value)}
                    />
                  </div>
                </td>
                <td className="sale-cell mono" title="= wholesale × 1.35">
                  {sale35 == null ? "—" : `£${sale35.toFixed(2)}`}
                </td>
                <td className="sale-cell mono" title="= wholesale × 1.5">
                  {sale50 == null ? "—" : `£${sale50.toFixed(2)}`}
                </td>
                <td>
                  <div className="wholesale-cell">
                    <span className="currency-prefix">£</span>
                    <input
                      className="cell-input mono num"
                      inputMode="decimal"
                      value={row.saleActual}
                      placeholder="—"
                      onChange={(e) => onFieldChange(row.id, "saleActual", e.target.value)}
                    />
                  </div>
                </td>
                <td>
                  <input
                    className="cell-input mono num"
                    inputMode="numeric"
                    value={row.stock}
                    placeholder="—"
                    onChange={(e) => onFieldChange(row.id, "stock", e.target.value)}
                    style={{
                      background: low ? "oklch(0.93 0.06 30)" : "transparent",
                      color: low ? "oklch(0.45 0.15 30)" : "inherit",
                      fontWeight: low ? 700 : 500,
                    }}
                  />
                </td>
                <td>
                  <input
                    className="cell-input mono num"
                    inputMode="numeric"
                    value={row.reorder}
                    placeholder="—"
                    onChange={(e) => onFieldChange(row.id, "reorder", e.target.value)}
                  />
                </td>
                <td>
                  <input
                    className="cell-input"
                    value={row.supplier}
                    placeholder="—"
                    onChange={(e) => onFieldChange(row.id, "supplier", e.target.value)}
                  />
                </td>
                <td>
                  <select
                    className="status-select"
                    value={row.status}
                    onChange={(e) => onFieldChange(row.id, "status", e.target.value)}
                    style={{ color: statusColor(row.status) }}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    className="cell-input"
                    style={{ color: "oklch(0.45 0.02 60)" }}
                    value={row.notes}
                    placeholder="—"
                    onChange={(e) => onFieldChange(row.id, "notes", e.target.value)}
                  />
                </td>
                <td style={{ textAlign: "center" }}>
                  <button className="delete-btn" title="Delete row" onClick={() => onDelete(row.id)}>
                    ×
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 && (
        <div className="empty-state">No products match — try clearing the search or category filter.</div>
      )}
    </div>
  );
}
