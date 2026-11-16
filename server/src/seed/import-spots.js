// Lives in server/src/seed/. Run from the server folder:
//   node src/seed/import-spots.js            imports ./data/southern-leyte-spots.json as DRAFTS (hidden from visitors)
//   node src/seed/import-spots.js --publish  imports them as PUBLISHED so they show on the site and the /map page
//   node src/seed/import-spots.js other.json  uses a different file (for example the geocoded one)
// Photos: each spot and food place carries a `photo` path (/spots/<slug>.jpg) in the data file, so a file with that name in
// client/public/spots/ shows up on its card. Entries without a `photo` fall back to /spots/<slug>.jpg.
// Spots are matched by slug. Existing spots get their text and location refreshed; their status is only set with --publish.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const TouristSpot = require('../models/TouristSpot');
const Category = require('../models/Category');
const slugify = require('../utils/slugify');
const { normalizeDays, normalizeMonths } = require('../utils/schedule');

async function run() {
  const args = process.argv.slice(2);
  const publish = args.includes('--publish');
  const file = args.find((a) => !a.startsWith('--')) || path.join(__dirname, 'data', 'southern-leyte-spots.json');
  const spots = JSON.parse(fs.readFileSync(file, 'utf8'));
  await connectDB();

  const catId = {};
  for (const name of new Set(spots.flatMap((s) => s.categories))) {
    const slug = slugify(name);
    await Category.updateOne({ slug }, { $setOnInsert: { name, slug, icon: 'map-pin', description: `${name} spots.` } }, { upsert: true });
    catId[name] = (await Category.findOne({ slug }))._id;
  }

  for (const s of spots) {
    const slug = s.slug || slugify(s.name);
    // optional planner data in the file: openDays ("Mon-Sat" or a list) and bestMonths ("Nov-Feb" or numbers), plus bestTimeToVisit text.
    // Only set when the file has them, so a re-import never wipes what was typed in the admin.
    const pick = (...keys) => keys.map((k) => s[k]).find((v) => v !== undefined && v !== null && String(v).trim() !== '');
    const openDays = pick('openDays', 'openingDays', 'open_days');
    const bestMonths = pick('bestMonths', 'bestMonth', 'best_months');
    const bestTime = pick('bestTimeToVisit', 'bestTime');
    const photo = s.photo || `/spots/${slug}.jpg`; // the data file's photo path (the file you drop into client/public/spots/)
    await TouristSpot.updateOne(
      { slug },
      {
        $set: {
          name: s.name, slug, shortDescription: s.description.slice(0, 300), description: s.description,
          categoryIds: s.categories.map((c) => catId[c]), municipality: s.municipality, barangay: s.barangay || undefined,
          address: s.address, location: { type: 'Point', coordinates: [s.longitude, s.latitude] }, activities: s.activities,
          ...(s.entryType && { entryType: String(s.entryType).trim().toLowerCase() }),
          ...(openDays !== undefined && { openDays: normalizeDays(openDays) }),
          ...(bestMonths !== undefined && { bestMonths: normalizeMonths(bestMonths) }),
          ...(bestTime !== undefined && { bestTimeToVisit: String(bestTime) }),
          ...(publish && { status: 'published' }),
        },
        $setOnInsert: { images: [photo], ...(!publish && { status: 'draft' }) },
      },
      { upsert: true }
    );
    // Spots imported earlier got a placehold.co picture. Swap that for the photo path; real photos are never touched.
    await TouristSpot.updateOne({ slug, images: { $size: 1 }, 'images.0': /placehold\.co/ }, { $set: { images: [photo] } });
  }
  console.log(`Imported ${spots.length} spots${publish ? ' (published)' : ' as drafts'}.`);
  await mongoose.disconnect();
}

run().catch((e) => { console.error(e); process.exit(1); });
