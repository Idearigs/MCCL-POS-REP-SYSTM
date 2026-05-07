import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Get,
  Patch,
  Delete,
  Query,
  Param,
  Headers,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { verifyInternalHmac } from '../../shared/utils/hmac-verify';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { TenantGuard } from '../../shared/guards/tenant.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from '../../shared/decorators/user.decorator';
import {
  CurrentTenant,
  type TenantInfo,
} from '../../shared/decorators/tenant.decorator';
import {
  LoginDto,
  RegisterDto,
  RefreshTokenDto,
  ChangePasswordDto,
  AuthResponseDto,
} from './dto/auth.dto';

@ApiTags('Authentication')
@Controller('auth')
@UseGuards(ThrottlerGuard, TenantGuard)
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User login',
    description: 'Authenticate user with email and password',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests',
  })
  @ApiBody({ type: LoginDto })
  async login(
    @Body() loginDto: LoginDto,
    @CurrentTenant() tenant: TenantInfo,
  ): Promise<AuthResponseDto> {
    return this.authService.login(loginDto, tenant.id);
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'User registration',
    description: 'Create a new user account',
  })
  @ApiResponse({
    status: 201,
    description: 'Registration successful',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 409,
    description: 'User already exists',
  })
  @ApiBody({ type: RegisterDto })
  async register(
    @Body() registerDto: RegisterDto,
    @CurrentTenant() tenant: TenantInfo,
  ): Promise<AuthResponseDto> {
    return this.authService.register(registerDto, tenant.id);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Get a new access token using refresh token',
  })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid refresh token',
  })
  @ApiBody({ type: RefreshTokenDto })
  async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<AuthResponseDto> {
    return this.authService.refreshToken(refreshTokenDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'User logout',
    description: 'Logout user and invalidate refresh token',
  })
  @ApiResponse({
    status: 204,
    description: 'Logout successful',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async logout(@CurrentUser('id') userId: string): Promise<void> {
    await this.authService.logout(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get current user',
    description: 'Get current authenticated user information',
  })
  @ApiResponse({
    status: 200,
    description: 'User information retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  getMe(
    @CurrentUser()
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      tenantId: string;
      tenants: unknown;
      lastLogin?: Date;
    },
  ) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      tenantId: user.tenantId,
      tenant: user.tenants,
      lastLogin: user.lastLogin,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Change password',
    description: 'Change user password',
  })
  @ApiResponse({
    status: 204,
    description: 'Password changed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Current password is incorrect',
  })
  @ApiBody({ type: ChangePasswordDto })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    await this.authService.changePassword(userId, changePasswordDto);
  }

  @Roles('OWNER', 'MANAGER')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('users')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get all users',
    description: 'Get list of all users/cashiers — OWNER and MANAGER only',
  })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  async getUsers(
    @CurrentTenant() tenant: TenantInfo,
    @Query('role') role?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.authService.getUsers(
      tenant.id,
      role,
      isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 100,
    );
  }

  @Roles('OWNER', 'MANAGER')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('users/:id')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get user by ID',
    description: 'Get a specific user by their ID — OWNER and MANAGER only',
  })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  async getUserById(
    @CurrentTenant() tenant: TenantInfo,
    @Param('id') id: string,
  ): Promise<unknown> {
    return this.authService.getUserById(tenant.id, id);
  }

  @Roles('OWNER')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch('users/:id')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Update user',
    description: 'Update user details — OWNER only',
  })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  async updateUser(
    @CurrentTenant() tenant: TenantInfo,
    @Param('id') id: string,
    @Body() updateData: Record<string, unknown>,
  ): Promise<unknown> {
    return this.authService.updateUser(tenant.id, id, updateData);
  }

  @Roles('OWNER')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch('users/:id/password')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Reset user password',
    description: 'Reset password for any user — OWNER only',
  })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  async resetUserPassword(
    @CurrentTenant() tenant: TenantInfo,
    @Param('id') id: string,
    @Body() body: { password: string },
  ) {
    return this.authService.resetUserPassword(tenant.id, id, body.password);
  }

  @Roles('OWNER')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete('users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Delete user',
    description: 'Permanently delete a user — OWNER only',
  })
  @ApiResponse({ status: 204, description: 'User deleted successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient role' })
  async deleteUser(
    @CurrentTenant() tenant: TenantInfo,
    @Param('id') id: string,
  ): Promise<void> {
    await this.authService.deleteUser(tenant.id, id);
  }

  /**
   * Internal endpoint — called by Mainframe to provision a new tenant + owner user.
   * Requires X-Internal-Key header matching INTERNAL_API_KEY env var.
   */
  @Public()
  @Post('provision-tenant')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Provision new tenant (internal)',
    description:
      'Called by Mainframe to create a new customer tenant and owner account',
  })
  @ApiResponse({ status: 201, description: 'Tenant provisioned successfully' })
  async provisionTenant(
    @Headers('x-internal-timestamp') timestamp: string,
    @Headers('x-internal-signature') signature: string,
    @Req() req: RawBodyRequest<ExpressRequest>,
    @Body()
    body: {
      tenantId: string;
      businessName: string;
      subdomain: string;
      ownerEmail: string;
      ownerFirstName: string;
      ownerLastName: string;
      ownerPassword: string;
    },
  ) {
    verifyInternalHmac(signature, timestamp, req.rawBody?.toString() ?? '');
    return this.authService.provisionTenant(body);
  }

  /**
   * Internal endpoint — called by Mainframe to update tenant suspension/billing status.
   * Requires X-Internal-Key header matching INTERNAL_API_KEY env var.
   */
  @Public()
  @Patch('tenant-status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update tenant status (internal)',
    description:
      'Called by Mainframe to sync tenant suspension or billing status',
  })
  async updateTenantStatus(
    @Headers('x-internal-timestamp') timestamp: string,
    @Headers('x-internal-signature') signature: string,
    @Req() req: RawBodyRequest<ExpressRequest>,
    @Body()
    body: {
      subdomain: string;
      status:
        | 'ACTIVE'
        | 'PAYMENT_DUE'
        | 'PAYMENT_WARNING'
        | 'SUSPENDED'
        | 'INACTIVE';
      suspendedReason?: string;
      billingDueDate?: string;
    },
  ) {
    verifyInternalHmac(signature, timestamp, req.rawBody?.toString() ?? '');
    return this.authService.updateTenantStatus(body);
  }

  // ── QZ Tray per-tenant config ──────────────────────────────────────────────

  @Get('qz-config')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get QZ Tray certificate + private key for this tenant',
  })
  getQzConfig(@CurrentUser() user: { tenantId: string }) {
    return this.authService.getQzConfig(user.tenantId);
  }

  @Patch('qz-config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary:
      'Save QZ Tray certificate + private key for this tenant (owner only)',
  })
  async saveQzConfig(
    @CurrentUser() user: { tenantId: string },
    @Body() body: { certificate: string; privateKey: string },
  ) {
    await this.authService.saveQzConfig(
      user.tenantId,
      body.certificate,
      body.privateKey,
    );
  }

  @Public()
  @Get('health')
  @ApiOperation({
    summary: 'Auth service health check',
    description: 'Check if authentication service is healthy',
  })
  @ApiResponse({
    status: 200,
    description: 'Auth service is healthy',
  })
  health() {
    return {
      status: 'ok',
      service: 'auth',
      timestamp: new Date().toISOString(),
    };
  }
}
