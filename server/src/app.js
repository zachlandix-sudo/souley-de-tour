const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const { notFound, errorHandler } = require('./middleware/error');
const { parseOrigins } = require('./utils/origins');

const app = express();

// Behind Render's (and Vercel's) proxy the real visitor address comes in X-Forwarded-For. Without this every visitor looks like
// the proxy, and the login / AI rate limits would be shared by everybody. TRUST_PROXY = how many proxies to trust (default 1 in production).
if (process.env.TRUST_PROXY) app.set('trust proxy', /^\d+$/.test(process.env.TRUST_PROXY) ? Number(process.env.TRUST_PROXY) : process.env.TRUST_PROXY);
else if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: parseOrigins(process.env.CLIENT_URL), credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
if (process.env.NODE_ENV !== 'test') app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/api/health', (_req, res) => res.json({ success: true, message: 'SOULEY de Tour API up.' }));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/tourist-spots', require('./routes/touristSpotRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));
app.use('/api/itineraries', require('./routes/itineraryRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/photos', require('./routes/photoRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
