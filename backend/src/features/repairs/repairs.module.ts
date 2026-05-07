import { Module } from '@nestjs/common';
import { RepairsService } from './repairs.service';
import { RepairsController } from './repairs.controller';
import { RepairsRepository } from './repairs.repository';
import { CacheServiceModule } from '../../core/cache/cache.module';
import { FileStorageModule } from '../../integrations/file-storage/file-storage.module';
import { SmsModule } from '../../integrations/sms/sms.module';

@Module({
  imports: [CacheServiceModule, FileStorageModule, SmsModule],
  controllers: [RepairsController],
  providers: [RepairsRepository, RepairsService],
  exports: [RepairsService],
})
export class RepairsModule {}
