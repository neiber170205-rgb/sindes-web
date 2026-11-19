import { Body, Controller, Get, HttpCode, Param, Post, Put, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { MAX_UPLOAD_BYTES } from '../common/uploads.service';
import { ZodPipe } from '../common/zod.pipe';
import { OpenStartInput, openStartSchema, RegistroService, registroSchema, RegistroInput } from './registro.service';

/** Formulario que cada integrante llena desde su link personal (o empieza desde el link general). */
@Controller('registro')
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class RegistroController {
  constructor(private readonly registro: RegistroService) {}

  // Van antes que «:token» para que «abierto» nunca se lea como un link personal.
  @Get('abierto/:token')
  openCheck(@Param('token') token: string) {
    return this.registro.openCheck(token);
  }

  /** En una reunión todo el salón sale por la misma IP del WiFi: el límite deja inscribirse a un grupo grande. */
  @Post('abierto/:token')
  @Throttle({ default: { limit: 40, ttl: 600_000 } })
  openStart(@Param('token') token: string, @Body(new ZodPipe(openStartSchema)) body: OpenStartInput) {
    return this.registro.openStart(token, body);
  }

  @Get(':token')
  load(@Param('token') token: string) {
    return this.registro.load(token);
  }

  @Put(':token')
  save(@Param('token') token: string, @Body(new ZodPipe(registroSchema)) body: RegistroInput) {
    return this.registro.save(token, body);
  }

  @Post(':token/photo')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }))
  photo(@Param('token') token: string, @UploadedFile() file: Express.Multer.File) {
    return this.registro.photo(token, file);
  }

  @Post(':token/submit')
  @HttpCode(200)
  submit(@Param('token') token: string) {
    return this.registro.submit(token);
  }
}
