import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { and, count, eq, ne, sql } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';
import { hashToken, newToken, siteUrl } from '../common/util';
import { Db, InjectDb } from '../db/db.module';
import { adminUsers } from '../db/schema';
import { SessionToken, SessionUser } from './auth.guard';

type AdminRow = typeof adminUsers.$inferSelect;
type Role = 'admin' | 'editor';

/** Días que vale un link de acceso al panel. */
export const ACCESS_DAYS = 7;

@Injectable()
export class AuthService {
  /** Hash real (mismo costo que los de verdad) para comparar cuando el correo no existe. */
  private readonly dummyHash = bcrypt.hash(randomBytes(16).toString('hex'), 12);

  constructor(@InjectDb() private readonly db: Db, private readonly jwt: JwtService) {}

  async login(email: string, password: string) {
    const [user] = await this.db.select().from(adminUsers).where(eq(adminUsers.email, email.toLowerCase().trim()));
    // Siempre se hace una comparación completa: así la respuesta no delata qué correos tienen cuenta.
    const ok = await bcrypt.compare(password, user?.passwordHash ?? (await this.dummyHash));
    if (!user || !ok) throw new UnauthorizedException('Correo o contraseña incorrectos');
    await this.db.update(adminUsers).set({ lastLoginAt: new Date() }).where(eq(adminUsers.id, user.id));
    return this.issue(user);
  }

  /** Cambia la clave y cierra las demás sesiones; devuelve una sesión nueva para quien la cambió. */
  async changePassword(userId: number, current: string, next: string) {
    const [user] = await this.db.select().from(adminUsers).where(eq(adminUsers.id, userId));
    if (!user || !(await bcrypt.compare(current, user.passwordHash))) {
      throw new BadRequestException('La contraseña actual no coincide');
    }
    const [updated] = await this.db
      .update(adminUsers)
      .set({ passwordHash: await bcrypt.hash(next, 12), sessionVersion: sql`${adminUsers.sessionVersion} + 1`, updatedAt: new Date() })
      .where(eq(adminUsers.id, userId))
      .returning();
    return this.issue(updated);
  }

  private async issue(user: AdminRow) {
    const session: SessionUser = { id: user.id, email: user.email, name: user.name, role: user.role };
    const payload: SessionToken = { ...session, sv: user.sessionVersion };
    return { session, token: await this.jwt.signAsync(payload) };
  }

  async listUsers() {
    const rows = await this.db.select().from(adminUsers).orderBy(adminUsers.id);
    const now = new Date();
    return rows.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      lastLoginAt: u.lastLoginAt,
      // Hay un link de acceso sin usar y todavía vigente
      accessPending: !!u.accessTokenHash && !!u.accessExpiresAt && u.accessExpiresAt > now,
      accessExpiresAt: u.accessTokenHash ? u.accessExpiresAt : null,
    }));
  }

  /** Crea la cuenta sin contraseña conocida: la persona la elige con su link de acceso. */
  async createUser(input: { email: string; name: string; role: Role }) {
    const email = input.email.toLowerCase().trim();
    const [exists] = await this.db.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.email, email));
    if (exists) throw new BadRequestException('Ese correo ya tiene cuenta. Si no puede entrar, genérale un link de acceso.');
    const [row] = await this.db
      .insert(adminUsers)
      .values({ email, name: input.name.trim(), role: input.role, passwordHash: await bcrypt.hash(randomBytes(24).toString('hex'), 12) })
      .returning({ id: adminUsers.id, email: adminUsers.email, name: adminUsers.name, role: adminUsers.role });
    return { user: row, ...(await this.accessLink(row.id)) };
  }

  /**
   * Link para entrar a crear o cambiar la contraseña (sirve también cuando alguien la olvida).
   * Reemplaza cualquier link anterior. La clave actual sigue sirviendo hasta que se use el link.
   */
  async accessLink(userId: number) {
    const { token, hash } = newToken();
    const expiresAt = new Date(Date.now() + ACCESS_DAYS * 86_400_000);
    const rows = await this.db
      .update(adminUsers)
      .set({ accessTokenHash: hash, accessExpiresAt: expiresAt, updatedAt: new Date() })
      .where(eq(adminUsers.id, userId))
      .returning({ id: adminUsers.id });
    if (!rows.length) throw new NotFoundException('Esa cuenta no existe');
    return { link: `${siteUrl()}/admin/acceso/${token}`, expiresAt };
  }

  private async byAccessToken(token: string) {
    if (!token || token.length < 20) throw new NotFoundException('Este link no existe');
    const [user] = await this.db.select().from(adminUsers).where(eq(adminUsers.accessTokenHash, hashToken(token)));
    if (!user) throw new NotFoundException('Este link ya se usó o fue reemplazado por uno nuevo');
    if (!user.accessExpiresAt || user.accessExpiresAt < new Date()) {
      throw new ForbiddenException('Este link venció. Pide uno nuevo a quien administra el panel.');
    }
    return user;
  }

  async accessInfo(token: string) {
    const user = await this.byAccessToken(token);
    return { name: user.name, email: user.email, role: user.role, firstTime: !user.lastLoginAt };
  }

  /** Guarda la clave elegida, gasta el link, cierra otras sesiones y deja la persona adentro. */
  async useAccess(token: string, password: string) {
    const user = await this.byAccessToken(token);
    const [updated] = await this.db
      .update(adminUsers)
      .set({
        passwordHash: await bcrypt.hash(password, 12),
        sessionVersion: sql`${adminUsers.sessionVersion} + 1`,
        accessTokenHash: null,
        accessExpiresAt: null,
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(adminUsers.id, user.id), eq(adminUsers.accessTokenHash, user.accessTokenHash!)))
      .returning();
    if (!updated) throw new NotFoundException('Este link ya se usó');
    return this.issue(updated);
  }

  private async otherAdmins(id: number) {
    const [{ n }] = await this.db
      .select({ n: count() })
      .from(adminUsers)
      .where(and(eq(adminUsers.role, 'admin'), ne(adminUsers.id, id)));
    return Number(n);
  }

  async updateRole(id: number, role: Role, currentUserId: number) {
    if (id === currentUserId && role !== 'admin') throw new BadRequestException('No puedes quitarte tus propios permisos');
    if (role !== 'admin' && (await this.otherAdmins(id)) === 0) throw new BadRequestException('Tiene que quedar al menos una cuenta de administración');
    const rows = await this.db
      .update(adminUsers)
      // Subir sessionVersion obliga a entrar de nuevo con los permisos nuevos
      .set({ role, sessionVersion: sql`${adminUsers.sessionVersion} + 1`, updatedAt: new Date() })
      .where(eq(adminUsers.id, id))
      .returning({ id: adminUsers.id });
    if (!rows.length) throw new NotFoundException('Esa cuenta no existe');
  }

  async deleteUser(id: number, currentUserId: number) {
    if (id === currentUserId) throw new BadRequestException('No puedes borrar tu propia cuenta');
    if ((await this.otherAdmins(id)) === 0) throw new BadRequestException('Tiene que quedar al menos una cuenta de administración');
    await this.db.delete(adminUsers).where(eq(adminUsers.id, id));
  }
}
