FROM node:22-slim AS base

RUN apt-get update -qq && apt-get install --no-install-recommends -y ca-certificates curl && rm -rf /var/lib/apt/lists/*

FROM base AS build
WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM base AS production
RUN adduser --disabled-password --gecos "" appuser
WORKDIR /app
COPY --from=build --chown=appuser:appuser /app /app
USER appuser
CMD ["npm", "start"]
