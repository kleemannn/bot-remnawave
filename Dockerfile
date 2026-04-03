FROM node:20-alpine AS base
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

COPY package.json ./
COPY --from=build /app/prisma ./prisma
RUN pnpm install --frozen-lockfile=false
RUN pnpm exec prisma generate --schema=./prisma/schema.prisma

COPY --from=build /app/dist ./dist

EXPOSE 3000
CMD ["sh", "-c", "pnpm run prisma:deploy && node dist/main.js"]
