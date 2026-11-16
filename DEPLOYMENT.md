# SOULEY de Tour: deployment guide

Order: **GitHub → MongoDB Atlas (data from Compass) → Render (backend) → Vercel (frontend)**.
Commands are for **Windows PowerShell**. Do the steps in order; each one needs something from the step before.

```
Browser ──► Vercel (React site, client/)
              │  /api/*  is forwarded by vercel.json
              ▼
           Render (Node/Express API, server/) ──► MongoDB Atlas (database)
```

You will copy a few values between the services. Keep a scratch note open with these four blanks:

| Value | Comes from | Used in |
|---|---|---|
| `ATLAS_URI` | Step 2 | Render env var `MONGODB_URI` |
| `JWT_SECRET` | Step 3 (you generate it) | Render env var |
| `RENDER_URL` (e.g. `https://souley-de-tour-api.onrender.com`) | Step 3 | `client/vercel.json` |
| `VERCEL_URL` (e.g. `https://souley-de-tour.vercel.app`) | Step 4 | Render env var `CLIENT_URL` |

---

## 0. Before you start (5 min)

1. Unzip the project into a folder, for example `C:\projects\souley-de-tour`. You should see `client`, `server`, `render.yaml`, `.gitignore` and this file.
2. Install **Node.js 20 or newer** and **Git** if you do not have them (`node -v`, `git --version`).
3. Make free accounts: **GitHub**, **MongoDB Atlas**, **Render**, **Vercel** (sign up with GitHub on Render and Vercel; it makes importing the repo one click).
4. **Photos.** The data points each spot to `/spots/<slug>.jpg`, and `client/public/spots/` is empty in this zip. If you have the photos, copy them into that folder **before Step 1** (see `client/PHOTOS.md`). Without them the site still works and shows the photo placeholders. GitHub refuses files over 100 MB.

What was checked in this zip: `vite build` succeeds, the server tests pass (94/94), and the client tests pass except one (see "Known issue" at the end).

---

## 1. GitHub (push the code)

### 1.1 Create the repository
1. github.com → **New repository** → name `souley-de-tour` → **Private** is fine (Render and Vercel can still read it) → do **not** tick "Add README / .gitignore" → **Create repository**.

### 1.2 Push from your computer
```powershell
cd C:\projects\souley-de-tour
git init
git add .
git status
```
**Stop and read the `git status` list.** It must **not** contain `.env` or `node_modules`. (`.env.example` files are fine and expected.) If you see `.env`, run `git rm --cached server/.env` first.

```powershell
git commit -m "SOULEY de Tour: first deploy"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/souley-de-tour.git
git push -u origin main
```
GitHub will ask you to sign in in the browser the first time. Refresh the repo page: you should see `client`, `server`, `render.yaml`.

> Every later `git push` to `main` makes Render and Vercel redeploy automatically.

---

## 2. MongoDB Atlas (database) + Compass (move your data)

### 2.1 Create the cluster
1. cloud.mongodb.com → **Create** a cluster → pick **M0 (Free)** → provider **AWS**, a region close to the Philippines (**Singapore** is the closest) → **Create**.
2. **Database Access** (left menu) → **Add New Database User** → *Password* login → username e.g. `souley`, click **Autogenerate Secure Password** and **copy it now** → role **Read and write to any database** (or "readWrite" on `souleydetour`) → **Add User**.
   - Prefer a password with only letters and numbers. If it contains `@ : / ? # %`, you must URL-encode it in the connection string (e.g. `@` → `%40`).
3. **Network Access** → **Add IP Address** → **Allow access from anywhere** (`0.0.0.0/0`) → **Confirm**.
   - Needed because Render's free service has no fixed IP. Your password is what protects the database, so keep it strong.

### 2.2 Get the connection string
**Database** → your cluster → **Connect** → **Drivers** → copy the string. It looks like:

```
mongodb+srv://souley:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
```
Replace `<password>` and **add the database name `souleydetour` right after `.mongodb.net/`**:

```
mongodb+srv://souley:YOURPASSWORD@cluster0.abcde.mongodb.net/souleydetour?retryWrites=true&w=majority&appName=Cluster0
```
That whole line is your **`ATLAS_URI`**. Save it in your scratch note.

### 2.3 Move your data with Compass (Option A: copy what you have locally)
Use this if your local database holds data you want to keep (admin account, edited spots, food places, reviews).

**Export from local**
1. Compass → connect to `mongodb://127.0.0.1:27017` → open the **`souleydetour`** database.
2. For each collection below: open it → **Export Collection** (top right) → **Export the full collection** → format **JSON** → save the file.

   `categories`, `users`, `touristspots`, `reviews`, `itineraries`, `aiconversations` (the last three may be empty; skip empty ones. `aiconversations` is optional chat history.)

**Import into Atlas**
1. In Compass click **+ (new connection)** → paste your `ATLAS_URI` → **Connect**.
2. **Create database** → database name `souleydetour`, first collection `categories` → Create.
3. Open `categories` → **Add Data → Import JSON or CSV file** → pick the exported `categories` file → type **JSON** → **Import**.
4. Repeat for every other collection: **Create collection** (exact same names, all lowercase as listed) → **Add Data → Import**.
5. **Check:** the document counts in Atlas equal the counts on your local database, and an `_id` shows as `ObjectId(...)`, not as text.

