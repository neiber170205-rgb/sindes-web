#!/usr/bin/env sh
# Copia de seguridad de SINDES: base de datos + fotos subidas.
# Uso:   ./scripts/backup.sh            (desde la carpeta del proyecto)
# Cron:  0 3 * * * cd /opt/sindes-web && ./scripts/backup.sh >> backups/backup.log 2>&1
set -eu
cd "$(dirname "$0")/.."
DIR=backups
KEEP_DAYS=${KEEP_DAYS:-14}
STAMP=$(date +%Y%m%d-%H%M)
mkdir -p "$DIR"

docker compose exec -T db pg_dump -U sindes -d sindes --format=custom > "$DIR/db-$STAMP.dump"
docker compose run --rm --no-deps --user root -v "$(pwd)/$DIR:/backup" --entrypoint sh api \
  -c "tar -czf /backup/uploads-$STAMP.tar.gz -C /data uploads"

find "$DIR" -name 'db-*.dump' -mtime +"$KEEP_DAYS" -delete
find "$DIR" -name 'uploads-*.tar.gz' -mtime +"$KEEP_DAYS" -delete
echo "$(date) copia lista: db-$STAMP.dump y uploads-$STAMP.tar.gz"
