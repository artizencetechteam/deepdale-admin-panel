# syntax=docker/dockerfile:1

FROM node:24-alpine AS build
WORKDIR /app

RUN apk add --no-cache openssl
RUN corepack enable
RUN corepack prepare pnpm@9.15.4 --activate

COPY package.json pnpm-lock.yaml prisma.config.ts ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY . .
ARG DATABASE_URL=postgresql://build:build@localhost:5432/build
ENV DATABASE_URL=$DATABASE_URL
RUN pnpm build
RUN mkdir -p dist/admin uploads

FROM node:24-alpine AS runtime
WORKDIR /app

RUN apk add --no-cache openssl
RUN corepack enable
RUN corepack prepare pnpm@9.15.4 --activate

ENV NODE_ENV=production

COPY --from=build /app/package.json /app/pnpm-lock.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist/admin ./dist/admin
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/src ./src
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY --from=build /app/tsconfig.build.json ./tsconfig.build.json
COPY --from=build /app/uploads ./uploads

EXPOSE 4000

CMD ["pnpm", "start"]
