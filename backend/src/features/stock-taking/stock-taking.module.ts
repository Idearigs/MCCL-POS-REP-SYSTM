import { Module } from '@nestjs/common';
import { StockTakingController } from './stock-taking.controller';
import { StockTakingService } from './stock-taking.service';
import { PrismaModule } from '../../core/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StockTakingController],
  providers: [StockTakingService],
  exports: [StockTakingService],
})
export class StockTakingModule {}
