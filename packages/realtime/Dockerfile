# Multi-stage build for @platform/realtime
# Stage 1: Build dependencies and compile TypeScript

FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9.15.4

# Copy workspace configuration
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY turbo.json ./
COPY tsconfig.json ./

# Copy all package.json files for workspace resolution
COPY packages/realtime/package.json ./packages/realtime/
COPY packages/auth/package.json ./packages/auth/
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/

# Install all dependencies (including dev dependencies for building)
RUN pnpm install --frozen-lockfile

# Copy source code for all required packages
COPY packages/realtime ./packages/realtime
COPY packages/auth ./packages/auth
COPY packages/db ./packages/db
COPY packages/shared ./packages/shared

# Build all dependencies and the realtime package
RUN pnpm --filter @platform/shared build
RUN pnpm --filter @platform/db build
RUN pnpm --filter @platform/auth build
RUN pnpm --filter @platform/realtime build

# Stage 2: Production runtime
FROM node:22-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9.15.4

# Copy workspace configuration
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY turbo.json ./

# Copy package.json files
COPY packages/realtime/package.json ./packages/realtime/
COPY packages/auth/package.json ./packages/auth/
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built files from builder
COPY --from=builder --chown=nodejs:nodejs /app/packages/realtime/dist ./packages/realtime/dist
COPY --from=builder --chown=nodejs:nodejs /app/packages/auth/dist ./packages/auth/dist
COPY --from=builder --chown=nodejs:nodejs /app/packages/db/dist ./packages/db/dist
COPY --from=builder --chown=nodejs:nodejs /app/packages/shared/dist ./packages/shared/dist

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3002

# Switch to non-root user
USER nodejs

# Expose WebSocket port
EXPOSE 3002

# Health check (WebSocket server)
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "const ws = require('ws'); const client = new ws('ws://localhost:3002'); client.on('open', () => { client.close(); process.exit(0); }); client.on('error', () => process.exit(1)); setTimeout(() => process.exit(1), 2000);"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the WebSocket server
CMD ["node", "packages/realtime/dist/index.js"]
