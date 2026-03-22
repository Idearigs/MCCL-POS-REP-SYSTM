import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiParam,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { GoogleDriveService } from './google-drive.service';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { TenantGuard } from '../../shared/guards/tenant.guard';
import { TenantId } from '../../shared/decorators/tenant.decorator';
import {
  GoogleDriveDto,
  CreateFolderDto,
  ListFilesDto,
} from './dto/google-drive.dto';

@ApiTags('Google Drive')
@Controller('drive')
@UseGuards(ThrottlerGuard, JwtAuthGuard, TenantGuard)
@ApiBearerAuth('access-token')
export class GoogleDriveController {
  private readonly folderStructure = {
    repairImages: '1Xy0PIIRg-YBbmDHpQodx2xp_uRamm3NQ', // MPS-Jewelry-Files main folder
    invoices: '1Xy0PIIRg-YBbmDHpQodx2xp_uRamm3NQ',
    customerDocuments: '1Xy0PIIRg-YBbmDHpQodx2xp_uRamm3NQ',
    receipts: '1Xy0PIIRg-YBbmDHpQodx2xp_uRamm3NQ',
    productImages: '1Xy0PIIRg-YBbmDHpQodx2xp_uRamm3NQ',
  };

  constructor(private readonly googleDriveService: GoogleDriveService) {}

