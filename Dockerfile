# ==========================================
# Stage 1: Builder
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build with production environment variables baked in
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_TENANT_ID=buymejewellery
ARG VITE_APP_TITLE="MPS Jewelry System"
ARG VITE_APP_VERSION=1.0.0

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_TENANT_ID=$VITE_TENANT_ID
ENV VITE_APP_TITLE=$VITE_APP_TITLE
ENV VITE_APP_VERSION=$VITE_APP_VERSION

RUN npm run build

# ==========================================
# Stage 2: Production (nginx)
# ==========================================
FROM nginx:1.27-alpine AS production

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built app
COPY --from=builder /app/dist /usr/share/nginx/html

# Fix permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/health.html || exit 1

CMD ["nginx", "-g", "daemon off;"]
