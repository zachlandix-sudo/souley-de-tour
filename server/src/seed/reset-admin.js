// Sets the admin account's password (and makes sure it is an active admin) without touching any other data.
//   npm run reset:admin
// Uses SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD from .env (defaults: admin@souleydetour.com / Admin12345).
require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');

(async () => {
  await connectDB();
  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@souleydetour.com').toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || 'Admin12345';
  const passwordHash = await User.hashPassword(password);
  const user = await User.findOne({ email });
  if (user) {
    user.passwordHash = passwordHash;
    user.role = 'admin';
    user.status = 'active';
    user.failedLoginCount = 0;
    user.lockUntil = undefined;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    console.log(`Admin updated: ${email}`);
  } else {
    await User.create({ fullName: 'SOULEY Admin', email, passwordHash, role: 'admin' });
    console.log(`Admin created: ${email}`);
  }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
