# ─── BUILD STAGE ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --only=production=false

# Generate Prisma client
RUN npx prisma generate

# Build
COPY . .
RUN npm run build

# ─── PRODUCTION STAGE ─────────────────────────────────────────────────────────
FROM node:20-alpine AS production

# Security: create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --only=production && \
    npx prisma generate && \
    npm cache clean --force

# Copy built files
COPY --from=builder /app/dist ./dist

# Copy migration files
COPY --from=builder /app/prisma ./prisma

# Create logs directory
RUN mkdir -p logs && chown appuser:appgroup logs

# Use non-root user
USER appuser

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

CMD ["node", "dist/server.js"]
