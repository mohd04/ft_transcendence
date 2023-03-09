import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { GameService } from './game.service';
import { CreateGameDto } from './dto/create-game.dto';
import { UpdateGameDto } from './dto/update-game.dto';
import { ApiTags } from '@nestjs/swagger';

@Controller('game')
@ApiTags('game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Post()
  create(@Body() createGameDto: CreateGameDto) {
    return this.gameService.create(createGameDto);
  }

  @Get()
  findAll() {
    return this.gameService.queryData({ where: { id: 1 } });
  }

  @Get()
  findAllGameObjects() {
    return this.gameService.findAll();
  }

  @Get(':updateGameDto')
  findUpdate() {
    return this.gameService.addIsPlayingToUser(1, true);
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.gameService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: number, @Body() updateGameDto: UpdateGameDto) {
    return this.gameService.update(+id, updateGameDto);
  }

  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.gameService.remove(+id);
  }
}
