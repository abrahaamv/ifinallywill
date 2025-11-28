# =============================================================================
# Realtime Server Dockerfile
# WebSocket server with Redis Streams
# =============================================================================

# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/realtime/package.json ./packages/realtime/
COPY packages/shared/package.json ./packages/shared/

RUN pnpm install --frozen-lockfile --prod=false

# Stage 2: Builder
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm build --filter=@platform/realtime...

# Stage 3: Production
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat wget
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 platform
USER platform

COPY --from=builder --chown=platform:nodejs /app/packages/realtime/dist ./packages/realtime/dist
COPY --from=builder --chown=platform:nodejs /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=platform:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=platform:nodejs /app/packages/realtime/package.json ./packages/realtime/

EXPOSE 3002

CMD ["node", "packages/realtime/dist/index.js"]
