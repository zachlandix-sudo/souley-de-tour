# SOULEY de Tour: client

React 18 + Vite + Tailwind v4 + React Router 6 + Leaflet. Talks to the Express API in `server/`.

## Run it

1. Start the API first (MongoDB running):
   ```
   cd server
   npm install
   npm run seed
   npm run dev
   ```
   In `server/.env`, `CLIENT_URL` must include `http://localhost:5173`.
2. Then the client:
   ```
   cd client
   npm install
   cp .env.example .env     # VITE_API_URL=http://localhost:5000/api
   npm run dev
   ```
   Open http://localhost:5173.

## Commands

- `npm run dev` start dev server
- `npm run build` production build
- `npm run test -- --run` run all tests once

## Logins

Seeded admin: `admin@souleydetour.com` (password is in the server seed file).
Register creates a visitor. Admins can promote users to editor or admin in Admin > Users.

## Notes

- Session is an httpOnly cookie; nothing is stored in localStorage.
- Spot images are URLs only (no upload endpoint yet).
- Favorite, itinerary and Ask AI buttons are placeholders until the next slice.

## Experience page (`/experience`)
Scroll-driven tour of the top 5 spots: sticky map, live weather/wave conditions (Open-Meteo), generated ocean soundscape (Web Audio), photo pan viewer, day/night slider, a drag-and-drop trip canvas with a timeline, and a print-to-PDF trip guide. The hero and the day/night simulation are one section (`HorizonHero`): the sky, sun, moon, sea and depth lines follow the hour, which you scrub on the sea.

## Homepage
- **Guided finder:** two taps (energy, budget) show the best-rated matches, with a link to the full filtered list.
- **Right now strip:** live weather, wind and wave height (Open-Meteo) with a one-line "what kind of day" hint.
- **Mood tiles:** six saved filters on `/spots` (edit them in `src/utils/homeFinder.js`).
