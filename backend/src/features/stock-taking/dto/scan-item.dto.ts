import { IsString, IsInt, IsOptional, IsNotEmpty, Min } from 'class-validator';

export class ScanItemDto {
  @IsString()
  @IsNotEmpty()
  scannedCode: string;

  @IsInt()
  @Min(1)
  scannedQuantity: number = 1;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  productId?: string;

  @IsString()
  @IsOptional()
  productName?: string;

  @IsString()
  @IsOptional()
  productSku?: string;
}
