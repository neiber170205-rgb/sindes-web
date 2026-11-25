import { Injectable } from '@nestjs/common';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { Db, InjectDb } from '../db/db.module';
import {
  galleryPhotos,
  memberTechnologies,
  members,
  projectImages,
  projectMembers,
  projectTechnologies,
  projects,
  siteContent,
  SiteContent,
  technologies,
  projectVideos,
} from '../db/schema';
import { publicUrl } from './util';
import { VideoService } from './video.service';

export const STATUS_LABEL: Record<string, string> = {
  en_desarrollo: 'En desarrollo',
  prototipo: 'Prototipo',
  finalizado: 'Finalizado',
};

type MemberRow = typeof members.$inferSelect;
type ProjectRow = typeof projects.$inferSelect;
type TechRow = typeof technologies.$inferSelect;

export const techView = (t: TechRow, category?: string | null) => ({
  id: t.id,
  name: t.name,
  slug: t.slug,
  logoUrl: publicUrl(t.logoPath),
  category: category || t.category,
});

@Injectable()
export class ViewsService {
  constructor(@InjectDb() private readonly db: Db, private readonly videos: VideoService) {}

  async content(): Promise<SiteContent> {
    const [row] = await this.db.select().from(siteContent).where(eq(siteContent.key, 'site'));
    return (row?.value ?? {}) as SiteContent;
  }

  async technologies() {
    const rows = await this.db.select().from(technologies).orderBy(asc(technologies.sortOrder), asc(technologies.name));
    return rows.map((t) => techView(t));
  }

  async gallery() {
    const rows = await this.db.select().from(galleryPhotos).orderBy(asc(galleryPhotos.sortOrder), asc(galleryPhotos.id));
    return rows.map((g) => ({ id: g.id, url: publicUrl(g.path)!, caption: g.caption, alt: g.alt, sortOrder: g.sortOrder }));
  }

  /** Perfiles con sus tecnologías y proyectos. `onlyPublishedProjects` filtra los proyectos no publicados. */
  async members(rows: MemberRow[], onlyPublishedProjects: boolean) {
    if (!rows.length) return [];
    const ids = rows.map((m) => m.id);
    const techRows = await this.db
      .select({ memberId: memberTechnologies.memberId, tech: technologies })
      .from(memberTechnologies)
      .innerJoin(technologies, eq(technologies.id, memberTechnologies.technologyId))
      .where(inArray(memberTechnologies.memberId, ids))
      .orderBy(asc(technologies.sortOrder), asc(technologies.name));
    const projRows = await this.db
      .select({ memberId: projectMembers.memberId, role: projectMembers.role, project: projects })
      .from(projectMembers)
      .innerJoin(projects, eq(projects.id, projectMembers.projectId))
      .where(
        onlyPublishedProjects
          ? and(inArray(projectMembers.memberId, ids), eq(projects.published, true))
          : inArray(projectMembers.memberId, ids),
      )
      .orderBy(asc(projects.sortOrder));
    return rows.map((m) => ({
      ...this.memberBase(m),
      technologies: techRows.filter((r) => r.memberId === m.id).map((r) => techView(r.tech)),
      projects: projRows
        .filter((r) => r.memberId === m.id)
        .map((r) => ({
          id: r.project.id,
          slug: r.project.slug,
          name: r.project.name,
          role: r.role,
          status: r.project.status,
          statusLabel: r.project.statusLabel || STATUS_LABEL[r.project.status],
        })),
    }));
  }

  memberBase(m: MemberRow) {
    return {
      id: m.id,
      slug: m.slug,
      fullName: m.fullName,
      kind: m.kind,
      roleTitle: m.roleTitle,
      program: m.program,
      semester: m.semester,
      joinedOn: m.joinedOn,
      bio: m.bio,
      interests: m.interests,
      email: m.email,
      githubUrl: m.githubUrl,
      linkedinUrl: m.linkedinUrl,
      cvlacUrl: m.cvlacUrl,
      photoUrl: publicUrl(m.photoPath),
      featured: m.featured,
      sortOrder: m.sortOrder,
      achievements: m.achievements,
      education: m.education,
    };
  }

