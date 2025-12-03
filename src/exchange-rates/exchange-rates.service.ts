import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { ExchangeRate } from './exchange-rate.entity';
import { CreateExchangeRateDto } from './dto/create-exchange-rate.dto';
import { BCVService } from './bcv.service';

@Injectable()
export class ExchangeRatesService {
  private readonly logger = new Logger(ExchangeRatesService.name);

  constructor(
    @InjectRepository(ExchangeRate)
    private exchangeRatesRepository: Repository<ExchangeRate>,
    private bcvService: BCVService,
  ) {}

  async create(
    createExchangeRateDto: CreateExchangeRateDto,
  ): Promise<ExchangeRate> {
    // Verificar si ya existe un tipo de cambio para esta fecha
    const existingRate = await this.exchangeRatesRepository.findOne({
      where: { date: new Date(createExchangeRateDto.date) },
    });

    if (existingRate) {
      // Si existe, actualizar
      existingRate.rate = createExchangeRateDto.rate;
      if (createExchangeRateDto.source) {
        existingRate.source = createExchangeRateDto.source;
      }
      return await this.exchangeRatesRepository.save(existingRate);
    }

    // Si no existe, crear nuevo
    const exchangeRate = this.exchangeRatesRepository.create({
      date: new Date(createExchangeRateDto.date),
      rate: createExchangeRateDto.rate,
      source: createExchangeRateDto.source || 'bcv',
    });

    return await this.exchangeRatesRepository.save(exchangeRate);
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: ExchangeRate[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const [data, total] = await this.exchangeRatesRepository.findAndCount({
      order: { date: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findCurrent(): Promise<ExchangeRate> {
    // Obtener el tipo de cambio de hoy o el más reciente
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Intentar obtener el tipo de cambio de hoy o anterior
    const exchangeRate = await this.exchangeRatesRepository.findOne({
      where: {
        date: LessThanOrEqual(today),
      },
      order: { date: 'DESC' },
    });

    if (!exchangeRate) {
      throw new NotFoundException('No exchange rate found');
    }

    return exchangeRate;
  }

  async findByDate(date: Date): Promise<ExchangeRate> {
    // Normalizar la fecha (eliminar hora)
    const searchDate = new Date(date);
    searchDate.setHours(0, 0, 0, 0);

    // Buscar el tipo de cambio de la fecha específica o el más reciente anterior
    const exchangeRate = await this.exchangeRatesRepository.findOne({
      where: {
        date: LessThanOrEqual(searchDate),
      },
      order: { date: 'DESC' },
    });

    if (!exchangeRate) {
      throw new NotFoundException(
        `No exchange rate found for date ${searchDate.toISOString()}`,
      );
    }

    return exchangeRate;
  }

  async getRate(date?: Date): Promise<number> {
    const exchangeRate = date
      ? await this.findByDate(date)
      : await this.findCurrent();
    return Number(exchangeRate.rate);
  }

  async sync(): Promise<ExchangeRate> {
    this.logger.log('Starting exchange rate synchronization with BCV...');

    // Obtener tipo de cambio desde BCV
    const bcvRate = await this.bcvService.getBCVRate();

    if (!bcvRate) {
      throw new NotFoundException('Could not fetch exchange rate from BCV');
    }

    // Guardar en la base de datos
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const exchangeRate = await this.create({
      date: today.toISOString().split('T')[0],
      rate: bcvRate.rate,
      source: 'bcv',
    });

    this.logger.log(
      `Exchange rate synchronized successfully: ${exchangeRate.rate}`,
    );
    return exchangeRate;
  }
}
