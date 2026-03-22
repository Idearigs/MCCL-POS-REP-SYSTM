import { Module } from '@nestjs/common';
import { FinancialIntelligenceController } from './financial-intelligence.controller';
import { FinancialIntelligenceService } from './financial-intelligence.service';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { CacheServiceModule } from '../../core/cache/cache.module';
import { OpenAIModule } from '../../integrations/openai/openai.module';

@Module({
  imports: [PrismaModule, CacheServiceModule, OpenAIModule],
  controllers: [FinancialIntelligenceController],
  providers: [FinancialIntelligenceService],
  exports: [FinancialIntelligenceService],
})
export class FinancialIntelligenceModule {}
