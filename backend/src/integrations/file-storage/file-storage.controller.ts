import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  Res,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
  Body,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileStorageService, FileUploadResult } from './file-storage.service';
import { TenantId } from '../../shared/decorators/tenant.decorator';

interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@ApiTags('File Storage')
@Controller('file-storage')
export class FileStorageController {
  constructor(private readonly fileStorageService: FileStorageService) {}

  @Post('upload/repair-images')
  @ApiOperation({ summary: 'Upload repair job images' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'Files uploaded successfully' })
  @UseInterceptors(FilesInterceptor('images', 10))
  async uploadRepairImages(
    @UploadedFiles() files: UploadedFile[],
    @Body() metadata: any,
    @TenantId() tenantId: string,
  ): Promise<{ results: FileUploadResult[]; summary: any }> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    const results: FileUploadResult[] = [];

    for (const file of files) {
      try {
        const result = await this.fileStorageService.uploadFile({
          fileName: file.originalname,
          buffer: file.buffer,
          mimeType: file.mimetype,
          category: 'repair-images',
          tenantId,
          metadata: {
            repairId: metadata.repairId,
            description: metadata.description,
            uploadedBy: metadata.uploadedBy || 'system',
            originalSize: file.size,
          },
        });

        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          fileUrl: '',
          fileName: file.originalname,
          size: file.size,
          uploadMethod: 'error',
          error: error.message,
        });
      }
    }

    const summary = {
      totalFiles: files.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      uploadMethods: results.reduce(
        (acc, r) => {
          acc[r.uploadMethod] = (acc[r.uploadMethod] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };

    return { results, summary };
  }

  @Post('upload/customer-documents')
  @ApiOperation({ summary: 'Upload customer documents' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('documents', 5))
  async uploadCustomerDocuments(
    @UploadedFiles() files: UploadedFile[],
    @Body() metadata: any,
    @TenantId() tenantId: string,
  ): Promise<{ results: FileUploadResult[] }> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    const results: FileUploadResult[] = [];

    for (const file of files) {
      const result = await this.fileStorageService.uploadFile({
        fileName: file.originalname,
        buffer: file.buffer,
        mimeType: file.mimetype,
        category: 'customer-documents',
        tenantId,
        metadata: {
          customerId: metadata.customerId,
          documentType: metadata.documentType,
          uploadedBy: metadata.uploadedBy || 'system',
        },
      });

      results.push(result);
    }

    return { results };
  }

  @Post('upload/product-images')
  @ApiOperation({ summary: 'Upload product images' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('images', 10))
  async uploadProductImages(
    @UploadedFiles() files: UploadedFile[],
    @Body() metadata: any,
    @TenantId() tenantId: string,
  ): Promise<{ results: FileUploadResult[] }> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    const results: FileUploadResult[] = [];

    for (const file of files) {
      const result = await this.fileStorageService.uploadFile({
        fileName: file.originalname,
        buffer: file.buffer,
        mimeType: file.mimetype,
        category: 'product-images',
        tenantId,
        metadata: {
          productId: metadata.productId,
          imageType: metadata.imageType || 'product',
          uploadedBy: metadata.uploadedBy || 'system',
        },
      });

      results.push(result);
    }

    return { results };
  }

  @Get('drive/:fileId')
  @ApiOperation({ summary: 'Proxy a Google Drive file via service account' })
  async streamDriveFile(
    @Param('fileId') fileId: string,
    @Res() res: Response,
  ): Promise<void> {
    await this.fileStorageService.streamDriveFile(fileId, res);
  }

  @Get('thumb')
  @ApiOperation({
    summary: 'Serve a cached, resized thumbnail of a local image',
  })
  async getThumbnail(
    @Query('src') src: string,
    @Query('w') w: string,
    @Res() res: Response,
  ): Promise<void> {
    const width = parseInt(w, 10) || 200;
    const thumb = src
      ? await this.fileStorageService.getLocalThumbnail(src, width)
      : null;

    if (!thumb) {
      // Fall back to the original so the image always displays.
      if (src) res.redirect(302, src);
      else res.status(404).end();
      return;
    }

    res.setHeader('Content-Type', thumb.contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // 1 year — thumb key is a hash of the file path, so a new upload gets a new URL
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.end(thumb.buffer);
  }

  @Get('status')
  @ApiOperation({ summary: 'Get storage system status' })
  @ApiResponse({ status: 200, description: 'Storage status retrieved' })
  getStorageStatus() {
    return this.fileStorageService.getStorageStatus();
  }

  @Post('test')
  @ApiOperation({ summary: 'Test all storage methods' })
  @ApiResponse({ status: 200, description: 'Storage test results' })
  async testStorageMethods() {
    return await this.fileStorageService.testStorageMethods();
  }
}
