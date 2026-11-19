import { Controller, Get, Header, NotFoundException, Param } from '@nestjs/common';
import { and, asc, desc, eq } from 'drizzle-orm';
import { ViewsService } from '../common/views.service';
import { Db, InjectDb } from '../db/db.module';
import { members, projects } from '../db/schema';

/** Lo que ve cualquier visitante: solo contenido publicado. */
@Controller('public')
export class PublicController {
  constructor(@InjectDb() private readonly db: Db, private readonly views: ViewsService) {}

  @Get('site')
  @Header('Cache-Control', 'public, max-age=30')
  async site() {
    const [content, gallery, memberRows, projectRows] = await Promise.all([
      this.views.content(),
      this.views.gallery(),
      this.db.select().from(members).where(eq(members.status, 'published')).orderBy(desc(members.featured), asc(members.sortOrder), asc(members.id)),
      this.db.select().from(projects).where(eq(projects.published, true)).orderBy(asc(projects.sortOrder), asc(projects.id)),
    ]);
    return {
      content,
      gallery,
      members: await this.views.members(memberRows, true),
      projects: await this.views.projects(projectRows, true),
    };
  }

  @Get('projects/:slug')
  async project(@Param('slug') slug: string) {
    const rows = await this.db.select().from(projects).where(and(eq(projects.slug, slug), eq(projects.published, true)));
    if (!rows.length) throw new NotFoundException('Proyecto no encontrado');
    const [project] = await this.views.projects(rows, true);
    return project;
  }

  @Get('members/:slug')
  async member(@Param('slug') slug: string) {
    const rows = await this.db.select().from(members).where(and(eq(members.slug, slug), eq(members.status, 'published')));
    if (!rows.length) throw new NotFoundException('Integrante no encontrado');
    const [member] = await this.views.members(rows, true);
    return member;
  }
}
