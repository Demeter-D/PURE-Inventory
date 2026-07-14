# Handoff: PURE Cabin Shop — Product Inventory Sheet

## Overview
An offline product/pricing management tool for the PURE × Stockley cabin shop. Lets staff track products by category, wholesale cost, and auto-calculated sale price (wholesale + 35%), stock levels with low-stock flagging, and supplier info. The user wants this taken live with **shared, simultaneous edit access for two named collaborators (Tom and Lara)**.

## About the Design Files
The file in this bundle (`Pure Cabin Shop Inventory.dc.html`) is a **design reference prototype built in HTML** — it shows the intended layout, interactions, and data model, not production code to copy directly. It currently runs entirely client-side in a single browser tab: all product data lives in React component state only, with **no persistence and no backend** — a page refresh wipes all data, and there is no multi-user sync of any kind.

**The core engineering task is not "make the HTML live" — it's building real shared, persistent storage with multi-user editing**, then recreating this UI (or an equivalent one) in whatever stack is chosen. Recommended shape:
- A lightweight backend/datastore (e.g. a hosted Postgres/SQLite via a BaaS like Supabase/Firebase, or even a shared Google Sheet via the Sheets API if the user wants to stay inside Sheets) so edits from Tom and Lara sync to each other in real time or near-real time.
- Basic auth or access control limited to the two collaborators (magic link, shared password, or Google account allowlist — simplest option that fits their comfort level).
- The existing HTML/CSS as the visual and interaction spec for the UI layer.

Note: given the original ask was literally "a Sheets spreadsheet," it's worth confirming with the user whether they actually want a real Google Sheet (simplest path to shared multi-editor access, zero custom backend) versus a custom web app. If Google Sheets is acceptable, the fastest route is exporting this schema directly into a Sheet (see Design Tokens/Data Model below) and sharing it with Tom and Lara via normal Sheets permissions — no development needed.

## Fidelity
**High-fidelity.** Colors, spacing, and typography in the HTML file are final; recreate pixel-for-pixel if building a custom app.

## Decision: Backend Route Confirmed
The user has confirmed they want a real backend (not a plain Google Sheet) so Tom and Lara can edit the same inventory simultaneously with proper shared access control. Build persistent storage + basic auth/allowlist for the two of them, then implement this UI against it.

## Screenshots
See `screenshots/full-view.png` (top of page: header, stats, filters) and `screenshots/table-detail.png` (table rows, category badges, footnotes). Note: the category badges are native `<select>` dropdowns styled as colored pills — in the screenshots they visually read the same due to a capture-tool rendering quirk, but each row's actual selected value differs correctly (verified in DOM); build them as real selects/dropdowns per row.

## Data Model
Each product row has these fields (all free text/number unless noted):
- `category` — enum: Snacks, Food, Cellar, Firewood, Local Goods, Essentials
- `product` — text, product name
- `size` — text (e.g. "500g", "6-pack")
- `unit` — text (e.g. "each", "kg", "bottle")
- `sku` — text, product code
- `wholesale` — number, currency (£)
- **`sale price`** — derived, not stored: `wholesale × 1.35`, rounded to 2 decimals. Recompute on every wholesale edit; do not persist as a separate editable field.
- `stock` — number, quantity on hand
- `reorder` — number, low-stock threshold. Row/stock cell is flagged (red background/text) when `stock <= reorder`.
- `supplier` — text
- `status` — enum: Active, Seasonal, Discontinued
- `notes` — text

## Screens / Views
Single view, no navigation:

**Header**: page title "Cabin Shop Inventory", subtitle, "Export CSV" button (client-side CSV download of current rows) and "+ Add product" button (appends a blank row, pre-filled with the active category filter if one is set).

**Summary strip**: three stat cards — Products (row count), Low stock (count of rows where stock ≤ reorder, shown in red if >0), Wholesale value (Σ wholesale × stock across all rows).

**Controls row**: text search (filters by product name/SKU/supplier, case-insensitive substring) and a row of category filter chips ("All" + the 6 categories), each tinted with that category's color; active chip is filled solid.

**Table**: one row per product. Editable inline: category (select, colored badge), product name, size, unit, SKU, wholesale (£, number), stock (number, highlighted red + bold when low), reorder threshold (number), supplier, status (select), notes. Sale price column is read-only/computed. Delete (×) button at row end.

Empty state: "No products match — try clearing the search or category filter."

## Interactions & Behavior
- Editing any field updates state immediately (no save button/blur-commit — instant on input/change).
- Column headers for Category, Product, Wholesale, Stock are clickable to sort ascending/descending (click again to reverse); an arrow (↑/↓) shows on the active sort column.
- "+ Add product" appends a new blank row.
- Delete button removes a row immediately, no confirmation.
- "Export CSV" downloads all current rows (ignoring active filter/search) as a CSV with the computed sale price included, filename `pure-cabin-shop-inventory.csv`.
- No persistence between sessions/tabs — this is the main gap a real implementation must close.

## Design Tokens
- Typography: IBM Plex Sans (UI text), IBM Plex Mono (numbers/prices/SKUs).
- Background: `oklch(0.985 0.004 80)` (warm off-white).
- Body text: `oklch(0.22 0.01 60)`.
- Muted/label text: `oklch(0.45–0.6 0.02 60)` range.
- Primary button: `oklch(0.35 0.05 55)` background, white text.
- Low-stock red: background `oklch(0.93–0.98 0.03–0.06 30)`, text `oklch(0.45–0.55 0.15 30)`.
- Category badge colors (background/foreground/border), one hue per category, all same lightness/chroma family, hue only varies:
  - Snacks: hue 55, Food: hue 30, Cellar: hue 145, Firewood: hue 15, Local Goods: hue 200, Essentials: hue 260
  - Formula: bg `oklch(0.94 0.05 {hue})`, fg `oklch(0.32 0.09 {hue})`, border `oklch(0.86 0.06 {hue})`
- Card/table border: `oklch(0.9–0.92 0.01 70)`, radius 8–12px.

## Assets
None — no images/icons used; all UI is typographic + color badges.

## Files
- `Pure Cabin Shop Inventory.dc.html` — the full working prototype (open directly in a browser).
