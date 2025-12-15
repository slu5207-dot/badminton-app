
import React, { useState, useEffect } from 'react';
import { Player } from '../types';
import { LEVEL_STYLES, LEVEL_ORDER } from '../constants';
import { Trash2, PauseCircle, Swords, Hash, Anchor, ArrowUp, Check, Pencil, BarChart2, MoreHorizontal, X, Link as LinkIcon, Unlink, UserMinus } from 'lucide-react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface Props {
  players: Player[];
  onRemove: (id: string) => void;
  onChangeStatus: (id: string, newStatus: Player['status']) => void;
  onSelect: (player: Player) => void;
  selectedPlayerId: string | null;
  readOnly?: boolean; 
  onEdit?: (player: Player) => void;
  onViewStats?: (player: Player) => void;
  onBind?: (playerId: string, type: 'partner' | 'opponent') => void;
  onUnbind?: (playerId: string) => void;
  bindingId?: string | null; 
  bindingType?: 'partner' | 'opponent' | null;
}

// Droppable Container Component
const DroppableZone: React.FC<{
  id: string;
  status: string;
  className: string;
  headerColorClass: string; // e.g., 'emerald'
  borderColorClass: string; // e.g., 'emerald'
  icon: React.ElementType;
  title: string;
  count: number;
  children: React.ReactNode;
  isEmpty?: boolean;
  emptyMessage?: React.ReactNode;
}> = ({ id, status, className, headerColorClass, borderColorClass, icon: Icon, title, count, children, isEmpty, emptyMessage }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
    data: { type: 'container', status: status }
  });

  // Dynamic Tailwind classes for colors
  const bgHeader = `bg-${headerColorClass}-900/30`;
  const textHeader = `text-${headerColorClass}-300`;
  const borderHeader = `border-${borderColorClass}-500/20`;

  return (
    <div 
      ref={setNodeRef} 
      className={`${className} transition-all duration-200 ${isOver ? 'ring-2 ring-white/50 bg-white/5 scale-[1.01]' : ''}`}
    >
        <div className={`px-2 py-1.5 ${bgHeader} flex justify-between items-center border-b ${borderHeader}`}>
          <span className={`font-bold text-xs ${textHeader} flex items-center gap-1.5`}>
             <Icon size={12}/> {title}
          </span>
          <span className={`text-[10px] ${textHeader}/60`}>{count} 人</span>
        </div>
        
        <div className="p-2 min-h-[60px] relative">
           {isEmpty ? (
              <div className="h-full flex flex-col items-center justify-center py-2">
                 {emptyMessage}
              </div>
           ) : (
              children
           )}
           
           {isOver && (
             <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center z-20 rounded-b-xl">
                 <span className="bg-white text-black font-bold text-xs px-3 py-1.5 rounded-full shadow-lg transform scale-110">
                    放開加入
                 </span>
             </div>
           )}
        </div>
    </div>
  );
};

