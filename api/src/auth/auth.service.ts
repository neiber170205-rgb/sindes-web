import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { eq, sql } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';
import { Db, InjectDb } from '../db/db.module';
import { adminUsers } from '../db/schema';
import { SessionToken, SessionUser } from './auth.guard';

type AdminRow = typeof adminUsers.$inferSelect;

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
    return this.db
      .select({ id: adminUsers.id, email: adminUsers.email, name: adminUsers.name, role: adminUsers.role })
      .from(adminUsers)
      .orderBy(adminUsers.id);
  }

  async createUser(input: { email: string; name: string; password: string; role: 'admin' | 'editor' }) {
    const email = input.email.toLowerCase().trim();
    const [exists] = await this.db.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.email, email));
    if (exists) throw new BadRequestException('Ese correo ya tiene cuenta');
    const [row] = await this.db
      .insert(adminUsers)
      .values({ email, name: input.name, role: input.role, passwordHash: await bcrypt.hash(input.password, 12) })
      .returning({ id: adminUsers.id, email: adminUsers.email, name: adminUsers.name, role: adminUsers.role });
    return row;
  }

  async deleteUser(id: number, currentUserId: number) {
    if (id === currentUserId) throw new BadRequestException('No puedes borrar tu propia cuenta');
    await this.db.delete(adminUsers).where(eq(adminUsers.id, id));
  }
}
