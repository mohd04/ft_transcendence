import { ApiProperty } from "@nestjs/swagger";
import { IsNumber } from "class-validator";

export class CreateGameDto {

	@IsNumber()
	@ApiProperty()
	player1Id: number;

	@IsNumber()
	@ApiProperty()
	player2Id: number;

	@IsNumber()
	@ApiProperty()
	winnerId: number;
	
	@IsNumber()
	@ApiProperty()
	ballX: number;

	@IsNumber()
	@ApiProperty()
	ballY: number;

	@ApiProperty()
	isPaused: boolean;

	@IsNumber()
	@ApiProperty()
	map: number;
}
