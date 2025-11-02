# Multi-stage build for @platform/api
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
COPY packages/api/package.json ./packages/api/
COPY packages/api-contract/package.json ./packages/api-contract/
COPY packages/auth/package.json ./packages/auth/
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/
COPY packages/knowledge/package.json ./packages/knowledge/
COPY packages/realtime/package.json ./packages/realtime/

# Install all dependencies (including dev dependencies for building)
RUN pnpm install --frozen-lockfile

# Copy source code for all required packages
COPY packages/api ./packages/api
COPY packages/api-contract ./packages/api-contract
COPY packages/auth ./packages/auth
COPY packages/db ./packages/db
COPY packages/shared ./packages/shared
COPY packages/knowledge ./packages/knowledge
COPY packages/realtime ./packages/realtime

# Build all dependencies and the API package
RUN pnpm --filter @platform/shared build
RUN pnpm --filter @platform/db build
RUN pnpm --filter @platform/auth build
RUN pnpm --filter @platform/api-contract build
RUN pnpm --filter @platform/knowledge build
RUN pnpm --filter @platform/realtime build
RUN pnpm --filter @platform/api build

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
COPY packages/api/package.json ./packages/api/
COPY packages/api-contract/package.json ./packages/api-contract/
COPY packages/auth/package.json ./packages/auth/
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/
COPY packages/knowledge/package.json ./packages/knowledge/
COPY packages/realtime/package.json ./packages/realtime/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built files from builder
COPY --from=builder --chown=nodejs:nodejs /app/packages/api/dist ./packages/api/dist
COPY --from=builder --chown=nodejs:nodejs /app/packages/api-contract/dist ./packages/api-contract/dist
COPY --from=builder --chown=nodejs:nodejs /app/packages/auth/dist ./packages/auth/dist
COPY --from=builder --chown=nodejs:nodejs /app/packages/db/dist ./packages/db/dist
COPY --from=builder --chown=nodejs:nodejs /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=nodejs:nodejs /app/packages/knowledge/dist ./packages/knowledge/dist
COPY --from=builder --chown=nodejs:nodejs /app/packages/realtime/dist ./packages/realtime/dist

# Copy database migrations
COPY --from=builder --chown=nodejs:nodejs /app/packages/db/migrations ./packages/db/migrations

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Switch to non-root user
USER nodejs

# Expose API port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the API server
CMD ["node", "packages/api/dist/server.js"]
