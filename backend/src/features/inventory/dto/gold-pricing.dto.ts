import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsString } from 'class-validator';

export class BulkGoldPricingDto {
  @ApiProperty({ type: [String], description: 'Product IDs to update' })
  @IsArray()
  @IsString({ each: true })
  ids: string[];

  @ApiProperty({
    description: 'Enable or disable live gold pricing for these products',
  })
  @IsBoolean()
  enabled: boolean;
}
