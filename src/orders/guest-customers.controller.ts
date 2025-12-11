import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { GuestCustomersService } from './guest-customers.service';
import { GuestCustomer, IdentificationType } from './guest-customer.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrderAdminGuard } from '../auth/guards/order-admin.guard';

@Controller('guest-customers')
export class GuestCustomersController {
  constructor(private readonly guestCustomersService: GuestCustomersService) {}

  /**
   * Busca datos de un cliente guest por su identificación
   * Endpoint público para autocompletar formularios
   */
  @Get('search')
  async searchByIdentification(
    @Query('identificationType') identificationType: IdentificationType,
    @Query('identificationNumber') identificationNumber: string,
  ): Promise<GuestCustomer | null> {
    if (!identificationType || !identificationNumber) {
      return null;
    }

    return this.guestCustomersService.findByIdentification(
      identificationType,
      identificationNumber,
    );
  }

  /**
   * Lista todos los clientes guest (solo admin)
   * Para campañas de marketing
   */
  @Get()
  @UseGuards(JwtAuthGuard, OrderAdminGuard)
  async findAll(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<{ data: GuestCustomer[]; total: number }> {
    const [data, total] = await Promise.all([
      this.guestCustomersService.findAll(limit || 100, offset || 0),
      this.guestCustomersService.count(),
    ]);

    return { data, total };
  }
}
