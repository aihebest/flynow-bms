const express  = require('express');
const helmet   = require('helmet');
const cors     = require('cors');
const morgan   = require('morgan');
const rateLimit = require('express-rate-limit');

const routes       = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const logger       = require('./config/logger');

const app = express();

// ─── Security headers ──────────────────────────────────────────────────────
app.use(helmet());

// ─── CORS ──────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://flynow-bms.azurestaticapps.net',  // replace with your Static Web App URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, server-to-server)
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

// ─── Rate limiting ─────────────────────────────────────────────────────────
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
}));

// ─── Body parsing ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── HTTP request logging ──────────────────────────────────────────────────
app.use(morgan('combined', {
  stream: { write: (msg) => logger.http(msg.trim()) },
}));

// ─── Health check (no auth required) ──────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'flynow-bms-api', timestamp: new Date().toISOString() });
});

// ─── Paystack webhook (PUBLIC — raw body required for HMAC verification) ───
// Must be mounted BEFORE /api and before json body parser applies to this path
app.use(
  '/webhooks/paystack',
  express.raw({ type: 'application/json' }),
  require('./routes/webhooks')
);

// ─── API Routes (all require Entra ID JWT) ─────────────────────────────────
app.use('/api', routes);

// ─── Global error handler ──────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
