import {
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
import { and, asc, eq, like } from 'drizzle-orm';
import { z } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import { MAX_UPLOAD_BYTES, UploadsService } from '../common/uploads.service';
import { optionalUrl, slugify } from '../common/util';
import { ViewsService } from '../common/views.service';
import { ZodPipe } from '../common/zod.pipe';
import { Db, InjectDb } from '../db/db.module';
import { projectImages, projectMembers, projectTechnologies, projects } from '../db/schema';

const s = (max: number) => z.string().trim().max(max);

const projectSchema = z.object({
  name: s(80).min(2),
  slug: s(80).regex(/^[a-z0-9-]*$/, 'Solo minúsculas, números y guiones').optional(),
  subtitle: s(200).nullable().optional(),
  summary: s(400).nullable().optional(),
  tag: s(40).nullable().optional(),
  intro: s(1500).nullable().optional(),
  problem: s(1500).nullable().optional(),
  solution: s(1500).nullable().optional(),
  status: z.enum(['en_desarrollo', 'prototipo', 'finalizado']),
  statusLabel: s(40).nullable().optional(),
  focus: s(60).nullable().optional(),
  demoUrl: z.preprocess(optionalUrl, z.string().url().nullable().optional()),
  published: z.boolean().default(false),
  sortOrder: z.coerce.number().int().default(100),
  featuresTitle: s(60).default('Lo que hace'),
  features: z.array(z.object({ title: s(80).min(1), description: s(400) })).max(12).default([]),
  layers: z.array(z.object({ label: s(40), title: s(80).min(1), description: s(400) })).max(8).default([]),
  stats: z.array(z.object({ value: s(20).min(1), label: s(60) })).max(6).default([]),
  milestones: z.array(z.object({ date: s(40), title: s(100).min(1), description: s(300).optional(), pending: z.boolean().optional() })).max(20).default([]),
  facts: z.array(z.object({ label: s(40).min(1), value: s(120) })).max(10).default([]),
  documents: z.array(s(200).min(1)).max(10).default([]),
  extraTitle: s(80).nullable().optional(),
  extraBody: s(2000).nullable().optional(),
  technologies: z.array(z.object({ technologyId: z.number().int(), category: s(40).optional() })).max(40).default([]),
  team: z.array(z.object({ memberId: z.number().int(), role: s(80).optional() })).max(40).default([]),
});
type ProjectInput = z.infer<typeof projectSchema>;

const imageSchema = z.object({ caption: s(160).nullable().optional(), alt: s(200).nullable().optional() });

@Controller('admin/projects')
@UseGuards(AuthGuard)
export class ProjectsController {
  constructor(@InjectDb() private readonly db: Db, private readonly views: ViewsService, private readonly uploads: UploadsService) {}

  private async uniqueSlug(base: string, exceptId?: number) {
    const root = slugify(base);
    const taken = await this.db.select({ id: projects.id, slug: projects.slug }).from(projects).where(like(projects.slug, `${root}%`));
    const used = new Set(taken.filter((t) => t.id !== exceptId).map((t) => t.slug));
    if (!used.has(root)) return root;
    let n = 2;
    while (used.has(`${root}-${n}`)) n++;
    return `${root}-${n}`;
  }

  @Get()
  async list() {
    const rows = await this.db.select().from(projects).orderBy(asc(projects.sortOrder), asc(projects.id));
    return this.views.projects(rows, false);
  }

  @Get(':id')
  async one(@Param('id', ParseIntPipe) id: number) {
    const rows = await this.db.select().from(projects).where(eq(projects.id, id));
    if (!rows.length) throw new NotFoundException();
    const [view] = await this.views.projects(rows, false);
    return view;
  }

  @Post()
  async create(@Body(new ZodPipe(projectSchema)) body: ProjectInput) {
    const [row] = await this.db
      .insert(projects)
      .values({ name: body.name, slug: await this.uniqueSlug(body.slug || body.name), status: body.status })
      .returning({ id: projects.id });
    return this.update(row.id, body);
  }

  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body(new ZodPipe(projectSchema)) body: ProjectInput) {
    const [current] = await this.db.select({ slug: projects.slug }).from(projects).where(eq(projects.id, id));
    if (!current) throw new NotFoundException();
    const slug = body.slug && body.slug !== current.slug ? await this.uniqueSlug(body.slug, id) : current.slug;
    const { technologies: techs, team, slug: _s, ...fields } = body;
    await this.db.transaction(async (tx) => {
      await tx
        .update(projects)
        .set({
          ...fields,
          slug,
          subtitle: fields.subtitle ?? null,
          summary: fields.summary ?? null,
          tag: fields.tag || null,
          intro: fields.intro ?? null,
          problem: fields.problem ?? null,
          solution: fields.solution ?? null,
          statusLabel: fields.statusLabel || null,
          focus: fields.focus ?? null,
          demoUrl: (fields.demoUrl as string | null | undefined) ?? null,
          extraTitle: fields.extraTitle ?? null,
          extraBody: fields.extraBody ?? null,
          updatedAt: new Date(),
        })
        .where(eq(projects.id, id));
      await tx.delete(projectTechnologies).where(eq(projectTechnologies.projectId, id));
      const seenT = new Set<number>();
      const t = techs.filter((x) => !seenT.has(x.technologyId) && seenT.add(x.technologyId));
      if (t.length) await tx.insert(projectTechnologies).values(t.map((x) => ({ projectId: id, technologyId: x.technologyId, category: x.category || null })));
      await tx.delete(projectMembers).where(eq(projectMembers.projectId, id));
      const seenM = new Set<number>();
      const m = team.filter((x) => !seenM.has(x.memberId) && seenM.add(x.memberId));
      if (m.length) await tx.insert(projectMembers).values(m.map((x) => ({ projectId: id, memberId: x.memberId, role: x.role || null })));
    });
    return this.one(id);
  }

  @Patch(':id/published')
  async publish(@Param('id', ParseIntPipe) id: number, @Body(new ZodPipe(z.object({ published: z.boolean() }))) body: { published: boolean }) {
    await this.db.update(projects).set({ published: body.published, updatedAt: new Date() }).where(eq(projects.id, id));
    return this.one(id);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id: number) {
    const imgs = await this.db.select({ path: projectImages.path }).from(projectImages).where(eq(projectImages.projectId, id));
    await this.db.delete(projects).where(eq(projects.id, id));
    for (const i of imgs) await this.uploads.remove(i.path);
  }

  // ---- Capturas ----

  @Post(':id/images')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }))
  async addImage(@Param('id', ParseIntPipe) id: number, @UploadedFile() file: Express.Multer.File, @Body() body: Record<string, string>) {
    const [p] = await this.db.select({ id: projects.id }).from(projects).where(eq(projects.id, id));
    if (!p) throw new NotFoundException();
    const path = await this.uploads.saveWide('projects', file);
    const existing = await this.db.select({ id: projectImages.id }).from(projectImages).where(eq(projectImages.projectId, id));
    await this.db.insert(projectImages).values({
      projectId: id,
      path,
      caption: body.caption?.slice(0, 160) || null,
      alt: body.alt?.slice(0, 200) || null,
      sortOrder: (existing.length + 1) * 10,
    });
    return this.one(id);
  }

  @Patch(':id/images/:imageId')
  async editImage(@Param('id', ParseIntPipe) id: number, @Param('imageId', ParseIntPipe) imageId: number, @Body(new ZodPipe(imageSchema)) body: z.infer<typeof imageSchema>) {
    await this.db
      .update(projectImages)
      .set({ caption: body.caption ?? null, alt: body.alt ?? null })
      .where(and(eq(projectImages.id, imageId), eq(projectImages.projectId, id)));
    return this.one(id);
  }

  @Post(':id/images/reorder')
  async reorderImages(@Param('id', ParseIntPipe) id: number, @Body(new ZodPipe(z.object({ ids: z.array(z.number().int()) }))) body: { ids: number[] }) {
    await this.db.transaction(async (tx) => {
      for (const [i, imageId] of body.ids.entries()) {
        await tx.update(projectImages).set({ sortOrder: (i + 1) * 10 }).where(and(eq(projectImages.id, imageId), eq(projectImages.projectId, id)));
      }
    });
    return this.one(id);
  }

  @Delete(':id/images/:imageId')
  async removeImage(@Param('id', ParseIntPipe) id: number, @Param('imageId', ParseIntPipe) imageId: number) {
    const [img] = await this.db
      .delete(projectImages)
      .where(and(eq(projectImages.id, imageId), eq(projectImages.projectId, id)))
      .returning({ path: projectImages.path });
    await this.uploads.remove(img?.path);
    return this.one(id);
  }
}
