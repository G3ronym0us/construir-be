import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class GetInvitationsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsIn(['pending', 'used', 'expired', 'all'])
  status?: 'pending' | 'used' | 'expired' | 'all';

  @IsOptional()
  @IsString()
  email?: string;
}
