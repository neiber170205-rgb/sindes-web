import { Body, Controller, Get, HttpCode, Param, Post, Put, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { MAX_UPLOAD_BYTES } from '../common/uploads.service';
import { ZodPipe } from '../common/zod.pipe';
import { RegistroService, registroSchema, RegistroInput } from './registro.service';

/** Formulario que cada integrante llena desde su link personal. */
@Controller('registro')
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class RegistroController {
  constructor(private readonly registro: RegistroService) {}

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
