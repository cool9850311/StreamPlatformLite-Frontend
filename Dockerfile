FROM node:20-alpine

ARG ENABLE_STRICT_CSP=true

WORKDIR /app
COPY . .
WORKDIR /app/stream_platform_nuxt

RUN npm install
RUN ENABLE_STRICT_CSP=$ENABLE_STRICT_CSP npm run build

# node:20-alpine ships with a pre-existing 'node' user at UID 1000
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000 || exit 1

CMD ["node", ".output/server/index.mjs"]
