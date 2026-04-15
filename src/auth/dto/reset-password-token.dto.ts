import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordTokenDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @MinLength(6)
  newPassword: string;
}
