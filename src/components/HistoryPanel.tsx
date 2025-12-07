import React from 'react';
import type { MatchRecord } from '../types';
import { Clock, Trophy, MapPin } from 'lucide-react';

interface Props {
  history: MatchRecord[];
  onClear: () => void;
}

const HistoryPanel: React.FC<Props> = ({ history, onClear }) => {
  return (
    <div className="bg-[#062c1f] rounded-xl border border-white/10 flex flex-col h-full max-h-[500px]">
      <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#041f16]">
        <h3 className="font-bold text-white flex items-center gap-2"><Clock size={18} className="text-emerald-400"/>對戰紀錄</h3>
        <button onClick={onClear} className="text-xs text-gray-400 hover:text-white transition-colors bg-white/5 px-2 py-1 rounded">清空</button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar bg-[#031811]">
        {history.length === 0 ? <div className="flex flex-col items-center justify-center h-full text-gray-600 space-y-2"><Clock size={32} className="opacity-20" /><span className="text-sm">暫無紀錄</span></div> : (
          history.slice().reverse().map((record) => {
            const isTeamAWin = record.winner === 'Team A';
            const isTeamBWin = record.winner === 'Team B';
            const isDraw = record.winner === 'Draw';
            let scoreA = 0, scoreB = 0;
            if (record.score && record.score.includes(':')) {
                const parts = record.score.split(':');
                scoreA = parseInt(parts[0].trim());
                scoreB = parseInt(parts[1].trim());
            }
            return (
              <div key={record.id} className="bg-[#0a2e1f] rounded-xl border border-white/5 overflow-hidden shadow-md">
                <div className="bg-black/20 px-3 py-1.5 flex justify-between items-center text-[10px] text-gray-400">
                    <span className="flex items-center gap-1 font-mono"><Clock size={10} /> {record.time}</span>
                    <span className="flex items-center gap-1"><MapPin size={10} /> {record.courtId}號場<span className="bg-white/10 px-1 rounded text-gray-300 ml-1">{record.duration} mins</span></span>
                </div>
                <div className="flex items-stretch">
                    <div className={`flex-1 p-3 flex flex-col justify-center gap-1 relative ${isTeamAWin ? 'bg-gradient-to-r from-yellow-900/20 to-transparent' : 'opacity-70'}`}>
                        {isTeamAWin && <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-500"></div>}
                        {record.players.slice(0, 2).map((p, i) => <div key={i} className={`text-sm font-bold truncate ${isTeamAWin ? 'text-yellow-100' : 'text-gray-400'}`}>{p}</div>)}
                    </div>
                    <div className="w-20 flex flex-col items-center justify-center bg-black/20 border-x border-white/5">
                        <div className="font-black text-xl tracking-wider text-white font-mono leading-none">
                            {record.score.includes(':') ? <><span className={isTeamAWin ? 'text-yellow-400' : (isTeamBWin ? 'text-gray-500' : 'text-white')}>{scoreA}</span><span className="text-gray-600 text-sm mx-0.5">:</span><span className={isTeamBWin ? 'text-blue-400' : (isTeamAWin ? 'text-gray-500' : 'text-white')}>{scoreB}</span></> : <span className="text-xs text-gray-400">{isDraw ? '平手' : (isTeamAWin ? 'A勝' : 'B勝')}</span>}
                        </div>
                        {!isDraw && <div className="mt-1"><Trophy size={12} className={isTeamAWin ? 'text-yellow-500' : 'text-blue-500'} /></div>}
                    </div>
                    <div className={`flex-1 p-3 flex flex-col justify-center items-end gap-1 relative ${isTeamBWin ? 'bg-gradient-to-l from-blue-900/20 to-transparent' : 'opacity-70'}`}>
                        {isTeamBWin && <div className="absolute right-0 top-0 bottom-0 w-1 bg-blue-500"></div>}
                        {record.players.slice(2, 4).map((p, i) => <div key={i} className={`text-sm font-bold truncate ${isTeamBWin ? 'text-blue-100' : 'text-gray-400'}`}>{p}</div>)}
                    </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default HistoryPanel;