// Draggable Player Card
const DraggablePlayerCard: React.FC<{
    player: Player;
    onSelect: (p: Player) => void;
    isSelected: boolean;
    isMenuOpen: boolean;
    toggleMenu: () => void;
    activeMenuId: string | null;
    readOnly: boolean;
    bindingId?: string | null;
    bindingType?: 'partner' | 'opponent' | null;
    players: Player[];
    onEdit?: (p: Player) => void;
    onViewStats?: (p: Player) => void;
    onUnbind?: (id: string) => void;
    onBind?: (id: string, type: 'partner' | 'opponent') => void;
    onChangeStatus: (id: string, status: Player['status']) => void;
    onRemove: (id: string) => void;
}> = ({ player, onSelect, isSelected, isMenuOpen, toggleMenu, activeMenuId, readOnly, bindingId, bindingType, players, onEdit, onViewStats, onUnbind, onBind, onChangeStatus, onRemove }) => {
    
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `player-list-${player.id}`,
        data: { 
            type: 'player', 
            player: player,
            source: 'list'
        },
        disabled: readOnly || activeMenuId !== null 
    });

    const style = LEVEL_STYLES[player.level];
    const dragStyle = {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.3 : 1, // Keep visible but transparent when dragging ("ghost")
        touchAction: 'manipulation' // Critical for allowing scroll until drag starts
    };

    const isBindingMe = bindingId === player.id;
    const isBindingTarget = bindingId && bindingId !== player.id;
    const opacityClass = bindingId && !isBindingMe && !isBindingTarget ? 'opacity-30' : '';
    
    const partner = player.partnerId ? players.find(p => p.id === player.partnerId) : null;
    const opponent = player.opponentId ? players.find(p => p.id === player.opponentId) : null;

    // Dynamic Binding Styling
    let ringClass = 'ring-4 ring-pink-500 border-pink-500';
    let targetClass = 'hover:ring-2 hover:ring-pink-400';
    let targetText = '點擊綁定隊友';
    let targetBg = 'bg-pink-600';

    if (bindingType === 'opponent') {
        ringClass = 'ring-4 ring-orange-500 border-orange-500';
        targetClass = 'hover:ring-2 hover:ring-orange-400';
        targetText = '點擊綁定對手';
        targetBg = 'bg-orange-600';
    }

    return (
      <div 
        ref={setNodeRef}
        style={dragStyle}
        {...attributes}
        {...listeners}
        onClick={(e) => {
            if (!isDragging) {
                e.stopPropagation();
                if (activeMenuId === player.id) return;
                onSelect(player);
            }
        }}
        className={`
          relative flex flex-col p-1.5 rounded-xl border-2 transition-all duration-200 overflow-hidden group select-none h-[90px] touch-manipulation
          ${readOnly ? 'cursor-pointer hover:scale-105 active:scale-95' : 'cursor-grab active:cursor-grabbing'}
          ${isSelected 
            ? 'bg-emerald-900/90 border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)] transform scale-105 z-10' 
            : `${style.bg} ${style.border} hover:border-opacity-100 border-opacity-60`
          }
          ${isBindingMe ? `${ringClass} z-50 scale-105` : ''}
          ${isBindingTarget ? `cursor-pointer ${targetClass} animate-pulse` : ''}
          ${opacityClass}
        `}
      >
        <div className="flex items-start justify-between w-full mb-0.5 relative z-10">
            <div className="flex flex-col min-w-0">
                <span className={`text-[9px] font-black px-1 py-0.5 rounded text-black bg-white/90 w-fit mb-0.5 shadow-sm`}>
                  {style.name}
                </span>
                <span className={`font-bold text-gray-100 truncate text-xs leading-tight ${style.color} drop-shadow-md`}>
                  {player.name}
                </span>
            </div>
            
            {!readOnly && !bindingId && (
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        toggleMenu();
                    }}
                    onPointerDown={(e) => e.stopPropagation()} 
                    className="p-1 -mr-1 -mt-1 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors z-20"
                >
                    {isMenuOpen ? <X size={14}/> : <MoreHorizontal size={14} />}
                </button>
            )}
        </div>

        <div className="absolute right-1 bottom-1 opacity-20 text-[40px] font-black leading-none pointer-events-none select-none text-white mix-blend-overlay">
            {player.name.slice(0, 1)}
        </div>

        {partner && (
            <div className="absolute top-1 right-6 bg-pink-600/90 text-white text-[8px] px-1.5 py-0.5 rounded-full flex items-center gap-1 z-20 shadow-sm border border-pink-400/50">
               <LinkIcon size={8} />
               <span className="max-w-[30px] truncate">{partner.name}</span>
            </div>
        )}

        {opponent && (
            <div className="absolute top-1 right-6 bg-orange-600/90 text-white text-[8px] px-1.5 py-0.5 rounded-full flex items-center gap-1 z-20 shadow-sm border border-orange-400/50">
               <Swords size={8} />
               <span className="max-w-[30px] truncate">{opponent.name}</span>
            </div>
        )}

        <div className="flex items-center gap-1 mt-auto z-10">
            <div className="flex items-center gap-1 bg-black/40 px-1 py-0.5 rounded border border-white/10" title="戰鬥力">
              <Swords size={8} className="text-red-400" />
              <span className="font-mono font-bold text-[10px] text-white">{player.battlePower}</span>
            </div>
            <div className="flex items-center gap-1 bg-black/40 px-1 py-0.5 rounded border border-white/10" title="上場次數">
              <Hash size={8} className="text-yellow-400" />
              <span className="font-mono font-bold text-[10px] text-white">{player.playCount}</span>
            </div>
        </div>
          
        {isSelected && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-emerald-500 rounded-full p-1 shadow-lg animate-bounce z-20">
             <Check size={14} className="text-white"/>
          </div>
        )}

        {isBindingTarget && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
               <div className={`${targetBg} text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg`}>
                  {targetText}
               </div>
            </div>
        )}

        {isMenuOpen && !readOnly && (
          <div 
            className="absolute inset-0 bg-[#081f18]/95 backdrop-blur-sm z-30 flex flex-col p-1.5 animate-fade-in cursor-default"
            onClick={(e) => e.stopPropagation()} 
            onPointerDown={(e) => e.stopPropagation()} 
          >
              <div className="grid grid-cols-2 gap-1 h-full">
                  <button onClick={() => { onEdit?.(player); toggleMenu(); }} className="flex items-center justify-center gap-1 bg-gray-700/50 hover:bg-gray-600 rounded text-[10px] text-white font-medium border border-white/10">
                      <Pencil size={10}/> 編輯
                  </button>
                  <button onClick={() => { onViewStats?.(player); toggleMenu(); }} className="flex items-center justify-center gap-1 bg-purple-900/50 hover:bg-purple-800 rounded text-[10px] text-purple-200 font-medium border border-purple-500/20">
                      <BarChart2 size={10}/> 數據
                  </button>

                  {player.status === 'waiting' ? (
                      <>
                        {player.partnerId || player.opponentId ? (
                             <button onClick={() => { onUnbind?.(player.id); toggleMenu(); }} className="col-span-2 flex items-center justify-center gap-1 bg-gray-700 hover:bg-gray-600 rounded text-[10px] text-gray-200 font-medium border border-gray-500/20">
                                <Unlink size={10}/> 解除綁定 ({player.partnerId ? '隊友' : '對手'})
                             </button>
                        ) : (
                            <>
                                <button onClick={() => { onBind?.(player.id, 'partner'); toggleMenu(); }} className="flex items-center justify-center gap-1 bg-pink-900/50 hover:bg-pink-800 rounded text-[10px] text-pink-200 font-medium border border-pink-500/20">
                                    <LinkIcon size={10}/> 綁隊友
                                </button>
                                <button onClick={() => { onBind?.(player.id, 'opponent'); toggleMenu(); }} className="flex items-center justify-center gap-1 bg-orange-900/50 hover:bg-orange-800 rounded text-[10px] text-orange-200 font-medium border border-orange-500/20">
                                    <UserMinus size={10}/> 綁對手
                                </button>
                            </>
                        )}
                        <button onClick={() => { onChangeStatus(player.id, 'resting'); toggleMenu(); }} className="col-span-2 flex items-center justify-center gap-1 bg-yellow-900/50 hover:bg-yellow-800 rounded text-[10px] text-yellow-200 font-medium border border-yellow-500/20">
                            <PauseCircle size={10}/> 休息
                        </button>
                      </>
                  ) : (
                      <button onClick={() => { onChangeStatus(player.id, 'waiting'); toggleMenu(); }} className="col-span-2 flex items-center justify-center gap-1 bg-emerald-900/50 hover:bg-emerald-800 rounded text-[10px] text-emerald-200 font-medium border border-emerald-500/20">
                          <ArrowUp size={10}/> 移至備戰區
                      </button>
                  )}

                  <button onClick={() => { onRemove(player.id); toggleMenu(); }} className="col-span-2 flex items-center justify-center gap-1 bg-red-900/50 hover:bg-red-800 rounded text-[10px] text-red-200 font-medium border border-red-500/20">
                      <Trash2 size={10}/> 刪除
                  </button>
              </div>
          </div>
        )}
      </div>
    );
};


