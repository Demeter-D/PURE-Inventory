# PURE Cabin Shop Inventory

Shared, persistent product/pricing inventory for the PURE × Stockley cabin shop, built
for two named collaborators — **Tom and Lara** — to edit simultaneously with changes
syncing between them in real time.

This replaces the original design handoff prototype (`docs/design-handoff/`), which was
a client-only React mock with no backend, no persistence, and no multi-user support. See
[`docs/design-handoff/DESIGN-HANDOFF.md`](docs/design-handoff/DESIGN-HANDOFF.md) for the
original spec this UI was built against.

## Stack

- **Backend**: Node.js + Express, SQLite (via `better-sqlite3`) for persistence,
  Socket.io for real-time sync across connected clients.
- **Frontend**: React + Vite, recreating the design spec (IBM Plex Sans/Mono, oklch
  color tokens, category badge colors) pixel-for-pixel.
- **Auth**: allowlist of exactly two collaborators (Tom, Lara), each with their own
  passcode, sessions via a signed JWT in an httpOnly cookie.

## Project layout

```
server/   Express API + SQLite database + Socket.io
client/   React + Vite frontend
docs/     Original design handoff (reference only)
```

## Running locally

Requires Node.js 18+.

```bash
npm run install:all   # installs server/ and client/ dependencies
cp server/.env.example server/.env   # then edit the passcodes/secret (see below)
npm run dev            # runs backend on :4000 and frontend on :5173 concurrently
```

Open http://localhost:5173, sign in as Tom, Lara, or Dan with the passcode set in
`server/.env`, and start editing. Open a second browser (or an incognito window) and
sign in as another collaborator to see edits sync live between sessions.

### Environment variables (`server/.env`)

| Variable        | Purpose                                                        |
| --------------- | ---------------------------------------------------------------- |
| `PORT`          | Backend port (default `4000`)                                    |
| `CLIENT_ORIGIN` | Origin allowed to call the API / open sockets (CORS)              |
| `JWT_SECRET`    | Secret used to sign session cookies — set a long random value     |
| `TOM_PASSCODE`  | Tom's sign-in passcode                                            |
| `LARA_PASSCODE` | Lara's sign-in passcode                                           |
| `DAN_PASSCODE`  | Dan's sign-in passcode                                            |

The login endpoint is rate-limited (10 attempts per 15 minutes per IP) to protect
against passcode brute-forcing — worth knowing if a collaborator picks a short/weak
passcode.

Change `TOM_PASSCODE`/`LARA_PASSCODE`/`JWT_SECRET` from the example defaults before
sharing this with Tom and Lara — the checked-in `.env.example` values are placeholders,
not real credentials.

## Building for production / deploying

The Express server can serve the built frontend itself, so the whole app is a single
deployable process:

```bash
npm run build   # builds client/dist
npm start       # builds (if needed) and starts the server, which serves client/dist
```

Deploy this as one Node service (Render, Fly.io, Railway, a VPS, etc.) with a persistent
disk/volume mounted for `server/data/` (where the SQLite file lives), and the env vars
above set on the host. Because storage is a single SQLite file, this works well for two
users; if usage grows beyond that, swap `server/src/db.js` for a hosted Postgres
connection (e.g. Supabase) without changing the API surface.

## Data model

Each product row: `category` (enum), `product`, `size`, `unit`, `sku`, `wholesale`
(£), `stock`, `reorder` (low-stock threshold), `supplier`, `status` (enum), `notes`.
Sale price is never stored — it's always computed as `wholesale × 1.35`, rounded to the
cent, both in the UI and in CSV exports.

## Features

- Inline editing of every field, saved automatically (debounced ~500ms per field) with
  no explicit save button.
- Real-time sync: edits, additions, and deletions from one collaborator appear in the
  other's browser within moments, via Socket.io.
- Low-stock flagging (row highlighted red when `stock ≤ reorder`).
- Search (product/SKU/supplier, case-insensitive) and category filter chips.
- Sortable columns (Category, Product, Wholesale, Stock).
- CSV export (`pure-cabin-shop-inventory.csv`) of all rows, including computed sale
  price.
- Two-collaborator auth — only Tom and Lara can sign in; no public access.
