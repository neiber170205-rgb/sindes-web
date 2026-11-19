#!/usr/bin/env sh
# Restaura una copia: ./scripts/restore.sh backups/db-AAAAMMDD-HHMM.dump [backups/uploads-AAAAMMDD-HHMM.tar.gz]
set -eu
cd "$(dirname "$0")/.."
DB=${1:?Indica el archivo .dump}
UP=${2:-}
[ -f "$DB" ] || { echo "No existe $DB"; exit 1; }
[ -z "$UP" ] || [ -f "$UP" ] || { echo "No existe $UP"; exit 1; }
printf 'Esto reemplaza la base de datos actual. Escribe SI para seguir: '
read -r ok
[ "$ok" = "SI" ] || { echo 'Cancelado'; exit 1; }

# La API se detiene mientras tanto (nadie escribe a mitad de la restauración) y vuelve a arrancar pase lo que pase.
docker compose stop api
trap 'docker compose start api >/dev/null' EXIT

# Una sola transacción: si algo falla, la base queda como estaba.
docker compose exec -T db pg_restore -U sindes -d sindes --clean --if-exists --single-transaction < "$DB"

if [ -n "$UP" ]; then
  # Primero se descomprime aparte; solo si salió bien se reemplazan las fotos actuales.
  docker compose run --rm --no-deps --user root -v "$(pwd)/$(dirname "$UP"):/backup" --entrypoint sh api \
    -c "mkdir -p /tmp/r && tar -xzf /backup/$(basename "$UP") -C /tmp/r && rm -rf /data/uploads/* && cp -a /tmp/r/uploads/. /data/uploads/"
fi
echo 'Restauración lista'
