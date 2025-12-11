# VisualKit Landing Page - Railway Deployment
# Static Vite/React app served by Nginx

# Build stage
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Copy workspace config files
COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml ./
COPY turbo.json ./
COPY tsconfig.json ./

# Copy all packages (workspace dependencies) - app first to bust cache on app changes
COPY apps/landing ./apps/landing
COPY packages ./packages

# Install dependencies
RUN pnpm install

# Build the landing app (turbo handles package build order)
ENV NODE_ENV=production
RUN pnpm turbo run build --filter=@platform/landing

# Production stage - serve with nginx
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/apps/landing/dist /usr/share/nginx/html

# Copy nginx config for SPA routing
RUN echo 'server { \
    listen 8080; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
    gzip on; \
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript; \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
