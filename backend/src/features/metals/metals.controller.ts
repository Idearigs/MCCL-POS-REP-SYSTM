import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { MetalsService, MetalPrice } from './metals.service';

const ALLOWED_METALS = ['XAU', 'XAG', 'XPT'];
const ALLOWED_CURRENCIES = ['USD', 'GBP'];

function normCurrency(currency?: string): string {
  const c = (currency || 'USD').toUpperCase();
  return ALLOWED_CURRENCIES.includes(c) ? c : 'USD';
}

@ApiTags('Metals')
@Controller('metals')
export class MetalsController {
  constructor(private readonly metalsService: MetalsService) {}

  @Get('gold')
  @ApiOperation({
    summary: 'Get live gold price (circuit-breaker protected)',
    description:
      'Returns the live XAU price in the requested currency (USD default, GBP ' +
      'supported). If the upstream feed is failing, the circuit opens and the ' +
      'last-known cached price is returned with stale=true.',
  })
  @ApiQuery({ name: 'currency', required: false, enum: ALLOWED_CURRENCIES })
  async getGold(@Query('currency') currency?: string): Promise<MetalPrice> {
    return this.metalsService.getPrice('XAU', normCurrency(currency));
  }

  @Get(':metal')
  @ApiOperation({ summary: 'Get a metal price (XAU, XAG, XPT)' })
  @ApiQuery({ name: 'currency', required: false, enum: ALLOWED_CURRENCIES })
  async getMetal(
    @Param('metal') metal: string,
    @Query('currency') currency?: string,
  ): Promise<MetalPrice> {
    const m = (metal || 'XAU').toUpperCase();
    return this.metalsService.getPrice(
      (ALLOWED_METALS.includes(m) ? m : 'XAU') as 'XAU' | 'XAG' | 'XPT',
      normCurrency(currency),
    );
  }
}
