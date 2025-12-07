import React, { useState, useEffect, useRef } from 'react';
import { PlayerLevel } from './types';
import type { Player, Court, MatchRecord, ParticipantDetail } from './types';
import { INITIAL_PLAYERS, INITIAL_COURTS, LEVEL_COLORS } from './constants';
import BadmintonCourt from './components/BadmintonCourt';
import PlayerList from './components/PlayerList';
import HistoryPanel from './components/HistoryPanel';
import SignupSystem from './components/SignupSystem'; 
import { 
  Users, Plus, Settings, Trophy, ArrowRight, X, Zap, MoreVertical, CheckCircle,
  LogOut, Shield, Swords, RotateCcw, History as HistoryIcon, MinusCircle, PlusCircle, Trash2, Frown
} from 'lucide-react';

import { db } from './firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

interface GameData {
  players: Player[];
  courts: Court[];
  history: MatchRecord[];
  lastUpdated: number;
}

const sanitize = (obj: any): any => {
  if (obj === null) return null;
  if (obj === undefined) return null;
  if (typeof obj === 'number' && isNaN(obj)) return 0;
  if (Array.isArray(obj)) return obj.map(sanitize);
  if (typeof obj === 'object') {
    const newObj: any = {};
    Object.keys(obj).forEach(key => {
      const val = sanitize(obj[key]);
      if (val !== undefined) newObj[key] = val;
    });
    return newObj;
  }
  return obj;
};

const LEVEL_MAPPING: Record<string, PlayerLevel> = {
  'PRO': PlayerLevel.PRO, 'Pro': PlayerLevel.PRO, '職業': PlayerLevel.PRO,
  'ADVANCED': PlayerLevel.ADVANCED, 'Advanced': PlayerLevel.ADVANCED, '高階': PlayerLevel.ADVANCED,
  'INTERMEDIATE': PlayerLevel.INTERMEDIATE, 'Intermediate': PlayerLevel.INTERMEDIATE, '中階': PlayerLevel.INTERMEDIATE,
  'BEGINNER': PlayerLevel.BEGINNER, 'Beginner': PlayerLevel.BEGINNER, '初階': PlayerLevel.BEGINNER,
  'ROOKIE': PlayerLevel.NEW, 'Rookie': PlayerLevel.NEW, 'NEW': PlayerLevel.NEW, '新手': PlayerLevel.NEW,
};

