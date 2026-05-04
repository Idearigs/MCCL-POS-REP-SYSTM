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
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../features/auth/guards/jwt-auth.guard';
import { EmployeesService } from './employees.service';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  EmployeeQueryDto,
  CreateLeaveRequestDto,
  UpdateLeaveStatusDto,
  CreateDepartmentDto,
  UpdateDepartmentDto,
  CreatePositionDto,
  UpdatePositionDto,
} from './dto/employee.dto';

@ApiTags('HRMS - Employees')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('hrms')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  // ─── Self-Service ─────────────────────────────────────────────────────────

  @Get('me')
  @ApiOperation({ summary: 'Get the employee record linked to the current user (matched by email)' })
  async getMe(@Request() req: any) {
    const emp = await this.employeesService.findMe(req.user.email, req.user.tenantId);
    if (!emp) {
      return { linked: false, employee: null };
    }
    return { linked: true, employee: emp };
  }

  // ─── Stats Dashboard ───────────────────────────────────────────────────────

  @Get('stats')
  @ApiOperation({ summary: 'Get HRMS dashboard stats' })
  getStats(@Request() req: any) {
    return this.employeesService.getStats(req.user.tenantId);
  }

  // ─── Employees ─────────────────────────────────────────────────────────────

  @Post('employees')
  @ApiOperation({ summary: 'Create employee' })
  @ApiResponse({ status: 201, description: 'Employee created' })
  create(@Body() dto: CreateEmployeeDto, @Request() req: any) {
    return this.employeesService.create(dto, req.user.tenantId);
  }

  @Get('employees')
  @ApiOperation({ summary: 'List employees' })
  findAll(@Query() query: EmployeeQueryDto, @Request() req: any) {
    return this.employeesService.findAll(req.user.tenantId, query);
  }

  @Get('employees/:id')
  @ApiOperation({ summary: 'Get employee by ID' })
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.employeesService.findOne(id, req.user.tenantId);
  }

  @Put('employees/:id')
  @ApiOperation({ summary: 'Update employee' })
  update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto, @Request() req: any) {
    return this.employeesService.update(id, dto, req.user.tenantId);
  }

  @Delete('employees/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Terminate employee (soft delete)' })
  remove(@Param('id') id: string, @Request() req: any) {
    return this.employeesService.remove(id, req.user.tenantId);
  }

  // ─── Leave Requests ────────────────────────────────────────────────────────

  @Post('employees/:id/leave')
  @ApiOperation({ summary: 'Submit leave request' })
  createLeave(
    @Param('id') id: string,
    @Body() dto: CreateLeaveRequestDto,
    @Request() req: any,
  ) {
    return this.employeesService.createLeaveRequest(id, dto, req.user.tenantId);
  }

  @Get('employees/:id/leave')
  @ApiOperation({ summary: 'Get employee leave requests' })
  getLeave(@Param('id') id: string, @Request() req: any) {
    return this.employeesService.getLeaveRequests(id, req.user.tenantId);
  }

  @Patch('leave/:leaveId/status')
  @ApiOperation({ summary: 'Approve or reject leave request' })
  updateLeaveStatus(
    @Param('leaveId') leaveId: string,
    @Body() dto: UpdateLeaveStatusDto,
    @Request() req: any,
  ) {
    return this.employeesService.updateLeaveStatus(leaveId, dto, req.user.tenantId, req.user.sub);
  }

  // ─── Departments ───────────────────────────────────────────────────────────

  @Get('departments')
  @ApiOperation({ summary: 'List departments' })
  getDepartments(@Request() req: any) {
    return this.employeesService.getDepartments(req.user.tenantId);
  }

  @Post('departments')
  @ApiOperation({ summary: 'Create department' })
  createDepartment(@Body() dto: CreateDepartmentDto, @Request() req: any) {
    return this.employeesService.createDepartment(dto, req.user.tenantId);
  }

  @Put('departments/:id')
  @ApiOperation({ summary: 'Update department' })
  updateDepartment(
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto,
    @Request() req: any,
  ) {
    return this.employeesService.updateDepartment(id, dto, req.user.tenantId);
  }

  // ─── Positions ─────────────────────────────────────────────────────────────

  @Get('positions')
  @ApiOperation({ summary: 'List positions' })
  getPositions(@Request() req: any) {
    return this.employeesService.getPositions(req.user.tenantId);
  }

  @Post('positions')
  @ApiOperation({ summary: 'Create position' })
  createPosition(@Body() dto: CreatePositionDto, @Request() req: any) {
    return this.employeesService.createPosition(dto, req.user.tenantId);
  }
}
