import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FloatService } from './float.service';
import {
  OpenFloatSessionDto,
  CloseFloatSessionDto,
  CreateFloatTransactionDto,
  GetFloatSessionsDto,
  FloatSessionResponseDto,
  FloatTransactionResponseDto,
} from './dto/float.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';

@ApiTags('Float Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('float')
export class FloatController {
  constructor(private readonly floatService: FloatService) {}

  @Post('open')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Open a new float session' })
  @ApiResponse({
    status: 201,
    description: 'Float session opened successfully',
    type: FloatSessionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'User already has an open float session',
  })
  async openFloatSession(
    @Request() req,
    @Body() dto: OpenFloatSessionDto,
  ): Promise<FloatSessionResponseDto> {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;

    return this.floatService.openFloatSession(tenantId, userId, dto);
  }

  @Post(':sessionId/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Close a float session' })
  @ApiResponse({
    status: 200,
    description: 'Float session closed successfully',
    type: FloatSessionResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Float session not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Float session is already closed',
  })
  async closeFloatSession(
    @Request() req,
    @Param('sessionId') sessionId: string,
    @Body() dto: CloseFloatSessionDto,
  ): Promise<FloatSessionResponseDto> {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;

    return this.floatService.closeFloatSession(
      tenantId,
      userId,
      sessionId,
      dto,
    );
  }

  @Get('current')
  @ApiOperation({
    summary: 'Get current open float session for logged-in user',
  })
  @ApiResponse({
    status: 200,
    description: 'Current float session retrieved',
    type: FloatSessionResponseDto,
  })
  @ApiResponse({
    status: 200,
    description: 'No open float session',
  })
  async getCurrentFloatSession(
    @Request() req,
  ): Promise<FloatSessionResponseDto | null> {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;

    return this.floatService.getCurrentFloatSession(tenantId, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get float sessions with filters' })
  @ApiResponse({
    status: 200,
    description: 'Float sessions retrieved successfully',
  })
  async getFloatSessions(
    @Request() req,
    @Query() dto: GetFloatSessionsDto,
  ): Promise<any> {
    const tenantId = req.user.tenantId;

    return this.floatService.getFloatSessions(tenantId, dto);
  }

  @Get(':sessionId')
  @ApiOperation({ summary: 'Get float session by ID' })
  @ApiResponse({
    status: 200,
    description: 'Float session retrieved successfully',
    type: FloatSessionResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Float session not found',
  })
  async getFloatSessionById(
    @Request() req,
    @Param('sessionId') sessionId: string,
  ): Promise<FloatSessionResponseDto> {
    const tenantId = req.user.tenantId;

    return this.floatService.getFloatSessionById(tenantId, sessionId);
  }

  @Post('transactions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a float transaction (cash in/out)' })
  @ApiResponse({
    status: 201,
    description: 'Float transaction created successfully',
    type: FloatTransactionResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Float session not found or is closed',
  })
  async createFloatTransaction(
    @Request() req,
    @Body() dto: CreateFloatTransactionDto,
  ): Promise<FloatTransactionResponseDto> {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;

    return this.floatService.createFloatTransaction(tenantId, userId, dto);
  }
}
