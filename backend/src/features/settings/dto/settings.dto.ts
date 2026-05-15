import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsIn,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GeneralSettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsString() storeName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() tradingName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number;
}

export class NotificationSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() smsNotifications?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() lowStockAlerts?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  repairStatusUpdates?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() dailySummary?: boolean;
}

export class AppearanceSettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() darkMode?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() compactView?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() receiptTemplate?: string;
}

export class PrinterSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsIn(['ONIX', 'EPSON', 'STAR_TSP100', 'OTHER'])
  model?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() printerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoPrint?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsIn([1, 2]) copies?: 1 | 2;
  @ApiPropertyOptional() @IsOptional() @IsString() headerText?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() footerText?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() drawerPin?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() vatNumber?: string;
}

export class MetalSettingsDto {
  @ApiPropertyOptional({
    description: 'Gold margin %',
    minimum: 0,
    maximum: 200,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(200)
  goldMarginPercent?: number;

  @ApiPropertyOptional({
    description: 'Silver margin %',
    minimum: 0,
    maximum: 200,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(200)
  silverMarginPercent?: number;

  @ApiPropertyOptional({
    description: 'Platinum margin %',
    minimum: 0,
    maximum: 200,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(200)
  platinumMarginPercent?: number;
}

export class UpdateSettingsDto {
  @ApiPropertyOptional({ type: GeneralSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => GeneralSettingsDto)
  general?: GeneralSettingsDto;

  @ApiPropertyOptional({ type: NotificationSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationSettingsDto)
  notifications?: NotificationSettingsDto;

  @ApiPropertyOptional({ type: AppearanceSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AppearanceSettingsDto)
  appearance?: AppearanceSettingsDto;

  @ApiPropertyOptional({ type: PrinterSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PrinterSettingsDto)
  printer?: PrinterSettingsDto;

  @ApiPropertyOptional({ type: MetalSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MetalSettingsDto)
  metals?: MetalSettingsDto;
}
