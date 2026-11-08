FROM node:22-alpine

WORKDIR /app

# La configuración (config/) se selecciona con NODE_ENV; Render puede sobrescribirla
ENV NODE_ENV=production

COPY package*.json ./

RUN npm ci --omit=dev

COPY . .

EXPOSE 3000

CMD ["npm", "start"]


