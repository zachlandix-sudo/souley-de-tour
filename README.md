# SOULEY de Tour

AI-assisted tourist discovery platform for **Southern Leyte**, Philippines.
Browse tourist spots, explore them on a map, plan trips, save favorites, and ask an AI guide for recommendations and itineraries.

## Tech Stack

| Layer | Tools |
|---|---|
| Client | React 18, Vite 6, React Router 6, Tailwind CSS 4, Leaflet / React-Leaflet (maps), MapLibre GL (3D town map on Home), Axios, Vitest |
| Server | Node.js, Express 4, Mongoose 8, JWT (httpOnly cookie), bcryptjs, Helmet, express-validator, rate limiting |
| Database | MongoDB (use MongoDB Compass to browse data) |
| AI | Any OpenAI-compatible API (optional; works in fallback mode without a key) |

## Project Structure

```
souley-de-tour/
├── client/                 React app (Vite)  -> http://localhost:5173
│   ├── public/
│   │   ├── auth/           hero.jpg (login/register side panel)
│   │   └── spots/          spot photos (see PHOTOS.md)
│   └── src/
│       ├── components/     UI pieces (SpotCard, SpotMap, Navbar, home/, experience/ ...)
│       ├── pages/          Home, Spots (list + map + coordinates), SpotDetails, Experience, Ask, Food, Passport, Journey, Saved, Trips, Account, Login, Register, admin/
│       ├── hooks/          useSpots, useSpot, useAllSpots, useConditions, useTripCanvas ...
│       ├── services/       API calls (api.js, spotService, authService ...)
│       ├── routes/         router + route guards (RequireAuth, RequireRole, GuestOnly)
│       ├── context/        AuthContext
│       └── utils/          geo, query, passwordStrength, tripExport ...
└── server/                 Express API  -> http://localhost:5000
    └── src/
        ├── controllers/    request handlers
        ├── models/         User, TouristSpot, Category, Review, Itinerary, AiConversation
        ├── routes/         auth, tourist-spots, categories, users, reviews, itineraries, ai, admin
        ├── middleware/     auth, validation, error handling
        ├── services/       aiService (search + LLM), intent (reads the question), answerWriter (replies from the data, EN/Fil/Bisaya)
        └── seed/           seed + import scripts and data (spots + food JSON/CSV)
```

## Requirements

- Node.js 18+ (20 LTS recommended)
- MongoDB running locally (`mongodb://127.0.0.1:27017`) or a MongoDB Atlas URI
- MongoDB Compass (optional, for viewing data)

## Quick Start (Windows PowerShell)

### 1. Server

```powershell
cd server
npm install
copy .env.example .env      # if .env.example is missing, create .env using the template below
npm run seed                # admin account + categories + sample spots
npm run import:spots:publish   # import the Southern Leyte spots
npm run import:food:publish    # import the food businesses
npm run dev                 # http://localhost:5000
```

### 2. Client

```powershell
cd client
npm install
npm run dev                 # http://localhost:5173
```

Client `.env`:

```
VITE_API_URL=http://localhost:5000/api
```

### Server `.env` template

```
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/souleydetour
JWT_SECRET=change-me-to-a-long-random-string
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173

# AI (OpenAI-compatible). Leave AI_API_KEY empty = fallback mode (database-only answers, no LLM)
AI_API_KEY=
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini

# Seed admin
SEED_ADMIN_EMAIL=admin@souleydetour.com
SEED_ADMIN_PASSWORD=Admin12345
```

**Never commit `.env`.** Change the default admin password right after first login.

## Server Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start API with nodemon |
| `npm start` | Start API (production) |
| `npm run seed` | Create admin, categories, sample spots |
| `npm run seed:reset` | Wipe and reseed all data |
| `npm run reset:admin` | Reset the admin account password |
| `npm run import:spots` | Import spots as drafts |
| `npm run import:spots:publish` | Import spots and publish them |
| `npm run import:food` | Import food businesses as drafts |
| `npm run import:food:publish` | Import food businesses and publish them |
| `npm test` | Run server tests (Node test runner + supertest, no database needed) |

## Client Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview the build |
| `npm test` | Run Vitest tests |

## Features

- Tourist spot listing with search, category filters, and pagination
- Spot details with gallery, facts, safety tips, and reviews
- Interactive map explorer (Leaflet)
- Experience page: day/night slider, soundscape, panorama, live conditions, trip canvas
- Home guided finder (mood tiles, "right now" strip) plus content sections: key numbers, why Southern Leyte, how it works, feature grid, explore by town, trip ideas, travel tips, FAQ and a closing call to action
- Auth: register, login, logout, password strength meter, account lockout, session invalidation
- Roles: `visitor`, `editor`, `admin`
- Admin panel: dashboard, spots, categories, reviews moderation, users
- Reviews with moderation
- Ask SOULEY page: reads each question (English, Filipino or Bisaya) and answers it: places by town / activity / budget / who is going, facts about a named place (fee, opening days, best months, how to get there, what to bring), comparisons, "what is near X", day-by-day trips, and follow-ups like "how much is it?" or "something cheaper". Works without an API key: replies are written from the spot data; with a key the model writes the recommendation text and is told what was understood
- Food section (`/food`) with instant search, municipality and place-type filters with counts, meal picks (breakfast, coffee, lunch...), sorting, rating / saved / food-log filters, shareable filter links, a personal food log ("I ate here"), a "Spin the plate" random picker, and a food trip tray that opens one Google Maps route
- My journey (`/journey`): a personal dashboard for signed-in visitors, different from the admin one. A boarding-pass header (greeting, stamps, saved, trips, passport ring and rank), one "Up next" suggestion, and cards for passport progress by town, trips (the next one first, with a countdown), saved spots, my reviews and their status, recent questions to Ask SOULEY (tap to ask again) and the food log
- Favorites: heart button on spot pages and a Saved spots page (`/saved`)
- Near me: sort spots, food and the map list by distance from your location, distance shown on cards
- Review form with up to 3 compressed photos
- Food layer toggle on the map
- English / Filipino / Bisaya and offline support (PWA)
- Eat nearby: nearest food places on every spot page
- My trips (`/trips`): save AI-planned trips, view them, share (share sheet or copy as text), delete
- Leyte Passport (`/passport`): collect a dated stamp at each spot (within 300 m by GPS, or "I was here"), earn town badges and a rank, see the next stamp near you, share your passport. Stamps are saved in the browser (localStorage), no account needed
- Photo holders: missing photos show a framed placeholder with the expected file name (dev mode)

