import { UseGuards } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ConversationService } from './Queries/conversation.service';
import { ParticipantService } from './Queries/participant.service';
import { MessageService } from './Queries/message.service';
import { Role } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { GatewaySessionManager } from './gateway.session';
import { UsersService } from '../users/users.service';
import { sendMessageDto } from './dto/GatewayDTO/sendMessage.dto';
import { createConversationDto } from './dto/GatewayDTO/createConversation.dto';
import { joinConversationDto } from './dto/GatewayDTO/joinConversation.dto';
import { DirectMessageDTO } from './dto/GatewayDTO/directMessage.dto';

@WebSocketGateway(8001, {
  cors: {
    origin: process.env.FRONTEND_BASE_URL,
    credentials: true,
  },
})
// @WebSocketGateway()
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(
    private gatewaySession: GatewaySessionManager,
    private conversationService: ConversationService,
    private participantService: ParticipantService,
    private messageService: MessageService,
    private userService: UsersService,
    private jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.auth.token as string;
    // const token = client.handshake.headers.token as string;
    const userID = this.jwtService.verify(token, {
      secret: process.env.JWT_SECRET,
    });

    client.data.userID = userID;

    this.gatewaySession.setUserSocket(userID.id, client);

    console.log('User connected chat: ', userID);

    const conversations =
      await this.conversationService.getConversationByUserID(userID.id);

    for (const conversation of conversations) {
      client.join(conversation.id);
    }

    const messages = await Promise.all(
      conversations.map(async conversation => {
        const messages = await this.messageService.getMessagesByConversationID(
          conversation.id,
        );
        return {
          conversationID: conversation.id,
          messages,
        };
      }),
    );
  }

  handleDisconnect(client: Socket) {
    console.log('User disconnected: ', client.data.userID);
    this.gatewaySession.removeUserSocket(client.data.userID.id);
  }

  @SubscribeMessage('createConversation')
  async createConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: createConversationDto,
  ) {
    console.log('In createConversation');

    const conversation = await this.conversationService.createConversation({
      title: data.title,
      creator_id: client.data.userID.id,
      password: data.password,
      privacy: data.privacy,
    });

    // add only one participant
    const participant =
      await this.participantService.addParticipantToConversation(
        {
          conversation_id: conversation.id,
          user_id: client.data.userID.id,
          role: Role['OWNER'],
          conversation_status: 'ACTIVE',
        },
        data.password,
      );

    await this.joinConversations(client.data.userID.id, conversation.id);
    await this.sendMessagesToClient(client);
    await this.sendConversationCreatedToAllClients(
      client.data.userID.id,
      conversation,
    );
  }

  @SubscribeMessage('joinConversation')
  async joinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: joinConversationDto,
  ) {
    console.log('In joinConversation');

    const participant =
      await this.participantService.addParticipantToConversation(
        {
          conversation_id: data.conversationID,
          user_id: client.data.userID.id,
          role: Role.USER,
          conversation_status: 'ACTIVE',
        },
        data.password,
      );

    await this.joinConversations(client.data.userID.id, data.conversationID);
    await this.sendMessagesToClient(client);
    await this.sendConversationJoinedToAllClients(
      client.data.userID.id,
      data.conversationID,
    );
  }

  @SubscribeMessage('directMessage')
  async directMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: DirectMessageDTO,
  ) {
    console.log('In directMessage');
    const exists = await this.conversationService.checkDirectConversationExists(
      client.data.userID.id,
      data.userID,
    );

    if (exists !== null) {
      this.server.to(client.data.userID.id).emit('directExists', exists.id);
      return;
    }
    const conversation =
      await this.conversationService.createDirectConversation(
        {
          title: data.title,
          creator_id: client.data.userID.id,
          privacy: 'DIRECT',
        },
        client.data.userID.id,
        data.userID,
      );

    await this.joinConversations(client.data.userID.id, conversation.id);
    await this.joinConversations(data.userID, conversation.id);
    this.server.to(client.data.userID.id).emit('directMessage', conversation);
  }

  @SubscribeMessage('leaveConversation')
  async leaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    const removedParticipant =
      await this.participantService.removeParticipantFromConversation(
        data.conversationID,
        client.data.userID.id,
      );

    await this.conversationService.promoteOldestUserToAdmin(
      data.conversationID,
    );

    const user = this.gatewaySession.getUserSocket(client.data.userID.id);
    if (!user) return;
    user.leave(data.conversationID);
    this.server.to(data.conversationID).emit('conversationLeft', {
      conversationID: data.conversationID,
      leftUserID: client.data.userID.id,
    });
  }

  @SubscribeMessage('addPassword')
  async protectRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    const conversation = await this.conversationService.protectConversation(
      data.conversationID,
      data.password,
      client.data.userID.id,
    );

    this.server.to(data.conversationID).emit('conversationProtected', conversation.id);
  }

  @SubscribeMessage('sendMessage')
  async sendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: sendMessageDto,
  ) {
    console.log('In sendMessage', data);
    try {
      const participant =
        await this.participantService.findParticipantByUserIDandConversationID(
          client.data.userID.id,
          data.conversationID,
        );

      const message = await this.messageService.createMessage({
        message: data.message,
        author_id: participant.id,
        conversation_id: data.conversationID,
      });

      await this.sendConversationPublicToAllClients(data.conversationID);
      this.server.to(data.conversationID).emit('messageCreated', message);
    } catch (e) {
      console.log(e);
    }
    // await this.sendMessagesToParticipants(data.conversationID, message);
  }

  @SubscribeMessage('makeAdmin')
  async makeAdmin(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    const participant = await this.participantService.makeParticipantAdmin(
      data.conversationID,
      data.userID,
      client.data.userID.id,
    );

    this.server.to(data.conversationID).emit('adminMade', {
      conversationID: data.conversationID,
      admin: participant.user_id
    });
  }

  @SubscribeMessage('addParticipant')
  async addParticipant(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    console.log('In addParticipant');
    const participant =
      await this.participantService.addParticipantToConversation({
        conversation_id: data.conversationID,
        user_id: data.userID,
        role: Role.USER,
        conversation_status: 'ACTIVE',
      },
      client.data.userID.id,
    );

    this.joinConversations(data.userID, data.conversationID);
    this.server.to(data.conversationID).emit('participantAdded', {
      conversationID: data.conversationID,
      participant: participant.user_id
    });
  }

  @SubscribeMessage('removeParticipant')
  async removeParticipant(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    const participant =
      await this.participantService.removeParticipantFromConversation(
        data.conversationID,
        data.userID,
        client.data.userID.id,
      );

    await this.conversationService.promoteOldestUserToAdmin(
      data.conversationID,
    );

    const user = this.gatewaySession.getUserSocket(data.userID);
    if (!user) return;
    user.leave(data.conversationID);
    this.server.to(data.conversationID).emit('participantRemoved', {
      conversationID: data.conversationID,
      removedUserID: participant.user_id
    });
  }

  @SubscribeMessage('banUser')
  async banUser(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    try {
      console.log('In banUser');
      const participant = await this.participantService.banUserFromConversation(
        data.conversationID,
        data.userID,
        client.data.userID.id,
      );

      const user = this.gatewaySession.getUserSocket(data.userID);
      if (!user) return;
      user.leave(data.conversationID);
      this.server.to(data.conversationID).emit('userBanned', {
        conversationID: data.conversationID,
        bannedUserID: participant.user_id
      });
    } catch (e) {
      client.emit('error', 'Unauthorized access from banUser');
    }
  }

  @SubscribeMessage('unbanUser')
  async unbanUser(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    try {
      const participant =
        await this.participantService.unbanUserFromConversation(
          data.conversationID,
          data.userID,
          client.data.userID.id,
        );

      this.joinConversations(data.userID, data.conversationID);
      this.server.to(data.conversationID).emit('userUnbanned', {
        conversationID: data.conversationID,
        unbannedUserID: participant.user_id,
      });
    } catch (e) {
      client.emit('error', 'Unauthorized access from unbanUser');
    }
  }

  @SubscribeMessage('kickUser')
  async kickUser(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    try {
      const participant =
        await this.participantService.kickUserFromConversation(
          data.conversationID,
          data.userID,
          client.data.userID.id,
        );

      const user = this.gatewaySession.getUserSocket(data.userID);
      if (!user) return;
      user.leave(data.conversationID);
      this.server.to(data.conversationID).emit('userKicked', {
        conversationID: data.conversationID,
        kickedUserID: participant.user_id,
      });
    } catch (e) {
      client.emit('error', 'Unauthorized access from kickUser');
    }
  }

  @SubscribeMessage('removePassword')
  async removePassword(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    try {
      const conversation =
        await this.conversationService.removePasswordFromConversation(
          data.conversationID,
        );

      this.server.to(data.conversationID).emit('passwordRemoved');
    } catch (e) {
      client.emit('error', 'Unauthorized access from removePassword');
    }
  }

  @SubscribeMessage('muteUser')
  async muteUser(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    try {
      const conversation = await this.conversationService.muteUser(
        data.conversationID,
        data.userID,
        1,
        client.data.userID.id);

      this.server.to(client.id).emit('userMuted', {
        conversationID: data.conversationID,
        mutedUserID: data.userID,
      });
    }
    catch (e) {
      client.emit('error', 'Unauthorized access from muteUser');
    }
  }

  // helper function

  private async joinConversations(userID: string, conversationID: string) {
    const user = this.gatewaySession.getUserSocket(userID);

    if (!user) return;
    user.join(conversationID);
  }

  private async joinConversationByID(client: Socket, conversationID: string) {
    const sockets = this.gatewaySession.getAllUserSockets();
    if (!sockets || sockets.length === 0) return;
    sockets.forEach(socket => {
      socket.join(conversationID);
    });
  }

  private async leaveConversationByID(client: Socket, conversationID: string) {
    const sockets = this.gatewaySession.getAllUserSockets();
    if (!sockets || sockets.length === 0) return;
    sockets.forEach(socket => {
      socket.leave(conversationID);
    });
  }

  private async sendMessagesToClient(client: Socket) {
    const conversations =
      await this.conversationService.getConversationByUserID(
        client.data.userID.id,
      );

    const messages = await Promise.all(
      conversations.map(async conversation => {
        const messages = await this.messageService.getMessagesByConversationID(
          conversation.id,
        );
        return {
          conversationID: conversation.id,
          messages,
        };
      }),
    );

    client.emit('UserConversations', messages);
  }

  private async sendMessagesToUser(userID: string) {
    const client = this.gatewaySession.getAllUserSockets();
    if (!client || client.length === 0) return;
    const conversations =
      await this.conversationService.getConversationByUserID(userID);

    const messages = await Promise.all(
      conversations.map(async conversation => {
        const messages = await this.messageService.getMessagesByConversationID(
          conversation.id,
        );
        return {
          conversationID: conversation.id,
          messages,
        };
      }),
    );

    client.forEach(socket => {
      this.server.to(socket.id).emit('UserConversations', messages);
    });
  }

  private async sendMessagesToParticipants(
    conversationID: string,
    message: any,
  ) {
    const participants =
      await this.participantService.getParticipantsByConversationID(
        conversationID,
      );

    participants.forEach(participant => {
      const client = this.gatewaySession.getUserSocket(participant.user_id);
      if (!client) return;
      this.server.to(client.id).emit('messageCreated', message);
    });
  }

  private async sendConversationCreatedToAllClients(
    userID: string,
    conversation: any,
  ) {
    const sockets = this.gatewaySession.getAllUserSockets();
    if (!sockets || sockets.length === 0) return;
    sockets.forEach(socket => {
      this.server.to(socket.id).emit('conversationCreated', conversation);
    });
    this.server.emit('conversationCreated', conversation);
  }

  private async sendConversationPublicToAllClients(conversation: any) {
    const participants =
      await this.participantService.getParticipantsByConversationID(
        conversation.id,
      );

    participants.forEach(participant => {
      const client = this.gatewaySession.getUserSocket(participant.user_id);
      if (!client) return;
      this.server.to(client.id).emit('conversationPublic', conversation);
    });
  }

  private async sendConversationProtectedToAllClients(conversation: any) {
    const sockets = this.gatewaySession.getAllUserSockets();
    if (!sockets || sockets.length === 0) return;
    sockets.forEach(socket => {
      this.server.to(socket.id).emit('conversationProtected', conversation);
    });
    this.server.emit('conversationProtected', conversation);
  }

  private async sendConversationJoinedToAllClients(
    userID: string,
    conversationID: string,
  ) {
    const conversations = await this.conversationService.getConversationByID(
      conversationID,
    );

    const participants = conversations.participants;
    participants.forEach(async participant => {
      const messages = await this.messageService.getMessagesByConversationID(
        conversationID,
      );
      const sockets = this.gatewaySession.getAllUserSockets();
      if (!sockets || sockets.length === 0) return;
      sockets.forEach(socket => {
        this.server.to(socket.id).emit('conversationJoined', {
          conversationID,
          participant,
          messages,
        });
      });
    });
  }

  private async sendConversationLeftToAllClients(
    userID: string,
    conversationID: string,
  ) {
    const sockets = this.gatewaySession.getAllUserSockets();
    if (!sockets || sockets.length === 0) return;
    sockets.forEach(socket => {
      this.server.to(socket.id).emit('conversationLeft', {
        conversationID,
        userID,
      });
    });
  }
}

