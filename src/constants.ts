import { Court, Player, PlayerLevel } from './types';

export const LEVEL_STYLES = {
  [PlayerLevel.NEW]: {
    bg: 'bg-gray-800',
    border: 'border-gray-600',
    badge: 'bg-gray-300',
    color: 'text-gray-200',
    name: '新手'
  },
  [PlayerLevel.BEGINNER]: {
    bg: 'bg-teal-900/40',
    border: 'border-teal-600/50',
    badge: 'bg-teal-300',
    color: 'text-teal-200',
    name: '初階'
  },
  [PlayerLevel.INTERMEDIATE]: {
    bg: 'bg-emerald-900/40',
    border: 'border-emerald-500/50',
    badge: 'bg-emerald-400',
    color: 'text-emerald-100',
    name: '中階'
  },
  [PlayerLevel.ADVANCED]: {
    bg: 'bg-purple-900/40',
    border: 'border-purple-500/50',
    badge: 'bg-purple-400',
    color: 'text-purple-100',
    name: '高階'
  },
  [PlayerLevel.PRO]: {
    bg: 'bg-gradient-to-br from-yellow-900/40 to-orange-900/40',
    border: 'border-yellow-500/50',
    badge: 'bg-yellow-400',
    color: 'text-yellow-100',
    name: '職業'
  }
};

export const LEVEL_COLORS = {
  [PlayerLevel.NEW]: 'bg-gray-500',
  [PlayerLevel.BEGINNER]: 'bg-teal-600',
  [PlayerLevel.INTERMEDIATE]: 'bg-emerald-600',
  [PlayerLevel.ADVANCED]: 'bg-purple-600',
  [PlayerLevel.PRO]: 'bg-yellow-600'
};

export const LEVEL_ORDER = [
  PlayerLevel.PRO,
  PlayerLevel.ADVANCED,
  PlayerLevel.INTERMEDIATE,
  PlayerLevel.BEGINNER,
  PlayerLevel.NEW
];

export const INITIAL_COURTS: Court[] = [
  { id: 1, name: '場地 1', players: [null, null, null, null], nextMatch: [null, null, null, null], status: 'empty' },
  { id: 2, name: '場地 2', players: [null, null, null, null], nextMatch: [null, null, null, null], status: 'empty' },
  { id: 3, name: '場地 3', players: [null, null, null, null], nextMatch: [null, null, null, null], status: 'empty' }
];

export const INITIAL_PLAYERS: Player[] = [];

export const DEFAULT_LOCATIONS = ['裕興', '太子', '大都會', '其他'];
