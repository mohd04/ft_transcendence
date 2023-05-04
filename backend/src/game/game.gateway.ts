import {
	WebSocketGateway,
	SubscribeMessage,
	MessageBody,
	OnGatewayConnection,
	OnGatewayDisconnect,
	WebSocketServer,
	ConnectedSocket,
} from '@nestjs/websockets';
import { ValidationPipe, UsePipes } from '@nestjs/common';
import { GameService } from './game.service';
import { GameEngine } from './game.engine';
import {
	SocketData,
	UserMap,
	GameStatus,
	Game,
	KeyPress,
} from './interface/game.interface';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuid4 } from 'uuid';
import { UsersService } from 'src/users/users.service';
import { RegisterDto } from './dto/Register.dto';
import { InviteDto } from './dto/Invite.dto';
import { AcceptDto } from './dto/Accept.dto';
import { RejectDto } from './dto/Reject.dto';
import { MoveMouseDto } from './dto/moveMouse.dto';
import { MoveDto } from './dto/Move.dto';
import { StartGameDto } from './dto/StartGame.dto';

@WebSocketGateway(8002, {
	cors: {
		origin: process.env.FRONTEND_BASE_URL,
		credentials: true,
	},
})
// @WebSocketGateway()
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  private gameRooms: GameEngine[] = [];
  private defaultQ: SocketData[] = [];
  private WallQ: SocketData[] = [];
  private mobile: SocketData[] = [];
  private userSockets: UserMap = new Map<string, SocketData>();

  constructor(
    private readonly gameService: GameService,
    private readonly jwtService: JwtService,
    private usersService: UsersService,
  ) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.auth.token;
    const userid = this.jwtService.verify(token, {
      secret: process.env.JWT_SECRET,
    });

    console.log('User connected: ', userid);
    client.data.userID = userid;
    const user = await this.usersService.findOne(client.data.userID['login']);
    client.data.userID['login'] = user.username;
    console.log('User connected: ', userid);

    this.setUserStatus(client, GameStatus.WAITING);
  }

  handleDisconnect(client: any) {
    const token = client.handshake.auth.token;
    const userid = this.jwtService.verify(token, {
      secret: process.env.JWT_SECRET,
    });
    console.log('User disconnected: ', userid);
    this.defaultQ = this.defaultQ.filter((user: any) => user.userID.login !== userid.login);
    this.userSockets.delete(userid);
  }
  createGameRoom(player1: SocketData, player2: SocketData, hasMiddleWall: boolean) {
    const id = uuid4();
    const game: Game = {
      gameID: id,
      player1: player1.userID,
      player2: player2.userID,
      player1Score: 0,
      player2Score: 0,
    };
    const gameRoom = new GameEngine(
      game,
      this.server,
      player1,
      player2,
      this.gameService,
      hasMiddleWall,
    );
    gameRoom.startSettings();
    this.gameRooms[id] = gameRoom;
    return id;
  }

  setUserStatus(client: Socket, status: GameStatus) {
    const userID = client.data.userID;
    if (!this.userSockets.has(userID)) {
      const socketData: SocketData = {
        playerNumber: -1,
        client: client,
        gameID: '',
        userID: userID,
        status: status,
      };
      this.userSockets.set(userID, socketData);
      return socketData;
    }
    const socketData = this.userSockets.get(userID);
    socketData.status = status;
    return socketData;
  }

  @UsePipes(new ValidationPipe())
  @SubscribeMessage('Register')
  async registerUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: RegisterDto,
  ) {
    let socketData: SocketData = this.setUserStatus(client, GameStatus.WAITING);

    const queue = data.hasMiddleWall ? this.WallQ : this.defaultQ;

    if (
      queue.find(
        (user) => user.userID['id'] === socketData.userID['id'],
      )) {
      this.server.to(client.id).emit('error');
      return;
    }

    if (queue.length >= 1) {
      this.initGameRoom(socketData, queue[0], data.hasMiddleWall);
      queue.splice(0, 1);
    } else {
      socketData.status = GameStatus.QUEUED;
      queue.push(socketData);
    }
  }

  @UsePipes(new ValidationPipe())
  @SubscribeMessage('Invite')
  async inviteUser(@MessageBody() data: InviteDto, @ConnectedSocket() client: Socket) {
    console.log('Inviting user');
    const userID = client.data.userID.id;
    const invitedUserID = await this.usersService.getUserIDByUserName(data.username);
    if (await this.usersService.checkIfUserExists(invitedUserID) == null)
      throw new Error('User does not exist');
    const socketData: SocketData = this.setUserStatus(
      client,
      GameStatus.WAITING,
    );
    console.log('User is invited');
    if ((await this.usersService.checkIfUserSentThreeInvites(userID, data.id))) {
      return new Error('You have already sent three invites to this user');
    }
    const invitedSocketData = this.userSockets.get(invitedUserID);
    const invite = await this.usersService.createInvite({type: 'GAME', receiverId: invitedUserID}, userID);
    if (invitedSocketData)
      this.server.to(invitedSocketData.client.id).emit('Invited', {...client.data.userID, inviteId: invite.id});
  }

  @UsePipes(new ValidationPipe())
  @SubscribeMessage('Accept')
  async acceptInvitation(
    @MessageBody() data: AcceptDto,
    @ConnectedSocket() client: Socket,
  ) {
    console.log()
    const userID = client.data.userID;
    const socketData: SocketData = this.setUserStatus(client, GameStatus.READY);
    const checkInvite = await this.usersService.getInvite(data.inviteID);
    if (!checkInvite)
      return;
    const sender = this.userSockets.get(checkInvite.senderId);
    if (!sender || sender.status !== GameStatus.WAITING)
      return;
    const invite = await this.usersService.acceptInvite(data.inviteID);
    if (invite) {
      const invitedSocketData = this.userSockets.get(invite.receiverId);
      this.initGameRoom(invitedSocketData, invitedSocketData.userID.id, data.hasMiddleWall);
    }
  }

  @UsePipes(new ValidationPipe())
  @SubscribeMessage('Reject')
  async rejectInvitation(
    @MessageBody() data: RejectDto,
    @ConnectedSocket() client: Socket,
  ) {
    const userID = client.data.userID;
    const socketData: SocketData = this.setUserStatus(client, GameStatus.WAITING);
    const invite = await this.usersService.rejectInvite(data.inviteID);
    if (invite) {
      console.log(invite);
      const invitedSocketData = this.userSockets.get(invite.senderId);
      this.server.to(invitedSocketData.client.id).emit('Rejected', userID);
    }
  }

  @UsePipes(new ValidationPipe())
  @SubscribeMessage('moveMouse')
  handleMoveMouse(@MessageBody() data: MoveMouseDto, @ConnectedSocket() client: Socket) {
    const roomId = data.roomID;
    if (roomId in this.gameRooms)
      this.gameRooms[roomId].moveMouse(data.y, client);
  }

  @UsePipes(new ValidationPipe())
  @SubscribeMessage('move')
  handleMove(@MessageBody() data: MoveDto, @ConnectedSocket() client: Socket) {
    const roomId = data.roomID;
    const keyStatus: KeyPress = data.key;
    const isPressed = data.isPressed;
    if (roomId in this.gameRooms)
      this.gameRooms[roomId].barSelect(keyStatus, client, isPressed);
  }

  @UsePipes(new ValidationPipe())
  @SubscribeMessage('StartGame')
  async startGame(@MessageBody() data: StartGameDto, @ConnectedSocket() client: Socket) {
    console.log('start game');
    const roomID = data.roomID;
    const socketData: SocketData = this.setUserStatus(client, GameStatus.READY);

    if (!this.gameRooms[roomID]) {
      console.log('disconnected');
      client.disconnect();
      return;
    }
    if (socketData.status === GameStatus.READY) {
      if (socketData.gameID === roomID) {
        client.join(roomID);
      }
    }
    if (this.gameRooms[roomID]) {
      this.gameRooms[roomID].startGame(data.hasMiddleWall);
    }
  }

  private initGameRoom(player2: SocketData, player1: SocketData, middleWall: boolean = false) {
    player1.playerNumber = 1;
    player1.status = GameStatus.READY;
    player2.playerNumber = 2;
    player2.status = GameStatus.READY;
    const roomID = this.createGameRoom(player1, player2, middleWall);
    player1.gameID = roomID;
    player2.gameID = roomID;
    this.server.to(player2.client.id).emit('start', {
      playerNo: 2,
      players: {
        player1: player1.userID,
        player2: player2.userID,
      },
      roomID,
    });
    this.server.to(player1.client.id).emit('start', {
      playerNo: 1,
      players: {
        player1: player1.userID,
        player2: player2.userID,
      },
      roomID,
    });
  }
}
