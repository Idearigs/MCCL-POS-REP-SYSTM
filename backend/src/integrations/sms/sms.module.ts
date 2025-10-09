import { Module } from '@nestjs/common';
import { SmsService } from './sms.service';
import { SmsProcessorService } from './sms-processor.service';
import { SmsController } from './sms.controller';

@Module({
  providers: [SmsService, SmsProcessorService],
  controllers: [SmsController],
  exports: [SmsService, SmsProcessorService],
})
export class SmsModule {}