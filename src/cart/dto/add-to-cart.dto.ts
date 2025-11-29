import { IsInt, IsString, Min } from 'class-validator';

export class AddToCartDto {
  @IsString()
  productUuid: string;

  @IsInt()
  @Min(1)
  quantity: number;
}
