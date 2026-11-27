FROM node:22-alpine

WORKDIR /app

# La configuración (config/) se selecciona con NODE_ENV; Render puede sobrescribirla
ENV NODE_ENV=production

COPY package*.json ./

RUN npm ci --omit=dev

COPY . .

RUN chmod +x docker-entrypoint.sh

EXPOSE 3000

# docker-entrypoint.sh copia el secret file (postgres.uri, mongo.uri, jwt.secret)
# de /etc/secrets/ a config/ antes de arrancar; sin él, el contenedor no arranca.
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "start"]
