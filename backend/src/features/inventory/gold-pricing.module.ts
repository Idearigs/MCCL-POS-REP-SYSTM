import { Module } from '@nestjs/common';
import { GoldPricingService } from './gold-pricing.service';
import { GoldPricingController } from './gold-pricing.controller';
import { MetalsModule } from '../metals/metals.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [MetalsModule, SettingsModule],
  controllers: [GoldPricingController],
  providers: [GoldPricingService],
  exports: [GoldPricingService],
})
export class GoldPricingModule {}