## Photos

Drop images into `client/public/` using the exact file names listed in [`client/PHOTOS.md`](client/PHOTOS.md) (JPG, about 1600px wide, under 400 KB). Placeholders disappear automatically once the file exists.

## API Overview

All responses: `{ success, data, pagination?, message?, errors? }`.
Auth uses an httpOnly cookie `token` or `Authorization: Bearer <token>`.

| Method | Route | Access |
|---|---|---|
| POST | `/api/auth/register`, `/login`, `/logout` | public |
| GET | `/api/auth/me` | user |
| GET | `/api/tourist-spots` | public (published only) |
| GET | `/api/tourist-spots/:idOrSlug` | public |
| POST / PUT / PATCH / DELETE | `/api/tourist-spots` ... | admin / editor |
| GET / POST | `/api/tourist-spots/:id/reviews` | public / user |
| GET | `/api/categories` | public |
| GET | `/api/users/me/overview` | user (own counts, reviews, trips and questions for `/journey`) |
| GET / POST / DELETE | `/api/users/me/favorites(/:spotId)` | user |
| GET / PUT / POST / DELETE | `/api/users/me/passport/stamps(/:spotId)` | user (Leyte Passport stamps) |
| PATCH | `/api/users/me/passport` | user (home town, cover colour) |
| GET / POST / PUT / DELETE | `/api/itineraries(/:id)` | user (own only) |
| POST | `/api/ai/recommendations` | public, rate limited |
| POST | `/api/ai/itinerary` | public, rate limited (`save:true` needs login) |
| GET | `/api/ai/conversations` | user |
| GET | `/api/admin/dashboard` | admin / editor |
| GET / POST | `/api/admin/health`, `/api/admin/spots/bulk`, `/api/admin/export/:kind` | admin / editor |
| GET / POST | `/api/admin/activity`, `/api/admin/reviews/bulk` | admin |

Full table: see `server/README.md`.

## MongoDB Compass

Connect to `mongodb://127.0.0.1:27017`, database `souleydetour`.
Collections: `users`, `categories`, `touristSpots`, `reviews`, `itineraries`, `aiConversations`, `auditLogs` (the admin activity log).

Handy filters:

- Published spots: `{ "status": "published" }`
- By town: `{ "municipality": "Maasin City" }`
- Pending reviews: `{ "status": "pending" }`

## Data Notes

- Food businesses (`southern-leyte-food.json/.csv`) are directory candidates. Many coordinates are approximate (municipality center). Verify operation, menu, and exact location before relying on them.
- Spot data is in `server/src/seed/data/`. Use `geocode-spots.mjs` to improve coordinates.

## Status / Task Tracker

Last updated: 2026-10-31. All roadmap items are coded. See [`PROCESS.md`](PROCESS.md) for the full checklist. Client: `npm test` (31 files, 150 tests) and `npm run build` pass.

| Task | Status | Notes |
|---|---|---|
| AI chat page ("Ask SOULEY") + trip planner form | DONE | `/ask` |
| Food and restaurants section | DONE | `/food`, `Eat nearby` on spot pages |
| Food layer on the map | DONE | Category chips on `/spots`, black/orange pins |
| Favorites and "Saved" tab | DONE | `/saved` |
| Save / view / share itineraries | DONE | `/ask` save button, `/trips`, share, delete (tested) |
| "Near me" sorting and distance | DONE | `/spots`, `/food` |
| Review submit form + photos (max 3) | DONE | `ReviewForm`, client compression, server validation |
| Dark mode | REMOVED | Removed at the owner's request; site is light only |
| Multi-language (English / Filipino / Bisaya) | DONE | Needs native-speaker review of wording; admin pages not translated |
| PWA offline mode | DONE | `sw.js`, manifest, offline banner |
| Leyte Passport (`/passport`) | DONE (code) | Stamps, town badges, ranks, share, EN/Fil/Bisaya. Logic tests pass; page tests and build still to be run on your machine |
| Tests for new work | DONE | Client: Trips, Ask save, ReviewForm, geo, i18n parity. Server: 39 tests (auth, validation, errors, utils, AI service + AI routes) |

### Next up

0. Run `cd client && npm install && npm test && npm run build` to confirm the Passport page tests and build (could not be run when it was added).
1. Server tests that need a real MongoDB (controllers, models) via an in-memory database.
2. Native-speaker review of Filipino and Bisaya strings in `client/src/i18n/`.
3. Check offline mode by hand in a browser.

## License

Private project. All rights reserved.
