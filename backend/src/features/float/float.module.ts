import { Module } from '@nestjs/common';
import { FloatController } from './float.controller';
import { FloatService } from './float.service';
import { PrismaModule } from '../../core/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FloatController],
  providers: [FloatService],
  exports: [FloatService],
})
export class FloatModule {}
