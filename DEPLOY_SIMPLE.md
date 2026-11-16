# SOULEY de Tour: simple deploy guide

GitHub (code) -> MongoDB Atlas (database) -> Render (backend) -> Vercel (frontend).
Do them in this order. Keep a notepad open for the 4 values marked **[copy]**.
(The long version with troubleshooting is DEPLOYMENT.md.)

## 1. GitHub
1. github.com -> New repository -> name `souley-de-tour` -> Private -> do NOT add README/.gitignore -> Create.
2. In PowerShell, inside the project folder:
```
git init
git add .
git status
```
Check the list: there must be no `.env` and no `node_modules`. Then:
```
git commit -m "first deploy"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/souley-de-tour.git
git push -u origin main
```

## 2. MongoDB Atlas
1. cloud.mongodb.com -> create a free **M0** cluster (AWS, Singapore).
2. **Database Access** -> Add user (username `souley`, autogenerate a password and copy it).
3. **Network Access** -> Add IP -> **Allow access from anywhere** (0.0.0.0/0).
4. **Connect -> Drivers** -> copy the string and put `souleydetour` right after `.mongodb.net/`:
   `mongodb+srv://souley:PASSWORD@cluster0.xxxxx.mongodb.net/souleydetour?retryWrites=true&w=majority`
   **[copy] ATLAS_URI**
5. Load the data, pick one:
   - **From your local database:** Compass -> export each collection as JSON, then connect Compass to ATLAS_URI and Add Data -> Import JSON into the same collection names.
   - **From the project files** (in `server/`):
```
npm install
$env:MONGODB_URI = "ATLAS_URI"
npm run import:spots:publish
npm run import:food:publish
$env:SEED_ADMIN_EMAIL = "you@example.com"
$env:SEED_ADMIN_PASSWORD = "a-strong-password"
npm run reset:admin
```

## 3. Render (backend)
1. Make a secret and copy it: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` **[copy] JWT_SECRET**
2. dashboard.render.com -> New + -> Web Service -> pick the repo.
   Name `souley-de-tour-api`, Region Singapore, **Root Directory `server`**, Build `npm install`, Start `npm start`, Free.
3. Environment variables:

| Key | Value |
|---|---|
| NODE_VERSION | 20 |
| NODE_ENV | production |
| MONGODB_URI | your ATLAS_URI |
| JWT_SECRET | the secret from step 1 |
| JWT_EXPIRES_IN | 7d |
| CLIENT_URL | http://localhost:5173 (changed in step 4) |
| UNSPLASH_ACCESS_KEY | optional, real photos on the Home mood cards |
| AI_API_KEY | optional |

4. Health Check Path: `/api/health`. Create. Wait for "MongoDB connected" in the log.
5. Open `https://YOUR-SERVICE.onrender.com/api/health`: you should see `"success":true`. **[copy] RENDER_URL**

## 4. Vercel (frontend)
1. In `client/vercel.json` replace `YOUR-RENDER-SERVICE.onrender.com` with your Render host. Then:
```
git add client/vercel.json
git commit -m "point Vercel at Render"
git push
```
2. vercel.com -> Add New -> Project -> import the repo. Framework **Vite**, **Root Directory `client`**.
3. Environment variable: `VITE_API_URL` = `/api` (set it before the first deploy). Deploy. **[copy] VERCEL_URL**
4. Back on Render, change `CLIENT_URL` to your VERCEL_URL (https, no trailing slash). Render redeploys by itself.

## 5. Check
- [ ] Home page loads and the mood cards show photos
- [ ] Spots and Food list your places (the first load after sleeping takes up to a minute)
- [ ] Refreshing a spot page does not 404
- [ ] Register, log out, log in, press F5: still logged in
- [ ] Admin login works, then change the admin password

Later updates: `git add . && git commit -m "..." && git push` and both sites rebuild by themselves.
