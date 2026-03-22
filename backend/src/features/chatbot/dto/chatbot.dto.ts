import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export enum QuickActionType {
  TODAY_SALES = 'TODAY_SALES',
  STOCK_LEVELS = 'STOCK_LEVELS',
  SHIFT_SUMMARY = 'SHIFT_SUMMARY',
  LOW_STOCK = 'LOW_STOCK',
  TOP_PRODUCTS = 'TOP_PRODUCTS',
  RECENT_CUSTOMERS = 'RECENT_CUSTOMERS',
}

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  @IsString()
  conversationId?: string;
}

export class QuickActionDto {
  @IsEnum(QuickActionType)
  @IsNotEmpty()
  action: QuickActionType;

  @IsOptional()
  parameters?: Record<string, any>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  conversationId: string;
}

export interface ChatResponse {
  message: ChatMessage;
  conversationId: string;
  suggestions?: string[];
  hasReport?: boolean;
  reportData?: any;
  reportType?: string;
  reportPeriod?: string;
}

export class ExportReportDto {
  @IsNotEmpty()
  reportData: any;

  @IsString()
  @IsNotEmpty()
  reportType: string;

  @IsOptional()
  @IsString()
  period?: string;
}
