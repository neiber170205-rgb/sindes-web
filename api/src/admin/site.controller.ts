import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { and, eq, ne, sql } from 'drizzle-orm';
import { z } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import { MAX_UPLOAD_BYTES, UploadsService } from '../common/uploads.service';
import { slugify } from '../common/util';
import { ViewsService } from '../common/views.service';
import { ZodPipe } from '../common/zod.pipe';
import { Db, InjectDb } from '../db/db.module';
import { galleryPhotos, siteContent, technologies } from '../db/schema';

const t = (max: number) => z.string().trim().max(max);

export const contentSchema = z.object({
  hero: z.object({ line1: t(40), line2: t(40), rotatingWords: z.array(t(30).min(1)).min(1).max(8), intro: t(400) }),
  tapes: z.object({ top: z.array(t(40)).max(12), bottom: z.array(t(40)).max(12) }),
  semillero: z.object({ title: t(120), body: t(1200), mission: t(600), vision: t(600) }),
  steps: z.array(z.object({ title: t(60), body: t(300) })).max(6),
  line: z.object({ kicker: t(80), title: t(160), intro: t(600) }),
  focuses: z
    .array(z.object({ key: z.enum(['innovacion', 'optimizacion', 'automatizacion', 'ia']), title: t(60), body: t(300) }))
    .length(4),
  meeting: z.object({ day: t(40), time: t(40), room: t(40), place: t(80), requirements: t(400), joinUrl: z.string().trim().max(300) }),
  join: z.object({ title: t(120) }),
  footer: z.object({ text: t(300) }),
});

const techSchema = z.object({ name: t(40).min(1), category: t(40).min(1).default('Herramientas'), sortOrder: z.coerce.number().int().optional() });
const photoSchema = z.object({ caption: t(160).nullable().optional(), alt: t(200).nullable().optional() });

@Controller('admin')
@UseGuards(AuthGuard)
export class SiteController {
  constructor(@InjectDb() private readonly db: Db, private readonly views: ViewsService, private readonly uploads: UploadsService) {}

  // ---- Textos de la página ----

  @Get('content')
  content() {
    return this.views.content();
  }

  @Put('content')
  async saveContent(@Body(new ZodPipe(contentSchema)) body: z.infer<typeof contentSchema>) {
    await this.db
      .insert(siteContent)
      .values({ key: 'site', value: body })
      .onConflictDoUpdate({ target: siteContent.key, set: { value: body, updatedAt: new Date() } });
    return this.views.content();
  }

  // ---- Galería del semillero ----

  @Get('gallery')
  gallery() {
    return this.views.gallery();
  }

  @Post('gallery')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }))
  async addPhoto(@UploadedFile() file: Express.Multer.File, @Body() body: Record<string, string>) {
    const path = await this.uploads.saveWide('gallery', file);
    const existing = await this.db.select({ id: galleryPhotos.id }).from(galleryPhotos);
    await this.db.insert(galleryPhotos).values({
      path,
      caption: body.caption?.slice(0, 160) || null,
      alt: body.alt?.slice(0, 200) || null,
      sortOrder: (existing.length + 1) * 10,
    });
    return this.views.gallery();
  }

  @Patch('gallery/:id')
  async editPhoto(@Param('id', ParseIntPipe) id: number, @Body(new ZodPipe(photoSchema)) body: z.infer<typeof photoSchema>) {
    await this.db.update(galleryPhotos).set({ caption: body.caption ?? null, alt: body.alt ?? null }).where(eq(galleryPhotos.id, id));
    return this.views.gallery();
  }

  @Post('gallery/reorder')
  async reorderGallery(@Body(new ZodPipe(z.object({ ids: z.array(z.number().int()) }))) body: { ids: number[] }) {
    await this.db.transaction(async (tx) => {
      for (const [i, id] of body.ids.entries()) await tx.update(galleryPhotos).set({ sortOrder: (i + 1) * 10 }).where(eq(galleryPhotos.id, id));
    });
    return this.views.gallery();
  }

  @Delete('gallery/:id')
  async removePhoto(@Param('id', ParseIntPipe) id: number) {
    const [row] = await this.db.delete(galleryPhotos).where(eq(galleryPhotos.id, id)).returning({ path: galleryPhotos.path });
    await this.uploads.remove(row?.path);
    return this.views.gallery();
  }

  // ---- Tecnologías (logos) ----

  @Get('technologies')
  techs() {
    return this.views.technologies();
  }

  /** Devuelve el slug del nombre si ninguna otra tecnología lo usa (React y react cuentan como la misma). */
  private async freeTechSlug(name: string, exceptId?: number) {
    const slug = slugify(name);
    const [taken] = await this.db
      .select({ name: technologies.name })
      .from(technologies)
      .where(and(eq(technologies.slug, slug), exceptId ? ne(technologies.id, exceptId) : undefined));
    if (taken) throw new BadRequestException(`Ya existe «${taken.name}»`);
    return slug;
  }

  @Post('technologies')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 512 * 1024 } }))
  async addTech(@UploadedFile() file: Express.Multer.File | undefined, @Body() raw: Record<string, string>) {
    const body = new ZodPipe(techSchema).transform(raw) as z.infer<typeof techSchema>;
    const slug = await this.freeTechSlug(body.name);
    const logoPath = file ? await this.uploads.saveLogo(file) : null;
    const [{ max }] = await this.db.select({ max: sql<number>`coalesce(max(${technologies.sortOrder}), 0)` }).from(technologies);
    await this.db
      .insert(technologies)
      .values({ name: body.name, slug, category: body.category, sortOrder: body.sortOrder ?? Number(max) + 10, logoPath });
    return this.views.technologies();
  }

  @Put('technologies/:id')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 512 * 1024 } }))
  async editTech(@Param('id', ParseIntPipe) id: number, @UploadedFile() file: Express.Multer.File | undefined, @Body() raw: Record<string, string>) {
    const body = new ZodPipe(techSchema).transform(raw) as z.infer<typeof techSchema>;
    const [current] = await this.db.select().from(technologies).where(eq(technologies.id, id));
    if (!current) throw new NotFoundException();
    const slug = await this.freeTechSlug(body.name, id);
    const logoPath = file ? await this.uploads.saveLogo(file) : current.logoPath;
    await this.db
      .update(technologies)
      .set({ name: body.name, slug, category: body.category, sortOrder: body.sortOrder ?? current.sortOrder, logoPath })
      .where(eq(technologies.id, id));
    if (file) await this.uploads.remove(current.logoPath);
    return this.views.technologies();
  }

  @Delete('technologies/:id')
  @HttpCode(200)
  async removeTech(@Param('id', ParseIntPipe) id: number) {
    const [row] = await this.db.delete(technologies).where(eq(technologies.id, id)).returning({ logoPath: technologies.logoPath });
    await this.uploads.remove(row?.logoPath);
    return this.views.technologies();
  }
}
