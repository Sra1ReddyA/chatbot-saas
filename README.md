# 🤖 ChatBot Builder SaaS

**Production-ready, multi-tenant AI Chatbot Builder for Small Businesses**

Build and deploy AI chatbots powered by GPT-4 and Claude in minutes. Full SaaS with billing, analytics, multi-tenancy, and an embeddable widget.

---

## 📋 Table of Contents

1. [System Architecture](#system-architecture)
2. [Tech Stack](#tech-stack)
3. [Folder Structure](#folder-structure)
4. [Database Schema](#database-schema)
5. [Quick Start](#quick-start)
6. [Environment Variables](#environment-variables)
7. [Deployment Guide](#deployment-guide)
8. [API Documentation](#api-documentation)
9. [Widget Embed](#widget-embed)
10. [Security Checklist](#security-checklist)
11. [Scaling Plan](#scaling-plan)
12. [Monetization Model](#monetization-model)
13. [Future Roadmap](#future-roadmap)
14. [Admin Dashboard](#admin-dashboard)
15. [CI/CD](#cicd)

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     EXTERNAL CLIENTS                      │
│         Browser  │  Mobile  │  Widget (any site)         │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│                    NGINX (Reverse Proxy)                   │
│    Rate Limiting │ TLS Termination │ Static Asset Serve   │
└──────────────────┬──────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
┌───────▼──────┐    ┌─────────▼─────────┐
│  Next.js 14  │    │    Express API     │
│  (Frontend)  │    │  (Node.js + TS)    │
│   Port 3000  │    │    Port 3001       │
└──────────────┘    └─────────┬─────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
     ┌────────▼─────┐ ┌──────▼────┐ ┌───────▼──────┐
     │  PostgreSQL  │ │   Redis   │ │  AI Providers │
     │  (Primary    │ │(Upstash)  │ │  OpenAI/      │
     │   Database)  │ │Rate Limit │ │  Anthropic    │
     └──────────────┘ │  Cache    │ └───────────────┘
                      └───────────┘
                              │
                     ┌────────▼──────┐
                     │    Stripe     │
                     │  (Payments)   │
                     └───────────────┘
```

### Multi-Tenancy Design

- **Organization-level isolation**: All data is scoped to `organizationId`
- **Row-level security**: Every query filters by organization
- **Shared infrastructure**: Cost-efficient for small tenants
- **Plan-based feature flags**: Features locked/unlocked based on plan
- **Session isolation**: Widget sessions tied to chatbot, not organization

---

## 🛠️ Tech Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| **Frontend** | Next.js 14 (App Router) | SSR, SEO, performance |
| **UI** | Tailwind CSS + shadcn/ui | Rapid development |
| **State** | Zustand | Lightweight, TypeScript-first |
| **Charts** | Recharts | Easy integration |
| **Backend** | Express + TypeScript | Fast, type-safe API |
| **Database** | PostgreSQL + Prisma | Reliable, great ORM |
| **Cache/Rate Limit** | Upstash Redis | Serverless Redis |
| **Auth** | JWT (jose) + bcrypt | Stateless, secure |
| **Payments** | Stripe | Industry standard |
| **AI (OpenAI)** | GPT-4o / GPT-4o-mini | Best quality/price |
| **AI (Anthropic)** | Claude 3.5 Sonnet | Alternative provider |
| **Proxy** | Nginx | Performance, SSL |
| **CI/CD** | GitHub Actions | Automated deployments |
| **Containers** | Docker + Compose | Reproducible deployments |
| **Logging** | Winston | Structured logging |
| **Validation** | Zod | Type-safe validation |

---

## 📁 Folder Structure

```
chatbot-saas/
├── backend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts           # JWT + API key auth
│   │   │   │   ├── validation.ts     # Zod schemas
│   │   │   │   └── errorHandler.ts   # Global error handling
│   │   │   └── routes/
│   │   │       ├── auth.ts           # Register, login, refresh
│   │   │       ├── chatbots.ts       # CRUD + analytics
│   │   │       ├── chat.ts           # Widget API (public)
│   │   │       ├── billing.ts        # Stripe integration
│   │   │       ├── apiKeys.ts        # API key management
│   │   │       └── dashboard.ts      # Stats & analytics
│   │   ├── config/
│   │   │   ├── index.ts              # Validated env config
│   │   │   ├── database.ts           # Prisma singleton
│   │   │   └── redis.ts              # Rate limiters
│   │   ├── services/
│   │   │   ├── chatService.ts        # AI provider abstraction
│   │   │   └── stripeService.ts      # Stripe operations
│   │   ├── types/index.ts            # TypeScript types
│   │   ├── utils/
│   │   │   ├── auth.ts               # JWT, bcrypt helpers
│   │   │   ├── errors.ts             # Custom error classes
│   │   │   └── logger.ts             # Winston logger
│   │   ├── app.ts                    # Express app setup
│   │   └── server.ts                 # Entry point + graceful shutdown
│   ├── prisma/schema.prisma          # Full DB schema
│   ├── Dockerfile
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/page.tsx
│   │   │   │   └── register/page.tsx
│   │   │   └── (dashboard)/
│   │   │       ├── layout.tsx         # Sidebar + auth guard
│   │   │       └── dashboard/
│   │   │           ├── page.tsx       # Overview
│   │   │           ├── chatbots/      # List + create + edit
│   │   │           ├── billing/       # Plans + usage + invoices
│   │   │           ├── api-keys/      # API key management
│   │   │           └── settings/      # Org settings
│   │   ├── components/
│   │   │   └── ui/                    # shadcn components
│   │   ├── lib/
│   │   │   ├── api.ts                 # Typed API client
│   │   │   └── utils.ts               # Helpers
│   │   └── store/
│   │       └── authStore.ts           # Zustand auth state
│   ├── Dockerfile
│   └── package.json
│
├── widget/
│   └── widget.js                      # Standalone embed script (no deps)
│
├── infra/
│   ├── nginx/nginx.conf               # Full Nginx config
│   └── docker/                        # Docker utilities
│
├── .github/
│   └── workflows/ci-cd.yml            # Full CI/CD pipeline
│
├── docker-compose.yml                 # Production compose
├── .env.example                       # All env vars documented
└── README.md
```

---

## 🗄️ Database Schema

Key entities and relationships:

```
Organization (Tenant)
  ├── id, name, slug (unique)
  ├── Stripe: customerId, subscriptionId, plan, subscriptionStatus
  ├── Usage counters: messageCount, chatbotCount, conversationCount
  ├── Users (1:N)
  ├── Chatbots (1:N)
  ├── ApiKeys (1:N)
  ├── Invoices (1:N)
  └── UsageLogs (1:N)

Chatbot
  ├── AI Config: systemPrompt, model, temperature, maxTokens, aiProvider
  ├── Widget Config (JSON): colors, position, welcome message, etc.
  ├── allowedDomains (CORS enforcement)
  ├── Lead Capture: fields config (JSON)
  ├── KnowledgeBase (1:1)
  │    └── KnowledgeDocuments (1:N)
  └── Conversations (1:N)
       └── Messages (1:N)
       └── Lead (1:1)

Subscription Flow:
  FREE → checkout → Stripe → webhook → update Organization.plan
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL (or use Docker)
- Stripe account
- OpenAI or Anthropic API key
- Upstash Redis (free tier: https://upstash.com)

### 1. Clone and setup

```bash
git clone https://github.com/yourorg/chatbot-saas.git
cd chatbot-saas

# Copy env files
cp .env.example backend/.env
cp .env.example frontend/.env.local
```

### 2. Configure environment

Edit `backend/.env` with your real values (see [Environment Variables](#environment-variables)).

### 3. Install dependencies

```bash
# Backend
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init

# Frontend
cd ../frontend
npm install
```

### 4. Development

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

### 5. Stripe Webhook (Development)

```bash
# Install Stripe CLI
stripe listen --forward-to localhost:3001/api/billing/webhook
```

---

## 🔐 Environment Variables

See `.env.example` for the complete list. Critical variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `JWT_SECRET` | 64+ char random secret | ✅ |
| `JWT_REFRESH_SECRET` | Different 64+ char secret | ✅ |
| `STRIPE_SECRET_KEY` | Stripe secret key (sk_live_...) | ✅ |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | ✅ |
| `OPENAI_API_KEY` | OpenAI key for GPT models | ⚠️ |
| `ANTHROPIC_API_KEY` | Anthropic key for Claude | ⚠️ |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL | ✅ |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token | ✅ |

---

## 🌐 Deployment Guide

### Option A: Docker Compose (Single Server)

**Requirements**: Ubuntu 22.04 LTS, 2+ vCPU, 4GB+ RAM

```bash
# 1. Server setup
sudo apt update && sudo apt install -y docker.io docker-compose-plugin certbot

# 2. Clone repo to server
ssh user@your-server
git clone https://github.com/yourorg/chatbot-saas /opt/chatbot-saas
cd /opt/chatbot-saas

# 3. Setup SSL certificates (Certbot)
sudo certbot certonly --standalone -d yourdomain.com -d api.yourdomain.com -d cdn.yourdomain.com
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem infra/certs/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem infra/certs/

# 4. Configure environment
cp .env.example backend/.env.production
# Edit with your production values

# 5. Deploy
docker compose up -d

# 6. Run migrations
docker compose run --rm api npx prisma migrate deploy

# 7. Verify
curl https://api.yourdomain.com/health
```

**Auto-renew SSL:**
```bash
echo "0 12 * * * certbot renew --quiet && docker compose restart nginx" | sudo crontab -
```

### Option B: Railway (Managed, Easy)

```bash
npm install -g @railway/cli
railway login
railway init
railway up
railway variables set DATABASE_URL=... JWT_SECRET=... # etc
```

### Option C: AWS ECS (Enterprise)

Use the Terraform config in `/infra/terraform/` (include ECS, RDS, ElastiCache, ALB).

---

## 📡 API Documentation

### Authentication

All authenticated endpoints require: `Authorization: Bearer <access_token>`

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | None | Create account |
| POST | `/api/auth/login` | None | Login |
| POST | `/api/auth/refresh` | None | Refresh token |
| POST | `/api/auth/logout` | JWT | Logout |
| GET | `/api/auth/me` | JWT | Current user |
| GET | `/api/chatbots` | JWT | List chatbots |
| POST | `/api/chatbots` | JWT | Create chatbot |
| GET | `/api/chatbots/:id` | JWT | Get chatbot |
| PUT | `/api/chatbots/:id` | JWT | Update chatbot |
| DELETE | `/api/chatbots/:id` | JWT | Delete chatbot |
| GET | `/api/chatbots/:id/embed-code` | JWT | Get embed code |
| GET | `/api/chatbots/:id/analytics` | JWT | Analytics |
| GET | `/api/chatbots/:id/conversations` | JWT | Conversations |
| GET | `/api/chatbots/:id/leads` | JWT | Leads |
| GET | `/api/chat/:chatbotId/config` | None | Widget config |
| POST | `/api/chat/:chatbotId/message` | None | Send message |
| POST | `/api/chat/:chatbotId/lead` | None | Submit lead |
| POST | `/api/chat/:chatbotId/rating` | None | Rate conversation |
| GET | `/api/billing/plans` | None | List plans |
| POST | `/api/billing/checkout` | JWT | Create checkout |
| POST | `/api/billing/portal` | JWT | Billing portal |
| GET | `/api/billing/usage` | JWT | Usage stats |
| GET | `/api/billing/invoices` | JWT | Invoice history |
| POST | `/api/billing/webhook` | Stripe | Webhook handler |
| GET | `/api/dashboard/stats` | JWT | Dashboard stats |
| GET | `/api/api-keys` | JWT | List API keys |
| POST | `/api/api-keys` | JWT | Create API key |
| DELETE | `/api/api-keys/:id` | JWT | Delete API key |

---

## 🔧 Widget Embed

### Installation

Add to any website's `<head>` or before `</body>`:

```html
<script>
  window.ChatBotConfig = {
    chatbotId: "your-chatbot-id-here",
    apiUrl: "https://api.yourdomain.com"
  };
</script>
<script src="https://cdn.yourdomain.com/widget.js" async defer></script>
```

### Features

- ✅ Zero dependencies (plain JavaScript)
- ✅ Responsive (mobile + desktop)
- ✅ Session persistence (sessionStorage)
- ✅ CORS domain enforcement
- ✅ Lead capture forms
- ✅ Conversation ratings
- ✅ Markdown formatting
- ✅ Typing indicators
- ✅ Keyboard accessible
- ✅ Configurable position, colors, branding

---

## 🔒 Security Checklist

### Authentication & Authorization
- [x] JWT with short expiry (15min) + refresh tokens
- [x] Refresh tokens stored in Redis (can be invalidated)
- [x] API keys hashed with bcrypt before storage
- [x] Role-based access control (owner/admin/member)
- [x] All queries scoped to organizationId

### API Security
- [x] Helmet.js (14 security headers)
- [x] CORS with explicit origin whitelist
- [x] Rate limiting (different tiers per endpoint)
- [x] Request size limits (10MB)
- [x] Zod input validation on all endpoints
- [x] Parameterized queries (Prisma prevents SQL injection)
- [x] Stripe webhook signature verification

### Infrastructure
- [x] TLS 1.2+ only (TLS 1.3 preferred)
- [x] HSTS with preload
- [x] Non-root Docker containers
- [x] No secrets in Docker images
- [x] Environment variable validation on startup
- [x] Nginx rate limiting at proxy level

### Data Protection
- [x] Passwords hashed (bcrypt, 12 rounds)
- [x] IPs hashed before storage
- [x] No sensitive data in logs
- [x] Stripe handles all payment data (PCI compliant)

### Monitoring
- [ ] Set up Sentry for error tracking
- [ ] Set up uptime monitoring (Better Uptime, etc.)
- [ ] Enable PostgreSQL slow query logging
- [ ] Set up log aggregation (Papertrail, Logtail)

---

## 📈 Scaling Plan

### Phase 1: Single Server (0 → 1,000 users)

Current architecture handles this. Use vertical scaling.

**Capacity**: ~1,000 active users, ~100K messages/month

### Phase 2: Horizontal Scaling (1,000 → 10,000 users)

```
- Add read replica for PostgreSQL
- Move to managed Redis (Upstash or ElastiCache)
- Add CDN (Cloudflare) for widget.js
- Scale API to 2-3 instances behind load balancer
- Use pgBouncer for connection pooling
```

### Phase 3: Cloud-Native (10,000+ users)

```
- Kubernetes (EKS/GKE) with HPA
- Aurora PostgreSQL (serverless)
- ElastiCache Redis cluster
- CloudFront CDN globally
- Separate AI processing workers (SQS + Lambda)
- pgvector for semantic search in knowledge base
- Multi-region deployment
```

### Database Scaling Strategy

```sql
-- Add indexes for hot queries
CREATE INDEX CONCURRENTLY idx_conversations_chatbot_date 
  ON conversations(chatbot_id, started_at DESC);

CREATE INDEX CONCURRENTLY idx_messages_conversation_created 
  ON messages(conversation_id, created_at);

CREATE INDEX CONCURRENTLY idx_usage_logs_org_type_date 
  ON usage_logs(organization_id, type, created_at DESC);
```

---

## 💰 Monetization Model

### Pricing Tiers

| Plan | Price | Target | Key Limits |
|------|-------|--------|------------|
| **Free** | $0/mo | Solo/Testing | 1 bot, 500 msgs |
| **Starter** | $29/mo | Freelancers | 3 bots, 5K msgs |
| **Growth** | $79/mo | SMBs | 10 bots, 25K msgs |
| **Enterprise** | $299/mo | Agencies | 100 bots, 500K msgs |

### Revenue Projections

| Users | MRR | ARR |
|-------|-----|-----|
| 100 (mix) | ~$2,500 | ~$30K |
| 500 (mix) | ~$12,000 | ~$144K |
| 2,000 (mix) | ~$48,000 | ~$576K |

### Growth Levers

1. **Annual discount** (2 months free) → improve cash flow
2. **Add-on credits** for heavy usage
3. **White-label** option for agencies
4. **Affiliate program** (30% commission, 6 months)
5. **Marketplace** of pre-built chatbot templates
6. **API credits** for developers

---

## 🗺️ Future Roadmap

### Q1 - Core Improvements
- [ ] Vector embeddings (pgvector) for semantic knowledge base search
- [ ] File upload for knowledge base (PDF, DOCX, TXT)
- [ ] URL crawler for knowledge base
- [ ] Custom AI model fine-tuning support
- [ ] Live chat handoff (chatbot → human agent)

### Q2 - Integrations
- [ ] Zapier / Make.com integration
- [ ] Slack integration
- [ ] WhatsApp Business API
- [ ] HubSpot / Salesforce CRM sync
- [ ] Intercom-compatible widget

### Q3 - Enterprise Features
- [ ] SSO / SAML / OIDC
- [ ] Audit logs
- [ ] IP allowlisting
- [ ] Custom LLM endpoints (Azure OpenAI, self-hosted)
- [ ] Role customization
- [ ] Multi-language support

### Q4 - Analytics & Intelligence
- [ ] Conversation intelligence (auto-FAQ generation)
- [ ] A/B testing for chatbot configs
- [ ] Funnel analytics
- [ ] Customer sentiment analysis
- [ ] Auto-improvement suggestions

---

## 🖥️ Admin Dashboard

The admin dashboard (`/dashboard`) includes:

- **Overview**: KPI cards (conversations, messages, leads, ratings) + 30-day chart
- **Chatbots**: Create, configure, deploy, toggle active/inactive
- **Conversations**: Browse all conversations, view messages
- **Leads**: Export captured leads as CSV
- **Analytics**: Per-chatbot analytics with day-by-day charts
- **Billing**: Plan comparison, upgrade flow, usage meters, invoice history
- **API Keys**: Create/revoke API keys for programmatic access
- **Settings**: Organization profile, team members, webhook configuration

---

## ⚙️ CI/CD

GitHub Actions workflow (`.github/workflows/ci-cd.yml`):

```
Push to 'develop' branch:
  → Run tests + type check
  → Build Docker images
  → Push to GitHub Container Registry
  → Deploy to STAGING server

Push to 'main' branch:
  → Run tests + type check
  → Build Docker images (tagged :latest)
  → Push to GitHub Container Registry
  → Run DB migrations on PRODUCTION
  → Rolling restart PRODUCTION (zero downtime)
  → Health check verification
```

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `PROD_HOST` | Production server IP |
| `PROD_USER` | SSH username |
| `PROD_SSH_KEY` | Private SSH key |
| `STAGING_HOST` | Staging server IP |
| `STAGING_USER` | SSH username |
| `STAGING_SSH_KEY` | Private SSH key |
| `NEXT_PUBLIC_API_URL` | Production API URL |

---

## 📄 License

MIT License. See LICENSE file.

---

## 🤝 Contributing

1. Fork the repo
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

**Built with ❤️ for small businesses worldwide**
