import { Module } from '@nestjs/common';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { SalesRepository } from './sales.repository';
import { CacheServiceModule } from '../../core/cache/cache.module';
import { ShiftsModule } from '../shifts/shifts.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [CacheServiceModule, ShiftsModule, SettingsModule],
  controllers: [SalesController],
  providers: [SalesRepository, SalesService],
  exports: [SalesService],
})
export class SalesModule {}