const PlayerList: React.FC<Props> = ({ 
    players, 
    onRemove, 
    onChangeStatus, 
    onSelect, 
    selectedPlayerId, 
    readOnly = false, 
    onEdit, 
    onViewStats,
    onBind,
    onUnbind,
    bindingId,
    bindingType
}) => {
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

  const renderCard = (p: Player) => (
      <DraggablePlayerCard
         key={p.id}
         player={p}
         onSelect={onSelect}
         isSelected={selectedPlayerId === p.id}
         isMenuOpen={activeMenuId === p.id}
         toggleMenu={() => setActiveMenuId(activeMenuId === p.id ? null : p.id)}
         activeMenuId={activeMenuId}
         readOnly={readOnly}
         bindingId={bindingId}
         bindingType={bindingType}
         players={players}
         onEdit={onEdit}
         onViewStats={onViewStats}
         onUnbind={onUnbind}
         onBind={onBind}
         onChangeStatus={onChangeStatus}
         onRemove={onRemove}
      />
  );

  return (
    <div className="space-y-3">
      
      {playingPlayers.length > 0 && (
        <div className="rounded-xl border border-red-500/30 overflow-hidden bg-red-900/10">
          <div className="px-2 py-1.5 bg-red-900/30 flex justify-between items-center border-b border-red-500/20">
            <span className="font-bold text-xs text-red-300 flex items-center gap-1.5">
               <Swords size={12}/> 比賽中
            </span>
            <span className="text-[10px] text-red-300/60">{playingPlayers.length} 人</span>
          </div>
          <div className="p-2">
             <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {playingPlayers.map(p => renderCard(p))}
             </div>
          </div>
        </div>
      )}

      {(fixedPlayers.length > 0 || !readOnly) && (
        <DroppableZone 
          id="zone-fixed" 
          status="fixed"
          className="rounded-xl border border-blue-500/30 overflow-hidden bg-blue-900/10"
          headerColorClass="blue"
          borderColorClass="blue"
          icon={Anchor}
          title="綁定區 (手動)"
          count={fixedPlayers.length}
          isEmpty={fixedPlayers.length === 0}
          emptyMessage={<div className="text-center text-[10px] text-gray-500 py-4 border border-dashed border-white/5 rounded">拖曳至此綁定</div>}
        >
             <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {fixedPlayers.map(p => renderCard(p))}
             </div>
        </DroppableZone>
      )}

      <DroppableZone
          id="zone-waiting"
          status="waiting"
          className="rounded-xl border border-emerald-500/30 overflow-hidden bg-emerald-900/10"
          headerColorClass="emerald"
          borderColorClass="emerald"
          icon={Swords}
          title="備戰區 (智能排點)"
          count={waitingPlayers.length}
          isEmpty={waitingPlayers.length === 0}
          emptyMessage={
              <div className="text-center text-[10px] text-gray-500 py-6 border border-dashed border-white/5 rounded flex flex-col items-center gap-1">
                <span className="text-xl opacity-50">😴</span>
                暫無備戰球員
              </div>
          }
      >
           <div className="space-y-3">
               {LEVEL_ORDER.map(level => {
                 const levelPlayers = waitingPlayers
                   .filter(p => p.level === level)
                   .sort((a, b) => b.battlePower - a.battlePower);

                 if (levelPlayers.length === 0) return null;
                 
                 const style = LEVEL_STYLES[level];

                 return (
                   <div key={level} className="relative">
                      <div className={`flex items-center gap-2 mb-1.5 pb-0.5 border-b ${style.border} border-dashed border-opacity-30`}>
                        <span className={`text-[9px] font-bold text-black px-1.5 py-0.5 rounded ${style.badge}`}>
                          {style.name}
                        </span>
                        <span className="text-[9px] text-gray-500">{levelPlayers.length} 人</span>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                        {levelPlayers.map(p => renderCard(p))}
                      </div>
                   </div>
                 );
               })}
           </div>
      </DroppableZone>

      {(restingPlayers.length > 0 || !readOnly) && (
        <DroppableZone
            id="zone-resting"
            status="resting"
            className="rounded-xl border border-yellow-500/30 overflow-hidden bg-yellow-900/10 opacity-80"
            headerColorClass="yellow"
            borderColorClass="yellow"
            icon={PauseCircle}
            title="休息區"
            count={restingPlayers.length}
            isEmpty={restingPlayers.length === 0}
            emptyMessage={<div className="text-center text-[10px] text-gray-500 py-4 border border-dashed border-white/5 rounded">拖曳至此休息</div>}
        >
             <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {restingPlayers.map(p => renderCard(p))}
             </div>
        </DroppableZone>
      )}

    </div>
  );
};

export default PlayerList;