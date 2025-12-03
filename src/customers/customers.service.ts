import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { GuestCustomer } from '../orders/guest-customer.entity';
import { Order, OrderStatus } from '../orders/order.entity';
import { GetCustomersDto } from './dto/get-customers.dto';
import {
  CustomerResponseDto,
  CustomerListResponseDto,
  CustomerDetailResponseDto,
} from './dto/customer-response.dto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(GuestCustomer)
    private guestCustomerRepository: Repository<GuestCustomer>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
  ) {}

  async findAll(dto: GetCustomersDto): Promise<CustomerListResponseDto> {
    // Valores por defecto para paginación
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;

    // Obtener usuarios registrados con estadísticas
    const usersWithStats = await this.getUsersWithStats();

    // Obtener guests con estadísticas
    const guestsWithStats = await this.getGuestsWithStats();

    // Unificar
    let allCustomers: CustomerResponseDto[] = [
      ...usersWithStats,
      ...guestsWithStats,
    ];

    // Filtrar por búsqueda si existe
    if (dto.search) {
      const searchLower = dto.search.toLowerCase();
      allCustomers = allCustomers.filter(
        (c) =>
          c.name.toLowerCase().includes(searchLower) ||
          c.email.toLowerCase().includes(searchLower) ||
          (c.phone && c.phone.toLowerCase().includes(searchLower)) ||
          (c.identification &&
            c.identification.toLowerCase().includes(searchLower)),
      );
    }

    // Ordenar
    allCustomers.sort((a, b) => {
      const sortBy = dto.sortBy || 'lastOrderDate';
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      // Manejar fechas
      if (aValue instanceof Date) aValue = aValue.getTime();
      if (bValue instanceof Date) bValue = bValue.getTime();

      // Manejar null
      if (aValue === null) return 1;
      if (bValue === null) return -1;

      if (dto.sortOrder === 'ASC') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    const total = allCustomers.length;
    const totalPages = Math.ceil(total / limit);

    // Paginar
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedCustomers = allCustomers.slice(start, end);

    return {
      data: paginatedCustomers,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findOne(id: string): Promise<CustomerDetailResponseDto> {
    const [type, numericId] = id.split('-');

    if (type === 'user') {
      return await this.getRegisteredCustomerDetail(parseInt(numericId));
    } else if (type === 'guest') {
      return await this.getGuestCustomerDetail(parseInt(numericId));
    }

    throw new Error('Invalid customer ID format');
  }

  async exportToCSV(): Promise<string> {
    const { data } = await this.findAll({
      page: 1,
      limit: 999999,
      sortBy: 'lastOrderDate',
      sortOrder: 'DESC',
    });

    const headers = [
      'Tipo',
      'Nombre',
      'Email',
      'Teléfono',
      'Identificación',
      'Total Órdenes',
      'Total Gastado (USD)',
      'Total Gastado (VES)',
      'Primera Compra',
      'Última Compra',
      'Fecha Registro',
    ];

    const rows = data.map((c) => [
      c.type === 'registered' ? 'Registrado' : 'Invitado',
      c.name,
      c.email,
      c.phone || '',
      c.identification || '',
      c.totalOrders.toString(),
      c.totalSpent.toFixed(2),
      c.totalSpentVes.toFixed(2),
      c.firstOrderDate ? c.firstOrderDate.toISOString().split('T')[0] : '',
      c.lastOrderDate ? c.lastOrderDate.toISOString().split('T')[0] : '',
      c.createdAt.toISOString().split('T')[0],
    ]);

    const csvRows = [headers, ...rows];
    return csvRows
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');
  }

  private async getUsersWithStats(): Promise<CustomerResponseDto[]> {
    const users = await this.userRepository.find();

    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const orders = await this.orderRepository.find({
          where: { userId: user.id },
        });

        const confirmedOrders = orders.filter((o) =>
          [
            OrderStatus.CONFIRMED,
            OrderStatus.PROCESSING,
            OrderStatus.SHIPPED,
            OrderStatus.DELIVERED,
          ].includes(o.status),
        );

        const totalSpent = confirmedOrders.reduce(
          (sum, o) => sum + Number(o.total),
          0,
        );
        const totalSpentVes = confirmedOrders.reduce(
          (sum, o) => sum + (o.totalVes ? Number(o.totalVes) : 0),
          0,
        );

        const orderDates = confirmedOrders.map((o) => o.createdAt).sort();

        return {
          id: `user-${user.id}`,
          type: 'registered' as const,
          name:
            `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
            user.email,
          email: user.email,
          phone: null,
          identification: null,
          totalOrders: confirmedOrders.length,
          totalSpent,
          totalSpentVes,
          firstOrderDate: orderDates[0] || null,
          lastOrderDate: orderDates[orderDates.length - 1] || null,
          createdAt: user.createdAt,
        };
      }),
    );

    return usersWithStats.filter((u) => u.totalOrders > 0);
  }

  private async getGuestsWithStats(): Promise<CustomerResponseDto[]> {
    const guests = await this.guestCustomerRepository.find();

    const guestsWithStats = await Promise.all(
      guests.map(async (guest) => {
        const orders = await this.orderRepository.find({
          where: { guestEmail: guest.email },
        });

        const confirmedOrders = orders.filter((o) =>
          [
            OrderStatus.CONFIRMED,
            OrderStatus.PROCESSING,
            OrderStatus.SHIPPED,
            OrderStatus.DELIVERED,
          ].includes(o.status),
        );

        const totalSpent = confirmedOrders.reduce(
          (sum, o) => sum + Number(o.total),
          0,
        );
        const totalSpentVes = confirmedOrders.reduce(
          (sum, o) => sum + (o.totalVes ? Number(o.totalVes) : 0),
          0,
        );

        const orderDates = confirmedOrders.map((o) => o.createdAt).sort();

        return {
          id: `guest-${guest.id}`,
          type: 'guest' as const,
          name: `${guest.firstName} ${guest.lastName}`,
          email: guest.email,
          phone: guest.phone,
          identification: guest.identificationNumber
            ? `${guest.identificationType}-${guest.identificationNumber}`
            : null,
          totalOrders: confirmedOrders.length,
          totalSpent,
          totalSpentVes,
          firstOrderDate: orderDates[0] || null,
          lastOrderDate: orderDates[orderDates.length - 1] || null,
          createdAt: guest.createdAt,
        };
      }),
    );

    return guestsWithStats.filter((g) => g.totalOrders > 0);
  }

  private async getRegisteredCustomerDetail(
    userId: number,
  ): Promise<CustomerDetailResponseDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const orders = await this.orderRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    const confirmedOrders = orders.filter((o) =>
      [
        OrderStatus.CONFIRMED,
        OrderStatus.PROCESSING,
        OrderStatus.SHIPPED,
        OrderStatus.DELIVERED,
      ].includes(o.status),
    );

    const totalSpentUSD = confirmedOrders.reduce(
      (sum, o) => sum + Number(o.total),
      0,
    );
    const totalSpentVES = confirmedOrders.reduce(
      (sum, o) => sum + (o.totalVes ? Number(o.totalVes) : 0),
      0,
    );

    const orderDates = confirmedOrders.map((o) => o.createdAt).sort();

    const recentOrders = confirmedOrders.slice(0, 10).map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      date: o.createdAt,
      total: Number(o.total),
      status: o.status,
    }));

    return {
      customer: {
        id: `user-${user.id}`,
        type: 'registered',
        name:
          `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        email: user.email,
        phone: null,
        identification: null,
        createdAt: user.createdAt,
      },
      stats: {
        totalOrders: confirmedOrders.length,
        totalSpentUSD: Number(totalSpentUSD.toFixed(2)),
        totalSpentVES: Number(totalSpentVES.toFixed(2)),
        averageOrderValue:
          confirmedOrders.length > 0
            ? Number((totalSpentUSD / confirmedOrders.length).toFixed(2))
            : 0,
        firstOrderDate: orderDates[0] || null,
        lastOrderDate: orderDates[orderDates.length - 1] || null,
      },
      recentOrders,
    };
  }

  private async getGuestCustomerDetail(
    guestId: number,
  ): Promise<CustomerDetailResponseDto> {
    const guest = await this.guestCustomerRepository.findOne({
      where: { id: guestId },
    });
    if (!guest) throw new Error('Guest customer not found');

    const orders = await this.orderRepository.find({
      where: { guestEmail: guest.email },
      order: { createdAt: 'DESC' },
    });

    const confirmedOrders = orders.filter((o) =>
      [
        OrderStatus.CONFIRMED,
        OrderStatus.PROCESSING,
        OrderStatus.SHIPPED,
        OrderStatus.DELIVERED,
      ].includes(o.status),
    );

    const totalSpentUSD = confirmedOrders.reduce(
      (sum, o) => sum + Number(o.total),
      0,
    );
    const totalSpentVES = confirmedOrders.reduce(
      (sum, o) => sum + (o.totalVes ? Number(o.totalVes) : 0),
      0,
    );

    const orderDates = confirmedOrders.map((o) => o.createdAt).sort();

    const recentOrders = confirmedOrders.slice(0, 10).map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      date: o.createdAt,
      total: Number(o.total),
      status: o.status,
    }));

    return {
      customer: {
        id: `guest-${guest.id}`,
        type: 'guest',
        name: `${guest.firstName} ${guest.lastName}`,
        email: guest.email,
        phone: guest.phone,
        identification: guest.identificationNumber
          ? `${guest.identificationType}-${guest.identificationNumber}`
          : null,
        createdAt: guest.createdAt,
      },
      stats: {
        totalOrders: confirmedOrders.length,
        totalSpentUSD: Number(totalSpentUSD.toFixed(2)),
        totalSpentVES: Number(totalSpentVES.toFixed(2)),
        averageOrderValue:
          confirmedOrders.length > 0
            ? Number((totalSpentUSD / confirmedOrders.length).toFixed(2))
            : 0,
        firstOrderDate: orderDates[0] || null,
        lastOrderDate: orderDates[orderDates.length - 1] || null,
      },
      recentOrders,
    };
  }
}
