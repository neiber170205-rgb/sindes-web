import { Global, Module } from '@nestjs/common';
import { UploadsService } from './uploads.service';
import { VideoService } from './video.service';
import { ViewsService } from './views.service';

@Global()
@Module({ providers: [UploadsService, VideoService, ViewsService], exports: [UploadsService, VideoService, ViewsService] })
export class CommonModule {}