> Do **not** run `npm run seed` afterwards. It adds sample spots with placeholder pictures on top of your real data.

### 2.4 Alternative (Option B: build the database from the files in the project)
Use this if your local data is only what the project already contains, or you have nothing local. It loads the 200+ spots and food places from `server/src/seed/data`. Edits you made only on your local database (descriptions, reviews, users) are **not** carried over.

```powershell
cd C:\projects\souley-de-tour\server
npm install
$env:MONGODB_URI = "PASTE-YOUR-ATLAS_URI-HERE"
npm run import:spots:publish
npm run import:food:publish
$env:SEED_ADMIN_EMAIL = "you@example.com"
$env:SEED_ADMIN_PASSWORD = "a-strong-password-here"
npm run reset:admin
```
(`$env:` values last only for that PowerShell window, and nothing is written to disk.) `reset:admin` creates the admin account if it does not exist.

### 2.5 Verify
In Compass (connected to Atlas) you should see `touristspots` with your places (published ones have `status: "published"`), `categories`, and `users` with your admin.

---

## 3. Render (backend API)

### 3.1 Generate a secret
```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```
Copy the output. That is your **`JWT_SECRET`** (never share it, never commit it). Use a **new** one here, not your local one.

### 3.2 Create the service
1. dashboard.render.com → **New +** → **Web Service** → connect GitHub → select `souley-de-tour`.
2. Fill in:

| Field | Value |
|---|---|
| Name | `souley-de-tour-api` (this becomes part of the URL) |
| Region | **Singapore** |
| Branch | `main` |
| **Root Directory** | **`server`** |
| Runtime | **Node** |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Instance type | **Free** |

3. **Environment Variables** → add:

| Key | Value |
|---|---|
| `NODE_VERSION` | `20` |
| `NODE_ENV` | `production` ← **required**, it makes the login cookie `secure` + cross-site |
| `MONGODB_URI` | your `ATLAS_URI` |
| `JWT_SECRET` | from 3.1 |
| `JWT_EXPIRES_IN` | `7d` |
| `CLIENT_URL` | `http://localhost:5173` for now (you change it in Step 4.5) |
| `STATS_TIMEZONE` | `Asia/Manila` (optional) |
| `AI_API_KEY` | your key, or leave out (the Ask page then answers from the database only) |
| `AI_BASE_URL` | `https://api.openai.com/v1` (only if you set a key) |
| `AI_MODEL` | `gpt-4o-mini` (only if you set a key) |
| `UNSPLASH_ACCESS_KEY` | optional: free key from unsplash.com/developers. It gives the Home mood cards their real photos. Leave out and the photos come from Wikimedia Commons instead |
| `PEXELS_API_KEY` | optional: second choice after Unsplash (pexels.com/api) |

Do **not** add `PORT` (Render sets it). `SEED_ADMIN_*` are not needed on Render.

4. **Advanced** → **Health Check Path** → `/api/health`.
5. **Create Web Service.** Wait for the log to say `MongoDB connected: souleydetour` and `API running on ...`. (Errors? See Troubleshooting.)

> Prefer clicking less? The repo has a `render.yaml`: **New + → Blueprint** reads it and fills most of this in. You still add `MONGODB_URI`, `CLIENT_URL` and the AI key by hand.

### 3.3 Test it
Open `https://YOUR-SERVICE.onrender.com/api/health`. You should see:
```json
{"success":true,"message":"SOULEY de Tour API up."}
```
Then `https://YOUR-SERVICE.onrender.com/api/tourist-spots` should list your spots. Save the address (no trailing slash) as **`RENDER_URL`**.

> **Free plan behavior:** Render puts a free service to sleep after about 15 minutes without visitors. The next visit waits roughly 30 to 60 seconds while it wakes up. That is normal. A free uptime pinger (for example UptimeRobot hitting `/api/health` every 5 minutes) keeps it awake if that bothers you. Check Render's current free-plan rules on their pricing page.

---

## 4. Vercel (frontend)

### 4.1 Point the site at your API (edit one file)
Open **`client/vercel.json`** and replace `YOUR-RENDER-SERVICE.onrender.com` with your real Render host:

```json
{ "source": "/api/:path*", "destination": "https://souley-de-tour-api.onrender.com/api/:path*" },
```
Keep `/api/:path*` on both sides, and keep the second rule (`/(.*)` → `/index.html`); it makes pages like `/spots/limasawa` work when refreshed.

Push it:
```powershell
cd C:\projects\souley-de-tour
git add client/vercel.json
git commit -m "Point Vercel at the Render API"
git push
```

**Why this file forwards `/api`:** the login is an httpOnly cookie. If the browser called `onrender.com` directly from a `vercel.app` page, Safari / iPhones and private windows treat that cookie as third-party and block it, so login would silently fail. With the forwarding, the browser only ever talks to your Vercel address, so the cookie is first-party and works everywhere.

