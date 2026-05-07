import { Module } from '@nestjs/common';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { OpenAIModule } from '../../integrations/openai/openai.module';

@Module({
  imports: [PrismaModule, OpenAIModule],
  controllers: [ChatbotController],
  providers: [ChatbotService],
  exports: [ChatbotService],
})
export class ChatbotModule {}
