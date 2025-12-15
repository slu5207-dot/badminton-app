
export enum PlayerLevel {
  NEW = '新手',
  BEGINNER = '初階',
  INTERMEDIATE = '中階',
  ADVANCED = '高階',
  PRO = '職業'
}

export interface Player {
  id: string;
  name: string;
  level: PlayerLevel;
  status: 'waiting' | 'playing' | 'resting' | 'fixed';
  battlePower: number;
  playCount: number;
  avatarColor?: string;
  queueTime?: number;
  partnerId?: string; // ID of the bound partner
  opponentId?: string; // ID of the bound opponent
}

export interface MatchRecord {
  id: string;
  date?: string; // YYYY-MM-DD
  time: string;
  duration: string;
  courtId: number;
  players: string[];
  playerIds: string[];
  score?: string;
  winner?: 'Team A' | 'Team B' | 'Draw';
}

export interface Court {
  id: number;
  name: string;
  players: (Player | null)[];
  nextMatch: (Player | null)[];
  startTime?: number;
  status: 'empty' | 'ready' | 'active' | 'finishing';
}

export interface ParticipantDetail {
  level: PlayerLevel;
  battlePower: number;
}

export interface FavoritePlayer {
  name: string;
  level: PlayerLevel;
  battlePower: number;
}

export interface SignupEvent {
  title: string;
  location: string;
  startTime: string;
  endTime: string;
  courts: number;
  venueFee: number;
  shuttlecockFee: number;
  limit: number;
  participants: string[];
  waitlist: string[];
  notes: string;
  participantDetails?: Record<string, ParticipantDetail>;
}

export interface EventDatabase {
  events: Record<string, SignupEvent>;
  lastUpdated: number;
}