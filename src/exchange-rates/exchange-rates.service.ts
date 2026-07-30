import { Injectable, NotFoundException, Logger } from '@nestjs/common';
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

  /**
   * Tasa con la que se cotiza y se factura hoy: la fila más reciente por fecha
   * valor, **sin tope superior**.
   *
   * En modo `published` esa fila puede tener fecha valor futura: entre las
   * ~17:00 y medianoche de Caracas el BCV ya publicó la tasa que entra en
   * vigencia mañana, y el cron la guarda bajo esa fecha. Devolverla es lo
   * deseado: el catálogo (`product.priceVes`) ya se recalculó con ella, y
   * catálogo y factura tienen que coincidir — el cliente ve y paga el mismo
   * número.
   *
   * Para la tasa vigente en una fecha dada, usar `findByDate()`.
   */
  async findCurrent(): Promise<ExchangeRate> {
    const exchangeRate = await this.findLatest();

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

  /**
   * Última fila guardada por fecha valor, sin filtrar por la fecha de hoy.
   *
   * Es la consulta sobre la que se apoya `findCurrent()`; se mantiene aparte
   * porque el cron de detección necesita la fila cruda (puede no haber
   * ninguna) sin que eso sea un `NotFoundException`.
   */
  async findLatest(): Promise<ExchangeRate | null> {
    return this.exchangeRatesRepository.findOne({
      where: {},
      order: { date: 'DESC' },
    });
  }

  /**
   * Sincroniza la tasa publicada del servicio centralizado.
   *
   * Se guarda bajo la **fecha valor** que informa el servicio, no bajo la de
   * hoy: en modo `published` la tasa recibida puede ser la que entra en
   * vigencia mañana. Es idempotente: si ya existe una fila para esa fecha con
   * la misma tasa no se escribe nada y se devuelve la existente.
   */
  async sync(): Promise<ExchangeRate> {
    this.logger.log('Starting exchange rate synchronization with BCV...');

    // Obtener tipo de cambio desde el servicio centralizado
    const bcvRate = await this.bcvService.getBCVRate();

    if (!bcvRate) {
      throw new NotFoundException('Could not fetch exchange rate from BCV');
    }

    if (bcvRate.stale) {
      this.logger.warn(
        `La tasa recibida está marcada como stale (fecha valor ${bcvRate.effectiveDate})`,
      );
    }

    const existing = await this.exchangeRatesRepository.findOne({
      where: { date: new Date(bcvRate.effectiveDate) },
    });

    // Idempotencia: misma fecha y misma tasa => no se escribe.
    if (existing && Number(existing.rate) === bcvRate.rate) {
      this.logger.log(
        `Exchange rate already up to date for ${bcvRate.effectiveDate}: ${bcvRate.rate} (no write)`,
      );
      return existing;
    }

    if (existing) {
      existing.rate = bcvRate.rate;
      existing.source = 'bcv';
      const updated = await this.exchangeRatesRepository.save(existing);
      this.logger.log(
        `Exchange rate updated for ${bcvRate.effectiveDate}: ${updated.rate} (fuente ${bcvRate.source})`,
      );
      return updated;
    }

    const exchangeRate = await this.exchangeRatesRepository.save(
      this.exchangeRatesRepository.create({
        date: new Date(bcvRate.effectiveDate),
        rate: bcvRate.rate,
        source: 'bcv',
      }),
    );

    this.logger.log(
      `Exchange rate synchronized successfully for ${bcvRate.effectiveDate}: ${exchangeRate.rate} (fuente ${bcvRate.source})`,
    );
    return exchangeRate;
  }
}
