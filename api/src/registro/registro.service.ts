import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { asc, eq, inArray, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { uniqueMemberSlug } from '../common/member-slug';
import { UploadsService } from '../common/uploads.service';
import { hashToken, newToken, optionalUrl } from '../common/util';
import { ViewsService } from '../common/views.service';
import { Db, InjectDb } from '../db/db.module';
import { memberTechnologies, members, projectMembers, projects } from '../db/schema';
import { OpenLinkService } from './open-link.service';

/** Días que dura el link personal que recibe quien entra por el link general. */
const PERSONAL_LINK_DAYS = 21;

const fescEmail = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[^\s@]+@fesc\.edu\.co$/, 'Usa tu correo institucional @fesc.edu.co');

const fullName = z.string().trim().min(5, 'Escribe tu nombre completo').max(120);

/** Primer paso desde el link general: lo mínimo para crear el perfil. */
export const openStartSchema = z.object({ fullName, email: fescEmail });
export type OpenStartInput = z.infer<typeof openStartSchema>;

const url = (host?: RegExp) =>
  z.preprocess(
    optionalUrl,
    z
      .string()
      .url('Pega el enlace completo, con https://')
      .refine((v) => !host || host.test(new URL(v).hostname), 'El enlace no corresponde a esa red')
      .nullable()
      .optional(),
  );

export const registroSchema = z.object({
  fullName,
  roleTitle: z.string().trim().max(60).optional(),
  semester: z.coerce.number().int().min(1).max(12).nullable().optional(),
  joinedOn: z.string().trim().max(40).nullable().optional(),
  bio: z.string().trim().max(600, 'La presentación es muy larga (máximo 600 caracteres)').nullable().optional(),
  interests: z.string().trim().max(300).nullable().optional(),
  email: fescEmail.nullable().optional(),
  githubUrl: url(/(^|\.)github\.com$/),
  linkedinUrl: url(/(^|\.)linkedin\.com$/),
  technologyIds: z.array(z.number().int()).max(30).default([]),
  projects: z.array(z.object({ projectId: z.number().int(), role: z.string().trim().max(80).optional() })).max(10).default([]),
  education: z.array(z.object({ title: z.string().trim().min(2).max(120), institution: z.string().trim().max(120).optional(), period: z.string().trim().max(40).optional() })).max(6).default([]),
  achievements: z.array(z.object({ title: z.string().trim().min(2).max(160), detail: z.string().trim().max(200).optional(), date: z.string().trim().max(40).optional() })).max(10).default([]),
  consent: z.boolean().default(false),
});
export type RegistroInput = z.infer<typeof registroSchema>;

@Injectable()
export class RegistroService {
  constructor(
    @InjectDb() private readonly db: Db,
    private readonly views: ViewsService,
    private readonly uploads: UploadsService,
    private readonly openLink: OpenLinkService,
  ) {}

  // ---- Link general ----

  /** Para que la página muestre de una vez si el link sirve o venció. */
  openCheck(token: string) {
    return this.openLink.assertValid(token);
  }

  /** Crea el perfil en borrador de quien entró por el link general y le da su link personal para seguir. */
  async openStart(openToken: string, input: OpenStartInput) {
    await this.openLink.assertValid(openToken);
    const [taken] = await this.db.select({ id: members.id }).from(members).where(sql`lower(${members.email}) = ${input.email}`);
    if (taken) {
      throw new BadRequestException('Ya hay un perfil con ese correo. Si es el tuyo, pide tu link personal a quien administra la página.');
    }
    const { token, hash } = newToken();
    await this.db.insert(members).values({
      fullName: input.fullName,
      slug: await uniqueMemberSlug(this.db, input.fullName),
      email: input.email,
      status: 'draft',
      inviteTokenHash: hash,
      inviteExpiresAt: new Date(Date.now() + PERSONAL_LINK_DAYS * 86_400_000),
    });
    return { token };
  }

  // ---- Link personal ----

