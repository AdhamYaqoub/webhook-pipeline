FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache curl bash

COPY wait-for-it.sh .
RUN chmod +x wait-for-it.sh

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

CMD ["npx", "ts-node-dev", "--respawn", "--transpile-only", "src/index.ts"]