import {
  Controller,
  Get,
  Param,
  UseFilters,
  ParseUUIDPipe,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaClientExceptionFilter } from 'src/database/prisma-client-exception.filter';
import { JwtAuthGuard } from 'src/utils/guards/jwt.guard';
import { ChatService } from './chat.service';
import { ConversationService } from './Queries/conversation.service';
import { ParticipantService } from './Queries/participant.service';
import { MessageService } from './Queries/message.service';
import { Response } from 'express';

@Controller('chat')
@ApiTags('chat')
@UseGuards(JwtAuthGuard)
@UseFilters(PrismaClientExceptionFilter)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private conversationService: ConversationService,
    private participantService: ParticipantService,
    private messageService: MessageService,
  ) {}

  @Get('direct')
  async getConversations(@Req() req, @Res() res: Response) {
    try {
      const conversation =
        await this.conversationService.getDirectConversations(req.user.id);
      return res.status(200).json(conversation);
    } catch (error) {
      return res.status(404).json({ error: error.message });
    }
  }

  @Get(':conversationID/members')
  async getParticipants(
    @Req() req,
    @Param('conversationID', ParseUUIDPipe) conversationID: string,
    @Res() res: Response,
  ) {
    try {
      const participants = await this.participantService.getConversationMembers(
        conversationID,
        req.user.id,
      );
      return res.status(200).json(participants);
    } catch (error) {
      return res.status(404).json({ error: error.message });
    }
  }

  @Get('groups')
  async getChannels(@Req() req, @Res() res: Response) {
    try {
      const conversations = await this.conversationService.getChannels(
        req.user.id,
      );
      return res.status(200).json(conversations);
    } catch (error) {
      return res.status(404).json({ error: error.message });
    }
  }

  @Get(':conversationID/messages')
  async getMessages(
    @Req() req,
    @Param('conversationID', ParseUUIDPipe) conversationID: string,
    @Res() res: Response,
  ) {
    try {
      const conversations =
        await this.messageService.getDisplayMessagesByConversationID(
          conversationID,
          req.user.id,
        );
      return res.status(200).json(conversations);
    } catch (error) {
      return res.status(404).json({ error: error.message });
    }
  }

  @Get('explore')
  async searchChannels(@Req() req, @Res() res: Response) {
    try {
      const conversations =
        await this.conversationService.findChannelsThatUserIsNotIn(req.user.id);
      return res.status(200).json(conversations);
    } catch (error) {
      return res.status(404).json({ error: error.message });
    }
  }

  @Get('channel/:conversationID/banned')
  async getBannedUsers(
    @Req() req,
    @Param('conversationID', ParseUUIDPipe) conversationID: string,
    @Res() res: Response,
  ) {
    try {
      const users = await this.participantService.bannedUsers(conversationID, req.user.id);
      return res.status(200).json(users);
    } catch (error) {
      return res.status(404).json({ error: error.message });
    }
  }

  @Get('channel/:conversationID/addFriends')
  async getFriendsToAddToChannel(
    @Param('conversationID', ParseUUIDPipe) conversationID: string,
    @Req() req,
    @Res() res: Response,
  ) {
    try {
      const friends = await this.conversationService.friendsNotInConversation(
        req.user.id,
        conversationID,
      );

      return res.status(200).json(friends);
    } catch (error) {
      console.log(error);
      if (error.message === 'User is not admin of the conversation') {
        return res.status(403).json({ error: 'Unauthorized access' });
      }
      return res.status(404).json({ error: error.message });
    }
  }
}
