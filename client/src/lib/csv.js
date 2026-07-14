export function saleValue(wholesale) {
  const n = parseFloat(wholesale);
  return Number.isNaN(n) ? null : Math.round(n * 1.35 * 100) / 100;
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
    "Stock",
    "Reorder At",
    "Supplier",
    "Status",
    "Notes",
  ];
  const lines = [headers.join(",")];
  rows.forEach((r) => {
    const sale = saleValue(r.wholesale);
    const vals = [
      r.category,
      r.product,
      r.size,
      r.unit,
      r.sku,
      r.wholesale,
      sale == null ? "" : sale.toFixed(2),
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
