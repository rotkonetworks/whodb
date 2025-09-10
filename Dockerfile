FROM oven/bun:canary-alpine AS base
WORKDIR /app

FROM base AS dependencies
COPY package.json bun.lockb ./
COPY .papi .papi
# COPY .env .env

# Install dependencies
RUN bun install
RUN bunx polkadot-api@latest update

FROM dependencies AS builder
COPY . .
RUN bun vite build --mode production

FROM base AS production
COPY --from=builder /app/dist /app/dist
RUN bun add serve
CMD ["bunx", "serve", "--single", "dist"]

FROM dependencies AS development
COPY . .
CMD ["bun", "run", "dev"]
