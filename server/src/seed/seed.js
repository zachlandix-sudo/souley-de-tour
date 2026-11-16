require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Category = require('../models/Category');
const TouristSpot = require('../models/TouristSpot');
const Review = require('../models/Review');
const Itinerary = require('../models/Itinerary');
const AiConversation = require('../models/AiConversation');
const slugify = require('../utils/slugify');

// !! SAMPLE DEV DATA. Coordinates are approximate. Replace with verified records via admin page.
const categories = [
  { name: 'Nature', icon: 'leaf', description: 'Natural attractions and outdoor destinations.' },
  { name: 'Beach', icon: 'waves', description: 'Beaches and coastal spots.' },
  { name: 'Heritage', icon: 'landmark', description: 'Historical and religious sites.' },
  { name: 'Adventure', icon: 'mountain', description: 'Diving, trekking and active trips.' },
  { name: 'Culture', icon: 'masks', description: 'Local culture and festivals.' },
  { name: 'Food', icon: 'utensils', description: 'Local food and dining.' },
].map((c, i) => ({ ...c, slug: slugify(c.name), displayOrder: i + 1 }));

const spots = [
  {
    name: 'Limasawa Island',
    municipality: 'Limasawa',
    cats: ['Heritage', 'Beach'],
    short: 'Island town linked to the first Catholic Mass in the Philippines.',
    desc: 'Limasawa is an island municipality at the southern tip of Southern Leyte, known for its historical significance and island scenery. SAMPLE RECORD: verify and expand details in the admin page.',
    coords: [125.0719, 9.9136],
    activities: ['Sightseeing', 'Island hopping', 'History tour'],
    featured: true,
  },
  {
    name: 'Sogod Bay',
    municipality: 'Sogod',
    cats: ['Nature', 'Adventure'],
    short: 'Wide bay known for diving and marine life.',
    desc: 'Sogod Bay is a large bay on the east side of the province, popular for diving and sea activities. SAMPLE RECORD: verify and expand details in the admin page.',
    coords: [125.0, 10.38],
    activities: ['Diving', 'Snorkeling', 'Boat trip'],
    featured: true,
  },
  {
    name: 'Maasin Cathedral',
    municipality: 'Maasin City',
    cats: ['Heritage', 'Culture'],
    short: 'Historic cathedral in the provincial capital.',
    desc: 'A landmark church in Maasin City, the provincial capital. SAMPLE RECORD: verify and expand details in the admin page.',
    coords: [124.8386, 10.1319],
    activities: ['Sightseeing', 'Photography'],
    featured: false,
  },
  {
    name: 'Panaon Island Coast',
    municipality: 'Liloan',
    cats: ['Beach', 'Nature'],
    short: 'Coastal scenery on Panaon Island.',
    desc: 'Panaon Island sits at the southern end of Southern Leyte with coastal views and marine areas. SAMPLE RECORD: verify and expand details in the admin page.',
    coords: [125.1, 10.1],
    activities: ['Swimming', 'Sightseeing'],
    featured: false,
  },
];

async function run() {
  await connectDB();

  if (process.argv.includes('--reset')) {
    console.log('Reset: clearing collections...');
    await Promise.all([User, Category, TouristSpot, Review, Itinerary, AiConversation].map((m) => m.deleteMany({})));
  }

  // admin
  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@souleydetour.com').toLowerCase();
  let admin = await User.findOne({ email });
  if (!admin) {
    admin = await User.create({
      fullName: 'SOULEY Admin',
      email,
      passwordHash: await User.hashPassword(process.env.SEED_ADMIN_PASSWORD || 'Admin12345'),
      role: 'admin',
    });
    console.log(`Admin created: ${email}`);
  } else console.log('Admin exists, skip.');

  // categories
  for (const c of categories) await Category.updateOne({ slug: c.slug }, { $setOnInsert: c }, { upsert: true });
  const cats = await Category.find();
  const catId = Object.fromEntries(cats.map((c) => [c.name, c._id]));

  // spots
  for (const s of spots) {
    const slug = slugify(s.name);
    await TouristSpot.updateOne(
      { slug },
      {
        $setOnInsert: {
          name: s.name,
          slug,
          shortDescription: s.short,
          description: s.desc,
          categoryIds: s.cats.map((n) => catId[n]),
          municipality: s.municipality,
          location: { type: 'Point', coordinates: s.coords },
          images: [`https://placehold.co/800x500?text=${encodeURIComponent(s.name)}`],
          activities: s.activities,
          status: 'published',
          isFeatured: s.featured,
          createdBy: admin._id,
        },
      },
      { upsert: true }
    );
  }

  await Promise.all([User, Category, TouristSpot, Review, Itinerary, AiConversation].map((m) => m.syncIndexes()));
  console.log(`Seed done. categories=${await Category.countDocuments()} spots=${await TouristSpot.countDocuments()}`);
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
