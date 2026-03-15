import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { BugReportsService } from '../services/bug-reports.service';

@Controller('mainframe/bug-reports')
export class BugReportsController {
  constructor(private readonly bugReportsService: BugReportsService) {}

  @Post()
  async create(@Body() data: {
    customerProfileId?: string;
    title: string;
    description: string;
    priority?: string;
    featureKey?: string;
    affectedVersion?: string;
    browser?: string;
    os?: string;
    deviceType?: string;
    stepsToReproduce?: string;
    expectedBehavior?: string;
    actualBehavior?: string;
    screenshots?: string[];
    errorLogs?: string;
    errorStackTrace?: string;
    userAgent?: string;
    pageUrl?: string;
  }) {
    return this.bugReportsService.create(data);
  }

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('featureKey') featureKey?: string,
    @Query('customerProfileId') customerProfileId?: string,
  ) {
    return this.bugReportsService.findAll({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      status,
      priority,
      featureKey,
      customerProfileId,
    });
  }

  @Get('stats')
  async getStats() {
    return this.bugReportsService.getStats();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.bugReportsService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: {
    status?: string;
    priority?: string;
    assignedTo?: string;
    resolution?: string;
    fixedInVersion?: string;
  }) {
    return this.bugReportsService.update(id, data);
  }
}
