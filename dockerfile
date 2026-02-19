FROM node:18-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production=false

COPY . .

COPY prisma ./prisma

RUN npm run prisma:generate

RUN npm run build

FROM node:18-alpine AS production

WORKDIR /app

COPY --from=build /app/dist ./dist

COPY --from=build /app/node_modules ./node_modules

COPY --from=build /app/package*.json ./

COPY --from=build /app/prisma ./prisma

RUN test -f dist/main.js || (echo "dist/main.js not found" && exit 1)

CMD ["node", "dist/main.js"]
