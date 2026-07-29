# Studio Linear — Editable Finance Dashboard

A live, editable version of the monthly invoice dashboard. Every text field, the
logo, and the client table are editable directly in the browser and saved to
the server.

## What's editable
- Company name, badge, tagline, title, month, and report date (click any text and type)
- Logo (click the logo box in the top-left to upload an image)
- Every cell in the client table (name, payment plan, invoice #, amount, dates)
- Status per client (dropdown: Paid / Overdue / Awaiting Contract / Pending)
- Add or remove clients with the buttons in the table
- All totals (Total Billed, Collected, Outstanding, Collection Rate, the donut
  chart, and the status summary) are calculated automatically from the table —
  you never have to update them by hand.

Click **Save changes** (or press Ctrl/Cmd+S) to persist your edits.

## Run locally
```bash
npm install
npm start
```
Then open http://localhost:3000

## Deploy: GitHub → Railway

### 1. Push this project to GitHub
```bash
cd studio-dashboard
git init
git add .
git commit -m "Initial dashboard"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```
(Create the empty repo on GitHub first at github.com/new — don't add a README there, it's already included here.)

### 2. Deploy on Railway
1. Go to [railway.app](https://railway.app) and sign in with GitHub.
2. Click **New Project → Deploy from GitHub repo**.
3. Select the repo you just pushed.
4. Railway auto-detects Node.js and uses `npm start` (see `railway.json`). No
   extra configuration is required.
5. Once deployed, click the generated domain under **Settings → Networking →
   Generate Domain** to get a public URL.

### 3. Updating later
Any time you want to change the code (not just the dashboard content — that's
editable live in the browser), just commit and push to GitHub:
```bash
git add .
git commit -m "Update"
git push
```
Railway automatically redeploys on every push to `main`.

## Important note on data persistence
This app stores dashboard content (`data/dashboard.json`) and the uploaded
logo directly on Railway's filesystem. Railway's default filesystem is
**ephemeral** — it resets on every redeploy (e.g. every time you `git push`).

This means:
- Day-to-day edits made through the dashboard (editing cells, clicking Save)
  persist fine between visits, as long as you don't redeploy.
- If you push new code to GitHub, Railway rebuilds the container and your
  edited data (and uploaded logo) will reset back to the values in
  `data/dashboard.json` in the repo.

**To make edits survive redeploys**, add a Railway Volume and mount it at
`/app/data` and `/app/public/uploads` (Railway dashboard → your service →
**Settings → Volumes → New Volume**). This gives the app a persistent disk
that isn't wiped on redeploy. This is a one-time setup step — I'm happy to
walk through it if you'd like.
