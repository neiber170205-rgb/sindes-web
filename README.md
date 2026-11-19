# SINDES · página del semillero

Sitio del semillero de investigación SINDES (Ingeniería de Software, FESC) con panel de administración.

- **Sitio público**: inicio, proyectos y perfil de cada integrante.
- **Panel** (`/admin`): integrantes, proyectos, capturas, textos, fotos, tecnologías y cuentas.
- **Links personales** (`/registro/…`): cada integrante llena su perfil y sube su foto; se publica cuando el panel lo aprueba.

## Cómo está hecho

| Parte | Tecnología |
| --- | --- |
| Sitio y panel | React 19, Vite, Tailwind CSS 4, shadcn/ui |
| API | NestJS 11, Drizzle ORM, zod |
| Base de datos | PostgreSQL 16 |
| Fotos | Se guardan en el servidor (WebP, recortadas con sharp) |
| Servidor web | Caddy (HTTPS automático) |
| Todo junto | Docker Compose en un VPS de Vultr |

```
sindes-web/
├─ api/            API (NestJS) · migraciones en api/drizzle · fotos iniciales en api/seed-assets
├─ web/            Sitio + panel (React) · Caddyfile
├─ scripts/        backup.sh y restore.sh
├─ docker-compose.yml
└─ .env.example
```

## Montarlo en Vultr

1. **Crear el servidor**
   - Vultr → Deploy → Cloud Compute → Ubuntu 24.04.
   - 1 vCPU / 2 GB alcanza de sobra (1 GB también funciona).
   - Agrega tu llave SSH.
2. **Apuntar el dominio**
   - Registro `A` del dominio (y de `www`) → IP del servidor.
3. **Preparar el servidor** (por SSH)
   ```bash
   curl -fsSL https://get.docker.com | sh
   ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw --force enable
   git clone https://github.com/neiber170205-rgb/sindes-web.git /opt/sindes-web
   cd /opt/sindes-web
   cp .env.example .env
   ```
4. **Llenar `.env`**
   - `DOMAIN`, `ACME_EMAIL`.
   - `POSTGRES_PASSWORD` y `JWT_SECRET`: genera cada una con `openssl rand -hex 32`.
   - `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD` (mínimo 10 caracteres).
5. **Encender**
   ```bash
   docker compose up -d --build
   docker compose exec api node dist/db/seed.js   # contenido inicial + cuenta del panel (solo la primera vez)
   ```
6. **Entrar** a `https://tu-dominio/admin` con el correo y la clave del `.env`.
   - Cambia la clave en *Mi cuenta*.
   - Borra `ADMIN_PASSWORD` del `.env` (ya no hace falta).

## Primer uso del panel

- **Invitar a todo el grupo**: en *Invitar → Link general* crea un solo link y compártelo en el grupo. Cada persona escribe su nombre y su correo @fesc.edu.co y sigue en su propio link personal. Puedes cambiarlo o desactivarlo cuando quieras.
- **Invitar a alguien en particular**: pega los nombres (uno por línea) → copia cada link o el mensaje para WhatsApp.
- **Revisar**: en *Integrantes → Por revisar* abre cada perfil, corrige si hace falta y dale *Publicar*.
- **Link perdido o vencido**: en el perfil, *Link nuevo* (el anterior deja de servir).
- **Docente directora**: en su perfil, activa *Destacar arriba*.
- **Cuenta para la profe**: *Mi cuenta → Nueva cuenta*.

## Copias de seguridad

- Manual: `./scripts/backup.sh` → deja `backups/db-….dump` y `backups/uploads-….tar.gz`.
- Diaria a las 3 a. m. (`crontab -e`):
  ```
  0 3 * * * cd /opt/sindes-web && ./scripts/backup.sh >> backups/backup.log 2>&1
  ```
- Guarda copias fuera del servidor de vez en cuando (Drive, otro equipo).
- Restaurar: `./scripts/restore.sh backups/db-AAAAMMDD-HHMM.dump backups/uploads-AAAAMMDD-HHMM.tar.gz`

## Actualizar

```bash
cd /opt/sindes-web && git pull && docker compose up -d --build
```

- Las migraciones de la base se aplican solas al arrancar la API.
- Automático desde GitHub (opcional): crea la variable `DEPLOY=si` y los secretos `VULTR_HOST`, `VULTR_USER`, `VULTR_SSH_KEY` en el repo. Cada push a `main` que pase la revisión se publica.

## Comandos útiles

```bash
docker compose logs -f api                                         # ver errores de la API
docker compose exec api node dist/db/admin-cli.js lista            # cuentas del panel
docker compose exec api node dist/db/admin-cli.js clave correo@fesc.edu.co   # nueva clave si se olvidó
docker compose exec api node dist/db/admin-cli.js crear correo@fesc.edu.co "Nombre" editor
```

## Desarrollo local

Requiere Node 22 y PostgreSQL 16.

```bash
# API
cd api && cp .env.example .env     # ajusta DATABASE_URL y claves
npm install && npm run build
npm run db:migrate && npm run db:seed
npm run dev                         # http://localhost:3000/api

# Sitio (otra terminal)
cd web && npm install && npm run dev   # http://localhost:5173 (redirige /api y /uploads a la API)
```

- Cambiaste `api/src/db/schema.ts` → `npm run db:generate` crea la migración nueva en `api/drizzle/`.

## Datos personales

- El formulario pide autorización expresa (Ley 1581 de 2012) antes de enviar.
- Solo se muestra el correo institucional; nunca teléfonos ni correos personales.
- Los links personales no se guardan en claro (solo su huella o hash) y vencen; al publicar un perfil nuevo, su link se desactiva.
- Ocultar un perfil lo saca de la página sin borrar nada; *Eliminar* borra perfil y foto.
