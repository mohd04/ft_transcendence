import { Socket } from 'socket.io';

export interface Game {
  gameID: string;
  player1: string;
  player2: string;
  player1Score: number;
  player2Score: number;
}

export interface GameSetting {
  speed: number;
  points: number;
  hasMiddleWall: boolean;
}

export interface BallMovement {
  x: number;
  y: number;
  radian: number;
}

export interface BallPosition {
  x: number;
  y: number;
}

export interface Paddle {
  x: number;
  y: number;
  movingUp: boolean;
  movingDown: boolean;
}

export interface Position {
  x: number;
  y: number;
  movingUp: boolean;
  movingDown: boolean;
}

export interface PlayerStats {
  points: number;
  name: any;
}

export interface GameObject {
  gameStatus: GameStatus;
  paddle1: Paddle;
  paddle2: Paddle;
  ball: BallPosition;
  player1: PlayerStats;
  player2: PlayerStats;
  gameSetting: GameSetting;
  remainingTime: number;
  time: number;
}

export enum GameStatus {
  WAITING,
  PLAYING,
  ENDED,
  QUEUED,
  READY,
  SPECTATING,
}

export interface KeyPress {
  upKey: boolean;
  downKey: boolean;
}

export interface SocketData {
  playerNumber: number;
  client: Socket;
  gameID: string;
  userID: any;
  status: GameStatus;
}

export interface UserInfo {
  id: string;
  login: string;
  iat: number;
  exp: number;
}

export type UserMap = Map<UserInfo, SocketData>;

export type InvitationMap = Map<string, string[]>;
