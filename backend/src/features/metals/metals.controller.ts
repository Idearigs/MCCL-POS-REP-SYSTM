import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MetalsService, MetalPrice } from './metals.service';

@ApiTags('Metals')
@Controller('metals')
export class MetalsController {
  constructor(private readonly metalsService: MetalsService) {}

  @Get('gold')
  @ApiOperation({
    summary: 'Get live gold price (circuit-breaker protected)',
    description:
      'Returns the live XAU/USD price. If the upstream feed is failing, the ' +
      'circuit opens and the last-known cached price is returned with stale=true.',
  })
  async getGold(): Promise<MetalPrice> {
    return this.metalsService.getPrice('XAU');
  }

  @Get(':metal')
  @ApiOperation({ summary: 'Get a metal price (XAU, XAG, XPT)' })
  async getMetal(@Param('metal') metal: string): Promise<MetalPrice> {
    const m = (metal || 'XAU').toUpperCase();
    const allowed = ['XAU', 'XAG', 'XPT'];
    return this.metalsService.getPrice(
      (allowed.includes(m) ? m : 'XAU') as 'XAU' | 'XAG' | 'XPT',
    );
  }
}
