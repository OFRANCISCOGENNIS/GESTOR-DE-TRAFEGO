FROM node:20-alpine
WORKDIR /app
COPY apps/api/package.json ./apps/api/
WORKDIR /app/apps/api
RUN npm install --no-audit --no-fund
COPY apps/api ./
RUN npx prisma generate && npx nest build
EXPOSE 3333
CMD ["node", "dist/main.js"]
