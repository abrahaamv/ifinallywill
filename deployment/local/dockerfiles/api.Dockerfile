# =============================================================================
# API Server Dockerfile
# Multi-stage build for optimized production image
# =============================================================================

# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/api/package.json ./packages/api/
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/
COPY packages/auth/package.json ./packages/auth/
COPY packages/api-contract/package.json ./packages/api-contract/
COPY packages/ai-core/package.json ./packages/ai-core/
COPY packages/knowledge/package.json ./packages/knowledge/

# Install dependencies
RUN pnpm install --frozen-lockfile --prod=false

# Stage 2: Builder
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/*/node_modules ./packages/

# Copy source code
COPY . .

# Build all packages
RUN pnpm build --filter=@platform/api...

# Stage 3: Production
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat wget
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 platform
USER platform

# Copy built application
COPY --from=builder --chown=platform:nodejs /app/packages/api/dist ./packages/api/dist
COPY --from=builder --chown=platform:nodejs /app/packages/db/dist ./packages/db/dist
COPY --from=builder --chown=platform:nodejs /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=platform:nodejs /app/packages/auth/dist ./packages/auth/dist
COPY --from=builder --chown=platform:nodejs /app/packages/api-contract/dist ./packages/api-contract/dist
COPY --from=builder --chown=platform:nodejs /app/packages/ai-core/dist ./packages/ai-core/dist
COPY --from=builder --chown=platform:nodejs /app/packages/knowledge/dist ./packages/knowledge/dist
COPY --from=builder --chown=platform:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=platform:nodejs /app/packages/api/package.json ./packages/api/

EXPOSE 3001

CMD ["node", "packages/api/dist/index.js"]
