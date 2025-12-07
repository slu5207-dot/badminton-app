// 1. 使用 const assertion 確保值是常數
export const PlayerLevel = {
  PRO: '職業',
  ADVANCED: '高階',
  INTERMEDIATE: '中階',
  BEGINNER: '初階',
  NEW: '新手',
} as const;

// 2. 導出 Type，這樣程式碼中 PlayerLevel 指的就是這些中文字串
export type PlayerLevel = typeof PlayerLevel[keyof typeof PlayerLevel];

export interface Player {
  id: string;
  name: string;
  level: PlayerLevel | string; // 容許 string 是為了相容舊資料 (避免崩潰)
  status: 'waiting' | 'playing' | 'resting' | 'fixed';
  battlePower: number;
  playCount: number;
  queueTime?: number;
}

export interface Court {
  id: number;
  name: string;
  players: (Player | null)[];
  nextMatch: (Player | null)[];
  status: 'empty' | 'ready' | 'active';
  startTime?: number;
}

export interface MatchRecord {
  id: string;
  courtId: number;
  time: string;
  duration: string;
  players: string[];
  playerIds: string[];
  score: string;
  winner: 'Team A' | 'Team B' | 'Draw';
}

export interface ParticipantDetail {
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

export interface FavoritePlayer {
  name: string;
  level: PlayerLevel;
  battlePower: number;
}