# =============================================================================
# Meeting App Dockerfile
# Static Vite build served by nginx
# =============================================================================

# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/meeting/package.json ./apps/meeting/
COPY packages/ui/package.json ./packages/ui/
COPY packages/shared/package.json ./packages/shared/
COPY packages/api-contract/package.json ./packages/api-contract/

RUN pnpm install --frozen-lockfile --prod=false

# Stage 2: Builder
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Build arguments
ARG VITE_API_URL
ARG VITE_LIVEKIT_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_LIVEKIT_URL=$VITE_LIVEKIT_URL

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm build --filter=@platform/meeting...

# Stage 3: Production
FROM nginx:alpine AS runner

COPY deployment/local/config/nginx/static.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/meeting/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
