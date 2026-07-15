# Deploying to Render

This sandbox's network policy blocks outbound calls to `api.render.com` (and likely
most third-party provider APIs), so this has to be done by hand in the Render/Neon
dashboards rather than automated from here. It's about 10 minutes of clicking.

## 1. Create a free Postgres database (Neon)

1. Go to https://neon.tech and sign up / sign in (free tier, no credit card).
2. Create a new project (e.g. name it `pure-cabin-shop`).
3. On the project dashboard, open **Connection Details** and copy the **pooled
   connection string** — it looks like:
   ```
   postgres://<user>:<password>@ep-xxxx-pooler.<region>.aws.neon.tech/neondb?sslmode=require
   ```
   That whole string is your `DATABASE_URL`.

(Supabase works the same way if you'd rather use that — Project Settings → Database →
Connection string → URI.)

## 2. Create the web service (Render)

1. Go to https://dashboard.render.com → **New +** → **Web Service**.
2. Connect the `Demeter-D/PURE-Inventory` GitHub repo (Render will prompt to install its
   GitHub App and pick the repo if it isn't connected yet).
3. Branch: `claude/run-review-readme-76fs6g` (switch this to `main` later if/when this
   work gets merged there).
4. Root Directory: leave blank.
5. Runtime: **Node**.
6. Build Command:
   ```
   npm run install:all && npm run build
   ```
7. Start Command:
   ```
   node server/src/index.js
   ```
8. Instance Type: **Free** is fine — no persistent disk is needed now that data lives in
   Postgres, not a local file.
9. Under **Environment Variables**, add:

   | Key             | Value                                                        |
   | --------------- | -------------------------------------------------------------- |
   | `NODE_ENV`      | `production`                                                    |
   | `DATABASE_URL`  | the Neon connection string from step 1                          |
   | `JWT_SECRET`    | a long random string — generate one with `openssl rand -hex 32` or `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
   | `TOM_PASSCODE`  | a passcode for Tom                                              |
   | `LARA_PASSCODE` | a passcode for Lara                                             |
   | `DAN_PASSCODE`  | `1981`                                                           |
   | `CLIENT_ORIGIN` | `https://<the-service-name-you-picked>.onrender.com`             |

   Don't set `PORT` — Render injects it automatically and the server already reads
   `process.env.PORT`.
10. Click **Create Web Service**. Render will build and deploy; first deploy takes a
    few minutes.

## 3. Verify

Once the deploy shows "Live", visit `https://<your-service-name>.onrender.com`, sign in
as Tom, Lara, or Dan, add a test product, then reload the page to confirm it persisted.
Open a second browser/incognito window and sign in as another collaborator to confirm
edits sync live between sessions.

## Notes

- Free Render web services spin down after ~15 minutes of inactivity and take 30-50
  seconds to wake back up on the next request — normal for the free tier, not a bug.
  One consequence: link-preview crawlers (WhatsApp, iMessage, Slack, etc.) have short
  fetch timeouts and will time out against a cold instance, showing no title/image and
  then caching that empty result per-URL. If a shared link isn't unfurling, open the
  site yourself first to wake it up, then re-share with a cache-busting query string
  (e.g. `?v=2`) since most platforms cache per exact URL. This goes away entirely on a
  paid instance type, which doesn't spin down.
- Rotate `TOM_PASSCODE`/`LARA_PASSCODE`/`DAN_PASSCODE`/`JWT_SECRET` any time from the
  Render dashboard's Environment tab; it redeploys automatically.
- If you shared a Render API key anywhere while setting this up, consider rotating it
  from Account Settings → API Keys once you're done — it's no longer needed since setup
  is manual.
