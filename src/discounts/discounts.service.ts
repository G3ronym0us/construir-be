import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Discount, DiscountType } from './discount.entity';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';
import { ValidateDiscountResponseDto } from './dto/validate-discount.dto';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';

@Injectable()
export class DiscountsService {
  constructor(
    @InjectRepository(Discount)
    private discountsRepository: Repository<Discount>,
    private exchangeRatesService: ExchangeRatesService,
  ) {}

  async create(createDiscountDto: CreateDiscountDto): Promise<Discount> {
    const existingDiscount = await this.discountsRepository.findOne({
      where: { code: createDiscountDto.code.toUpperCase() },
    });

    if (existingDiscount) {
      throw new ConflictException('Discount code already exists');
    }

    // Validaciones
    if (createDiscountDto.type === DiscountType.PERCENTAGE) {
      if (createDiscountDto.value < 0 || createDiscountDto.value > 100) {
        throw new BadRequestException(
          'Percentage discount must be between 0 and 100',
        );
      }
    }

    if (createDiscountDto.endDate && createDiscountDto.startDate) {
      if (createDiscountDto.endDate <= createDiscountDto.startDate) {
        throw new BadRequestException('End date must be after start date');
      }
    }

    const discount = this.discountsRepository.create({
      ...createDiscountDto,
      code: createDiscountDto.code.toUpperCase(),
    });

    return await this.discountsRepository.save(discount);
  }

  async findAll(): Promise<Discount[]> {
    return await this.discountsRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findAllActive(): Promise<Discount[]> {
    return await this.discountsRepository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findByUuid(uuid: string): Promise<Discount> {
    const discount = await this.discountsRepository.findOne({
      where: { uuid },
      relations: ['orders'],
    });

    if (!discount) {
      throw new NotFoundException(`Discount with UUID ${uuid} not found`);
    }

    return discount;
  }

  async findByCode(code: string): Promise<Discount> {
    const discount = await this.discountsRepository.findOne({
      where: { code: code.toUpperCase() },
    });

    if (!discount) {
      throw new NotFoundException(`Discount code "${code}" not found`);
    }

    return discount;
  }

  async update(
    uuid: string,
    updateDiscountDto: UpdateDiscountDto,
  ): Promise<Discount> {
    const discount = await this.findByUuid(uuid);

    if (
      updateDiscountDto.code &&
      updateDiscountDto.code.toUpperCase() !== discount.code
    ) {
      const existingDiscount = await this.discountsRepository.findOne({
        where: { code: updateDiscountDto.code.toUpperCase() },
      });

      if (existingDiscount) {
        throw new ConflictException('Discount code already exists');
      }
    }

    // Validaciones
    if (
      updateDiscountDto.type === DiscountType.PERCENTAGE &&
      updateDiscountDto.value !== undefined
    ) {
      if (updateDiscountDto.value < 0 || updateDiscountDto.value > 100) {
        throw new BadRequestException(
          'Percentage discount must be between 0 and 100',
        );
      }
    }

    if (updateDiscountDto.code) {
      updateDiscountDto.code = updateDiscountDto.code.toUpperCase();
    }

    Object.assign(discount, updateDiscountDto);
    return await this.discountsRepository.save(discount);
  }

  async remove(uuid: string): Promise<void> {
    const discount = await this.findByUuid(uuid);
    await this.discountsRepository.softRemove(discount);
  }

  async validateDiscount(
    code: string,
    orderTotal: number,
  ): Promise<ValidateDiscountResponseDto> {
    try {
      const discount = await this.findByCode(code);

      // Validar si está activo
      if (!discount.isActive) {
        return {
          valid: false,
          error: 'Este cupón no está activo',
        };
      }

      // Validar fechas
      const now = new Date();
      if (discount.startDate && now < discount.startDate) {
        return {
          valid: false,
          error: 'Este cupón aún no está disponible',
        };
      }

      if (discount.endDate && now > discount.endDate) {
        return {
          valid: false,
          error: 'Este cupón ha expirado',
        };
      }

      // Validar usos máximos
      if (discount.maxUses && discount.currentUses >= discount.maxUses) {
        return {
          valid: false,
          error: 'Este cupón ha alcanzado su límite de usos',
        };
      }

      // Validar monto mínimo de compra
      if (
        discount.minPurchaseAmount &&
        orderTotal < discount.minPurchaseAmount
      ) {
        return {
          valid: false,
          error: `El monto mínimo de compra para este cupón es $${discount.minPurchaseAmount}`,
        };
      }

      // Calcular descuento
      const discountAmount = this.calculateDiscountAmount(discount, orderTotal);
      const finalTotal = Math.max(0, orderTotal - discountAmount);

      // Calcular valores en VES
      let discountAmountVes: number | undefined;
      let finalTotalVes: number | undefined;

      try {
        const exchangeRate = await this.exchangeRatesService.getRate();
        discountAmountVes = Number((discountAmount * exchangeRate).toFixed(2));
        finalTotalVes = Number((finalTotal * exchangeRate).toFixed(2));
      } catch (error) {
        // Si no hay tipo de cambio disponible, continuar sin valores VES
        console.warn('Exchange rate not available for discount validation');
      }

      return {
        valid: true,
        discount: {
          uuid: discount.uuid,
          code: discount.code,
          description: discount.description,
          type: discount.type,
          value: Number(discount.value),
          discountAmount: Number(discountAmount.toFixed(2)),
          finalTotal: Number(finalTotal.toFixed(2)),
          discountAmountVes,
          finalTotalVes,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return {
          valid: false,
          error: 'Cupón no válido',
        };
      }
      throw error;
    }
  }

  calculateDiscountAmount(discount: Discount, orderTotal: number): number {
    let discountAmount = 0;

    if (discount.type === DiscountType.PERCENTAGE) {
      discountAmount = (orderTotal * Number(discount.value)) / 100;

      // Aplicar máximo descuento si está configurado
      if (
        discount.maxDiscountAmount &&
        discountAmount > discount.maxDiscountAmount
      ) {
        discountAmount = Number(discount.maxDiscountAmount);
      }
    } else if (discount.type === DiscountType.FIXED) {
      discountAmount = Number(discount.value);
    }

    // No puede ser mayor al total de la orden
    return Math.min(discountAmount, orderTotal);
  }

  async incrementUsage(uuid: string): Promise<void> {
    const discount = await this.findByUuid(uuid);
    discount.currentUses += 1;
    await this.discountsRepository.save(discount);
  }

  async getStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    expired: number;
    maxedOut: number;
  }> {
    const total = await this.discountsRepository.count();
    const active = await this.discountsRepository.count({
      where: { isActive: true },
    });
    const inactive = await this.discountsRepository.count({
      where: { isActive: false },
    });

    const now = new Date();
    const allDiscounts = await this.discountsRepository.find();

    const expired = allDiscounts.filter(
      (d) => d.endDate && d.endDate < now,
    ).length;

    const maxedOut = allDiscounts.filter(
      (d) => d.maxUses && d.currentUses >= d.maxUses,
    ).length;

    return { total, active, inactive, expired, maxedOut };
  }
}
