import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './api/middleware/errorHandler';

// Routes
import authRoutes from './api/routes/auth';
import chatbotRoutes from './api/routes/chatbots';
import chatRoutes from './api/routes/chat';
import billingRoutes from './api/routes/billing';
import apiKeyRoutes from './api/routes/apiKeys';
import dashboardRoutes from './api/routes/dashboard';
import organizationRoutes from './api/routes/organizations';
import knowledgeRoutes from './api/routes/knowledge';

const app = express();

// ─── SECURITY MIDDLEWARE ──────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginEmbedderPolicy: false, // Allow widget iframe embedding
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // Tighten in production
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https://api.stripe.com'],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
  })
);

// CORS configuration
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests without origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      config.FRONTEND_URL,
      config.WIDGET_CDN_URL,
    ];

    // In development, also allow localhost
    if (config.NODE_ENV === 'development') {
      allowedOrigins.push('http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173');
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Session-Id'],
  maxAge: 86400, // 24 hours
};

app.use(cors(corsOptions));

// ─── BODY PARSING ─────────────────────────────────────────────────────────────
// Raw body for Stripe webhooks
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));

// JSON for everything else
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── COMPRESSION ─────────────────────────────────────────────────────────────
app.use(compression());

// ─── LOGGING ─────────────────────────────────────────────────────────────────
if (config.NODE_ENV !== 'test') {
  app.use(
    morgan('combined', {
      stream: { write: (message) => logger.info(message.trim()) },
      skip: (req) => req.path === '/health',
    })
  );
}

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: config.NODE_ENV,
  });
});

// ─── API ROUTES ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/chatbots', chatbotRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/api-keys', apiKeyRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/knowledge', knowledgeRoutes);

// ─── ERROR HANDLING ───────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
