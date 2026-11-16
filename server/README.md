# SOULEY de Tour - Backend (server)

Node.js + Express + MongoDB (Mongoose). Works with MongoDB Compass.

## Run

```bash
cd server
npm install
cp .env.example .env      # then edit JWT_SECRET, MONGODB_URI
npm run seed              # admin + categories + 4 SAMPLE spots
npm run dev               # http://localhost:5000
```

Reset all data: `npm run seed:reset`

Default admin (from .env): `admin@souleydetour.com` / `Admin12345` - CHANGE IT.

## MongoDB Compass

Connect: `mongodb://127.0.0.1:27017` -> database `souleydetour`.
Collections: users, categories, touristSpots, reviews, itineraries, aiConversations.

Sample filter queries (paste in Compass filter bar):
- Published spots: `{ "status": "published" }`
- By town: `{ "municipality": "Maasin City" }`
- Pending reviews: `{ "status": "pending" }`
- Near point (needs 2dsphere):
  `{ "location": { "$near": { "$geometry": { "type": "Point", "coordinates": [125.0, 10.1] }, "$maxDistance": 20000 } } }`

## API

All JSON: `{ success, data, pagination?, message?, errors? }`.
Auth: httpOnly cookie `token` OR header `Authorization: Bearer <token>`.

| Method | Route | Access |
|---|---|---|
| POST | /api/auth/register | public (role forced to visitor) |
| POST | /api/auth/login | public |
| POST | /api/auth/logout | public |
| GET | /api/auth/me | user |
| GET | /api/tourist-spots | public = published only; staff can use `status=` |
| GET | /api/tourist-spots/:idOrSlug | public (published) |
| POST | /api/tourist-spots | admin/editor |
| PUT | /api/tourist-spots/:id | admin/editor |
| PATCH | /api/tourist-spots/:id/status | admin/editor |
| DELETE | /api/tourist-spots/:id | admin (archive; `?hard=true` = real delete) |
| GET/POST | /api/tourist-spots/:id/reviews | public / user |
| PUT/DELETE | /api/reviews/:id | owner or admin |
| PATCH | /api/reviews/:id/status | admin |
| GET | /api/reviews | admin (moderation list, `?status=pending`) |
| GET | /api/categories | public (active) |
| POST/PUT/DELETE | /api/categories(/:id) | admin (delete blocked if in use) |
| GET | /api/users/me/overview | user (own counts, `reviewedSpotIds`, latest reviews / trips / questions; powers the client `/journey` page) |
| GET/POST/DELETE | /api/users/me/favorites(/:touristSpotId) | user |
| GET/PUT | /api/users/me/passport/stamps | user (PUT merges stamps collected as a guest, up to 500) |
| POST/DELETE | /api/users/me/passport/stamps/:touristSpotId | user (one stamp per published spot) |
| PATCH | /api/users/me/passport | user (`homeTown` up to 60 characters, `color` black / navy / green / burgundy) |
| GET/PATCH/DELETE | /api/users(/:id) | admin |
| GET/POST/PUT/DELETE | /api/itineraries(/:id) | user (own only) |
| POST | /api/ai/recommendations | public, rate limited |
| POST | /api/ai/itinerary | public, rate limited (`save:true` needs login) |
| GET | /api/ai/conversations | user |
| GET | /api/admin/dashboard | admin/editor |
| GET | /api/admin/statistics?range=7d\|30d\|90d\|12m | admin/editor |
| GET | /api/admin/health(?check=key&limit=500) | admin/editor (what each spot still needs, score) |
| POST | /api/admin/spots/bulk | admin/editor `{ids, action}` publish, draft, archive, feature, unfeature; delete = admin |
| POST | /api/admin/reviews/bulk | admin `{ids, action}` approve, reject, pending, delete |
| GET | /api/admin/activity?type=&q=&page= | admin (who changed what) |
| GET | /api/admin/export/:kind | spots: admin/editor; users, reviews, activity: admin. CSV download, list filters work |
| GET | /api/users/:id/overview | admin (counts, latest reviews and trips) |
| POST | /api/users/:id/force-logout, /api/users/:id/unlock | admin |

### Spot list query params
`search, municipality, category (slug or id), status, difficulty, featured, minRating, maxBudget, activity, sort (newest|popularity|rating|name), page, limit`

Example:
`GET /api/tourist-spots?search=beach&municipality=Maasin%20City&category=nature&page=1&limit=12&sort=rating`

### Spot create body (admin)
Send `latitude` and `longitude` as plain numbers. Server builds GeoJSON `location`. Slug auto-made from name.
`images` must be an array with at least 1 URL.

### AI body
```json
{ "question": "Relaxed family trip, 2 days", "budget": 3000, "travelers": 4,
  "durationDays": 2, "activity": "beach", "municipality": "Limasawa",
  "travelStyle": "relaxed", "accessibility": "" }
```

## AI how it works (grounded)
1. Server queries MongoDB for **published** spots, scores them vs. your preferences.
2. Only top records go to the LLM as CONTEXT.
3. Server throws away any spot id the model returns that was not in CONTEXT.
4. No `AI_API_KEY` or provider error = fallback answer straight from DB (no LLM). API key never leaves server.
5. AI calls retry on 429/5xx/network errors/timeouts (backoff, `retry-after`), then try `AI_FALLBACK_MODELS` (other models on the same provider). See `.env.example`.
6. Trip planner uses `openDays` and `bestMonths` of each spot when the trip has a start date (empty = open every day / good all year).

## Rules built in
- Passwords: bcrypt (12 rounds). `passwordHash` never returned.
- Role never accepted from register body.
- Public cannot see draft/archived spots.
- Visitor reviews start `pending`; average rating counts `approved` only.
- One review per user per spot.
- Admin cannot change/delete own account; admin must be demoted before delete.
- Login/register and AI routes rate limited. Helmet + CORS on.

## Notes
- Seed spots are SAMPLE data with approximate coordinates and placeholder images. Replace via admin API.
- Node 18+ needed (uses built-in `fetch`).

## Auth hardening
- Login: 10 failed attempts per 15 min per IP, and an account locks for 15 min after 5 wrong passwords.
- `PATCH /api/auth/password` changes the password and signs out all other sessions.
- `POST /api/auth/logout-all` signs out every device (session version `tokenVersion` in the JWT).
- The token is only in the httpOnly cookie, never in the response body.
