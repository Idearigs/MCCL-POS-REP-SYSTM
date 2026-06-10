import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsNotEmpty,
  ValidateNested,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePosTileDto {
  @ApiProperty({
    example: 'Cleaning Kit',
    description: 'Text shown on the tile',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  label: string;

  @ApiPropertyOptional({
    example: 'Jewellery Cleaning Kit',
    description: 'Cart / receipt line name (defaults to the label)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  saleName?: string;

  @ApiPropertyOptional({
    example: 12.0,
    description: 'Prefilled price; null or 0 prompts the cashier for a price',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultPrice?: number;

  @ApiPropertyOptional({ example: 'blue', description: 'Colour palette key' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;

  @ApiPropertyOptional({ example: 'Sparkles', description: 'Lucide icon key' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  icon?: string;
}

export class UpdatePosTileDto {
  @ApiPropertyOptional({ example: 'Cleaning Kit' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  label?: string;

  @ApiPropertyOptional({ example: 'Jewellery Cleaning Kit' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  saleName?: string;

  @ApiPropertyOptional({ example: 12.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultPrice?: number | null;

  @ApiPropertyOptional({ example: 'blue' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;

  @ApiPropertyOptional({ example: 'Sparkles' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  icon?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ReorderItemDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty({ example: 0 })
  @IsNumber()
  @Min(0)
  sortOrder: number;
}

export class ReorderPosTilesDto {
  @ApiProperty({ type: [ReorderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderItemDto)
  tiles: ReorderItemDto[];
}

export class PosTileResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  label: string;

  @ApiProperty()
  saleName: string;

  @ApiPropertyOptional({ nullable: true })
  defaultPrice: number | null;

  @ApiProperty()
  color: string;

  @ApiProperty()
  icon: string;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  isActive: boolean;
}
