import { Module } from '@nestjs/common';
import { OpenLinkService } from './open-link.service';
import { RegistroController } from './registro.controller';
import { RegistroService } from './registro.service';

@Module({ controllers: [RegistroController], providers: [RegistroService, OpenLinkService], exports: [OpenLinkService] })
export class RegistroModule {}
