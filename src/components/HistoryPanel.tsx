import React, { useState } from 'react';
import { MatchRecord } from '../types';
import { Trash2, Edit2, Check, X, Calendar, Clock, Trophy, Ban } from 'lucide-react';

interface Props {
  history: MatchRecord[];
  onClear: () => void;
  onClearToday: () => void;
  onDeleteMatch: (id: string) => void;
  onUpdateMatch: (id: string, scoreA: number, scoreB: number, winner?: 'Team A' | 'Team B' | 'Draw') => void;
}

const HistoryPanel: React.FC<Props> = ({ history, onClear, onClearToday, onDeleteMatch, onUpdateMatch }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editScoreA, setEditScoreA] = useState('');
  const [editScoreB, setEditScoreB] = useState('');

  // Sort history by date desc, then time desc
  const sortedHistory = [...history].sort((a, b) => {
    if (a.date !== b.date) return (b.date || '').localeCompare(a.date || '');
    return b.time.localeCompare(a.time);
  });

  const handleEditStart = (record: MatchRecord) => {
    setEditingId(record.id);
    const [sA, sB] = (record.score || '0 : 0').split(':').map(s => s.trim());
    setEditScoreA(sA || '0');
    setEditScoreB(sB || '0');
  };

  const handleEditSave = (id: string) => {
    const sA = parseInt(editScoreA);
    const sB = parseInt(editScoreB);
    onUpdateMatch(id, isNaN(sA) ? 0 : sA, isNaN(sB) ? 0 : sB);
    setEditingId(null);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a2e1f] rounded-xl border-l border-white/10 lg:border-0">
      <div className="p-4 border-b border-white/10 bg-[#062c1f] sticky top-0 z-10 rounded-t-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Trophy className="text-yellow-400" size={20} />
            對戰紀錄
          </h2>
          <span className="text-xs text-gray-400 font-mono bg-black/30 px-2 py-1 rounded">
             {history.length} 場
          </span>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={onClearToday}
            className="flex-1 bg-emerald-900/50 hover:bg-emerald-800 text-emerald-200 text-xs py-2 rounded border border-emerald-500/20 transition-colors"
          >
            清空今日
          </button>
          <button 
            onClick={onClear}
            className="flex-1 bg-red-900/50 hover:bg-red-800 text-red-200 text-xs py-2 rounded border border-red-500/20 transition-colors"
          >
            清空全部
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {sortedHistory.length === 0 ? (
          <div className="text-center py-10 text-gray-500 flex flex-col items-center gap-2">
             <Ban size={32} className="opacity-20"/>
             暫無對戰紀錄
          </div>
        ) : (
          sortedHistory.map((record) => (
            <div key={record.id} className="bg-black/20 rounded-lg p-3 border border-white/5 hover:border-white/10 transition-colors">
              <div className="flex justify-between items-start mb-2 pb-2 border-b border-white/5">
                <div className="flex items-center gap-2 text-[10px] text-gray-400">
                  <span className="flex items-center gap-1"><Calendar size={10}/> {record.date}</span>
                  <span className="flex items-center gap-1"><Clock size={10}/> {record.time}</span>
                  <span className="bg-gray-700/50 px-1.5 rounded text-gray-300">{record.duration}m</span>
                </div>
                
                <div className="flex gap-1">
                   {editingId === record.id ? (
                      <>
                        <button onClick={() => handleEditSave(record.id)} className="p-1 text-emerald-400 hover:bg-emerald-900/30 rounded"><Check size={14}/></button>
                        <button onClick={() => setEditingId(null)} className="p-1 text-gray-400 hover:bg-white/10 rounded"><X size={14}/></button>
                      </>
                   ) : (
                      <>
                        <button onClick={() => handleEditStart(record)} className="p-1 text-gray-500 hover:text-white hover:bg-white/10 rounded"><Edit2 size={12}/></button>
                        <button onClick={() => onDeleteMatch(record.id)} className="p-1 text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded"><Trash2 size={12}/></button>
                      </>
                   )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                {/* Team A */}
                <div className={`flex-1 flex flex-col items-start ${record.winner === 'Team A' ? 'opacity-100' : 'opacity-60'}`}>
                   {record.players.slice(0, 2).map((p, i) => (
                      <span key={i} className={`text-xs ${record.winner === 'Team A' ? 'text-yellow-200 font-bold' : 'text-gray-300'}`}>{p || '-'}</span>
                   ))}
                </div>

                {/* Score */}
                <div className="flex flex-col items-center min-w-[60px]">
                   {editingId === record.id ? (
                      <div className="flex items-center gap-1">
                         <input 
                           type="number" 
                           value={editScoreA} 
                           onChange={(e) => setEditScoreA(e.target.value)}
                           className="w-8 h-6 bg-black/50 border border-gray-600 rounded text-center text-sm font-bold text-white focus:border-emerald-500 outline-none"
                         />
                         <span className="text-gray-500">:</span>
                         <input 
                           type="number" 
                           value={editScoreB} 
                           onChange={(e) => setEditScoreB(e.target.value)}
                           className="w-8 h-6 bg-black/50 border border-gray-600 rounded text-center text-sm font-bold text-white focus:border-emerald-500 outline-none"
                         />
                      </div>
                   ) : (
                      <span className={`text-lg font-black font-mono tracking-wider ${record.winner === 'Draw' ? 'text-gray-400' : 'text-emerald-400'}`}>
                         {record.score}
                      </span>
                   )}
                   {record.winner !== 'Draw' && !editingId && (
                      <span className="text-[9px] text-yellow-500 font-bold bg-yellow-900/20 px-1.5 rounded-full border border-yellow-500/20 mt-1">
                        WIN
                      </span>
                   )}
                </div>

                {/* Team B */}
                <div className={`flex-1 flex flex-col items-end ${record.winner === 'Team B' ? 'opacity-100' : 'opacity-60'}`}>
                   {record.players.slice(2, 4).map((p, i) => (
                      <span key={i} className={`text-xs ${record.winner === 'Team B' ? 'text-blue-200 font-bold' : 'text-gray-300'}`}>{p || '-'}</span>
                   ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default HistoryPanel;