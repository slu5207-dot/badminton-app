
import React, { useEffect, useState } from 'react';
import { Court, Player } from '../types';
import { LEVEL_COLORS } from '../constants';
import { Timer, UserPlus, XCircle, Trophy, Swords, CheckCircle, ArrowDown, Play } from 'lucide-react';
import { useDroppable, useDraggable } from '@dnd-kit/core';

interface Props {
  court: Court;
  onFinish: (courtId: number, scoreA: number, scoreB: number, explicitWinner?: 'Team A' | 'Team B' | 'Draw') => void;
  onStart: (courtId: number) => void;
  onRemovePlayer: (courtId: number, slotIndex: number, isNextMatch?: boolean) => void;
  onSelectSlot: (courtId: number, slotIndex: number, isNextMatch?: boolean) => void;
  isSelected?: boolean;
  nextMatchRanks?: (number | null)[];
}

// Draggable wrapper for player on court
const DraggableCourtPlayer: React.FC<{
    player: Player;
    courtId: number;
    slotIndex: number;
    isNextMatch: boolean;
    onRemove: () => void;
    canInteract: boolean;
    rank: number | null;
}> = ({ player, courtId, slotIndex, isNextMatch, onRemove, canInteract, rank }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `court-${courtId}-${isNextMatch ? 'next' : 'curr'}-${slotIndex}`,
        data: {
            type: 'player',
            player: player,
            source: 'court',
            courtId,
            slotIndex,
            isNextMatch
        },
        disabled: !canInteract
    });

    return (
        <div 
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            style={{ 
                transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
                zIndex: isDragging ? 50 : 'auto',
                opacity: isDragging ? 0.3 : 1, // Ghost effect
                touchAction: 'manipulation'
            }}
            className="relative group animate-fade-in-up flex flex-col items-center touch-manipulation cursor-grab active:cursor-grabbing"
        >
            <div className="relative">
              <div className={`${isNextMatch ? 'w-10 h-10 text-sm' : 'w-12 h-12 lg:w-14 lg:h-14 text-base'} rounded-full flex items-center justify-center text-white font-bold shadow-md ${LEVEL_COLORS[player.level] || 'bg-gray-500'} border-2 border-white ring-2 ring-black/20`}>
                {player.name.slice(0, 2)}
              </div>
              
              <div className="absolute -top-1 -left-1 bg-yellow-500 text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 border border-white shadow-sm z-20">
                <Trophy size={6} className="fill-black" />
                {player.playCount}
              </div>

              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 border border-white/30 whitespace-nowrap z-20">
                <Swords size={6} className="text-red-400" />
                {player.battlePower}
              </div>

              {rank !== null && (
                <div className="absolute top-0 -right-2 bg-purple-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-white shadow-sm z-30 animate-pulse">
                   序{rank}
                </div>
              )}

              {canInteract && (
                <button 
                  onClick={(e) => {
                      e.stopPropagation();
                      onRemove();
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="absolute -top-1 -right-1 bg-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-30 hover:scale-110"
                >
                  <XCircle size={12} className="text-white" />
                </button>
              )}
            </div>

            <div className="mt-2 text-center w-full">
                <div className={`${isNextMatch ? 'text-[10px] max-w-[60px]' : 'text-[10px] max-w-[70px]'} text-white bg-black/50 rounded px-1 py-0.5 truncate w-full shadow-sm backdrop-blur-sm mx-auto`}>
                {player.name}
                </div>
            </div>
        </div>
    );
};

// Droppable Slot Wrapper
const CourtSlot: React.FC<{
    courtId: number;
    index: number;
    isNextMatch: boolean;
    children: React.ReactNode;
    isOver?: boolean;
}> = ({ courtId, index, isNextMatch, children }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: `slot-${courtId}-${isNextMatch ? 'next' : 'curr'}-${index}`,
        data: {
            type: 'slot',
            courtId,
            index,
            isNextMatch
        }
    });

    return (
        <div 
            ref={setNodeRef} 
            className={`w-full h-full flex items-center justify-center ${isNextMatch ? 'p-1' : ''} relative z-20 transition-colors rounded-full ${isOver ? 'bg-white/20 ring-2 ring-emerald-400' : ''}`}
        >
            {children}
        </div>
    );
};

