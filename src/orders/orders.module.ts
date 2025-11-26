import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { ShippingAddress } from './shipping-address.entity';
import { PaymentInfo } from './payment-info.entity';
import { GuestCustomer } from './guest-customer.entity';
import { Cart } from '../cart/cart.entity';
import { Product } from '../products/product.entity';
import { User } from '../users/user.entity';
import { S3Service } from '../products/s3.service';
import { EmailService } from '../email/email.service';
import { DiscountsModule } from '../discounts/discounts.module';
import { BanksModule } from '../banks/banks.module';
import { ExchangeRatesModule } from '../exchange-rates/exchange-rates.module';
import { GuestCustomersService } from './guest-customers.service';
import { GuestCustomersController } from './guest-customers.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      ShippingAddress,
      PaymentInfo,
      GuestCustomer,
      Cart,
      Product,
      User,
    ]),
    DiscountsModule,
    BanksModule,
    ExchangeRatesModule,
  ],
  controllers: [OrdersController, GuestCustomersController],
  providers: [OrdersService, GuestCustomersService, S3Service, EmailService],
  exports: [OrdersService, GuestCustomersService],
})
export class OrdersModule {}
