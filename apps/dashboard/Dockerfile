# Multi-stage build for @platform/dashboard
# Stage 1: Build static assets

FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9.15.4

# Copy workspace configuration
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY turbo.json ./
COPY tsconfig.json ./

# Copy all package.json files for workspace resolution
COPY apps/dashboard/package.json ./apps/dashboard/
COPY packages/api-contract/package.json ./packages/api-contract/
COPY packages/auth/package.json ./packages/auth/
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/

# Install all dependencies (including dev dependencies for building)
RUN pnpm install --frozen-lockfile

# Copy source code for all required packages
COPY apps/dashboard ./apps/dashboard
COPY packages/api-contract ./packages/api-contract
COPY packages/auth ./packages/auth
COPY packages/db ./packages/db
COPY packages/shared ./packages/shared
COPY packages/ui ./packages/ui

# Build all dependencies and the dashboard
RUN pnpm --filter @platform/shared build
RUN pnpm --filter @platform/db build
RUN pnpm --filter @platform/auth build
RUN pnpm --filter @platform/api-contract build
RUN pnpm --filter @platform/ui build
RUN pnpm --filter @platform/dashboard build

# Stage 2: Production runtime with nginx
FROM nginx:1.27-alpine

# Copy custom nginx configuration
COPY apps/dashboard/nginx.conf /etc/nginx/nginx.conf

# Copy built static files from builder
COPY --from=builder /app/apps/dashboard/dist /usr/share/nginx/html

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
