import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { CacheServiceModule } from '../../core/cache/cache.module';
import { FileStorageModule } from '../../integrations/file-storage/file-storage.module';

@Module({
  imports: [CacheServiceModule, FileStorageModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}