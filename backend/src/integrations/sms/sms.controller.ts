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
import { SmsProcessorService } from './sms-processor.service';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { TenantGuard } from '../../shared/guards/tenant.guard';

@ApiTags('SMS')
@Controller('sms')
@UseGuards(ThrottlerGuard, JwtAuthGuard, TenantGuard)
@ApiBearerAuth('access-token')
export class SmsController {
  constructor(
    private readonly smsService: SmsService,
    private readonly smsProcessor: SmsProcessorService
  ) {}

  @Post('test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Test SMS sending',
    description: 'Send a test SMS to verify VoodooSMS integration',
  })
  @ApiResponse({
    status: 200,
    description: 'Test SMS sent successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'SMS sending failed',
  })
  async testSMS(@Body() body: { phoneNumber: string }) {
    const result = await this.smsService.testSMS(body.phoneNumber);
    
    if (result.success) {
      return {
        success: true,
        message: 'Test SMS sent successfully',
        messageId: result.messageId,
        creditsUsed: result.creditsUsed,
        creditsRemaining: result.creditsRemaining,
      };
    } else {
      return {
        success: false,
        message: 'Test SMS failed',
        error: result.error,
      };
    }
  }

  @Get('balance')
  @ApiOperation({
    summary: 'Get SMS account balance',
    description: 'Retrieve remaining SMS credits from VoodooSMS account',
  })
  @ApiResponse({
    status: 200,
    description: 'Balance retrieved successfully',
  })
  async getBalance() {
    const result = await this.smsService.getBalance();
    
    if (result.error) {
      return {
        success: false,
        error: result.error,
      };
    } else {
      return {
        success: true,
        balance: result.balance,
      };
    }
  }

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send SMS',
    description: 'Send a custom SMS message',
  })
  @ApiResponse({
    status: 200,
    description: 'SMS sent successfully',
  })
  async sendSMS(@Body() body: { 
    to: string; 
    message: string; 
    reference?: string;
    from?: string;
  }) {
    const result = await this.smsService.sendSMS(body);
    
    return {
      success: result.success,
      message: result.success ? 'SMS sent successfully' : 'SMS sending failed',
      messageId: result.messageId,
      error: result.error,
      creditsUsed: result.creditsUsed,
      creditsRemaining: result.creditsRemaining,
    };
  }
}