import { CATEGORIES, STATUSES, categoryColor, statusColor } from "../lib/categories.js";
import { saleValue } from "../lib/csv.js";
import AutoWidthInput from "./AutoWidthInput.jsx";

const SORTABLE = {
  category: "category",
  product: "product",
  wholesale: "wholesale",
  stock: "stock",
};

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
  return (
    <div className="table-card">
      <table className="inv-table">
        <thead>
          <tr>
            <SortHeader label="Category" colKey={SORTABLE.category} sortKey={sortKey} sortDir={sortDir} onSort={onSort} style={{ width: 130 }} />
            <SortHeader label="Product" colKey={SORTABLE.product} sortKey={sortKey} sortDir={sortDir} onSort={onSort} style={{ minWidth: 180 }} />
            <th style={{ width: 90 }}>Size</th>
            <th style={{ width: 90 }}>Unit</th>
            <th style={{ width: 110 }}>SKU</th>
            <SortHeader label="Wholesale" colKey={SORTABLE.wholesale} sortKey={sortKey} sortDir={sortDir} onSort={onSort} align="right" style={{ width: 110 }} />
            <th className="num" style={{ width: 120 }}>Sale (+35%)</th>
            <th className="num" style={{ width: 120 }}>Sale (+50%)</th>
            <th className="num" style={{ width: 120 }}>Sale Actual</th>
            <SortHeader label="Stock" colKey={SORTABLE.stock} sortKey={sortKey} sortDir={sortDir} onSort={onSort} align="right" style={{ width: 90 }} />
            <th className="num" style={{ width: 100 }}>Reorder at</th>
            <th style={{ minWidth: 140 }}>Supplier</th>
            <th style={{ width: 120 }}>Status</th>
            <th style={{ minWidth: 160 }}>Notes</th>
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
                  <AutoWidthInput
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
                      className="cell-input mono num stock-input"
                      style={{ width: 70 }}
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
                      className="cell-input mono num stock-input"
                      style={{ width: 70 }}
                      inputMode="decimal"
                      value={row.saleActual}
                      placeholder="—"
                      onChange={(e) => onFieldChange(row.id, "saleActual", e.target.value)}
                    />
                  </div>
                </td>
                <td>
                  <input
                    className="cell-input mono num stock-input"
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
                    className="cell-input mono num reorder-input"
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
