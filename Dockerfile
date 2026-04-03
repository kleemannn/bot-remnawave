FROM node:20-alpine AS base
RUN apk add --no-cache wget
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json ./
RUN pnpm install --frozen-lockfile=false

FROM deps AS build
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY prisma ./prisma
COPY src ./src
RUN pnpm exec prisma generate --schema=./prisma/schema.prisma && pnpm build

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY --from=build /app/prisma ./prisma
RUN pnpm exec prisma generate --schema=./prisma/schema.prisma

COPY --from=build /app/dist ./dist

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD wget -qO- http://127.0.0.1:3000/health/ready || exit 1
CMD ["sh", "-c", "pnpm run prisma:deploy && exec node dist/main.js"]
