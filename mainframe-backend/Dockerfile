FROM node:20-alpine AS builder

WORKDIR /app

# Build context is the repo root — all paths prefixed with mainframe-backend/
COPY mainframe-backend/package*.json ./
COPY mainframe-backend/prisma ./prisma/

RUN npm ci

COPY mainframe-backend/tsconfig.json ./
COPY mainframe-backend/src ./src/

RUN npx prisma generate
RUN npm run build

# ---

FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY mainframe-backend/package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY mainframe-backend/prisma ./prisma/
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', r => process.exit(r.statusCode === 200 ? 0 : 1))" || exit 1

CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node dist/index.js"]
