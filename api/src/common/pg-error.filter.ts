import { ArgumentsHost, BadRequestException, Catch, ConflictException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';

/**
 * Convierte en mensajes claros los errores de Postgres que causan los datos enviados
 * (no el servidor). Sin esto, el panel solo ve un 500 y «El servidor no respondió».
 *   23503: se eligió algo que ya no existe (p. ej. una tecnología borrada con el formulario abierto)
 *   23505: valor repetido en una columna única
 */
const FOREIGN_KEY = '23503';
const UNIQUE = '23505';

const UNIQUE_MESSAGES: Record<string, string> = {
  technologies_name_unique: 'Ya existe una tecnología con ese nombre',
  technologies_slug_unique: 'Ya existe una tecnología con ese nombre',
  admin_users_email_unique: 'Ese correo ya tiene cuenta',
  members_slug_unique: 'Esa dirección ya la usa otro perfil',
  projects_slug_unique: 'Esa dirección ya la usa otro proyecto',
};

type PgError = { code: string; constraint?: string };

/** Drizzle envuelve el error de pg en `cause`. */
function findPgError(err: unknown): PgError | undefined {
  let e = err as { code?: unknown; cause?: unknown } | undefined;
  for (let depth = 0; e && depth < 4; depth++) {
    if (e.code === FOREIGN_KEY || e.code === UNIQUE) return e as PgError;
    e = e.cause as typeof e;
  }
  return undefined;
}

@Catch()
export class PgErrorFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const pg = findPgError(exception);
    if (pg?.code === FOREIGN_KEY) {
      return super.catch(new BadRequestException('Algo de lo que elegiste ya no existe (quizá lo borraron). Recarga la página e intenta de nuevo.'), host);
    }
    if (pg?.code === UNIQUE) {
      return super.catch(new ConflictException(UNIQUE_MESSAGES[pg.constraint ?? ''] ?? 'Ese dato ya existe'), host);
    }
    return super.catch(exception, host);
  }
}
