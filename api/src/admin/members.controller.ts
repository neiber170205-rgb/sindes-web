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
import { asc, count, desc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { AdminOnly, AuthGuard } from '../auth/auth.guard';
import { uniqueMemberSlug } from '../common/member-slug';
import { MAX_UPLOAD_BYTES, UploadsService } from '../common/uploads.service';
import { newToken, optionalUrl, siteUrl } from '../common/util';
import { ViewsService } from '../common/views.service';
import { ZodPipe } from '../common/zod.pipe';
import { Db, InjectDb } from '../db/db.module';
import { memberTechnologies, members, projectMembers } from '../db/schema';

const nullableUrl = z.preprocess(optionalUrl, z.string().url('Enlace inválido').nullable().optional());

const memberSchema = z.object({
  fullName: z.string().trim().min(3).max(120),
  slug: z.string().trim().regex(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones').max(80).optional(),
  kind: z.enum(['docente', 'estudiante']),
  roleTitle: z.string().trim().min(2).max(60),
  program: z.string().trim().max(120),
  semester: z.coerce.number().int().min(1).max(12).nullable().optional(),
  joinedOn: z.string().trim().max(40).nullable().optional(),
  bio: z.string().trim().max(1200).nullable().optional(),
  interests: z.string().trim().max(400).nullable().optional(),
  email: z.preprocess(optionalUrl, z.string().email().nullable().optional()),
  githubUrl: nullableUrl,
  linkedinUrl: nullableUrl,
  cvlacUrl: nullableUrl,
  featured: z.boolean().default(false),
  sortOrder: z.coerce.number().int().default(100),
  achievements: z.array(z.object({ title: z.string().min(1), detail: z.string().optional(), date: z.string().optional() })).default([]),
  education: z.array(z.object({ title: z.string().min(1), institution: z.string().optional(), period: z.string().optional() })).default([]),
  technologyIds: z.array(z.number().int()).default([]),
  projects: z.array(z.object({ projectId: z.number().int(), role: z.string().optional() })).default([]),
});
type MemberInput = z.infer<typeof memberSchema>;

const inviteSchema = z.object({
  names: z.array(z.string().trim().min(3)).min(1, 'Escribe al menos un nombre').max(80),
  days: z.coerce.number().int().min(1).max(90).default(21),
});

const statusSchema = z.object({ status: z.enum(['draft', 'pending', 'published', 'hidden']) });
const reorderSchema = z.object({ ids: z.array(z.number().int()).min(1) });

@Controller('admin/members')
@UseGuards(AuthGuard)
export class MembersController {
  constructor(@InjectDb() private readonly db: Db, private readonly views: ViewsService, private readonly uploads: UploadsService) {}

  private uniqueSlug(base: string, exceptId?: number) {
    return uniqueMemberSlug(this.db, base, exceptId);
  }

  private inviteLink(token: string) {
    return `${siteUrl()}/registro/${token}`;
  }

  @Get('summary')
  async summary() {
    const rows = await this.db.select({ status: members.status, n: count() }).from(members).groupBy(members.status);
    const by = Object.fromEntries(rows.map((r) => [r.status, Number(r.n)]));
    return {
      draft: by.draft ?? 0,
      pending: by.pending ?? 0,
      published: by.published ?? 0,
      hidden: by.hidden ?? 0,
      total: rows.reduce((a, r) => a + Number(r.n), 0),
    };
  }

  @Get()
  async list() {
    const rows = await this.db.select().from(members).orderBy(desc(members.featured), asc(members.sortOrder), asc(members.id));
    const views = await this.views.members(rows, false);
    return views.map((v, i) => ({
      ...v,
      status: rows[i].status,
      hasInvite: !!rows[i].inviteTokenHash,
      inviteExpiresAt: rows[i].inviteExpiresAt,
      submittedAt: rows[i].submittedAt,
      consent: !!rows[i].consentAt,
      updatedAt: rows[i].updatedAt,
    }));
  }

  @Get(':id')
  async one(@Param('id', ParseIntPipe) id: number) {
    const rows = await this.db.select().from(members).where(eq(members.id, id));
    if (!rows.length) throw new NotFoundException();
    const [view] = await this.views.members(rows, false);
    return { ...view, status: rows[0].status, consent: !!rows[0].consentAt, hasInvite: !!rows[0].inviteTokenHash, inviteExpiresAt: rows[0].inviteExpiresAt };
  }

  /** Crea perfiles en borrador y devuelve un link personal por cada nombre. */
  @Post('invitations')
  async invite(@Body(new ZodPipe(inviteSchema)) body: z.infer<typeof inviteSchema>) {
    const expires = new Date(Date.now() + body.days * 86_400_000);
    const out: { id: number; fullName: string; link: string }[] = [];
    for (const name of body.names) {
      const { token, hash } = newToken();
      const [row] = await this.db
        .insert(members)
        .values({ fullName: name, slug: await this.uniqueSlug(name), status: 'draft', inviteTokenHash: hash, inviteExpiresAt: expires })
        .returning({ id: members.id, fullName: members.fullName });
      out.push({ ...row, link: this.inviteLink(token) });
    }
    return out;
  }

  /** Genera un link nuevo (el anterior deja de servir). */
  @Post(':id/invite')
  async reinvite(@Param('id', ParseIntPipe) id: number, @Body(new ZodPipe(z.object({ days: z.coerce.number().int().min(1).max(90).default(21) }))) body: { days: number }) {
    const [m] = await this.db.select({ id: members.id, status: members.status }).from(members).where(eq(members.id, id));
    if (!m) throw new NotFoundException();
    const { token, hash } = newToken();
    // Un perfil oculto vuelve a borrador para que la persona pueda llenarlo otra vez.
    const status = m.status === 'hidden' ? 'draft' : m.status;
    await this.db
      .update(members)
      .set({ inviteTokenHash: hash, inviteExpiresAt: new Date(Date.now() + body.days * 86_400_000), status, updatedAt: new Date() })
      .where(eq(members.id, id));
    return { link: this.inviteLink(token), status };
  }

  @Delete(':id/invite')
  @HttpCode(204)
  async revoke(@Param('id', ParseIntPipe) id: number) {
    await this.db.update(members).set({ inviteTokenHash: null, inviteExpiresAt: null, updatedAt: new Date() }).where(eq(members.id, id));
  }

  @Post()
  async create(@Body(new ZodPipe(memberSchema)) body: MemberInput) {
    const [row] = await this.db
      .insert(members)
      .values({ fullName: body.fullName, slug: await this.uniqueSlug(body.slug || body.fullName), status: 'draft' })
      .returning({ id: members.id });
    return this.update(row.id, body);
  }

  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body(new ZodPipe(memberSchema)) body: MemberInput) {
    const [current] = await this.db.select({ id: members.id, slug: members.slug }).from(members).where(eq(members.id, id));
    if (!current) throw new NotFoundException();
    const slug = body.slug && body.slug !== current.slug ? await this.uniqueSlug(body.slug, id) : current.slug;
    await this.db.transaction(async (tx) => {
      if (body.featured) await tx.update(members).set({ featured: false }).where(eq(members.featured, true));
      await tx
        .update(members)
        .set({
          fullName: body.fullName,
          slug,
          kind: body.kind,
          roleTitle: body.roleTitle,
          program: body.program,
          semester: body.semester ?? null,
          joinedOn: body.joinedOn ?? null,
          bio: body.bio ?? null,
          interests: body.interests ?? null,
          email: (body.email as string | null | undefined) ?? null,
          githubUrl: body.githubUrl ?? null,
          linkedinUrl: body.linkedinUrl ?? null,
          cvlacUrl: body.cvlacUrl ?? null,
          featured: body.featured,
          sortOrder: body.sortOrder,
          achievements: body.achievements,
          education: body.education,
          updatedAt: new Date(),
        })
        .where(eq(members.id, id));
      await tx.delete(memberTechnologies).where(eq(memberTechnologies.memberId, id));
      const techIds = [...new Set(body.technologyIds)];
      if (techIds.length) await tx.insert(memberTechnologies).values(techIds.map((technologyId) => ({ memberId: id, technologyId })));
      await tx.delete(projectMembers).where(eq(projectMembers.memberId, id));
      const seen = new Set<number>();
      const proj = body.projects.filter((p) => !seen.has(p.projectId) && seen.add(p.projectId));
      if (proj.length) await tx.insert(projectMembers).values(proj.map((p) => ({ memberId: id, projectId: p.projectId, role: p.role || null })));
    });
    return this.one(id);
  }

  @Post(':id/status')
  async status(@Param('id', ParseIntPipe) id: number, @Body(new ZodPipe(statusSchema)) body: { status: 'draft' | 'pending' | 'published' | 'hidden' }) {
    const [m] = await this.db.select().from(members).where(eq(members.id, id));
    if (!m) throw new NotFoundException();
    if (body.status === 'published' && !m.photoPath) throw new BadRequestException('Antes de publicar, el perfil necesita foto');
    // Al publicar, el link personal deja de funcionar; si hace falta otro cambio se genera uno nuevo.
    const patch: Partial<typeof members.$inferInsert> =
      body.status === 'published' && m.status !== 'published'
        ? { status: body.status, inviteTokenHash: null, inviteExpiresAt: null, updatedAt: new Date() }
        : { status: body.status, updatedAt: new Date() };
    await this.db.update(members).set(patch).where(eq(members.id, id));
    return this.one(id);
  }

  @Post(':id/photo')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }))
  async photo(@Param('id', ParseIntPipe) id: number, @UploadedFile() file: Express.Multer.File) {
    const [m] = await this.db.select({ photoPath: members.photoPath }).from(members).where(eq(members.id, id));
    if (!m) throw new NotFoundException();
    const path = await this.uploads.savePortrait(file);
    await this.db.update(members).set({ photoPath: path, updatedAt: new Date() }).where(eq(members.id, id));
    await this.uploads.remove(m.photoPath);
    return this.one(id);
  }

  @Post('reorder')
  @HttpCode(204)
  async reorder(@Body(new ZodPipe(reorderSchema)) body: { ids: number[] }) {
    await this.db.transaction(async (tx) => {
      for (const [i, id] of body.ids.entries()) await tx.update(members).set({ sortOrder: (i + 1) * 10 }).where(eq(members.id, id));
    });
  }

  @AdminOnly()
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id: number) {
    const [m] = await this.db.select({ photoPath: members.photoPath }).from(members).where(eq(members.id, id));
    await this.db.delete(members).where(eq(members.id, id));
    await this.uploads.remove(m?.photoPath);
  }

  @Post('bulk-status')
  async bulk(@Body(new ZodPipe(z.object({ ids: z.array(z.number().int()).min(1), status: z.enum(['published', 'hidden']) }))) body: { ids: number[]; status: 'published' | 'hidden' }) {
    const rows = await this.db.select({ id: members.id, photoPath: members.photoPath }).from(members).where(inArray(members.id, body.ids));
    const ok = body.status === 'hidden' ? rows : rows.filter((r) => r.photoPath);
    if (ok.length) {
      await this.db
        .update(members)
        .set(body.status === 'published' ? { status: 'published', inviteTokenHash: null, inviteExpiresAt: null, updatedAt: new Date() } : { status: 'hidden', updatedAt: new Date() })
        .where(inArray(members.id, ok.map((r) => r.id)));
    }
    return { updated: ok.length, skipped: rows.length - ok.length };
  }
}