const BadmintonCourt: React.FC<Props> = ({ court, onFinish, onStart, onRemovePlayer, onSelectSlot, isSelected, nextMatchRanks }) => {
  const [elapsed, setElapsed] = useState<string>('00:00');
  const [isFinishing, setIsFinishing] = useState(false);
  const [scoreA, setScoreA] = useState<string>('');
  const [scoreB, setScoreB] = useState<string>('');

  useEffect(() => {
    let interval: number;
    if (court.status === 'active' && court.startTime) {
      const updateTimer = () => {
        const now = Date.now();
        const diff = Math.floor((now - court.startTime!) / 1000);
        const mins = Math.floor(diff / 60).toString().padStart(2, '0');
        const secs = (diff % 60).toString().padStart(2, '0');
        setElapsed(`${mins}:${secs}`);
      };
      
      updateTimer();
      interval = window.setInterval(updateTimer, 1000);
    } else {
      setElapsed('00:00');
    }
    return () => clearInterval(interval);
  }, [court.status, court.startTime]);

  const pA1 = court.players[0];
  const pA2 = court.players[1];
  const pB1 = court.players[2];
  const pB2 = court.players[3];

  const sumA = (pA1?.battlePower || 0) + (pA2?.battlePower || 0);
  const sumB = (pB1?.battlePower || 0) + (pB2?.battlePower || 0);
  const diff = Math.abs(sumA - sumB);
  
  const filledCount = court.players.filter(p => p !== null).length;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isFull = filledCount === 4;
  const canAdd = court.status === 'empty' || court.status === 'ready';

  const handleFinishClick = () => {
    setIsFinishing(true);
    setScoreA('');
    setScoreB('');
  };

  const handleCancelFinish = () => {
    setIsFinishing(false);
  };

  const handleConfirmFinish = (winner?: 'Team A' | 'Team B' | 'Draw') => {
    const sA = scoreA === '' ? 0 : parseInt(scoreA);
    const sB = scoreB === '' ? 0 : parseInt(scoreB);
    onFinish(court.id, sA, sB, winner);
    setIsFinishing(false);
  };

  const renderPlayerSlot = (index: number, playersArray: (Player|null)[], isNextMatch: boolean = false) => {
    const player = playersArray[index];
    const canInteract = isNextMatch ? true : canAdd;
    const rank = isNextMatch && nextMatchRanks ? nextMatchRanks[index] : null;

    return (
      <CourtSlot courtId={court.id} index={index} isNextMatch={isNextMatch}>
        {player ? (
           <DraggableCourtPlayer 
              player={player} 
              courtId={court.id} 
              slotIndex={index} 
              isNextMatch={isNextMatch}
              onRemove={() => onRemovePlayer(court.id, index, isNextMatch)}
              canInteract={canInteract}
              rank={rank}
           />
        ) : (
          canInteract && (
            <button 
              onClick={() => onSelectSlot(court.id, index, isNextMatch)}
              className={`${isNextMatch ? 'w-10 h-10' : 'w-12 h-12'} rounded-full border-2 border-dashed border-white/40 flex items-center justify-center hover:bg-white/20 hover:border-emerald-300 hover:text-emerald-300 transition-all text-white/40 group`}
            >
              <UserPlus size={isNextMatch ? 14 : 18} className="group-hover:scale-110 transition-transform" />
            </button>
          )
        )}
      </CourtSlot>
    );
  };

  return (
    <div className={`relative flex flex-col bg-[#0f4d36] rounded-xl overflow-hidden shadow-lg border-2 transition-all ${isSelected ? 'border-emerald-400 ring-2 ring-emerald-400/50' : 'border-white/10'}`}>
      
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-2 bg-[#062c1f] text-white border-b border-white/5 relative z-10">
        <span className="font-bold text-lg text-emerald-100/90">{court.id} 號場</span>
        {court.status === 'active' && (
          <div className="flex items-center gap-1 text-emerald-400 font-mono text-sm bg-emerald-900/30 px-2 py-0.5 rounded-full border border-emerald-500/20">
            <Timer size={14} />
            <span>{elapsed}</span>
          </div>
        )}
        {court.status === 'ready' && (
          <div className="text-xs font-bold text-yellow-400 bg-yellow-900/30 px-2 py-0.5 rounded-full animate-pulse border border-yellow-500/20">
             等待開始
          </div>
        )}
      </div>

      {/* Main Court Area */}
      <div className="relative flex-1 bg-[#0da083] p-4 min-h-[280px] flex items-center justify-center overflow-hidden">
        
        {/* The Court Drawing */}
        <div className="relative w-full aspect-[2/1] border-2 border-white box-border shadow-inner-lg">
            
            {/* Net (Center Vertical) */}
            <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[2px] bg-white/50 z-10">
                {/* Net posts */}
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white rounded-full"></div>
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white rounded-full"></div>
            </div>

            {/* Center Line (Horizontal) */}
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] bg-white z-0"></div>

            {/* Short Service Lines (Vertical) approx 15% from center */}
            <div className="absolute top-0 bottom-0 left-[35%] w-[2px] bg-white z-0"></div>
            <div className="absolute top-0 bottom-0 right-[35%] w-[2px] bg-white z-0"></div>

            {/* Doubles Long Service Lines (Vertical) approx 5% from back */}
            <div className="absolute top-0 bottom-0 left-[8%] w-[2px] bg-white z-0"></div>
            <div className="absolute top-0 bottom-0 right-[8%] w-[2px] bg-white z-0"></div>

            {/* Singles Side Lines (Horizontal) approx 8% from top/bottom */}
            <div className="absolute left-0 right-0 top-[10%] h-[2px] bg-white z-0"></div>
            <div className="absolute left-0 right-0 bottom-[10%] h-[2px] bg-white z-0"></div>

            {/* Labels (Traditional Chinese) */}
            <div className="absolute left-[20%] top-[30%] text-[10px] text-white/50 font-bold -translate-x-1/2 -translate-y-1/2 tracking-widest pointer-events-none rotate-90 sm:rotate-0">左發球區</div>
            <div className="absolute left-[20%] bottom-[30%] text-[10px] text-white/50 font-bold -translate-x-1/2 translate-y-1/2 tracking-widest pointer-events-none rotate-90 sm:rotate-0">右發球區</div>
            
            <div className="absolute right-[20%] top-[30%] text-[10px] text-white/50 font-bold translate-x-1/2 -translate-y-1/2 tracking-widest pointer-events-none rotate-90 sm:rotate-0">右發球區</div>
            <div className="absolute right-[20%] bottom-[30%] text-[10px] text-white/50 font-bold translate-x-1/2 translate-y-1/2 tracking-widest pointer-events-none rotate-90 sm:rotate-0">左發球區</div>

            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0da083] px-1 z-10">
               <span className="text-[10px] text-white/50 font-bold">球網</span>
            </div>


            {/* Player Positioning Overlay */}
            <div className="absolute inset-0 flex">
               {/* Team A (Left Side) */}
               <div className="flex-1 flex flex-col relative z-20">
                  <div className="absolute top-1/2 left-4 -translate-y-1/2 pointer-events-none opacity-20 z-0">
                      <span className="text-4xl font-black text-yellow-300 tracking-tighter">A</span>
                  </div>
                  <div className="absolute top-0 left-0 bg-gradient-to-br from-yellow-500/80 to-yellow-600/80 text-black text-[10px] font-black px-2 py-1 rounded-br-lg shadow-sm border-r border-b border-white/20 z-30">
                     TEAM A
                  </div>
                  
                  {/* P1 Top Left */}
                  <div className="flex-1 flex items-center justify-center pl-4 pb-2 relative z-20">
                      {renderPlayerSlot(0, court.players)}
                  </div>
                  {/* P2 Bottom Left */}
                  <div className="flex-1 flex items-center justify-center pl-4 pt-2 relative z-20">
                      {renderPlayerSlot(1, court.players)}
                  </div>
               </div>

               {/* Team B (Right Side) */}
               <div className="flex-1 flex flex-col relative z-20">
                  <div className="absolute top-1/2 right-4 -translate-y-1/2 pointer-events-none opacity-20 z-0">
                      <span className="text-4xl font-black text-blue-300 tracking-tighter">B</span>
                  </div>
                  <div className="absolute top-0 right-0 bg-gradient-to-bl from-blue-500/80 to-blue-600/80 text-white text-[10px] font-black px-2 py-1 rounded-bl-lg shadow-sm border-l border-b border-white/20 z-30">
                     TEAM B
                  </div>
                  
                  {/* P3 Top Right */}
                  <div className="flex-1 flex items-center justify-center pr-4 pb-2 relative z-20">
                      {renderPlayerSlot(2, court.players)}
                  </div>
                  {/* P4 Bottom Right */}
                  <div className="flex-1 flex items-center justify-center pr-4 pt-2 relative z-20">
                      {renderPlayerSlot(3, court.players)}
                  </div>
               </div>
            </div>

            {/* Score Stats Badge */}
            {filledCount >= 2 && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none mt-4">
                  <div className="flex items-center gap-2 bg-black/80 backdrop-blur-md px-2 py-1 rounded-full border border-white/20 shadow-xl">
                      <div className="flex flex-col items-center leading-none">
                        <span className="text-[10px] font-mono font-bold text-yellow-400">{sumA}</span>
                      </div>
                      <div className="h-4 w-px bg-white/20"></div>
                      <div className="flex flex-col items-center">
                        <span className={`text-[10px] font-mono font-bold ${diff > 300 ? 'text-red-400' : 'text-emerald-400'}`}>
                          {diff}
                        </span>
                      </div>
                      <div className="h-4 w-px bg-white/20"></div>
                      <div className="flex flex-col items-center leading-none">
                        <span className="text-[10px] font-mono font-bold text-blue-400">{sumB}</span>
                      </div>
                  </div>
                </div>
            )}
        </div>

        {/* Finishing Overlay */}
        {isFinishing && (
          <div className="absolute inset-0 z-40 bg-[#031811]/95 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fade-in text-white">
             <div className="w-full max-w-[260px] flex flex-col gap-4">
                <div className="text-center mb-1">
                   <h4 className="font-bold text-lg tracking-wide text-emerald-100">比賽結束</h4>
                   <p className="text-xs text-emerald-400/60">輸入比分或直接選擇勝方</p>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => handleConfirmFinish('Team A')} className="flex-1 bg-gradient-to-br from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600 py-3 rounded-lg text-xs font-bold shadow-lg border border-yellow-400/30 active:scale-95 transition-all flex flex-col items-center gap-1">
                     <Trophy size={14} className="text-yellow-200"/>
                     A隊 勝
                  </button>
                  <button onClick={() => handleConfirmFinish('Draw')} className="px-4 bg-gray-700 hover:bg-gray-600 py-3 rounded-lg text-xs font-bold shadow-lg border border-gray-500/30 active:scale-95 transition-all flex flex-col items-center gap-1 justify-center">
                     <div className="w-3 h-1 bg-gray-300 rounded-full mb-1"></div>
                     平手
                  </button>
                  <button onClick={() => handleConfirmFinish('Team B')} className="flex-1 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 py-3 rounded-lg text-xs font-bold shadow-lg border border-blue-400/30 active:scale-95 transition-all flex flex-col items-center gap-1">
                     <Trophy size={14} className="text-blue-200"/>
                     B隊 勝
                  </button>
                </div>

                <div className="flex items-center gap-3 justify-center bg-black/30 p-3 rounded-xl border border-white/5 mt-1">
                    <div className="flex flex-col items-center gap-1">
                       <span className="text-[10px] text-yellow-500 font-bold">A隊得分</span>
                       <input type="number" value={scoreA} onChange={(e) => setScoreA(e.target.value)} placeholder="0" className="w-14 h-10 text-center bg-gray-800 border border-gray-600 rounded font-bold text-lg focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all placeholder-gray-600"/>
                    </div>
                    <span className="font-black text-gray-500 text-xl mt-4">:</span>
                    <div className="flex flex-col items-center gap-1">
                       <span className="text-xs text-blue-500 font-bold">B隊得分</span>
                       <input type="number" value={scoreB} onChange={(e) => setScoreB(e.target.value)} placeholder="0" className="w-14 h-10 text-center bg-gray-800 border border-gray-600 rounded font-bold text-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder-gray-600"/>
                    </div>
                 </div>

                 <div className="flex gap-2 mt-2 pt-2 border-t border-white/10">
                    <button onClick={handleCancelFinish} className="flex-1 bg-transparent hover:bg-white/5 text-gray-400 hover:text-white py-2 rounded text-sm transition-colors">取消</button>
                    <button onClick={() => handleConfirmFinish()} className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-2 rounded text-sm font-bold flex items-center justify-center gap-1 shadow-lg shadow-emerald-900/50">
                       <CheckCircle size={16}/> 保存紀錄
                    </button>
                 </div>
             </div>
          </div>
        )}
      </div>

      {/* Next Match Queue */}
      <div className="bg-[#052119] border-t border-white/10 px-4 py-2">
         <div className="flex items-center gap-2 mb-2">
             <span className="text-[10px] uppercase font-bold text-emerald-500/50 tracking-widest flex items-center gap-1">
               Next Match <ArrowDown size={10} />
             </span>
         </div>
         <div className="grid grid-cols-4 gap-2 h-14">
             {court.nextMatch.map((_, idx) => (
                <div key={idx} className="bg-black/20 rounded-lg border border-white/5 overflow-hidden">
                   {renderPlayerSlot(idx, court.nextMatch, true)}
                </div>
             ))}
         </div>
      </div>

      {/* Footer Actions */}
      <div className="px-4 py-2.5 bg-[#062c1f] flex justify-center border-t border-white/10 relative z-10">
        {court.status === 'active' ? (
           !isFinishing && (
             <button 
             onClick={handleFinishClick}
             className="w-full bg-red-600/90 hover:bg-red-600 text-white text-sm py-2 rounded-lg font-bold transition-colors shadow-lg shadow-red-900/20 active:translate-y-0.5"
           >
             結束比賽
           </button>
           )
        ) : court.status === 'ready' ? (
            <button 
              onClick={() => onStart(court.id)}
              className="w-full bg-green-600 hover:bg-green-500 text-white text-sm py-2 rounded-lg font-bold transition-colors shadow-lg shadow-green-900/20 active:translate-y-0.5 flex items-center justify-center gap-2 animate-pulse"
            >
              <Play size={16} fill="currentColor"/> 開始比賽
            </button>
        ) : (
          <div className="text-center w-full flex items-center justify-center h-9">
             <span className="text-xs text-gray-400 flex items-center gap-2">
                 點擊或拖曳加入球員 <span className="bg-gray-700 px-1.5 py-0.5 rounded text-white font-mono">{filledCount}/4</span>
             </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default BadmintonCourt;
