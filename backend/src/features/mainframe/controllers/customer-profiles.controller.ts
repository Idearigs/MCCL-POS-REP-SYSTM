import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { CustomerProfilesService } from '../services/customer-profiles.service';
import { SubdomainService } from '../services/subdomain.service';
import {
  CredentialsExportService,
  CredentialsDocument,
} from '../services/credentials-export.service';
import {
  CreateCustomerProfileDto,
  UpdateCustomerProfileDto,
} from '../dto/customer-profile.dto';

@Controller('mainframe/customer-profiles')
export class CustomerProfilesController {
  constructor(
    private readonly customerProfilesService: CustomerProfilesService,
    private readonly subdomainService: SubdomainService,
    private readonly credentialsExportService: CredentialsExportService,
  ) {}

  @Post()
  async create(@Body() dto: CreateCustomerProfileDto) {
    return this.customerProfilesService.create(dto);
  }

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.customerProfilesService.findAll({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      status,
      search,
    });
  }

  @Get('stats')
  async getDashboardStats() {
    return this.customerProfilesService.getDashboardStats();
  }

  @Get('check-subdomain/:subdomain')
  async checkSubdomain(@Param('subdomain') subdomain: string) {
    const validation = this.subdomainService.validateSubdomainFormat(subdomain);
    if (!validation.valid) {
      return { available: false, error: validation.error };
    }

    const available =
      await this.subdomainService.isSubdomainAvailable(subdomain);
    return { available, subdomain: subdomain.toLowerCase() };
  }

  @Get('suggest-subdomain')
  async suggestSubdomain(@Query('businessName') businessName: string) {
    if (!businessName) {
      return { suggestions: [] };
    }
    const suggestions =
      await this.subdomainService.suggestSubdomains(businessName);
    return { suggestions };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.customerProfilesService.findOne(id);
  }

  @Get('subdomain/:subdomain')
  async findBySubdomain(@Param('subdomain') subdomain: string) {
    return this.customerProfilesService.findBySubdomain(subdomain);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCustomerProfileDto) {
    return this.customerProfilesService.update(id, dto);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string; suspendedReason?: string; billingDueDate?: string },
  ) {
    return this.customerProfilesService.updateStatus(id, body.status, {
      suspendedReason: body.suspendedReason,
      billingDueDate: body.billingDueDate,
    });
  }

  @Post(':id/features/:featureKey/enable')
  async enableFeature(
    @Param('id') id: string,
    @Param('featureKey') featureKey: string,
  ) {
    return this.customerProfilesService.enableFeature(id, featureKey);
  }

  @Post(':id/features/:featureKey/disable')
  async disableFeature(
    @Param('id') id: string,
    @Param('featureKey') featureKey: string,
  ) {
    return this.customerProfilesService.disableFeature(id, featureKey);
  }

  @Get(':id/activity-logs')
  async getActivityLogs(
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    return this.customerProfilesService.getActivityLogs(
      id,
      limit ? parseInt(limit) : 50,
    );
  }

  @Get(':id/credentials')
  async getCredentials(@Param('id') id: string): Promise<CredentialsDocument> {
    return this.credentialsExportService.generateCredentialsDocument(id);
  }

  @Get(':id/credentials/html')
  async getCredentialsHtml(@Param('id') id: string, @Res() res: Response) {
    const html = await this.credentialsExportService.generateHtmlDocument(id);
    res.setHeader('Content-Type', 'text/html');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="credentials-${id}.html"`,
    );
    res.send(html);
  }

  @Post(':id/reprovision')
  async reprovisionSubdomain(@Param('id') id: string) {
    const profile = await this.customerProfilesService.findOne(id);
    await this.subdomainService.provisionSubdomain(id, profile.subdomain);
    return { success: true, message: 'Reprovisioning started' };
  }

  @Post(':id/deprovision')
  async deprovisionSubdomain(@Param('id') id: string) {
    await this.subdomainService.deprovisionSubdomain(id);
    return { success: true, message: 'Subdomain deprovisioned' };
  }
}