### 4.2 Import the project
1. vercel.com → **Add New… → Project** → import `souley-de-tour`.
2. Settings on the import screen:

| Field | Value |
|---|---|
| Framework Preset | **Vite** |
| **Root Directory** | **`client`** (click Edit, choose the folder) |
| Build Command | `npm run build` (default) |
| Output Directory | `dist` (default) |

3. **Environment Variables** → add one:

| Key | Value |
|---|---|
| `VITE_API_URL` | `/api` |

   It must be set **before** the build (Vite bakes it in). If you add or change it later, **Redeploy**.
4. **Deploy.** When it finishes, open the address Vercel shows (e.g. `https://souley-de-tour.vercel.app`). That is **`VERCEL_URL`**.

### 4.5 Tell Render the real site address
Render → your service → **Environment** → change `CLIENT_URL` to your `VERCEL_URL`, **no trailing slash**:
```
https://souley-de-tour.vercel.app
```
Save. Render redeploys by itself (about a minute).
(Several addresses, such as a custom domain too? Separate them with commas.)

---

## 5. Final check (go through this once)

Open your Vercel address in a normal window and then on your phone:

- [ ] Home page loads, the Southern Leyte 3D map shows
- [ ] **Spots** and **Food** list your places (the first load after sleeping can take about a minute)
- [ ] A spot page opens, and refreshing that page (F5) does **not** give a 404
- [ ] **Register** a test user, log out, log in again, then press F5: you are still logged in
- [ ] **Admin login** with your admin account → `/admin` dashboard shows numbers and statistics
- [ ] **Passport**: you can mark a stamp
- [ ] **Ask** works (with an AI key: full answers; without: database answers)

Then, for safety:
- [ ] Change the admin password (your old local one may be `Admin12345`)
- [ ] Never put `.env` files or the Atlas password in GitHub. If you ever did, change the Atlas password and the `JWT_SECRET`.

---

## 6. Updating the site later
Change code → `git add .` → `git commit -m "..."` → `git push`. Vercel and Render rebuild on their own. Changing only data? Use the admin pages, or Compass against Atlas.
If visitors still see the old design after an update, the site's offline cache is serving it once: a hard refresh (Ctrl+Shift+R) fixes it.

---

## Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| Render log: `MONGODB_URI missing` | The env var name is wrong or empty. Must be exactly `MONGODB_URI`. |
| Render log: `bad auth` / `Authentication failed` | Wrong Atlas user or password. Re-copy it; URL-encode special characters; check the user exists in **Database Access**. |
| Render log: `ENOTFOUND` / `querySrv` / timeout / "IP not whitelisted" | Atlas **Network Access** is missing `0.0.0.0/0`, or the connection string is malformed. |
| Render log: `JWT_SECRET missing` | Add `JWT_SECRET` in Render. |
| Site loads but spots are empty | The data is in the wrong database. The URI must end `.mongodb.net/souleydetour?...` and the collections must be inside `souleydetour`. Also check spots have `status: "published"`. |
| Spots call returns an HTML page or 404 instead of JSON | `client/vercel.json` still has the placeholder host, or was not pushed. Fix, push, redeploy. |
| Browser console: **CORS error** | `CLIENT_URL` on Render does not match your Vercel address exactly (check `https`, spelling, no trailing slash), or you are using a Vercel preview address; add it to `CLIENT_URL` separated by a comma. |
| Login succeeds but you are logged out after refresh | `NODE_ENV=production` is missing on Render, **or** `VITE_API_URL` is not `/api` (the site is calling Render directly, cross-site cookie). Fix and redeploy Vercel. |
| "Too many attempts" appears quickly for different people | The server sees one shared address for everyone. Add `TRUST_PROXY` = `2` on Render and redeploy. (Default is `1`.) |
| Refreshing `/spots/...` gives 404 | The second rule in `vercel.json` is missing. |
| First visit takes about a minute | Render free service waking up. Normal (see the pinger tip in Step 3). |
| Ask AI times out | Slow model, or the first request hit a sleeping server. Try again. The server stops an AI call after 60 s. |
| Build fails on Vercel with "vite: not found" or no `package.json` | **Root Directory** is not `client`. |
| Build fails on Render, "cannot find package.json" | **Root Directory** is not `server`. |
| Photos missing | Add the files to `client/public/spots/<slug>.jpg`, commit, push. |

**Direct mode (only if you do not want the Vercel forwarding):** set `VITE_API_URL` to `https://YOUR-SERVICE.onrender.com/api` on Vercel, remove the first rule from `vercel.json`, and keep `CLIENT_URL` exact. It works in Chrome and Firefox, but login can fail on Safari/iPhone and in private windows because of the cross-site cookie.

---

## Known issue
One unit test in the client (`pages/admin/Dashboard.test.jsx`, "a broken statistics call leaves the rest of the dashboard working") fails in the test runner. It checks an error message on the admin dashboard; the build and every other test pass, and it does not affect the deployed site. The two missing Filipino/Bisaya translation keys noted in `RESUME.md` were added.
