import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Req, Res, SetMetadata, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { ZodPipe } from '../common/zod.pipe';
import { ADMIN_ONLY, AuthGuard, SESSION_COOKIE, SessionUser } from './auth.guard';
import { AuthService } from './auth.service';

const loginSchema = z.object({ email: z.string().email('Escribe un correo válido'), password: z.string().min(1, 'Escribe la contraseña') });
const passwordSchema = z.object({
  current: z.string().min(1),
  next: z.string().min(10, 'La nueva contraseña debe tener al menos 10 caracteres'),
});
const userSchema = z.object({
  email: z.string().trim().email('Escribe un correo válido'),
  name: z.string().trim().min(2, 'Escribe el nombre').max(80),
  role: z.enum(['admin', 'editor']),
});
const roleSchema = z.object({ role: z.enum(['admin', 'editor']) });
const accessSchema = z.object({ password: z.string().min(10, 'La contraseña debe tener al menos 10 caracteres').max(200) });

const cookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 1000 * 60 * 60 * 12,
});

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  async login(@Body(new ZodPipe(loginSchema)) body: z.infer<typeof loginSchema>, @Res({ passthrough: true }) res: Response) {
    const { session, token } = await this.auth.login(body.email, body.password);
    res.cookie(SESSION_COOKIE, token, cookieOptions());
    return session;
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(SESSION_COOKIE, { path: '/' });
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req() req: Request & { user: SessionUser }) {
    return req.user;
  }

  @Post('password')
  @HttpCode(204)
  @UseGuards(AuthGuard)
  async password(
    @Req() req: Request & { user: SessionUser },
    @Body(new ZodPipe(passwordSchema)) body: z.infer<typeof passwordSchema>,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Las otras sesiones se cierran; esta sigue abierta con una cookie nueva.
    const { token } = await this.auth.changePassword(req.user.id, body.current, body.next);
    res.cookie(SESSION_COOKIE, token, cookieOptions());
  }

  @Get('users')
  @UseGuards(AuthGuard)
  @SetMetadata(ADMIN_ONLY, true)
  users() {
    return this.auth.listUsers();
  }

  @Post('users')
  @UseGuards(AuthGuard)
  @SetMetadata(ADMIN_ONLY, true)
  createUser(@Body(new ZodPipe(userSchema)) body: z.infer<typeof userSchema>) {
    return this.auth.createUser(body);
  }

  /** Link para que la persona cree o cambie su contraseña (también si la olvidó). */
  @Post('users/:id/access')
  @UseGuards(AuthGuard)
  @SetMetadata(ADMIN_ONLY, true)
  access(@Param('id', ParseIntPipe) id: number) {
    return this.auth.accessLink(id);
  }

  @Patch('users/:id')
  @HttpCode(204)
  @UseGuards(AuthGuard)
  @SetMetadata(ADMIN_ONLY, true)
  async role(@Param('id', ParseIntPipe) id: number, @Body(new ZodPipe(roleSchema)) body: z.infer<typeof roleSchema>, @Req() req: Request & { user: SessionUser }) {
    await this.auth.updateRole(id, body.role, req.user.id);
  }

  // ---- Links de acceso (sin sesión) ----

  @Get('access/:token')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  accessInfo(@Param('token') token: string) {
    return this.auth.accessInfo(token);
  }

  @Post('access/:token')
  @HttpCode(200)
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  async useAccess(@Param('token') token: string, @Body(new ZodPipe(accessSchema)) body: z.infer<typeof accessSchema>, @Res({ passthrough: true }) res: Response) {
    const { session, token: jwt } = await this.auth.useAccess(token, body.password);
    res.cookie(SESSION_COOKIE, jwt, cookieOptions());
    return session;
  }

  @Delete('users/:id')
  @HttpCode(204)
  @UseGuards(AuthGuard)
  @SetMetadata(ADMIN_ONLY, true)
  async deleteUser(@Param('id', ParseIntPipe) id: number, @Req() req: Request & { user: SessionUser }) {
    await this.auth.deleteUser(id, req.user.id);
  }
}
