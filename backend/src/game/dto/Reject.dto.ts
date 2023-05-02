import { IsString, IsNotEmpty } from 'class-validator';

export class RejectDto {
  @IsString()
  @IsNotEmpty()
  inviteID: string;
}
