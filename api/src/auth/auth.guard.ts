import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { eq } from 'drizzle-orm';
import type { Request } from 'express';
import { Db, InjectDb } from '../db/db.module';
import { adminUsers } from '../db/schema';

export const SESSION_COOKIE = 'sindes_session';
export type SessionUser = { id: number; email: string; name: string; role: 'admin' | 'editor' };
/** Lo que va en la cookie: quién es y con qué versión de sesión entró. */
export type SessionToken = SessionUser & { sv: number };
export const ADMIN_ONLY = 'adminOnly';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly reflector: Reflector, @InjectDb() private readonly db: Db) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request & { user?: SessionUser }>();
    const token = req.cookies?.[SESSION_COOKIE];
    if (!token) throw new UnauthorizedException('Inicia sesión');
    let payload: SessionToken;
    try {
      payload = await this.jwt.verifyAsync<SessionToken>(token);
    } catch {
      throw new UnauthorizedException('Tu sesión venció, entra de nuevo');
    }
    // La cookie dura 12 h: se revisa en la base que la cuenta siga existiendo y que la clave no haya cambiado.
    const [user] = await this.db
      .select({ id: adminUsers.id, email: adminUsers.email, name: adminUsers.name, role: adminUsers.role, sessionVersion: adminUsers.sessionVersion })
      .from(adminUsers)
      .where(eq(adminUsers.id, payload.id));
    if (!user || user.sessionVersion !== payload.sv) throw new UnauthorizedException('Tu sesión se cerró, entra de nuevo');
    req.user = { id: user.id, email: user.email, name: user.name, role: user.role };
    const adminOnly = this.reflector.getAllAndOverride<boolean>(ADMIN_ONLY, [ctx.getHandler(), ctx.getClass()]);
    if (adminOnly && req.user.role !== 'admin') throw new ForbiddenException('Solo un administrador puede hacer esto');
    return true;
  }
}

/** Marca un endpoint como exclusivo de las cuentas de administración. */
export const AdminOnly = () => SetMetadata(ADMIN_ONLY, true);
