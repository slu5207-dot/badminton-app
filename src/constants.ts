import { PlayerLevel } from './types';
import type { Court, Player } from './types'; // 明確 import type

// 這裡使用 computed key，確保 key 一定是中文 '職業', '中階'...
export const LEVEL_COLORS: Record<string, string> = {
  [PlayerLevel.NEW]: 'bg-green-500',
  [PlayerLevel.BEGINNER]: 'bg-teal-500',
  [PlayerLevel.INTERMEDIATE]: 'bg-blue-500',
  [PlayerLevel.ADVANCED]: 'bg-purple-500',
  [PlayerLevel.PRO]: 'bg-orange-500',
};

// 增加 Default，防止舊資料導致 undefined 錯誤
export const LEVEL_STYLES: Record<string, { name: string, color: string, bg: string, border: string, badge: string }> = {
  [PlayerLevel.PRO]: { 
    name: '職業', color: 'text-orange-400', bg: 'bg-orange-900/40', border: 'border-orange-500/50', badge: 'bg-orange-500' 
  },
  [PlayerLevel.ADVANCED]: { 
    name: '高階', color: 'text-purple-400', bg: 'bg-purple-900/40', border: 'border-purple-500/50', badge: 'bg-purple-500' 
  },
  [PlayerLevel.INTERMEDIATE]: { 
    name: '中階', color: 'text-blue-400', bg: 'bg-blue-900/40', border: 'border-blue-500/50', badge: 'bg-blue-500' 
  },
  [PlayerLevel.BEGINNER]: { 
    name: '初階', color: 'text-teal-400', bg: 'bg-teal-900/40', border: 'border-teal-500/50', badge: 'bg-teal-500' 
  },
  [PlayerLevel.NEW]: { 
    name: '新手', color: 'text-green-400', bg: 'bg-green-900/40', border: 'border-green-500/50', badge: 'bg-green-500' 
  },
};

export const LEVEL_ORDER = [
  PlayerLevel.PRO,
  PlayerLevel.ADVANCED,
  PlayerLevel.INTERMEDIATE,
  PlayerLevel.BEGINNER,
  PlayerLevel.NEW
] as const;

export const INITIAL_PLAYERS: Player[] = [];

export const INITIAL_COURTS: Court[] = [
  { id: 1, name: '場地 1', players: [null, null, null, null], nextMatch: [null, null, null, null], status: 'empty' },
  { id: 2, name: '場地 2', players: [null, null, null, null], nextMatch: [null, null, null, null], status: 'empty' },
  { id: 3, name: '場地 3', players: [null, null, null, null], nextMatch: [null, null, null, null], status: 'empty' },
];