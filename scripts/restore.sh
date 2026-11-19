#!/usr/bin/env sh
# Restaura una copia: ./scripts/restore.sh backups/db-AAAAMMDD-HHMM.dump [backups/uploads-AAAAMMDD-HHMM.tar.gz]
set -eu
cd "$(dirname "$0")/.."
DB=${1:?Indica el archivo .dump}
UP=${2:-}
printf 'Esto reemplaza la base de datos actual. Escribe SI para seguir: '
read -r ok
[ "$ok" = "SI" ] || { echo 'Cancelado'; exit 1; }
docker compose exec -T db pg_restore -U sindes -d sindes --clean --if-exists < "$DB"
if [ -n "$UP" ]; then
  docker compose run --rm --no-deps --user root -v "$(pwd)/$(dirname "$UP"):/backup" --entrypoint sh api \
    -c "rm -rf /data/uploads/* && tar -xzf /backup/$(basename "$UP") -C /data"
fi
docker compose restart api
echo 'Restauración lista'
