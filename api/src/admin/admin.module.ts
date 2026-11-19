import { Module } from '@nestjs/common';
import { RegistroModule } from '../registro/registro.module';
import { MembersController } from './members.controller';
import { OpenLinkController } from './open-link.controller';
import { ProjectsController } from './projects.controller';
import { SiteController } from './site.controller';

@Module({ imports: [RegistroModule], controllers: [MembersController, OpenLinkController, ProjectsController, SiteController] })
export class AdminModule {}
