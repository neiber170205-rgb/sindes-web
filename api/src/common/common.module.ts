import { Global, Module } from '@nestjs/common';
import { UploadsService } from './uploads.service';
import { ViewsService } from './views.service';

@Global()
@Module({ providers: [UploadsService, ViewsService], exports: [UploadsService, ViewsService] })
export class CommonModule {}
