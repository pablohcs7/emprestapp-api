FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev
RUN npm cache clean --force

COPY --from=builder --chown=node:node /app/dist ./dist
RUN chown -R node:node /app

USER node

EXPOSE 3000

CMD ["node", "dist/main.js"]
