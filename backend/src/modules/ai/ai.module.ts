import { Module } from '@nestjs/common';
import { ArtistBioController } from './artist-bio.controller';
import { ArtistBioService } from './artist-bio.service';
import { PrismaModule } from '../../shared/modules/prisma.module';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [PrismaModule, RbacModule],
  controllers: [ArtistBioController],
  providers: [ArtistBioService],
})
export class AiModule {}
