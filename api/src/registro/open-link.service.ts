import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { timingSafeEqual } from 'node:crypto';
import { hashToken, newToken, siteUrl } from '../common/util';
import { Db, InjectDb } from '../db/db.module';
import { siteContent } from '../db/schema';

const KEY = 'registro_abierto';
type Stored = { token: string; expiresAt: string };
export type OpenLinkStatus = { active: boolean; link: string | null; expiresAt: string | null };

/**
 * Link general de inscripción: uno solo para compartir en el grupo.
 * Quien lo abre escribe su nombre y correo, y se le crea su propio perfil en borrador con su link personal;
 * nada se publica sin que el panel lo apruebe.
 * A diferencia de los links personales se guarda en claro, para poder volver a copiarlo desde el panel:
 * lo único que permite es crear borradores.
 */
@Injectable()
export class OpenLinkService {
  constructor(@InjectDb() private readonly db: Db) {}

  private async stored(): Promise<Stored | null> {
    const [row] = await this.db.select({ value: siteContent.value }).from(siteContent).where(eq(siteContent.key, KEY));
    return (row?.value as Stored | undefined) ?? null;
  }

  async status(): Promise<OpenLinkStatus> {
    const s = await this.stored();
    if (!s) return { active: false, link: null, expiresAt: null };
    return { active: new Date(s.expiresAt) > new Date(), link: `${siteUrl()}/registro/abierto/${s.token}`, expiresAt: s.expiresAt };
  }

  /** Crea el link o lo reemplaza (el anterior deja de servir). */
  async create(days: number) {
    const { token } = newToken();
    const value: Stored = { token, expiresAt: new Date(Date.now() + days * 86_400_000).toISOString() };
    await this.db
      .insert(siteContent)
      .values({ key: KEY, value })
      .onConflictDoUpdate({ target: siteContent.key, set: { value, updatedAt: new Date() } });
    return this.status();
  }

  async disable() {
    await this.db.delete(siteContent).where(eq(siteContent.key, KEY));
    return this.status();
  }

  /** Revisa que el token sea el del link vigente; si no, 404 o 403 con un mensaje para la persona. */
  async assertValid(token: string) {
    const s = await this.stored();
    const same = !!s && !!token && timingSafeEqual(Buffer.from(hashToken(token)), Buffer.from(hashToken(s.token)));
    if (!s || !same) throw new NotFoundException('Este link no existe o ya fue reemplazado');
    if (new Date(s.expiresAt) < new Date()) throw new ForbiddenException('Este link venció. Pide uno nuevo a quien administra la página.');
    return { expiresAt: s.expiresAt };
  }
}
