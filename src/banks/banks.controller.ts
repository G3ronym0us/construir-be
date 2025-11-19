import { Controller, Get } from '@nestjs/common';
import { BanksService } from './banks.service';
import { Bank } from './bank.entity';

@Controller('banks')
export class BanksController {
  constructor(private readonly banksService: BanksService) {}

  @Get()
  async findAll(): Promise<Bank[]> {
    return this.banksService.findAll();
  }
}
