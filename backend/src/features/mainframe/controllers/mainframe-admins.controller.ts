import { Controller, Get, Post, Put, Body, Param } from '@nestjs/common';
import { MainframeAdminsService } from '../services/mainframe-admins.service';

@Controller('mainframe/admins')
export class MainframeAdminsController {
  constructor(
    private readonly mainframeAdminsService: MainframeAdminsService,
  ) {}

  @Post()
  async create(
    @Body()
    data: {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      role?: string;
    },
  ) {
    return this.mainframeAdminsService.create(data);
  }

  @Post('login')
  async login(@Body() data: { email: string; password: string }) {
    return this.mainframeAdminsService.login(data.email, data.password);
  }

  @Get()
  async findAll() {
    return this.mainframeAdminsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.mainframeAdminsService.findOne(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body()
    data: {
      firstName?: string;
      lastName?: string;
      role?: string;
      isActive?: boolean;
    },
  ) {
    return this.mainframeAdminsService.update(id, data);
  }

  @Post(':id/change-password')
  async changePassword(
    @Param('id') id: string,
    @Body('password') password: string,
  ) {
    return this.mainframeAdminsService.changePassword(id, password);
  }
}
