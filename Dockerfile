FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

USER node

COPY --chown=node:node . .

EXPOSE 3002

CMD ["node", "server.js"]
