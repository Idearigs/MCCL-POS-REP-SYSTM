import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateSessionDto {
  @IsString()
  @IsNotEmpty()
  sessionName: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  remarks?: string;
}
