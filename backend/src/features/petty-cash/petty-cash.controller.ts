import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
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
import { PettyCashService } from './petty-cash.service';
import {
  CreatePettyCashAccountDto,
  UpdatePettyCashAccountDto,
  ReplenishPettyCashDto,
  CreatePettyCashTransactionDto,
  ApprovePettyCashTransactionDto,
  RejectPettyCashTransactionDto,
  GetPettyCashTransactionsDto,
  PettyCashAccountResponseDto,
  PettyCashTransactionResponseDto,
} from './dto/petty-cash.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';

@ApiTags('Petty Cash Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('petty-cash')
export class PettyCashController {
  constructor(private readonly pettyCashService: PettyCashService) {}

  // ===== ACCOUNTS =====

  @Post('accounts')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new petty cash account' })
  @ApiResponse({
    status: 201,
    description: 'Account created successfully',
    type: PettyCashAccountResponseDto,
  })
  async createAccount(
    @Request() req,
    @Body() dto: CreatePettyCashAccountDto,
  ): Promise<PettyCashAccountResponseDto> {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;

    return this.pettyCashService.createAccount(tenantId, userId, dto);
  }

  @Get('accounts')
  @ApiOperation({ summary: 'Get all petty cash accounts' })
  @ApiResponse({
    status: 200,
    description: 'Accounts retrieved successfully',
    type: [PettyCashAccountResponseDto],
  })
  async getAccounts(@Request() req): Promise<PettyCashAccountResponseDto[]> {
    const tenantId = req.user.tenantId;

    return this.pettyCashService.getAccounts(tenantId);
  }

  @Get('accounts/:accountId')
  @ApiOperation({ summary: 'Get petty cash account by ID' })
  @ApiResponse({
    status: 200,
    description: 'Account retrieved successfully',
    type: PettyCashAccountResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Account not found',
  })
  async getAccountById(
    @Request() req,
    @Param('accountId') accountId: string,
  ): Promise<PettyCashAccountResponseDto> {
    const tenantId = req.user.tenantId;

    return this.pettyCashService.getAccountById(tenantId, accountId);
  }

  @Put('accounts/:accountId')
  @ApiOperation({ summary: 'Update petty cash account' })
  @ApiResponse({
    status: 200,
    description: 'Account updated successfully',
    type: PettyCashAccountResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Account not found',
  })
  async updateAccount(
    @Request() req,
    @Param('accountId') accountId: string,
    @Body() dto: UpdatePettyCashAccountDto,
  ): Promise<PettyCashAccountResponseDto> {
    const tenantId = req.user.tenantId;

    return this.pettyCashService.updateAccount(tenantId, accountId, dto);
  }

  @Post('accounts/:accountId/replenish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Replenish petty cash account' })
  @ApiResponse({
    status: 200,
    description: 'Account replenished successfully',
    type: PettyCashAccountResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Account not found',
  })
  async replenishAccount(
    @Request() req,
    @Param('accountId') accountId: string,
    @Body() dto: ReplenishPettyCashDto,
  ): Promise<PettyCashAccountResponseDto> {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;

    return this.pettyCashService.replenishAccount(
      tenantId,
      userId,
      accountId,
      dto,
    );
  }

  @Delete('accounts/:accountId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a petty cash account' })
  @ApiResponse({ status: 204, description: 'Account deleted successfully' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  @ApiResponse({ status: 400, description: 'Account has transactions and cannot be deleted' })
  async deleteAccount(
    @Request() req,
    @Param('accountId') accountId: string,
  ): Promise<void> {
    const tenantId = req.user.tenantId;
    return this.pettyCashService.deleteAccount(tenantId, accountId);
  }

  // ===== TRANSACTIONS =====

  @Post('transactions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new petty cash transaction (expense request)',
  })
  @ApiResponse({
    status: 201,
    description: 'Transaction created successfully',
    type: PettyCashTransactionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request (insufficient balance, inactive account, etc.)',
  })
  @ApiResponse({
    status: 404,
    description: 'Account not found',
  })
  async createTransaction(
    @Request() req,
    @Body() dto: CreatePettyCashTransactionDto,
  ): Promise<PettyCashTransactionResponseDto> {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;

    return this.pettyCashService.createTransaction(tenantId, userId, dto);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get petty cash transactions with filters' })
  @ApiResponse({
    status: 200,
    description: 'Transactions retrieved successfully',
  })
  async getTransactions(
    @Request() req,
    @Query() dto: GetPettyCashTransactionsDto,
  ): Promise<any> {
    const tenantId = req.user.tenantId;

    return this.pettyCashService.getTransactions(tenantId, dto);
  }

  @Get('transactions/:transactionId')
  @ApiOperation({ summary: 'Get transaction by ID' })
  @ApiResponse({
    status: 200,
    description: 'Transaction retrieved successfully',
    type: PettyCashTransactionResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Transaction not found',
  })
  async getTransactionById(
    @Request() req,
    @Param('transactionId') transactionId: string,
  ): Promise<PettyCashTransactionResponseDto> {
    const tenantId = req.user.tenantId;

    return this.pettyCashService.getTransactionById(tenantId, transactionId);
  }

  @Post('transactions/:transactionId/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a petty cash transaction' })
  @ApiResponse({
    status: 200,
    description: 'Transaction approved successfully',
    type: PettyCashTransactionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Transaction already processed or invalid state',
  })
  @ApiResponse({
    status: 403,
    description: 'Cannot approve own transaction',
  })
  @ApiResponse({
    status: 404,
    description: 'Transaction not found',
  })
  async approveTransaction(
    @Request() req,
    @Param('transactionId') transactionId: string,
    @Body() dto: ApprovePettyCashTransactionDto,
  ): Promise<PettyCashTransactionResponseDto> {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;

    return this.pettyCashService.approveTransaction(
      tenantId,
      userId,
      transactionId,
      dto,
    );
  }

  @Post('transactions/:transactionId/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a petty cash transaction' })
  @ApiResponse({
    status: 200,
    description: 'Transaction rejected successfully',
    type: PettyCashTransactionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Transaction already processed or invalid state',
  })
  @ApiResponse({
    status: 403,
    description: 'Cannot reject own transaction',
  })
  @ApiResponse({
    status: 404,
    description: 'Transaction not found',
  })
  async rejectTransaction(
    @Request() req,
    @Param('transactionId') transactionId: string,
    @Body() dto: RejectPettyCashTransactionDto,
  ): Promise<PettyCashTransactionResponseDto> {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;

    return this.pettyCashService.rejectTransaction(
      tenantId,
      userId,
      transactionId,
      dto,
    );
  }

  @Post('transactions/:transactionId/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a petty cash transaction (by requester)' })
  @ApiResponse({
    status: 200,
    description: 'Transaction cancelled successfully',
    type: PettyCashTransactionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Can only cancel pending transactions',
  })
  @ApiResponse({
    status: 403,
    description: 'Can only cancel own transactions',
  })
  @ApiResponse({
    status: 404,
    description: 'Transaction not found',
  })
  async cancelTransaction(
    @Request() req,
    @Param('transactionId') transactionId: string,
  ): Promise<PettyCashTransactionResponseDto> {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;

    return this.pettyCashService.cancelTransaction(
      tenantId,
      userId,
      transactionId,
    );
  }

  // ===== REPORTS =====

  @Get('reports/summary')
  @ApiOperation({ summary: 'Get petty cash summary report' })
  @ApiResponse({
    status: 200,
    description: 'Summary report retrieved successfully',
  })
  async getSummaryReport(
    @Request() req,
    @Query('accountId') accountId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<any> {
    const tenantId = req.user.tenantId;

    return this.pettyCashService.getSummaryReport(
      tenantId,
      accountId,
      startDate,
      endDate,
    );
  }
}