  private async byToken(token: string, forWrite = false) {
    if (!token || token.length < 20) throw new NotFoundException('Este link no existe');
    const [member] = await this.db.select().from(members).where(eq(members.inviteTokenHash, hashToken(token)));
    if (!member) throw new NotFoundException('Este link no existe o ya fue reemplazado');
    if (member.inviteExpiresAt && member.inviteExpiresAt < new Date()) {
      throw new ForbiddenException('Este link venció. Pide uno nuevo a quien administra la página.');
    }
    if (forWrite && member.status === 'hidden') {
      throw new ForbiddenException('Tu perfil está oculto. Habla con quien administra la página.');
    }
    return member;
  }

  /**
   * Proyectos que la persona puede marcar: los publicados y los que el panel ya le asignó.
   * Los borradores ajenos no se muestran (quien tiene el link no debe ver ni unirse a proyectos sin publicar).
   */
  private selectableProjects(memberId: number) {
    const assigned = this.db.select({ id: projectMembers.projectId }).from(projectMembers).where(eq(projectMembers.memberId, memberId));
    return this.db
      .select({ id: projects.id, name: projects.name, status: projects.status })
      .from(projects)
      .where(or(eq(projects.published, true), inArray(projects.id, assigned)))
      .orderBy(asc(projects.sortOrder), asc(projects.name));
  }

  async load(token: string) {
    const member = await this.byToken(token);
    const [view] = await this.views.members([member], false);
    return {
      member: { ...view, status: member.status, consent: !!member.consentAt, submittedAt: member.submittedAt },
      projects: await this.selectableProjects(member.id),
      technologies: await this.views.technologies(),
    };
  }

  async save(token: string, input: RegistroInput) {
    const member = await this.byToken(token, true);
    const allowed = new Set((await this.selectableProjects(member.id)).map((p) => p.id));
    if (input.projects.some((p) => !allowed.has(p.projectId))) {
      throw new BadRequestException('Uno de los proyectos ya no está disponible. Recarga la página.');
    }
    await this.db.transaction(async (tx) => {
      await tx
        .update(members)
        .set({
          fullName: input.fullName,
          roleTitle: input.roleTitle || member.roleTitle,
          semester: input.semester ?? null,
          joinedOn: input.joinedOn ?? null,
          bio: input.bio ?? null,
          interests: input.interests ?? null,
          email: input.email ?? null,
          githubUrl: input.githubUrl ?? null,
          linkedinUrl: input.linkedinUrl ?? null,
          education: input.education,
          achievements: input.achievements,
          consentAt: input.consent ? member.consentAt ?? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(members.id, member.id));
      await tx.delete(memberTechnologies).where(eq(memberTechnologies.memberId, member.id));
      const techIds = [...new Set(input.technologyIds)];
      if (techIds.length) {
        await tx.insert(memberTechnologies).values(techIds.map((technologyId) => ({ memberId: member.id, technologyId })));
      }
      await tx.delete(projectMembers).where(eq(projectMembers.memberId, member.id));
      const seen = new Set<number>();
      const proj = input.projects.filter((p) => !seen.has(p.projectId) && seen.add(p.projectId));
      if (proj.length) {
        await tx.insert(projectMembers).values(proj.map((p) => ({ memberId: member.id, projectId: p.projectId, role: p.role || null })));
      }
    });
    return this.load(token);
  }

  async photo(token: string, file: Express.Multer.File) {
    const member = await this.byToken(token, true);
    const path = await this.uploads.savePortrait(file);
    await this.db.update(members).set({ photoPath: path, updatedAt: new Date() }).where(eq(members.id, member.id));
    await this.uploads.remove(member.photoPath);
    return { photoUrl: `/uploads/${path}` };
  }

  async submit(token: string) {
    const member = await this.byToken(token, true);
    const missing: string[] = [];
    if (!member.fullName || member.fullName.length < 5) missing.push('nombre completo');
    if (!member.photoPath) missing.push('foto');
    if (!member.email) missing.push('correo institucional');
    if (!member.consentAt) missing.push('autorización de datos');
    if (missing.length) throw new BadRequestException(`Te falta: ${missing.join(', ')}`);
    // Un perfil ya publicado sigue publicado: el link lo mandó un administrador.
    const status = member.status === 'published' ? 'published' : 'pending';
    await this.db.update(members).set({ status, submittedAt: new Date(), updatedAt: new Date() }).where(eq(members.id, member.id));
    return { ok: true, status };
  }
}
