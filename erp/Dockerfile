# Production image for Railway, Fly.io, or any Docker host.
FROM node:22-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Next.js standalone expects a public directory when copying the runner image.
RUN mkdir -p public
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/core/db/migrations ./core/db/migrations
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/node_modules/postgres ./node_modules/postgres
COPY --from=builder /app/package.json ./package.json

USER nextjs
EXPOSE 3001

CMD ["node", "scripts/start.mjs"]
