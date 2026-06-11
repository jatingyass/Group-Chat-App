const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');

const env = require('./config/env');
const logger = require('./utils/logger');
const { apiLimiter, authLimiter } = require('./middlewares/rateLimiter');
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler');

const signupRoute = require('./routes/signupRoutes');
const loginRoute = require('./routes/loginRoutes');
const groupRoutes = require('./routes/groupRoutes');
const fileRoutes = require('./routes/fileRoutes');

const app = express();

// Trust the first reverse proxy (Render, Railway, Nginx, etc.) so that
// req.ip and rate limiting see the real client IP, not the proxy's IP.
app.set('trust proxy', 1);

// --- Security & performance middleware ---
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
app.use(
  cors({
    origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  }),
);

// --- Body parsers (with size limits to prevent DoS via huge bodies) ---
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// --- Static serving for the local-storage driver ---
if (env.STORAGE_DRIVER === 'local') {
  app.use('/uploads', express.static(path.resolve(env.LOCAL_UPLOAD_PATH)));
}

// --- Health check (used by Render/Railway/k8s) ---
app.get('/healthz', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// --- API routes ---
app.use('/api', apiLimiter); // global limiter on /api
app.use('/auth', authLimiter, signupRoute, loginRoute); // strict limiter on auth
app.use('/api', groupRoutes);
app.use('/api/files', fileRoutes);

// --- 404 + global error handler ---
app.use(notFoundHandler);
app.use(errorHandler);

logger.info(
  `app initialized: env=${env.NODE_ENV} storage=${env.STORAGE_DRIVER} cors=${env.CORS_ORIGIN}`,
);

module.exports = app;
