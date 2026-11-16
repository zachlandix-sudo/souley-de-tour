process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.AI_RETRY_BASE_MS = '0'; // no waiting between AI retries in tests
