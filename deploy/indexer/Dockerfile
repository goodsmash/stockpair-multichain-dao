FROM node:22.16.0-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY services/indexer/package.json ./services/indexer/package.json
COPY packages/launch-intelligence-sdk/package.json ./packages/launch-intelligence-sdk/package.json
COPY packages/robinhood-chain-kit/package.json ./packages/robinhood-chain-kit/package.json
RUN npm ci --omit=dev --workspace @stockpair/indexer --ignore-scripts --no-audit --no-fund && npm cache clean --force
COPY artifacts/solc ./artifacts/solc
COPY config ./config
COPY integrations ./integrations
COPY services/indexer/src ./services/indexer/src
USER node
EXPOSE 8787
CMD ["node", "services/indexer/src/server.mjs"]
