import 'dotenv/config';
import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { join } from 'node:path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: true });
  app.set('trust proxy', 1); // Detrás de Caddy
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
  app.use(cookieParser());
  app.useBodyParser('json', { limit: '1mb' });
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();

  // En producción Caddy sirve /uploads; en desarrollo lo sirve la API.
  if (process.env.SERVE_UPLOADS !== 'false') {
    app.useStaticAssets(process.env.UPLOAD_DIR ?? join(process.cwd(), 'uploads'), { prefix: '/uploads', maxAge: '30d' });
  }

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
  // Un video de varios minutos puede tardar en subir: se da hasta 3 h por petición (Node corta a los 5 min por defecto).
  const server = app.getHttpServer();
  server.requestTimeout = 3 * 60 * 60 * 1000;
  server.headersTimeout = 2 * 60 * 1000;
  Logger.log(`API lista en http://localhost:${port}/api`, 'SINDES');
}
bootstrap();
