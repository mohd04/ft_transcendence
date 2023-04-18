import { Inject, Injectable, NotFoundException, forwardRef } from '@nestjs/common';
import { Privacy, Role, Status } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateConversationDto,
  UpdateConversationDto,
} from '../dto/conversation.dto';
import * as brypt from 'bcrypt';
import { ParticipantService } from './participant.service';
import { UsersService } from '../../users/users.service';

@Injectable()
export class ConversationService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => ParticipantService))
    private participantService: ParticipantService,
    private userService: UsersService,
  ) {}

  private async hashPassword(password: string) {
    return await brypt.hash(password, 10);
  }

  async validatePassword(password: string, hash: string) {
    return await brypt.compare(password, hash);
  }

  async createConversation(createConversation: CreateConversationDto) {
    if (
      createConversation.privacy === 'PROTECTED' &&
      (createConversation.password === '' ||
        createConversation.password === undefined)
    ) {
      throw new NotFoundException('Password is required for Protected conversation');
    }

    if (createConversation.privacy === 'PROTECTED') {
      createConversation.password = await this.hashPassword(
        createConversation.password,
      );
    }

    try {
      const conversation = await this.prisma.conversation.create({
        data: {
          title: createConversation.title,
          creator_id: createConversation.creator_id,
          password: createConversation.password,
          privacy: Privacy[createConversation.privacy],
        },
        select: {
          id: true,
          title: true,
          privacy: true,
          creator_id: true,
        }
      });
      return conversation;
    } catch (e) {
      throw new NotFoundException(e);
    }
  }

  async protectConversation(conversationID: string, password: string, admin: string) {
    const conversation = await this.checkConversationExists(conversationID);

    if (conversation.privacy === Privacy.PROTECTED) {
      throw new NotFoundException('Conversation is already protected');
    }

    if (conversation.privacy === Privacy.DIRECT) {
      throw new NotFoundException('Cannot protect direct conversation');
    }

    if (await this.participantService.isUserAdminInConversation(conversationID, admin) === false) {
      throw new NotFoundException('User is not admin');
    }

    const hashedPassword = await this.hashPassword(password);

    return await this.prisma.conversation.update({
      where: {
        id: conversationID,
      },
      data: {
        password: hashedPassword,
        privacy: Privacy.PROTECTED,
      },
    });
  }

  async removePasswordFromConversation(conversationID: string) {
    const conversation = await this.checkConversationExists(conversationID);

    if (conversation.privacy !== Privacy.PROTECTED) {
      throw new NotFoundException('Conversation is not protected');
    }

    return await this.prisma.conversation.update({
      where: {
        id: conversationID,
      },
      data: {
        password: null,
        privacy: Privacy.PUBLIC,
      },
    });
  }

  async createDirectConversation(
    createConversation: CreateConversationDto,
    userID: string,
    otherUserID: string,
  ) {

    if (userID === otherUserID) {
      throw new NotFoundException('Cannot create direct conversation with yourself');
    }

    if (await this.userService.isUserBlocked(userID, otherUserID)) {
      throw new NotFoundException('User is blocked');
    }

    if (await this.userService.isUserBlocked(otherUserID, userID)) {
      throw new NotFoundException('User is blocked');
    }

    const conversation = await this.createConversation(createConversation);

    await this.participantService.addParticipantToConversation({
      conversation_id: conversation.id,
      user_id: userID,
      role: Role['OWNER'],
      conversation_status: 'ACTIVE',
    });

    await this.participantService.addParticipantToConversation({
      conversation_id: conversation.id,
      user_id: otherUserID,
      role: Role['MEMBER'],
      conversation_status: 'ACTIVE',
    });

    return conversation;
  }

  async muteUser(
    conversationID: string,
    userID: string,
    muteDuration: number,
    admin: string,
  ) {
    if (!(await this.checkConversationExists(conversationID))) {
      throw new NotFoundException('Conversation does not exist');
    }

    if (!(await this.participantService.checkParticipantExists(conversationID, userID)) ||
        !(await this.participantService.checkParticipantExists(conversationID, admin))) {
      throw new NotFoundException('User is not participant');
    }

    if (await this.participantService.isUserAdminInConversation(conversationID, admin) === null) {
      throw new NotFoundException('User is not admin');
    }

    await this.participantService.updateParticipantStatus(conversationID, userID, Status.MUTED);

    const muteExpiresAt = new Date();
    muteExpiresAt.setMinutes(muteExpiresAt.getMinutes() + muteDuration);

    // await this.prisma.participant.update({
    //   where: {
    //     conversation_id_user_id: {
    //       conversation_id: conversationID,
    //       user_id: userID,
    //     },
    //   },
    //   data: {
    //     mute_expires_at: muteExpiresAt,
    //   },
    // });
  }

  async getDirectConversations(userID: string) {
    if (!(await this.userService.checkIfUserExists(userID))) {
      throw new NotFoundException('User does not exist');
    }

    return await this.prisma.conversation.findMany({
      where: {
        privacy: Privacy.DIRECT,
        participants: {
          some: {
            user_id: userID,
          },
        },
      },
      orderBy: {
        updated_at: 'desc',
      },
      select: {
        id: true,
        title: true,
        privacy: true,
        participants: {
          select: {
            user: {
              select: {
                username: true,
              },
            },
          },
          where: {
            user_id: {
              not: userID,
            },
          },
        },
      },
    });
  }

  async getChannels(userID: string) {
    if (!this.userService.checkIfUserExists(userID)) {
      throw new NotFoundException('User does not exist');
    }

    return await this.prisma.conversation.findMany({
      where: {
        privacy: {
          in: [Privacy.PUBLIC, Privacy.PRIVATE, Privacy.PROTECTED],
        },
        participants: {
          some: {
            user_id: userID,
            conversation_status: {
              notIn: [Status.BANNED, Status.KICKED, Status.DELETED]
            },
          },
        },
      },
      orderBy: {
        updated_at: 'desc',
      },
      select: {
        id: true,
        title: true,
        privacy: true,
				participants: {
					select: {
						role: true,
						conversation_status: true,
					},
					where: {
						user_id: userID,
					},
				}
      },
    });
  }

  async findChannelsThatUserIsNotIn(userID: string) {
    if (!this.userService.checkIfUserExists(userID)) {
      throw new NotFoundException('User does not exist');
    }

    return await this.prisma.conversation.findMany({
      where: {
        privacy: {
          in: [Privacy.PUBLIC, Privacy.PROTECTED],
        },
        participants: {
          every: {
            user_id: {
              not: userID,
            },
          },
        },
      },
      orderBy: {
        updated_at: 'desc',
      },
      select: {
        id: true,
        title: true,
        privacy: true,
      },
    });
  }

  async friendsNotInConversation(userID: string, conversationID: string) {
    if (!this.userService.checkIfUserExists(userID)) {
      throw new NotFoundException('User does not exist');
    }

    if (!this.checkConversationExists(conversationID)) {
      throw new NotFoundException('Conversation does not exist');
    }

    if (
      !this.participantService.isUserAdminInConversation(userID, conversationID)
    ) {
      throw new NotFoundException('User is not admin of the conversation');
    }

    return await this.prisma.user.findUnique({
      where: {
        id: userID,
      },
      select: {
        friends: {
          where: {
            NOT: {
              participant_in: {
                some: {
                  conversation_id: conversationID,
                },
              },
            },
          },
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  }

  async checkConversationExists(conversationID: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationID,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation does not exist');
    }

    return conversation;
  }

  async checkDirectConversationExists(userID: string, otherUserID: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        privacy: 'DIRECT',
        AND: [
          {
            participants: {
              some: {
                user_id: userID,
              },
            },
          },
          {
            participants: {
              some: {
                user_id: otherUserID,
              },
            },
          },
        ],
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation does not exist');
    }

    return conversation;
  }

  async getConversationByID(conversationID: string) {
    return await this.prisma.conversation.findUnique({
      where: {
        id: conversationID,
      },
      include: {
        participants: {
          include: {
            user: true,
          },
        },
        messages: true,
      },
    });
  }

  // async checkConversationTitleExists(title: string) {
  //   return this.prisma.conversation.findUnique({
  //     where: {
  //       title,
  //     },
  //   });
  // }

  async getConversationByUserID(userID: string) {
    return this.prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            user_id: userID,
            conversation_status: {
              not: Status['BANNED'],
            },
          },
        },
      },
      include: {
        participants: {
          include: {
            user: true,
            messages: true,
          },
        },
      },
    });
  }

  async getConversationByUserIDAndSortedMessages(userID: string) {
    return this.prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            user_id: userID,
            conversation_status: {
              not: Status['BANNED'],
            },
          },
        },
      },
      include: {
        participants: {
          include: {
            user: true,
            messages: {
              orderBy: {
                created_at: 'desc',
              },
              take: 1,
            },
          },
        },
        messages: {
          orderBy: {
            created_at: 'desc',
          },
          take: 1,
        },
      },
    });
  }

  async promoteOldestUserToAdmin(conversationID: string) {
    // Check if there is an admin in the conversation
    const admin = await this.prisma.participant.findFirst({
      where: {
        conversation_id: conversationID,
        role: {
          in: [Role.OWNER, Role.ADMIN],
        },
      },
    });

    if (!admin) {
      const oldestUser = await this.prisma.participant.findFirst({
        where: {
          conversation_id: conversationID,
          conversation_status: Status['ACTIVE'],
        },
        orderBy: {
          created_at: 'asc',
        },
      });

      if (oldestUser) {
        return await this.prisma.participant.update({
          where: {
            id: oldestUser.id,
          },
          data: {
            role: Role.ADMIN,
          },
          select: {
            user: {
              select: {
                id: true,
                username: true,
              },
            }
          }
        });
      } else {
        throw new NotFoundException('No users in the conversation');
      }
    } else {
      return ;
    }
  }

}