  async projects(rows: ProjectRow[], onlyPublishedMembers: boolean) {
    if (!rows.length) return [];
    const ids = rows.map((p) => p.id);
    const images = await this.db
      .select()
      .from(projectImages)
      .where(inArray(projectImages.projectId, ids))
      .orderBy(asc(projectImages.sortOrder), asc(projectImages.id));
    const techRows = await this.db
      .select({ projectId: projectTechnologies.projectId, category: projectTechnologies.category, tech: technologies })
      .from(projectTechnologies)
      .innerJoin(technologies, eq(technologies.id, projectTechnologies.technologyId))
      .where(inArray(projectTechnologies.projectId, ids))
      .orderBy(asc(technologies.sortOrder), asc(technologies.name));
    const team = await this.db
      .select({ projectId: projectMembers.projectId, role: projectMembers.role, member: members })
      .from(projectMembers)
      .innerJoin(members, eq(members.id, projectMembers.memberId))
      .where(
        onlyPublishedMembers
          ? and(inArray(projectMembers.projectId, ids), eq(members.status, 'published'))
          : inArray(projectMembers.projectId, ids),
      )
      .orderBy(asc(members.sortOrder), asc(members.id));
    const videoRows = await this.db.select().from(projectVideos).where(inArray(projectVideos.projectId, ids)).orderBy(desc(projectVideos.id));
    const videoOf = (projectId: number) => {
      const v = videoRows.find((r) => r.projectId === projectId && r.status === 'ready');
      return v?.path
        ? { id: v.id, url: publicUrl(v.path)!, posterUrl: publicUrl(v.posterPath), durationSec: v.durationSec ?? 0, width: v.width ?? 720, height: v.height ?? 1280, caption: v.caption }
        : null;
    };
    // Para el panel: el último video que todavía no está listo (procesando o con error)
    const jobOf = (projectId: number) => {
      const v = videoRows.find((r) => r.projectId === projectId);
      if (!v || v.status === 'ready') return null;
      return { id: v.id, status: v.status, error: v.error, originalName: v.originalName, ...this.videos.state(v.id) };
    };
    return rows.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      subtitle: p.subtitle,
      summary: p.summary,
      tag: p.tag,
      intro: p.intro,
      problem: p.problem,
      solution: p.solution,
      status: p.status,
      statusLabel: p.statusLabel || STATUS_LABEL[p.status],
      focus: p.focus,
      demoUrl: p.demoUrl,
      published: p.published,
      sortOrder: p.sortOrder,
      featuresTitle: p.featuresTitle,
      features: p.features,
      layers: p.layers,
      stats: p.stats,
      milestones: p.milestones,
      facts: p.facts,
      documents: p.documents,
      extraTitle: p.extraTitle,
      extraBody: p.extraBody,
      video: videoOf(p.id),
      ...(onlyPublishedMembers ? {} : { videoJob: jobOf(p.id) }),
      images: images
        .filter((i) => i.projectId === p.id)
        .map((i) => ({ id: i.id, url: publicUrl(i.path)!, caption: i.caption, alt: i.alt, sortOrder: i.sortOrder })),
      technologies: techRows.filter((r) => r.projectId === p.id).map((r) => techView(r.tech, r.category)),
      team: team
        .filter((r) => r.projectId === p.id)
        .map((r) => ({
          id: r.member.id,
          slug: r.member.slug,
          fullName: r.member.fullName,
          kind: r.member.kind,
          roleTitle: r.member.roleTitle,
          role: r.role,
          photoUrl: publicUrl(r.member.photoPath),
          published: r.member.status === 'published',
        })),
    }));
  }
}
