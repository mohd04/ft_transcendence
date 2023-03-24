import { WebSocketGateway, SubscribeMessage, MessageBody, OnGatewayConnection, OnGatewayDisconnect, WebSocketServer, ConnectedSocket } from '@nestjs/websockets';
import { GameService } from './game.service';
import { GameEngine } from './game.engine';
import { SocketData, UserMap, GameStatus } from './interface/game.interface';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuid4 } from 'uuid';

@WebSocketGateway()
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  private gameRooms: GameEngine = {};
  private users: SocketData[] = [ ]
  private userSockets: UserMap = new Map<string, SocketData>();

  constructor(
    private readonly gameService: GameService,
    private readonly jwtService: JwtService,

    ) {}

  handleConnection(client: Socket) {
    const token = client.handshake.auth.token;
    const userid = this.jwtService.verify(token, {
      secret: process.env.JWT_SECRET
    });

    client.data.userID = userid;
  }

  handleDisconnect(client: any) {
    const token = client.handshake.auth.token;
    const userid = this.jwtService.verify(token, {
      secret: process.env.JWT_SECRET
    });
    console.log('User disconnected: ', userid);
    this.users = this.users.filter(user => user.userID !== userid);
    this.userSockets.delete(userid);
  }

  createGameRoom(
    player1: SocketData,
    player2: SocketData
  ) {
    const id = uuid4();
    const gameRoom = new GameRoom(id, player1, player2);
  }

  @SubscribeMessage('Register')
  async registerUser(@ConnectedSocket() client: Socket) {
    let socketData: SocketData;
    const userID = client.data.userID;
    if (!this.userSockets.has(userID)) {
      socketData = {
        playerNumber: -1,
        client: client,
        gameID: '',
        userID: userID,
        status: GameStatus.WAITING
      };
      // this.userSockets.set(userID, socketData);
    }

    if (this.users.length >= 2) {
      this.users[0].playerNumber = 1;
      this.users[0].status = GameStatus.READY;
      socketData.playerNumber = 2;
      socketData.status = GameStatus.READY;
      // const roomID = this.gameRooms.createGame(this.users[0], socketData);
    }

    socketData.status = GameStatus.READY;
    this.users.push(socketData);
  }

  dissconnectUser() {

  }
}
