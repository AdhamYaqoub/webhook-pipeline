# Dockerfile
FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache curl bash

# نسخ wait-for-it.sh
COPY wait-for-it.sh .
RUN chmod +x wait-for-it.sh

# نسخ package.json و package-lock.json
COPY package*.json ./
RUN npm install

# نسخ كل الملفات
COPY . .

# بناء المشروع TypeScript
RUN npm run build

# CMD سيتم تجاوزه في docker-compose command
CMD ["npx", "ts-node-dev", "--respawn", "--transpile-only", "src/index.ts"]