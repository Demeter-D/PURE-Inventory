# PURE Cabin Shop Inventory

Shared, persistent product/pricing inventory for the PURE × Stockley cabin shop, built
for named collaborators — **Tom, Lara, and Dan** — to edit simultaneously with changes
syncing between them in real time.

This replaces the original design handoff prototype (`docs/design-handoff/`), which was
a client-only React mock with no backend, no persistence, and no multi-user support. See
[`docs/design-handoff/DESIGN-HANDOFF.md`](docs/design-handoff/DESIGN-HANDOFF.md) for the
original spec this UI was built against.

## Stack

- **Backend**: Node.js + Express, Postgres (via `pg`) for persistence, Socket.io for
  real-time sync across connected clients.
- **Frontend**: React + Vite, recreating the design spec (IBM Plex Sans/Mono, oklch
  color tokens, category badge colors) pixel-for-pixel.
- **Auth**: allowlist of exactly three collaborators (Tom, Lara, Dan), each with their
  own passcode, sessions via a signed JWT in an httpOnly cookie. Login is rate-limited
  (10 attempts/15min per IP).

## Project layout

```
server/   Express API + Postgres access + Socket.io
client/   React + Vite frontend
docs/     Original design handoff (reference only) + deployment guide
```

## Running locally

Requires Node.js 18+ and a Postgres database (local or hosted).

```bash
npm run install:all   # installs server/ and client/ dependencies
cp server/.env.example server/.env   # then edit DATABASE_URL/passcodes/secret (see below)
npm run dev            # runs backend on :4000 and frontend on :5173 concurrently
```

Open http://localhost:5173, sign in as Tom, Lara, or Dan with the passcode set in
`server/.env`, and start editing. Open a second browser (or an incognito window) and
sign in as another collaborator to see edits sync live between sessions.

### Environment variables (`server/.env`)

| Variable        | Purpose                                                            |
| --------------- | ------------------------------------------------------------------- |
| `PORT`          | Backend port (default `4000`)                                       |
| `CLIENT_ORIGIN` | Origin allowed to call the API / open sockets (CORS)                 |
| `DATABASE_URL`  | Postgres connection string                                           |
| `JWT_SECRET`    | Secret used to sign session cookies — set a long random value        |
| `TOM_PASSCODE`  | Tom's sign-in passcode                                               |
| `LARA_PASSCODE` | Lara's sign-in passcode                                              |
| `DAN_PASSCODE`  | Dan's sign-in passcode                                               |

Change all passcodes and `JWT_SECRET` from the example defaults before sharing this with
collaborators — the checked-in `.env.example` values are placeholders, not real
credentials.

## Deploying

The Express server serves the built frontend itself, so the whole app is one deployable
Node process plus a Postgres database. See
**[`docs/DEPLOY.md`](docs/DEPLOY.md)** for step-by-step instructions to deploy this to
Render with a free Postgres database.

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
- Three-collaborator auth — only Tom, Lara, and Dan can sign in; no public access.
