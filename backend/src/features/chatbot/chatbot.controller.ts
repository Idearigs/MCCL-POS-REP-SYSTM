import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Res,
  Header,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { TenantGuard } from '../../shared/guards/tenant.guard';
import { ChatbotService } from './chatbot.service';
import { SendMessageDto, QuickActionDto, ExportReportDto } from './dto/chatbot.dto';

@Controller('chatbot')
@UseGuards(JwtAuthGuard, TenantGuard)
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  /**
   * Send message to chatbot
   */
  @Post('message')
  @HttpCode(HttpStatus.OK)
  async sendMessage(@Req() req, @Body() body: SendMessageDto) {
    return this.chatbotService.sendMessage(
      req.user.id,
      req.user.tenantId,
      body.message,
      body.conversationId,
    );
  }

  /**
   * Execute quick action
   */
  @Post('quick-action')
  @HttpCode(HttpStatus.OK)
  async quickAction(@Req() req, @Body() body: QuickActionDto) {
    return this.chatbotService.handleQuickAction(
      req.user.tenantId,
      body.action,
      body.parameters,
    );
  }

  /**
   * Export report as PDF
   */
  @Post('export/pdf')
  @Header('Content-Type', 'application/pdf')
  async exportPDF(@Req() req, @Body() body: ExportReportDto, @Res() res: Response) {
    const pdfBuffer = await this.chatbotService.generatePDFReport(
      req.user.tenantId,
      body.reportData,
      body.reportType,
      body.period,
    );

    const filename = `${body.reportType}_Report_${new Date().toISOString().split('T')[0]}.pdf`;
    res.set({
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  }

  /**
   * Export report as CSV
   */
  @Post('export/csv')
  @Header('Content-Type', 'text/csv')
  async exportCSV(@Req() req, @Body() body: ExportReportDto, @Res() res: Response) {
    const csvData = await this.chatbotService.generateCSVReport(
      req.user.tenantId,
      body.reportData,
      body.reportType,
      body.period,
    );

    const filename = `${body.reportType}_Report_${new Date().toISOString().split('T')[0]}.csv`;
    res.set({
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': csvData.length,
    });

    res.send(csvData);
  }
}
