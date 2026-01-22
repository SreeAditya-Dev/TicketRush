FROM node:20-alpine

WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm install --verbose

COPY prisma ./prisma
COPY src ./src

RUN ls -la node_modules/.bin || echo "node_modules/.bin not found"
RUN ./node_modules/.bin/prisma generate
RUN ./node_modules/.bin/tsc -p tsconfig.json

EXPOSE 4000
CMD ["node", "dist/index.js"]
