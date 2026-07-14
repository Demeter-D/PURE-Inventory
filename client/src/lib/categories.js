export const CATEGORIES = ["Snacks", "Food", "Cellar", "Firewood", "Local Goods", "Essentials"];
export const STATUSES = ["Active", "Seasonal", "Discontinued"];

const CATEGORY_HUES = {
  Snacks: 55,
  Food: 30,
  Cellar: 145,
  Firewood: 15,
  "Local Goods": 200,
  Essentials: 260,
};

export function categoryColor(category) {
  const hue = CATEGORY_HUES[category] ?? 60;
  return {
    bg: `oklch(0.94 0.05 ${hue})`,
    fg: `oklch(0.32 0.09 ${hue})`,
    border: `oklch(0.86 0.06 ${hue})`,
  };
}

export function statusColor(status) {
  if (status === "Discontinued") return "oklch(0.55 0.15 30)";
  if (status === "Seasonal") return "oklch(0.5 0.1 75)";
  return "oklch(0.4 0.06 145)";
}
