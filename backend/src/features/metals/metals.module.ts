import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MetalsService } from './metals.service';
import { MetalsController } from './metals.controller';

@Module({
  imports: [ConfigModule],
  controllers: [MetalsController],
  providers: [MetalsService],
  exports: [MetalsService],
})
export class MetalsModule {}
