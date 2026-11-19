import { Body, Controller, Delete, Get, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import { ZodPipe } from '../common/zod.pipe';
import { OpenLinkService } from '../registro/open-link.service';

const createSchema = z.object({ days: z.coerce.number().int().min(1).max(90).default(14) });

/** Link general de inscripción (uno para todo el grupo). */
@Controller('admin/open-link')
@UseGuards(AuthGuard)
export class OpenLinkController {
  constructor(private readonly link: OpenLinkService) {}

  @Get()
  status() {
    return this.link.status();
  }

  @Post()
  create(@Body(new ZodPipe(createSchema)) body: z.infer<typeof createSchema>) {
    return this.link.create(body.days);
  }

  @Delete()
  disable() {
    return this.link.disable();
  }
}
