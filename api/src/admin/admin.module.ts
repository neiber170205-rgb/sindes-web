import { Module } from '@nestjs/common';
import { MembersController } from './members.controller';
import { ProjectsController } from './projects.controller';
import { SiteController } from './site.controller';

@Module({ controllers: [MembersController, ProjectsController, SiteController] })
export class AdminModule {}
