# Backend Dockerfile — multi-stage build for a small production image.

# ---- Stage 1: install only production deps ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# ---- Stage 2: copy app source on top of node_modules ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Run as a non-root user (best-practice security)
RUN addgroup -S nodejs -g 1001 && adduser -S app -u 1001 -G nodejs

COPY --from=deps --chown=app:nodejs /app/node_modules ./node_modules
COPY --chown=app:nodejs . .

# Create the local uploads directory in case STORAGE_DRIVER=local
RUN mkdir -p uploads && chown app:nodejs uploads

USER app
EXPOSE 5000

# Healthcheck so the orchestrator knows when the container is ready
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:5000/healthz || exit 1

CMD ["node", "server.js"]