  @Post('upload/repair-image')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload repair image',
    description: 'Upload repair image to Google Drive repair-images folder',
  })
  @ApiResponse({
    status: 200,
    description: 'File uploaded successfully',
    type: GoogleDriveDto,
  })
  async uploadRepairImage(
    @UploadedFile() file: any,
    @TenantId() tenantId: string,
    @Body('description') description?: string,
  ) {
    const fileName = `repair_${Date.now()}_${file.originalname}`;

    return this.googleDriveService.uploadFile({
      fileName,
      mimeType: file.mimetype,
      buffer: file.buffer,
      folderId: this.folderStructure.repairImages,
      description: description || `Repair image for tenant ${tenantId}`,
    });
  }

  @Post('upload/invoice')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload invoice',
    description: 'Upload invoice to Google Drive invoices folder',
  })
  @ApiResponse({
    status: 200,
    description: 'Invoice uploaded successfully',
    type: GoogleDriveDto,
  })
  async uploadInvoice(
    @UploadedFile() file: any,
    @TenantId() tenantId: string,
    @Body('description') description?: string,
  ) {
    const fileName = `invoice_${Date.now()}_${file.originalname}`;

    return this.googleDriveService.uploadFile({
      fileName,
      mimeType: file.mimetype,
      buffer: file.buffer,
      folderId: this.folderStructure.invoices,
      description: description || `Invoice for tenant ${tenantId}`,
    });
  }

  @Post('upload/customer-document')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload customer document',
    description:
      'Upload customer document to Google Drive customer-documents folder',
  })
  @ApiResponse({
    status: 200,
    description: 'Customer document uploaded successfully',
    type: GoogleDriveDto,
  })
  async uploadCustomerDocument(
    @UploadedFile() file: any,
    @TenantId() tenantId: string,
    @Body('customerId') customerId: string,
    @Body('description') description?: string,
  ) {
    const fileName = `customer_${customerId}_${Date.now()}_${file.originalname}`;

    return this.googleDriveService.uploadFile({
      fileName,
      mimeType: file.mimetype,
      buffer: file.buffer,
      folderId: this.folderStructure.customerDocuments,
      description: description || `Customer document for ${customerId}`,
    });
  }

  @Post('upload/receipt')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload receipt',
    description: 'Upload receipt to Google Drive receipts folder',
  })
  @ApiResponse({
    status: 200,
    description: 'Receipt uploaded successfully',
    type: GoogleDriveDto,
  })
  async uploadReceipt(
    @UploadedFile() file: any,
    @TenantId() tenantId: string,
    @Body('transactionId') transactionId: string,
    @Body('description') description?: string,
  ) {
    const fileName = `receipt_${transactionId}_${Date.now()}_${file.originalname}`;

    return this.googleDriveService.uploadFile({
      fileName,
      mimeType: file.mimetype,
      buffer: file.buffer,
      folderId: this.folderStructure.receipts,
      description: description || `Receipt for transaction ${transactionId}`,
    });
  }

  @Post('upload/product-image')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload product image',
    description: 'Upload product image to Google Drive product-images folder',
  })
  @ApiResponse({
    status: 200,
    description: 'Product image uploaded successfully',
    type: GoogleDriveDto,
  })
  async uploadProductImage(
    @UploadedFile() file: any,
    @TenantId() tenantId: string,
    @Body('productId') productId: string,
    @Body('description') description?: string,
  ) {
    const fileName = `product_${productId}_${Date.now()}_${file.originalname}`;

    return this.googleDriveService.uploadFile({
      fileName,
      mimeType: file.mimetype,
      buffer: file.buffer,
      folderId: this.folderStructure.productImages,
      description: description || `Product image for ${productId}`,
    });
  }

  @Get('files')
  @ApiOperation({
    summary: 'List files in Google Drive',
    description: 'List all files or files in a specific folder',
  })
  @ApiResponse({
    status: 200,
    description: 'Files retrieved successfully',
    type: [GoogleDriveDto],
  })
  async listFiles(
    @Query('folderId') folderId?: string,
    @Query('pageSize') pageSize: number = 50,
  ) {
    return this.googleDriveService.listFiles(folderId, pageSize);
  }

  @Get('file/:id')
  @ApiOperation({
    summary: 'Get file information',
    description: 'Get detailed information about a specific file',
  })
  @ApiParam({
    name: 'id',
    description: 'Google Drive file ID',
  })
  @ApiResponse({
    status: 200,
    description: 'File information retrieved successfully',
    type: GoogleDriveDto,
  })
  async getFile(@Param('id') fileId: string) {
    return this.googleDriveService.getFile(fileId);
  }

  @Delete('file/:id')
  @ApiOperation({
    summary: 'Delete file',
    description: 'Delete a file from Google Drive',
  })
  @ApiParam({
    name: 'id',
    description: 'Google Drive file ID',
  })
  @ApiResponse({
    status: 200,
    description: 'File deleted successfully',
  })
  async deleteFile(@Param('id') fileId: string) {
    await this.googleDriveService.deleteFile(fileId);
    return { message: 'File deleted successfully' };
  }

  @Post('folder')
  @ApiOperation({
    summary: 'Create folder',
    description: 'Create a new folder in Google Drive',
  })
  @ApiResponse({
    status: 201,
    description: 'Folder created successfully',
  })
  async createFolder(@Body() createFolderDto: CreateFolderDto) {
    const folderId = await this.googleDriveService.createFolder(
      createFolderDto.name,
      createFolderDto.parentId,
    );
    return { id: folderId, message: 'Folder created successfully' };
  }

  @Get('folders/structure')
  @ApiOperation({
    summary: 'Get folder structure',
    description: 'Get the predefined folder structure for file organization',
  })
  @ApiResponse({
    status: 200,
    description: 'Folder structure retrieved successfully',
  })
  getFolderStructure() {
    return {
      folders: {
        repairImages: this.folderStructure.repairImages,
        invoices: this.folderStructure.invoices,
        customerDocuments: this.folderStructure.customerDocuments,
        receipts: this.folderStructure.receipts,
        productImages: this.folderStructure.productImages,
      },
      description:
        'Predefined folder structure for MPS Jewelry file organization',
    };
  }

  @Get('health')
  @ApiOperation({
    summary: 'Google Drive health check',
    description: 'Check if Google Drive integration is working properly',
  })
  @ApiResponse({
    status: 200,
    description: 'Google Drive service status',
  })
  async healthCheck() {
    const isAvailable = this.googleDriveService.isAvailable();
    return {
      status: isAvailable ? 'connected' : 'disconnected',
      message: isAvailable
        ? 'Google Drive service is running properly'
        : 'Google Drive service is not configured or unavailable',
      timestamp: new Date().toISOString(),
    };
  }
}
