#!/usr/bin/env bash
# =============================================================================
# ChatBot Builder SaaS - Setup & Deployment Script
# Run: chmod +x scripts/setup.sh && ./scripts/setup.sh
# =============================================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log()   { echo -e "${GREEN}✓${NC} $1"; }
warn()  { echo -e "${YELLOW}⚠${NC}  $1"; }
error() { echo -e "${RED}✗${NC} $1"; exit 1; }
info()  { echo -e "${BLUE}→${NC} $1"; }

echo ""
echo "🤖 ChatBot Builder SaaS — Setup Script"
echo "======================================="
echo ""

# ─── Check dependencies ───────────────────────────────────────────────────────
info "Checking prerequisites..."
command -v node >/dev/null 2>&1 || error "Node.js is required (https://nodejs.org)"
command -v npm  >/dev/null 2>&1 || error "npm is required"
command -v docker >/dev/null 2>&1 && HAS_DOCKER=true || HAS_DOCKER=false

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  error "Node.js 20+ required (current: $(node -v))"
fi
log "Node.js $(node -v)"

# ─── Environment setup ────────────────────────────────────────────────────────
info "Setting up environment files..."

if [ ! -f "backend/.env" ]; then
  cp .env.example backend/.env
  warn "Created backend/.env — please edit with your real values before starting"
else
  log "backend/.env already exists"
fi

if [ ! -f "frontend/.env.local" ]; then
  echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > frontend/.env.local
  echo "NEXT_PUBLIC_APP_NAME=ChatBot Builder" >> frontend/.env.local
  log "Created frontend/.env.local"
else
  log "frontend/.env.local already exists"
fi

# ─── Install dependencies ─────────────────────────────────────────────────────
info "Installing backend dependencies..."
cd backend && npm install --silent && cd ..
log "Backend dependencies installed"

info "Installing frontend dependencies..."
cd frontend && npm install --silent && cd ..
log "Frontend dependencies installed"

# ─── Prisma setup ─────────────────────────────────────────────────────────────
info "Generating Prisma client..."
cd backend && npx prisma generate --silent && cd ..
log "Prisma client generated"

# ─── Database ─────────────────────────────────────────────────────────────────
echo ""
echo "─── Database Setup ──────────────────────────"
info "To run migrations:"
echo "   cd backend && npx prisma migrate deploy"
echo ""
info "To seed demo data:"
echo "   cd backend && npx ts-node src/utils/seed.ts"
echo ""

if [ "$HAS_DOCKER" = true ]; then
  info "To start PostgreSQL + Redis locally:"
  echo "   docker compose up postgres -d"
  echo ""
fi

# ─── Stripe CLI ───────────────────────────────────────────────────────────────
echo "─── Stripe Webhook (Development) ───────────"
info "Install the Stripe CLI and run:"
echo "   stripe listen --forward-to localhost:3001/api/billing/webhook"
echo ""

# ─── Start ────────────────────────────────────────────────────────────────────
echo "─── Start Development ───────────────────────"
info "Terminal 1 (Backend):"
echo "   cd backend && npm run dev"
echo ""
info "Terminal 2 (Frontend):"
echo "   cd frontend && npm run dev"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "Setup complete!"
echo ""
echo "  App:     http://localhost:3000"
echo "  API:     http://localhost:3001"
echo "  Health:  http://localhost:3001/health"
echo ""
echo "  Next steps:"
echo "  1. Edit backend/.env with your API keys"
echo "  2. Run: cd backend && npx prisma migrate deploy"
echo "  3. Start the dev servers (see above)"
echo ""
