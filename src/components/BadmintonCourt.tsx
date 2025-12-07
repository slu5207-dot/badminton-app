import React, { useEffect, useState } from 'react';
import { LEVEL_COLORS } from '../constants';
import type { Court } from '../types'; // 修正重點：只保留 Court，移除 Player
import { Timer, UserPlus, XCircle, Trophy, Swords, Play, CheckCircle, ArrowDown } from 'lucide-react';

interface Props {
  court: Court;
  onFinish: (courtId: number, scoreA: number, scoreB: number, explicitWinner?: 'Team A' | 'Team B' | 'Draw') => void;
  onStart: (courtId: number) => void;
  onRemovePlayer: (courtId: number, slotIndex: number, isNextMatch?: boolean) => void;
  onSelectSlot: (courtId: number, slotIndex: number, isNextMatch?: boolean) => void;
  isSelected?: boolean;
  nextMatchRanks?: (number | null)[];
}

const BadmintonCourt: React.FC<Props> = ({ court, onFinish, onStart, onRemovePlayer, onSelectSlot, isSelected, nextMatchRanks }) => {
  const [elapsed, setElapsed] = useState<string>('00:00');
  const [isFinishing, setIsFinishing] = useState(false);
  const [scoreA, setScoreA] = useState<string>('');
  const [scoreB, setScoreB] = useState<string>('');

  useEffect(() => {
    let interval: number;
    if (court.status === 'active' && court.startTime) {
      interval = window.setInterval(() => {
        const now = Date.now();
        const diff = Math.floor((now - court.startTime!) / 1000);
        const mins = Math.floor(diff / 60).toString().padStart(2, '0');
        const secs = (diff % 60).toString().padStart(2, '0');
        setElapsed(`${mins}:${secs}`);
      }, 1000);
    } else {
      setElapsed('00:00');
    }
    return () => clearInterval(interval);
  }, [court.status, court.startTime]);

  // 直接讀取，不用宣告變數
  const sumA = (court.players[0]?.battlePower || 0) + (court.players[1]?.battlePower || 0);
  const sumB = (court.players[2]?.battlePower || 0) + (court.players[3]?.battlePower || 0);
  const diff = Math.abs(sumA - sumB);
  
  const filledCount = court.players.filter(p => p !== null).length;
  const canAdd = court.status === 'empty' || court.status === 'ready';

  const handleConfirmFinish = (winner?: 'Team A' | 'Team B' | 'Draw') => {
    const sA = scoreA === '' ? 0 : parseInt(scoreA);
    const sB = scoreB === '' ? 0 : parseInt(scoreB);
    onFinish(court.id, sA, sB, winner);
    setIsFinishing(false);
  };

  const renderNextMatchSlot = (index: number) => {
    const player = court.nextMatch[index];
    const rank = nextMatchRanks ? nextMatchRanks[index] : null;
    
    return (
        <div key={index} className="bg-black/20 rounded-lg border border-white/10 p-1 flex items-center justify-center relative h-14 cursor-pointer hover:bg-white/5" onClick={() => onSelectSlot(court.id, index, true)}>
            {player ? (
                <div className="flex items-center gap-2 w-full px-2">
                    <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm border border-white/30 ${LEVEL_COLORS[player.level]}`}>
                        {player.level === '職業' ? '職' : player.name.slice(0, 1)}
                    </div>
                    <span className="text-xs text-white truncate font-medium flex-1">{player.name}</span>
                    <button onClick={(e) => {e.stopPropagation(); onRemovePlayer(court.id, index, true)}} className="shrink-0 bg-red-500 rounded-full p-0.5 shadow hover:scale-110 z-20">
                        <XCircle size={12} className="text-white"/>
                    </button>
                    {rank !== null && <div className="absolute -top-2 left-0 bg-purple-600 text-white text-[9px] font-bold px-1.5 rounded-full border border-white/20 z-10">序{rank}</div>}
                </div>
            ) : (
                <UserPlus size={16} className="text-white/20"/>
            )}
        </div>
    );
  };

  const renderCourtPlayer = (index: number) => {
      const player = court.players[index];
      
      if (!player) {
          return canAdd ? (
            <button 
              onClick={(e) => { e.stopPropagation(); onSelectSlot(court.id, index, false); }}
              className="relative z-30 w-12 h-12 rounded-full border-2 border-dashed border-white/30 flex items-center justify-center hover:bg-white/20 hover:border-emerald-400 text-white/30 hover:text-emerald-400 transition-all"
            >
               <UserPlus size={20} />
            </button>
          ) : null;
      }

      return (
          <div className="flex flex-col items-center gap-1 relative z-20 animate-fade-in group cursor-default">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center text-base font-bold text-white shadow-lg border-2 border-white ring-4 ring-black/20 ${LEVEL_COLORS[player.level] || 'bg-gray-500'}`}>
                  {player.level === '職業' ? '職' : player.name.slice(0, 2)}
              </div>
              <div className="bg-black/70 backdrop-blur-md text-white text-xs px-2 py-0.5 rounded-full font-bold shadow-md border border-white/10 max-w-[80px] truncate">
                  {player.name}
              </div>
              
              <div className="absolute -top-1 -right-2 bg-yellow-500 text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm border border-white">
                 <Trophy size={8} className="fill-black"/> {player.playCount}
              </div>

              <div className="absolute -top-1 -left-2 bg-gray-800 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 border border-white/30 shadow-sm">
                 <Swords size={8} className="text-red-400"/> {player.battlePower}
              </div>
              
              {canAdd && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onRemovePlayer(court.id, index, false); }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:scale-110 z-30 shadow-lg"
                >
                    <XCircle size={14}/>
                </button>
              )}
          </div>
      );
  };

  return (
    <div className={`relative flex flex-col bg-[#062c1f] rounded-2xl overflow-hidden border transition-all h-[420px] ${isSelected ? 'border-emerald-400 ring-2 ring-emerald-400/50' : 'border-white/10 shadow-xl'}`}>
      
      {/* 1. Header */}
      <div className="flex flex-col bg-[#042017] border-b border-white/5">
          <div className="flex justify-between items-center px-4 py-2">
            <span className="font-bold text-lg tracking-wider text-emerald-100">{court.name}</span>
            <div className="flex items-center gap-2">
                {court.status === 'active' && <div className="flex items-center gap-1 text-emerald-400 font-mono text-sm bg-emerald-900/30 px-2 py-0.5 rounded-full border border-emerald-500/20"><Timer size={14} /><span>{elapsed}</span></div>}
                {court.status === 'ready' && <div className="text-xs font-bold text-yellow-400 bg-yellow-900/30 px-2 py-0.5 rounded-full animate-pulse border border-yellow-500/20">等待開始</div>}
            </div>
          </div>
          
          {filledCount >= 2 && (
             <div className="flex items-center justify-between px-6 py-1 text-xs font-mono bg-black/20 text-gray-400">
                 <div className="flex gap-1 items-center"><span className="text-yellow-500 font-bold">A戰力</span><span>{sumA}</span></div>
                 <div className={`flex gap-1 items-center px-2 py-0.5 rounded ${diff > 300 ? 'bg-red-900/50 text-red-300' : 'bg-emerald-900/50 text-emerald-300'}`}>差: {diff}</div>
                 <div className="flex gap-1 items-center"><span className="text-blue-500 font-bold">B戰力</span><span>{sumB}</span></div>
             </div>
          )}
      </div>

      {/* 2. Court Visual */}
      <div className="relative flex-1 bg-[#1d986b] p-2 flex items-center justify-center">
          <div className="absolute inset-2 border-2 border-white/80 opacity-90 pointer-events-none"></div>
          <div className="absolute top-2 bottom-2 left-1/2 w-1 bg-white/40 -translate-x-1/2 flex flex-col justify-center pointer-events-none">
             <div className="w-full h-full bg-[linear-gradient(45deg,#fff_25%,transparent_25%,transparent_75%,#fff_75%,#fff),linear-gradient(45deg,#fff_25%,transparent_25%,transparent_75%,#fff_75%,#fff)] bg-[length:4px_4px] opacity-30"></div>
          </div>
          <div className="absolute top-2 bottom-2 left-[30%] w-px bg-white/60 pointer-events-none"></div>
          <div className="absolute top-2 bottom-2 right-[30%] w-px bg-white/60 pointer-events-none"></div>
          <div className="absolute left-2 right-2 top-1/2 h-px bg-white/60 pointer-events-none"></div>

          <div className="w-full h-full grid grid-cols-2 grid-rows-1 z-10">
              <div className="relative grid grid-rows-2">
                  <div className="absolute left-1 bottom-1 text-[10px] font-black text-white/20 tracking-widest pointer-events-none">A隊</div>
                  <div className="flex items-center justify-center p-2">{renderCourtPlayer(0)}</div>
                  <div className="flex items-center justify-center p-2">{renderCourtPlayer(1)}</div>
              </div>
              <div className="relative grid grid-rows-2">
                  <div className="absolute right-1 bottom-1 text-[10px] font-black text-white/20 tracking-widest pointer-events-none">B隊</div>
                  <div className="flex items-center justify-center p-2">{renderCourtPlayer(2)}</div>
                  <div className="flex items-center justify-center p-2">{renderCourtPlayer(3)}</div>
              </div>
          </div>
      </div>

      {/* 3. Next Match */}
      <div className="bg-[#052119] border-t border-white/10 px-3 py-2 shrink-0">
         <div className="flex items-center gap-2 mb-1.5">
             <span className="text-[10px] uppercase font-bold text-emerald-500/50 tracking-widest flex items-center gap-1">Next Match <ArrowDown size={10} /></span>
         </div>
         <div className="grid grid-cols-4 gap-2">
             {[0, 1, 2, 3].map((idx) => renderNextMatchSlot(idx))}
         </div>
      </div>

      {/* 4. Action Button */}
      <div className="px-3 py-2 bg-[#062c1f] flex justify-center border-t border-white/10 shrink-0">
        {court.status === 'active' ? (
           !isFinishing && <button onClick={() => setIsFinishing(true)} className="w-full bg-red-600/90 hover:bg-red-600 text-white text-xs py-2.5 rounded-lg font-bold transition-colors shadow-lg">結束比賽</button>
        ) : court.status === 'ready' ? (
            <button onClick={() => onStart(court.id)} className="w-full bg-green-600 hover:bg-green-500 text-white text-xs py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 animate-pulse shadow-lg"><Play size={14} fill="currentColor"/> 開始比賽</button>
        ) : (
          <div className="text-center w-full py-1.5"><span className="text-xs text-gray-500 font-medium">等待球員入列 ({filledCount}/4)</span></div>
        )}
      </div>

      {/* --- FINISH MODAL --- */}
      {isFinishing && (
        <div className="absolute inset-0 z-50 bg-[#02120c]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-white animate-fade-in">
            <h4 className="font-bold text-xl mb-6 text-emerald-100 tracking-wider">比賽結果</h4>
            <div className="flex gap-2 w-full mb-6">
                <button onClick={() => handleConfirmFinish('Team A')} className="flex-1 bg-yellow-600/20 border border-yellow-600 hover:bg-yellow-600 text-yellow-400 hover:text-white py-3 rounded-xl font-bold transition-all active:scale-95">A隊 勝</button>
                <button onClick={() => handleConfirmFinish('Draw')} className="flex-1 bg-gray-700/50 border border-gray-600 hover:bg-gray-600 text-gray-300 hover:text-white py-3 rounded-xl font-bold transition-all active:scale-95">平手</button>
                <button onClick={() => handleConfirmFinish('Team B')} className="flex-1 bg-blue-600/20 border border-blue-600 hover:bg-blue-600 text-blue-400 hover:text-white py-3 rounded-xl font-bold transition-all active:scale-95">B隊 勝</button>
            </div>
            <div className="flex items-center gap-4 mb-8 bg-black/40 p-4 rounded-2xl border border-white/5">
                <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] text-yellow-500 font-bold">TEAM A</span>
                    <input type="number" value={scoreA} onChange={e=>setScoreA(e.target.value)} placeholder="0" className="w-16 h-12 text-center bg-[#0a2e1f] border border-emerald-500/30 rounded-xl text-2xl font-bold outline-none focus:border-yellow-500 transition-colors"/>
                </div>
                <span className="text-2xl font-black text-white/20">:</span>
                <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] text-blue-500 font-bold">TEAM B</span>
                    <input type="number" value={scoreB} onChange={e=>setScoreB(e.target.value)} placeholder="0" className="w-16 h-12 text-center bg-[#0a2e1f] border border-emerald-500/30 rounded-xl text-2xl font-bold outline-none focus:border-blue-500 transition-colors"/>
                </div>
            </div>
            <div className="flex gap-3 w-full">
                <button onClick={() => setIsFinishing(false)} className="flex-1 py-3 rounded-xl font-bold text-gray-400 hover:text-white hover:bg-white/10 transition-colors">取消</button>
                <button onClick={() => handleConfirmFinish()} className="flex-[2] bg-emerald-600 hover:bg-emerald-500 py-3 rounded-xl font-bold text-white shadow-lg shadow-emerald-900/50 flex items-center justify-center gap-2 transition-transform active:scale-95"><CheckCircle size={18}/> 保存紀錄</button>
            </div>
        </div>
      )}
    </div>
  );
};

export default BadmintonCourt;