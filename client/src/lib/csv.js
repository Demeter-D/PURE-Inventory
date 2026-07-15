export function saleValue(wholesale, multiplier = 1.35) {
  const n = parseFloat(wholesale);
  return Number.isNaN(n) ? null : Math.round(n * multiplier * 100) / 100;
}

export function exportCSV(rows) {
  const headers = [
    "Category",
    "Product",
    "Size",
    "Unit",
    "SKU",
    "Wholesale Price",
    "Sale Price (+35%)",
    "Sale Price (+50%)",
    "Sale Actual",
    "Stock",
    "Reorder At",
    "Supplier",
    "Status",
    "Notes",
  ];
  const lines = [headers.join(",")];
  rows.forEach((r) => {
    const sale35 = saleValue(r.wholesale, 1.35);
    const sale50 = saleValue(r.wholesale, 1.5);
    const vals = [
      r.category,
      r.product,
      r.size,
      r.unit,
      r.sku,
      r.wholesale,
      sale35 == null ? "" : sale35.toFixed(2),
      sale50 == null ? "" : sale50.toFixed(2),
      r.saleActual,
      r.stock,
      r.reorder,
      r.supplier,
      r.status,
      r.notes,
    ];
    lines.push(vals.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));
  });
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "pure-cabin-shop-inventory.csv";
  a.click();
  URL.revokeObjectURL(url);
}
