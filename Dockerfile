FROM node:22-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev

COPY . .
RUN mkdir -p /app/data /app/private-uploads && chown -R node:node /app

USER node
ENV NODE_ENV=production
EXPOSE 10000
CMD ["node", "server.js"]
