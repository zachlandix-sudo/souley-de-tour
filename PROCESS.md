# SOULEY de Tour - Process Checklist

How to read this file:

- `[x]` = finished and checked (tests and build pass)
- `[~]` = written, but not run or checked yet (see the note under it)
- `[ ]` = not started yet (left blank on purpose)

Last updated: 2026-10-31 (Passport added)

---

## 1. Core site (finished before this round)

- [x] Tourist spot list with search, category filters, pagination
- [x] Spot details: gallery, facts, safety tips, reviews
- [x] Map explorer (Leaflet) with food layer toggle
- [x] Experience page (day/night slider, soundscape, panorama, live conditions, trip canvas)
- [x] Auth: register, login, logout, password strength, lockout
- [x] Roles (visitor, editor, admin) and admin panel
- [x] Ask SOULEY (AI recommendations + trip planner, works without API key)
- [x] Food section and "Eat nearby" on spot pages
- [x] Favorites and Saved page
- [x] My trips: save, view, share, delete
- [x] Near me sorting on spots, food and map
- [x] Review form with up to 3 compressed photos
- [x] English / Filipino / Bisaya
- [x] PWA offline mode
- [x] Home content sections (numbers, why, how it works, features, towns, trip ideas, tips, FAQ, CTA)
- [x] Client tests (31 files, 150 tests) and server tests (39)
- [x] Code-splitting (lazy map, experience, admin)

## 2. New this round: "Leyte Passport" (stamp book at /passport)

- [x] Design approved (short design in chat)
- [x] PROCESS.md created
- [x] README.md updated with Passport
- [x] Passport logic (`utils/passport.js`): stamp storage, 300 m distance check, manual "I was here", town grouping, badges, ranks, next stamp, share text
- [x] Passport logic tests (`utils/passport.test.js`): 16 pass (run with Node)
- [x] Passport page `/passport` (hero with count and rank, next stamp near you, town sections with stamp cards)
- [x] Stamp it button with geolocation, plus "I was here" fallback
- [x] Town badges when a town with 2+ spots is complete
- [x] Share my passport (share sheet, or copy as text)
- [x] Route, navbar link, Home teaser section
- [x] EN / Filipino / Bisaya text (`i18n/translationsMore6.js`, 43 keys, parity checked: 0 missing)
- [~] Passport page tests (`pages/Passport.test.jsx`, 9 tests): written, syntax-checked, NOT run yet
- [ ] Full `npm test` and `npm run build` pass
- [ ] Check the page on a phone with real GPS

Note: the workspace used for this round could not reach the npm registry, so `npm install`, Vitest and the Vite build could not be run here. On your computer run: `cd client && npm install && npm test && npm run build`, then tick the last two boxes.

## 3. Left over (not started)

- [ ] Server tests that need a real MongoDB (controllers, models)
- [ ] Native-speaker review of Filipino and Bisaya wording
- [ ] Manual check of PWA offline mode in a real browser
- [ ] Passport sync to the user account (stamps are stored in the browser for now)
- [ ] Passport stamps for food places (spots only for now)
- [ ] Bisaya phrasebook with spoken audio (idea, not approved yet)
