import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { CustomerUsersService } from '../services/customer-users.service';
import { CreateCustomerUserDto, UpdateCustomerUserDto } from '../dto/customer-profile.dto';

@Controller('mainframe/customer-users')
export class CustomerUsersController {
  constructor(private readonly customerUsersService: CustomerUsersService) {}

  @Post()
  async create(@Body() dto: CreateCustomerUserDto) {
    return this.customerUsersService.create(dto);
  }

  @Get('profile/:profileId')
  async findAllByProfile(@Param('profileId') profileId: string) {
    return this.customerUsersService.findAllByProfile(profileId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.customerUsersService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCustomerUserDto) {
    return this.customerUsersService.update(id, dto);
  }

  @Post(':id/reset-password')
  async resetPassword(@Param('id') id: string) {
    return this.customerUsersService.resetPassword(id);
  }

  @Post(':id/deactivate')
  async deactivate(@Param('id') id: string) {
    return this.customerUsersService.deactivate(id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.customerUsersService.delete(id);
  }
}
