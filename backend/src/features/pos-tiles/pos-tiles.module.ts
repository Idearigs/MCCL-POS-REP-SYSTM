import { Module } from '@nestjs/common';
import { PosTilesController } from './pos-tiles.controller';
import { PosTilesService } from './pos-tiles.service';
import { PrismaModule } from '../../core/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PosTilesController],
  providers: [PosTilesService],
  exports: [PosTilesService],
})
export class PosTilesModule {}