// @SubscribeMessage('muteUser')
// async muteUser(client: Socket, data: any) {
// 	const token = client.handshake.auth.token;
// 	let user = null;
// 	try {
// 		user = this.jwtService.verify(token, {
// 			secret: process.env.JWT_SECRET,
// 		});
// 		const conversation = await this.conversationService.getConversationWithParticipants(data.conversation_id);
// 		let isAdmin = false;
// 		let participantObject = null;
// 		conversation.participants.forEach(async (participant) => {
// 			if (participant.user_id === data.user_id) {
// 				if (participant.role === Role.ADMIN) {
// 					client.emit('error', "You're not allowed to mute an admin");
// 					isAdmin = true;
// 				}
// 				participantObject = participant;
// 			}
// 		});
// 		if (participantObject.conversation_status === Status.MUTED) {
// 			client.emit('error', 'Participant is already muted');
// 		}
// 		else if (!isAdmin) {
// 			await this.prisma.participant.update({
// 				where: {
// 					id: participantObject.id,
// 				},
// 				data: {
// 					conversation_status: Status.MUTED,
// 					mute_expires_at: new Date(Date.now() + 1000 * 60 * 7), // mute for 7 minutes
// 				}
// 			});
// 			this.server.to(data.conversation_id).emit('userMuted', data.user_id);
// 			client.emit('alert', 'Participant is now muted');
// 		}
// 	}
// 	catch (e) {
// 		client.emit('error', 'Unauthorized access from muteUser');
// 	}
// }
