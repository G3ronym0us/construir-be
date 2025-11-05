import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { ShippingAddress } from './shipping-address.entity';
import { PaymentInfo } from './payment-info.entity';
import { Cart } from '../cart/cart.entity';
import { Product } from '../products/product.entity';
import { User } from '../users/user.entity';
import { S3Service } from '../products/s3.service';
import { EmailService } from '../email/email.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      ShippingAddress,
      PaymentInfo,
      Cart,
      Product,
      User,
    ]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService, S3Service, EmailService],
  exports: [OrdersService],
})
export class OrdersModule {}
