#!/bin/sh
set -e

# Render monta config/local-production.json como Secret File en /etc/secrets/.
# Ese archivo trae los secretos (postgres.uri, mongo.uri, jwt.secret) y nunca
# entra en la imagen (ver .dockerignore): se copia aquí recién al arrancar.
SECRET_FILE="/etc/secrets/local-production.json"
CONFIG_FILE="/app/config/local-production.json"

if [ -f "$SECRET_FILE" ]; then
  cp "$SECRET_FILE" "$CONFIG_FILE"
else
  echo "ERROR: no se encontro $SECRET_FILE" >&2
  echo "Sube config/local-production.json como Secret File en Render (ver README, seccion Despliegue)." >&2
  exit 1
fi

exec "$@"
