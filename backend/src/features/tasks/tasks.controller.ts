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
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import {
  CreateTaskDto,
  UpdateTaskDto,
  AddCommentDto,
  TaskStatus,
} from './dto/task.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { TenantGuard } from '../../shared/guards/tenant.guard';
import { CurrentUser } from '../../shared/decorators/user.decorator';
import { TenantId } from '../../shared/decorators/tenant.decorator';

@Controller('tasks')
@UseGuards(JwtAuthGuard, TenantGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  async create(
    @Body() dto: CreateTaskDto,
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.tasksService.create(tenantId, userId, dto);
  }

  @Get()
  async findAll(
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
    @Query('status') status?: TaskStatus,
    @Query('priority') priority?: string,
    @Query('assignedToMe') assignedToMe?: string,
    @Query('createdByMe') createdByMe?: string,
  ) {
    return this.tasksService.findAll(tenantId, userId, {
      status,
      priority,
      assignedToMe: assignedToMe === 'true',
      createdByMe: createdByMe === 'true',
    });
  }

  @Get('my-tasks')
  async getMyTasks(
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.tasksService.getMyTasks(tenantId, userId);
  }

  @Get('stats')
  async getStats(
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.tasksService.getStats(tenantId, userId);
  }

  @Get(':id')
  async findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.tasksService.findOne(tenantId, id);
  }

  @Put(':id')
  async update(
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(tenantId, id, userId, dto);
  }

  @Delete(':id')
  async delete(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.tasksService.delete(tenantId, id);
  }

  @Post(':id/comments')
  async addComment(
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: AddCommentDto,
  ) {
    return this.tasksService.addComment(tenantId, id, userId, dto);
  }
}
