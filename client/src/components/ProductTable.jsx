import { CATEGORIES, STATUSES, categoryColor, statusColor } from "../lib/categories.js";
import { saleValue } from "../lib/csv.js";

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

// Auto-fit editable cell. A hidden sizer span holding the cell's text gives
// the cell its intrinsic width via the browser's own layout engine — real
// loaded fonts included — and the input/select is overlaid to fill the cell.
// When web fonts finish loading the sizer reflows automatically, so column
// widths are always correct for whatever font is actually rendering.
function FitCell({ sizerText, mono = false, badge = false, hasArrow = false, style, children }) {
  const cls = ["fit", mono && "mono", badge && "badge", hasArrow && "has-arrow"]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={cls} style={style}>
      <span className="sizer" aria-hidden="true">
        {sizerText || " "}
      </span>
      {children}
    </span>
  );
}

export default function ProductTable({ rows, sortKey, sortDir, onSort, onFieldChange, onDelete }) {
  return (
    <div className="table-card">
      <table className="inv-table">
        <thead>
          <tr>
            <SortHeader label="Category" colKey={SORTABLE.category} sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortHeader label="Product" colKey={SORTABLE.product} sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <th>Size</th>
            <th>Unit</th>
            <th>SKU</th>
            <SortHeader label="Wholesale" colKey={SORTABLE.wholesale} sortKey={sortKey} sortDir={sortDir} onSort={onSort} align="right" />
            <th className="num">Sale (+35%)</th>
            <th className="num">Sale (+50%)</th>
            <th className="num">Sale Actual</th>
            <SortHeader label="Stock" colKey={SORTABLE.stock} sortKey={sortKey} sortDir={sortDir} onSort={onSort} align="right" />
            <th className="num">Reorder at</th>
            <th>Supplier</th>
            <th>Status</th>
            <th>Notes</th>
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
                  <FitCell badge sizerText={row.category}>
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
                  </FitCell>
                </td>
                <td>
                  <FitCell sizerText={row.product || "Product name"} style={{ fontWeight: 500 }}>
                    <input
                      className="cell-input"
                      value={row.product}
                      placeholder="Product name"
                      onChange={(e) => onFieldChange(row.id, "product", e.target.value)}
                    />
                  </FitCell>
                </td>
                <td>
                  <FitCell sizerText={row.size || "—"}>
                    <input
                      className="cell-input"
                      value={row.size}
                      placeholder="—"
                      onChange={(e) => onFieldChange(row.id, "size", e.target.value)}
                    />
                  </FitCell>
                </td>
                <td>
                  <FitCell sizerText={row.unit || "each"}>
                    <input
                      className="cell-input"
                      value={row.unit}
                      placeholder="each"
                      onChange={(e) => onFieldChange(row.id, "unit", e.target.value)}
                    />
                  </FitCell>
                </td>
                <td>
                  <FitCell mono sizerText={row.sku || "—"} style={{ fontSize: 12.5 }}>
                    <input
                      className="cell-input"
                      value={row.sku}
                      placeholder="—"
                      onChange={(e) => onFieldChange(row.id, "sku", e.target.value)}
                    />
                  </FitCell>
                </td>
                <td>
                  <div className="wholesale-cell">
                    <span className="currency-prefix">£</span>
                    <FitCell mono sizerText={row.wholesale || "0.00"}>
                      <input
                        className="cell-input num"
                        inputMode="decimal"
                        value={row.wholesale}
                        placeholder="0.00"
                        onChange={(e) => onFieldChange(row.id, "wholesale", e.target.value)}
                      />
                    </FitCell>
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
                    <FitCell mono sizerText={row.saleActual || "—"}>
                      <input
                        className="cell-input num"
                        inputMode="decimal"
                        value={row.saleActual}
                        placeholder="—"
                        onChange={(e) => onFieldChange(row.id, "saleActual", e.target.value)}
                      />
                    </FitCell>
                  </div>
                </td>
                <td className="num">
                  <FitCell mono sizerText={row.stock || "—"} style={{ fontWeight: low ? 700 : 500 }}>
                    <input
                      className="cell-input num"
                      inputMode="numeric"
                      value={row.stock}
                      placeholder="—"
                      onChange={(e) => onFieldChange(row.id, "stock", e.target.value)}
                      style={{
                        background: low ? "oklch(0.93 0.06 30)" : "transparent",
                        color: low ? "oklch(0.45 0.15 30)" : "inherit",
                      }}
                    />
                  </FitCell>
                </td>
                <td className="num">
                  <FitCell mono sizerText={row.reorder || "—"}>
                    <input
                      className="cell-input num"
                      inputMode="numeric"
                      value={row.reorder}
                      placeholder="—"
                      onChange={(e) => onFieldChange(row.id, "reorder", e.target.value)}
                    />
                  </FitCell>
                </td>
                <td>
                  <FitCell sizerText={row.supplier || "—"}>
                    <input
                      className="cell-input"
                      value={row.supplier}
                      placeholder="—"
                      onChange={(e) => onFieldChange(row.id, "supplier", e.target.value)}
                    />
                  </FitCell>
                </td>
                <td>
                  <FitCell badge hasArrow sizerText={row.status}>
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
                  </FitCell>
                </td>
                <td>
                  <FitCell sizerText={row.notes || "—"}>
                    <input
                      className="cell-input"
                      style={{ color: "oklch(0.45 0.02 60)" }}
                      value={row.notes}
                      placeholder="—"
                      onChange={(e) => onFieldChange(row.id, "notes", e.target.value)}
                    />
                  </FitCell>
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
