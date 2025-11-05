import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  async getCart(@Request() req) {
    return this.cartService.getCart(req.user.userId);
  }

  @Post('items')
  async addItem(@Request() req, @Body() addToCartDto: AddToCartDto) {
    return this.cartService.addItem(req.user.userId, addToCartDto);
  }

  @Patch('items/:id')
  async updateItem(
    @Request() req,
    @Param('id') id: string,
    @Body() updateCartItemDto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(
      req.user.userId,
      +id,
      updateCartItemDto,
    );
  }

  @Delete('items/:id')
  async removeItem(@Request() req, @Param('id') id: string) {
    return this.cartService.removeItem(req.user.userId, +id);
  }

  @Delete()
  async clearCart(@Request() req) {
    return this.cartService.clearCart(req.user.userId);
  }

  @Post('sync-prices')
  async syncPrices(@Request() req) {
    return this.cartService.syncCartPrices(req.user.userId);
  }
}