const normalizeLevel = (inputLevel: string): PlayerLevel => {
  if (Object.values(PlayerLevel).includes(inputLevel as PlayerLevel)) return inputLevel as PlayerLevel;
  return LEVEL_MAPPING[inputLevel] || PlayerLevel.INTERMEDIATE;
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'signup' | 'manage'>('manage');
  const [players, setPlayers] = useState<Player[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [history, setHistory] = useState<MatchRecord[]>([]);
  
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [showHistoryMobile, setShowHistoryMobile] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(true);

  const [isPlayerSelectorOpen, setIsPlayerSelectorOpen] = useState(false);
  const [targetCourtId, setTargetCourtId] = useState<number | null>(null);
  const [targetSlotIndex, setTargetSlotIndex] = useState<number | null>(null);
  const [targetIsNextMatch, setTargetIsNextMatch] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [viewingStatsPlayer, setViewingStatsPlayer] = useState<Player | null>(null);

  const [newName, setNewName] = useState('');
  const [newLevel, setNewLevel] = useState<PlayerLevel>(PlayerLevel.INTERMEDIATE);
  const [newBattlePower, setNewBattlePower] = useState<string>('1500');

  const playersRef = useRef(players);
  const courtsRef = useRef(courts);
  const historyRef = useRef(history);

  useEffect(() => {
    playersRef.current = players;
    courtsRef.current = courts;
    historyRef.current = history;
  }, [players, courts, history]);

  useEffect(() => {
    const docRef = doc(db, 'badminton-app', 'main-data');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as GameData;
        let fetchedPlayers = data.players || [];
        fetchedPlayers = fetchedPlayers.map(p => ({
            ...p,
            level: normalizeLevel(p.level as string)
        }));
        setPlayers(fetchedPlayers);
        setCourts(data.courts || []);
        setHistory(data.history || []);
        setIsSyncing(false);
      } else {
        updateData({ players: INITIAL_PLAYERS, courts: INITIAL_COURTS, history: [] });
      }
    }, (error) => { console.error("Sync Error:", error); setIsSyncing(false); });
    return () => unsubscribe();
  }, []);

  const updateData = async (updates: Partial<GameData>) => {
    try {
      const docRef = doc(db, 'badminton-app', 'main-data');
      const payload = {
        players: updates.players !== undefined ? updates.players : playersRef.current,
        courts: updates.courts !== undefined ? updates.courts : courtsRef.current,
        history: updates.history !== undefined ? updates.history : historyRef.current,
        lastUpdated: Date.now()
      };
      await setDoc(docRef, sanitize(payload), { merge: true });
    } catch (err) { console.error("Save Error:", err); showToast("儲存失敗"); }
  };

  useEffect(() => { if (toastMessage) { const timer = setTimeout(() => setToastMessage(null), 3000); return () => clearTimeout(timer); } }, [toastMessage]);
  const showToast = (msg: string) => setToastMessage(msg);

  const handleAddPlayer = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newName.trim()) return;
    if (playersRef.current.some(p => p.name === newName.trim())) { showToast("該球員已存在"); return; }
    
    const safeBP = parseInt(newBattlePower) || 1500;
    const newPlayer: Player = { 
      id: Date.now().toString(), 
      name: newName.trim(), 
      level: newLevel, 
      battlePower: safeBP, 
      playCount: 0, 
      status: 'waiting' as const 
    };
    updateData({ players: [...playersRef.current, newPlayer] });
    setNewName('');
  };

  const handleImportFromSignup = (signupNames: string[], details?: Record<string, ParticipantDetail>) => {
      const currentPlayers = playersRef.current;
      const newPlayersList: Player[] = [];
      const processedNames = new Set<string>();
      
      currentPlayers.forEach(p => {
          if (signupNames.includes(p.name)) {
              const detail = details?.[p.name];
              newPlayersList.push({ 
                ...p, 
                level: detail ? normalizeLevel(detail.level) : normalizeLevel(p.level as string),
                battlePower: detail?.battlePower || p.battlePower, 
                status: (p.status === 'fixed' || p.status === 'playing') ? p.status : 'waiting' as const
              });
              processedNames.add(p.name);
          } else {
              if (p.status === 'fixed' || p.status === 'playing') newPlayersList.push(p);
          }
      });
      
      signupNames.forEach(name => {
          if (!processedNames.has(name)) {
              const detail = details?.[name];
              newPlayersList.push({ 
                id: Date.now() + Math.random().toString(36).substr(2, 9), 
                name: name, 
                level: detail ? normalizeLevel(detail.level) : PlayerLevel.INTERMEDIATE, 
                battlePower: detail?.battlePower || 1500, 
                playCount: 0, 
                status: 'waiting' as const
              });
          }
      });
      
      updateData({ players: newPlayersList });
      showToast(`匯入成功，已更新 ${newPlayersList.length} 筆資料`);
      setActiveTab('manage');
  };

  const handleSavePlayerEdit = () => {
    if (!editingPlayer) return;
    const updatedPlayers = playersRef.current.map(p => p.id === editingPlayer.id ? editingPlayer : p);
    const updatedCourts = courtsRef.current.map(c => ({
       ...c,
       players: c.players.map(p => p?.id === editingPlayer.id ? { ...p, ...editingPlayer } : p),
       nextMatch: c.nextMatch.map(p => p?.id === editingPlayer.id ? { ...p, ...editingPlayer } : p)
    }));
    updateData({ players: updatedPlayers, courts: updatedCourts });
    setEditingPlayer(null);
    showToast("資料已更新");
  };

  const handleRemovePlayer = (id: string) => {
    if (courtsRef.current.some(c => c.players.some(p => p?.id === id) || c.nextMatch.some(p => p?.id === id))) { 
        alert("請先將球員從場地下架後再刪除"); return; 
    }
    updateData({ players: playersRef.current.filter(p => p.id !== id) });
  };
  
  const handleChangeStatus = (id: string, newStatus: Player['status']) => {
    updateData({ players: playersRef.current.map(p => p.id === id ? { ...p, status: newStatus } : p) });
  };

  const handleRemoveFromCourt = (courtId: number, slotIndex: number, isNextMatch: boolean = false) => {
    let updatedPlayers = [...playersRef.current];
    const updatedCourts = courtsRef.current.map(c => {
      if (c.id !== courtId) return c;
      if (isNextMatch) {
         const newNext = [...c.nextMatch]; newNext[slotIndex] = null; return { ...c, nextMatch: newNext };
      } else {
         const newPlayers = [...c.players]; const removedPlayer = newPlayers[slotIndex]; newPlayers[slotIndex] = null;
         if (removedPlayer) updatedPlayers = updatedPlayers.map(p => p.id === removedPlayer.id ? { ...p, status: 'waiting' as const } : p);
         return { ...c, players: newPlayers, status: newPlayers.every(p => p === null) ? 'empty' : 'ready' } as Court;
      }
    });
    updateData({ courts: updatedCourts, players: updatedPlayers });
  };

  const handleSelectPlayer = (player: Player) => {
    if (player.status === 'playing' && !targetIsNextMatch && !isPlayerSelectorOpen) return;
    setSelectedPlayerId(prev => prev === player.id ? null : player.id);
  };

  const assignPlayerToCourt = (courtId: number, playerId: string, slotIndex: number, isNextMatch: boolean) => {
    const player = playersRef.current.find(p => p.id === playerId);
    if (!player) return;
    let updatedPlayers = [...playersRef.current];
    const updatedCourts = courtsRef.current.map(c => {
      if (c.id !== courtId) return c;
      if (isNextMatch) {
          const newNext = [...c.nextMatch]; newNext[slotIndex] = { ...player, queueTime: Date.now() }; return { ...c, nextMatch: newNext };
      } else {
          const newPlayers = [...c.players]; newPlayers[slotIndex] = { ...player, status: 'playing' };
          return { ...c, players: newPlayers, status: newPlayers.every(p => p !== null) ? 'ready' : (c.status==='empty'?'ready':c.status), startTime: c.startTime } as Court;
      }
    });
    if (!isNextMatch) updatedPlayers = updatedPlayers.map(p => p.id === playerId ? { ...p, status: 'playing' as const } : p);
    updateData({ courts: updatedCourts, players: updatedPlayers });
  };

  const handleSelectCourtSlot = (courtId: number, slotIndex: number, isNextMatch: boolean = false) => {
    if (selectedPlayerId && !isNextMatch) { assignPlayerToCourt(courtId, selectedPlayerId, slotIndex, false); setSelectedPlayerId(null); }
    else { setTargetCourtId(courtId); setTargetSlotIndex(slotIndex); setTargetIsNextMatch(isNextMatch); setIsPlayerSelectorOpen(true); }
  };

  const handleModalSelectPlayer = (player: Player) => {
    if (targetCourtId !== null && targetSlotIndex !== null) {
      assignPlayerToCourt(targetCourtId, player.id, targetSlotIndex, targetIsNextMatch);
      setIsPlayerSelectorOpen(false); setTargetCourtId(null); setTargetSlotIndex(null);
    }
  };

  const handleStartMatch = (courtId: number) => {
     const currentCourts = courtsRef.current;
     if (currentCourts.find(c => c.id === courtId)?.players.some(p => p === null)) { showToast("場地人數不足"); return; }
     const updatedCourts = currentCourts.map(c => { if (c.id !== courtId) return c; return { ...c, status: 'active', startTime: Date.now() } as Court; });
     updateData({ courts: updatedCourts }); showToast("比賽開始！");
  };

  const handleAddCourt = () => {
    const currentCourts = courtsRef.current;
    const newCourt: Court = { id: currentCourts.length > 0 ? Math.max(...currentCourts.map(c => c.id)) + 1 : 1, name: `場地 ${currentCourts.length + 1}`, players: [null, null, null, null], nextMatch: [null, null, null, null], status: 'empty' };
    updateData({ courts: [...currentCourts, newCourt] });
  };

  const handleRemoveCourt = () => {
    const currentCourts = courtsRef.current; if (currentCourts.length === 0) return;
    if (currentCourts[currentCourts.length - 1].players.some(p => p !== null)) { alert("請先清空場地"); return; }
    updateData({ courts: currentCourts.slice(0, -1) });
  };

  const getBalancedMatches = (fourPlayers: Player[]): Player[] => {
    const sorted = [...fourPlayers].sort((a, b) => b.battlePower - a.battlePower);
    const [p1, p2, p3, p4] = sorted;
    const combos = [{ t1: [p1, p4], t2: [p2, p3] }, { t1: [p1, p3], t2: [p2, p4] }, { t1: [p1, p2], t2: [p3, p4] }];
    let bestCombo = combos[0], minDiff = Infinity;
    combos.forEach(c => { const diff = Math.abs((c.t1[0].battlePower + c.t1[1].battlePower) - (c.t2[0].battlePower + c.t2[1].battlePower)); if (diff < minDiff) { minDiff = diff; bestCombo = c; } });
    return [...bestCombo.t1, ...bestCombo.t2];
  };

  const handleAutoAssign = () => {
    const currentPlayers = playersRef.current; const currentCourts = [...courtsRef.current]; const waitingPlayers = currentPlayers.filter(p => p.status === 'waiting');
    const busyIds = new Set<string>();
    currentCourts.forEach(c => { c.players.forEach(p => { if(p) busyIds.add(p.id) }); c.nextMatch.forEach(p => { if(p) busyIds.add(p.id) }); });
    const validWaiting = waitingPlayers.filter(p => !busyIds.has(p.id));
    if (validWaiting.length === 0) { showToast("備戰區無可用人員"); return; }
    const sortedWaiting = [...validWaiting].sort((a, b) => (a.playCount || 0) - (b.playCount || 0) || b.battlePower - a.battlePower);
    const playersToUpdate = new Set<string>(); let currentPool = [...sortedWaiting]; let assignedCount = 0;
    currentCourts.forEach((court, idx) => {
        const currentOnCourt = court.players.filter(p => p !== null) as Player[]; const needed = 4 - currentOnCourt.length;
        if (needed === 0 || currentPool.length < needed) return;
        const candidates = currentPool.slice(0, needed); currentPool = currentPool.slice(needed);
        const balanced = getBalancedMatches([...currentOnCourt, ...candidates]);
        currentCourts[idx] = { ...currentCourts[idx], players: balanced.map(p => ({...p, status: 'playing' as const})), status: 'ready', startTime: undefined };
        candidates.forEach(p => playersToUpdate.add(p.id)); assignedCount++;
    });
    if (assignedCount === 0) { showToast("無法自動排點"); return; }
    updateData({ courts: currentCourts, players: currentPlayers.map(p => playersToUpdate.has(p.id) ? { ...p, status: 'playing' as const } : p) });
    showToast("排點完成");
  };

  const handleFinishMatch = (courtId: number, scoreA: number, scoreB: number, explicitWinner?: 'Team A' | 'Team B' | 'Draw') => {
    const currentCourts = courtsRef.current; const currentPlayers = playersRef.current; const finishedCourt = currentCourts.find(c => c.id === courtId);
    if (!finishedCourt) return;
    const activePlayers = finishedCourt.players.filter(p => p !== null) as Player[]; const newHistory = [...historyRef.current];
    if (activePlayers.length > 0) {
        let winner: 'Team A' | 'Team B' | 'Draw' = explicitWinner || (scoreA > scoreB ? 'Team A' : scoreB > scoreA ? 'Team B' : 'Draw');
        newHistory.push({
          id: Date.now().toString(), courtId: finishedCourt.id, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), duration: Math.floor((Date.now() - (finishedCourt.startTime || 0)) / 60000).toString(),
          players: activePlayers.map(p => p.name), playerIds: activePlayers.map(p => p.id), score: `${scoreA} : ${scoreB}`, winner
        });
    }
    const finishingIds = new Set(activePlayers.map(p => p.id));
    let updatedPlayers = currentPlayers.map(p => finishingIds.has(p.id) ? { ...p, status: 'waiting' as const, playCount: (p.playCount || 0) + 1 } : p);
    
    // Fix logic (Correct Court Handling)
    const nextCourts = currentCourts.map(c => c.id === courtId ? { ...c, players: [null,null,null,null], status: 'empty' as const, startTime: undefined } : { ...c, players: [...c.players], nextMatch: [...c.nextMatch] }) as Court[];
    
    const busyIds = new Set<string>();
    nextCourts.forEach(c => c.players.forEach(p => { if (p) busyIds.add(p.id) }));
    
    // 嚴格請求佇列
    const requests = nextCourts.flatMap(c => c.nextMatch.map((p, i) => p ? { p, cid: c.id, idx: i, qt: p.queueTime||0 } : null)).filter(Boolean).sort((a,b) => a!.qt - b!.qt);
    const modifiedCourtIds = new Set<number>(); 

    requests.forEach(req => {
        if (!req || busyIds.has(req.p.id)) return;
        const c = nextCourts.find(ct => ct.id === req.cid); 
        // 只有場地清空時才能遞補
        if (c && c.status === 'empty') { 
            c.players[req.idx] = req.p; c.nextMatch[req.idx] = null; 
            busyIds.add(req.p.id);
            modifiedCourtIds.add(c.id);
        }
    });

    // 只有當本場 (target) 或 修改過 (modified) 的滿人場地，才進行平衡
    nextCourts.forEach(c => { 
        const isTarget = c.id === courtId;
        const isModified = modifiedCourtIds.has(c.id);
        if (c.status !== 'active' && c.players.filter(p => p !== null).length === 4) {
             if (isTarget || isModified) { c.players = getBalancedMatches(c.players as Player[]); c.status = 'ready'; }
        }
    });
    
    const playingIds = new Set<string>(); nextCourts.forEach(c => { if (c.status !== 'empty') c.players.forEach(p => { if(p) playingIds.add(p.id) }) });
    updatedPlayers = updatedPlayers.map(p => playingIds.has(p.id) ? { ...p, status: 'playing' as const } : (p.status === 'playing' ? { ...p, status: 'waiting' as const } : p));
    updateData({ players: updatedPlayers, courts: nextCourts, history: newHistory });
  };
  
  const handleResetPlayCounts = () => { updateData({ players: playersRef.current.map(p => ({ ...p, playCount: 0 })), courts: courtsRef.current.map(c => ({ ...c, players: c.players.map(p => p ? { ...p, playCount: 0 } : null), nextMatch: c.nextMatch.map(p => p ? { ...p, playCount: 0 } : null) })) }); showToast("場次已歸零"); };
  const handleClearCourts = () => { const onCourt = new Set<string>(); courtsRef.current.forEach(c => c.players.forEach(p => { if(p) onCourt.add(p.id) })); updateData({ players: playersRef.current.map(p => onCourt.has(p.id) ? { ...p, status: 'waiting' as const } : p), courts: courtsRef.current.map(c => ({ ...c, players: [null,null,null,null], status: 'empty' as const, startTime: undefined })) }); showToast("已全部下場"); };
  const allQueuedPlayers = courts.flatMap(c => c.nextMatch.filter(p => p !== null).map(p => ({ pid: p!.id, cid: c.id, queueTime: p!.queueTime || 0 })));
  allQueuedPlayers.sort((a, b) => a.queueTime - b.queueTime);
  const getPlayerQueueRank = (playerId: string, courtId: number): number => { const myEntries = allQueuedPlayers.filter(x => x.pid === playerId); const index = myEntries.findIndex(x => x.cid === courtId); return index + 1; };
  const availablePlayersForModal = players.filter(p => { if (targetIsNextMatch) return true; const currentCourt = courts.find(c => c.id === targetCourtId); if (currentCourt) { if (targetIsNextMatch ? currentCourt.nextMatch.some(np => np?.id === p.id) : currentCourt.players.some(cp => cp?.id === p.id)) return false; } return p.status !== 'playing'; });
  
  // Calculate Stats Logic (Safe)
  const calculatePlayerStats = (player: Player) => { 
      const myHistory = history.filter(r => r.playerIds && r.playerIds.includes(player.id)); 
      const totalGames = myHistory.length; 
      let wins = 0; 
      const partnerStats: Record<string, any> = {}; const opponentStats: Record<string, any> = {}; 
      
      myHistory.forEach(match => { 
          if (!match.players || !match.playerIds) return;
          const myIndex = match.playerIds.indexOf(player.id); 
          if (myIndex === -1) return; 
          const isWin = match.winner === (myIndex < 2 ? 'Team A' : 'Team B'); 
          if (isWin) wins++; 
          // Logic for Partners/Opponents...
          const partnerIdx = myIndex === 0 ? 1 : myIndex === 1 ? 0 : myIndex === 2 ? 3 : 2;
          const pName = match.players[partnerIdx];
          if (pName) { 
              if (!partnerStats[pName]) partnerStats[pName] = {name: pName, count: 0, wins: 0}; 
              partnerStats[pName].count++; 
              if (isWin) partnerStats[pName].wins++;
          }
          const oppIndices = myIndex < 2 ? [2, 3] : [0, 1];
          oppIndices.forEach(idx => {
             const oName = match.players[idx];
             if (oName) { 
                  if (!opponentStats[oName]) opponentStats[oName] = {name: oName, count: 0, wins: 0}; 
                  opponentStats[oName].count++; 
                  if (isWin) opponentStats[oName].wins++;
             }
          });
      }); 
      return { 
        totalGames, 
        wins, 
        winRate: totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0, 
        partners: Object.values(partnerStats).sort((a: any, b: any) => b.count - a.count), 
        opponents: Object.values(opponentStats).sort((a: any, b: any) => b.count - a.count) 
      }; 
  };

  return (
    <div className="min-h-screen bg-[#031811] text-gray-100 flex flex-col font-sans">
      {toastMessage && <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[200] animate-fade-in-up"><div className="bg-emerald-600 text-white px-6 py-3 rounded-full shadow-2xl font-bold flex items-center gap-2 border border-emerald-400/50"><CheckCircle size={18} />{toastMessage}</div></div>}
      {/* (以下 Header 和 UI 部分略，保持原狀，只修正上面的 Logic) */}
      <header className="bg-[#062c1f] border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2"><Trophy className="text-yellow-400" size={24} /><h1 className="text-xl font-bold tracking-wide flex items-center gap-2">野豬騎士<span className="text-emerald-500 text-sm font-normal bg-emerald-900/50 px-2 py-0.5 rounded hidden sm:inline-block">V8.7 Ultimate</span></h1></div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-black/20 border border-white/5 mr-2">{isSyncing ? <><div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></div><span className="text-xs text-gray-400">連線中...</span></> : <><div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div><span className="text-xs text-emerald-400 font-bold">已同步</span></>}</div>
            <div className="flex items-center gap-1 bg-black/20 p-1 rounded-lg">
               <button onClick={() => setActiveTab('signup')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'signup' ? 'bg-emerald-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>報名</button>
               <button onClick={() => setActiveTab('manage')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'manage' ? 'bg-emerald-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>排點</button>
            </div>
            <div className="relative">
              <button onClick={() => setShowMenu(!showMenu)} className="p-2 text-gray-300 hover:text-white md:hidden"><MoreVertical size={24} /></button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-[#0a2e1f] border border-white/10 rounded-xl shadow-xl z-50 flex flex-col overflow-hidden animate-fade-in">
                   <button onClick={() => { handleClearCourts(); setShowMenu(false); }} className="px-4 py-3 text-left text-sm hover:bg-white/5 flex items-center gap-2 text-orange-300"><LogOut size={16} /> 全部下場</button>
                   <button onClick={() => { handleResetPlayCounts(); setShowMenu(false); }} className="px-4 py-3 text-left text-sm hover:bg-white/5 flex items-center gap-2"><RotateCcw size={16} /> 重置場次</button>
                   <div className="h-px bg-white/10 my-0"></div>
                   <button onClick={() => { updateData({ players: [], courts: INITIAL_COURTS, history: [] }); setShowMenu(false); }} className="px-4 py-3 text-left text-sm text-red-400 hover:bg-white/5 flex items-center gap-2"><Trash2 size={16} /> 全部清空</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 overflow-hidden flex flex-col relative">
        {activeTab === 'signup' && <div className="h-full animate-fade-in"><SignupSystem onImportToGame={handleImportFromSignup} /></div>}
        {activeTab === 'manage' && (
          <div className="flex flex-col lg:flex-row gap-6 h-full animate-fade-in">
            <div className="flex-1 flex flex-col gap-6 overflow-y-auto pb-20 lg:pb-0 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {courts.map(court => (
                      <BadmintonCourt key={court.id} court={court} onFinish={handleFinishMatch} onStart={handleStartMatch} onRemovePlayer={handleRemoveFromCourt} onSelectSlot={handleSelectCourtSlot} isSelected={selectedPlayerId !== null && court.players.some(p => p === null)} nextMatchRanks={court.nextMatch.map(p => p ? getPlayerQueueRank(p.id, court.id) : null)} />
                ))}
              </div>
              <div className="flex flex-wrap gap-3 items-center bg-[#0a2e1f] p-4 rounded-xl border border-white/10">
                <div className="flex-1 min-w-[200px] flex items-center gap-4">
                   <h3 className="text-gray-400 text-sm font-bold flex items-center gap-2"><Settings size={16} /> 快速操作</h3>
                   <div className="flex items-center bg-black/30 rounded-lg p-1 border border-white/5">
                      <button onClick={handleRemoveCourt} className="p-1 hover:text-red-400 text-gray-300"><MinusCircle size={16}/></button><span className="px-2 text-sm font-mono font-bold">{courts.length}</span><button onClick={handleAddCourt} className="p-1 hover:text-emerald-400 text-gray-300"><PlusCircle size={16}/></button>
                   </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
                  <button onClick={handleAutoAssign} className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-3 py-2 rounded-lg font-bold shadow-lg text-sm whitespace-nowrap"><Zap size={16} />智能排點</button>
                  <div className="hidden md:flex items-center gap-2">
                     <button onClick={handleClearCourts} className="bg-orange-900/50 hover:bg-orange-800 text-orange-200 border border-orange-500/30 px-3 py-2 rounded-lg font-medium text-xs whitespace-nowrap flex items-center gap-1"><LogOut size={14}/> 全部下場</button>
                     <button onClick={handleResetPlayCounts} className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg font-medium text-xs whitespace-nowrap">重置場次</button>
                  </div>
                  <button onClick={() => setShowHistoryMobile(true)} className="flex lg:hidden items-center gap-2 bg-[#1a3d32] hover:bg-[#23493e] text-emerald-400 border border-emerald-500/30 px-3 py-2 rounded-lg font-medium text-sm whitespace-nowrap"><HistoryIcon size={16} />紀錄</button>
                </div>
                 <form onSubmit={handleAddPlayer} className="w-full sm:w-auto flex gap-2 items-center bg-black/20 p-1 rounded-lg border border-white/5 mt-2 sm:mt-0">
                    <select value={newLevel} onChange={(e) => setNewLevel(e.target.value as PlayerLevel)} className="bg-transparent text-xs text-gray-300 focus:outline-none p-1 max-w-[60px]">{Object.values(PlayerLevel).map(l => <option key={l} value={l}>{l}</option>)}</select>
                    <input className="bg-transparent border-b border-gray-600 w-16 text-sm text-white focus:outline-none focus:border-emerald-500 px-1" placeholder="BP" type="number" value={newBattlePower} onChange={(e) => setNewBattlePower(e.target.value)}/>
                    <input className="bg-transparent border-b border-gray-600 w-20 text-sm text-white focus:outline-none focus:border-emerald-500 px-1" placeholder="新球員..." value={newName} onChange={(e) => setNewName(e.target.value)}/>
                    <button type="submit" className="bg-emerald-700 p-1.5 rounded hover:bg-emerald-600"><Plus size={14} /></button>
                 </form>
              </div>
              <div className="bg-[#0a2e1f] rounded-xl border border-white/10 p-4 flex-1 min-h-[300px]">
                <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                  <div className="flex items-center gap-3"><h3 className="font-bold text-lg text-white flex items-center gap-2"><Users size={20} className="text-emerald-400"/>球員名單</h3></div>
                  {selectedPlayerId && <div className="text-yellow-400 text-sm animate-pulse flex items-center gap-1"><ArrowRight size={14} /> 請點擊上方空場地加入</div>}
                </div>
                <PlayerList players={players.filter(p => p.status !== 'playing' || targetIsNextMatch)} selectedPlayerId={selectedPlayerId} onSelect={handleSelectPlayer} onRemove={handleRemovePlayer} onChangeStatus={handleChangeStatus} onEdit={setEditingPlayer} onViewStats={setViewingStatsPlayer} />
              </div>
            </div>
            <div className={`fixed inset-0 z-50 bg-[#031811] p-4 lg:relative lg:inset-auto lg:bg-transparent lg:p-0 lg:block lg:w-80 lg:shrink-0 overflow-y-auto transition-transform duration-300 ${showHistoryMobile ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}`}>
               <div className="flex lg:hidden justify-between items-center mb-4"><h2 className="text-xl font-bold">對戰紀錄</h2><button onClick={() => setShowHistoryMobile(false)} className="p-2 bg-gray-800 rounded-full"><X size={20}/></button></div>
               <HistoryPanel history={history} onClear={() => updateData({ history: [] })} />
            </div>
          </div>
        )}
        
        {isPlayerSelectorOpen && (<div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"><div className="bg-[#0a2e1f] w-full max-w-2xl rounded-2xl border border-emerald-500/50 shadow-2xl flex flex-col max-h-[80vh]"><div className="flex justify-between items-center p-5 border-b border-white/10 bg-[#062c1f] rounded-t-2xl"><div><h3 className="text-xl font-bold text-white">選擇上場球員</h3><p className="text-gray-400 text-xs mt-1">{targetIsNextMatch ? '加入預排區 (Next Match)' : `點擊球員以加入 ${targetCourtId} 號場地`}</p></div><button onClick={() => { setIsPlayerSelectorOpen(false); setTargetCourtId(null); }} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"><X size={24} /></button></div><div className="p-6 overflow-y-auto custom-scrollbar bg-[#0a2e1f]"><PlayerList players={availablePlayersForModal} selectedPlayerId={null} onSelect={handleModalSelectPlayer} onRemove={() => {}} onChangeStatus={() => {}} readOnly={true} /></div></div></div>)}

        {editingPlayer && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
             <div className="bg-[#062c1f] w-full max-w-sm rounded-2xl border border-emerald-500/30 p-5 shadow-2xl">
                 <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-white text-lg">編輯 {editingPlayer.name}</h3><button onClick={() => setEditingPlayer(null)} className="text-gray-400 hover:text-white"><X size={20}/></button></div>
                 <div className="space-y-4">
                     <div><label className="text-xs text-gray-400 mb-1 block">程度</label><select value={editingPlayer.level} onChange={(e) => setEditingPlayer({...editingPlayer, level: e.target.value as PlayerLevel})} className="w-full bg-[#031811] border border-white/20 rounded p-2 text-white outline-none focus:border-emerald-500">{Object.values(PlayerLevel).map(l => <option key={l} value={l}>{l}</option>)}</select></div>
                     <div className="grid grid-cols-2 gap-3">
                       <div><label className="text-xs text-gray-400 mb-1 block">戰鬥力 (BP)</label><input type="number" value={editingPlayer.battlePower} onChange={(e) => setEditingPlayer({...editingPlayer, battlePower: parseInt(e.target.value)})} className="w-full bg-[#031811] border border-white/20 rounded p-2 text-white outline-none focus:border-emerald-500"/></div>
                       <div><label className="text-xs mb-1 block text-yellow-400">上場次數</label><input type="number" value={editingPlayer.playCount} onChange={(e) => setEditingPlayer({...editingPlayer, playCount: parseInt(e.target.value)})} className="w-full bg-[#031811] border border-white/20 rounded p-2 text-yellow-400 font-bold outline-none focus:border-yellow-500"/></div>
                     </div>
                     <div className="pt-2 flex gap-2"><button onClick={() => setEditingPlayer(null)} className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded text-sm text-white">取消</button><button onClick={handleSavePlayerEdit} className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-2 rounded text-sm text-white font-bold">儲存</button></div>
                 </div>
             </div>
           </div>
        )}

        {/* Stats Modal (Updated with check) */}
        {viewingStatsPlayer && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
             <div className="bg-[#0a2e1f] w-full max-w-md rounded-2xl border border-purple-500/30 shadow-2xl flex flex-col max-h-[85vh]">
                 <div className="p-5 border-b border-white/10 bg-[#062c1f] rounded-t-2xl flex justify-between items-center">
                     <div className="flex items-center gap-3">
                         <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${LEVEL_COLORS[viewingStatsPlayer.level] || 'bg-gray-500'} text-white border-2 border-white`}>{viewingStatsPlayer.name.slice(0, 2)}</div>
                         <div><h3 className="text-xl font-bold text-white">{viewingStatsPlayer.name} 的戰績</h3><p className="text-xs text-purple-300">生涯詳細數據分析</p></div>
                     </div>
                     <button onClick={() => setViewingStatsPlayer(null)} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white"><X size={24}/></button>
                 </div>
                 <div className="p-5 overflow-y-auto custom-scrollbar space-y-6 bg-[#0a2e1f]">
                    {(() => {
                        const stats = calculatePlayerStats(viewingStatsPlayer);
                        return (
                           <>
                             {/* Stats */}
                             <div className="grid grid-cols-3 gap-3">
                                <div className="bg-black/20 p-3 rounded-xl text-center border border-white/5"><div className="text-xs text-gray-400 mb-1">總場次</div><div className="text-2xl font-bold text-white">{stats.totalGames}</div></div>
                                <div className="bg-black/20 p-3 rounded-xl text-center border border-white/5"><div className="text-xs text-gray-400 mb-1">勝場</div><div className="text-2xl font-bold text-yellow-400">{stats.wins}</div></div>
                                <div className="bg-black/20 p-3 rounded-xl text-center border border-white/5"><div className="text-xs text-gray-400 mb-1">勝率</div><div className="text-2xl font-bold text-emerald-400">{stats.winRate}%</div></div>
                             </div>

                             {/* Partners */}
                             <div>
                                <h4 className="text-sm font-bold text-blue-300 mb-3 flex items-center gap-2"><Shield size={14}/> 最佳搭檔</h4>
                                <div className="space-y-2">
                                    {stats.partners.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center text-gray-500 py-4 opacity-50 gap-1">
                                            <Frown size={24} />
                                            <span className="text-xs">暫無搭檔資料</span>
                                        </div>
                                    ) : (
                                        stats.partners.slice(0, 5).map((p: any) => (
                                            <div key={p.name} className="flex justify-between items-center text-sm bg-blue-900/20 px-3 py-2 rounded-lg">
                                                <span className="font-bold text-gray-200">{p.name}</span>
                                                <div className="flex gap-3 text-xs"><span className="text-gray-400">{p.count} 場</span><span className="text-yellow-500 font-mono">{Math.round((p.wins/p.count)*100)}%</span></div>
                                            </div>
                                        ))
                                    )}
                                </div>
                             </div>

                             {/* Opponents */}
                             <div>
                                <h4 className="text-sm font-bold text-red-300 mb-3 flex items-center gap-2"><Swords size={14}/> 常遇對手</h4>
                                <div className="space-y-2">
                                    {stats.opponents.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center text-gray-500 py-4 opacity-50 gap-1">
                                            <Frown size={24} />
                                            <span className="text-xs">暫無對戰資料</span>
                                        </div>
                                    ) : (
                                        stats.opponents.slice(0, 5).map((p: any) => (
                                            <div key={p.name} className="flex justify-between items-center text-sm bg-red-900/20 px-3 py-2 rounded-lg">
                                                <span className="font-bold text-gray-200">{p.name}</span>
                                                <div className="flex gap-3 text-xs"><span className="text-gray-400">{p.count} 場</span><span className="text-orange-400 font-mono">{Math.round((p.wins/p.count)*100)}%</span></div>
                                            </div>
                                        ))
                                    )}
                                </div>
                             </div>
                           </>
                        );
                    })()}
                 </div>
             </div>
           </div>
        )}
      </main>
    </div>
  );
};

export default App;