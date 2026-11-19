import { Controller, Get, Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { sql } from 'drizzle-orm';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { PgErrorFilter } from './common/pg-error.filter';
import { Db, DbModule, InjectDb } from './db/db.module';
import { PublicModule } from './public/public.module';
import { RegistroModule } from './registro/registro.module';

@Controller('health')
class HealthController {
  constructor(@InjectDb() private readonly db: Db) {}
  @Get()
  async health() {
    await this.db.execute(sql`select 1`);
    return { ok: true };
  }
}

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    DbModule,
    CommonModule,
    AuthModule,
    PublicModule,
    RegistroModule,
    AdminModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: PgErrorFilter },
  ],
})
export class AppModule {}
