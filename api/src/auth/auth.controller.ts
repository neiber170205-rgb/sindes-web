import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Req, Res, SetMetadata, UseGuards } from '@nestjs/common';
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
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(10, 'La contraseña debe tener al menos 10 caracteres'),
  role: z.enum(['admin', 'editor']),
});

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

  @Delete('users/:id')
  @HttpCode(204)
  @UseGuards(AuthGuard)
  @SetMetadata(ADMIN_ONLY, true)
  async deleteUser(@Param('id', ParseIntPipe) id: number, @Req() req: Request & { user: SessionUser }) {
    await this.auth.deleteUser(id, req.user.id);
  }
}
