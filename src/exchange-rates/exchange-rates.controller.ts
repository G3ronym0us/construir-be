import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ExchangeRatesService } from './exchange-rates.service';
import { GetExchangeRatesDto } from './dto/get-exchange-rates.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('exchange-rates')
export class ExchangeRatesController {
  constructor(private readonly exchangeRatesService: ExchangeRatesService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Query() query: GetExchangeRatesDto) {
    return this.exchangeRatesService.findAll(query.page, query.limit);
  }

  @Get('current')
  findCurrent() {
    return this.exchangeRatesService.findCurrent();
  }

  @UseGuards(JwtAuthGuard)
  @Post('sync')
  sync() {
    return this.exchangeRatesService.sync();
  }
}
