# ==========================================
# Stage 1: Builder
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install system dependencies for native addons
RUN apk add --no-cache python3 make g++

# Copy package files and install all dependencies (including devDeps needed to build)
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --include=dev

# Generate Prisma client
RUN npx prisma generate

# Copy source and build
COPY . .
RUN npm run build

# ==========================================
# Stage 2: Production
# ==========================================
FROM node:20-alpine AS production

WORKDIR /app
ENV NODE_ENV=production

# Install system deps needed at runtime
RUN apk add --no-cache dumb-init

# Copy built artifacts and production dependencies
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --from=builder --chown=node:node /app/package*.json ./

# Create uploads directory owned by node user
RUN mkdir -p /app/uploads && chown node:node /app/uploads

USER node

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/health', r => process.exit(r.statusCode === 200 ? 0 : 1))" || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main"]
