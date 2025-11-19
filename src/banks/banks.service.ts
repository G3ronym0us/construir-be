import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bank } from './bank.entity';

@Injectable()
export class BanksService {
  constructor(
    @InjectRepository(Bank)
    private banksRepository: Repository<Bank>,
  ) {}

  async findAll(): Promise<Bank[]> {
    return this.banksRepository.find({
      where: { active: true },
      order: { name: 'ASC' },
    });
  }

  async findByCode(code: string): Promise<Bank | null> {
    return this.banksRepository.findOne({
      where: { code, active: true },
    });
  }
}
