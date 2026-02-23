import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001').transform(Number),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Stripe (required in production)
  STRIPE_SECRET_KEY: z.string().startsWith('sk_').optional().or(z.literal('')),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_').optional().or(z.literal('')),
  STRIPE_PRICE_STARTER: z.string().optional().default(''),
  STRIPE_PRICE_GROWTH: z.string().optional().default(''),
  STRIPE_PRICE_ENTERPRISE: z.string().optional().default(''),

  // AI Providers (at least one required)
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),

  // Redis (Upstash) - optional in dev (falls back to in-memory)
  UPSTASH_REDIS_REST_URL: z.string().url().optional().or(z.literal('')),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional().default(''),

  // App
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  WIDGET_CDN_URL: z.string().url().default('http://localhost:3000'),
  APP_NAME: z.string().default('ChatBot Builder'),
  SUPPORT_EMAIL: z.string().email().default('support@example.com'),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().default('587').transform(Number),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  FROM_EMAIL: z.string().email().optional(),

  // Security
  BCRYPT_ROUNDS: z.string().default('12').transform(Number),
  RATE_LIMIT_WINDOW_MS: z.string().default('60000').transform(Number),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100').transform(Number),
});

type EnvConfig = z.infer<typeof envSchema>;

function validateEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    result.error.errors.forEach((err) => {
      console.error(`  ${err.path.join('.')}: ${err.message}`);
    });
    process.exit(1);
  }
  return result.data;
}

export const config = validateEnv();

// Plan limits
export const PLAN_LIMITS = {
  FREE: {
    chatbots: 1,
    messagesPerMonth: 500,
    conversationsPerMonth: 100,
    knowledgeDocuments: 5,
    customDomains: 0,
    apiAccess: false,
    removesBranding: false,
    webhooks: false,
    analytics: false,
    leadCapture: false,
  },
  STARTER: {
    chatbots: 3,
    messagesPerMonth: 5000,
    conversationsPerMonth: 1000,
    knowledgeDocuments: 25,
    customDomains: 1,
    apiAccess: true,
    removesBranding: true,
    webhooks: false,
    analytics: true,
    leadCapture: true,
  },
  GROWTH: {
    chatbots: 10,
    messagesPerMonth: 25000,
    conversationsPerMonth: 5000,
    knowledgeDocuments: 100,
    customDomains: 5,
    apiAccess: true,
    removesBranding: true,
    webhooks: true,
    analytics: true,
    leadCapture: true,
  },
  ENTERPRISE: {
    chatbots: 100,
    messagesPerMonth: 500000,
    conversationsPerMonth: 100000,
    knowledgeDocuments: 1000,
    customDomains: 50,
    apiAccess: true,
    removesBranding: true,
    webhooks: true,
    analytics: true,
    leadCapture: true,
  },
} as const;

export const PRICING = {
  FREE: { monthly: 0, annual: 0 },
  STARTER: { monthly: 29, annual: 290 },
  GROWTH: { monthly: 79, annual: 790 },
  ENTERPRISE: { monthly: 299, annual: 2990 },
} as const;
