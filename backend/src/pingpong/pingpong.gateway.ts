import {
	SubscribeMessage,
	WebSocketGateway,
	WebSocketServer,
	WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

let queue = [];

let users = [];

@WebSocketGateway(8001, {
	cors: {
		origin: process.env.FRONTEND_BASE_URL,
		credentials: true,
	},
})
export class PingpongGateway {
	constructor(private readonly jwtService: JwtService) {
	}

	@WebSocketServer()
	server: Server;

	handleConnection(client: Socket) {
		const token = client.handshake.auth.token;
		console.log(token);
		let user = null;
		try {
			user = this.jwtService.verify(token, {
				secret: process.env.JWT_SECRET,
			});
			users[user.id] = client;
			queue.push(user);
			if (queue.length > 1) {
				const player1 = queue.shift();
				const player2 = queue.shift();
				users[player1.id].join(player1.login);
				users[player2.id].join(player1.login);
				users[player1.id].emit('start', 1);
				users[player2.id].emit('start', 2);
			}
			console.log('connected');
		}
		catch (e) {
			client.emit('error', 'Unauthorized access');
		}
	}
	handleDisconnect(client: any) {
		this.handlePause(client, true);
	}
	@SubscribeMessage('ballX')
	async handleBallX(client: Socket, data: number): Promise<void> {
		const token = client.handshake.auth.token;
		let user = null;
		try {
			user = this.jwtService.verify(token, {
				secret: process.env.JWT_SECRET,
			});
			console.log(user);
			this.server.to(user.login).emit('ballX', data);
		}
		catch (e) {
			client.emit('error', 'Unauthorized access');
		}
	}
	@SubscribeMessage('pause')
	handlePause(client: Socket, data: boolean): void {
		// const token = client.handshake.auth.token;
		// let user = null;
		// try {
		// 	user = this.jwtService.verify(token, {
		// 		secret: process.env.JWT_SECRET,
		// 	});
		// }
		// catch (e) {
		// 	throw new WsException('Unauthorized access');
		// }
		// this.server.to(user.login).emit('pause', data);
	}
	@SubscribeMessage('ballY')
	handleBallY(client: Socket, data: number): void {
		const token = client.handshake.auth.token;
		let user = null;
		try {
			user = this.jwtService.verify(token, {
				secret: process.env.JWT_SECRET,
			});
			this.server.to(user.login).emit('ballY', data)
		}
		catch (e) {
			client.emit('error', 'Unauthorized access');
		}
	}
	@SubscribeMessage('player1Y')
	handlePlayer1Y(client: Socket, data: number): void {
		const token = client.handshake.auth.token;
		let user = null;
		try {
			user = this.jwtService.verify(token, {
				secret: process.env.JWT_SECRET,
			});
			this.server.to(user.login).emit('player1Y', data);
		}
		catch (e) {
			client.emit('error', 'Unauthorized access');
		}
	}
	@SubscribeMessage('player2Y')
	handlePlayer2Y(client: Socket, data: number): void {
		const token = client.handshake.auth.token;
		let user = null;
		try {
			user = this.jwtService.verify(token, {
				secret: process.env.JWT_SECRET,
			});
			this.server.to(user.login).emit('player2Y', data);
		}
		catch (e) {
			client.emit('error', 'Unauthorized access');
		}
	}
	@SubscribeMessage('player1Score')
	handlePlayer1Score(client: Socket, data: number): void {
		const token = client.handshake.auth.token;
		let user = null;
		try {
			user = this.jwtService.verify(token, {
				secret: process.env.JWT_SECRET,
			});
			this.server.to(user.login).emit('player1Score', data);
		}
		catch (e) {
			client.emit('error', 'Unauthorized access');
		}
	}
	@SubscribeMessage('player2Score')
	handlePlayer2Score(client: Socket, data: number): void {
		const token = client.handshake.auth.token;
		let user = null;
		try {
			user = this.jwtService.verify(token, {
				secret: process.env.JWT_SECRET,
			});
			this.server.to(user.login).emit('player2Score', data);
		}
		catch (e) {
			client.emit('error', 'Unauthorized access');
		}
	}
}
