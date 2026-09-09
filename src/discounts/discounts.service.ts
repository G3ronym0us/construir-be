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

/**
 * La ÚNICA respuesta que da un cupón que no se aplica, sea cual sea el motivo.
 *
 * **Antes esto era un oráculo de cupones.** `validateDiscount` distinguía por
 * el mensaje entre "el código no existe" (`Cupón no válido`) y "el código
 * existe pero caducó" (`Este cupón ha expirado`), más otros tres estados que
 * también confirmaban la existencia. Y se llega hasta acá desde tres rutas
 * públicas sin sesión: `POST /discounts/validate`, `POST /orders/quote` y
 * `POST /orders`. Con eso se podía recorrer un diccionario de códigos y separar
 * los que existen de los que no, con una señal limpia y sin coste — la misma
 * clase de fallo que se acaba de cerrar en el buscador de invitados, sólo que
 * cosechando cupones en vez de cédulas. Un cupón caducado o agotado no es
 * inofensivo: dice qué códigos genera esta tienda y con qué forma, que es la
 * mitad del trabajo para adivinar el que sí está vivo.
 *
 * Se unifica acá, en el servicio, y no en cada controlador, porque el oráculo
 * no era una ruta: era esta función, y las tres rutas sólo la exponían.
 *
 * **El equilibrio con el cliente legítimo.** Al que escribe mal un cupón no se
 * le puede decir en cuál de los cinco motivos cayó sin volver a abrir el canal,
 * pero lo que necesita saber no es el motivo: es (a) que NO se le aplicó —si
 * no, paga de más creyendo que sí— y (b) qué revisar. El mensaje enumera de
 * una vez todas las causas posibles sin decir cuál es la suya: mal escrito,
 * vencido, o el pedido no cumple las condiciones. Con un solo texto los cinco
 * casos quedan accionables.
 *
 * Lo que se pierde de verdad es un caso: el del monto mínimo, donde antes se
 * decía la cifra que faltaba y ahora sólo se menciona que puede haber
 * condiciones. Se acepta a sabiendas — esa cifra confirmaba la existencia del
 * cupón igual que los demás mensajes, y el sitio para publicarla es el anuncio
 * del cupón, no un error que le responde a cualquiera que pregunte.
 */
// Congelado porque se devuelve SIEMPRE el mismo objeto a todos los que
// preguntan: si alguien río abajo le añadiera un detalle ("faltan $5") estaría
// reabriendo el oráculo para todas las llamadas siguientes, y en silencio.
const CUPON_RECHAZADO: ValidateDiscountResponseDto = Object.freeze({
  valid: false,
  error:
    'No pudimos aplicar este cupón. Revisá que esté bien escrito, que siga ' +
    'vigente y que tu pedido cumpla sus condiciones.',
});

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
        return CUPON_RECHAZADO;
      }

      // Validar fechas
      const now = new Date();
      if (discount.startDate && now < discount.startDate) {
        return CUPON_RECHAZADO;
      }

      if (discount.endDate && now > discount.endDate) {
        return CUPON_RECHAZADO;
      }

      // Validar usos máximos
      if (discount.maxUses && discount.currentUses >= discount.maxUses) {
        return CUPON_RECHAZADO;
      }

      // Validar monto mínimo de compra
      if (
        discount.minPurchaseAmount &&
        orderTotal < discount.minPurchaseAmount
      ) {
        return CUPON_RECHAZADO;
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
        return CUPON_RECHAZADO;
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
