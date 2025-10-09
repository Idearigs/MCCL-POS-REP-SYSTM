import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class GoogleDriveDto {
  @ApiProperty({
    description: 'Google Drive file ID',
    example: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
  })
  id: string;

  @ApiProperty({
    description: 'File name',
    example: 'repair_image_2024.jpg',
  })
  name: string;

  @ApiProperty({
    description: 'Web view link for the file',
    example: 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view',
  })
  webViewLink: string;

  @ApiProperty({
    description: 'Web content link for direct download',
    example: 'https://drive.google.com/uc?id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
  })
  webContentLink: string;

  @ApiProperty({
    description: 'MIME type of the file',
    example: 'image/jpeg',
  })
  mimeType: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: '1024576',
  })
  size: string;

  @ApiProperty({
    description: 'File creation timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdTime: string;

  @ApiProperty({
    description: 'File modification timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  modifiedTime: string;
}

export class CreateFolderDto {
  @ApiProperty({
    description: 'Folder name',
    example: 'Customer_Documents_2024',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Parent folder ID (optional)',
    example: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
  })
  @IsOptional()
  @IsString()
  parentId?: string;
}

export class UploadFileDto {
  @ApiProperty({
    description: 'File to upload',
    type: 'string',
    format: 'binary',
  })
  file: any; // Express.Multer.File type issue

  @ApiPropertyOptional({
    description: 'File description',
    example: 'Repair image for customer XYZ',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Custom folder ID (overrides default folder structure)',
    example: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
  })
  @IsOptional()
  @IsString()
  folderId?: string;
}

export class UploadRepairImageDto extends UploadFileDto {
  @ApiPropertyOptional({
    description: 'Repair ID for reference',
    example: 'repair_123',
  })
  @IsOptional()
  @IsString()
  repairId?: string;
}

export class UploadCustomerDocumentDto extends UploadFileDto {
  @ApiProperty({
    description: 'Customer ID for reference',
    example: 'customer_456',
  })
  @IsString()
  customerId: string;
}

export class UploadReceiptDto extends UploadFileDto {
  @ApiProperty({
    description: 'Transaction ID for reference',
    example: 'txn_789',
  })
  @IsString()
  transactionId: string;
}

export class UploadProductImageDto extends UploadFileDto {
  @ApiProperty({
    description: 'Product ID for reference',
    example: 'product_101',
  })
  @IsString()
  productId: string;
}

export class ListFilesDto {
  @ApiPropertyOptional({
    description: 'Folder ID to list files from (optional)',
    example: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
  })
  @IsOptional()
  @IsString()
  folderId?: string;

  @ApiPropertyOptional({
    description: 'Number of files to return (max 100)',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  pageSize?: number = 50;
}

export class GoogleDriveHealthDto {
  @ApiProperty({
    description: 'Service status',
    example: 'connected',
    enum: ['connected', 'disconnected'],
  })
  status: 'connected' | 'disconnected';

  @ApiProperty({
    description: 'Status message',
    example: 'Google Drive service is running properly',
  })
  message: string;

  @ApiProperty({
    description: 'Health check timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  timestamp: string;
}

export class FolderStructureDto {
  @ApiProperty({
    description: 'Predefined folder structure',
    example: {
      repairImages: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      invoices: '1CxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      customerDocuments: '1DxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      receipts: '1ExiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      productImages: '1FxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    },
  })
  folders: {
    repairImages: string;
    invoices: string;
    customerDocuments: string;
    receipts: string;
    productImages: string;
  };

  @ApiProperty({
    description: 'Description of the folder structure',
    example: 'Predefined folder structure for MPS Jewelry file organization',
  })
  description: string;
}