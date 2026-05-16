import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { SmsService } from './sms.service';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { TenantGuard } from '../../shared/guards/tenant.guard';

@ApiTags('SMS')
@Controller('sms')
@UseGuards(ThrottlerGuard, JwtAuthGuard, TenantGuard)
@ApiBearerAuth('access-token')
export class SmsController {
  constructor(private readonly smsService: SmsService) {}

  @Post('test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a test SMS via TextMagic' })
  @ApiResponse({ status: 200, description: 'Test SMS sent' })
  async testSMS(@Body() body: { phoneNumber: string }) {
    const result = await this.smsService.testSMS(body.phoneNumber);

    return {
      success: result.success,
      message: result.success ? 'Test SMS sent successfully' : 'Test SMS failed',
      messageId: result.messageId,
      creditsUsed: result.creditsUsed,
      error: result.error,
    };
  }

  @Get('balance')
  @ApiOperation({ summary: 'Get TextMagic account balance' })
  @ApiResponse({ status: 200, description: 'Balance retrieved' })
  async getBalance() {
    const result = await this.smsService.getBalance();

    return result.error
      ? { success: false, error: result.error }
      : { success: true, balance: result.balance };
  }

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a custom SMS' })
  @ApiResponse({ status: 200, description: 'SMS sent' })
  async sendSMS(
    @Body() body: { to: string; message: string; reference?: string },
  ) {
    const result = await this.smsService.sendSMS(body);

    return {
      success: result.success,
      message: result.success ? 'SMS sent successfully' : 'SMS failed',
      messageId: result.messageId,
      creditsUsed: result.creditsUsed,
      error: result.error,
    };
  }
}
