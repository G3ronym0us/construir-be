import { IsOptional, IsBoolean } from 'class-validator';
import { UpdateUserDto } from './update-user.dto';

export class UpdateUserAdminDto extends UpdateUserDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
