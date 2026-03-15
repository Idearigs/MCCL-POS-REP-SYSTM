import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { FeaturesService } from '../services/features.service';

@Controller('mainframe/features')
export class FeaturesController {
  constructor(private readonly featuresService: FeaturesService) {}

  @Post()
  async create(@Body() data: {
    featureKey: string;
    featureName: string;
    description?: string;
    category?: string;
    isIncludedInBase?: boolean;
    additionalCost?: number;
    dependsOn?: string[];
  }) {
    return this.featuresService.create(data);
  }

  @Get()
  async findAll(
    @Query('category') category?: string,
    @Query('status') status?: string,
  ) {
    return this.featuresService.findAll({ category, status });
  }

  @Get('stats')
  async getStats() {
    return this.featuresService.getStats();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.featuresService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: {
    featureName?: string;
    description?: string;
    category?: string;
    isIncludedInBase?: boolean;
    additionalCost?: number;
    status?: string;
    isBeta?: boolean;
  }) {
    return this.featuresService.update(id, data);
  }

  @Post(':id/versions')
  async createVersion(
    @Param('id') id: string,
    @Body() data: {
      version: string;
      versionType: string;
      releaseNotes?: string;
      changelog?: any;
    },
  ) {
    return this.featuresService.createVersion(id, data);
  }

  @Post(':id/versions/:versionId/deploy')
  async deployVersion(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ) {
    return this.featuresService.deployVersion(id, versionId);
  }

  @Post('seed-defaults')
  async seedDefaults() {
    return this.featuresService.seedDefaultFeatures();
  }
}
