FROM node:20-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build
COPY tinyagi-src/ .
RUN npm install
RUN npm run build
RUN npm prune --omit=dev

FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    git chromium \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app
COPY --from=builder /build .

RUN mkdir -p /root/.tinyagi /root/workspace

EXPOSE 3777
CMD ["sh", "docker-entrypoint.sh"]
