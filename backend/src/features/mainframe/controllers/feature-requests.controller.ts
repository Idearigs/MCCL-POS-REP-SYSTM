import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FeatureRequestsService } from '../services/feature-requests.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('mainframe/feature-requests')
export class FeatureRequestsController {
  constructor(
    private readonly featureRequestsService: FeatureRequestsService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Request() req: { user?: { tenantId?: string } },
    @Body()
    data: {
      customerProfileId?: string;
      title: string;
      description: string;
      priority?: string;
      targetFeatureKey?: string;
    },
  ) {
    return this.featureRequestsService.create({
      ...data,
      tenantId: req.user?.tenantId,
    });
  }

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.featureRequestsService.findAll({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      status,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.featureRequestsService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: any) {
    return this.featureRequestsService.update(id, data);
  }

  @Post(':id/vote')
  async vote(@Param('id') id: string, @Body('profileId') profileId: string) {
    return this.featureRequestsService.vote(id, profileId);
  }
}
