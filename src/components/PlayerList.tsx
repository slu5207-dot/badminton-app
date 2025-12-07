import React, { useState, useEffect } from 'react';
import type { Player } from '../types';
import { LEVEL_STYLES, LEVEL_ORDER } from '../constants';
import { Trash2, PauseCircle, Swords, Hash, Anchor, ArrowUp, Check, Pencil, BarChart2, MoreHorizontal, X, AlertTriangle } from 'lucide-react';

interface Props {
  players: Player[];
  onRemove: (id: string) => void;
  onChangeStatus: (id: string, newStatus: Player['status']) => void;
  onSelect: (player: Player) => void;
  selectedPlayerId: string | null;
  readOnly?: boolean; 
  onEdit?: (player: Player) => void;
  onViewStats?: (player: Player) => void;
}

const PlayerList: React.FC<Props> = ({ players, onRemove, onChangeStatus, onSelect, selectedPlayerId, readOnly = false, onEdit, onViewStats }) => {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    if (activeMenuId) window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [activeMenuId]);

  const fixedPlayers = players.filter(p => p.status === 'fixed').sort((a, b) => b.battlePower - a.battlePower);
  const waitingPlayers = players.filter(p => p.status === 'waiting');
  const restingPlayers = players.filter(p => p.status === 'resting').sort((a, b) => b.battlePower - a.battlePower);
  const playingPlayers = players.filter(p => p.status === 'playing').sort((a, b) => b.battlePower - a.battlePower);
  
  const unknownPlayers = waitingPlayers.filter(p => !LEVEL_ORDER.includes(p.level as any));

  const renderPlayerCard = (player: Player, isUnknown = false) => {
    const isSelected = selectedPlayerId === player.id;
    const isMenuOpen = activeMenuId === player.id;
    const style = LEVEL_STYLES[player.level as any] || { 
        name: isUnknown ? '格式舊' : '未知', color: 'text-gray-400', bg: 'bg-gray-800', border: 'border-gray-500', badge: 'bg-gray-600' 
    };
    
    return (
      <div 
        key={player.id}
        onClick={(e) => { e.stopPropagation(); if (activeMenuId === player.id) return; onSelect(player); }}
        className={`relative flex flex-col p-2 rounded-xl border-2 transition-all duration-200 overflow-hidden group select-none h-[100px] ${readOnly ? 'cursor-pointer hover:scale-105 active:scale-95' : 'cursor-default'} ${isSelected ? 'bg-emerald-900/90 border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)] transform scale-105 z-10' : `${style.bg} ${style.border} hover:border-opacity-100 border-opacity-60`}`}
      >
        <div className="flex items-start justify-between w-full mb-1 relative z-10">
            <div className="flex flex-col min-w-0">
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded text-black w-fit mb-1 shadow-sm ${style.badge}`}>
                    {isUnknown ? '需編輯修正' : style.name}
                </span>
                <span className={`font-bold truncate text-sm leading-tight drop-shadow-md ${style.color}`}>{player.name}</span>
            </div>
            {!readOnly && (
                <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(isMenuOpen ? null : player.id); }} className="p-1 -mr-1 -mt-1 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors z-20">
                    {isMenuOpen ? <X size={16}/> : <MoreHorizontal size={16} />}
                </button>
            )}
        </div>
        
        {/* 🔥 修正：背景大字也統一顯示名字首字 */}
        <div className="absolute right-1 bottom-1 opacity-20 text-[50px] font-black leading-none pointer-events-none select-none text-white mix-blend-overlay">
            {player.name.slice(0, 1)}
        </div>

        <div className="flex items-center gap-1 mt-auto z-10">
            <div className="flex items-center gap-1 bg-black/40 px-1.5 py-0.5 rounded border border-white/10" title="戰鬥力"><Swords size={10} className="text-red-400" /><span className="font-mono font-bold text-xs text-white">{player.battlePower}</span></div>
            <div className="flex items-center gap-1 bg-black/40 px-1.5 py-0.5 rounded border border-white/10" title="上場次數"><Hash size={10} className="text-yellow-400" /><span className="font-mono font-bold text-xs text-white">{player.playCount}</span></div>
        </div>
        
        {isSelected && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-emerald-500 rounded-full p-1 shadow-lg animate-bounce z-20"><Check size={16} className="text-white"/></div>}

        {isMenuOpen && !readOnly && (
          <div className="absolute inset-0 bg-[#081f18]/95 backdrop-blur-sm z-30 flex flex-col p-2 animate-fade-in" onClick={(e) => e.stopPropagation()}>
              <div className="grid grid-cols-2 gap-1.5 h-full">
                  <button onClick={() => { onEdit?.(player); setActiveMenuId(null); }} className="flex items-center justify-center gap-1 bg-gray-700/50 hover:bg-gray-600 rounded text-xs text-white font-medium border border-white/10"><Pencil size={12}/> 編輯</button>
                  <button onClick={() => { onViewStats?.(player); setActiveMenuId(null); }} className="flex items-center justify-center gap-1 bg-purple-900/50 hover:bg-purple-800 rounded text-xs text-purple-200 font-medium border border-purple-500/20"><BarChart2 size={12}/> 數據</button>
                  {player.status === 'waiting' ? (
                      <>
                        <button onClick={() => { onChangeStatus(player.id, 'fixed'); setActiveMenuId(null); }} className="flex items-center justify-center gap-1 bg-blue-900/50 hover:bg-blue-800 rounded text-xs text-blue-200 font-medium border border-blue-500/20"><Anchor size={12}/> 綁定</button>
                        <button onClick={() => { onChangeStatus(player.id, 'resting'); setActiveMenuId(null); }} className="flex items-center justify-center gap-1 bg-yellow-900/50 hover:bg-yellow-800 rounded text-xs text-yellow-200 font-medium border border-yellow-500/20"><PauseCircle size={12}/> 休息</button>
                      </>
                  ) : (
                      <button onClick={() => { onChangeStatus(player.id, 'waiting'); setActiveMenuId(null); }} className="col-span-2 flex items-center justify-center gap-1 bg-emerald-900/50 hover:bg-emerald-800 rounded text-xs text-emerald-200 font-medium border border-emerald-500/20"><ArrowUp size={12}/> 移至備戰區</button>
                  )}
                  <button onClick={() => { onRemove(player.id); setActiveMenuId(null); }} className="col-span-2 flex items-center justify-center gap-1 bg-red-900/50 hover:bg-red-800 rounded text-xs text-red-200 font-medium border border-red-500/20"><Trash2 size={12}/> 刪除球員</button>
              </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. 比賽中 (紅) */}
      {playingPlayers.length > 0 && (
        <div className="rounded-xl border border-red-500/30 overflow-hidden bg-red-900/10">
          <div className="px-3 py-2 bg-red-900/30 flex justify-between items-center border-b border-red-500/20"><span className="font-bold text-sm text-red-300 flex items-center gap-2"><Swords size={14}/> 比賽中</span><span className="text-xs text-red-300/60">{playingPlayers.length} 人</span></div>
          <div className="p-3"><div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">{playingPlayers.map(p => renderPlayerCard(p))}</div></div>
        </div>
      )}

      {/* 2. 綁定區 (藍) */}
      {(fixedPlayers.length > 0 || !readOnly) && (
        <div className="rounded-xl border border-blue-500/30 overflow-hidden bg-blue-900/10">
          <div className="px-3 py-2 bg-blue-900/30 flex justify-between items-center border-b border-blue-500/20"><span className="font-bold text-sm text-blue-300 flex items-center gap-2"><Anchor size={14}/> 綁定區 (手動)</span><span className="text-xs text-blue-300/60">{fixedPlayers.length} 人</span></div>
          <div className="p-3">{fixedPlayers.length === 0 ? <div className="text-center text-xs text-gray-500 py-4 border border-dashed border-white/5 rounded">暫無綁定球員</div> : <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">{fixedPlayers.map(p => renderPlayerCard(p))}</div>}</div>
        </div>
      )}

      {/* 3. 備戰區 (綠) */}
      <div className="rounded-xl border border-emerald-500/30 overflow-hidden bg-emerald-900/10">
         <div className="px-3 py-2 bg-emerald-900/30 flex justify-between items-center border-b border-emerald-500/20"><span className="font-bold text-sm text-emerald-300 flex items-center gap-2"><Swords size={14}/> 備戰區 (智能排點)</span><span className="text-xs text-emerald-300/60">{waitingPlayers.length} 人</span></div>
        <div className="p-3 space-y-4 min-h-[120px]">
           {waitingPlayers.length === 0 ? (
              <div className="text-center text-xs text-gray-500 py-10 border border-dashed border-white/5 rounded flex flex-col items-center gap-2"><span className="text-2xl opacity-50">😴</span>暫無備戰球員</div>
           ) : (
             <>
               {LEVEL_ORDER.map(level => {
                 const levelPlayers = waitingPlayers.filter(p => p.level === level).sort((a, b) => b.battlePower - a.battlePower);
                 if (levelPlayers.length === 0) return null;
                 const style = LEVEL_STYLES[level];
                 return (
                   <div key={level} className="relative">
                      <div className={`flex items-center gap-2 mb-2 pb-1 border-b ${style?.border || 'border-gray-700'} border-dashed border-opacity-30`}><span className={`text-[10px] font-bold text-black px-2 py-0.5 rounded ${style?.badge || 'bg-gray-600'}`}>{style?.name || level}</span><span className="text-[10px] text-gray-500">{levelPlayers.length} 人</span></div>
                      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">{levelPlayers.map(p => renderPlayerCard(p))}</div>
                   </div>
                 );
               })}

               {/* 舊資料修復區 */}
               {unknownPlayers.length > 0 && (
                   <div className="relative mt-6 border-t-2 border-dashed border-gray-600 pt-4 animate-pulse bg-red-900/20 rounded p-2">
                      <div className="flex items-center gap-2 mb-2 pb-1 text-red-300 font-bold text-sm">
                          <AlertTriangle size={16} className="text-red-400"/>
                          發現資料異常的球員 ({unknownPlayers.length} 人)
                          <span className="text-[10px] font-normal text-gray-400 ml-auto">請點擊卡片 ➝ 編輯 ➝ 儲存 以修復</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">
                          {unknownPlayers.map(p => renderPlayerCard(p, true))}
                      </div>
                   </div>
               )}
             </>
           )}
        </div>
      </div>

      {/* 4. 休息區 (黃) */}
      {(restingPlayers.length > 0 || !readOnly) && (
        <div className="rounded-xl border border-yellow-500/30 overflow-hidden bg-yellow-900/10 opacity-80">
           <div className="px-3 py-2 bg-yellow-900/30 flex justify-between items-center border-b border-yellow-500/20"><span className="font-bold text-sm text-yellow-300 flex items-center gap-2"><PauseCircle size={14}/> 休息區</span><span className="text-xs text-yellow-300/60">{restingPlayers.length} 人</span></div>
          <div className="p-3">{restingPlayers.length === 0 ? <div className="text-center text-xs text-gray-500 py-4 border border-dashed border-white/5 rounded">無休息球員</div> : <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">{restingPlayers.map(p => renderPlayerCard(p))}</div>}</div>
        </div>
      )}
    </div>
  );
};

export default PlayerList;