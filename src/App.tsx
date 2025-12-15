
import React, { useState, useEffect, useRef } from 'react';
import { Player, Court, PlayerLevel, MatchRecord, ParticipantDetail } from './types';
import { INITIAL_PLAYERS, INITIAL_COURTS, LEVEL_COLORS, LEVEL_STYLES } from './constants';
import BadmintonCourt from './components/BadmintonCourt';
import PlayerList from './components/PlayerList';
import HistoryPanel from './components/HistoryPanel';
import SignupSystem from './components/SignupSystem'; 
import { db } from './services/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { 
  Users, Plus, Trash2, Settings, Trophy, ArrowRight, X, Swords, 
  RotateCcw, History, MinusCircle, PlusCircle, Zap, MoreVertical, CheckCircle,
  LogOut, Shield, Calendar, BarChart2, ArrowLeft, Link as LinkIcon, Hash
} from 'lucide-react';
import { 
  DndContext, 
  DragEndEvent, 
  DragOverlay, 
  DragStartEvent, 
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor, 
  useSensors 
} from '@dnd-kit/core';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'signup' | 'manage'>('manage');
  const [players, setPlayers] = useState<Player[]>(INITIAL_PLAYERS);
  const [courts, setCourts] = useState<Court[]>(INITIAL_COURTS);
  const [history, setHistory] = useState<MatchRecord[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  
  const [showHistoryMobile, setShowHistoryMobile] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [isPlayerSelectorOpen, setIsPlayerSelectorOpen] = useState(false);
  const [targetCourtId, setTargetCourtId] = useState<number | null>(null);
  const [targetSlotIndex, setTargetSlotIndex] = useState<number | null>(null);
  const [targetIsNextMatch, setTargetIsNextMatch] = useState(false);

  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [viewingStatsPlayer, setViewingStatsPlayer] = useState<Player | null>(null);
  
  // Binding State
  const [bindingSourceId, setBindingSourceId] = useState<string | null>(null);
  const [bindingType, setBindingType] = useState<'partner' | 'opponent' | null>(null);

  const [newName, setNewName] = useState('');
  const [newLevel, setNewLevel] = useState<PlayerLevel>(PlayerLevel.INTERMEDIATE);
  const [newBattlePower, setNewBattlePower] = useState<string>('1500');

  // Drag and Drop State
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeDragPlayer, setActiveDragPlayer] = useState<Player | null>(null);

  // Firestore Sync - State
  const isLoadedRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // 新增一個 Ref 來標記更新是否來自雲端，防止存檔死循環
  const isRemoteUpdate = useRef(false);

  // Dnd Sensors
  const sensors = useSensors(
    useSensor(MouseSensor, {
        activationConstraint: {
            distance: 8, // Mouse drag threshold to prevent accidental clicks
        },
    }),
    useSensor(TouchSensor, {
        activationConstraint: {
            delay: 150, // 150ms press to pick up - feels snappier than 250ms
            tolerance: 8, // Allow small finger movement during the press
        },
    }),
    useSensor(KeyboardSensor)
  );

  useEffect(() => {
    // 使用 onSnapshot 進行即時監聽 (Real-time listener)
    const docRef = doc(db, 'game_data', 'current_session');
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        isRemoteUpdate.current = true;

        if (data.players) setPlayers(data.players);
        if (data.courts) setCourts(data.courts);
        if (data.history) setHistory(data.history);
        
        if (!isLoadedRef.current) {
           showToast("已從資料庫載入遊戲進度");
           isLoadedRef.current = true;
        }
      }
    }, (error) => {
        console.error("Firebase 監聽錯誤:", error);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Auto-save to Firestore on change
    if (!isLoadedRef.current) return;

    if (isRemoteUpdate.current) {
        isRemoteUpdate.current = false;
        return;
    }

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const dataToSave = JSON.parse(JSON.stringify({
          players,
          courts,
          history,
          lastUpdated: Date.now()
        }));

        await setDoc(doc(db, 'game_data', 'current_session'), dataToSave, { merge: true });
      } catch (e) {
        console.error("Failed to save game state", e);
      }
    }, 2000); 
  }, [players, courts, history]);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  const handleStartBind = (playerId: string, type: 'partner' | 'opponent') => {
      setBindingSourceId(playerId);
      setBindingType(type);
      showToast(type === 'partner' ? "請選擇一位隊友" : "請選擇一位對手");
  };

  const handleConfirmBind = (targetPlayerId: string) => {
      if (!bindingSourceId || !bindingType) return;
      if (bindingSourceId === targetPlayerId) {
          setBindingSourceId(null);
          setBindingType(null);
          return;
      }

      const updates = [...players];
      const source = updates.find(p => p.id === bindingSourceId);
      const target = updates.find(p => p.id === targetPlayerId);

      if (!source || !target) {
          setBindingSourceId(null);
          setBindingType(null);
          return;
      }

      if (bindingType === 'partner') {
          // Conflict: Source/Target cannot be opponents if they are partners
          if (source.opponentId === target.id) {
              source.opponentId = undefined;
              target.opponentId = undefined;
          }

          // Clear old partners
          const oldSourcePartner = updates.find(p => p.id === source.partnerId);
          if (oldSourcePartner) oldSourcePartner.partnerId = undefined;
          
          const oldTargetPartner = updates.find(p => p.id === target.partnerId);
          if (oldTargetPartner) oldTargetPartner.partnerId = undefined;

          // Set new partners
          source.partnerId = target.id;
          target.partnerId = source.id;
          showToast(`已綁定 ${source.name} 與 ${target.name} 為隊友`);
      } else {
          // Conflict: Source/Target cannot be partners if they are opponents
          if (source.partnerId === target.id) {
              source.partnerId = undefined;
              target.partnerId = undefined;
          }

          // Clear old opponents
          const oldSourceOpp = updates.find(p => p.id === source.opponentId);
          if (oldSourceOpp) oldSourceOpp.opponentId = undefined;
          
          const oldTargetOpp = updates.find(p => p.id === target.opponentId);
          if (oldTargetOpp) oldTargetOpp.opponentId = undefined;

          // Set new opponents
          source.opponentId = target.id;
          target.opponentId = source.id;
          showToast(`已綁定 ${source.name} 與 ${target.name} 為對手`);
      }

      setPlayers(updates);
      setBindingSourceId(null);
      setBindingType(null);
  };

  const handleUnbind = (playerId: string) => {
      const updates = [...players];
      const p = updates.find(x => x.id === playerId);
      if (p) {
          if (p.partnerId) {
              const partner = updates.find(x => x.id === p.partnerId);
              if (partner) partner.partnerId = undefined;
              p.partnerId = undefined;
          }
          if (p.opponentId) {
              const opp = updates.find(x => x.id === p.opponentId);
              if (opp) opp.opponentId = undefined;
              p.opponentId = undefined;
          }
          setPlayers(updates);
          showToast("已解除綁定");
      }
  };
  
  const handleAddPlayer = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newName.trim()) return;

    if (players.some(p => p.name === newName.trim())) {
        showToast("該球員已存在");
        return;
    }

    const newPlayer: Player = {
      id: Date.now().toString(),
      name: newName.trim(),
      level: newLevel,
      battlePower: parseInt(newBattlePower) || 1500,
      playCount: 0,
      status: 'waiting'
    };

    setPlayers(prev => [...prev, newPlayer]);
    setNewName('');
  };

  const handleImportFromSignup = (signupNames: string[], details?: Record<string, ParticipantDetail>) => {
      setPlayers(prevPlayers => {
          const newPlayersList: Player[] = [];
          const processedNames = new Set<string>();

          // Keep existing players
          prevPlayers.forEach(p => {
              if (signupNames.includes(p.name)) {
                  const detail = details?.[p.name];
                  newPlayersList.push({
                      ...p,
                      level: detail?.level || p.level,
                      battlePower: detail?.battlePower || p.battlePower,
                      status: (p.status === 'fixed' || p.status === 'playing') ? p.status : 'waiting'
                  });
                  processedNames.add(p.name);
              } else {
                  if (p.status === 'fixed' || p.status === 'playing') {
                      newPlayersList.push(p);
                  }
              }
          });

          // Add new players
          signupNames.forEach(name => {
              if (!processedNames.has(name)) {
                  const detail = details?.[name];
                  newPlayersList.push({
                      id: Date.now() + Math.random().toString(36).substr(2, 9),
                      name: name,
                      level: detail?.level || PlayerLevel.INTERMEDIATE,
                      battlePower: detail?.battlePower || 1500,
                      playCount: 0,
                      status: 'waiting'
                  });
              }
          });

          showToast(`名單同步完成`);
          return newPlayersList;
      });

      setActiveTab('manage');
  };

  const handleEditPlayer = (player: Player) => {
      setEditingPlayer(player);
  };

  const handleSavePlayerEdit = () => {
    if (!editingPlayer) return;
    
    setPlayers(prev => prev.map(p => 
      p.id === editingPlayer.id ? editingPlayer : p
    ));

    setCourts(prev => prev.map(c => ({
       ...c,
       players: c.players.map(p => p?.id === editingPlayer.id ? { ...p, ...editingPlayer } : p),
       nextMatch: c.nextMatch.map(p => p?.id === editingPlayer.id ? { ...p, ...editingPlayer } : p)
    })));

    setEditingPlayer(null);
    showToast(`已更新 ${editingPlayer.name} 的資料`);
  };

  const handleRemovePlayer = (id: string) => {
    const isInCourt = courts.some(c => 
        c.players.some(p => p?.id === id) || 
        c.nextMatch.some(p => p?.id === id)
    );
    if (isInCourt) {
      alert("請先將球員從場地下架後再刪除");
      return;
    }
    
    handleUnbind(id);

    setPlayers(prev => prev.filter(p => p.id !== id));
  };

  const handleChangeStatus = (id: string, newStatus: Player['status']) => {
    setPlayers(prev => prev.map(p => {
      if (p.id !== id) return p;
      return { ...p, status: newStatus };
    }));
  };

  const handleRemoveFromCourt = (courtId: number, slotIndex: number, isNextMatch: boolean = false, shouldResetStatus: boolean = true) => {
    setCourts(prev => prev.map(c => {
      if (c.id !== courtId) return c;
      
      if (isNextMatch) {
         const newNext = [...c.nextMatch];
         newNext[slotIndex] = null;
         return { ...c, nextMatch: newNext };
      } else {
         const newPlayers = [...c.players];
         const removedPlayer = newPlayers[slotIndex];
         newPlayers[slotIndex] = null;
         
         const isEmpty = newPlayers.every(p => p === null);
         
         if (removedPlayer && shouldResetStatus) {
             setPlayers(prevP => prevP.map(p => p.id === removedPlayer.id ? { ...p, status: 'waiting' } : p));
         }

         return {
            ...c,
            players: newPlayers,
            status: isEmpty ? 'empty' : 'ready'
         };
      }
    }));
  };

  const handleSelectPlayer = (player: Player) => {
    if (bindingSourceId) {
        handleConfirmBind(player.id);
        return;
    }

    if (player.status === 'playing' && !targetIsNextMatch && !isPlayerSelectorOpen) return;
    setSelectedPlayerId(prev => prev === player.id ? null : player.id);
  };

  const assignPlayerToCourt = (courtId: number, playerId: string, slotIndex: number, isNextMatch: boolean) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return;

    setCourts(prev => prev.map(c => {
      if (c.id !== courtId) return c;
      
      if (isNextMatch) {
          const newNext = [...c.nextMatch];
          newNext[slotIndex] = { ...player, queueTime: Date.now() }; 
          return { ...c, nextMatch: newNext };
      } else {
          const newPlayers = [...c.players];
          newPlayers[slotIndex] = { ...player, status: 'playing' };
          const isFull = newPlayers.every(p => p !== null);
          return {
            ...c,
            players: newPlayers,
            status: isFull ? 'ready' : c.status,
            startTime: c.startTime
          };
      }
    }));

    if (!isNextMatch) {
        setPlayers(prev => prev.map(p => 
           p.id === playerId ? { ...p, status: 'playing' } : p
        ));
    } else {
        if (player.status === 'playing') {
             setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, status: 'waiting' } : p));
        }
    }
  };

  // --- Drag and Drop Logic ---

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveDragId(active.id as string);
    if (active.data.current?.player) {
        setActiveDragPlayer(active.data.current.player);
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(50);
        }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveDragId(null);
    setActiveDragPlayer(null);

    if (!over) return;

    const sourceData = active.data.current;
    const targetData = over.data.current;

    if (!sourceData || !targetData) return;

    const player = sourceData.player as Player;

    if (targetData.type === 'slot') {
        const targetCourtId = targetData.courtId;
        const targetIndex = targetData.index;
        const targetIsNext = targetData.isNextMatch;

        if (sourceData.source === 'court') {
             handleRemoveFromCourt(sourceData.courtId, sourceData.slotIndex, sourceData.isNextMatch, false); 
             
             setCourts(prev => {
                const newCourts = prev.map(c => ({...c, players: [...c.players], nextMatch: [...c.nextMatch]}));
                
                const sourceCourt = newCourts.find(c => c.id === sourceData.courtId);
                const targetCourt = newCourts.find(c => c.id === targetCourtId);
                
                if (sourceCourt && targetCourt) {
                    if (sourceData.isNextMatch) sourceCourt.nextMatch[sourceData.slotIndex] = null;
                    else sourceCourt.players[sourceData.slotIndex] = null;

                    const existingPlayer = targetIsNext ? targetCourt.nextMatch[targetIndex] : targetCourt.players[targetIndex];
                    if (existingPlayer) {
                         if (sourceData.isNextMatch) sourceCourt.nextMatch[sourceData.slotIndex] = existingPlayer;
                         else sourceCourt.players[sourceData.slotIndex] = existingPlayer;
                    }

                    if (targetIsNext) targetCourt.nextMatch[targetIndex] = { ...player, queueTime: Date.now() };
                    else targetCourt.players[targetIndex] = { ...player, status: 'playing' };
                    
                    if (!targetIsNext) {
                         const validCount = targetCourt.players.filter(p => p !== null).length;
                         targetCourt.status = validCount === 4 ? 'ready' : (validCount === 0 ? 'empty' : 'ready');
                         if (validCount === 0) targetCourt.status = 'empty';
                    }

                    if (!sourceData.isNextMatch) {
                         const sourceCount = sourceCourt.players.filter(p => p !== null).length;
                         sourceCourt.status = sourceCount === 4 ? 'ready' : (sourceCount === 0 ? 'empty' : 'ready');
                         if (sourceCount === 0) sourceCourt.status = 'empty';
                    }
                }
                return newCourts;
             });

             if (!targetIsNext) {
                  setPlayers(prev => prev.map(p => p.id === player.id ? { ...p, status: 'playing' } : p));
             } else {
                  setPlayers(prev => prev.map(p => p.id === player.id ? { ...p, status: 'waiting' } : p));
             }

        } else {
             assignPlayerToCourt(targetCourtId, player.id, targetIndex, targetIsNext);
        }
    }
    else if (targetData.type === 'container') {
        const newStatus = targetData.status as Player['status'];
        if (sourceData.source === 'list' && player.status === newStatus) return;

        if (sourceData.source === 'court') {
             handleRemoveFromCourt(sourceData.courtId, sourceData.slotIndex, sourceData.isNextMatch, false);
        }

        setPlayers(prev => prev.map(p => p.id === player.id ? { ...p, status: newStatus } : p));
    }
  };

  const handleSelectCourtSlot = (courtId: number, slotIndex: number, isNextMatch: boolean = false) => {
    if (selectedPlayerId && !isNextMatch) {
       assignPlayerToCourt(courtId, selectedPlayerId, slotIndex, false);
       setSelectedPlayerId(null);
    } else {
       setTargetCourtId(courtId);
       setTargetSlotIndex(slotIndex);
       setTargetIsNextMatch(isNextMatch);
       setIsPlayerSelectorOpen(true);
    }
  };

  const handleModalSelectPlayer = (player: Player) => {
    if (targetCourtId !== null && targetSlotIndex !== null) {
      assignPlayerToCourt(targetCourtId, player.id, targetSlotIndex, targetIsNextMatch);
      setIsPlayerSelectorOpen(false);
      setTargetCourtId(null);
      setTargetSlotIndex(null);
    }
  };

  const handleStartMatch = (courtId: number) => {
     setCourts(prev => prev.map(c => {
         if (c.id !== courtId) return c;
         if (!c.players.every(p => p !== null)) {
             showToast("場地人數不足，無法開始");
             return c;
         }
         return { ...c, status: 'active', startTime: Date.now() };
     }));
     showToast("比賽開始！");
  }

  const handleAddCourt = () => {
    setCourts(prev => [
      ...prev, 
      { 
        id: prev.length > 0 ? Math.max(...prev.map(c => c.id)) + 1 : 1, 
        name: `場地 ${prev.length + 1}`, 
        players: [null, null, null, null], 
        nextMatch: [null, null, null, null], 
        status: 'empty' 
      }
    ]);
  };

  const handleRemoveCourt = () => {
    if (courts.length === 0) return;
    const lastCourt = courts[courts.length - 1];
    if (lastCourt.players.some(p => p !== null)) {
      alert("請先清空最後一個場地的球員再移除場地");
      return;
    }
    setCourts(prev => prev.slice(0, -1));
  };

  const getBalancedMatches = (fourPlayers: Player[]): Player[] => {
    const sorted = [...fourPlayers].sort((a, b) => b.battlePower - a.battlePower);
    const [p1, p2, p3, p4] = sorted;
    
    // Team combos: [A1, A2, B1, B2]
    const combos = [
      { t1: [p1, p4], t2: [p2, p3] },
      { t1: [p1, p3], t2: [p2, p4] },
      { t1: [p1, p2], t2: [p3, p4] },
    ];
    
    const validCombos = combos.filter(c => {
        const checkTeam = (team: Player[], opposingTeam: Player[]) => {
            for (const p of team) {
                // Partner check: Partner MUST be in the same team
                if (p.partnerId) {
                    const partner = fourPlayers.find(x => x.id === p.partnerId);
                    if (partner && !team.some(mate => mate.id === p.partnerId)) return false;
                }
                // Opponent check: Opponent MUST be in the opposing team
                if (p.opponentId) {
                    const opponent = fourPlayers.find(x => x.id === p.opponentId);
                    if (opponent && !opposingTeam.some(opp => opp.id === p.opponentId)) return false;
                }
            }
            return true;
        };
        return checkTeam(c.t1, c.t2) && checkTeam(c.t2, c.t1);
    });

    const candidateCombos = validCombos.length > 0 ? validCombos : combos;

    let bestCombo = candidateCombos[0];
    let minDiff = Infinity;
    
    candidateCombos.forEach(c => {
      const sum1 = c.t1[0].battlePower + c.t1[1].battlePower;
      const sum2 = c.t2[0].battlePower + c.t2[1].battlePower;
      const diff = Math.abs(sum1 - sum2);
      if (diff < minDiff) {
        minDiff = diff;
        bestCombo = c;
      }
    });
    
    return [...bestCombo.t1, ...bestCombo.t2];
  };

  const handleAutoAssign = () => {
    const waitingPlayers = players.filter(p => p.status === 'waiting');
    
    const busyIds = new Set<string>();
    courts.forEach(c => {
        c.players.forEach(p => { if(p) busyIds.add(p.id) });
        c.nextMatch.forEach(p => { if(p) busyIds.add(p.id) });
    });
    
    const validWaitingPlayers = waitingPlayers.filter(p => !busyIds.has(p.id));

    if (validWaitingPlayers.length === 0) {
      showToast("備戰區無可用人員！");
      return;
    }

    const sortedWaiting = [...validWaitingPlayers].sort((a, b) => {
       if (a.playCount !== b.playCount) {
         return a.playCount - b.playCount; 
       }
       return b.battlePower - a.battlePower; 
    });
    
    const newCourts = [];
    for (const c of courts) {
      newCourts.push({...c}); 
    }

    const playersToUpdate = new Set<string>();
    let assignedCount = 0;
    
    let selectionQueue: Player[] = [];
    const queuedIds = new Set<string>();

    for (const p of sortedWaiting) {
        if (queuedIds.has(p.id)) continue;
        
        selectionQueue.push(p);
        queuedIds.add(p.id);

        // Pull partner
        if (p.partnerId) {
            const partner = validWaitingPlayers.find(x => x.id === p.partnerId);
            if (partner && !queuedIds.has(partner.id)) {
                selectionQueue.push(partner);
                queuedIds.add(partner.id);
            }
        }
        
        // Pull opponent
        if (p.opponentId) {
            const opponent = validWaitingPlayers.find(x => x.id === p.opponentId);
            if (opponent && !queuedIds.has(opponent.id)) {
                selectionQueue.push(opponent);
                queuedIds.add(opponent.id);
            }
        }
    }

    newCourts.forEach((court, idx) => {
        const currentPlayersOnCourt = court.players.filter(p => p !== null) as Player[];
        const slotsNeeded = 4 - currentPlayersOnCourt.length;

        if (slotsNeeded === 0 || selectionQueue.length < slotsNeeded) return;

        // Take candidates
        const candidates = selectionQueue.slice(0, slotsNeeded);
        
        const fullGroup = [...currentPlayersOnCourt, ...candidates];
        const balancedGroup = getBalancedMatches(fullGroup);

        newCourts[idx] = {
            ...newCourts[idx],
            players: balancedGroup.map(p => ({...p, status: 'playing'} as Player)),
            status: 'ready',
            startTime: undefined
        };

        candidates.forEach(p => playersToUpdate.add(p.id));
        selectionQueue = selectionQueue.slice(slotsNeeded);
        assignedCount++;
    });

    if (assignedCount === 0) {
        showToast("無法進行自動排點 (人數不足或無空場)");
        return;
    }

    setCourts(newCourts);
    setPlayers(prev => prev.map(p => 
      playersToUpdate.has(p.id) ? { ...p, status: 'playing' } : p
    ));
    showToast("排點完成！請按開始比賽");
  };

  const handleFinishMatch = (courtId: number, scoreA: number, scoreB: number, explicitWinner?: 'Team A' | 'Team B' | 'Draw') => {
    const finishedCourt = courts.find(c => c.id === courtId);
    if (!finishedCourt) return;

    const activePlayers = finishedCourt.players.filter(p => p !== null) as Player[];
    
    if (activePlayers.length > 0) {
        const durationMs = finishedCourt.startTime ? Date.now() - finishedCourt.startTime : 0;
        const durationMins = Math.floor(durationMs / 60000).toString();
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        let winner: 'Team A' | 'Team B' | 'Draw' = 'Draw';
        if (explicitWinner) winner = explicitWinner;
        else if (scoreA > scoreB) winner = 'Team A';
        else if (scoreB > scoreA) winner = 'Team B';

        let scoreDisplay = "";
        if (scoreA === 0 && scoreB === 0 && explicitWinner) {
           scoreDisplay = explicitWinner === 'Team A' ? "A隊勝" : explicitWinner === 'Team B' ? "B隊勝" : "平手";
        } else {
           scoreDisplay = `${scoreA} : ${scoreB}`;
        }

        const record: MatchRecord = {
          id: Date.now().toString(),
          date: dateStr,
          courtId: finishedCourt.id,
          time: timeStr,
          duration: durationMins,
          players: activePlayers.map(p => p.name),
          playerIds: activePlayers.map(p => p.id),
          score: scoreDisplay,
          winner
        };
        setHistory(prev => [...prev, record]);
    }

    const finishingPlayerIds = new Set(activePlayers.map(p => p.id));
    setPlayers(prev => prev.map(p => {
         if (finishingPlayerIds.has(p.id)) {
             return { ...p, status: 'waiting', playCount: (p.playCount || 0) + 1 };
         }
         return p;
    }));

    setCourts(prevCourts => {
        const nextCourts = prevCourts.map(c => ({ 
            ...c, 
            players: [...c.players], 
            nextMatch: [...c.nextMatch] 
        }));

        const targetCourt = nextCourts.find(c => c.id === courtId);
        if (targetCourt) {
            targetCourt.players = [null, null, null, null];
            targetCourt.status = 'empty';
            targetCourt.startTime = undefined;
        }

        const busyPlayerIds = new Set<string>();
        nextCourts.forEach(c => {
             c.players.forEach(p => {
                 if (p && p.id) busyPlayerIds.add(p.id);
             });
        });

        type QueueRequest = {
            player: Player;
            courtId: number;
            slotIndex: number;
            queueTime: number;
        };
        const requests: QueueRequest[] = [];
        nextCourts.forEach(c => {
            if (c.status === 'empty') {
                c.nextMatch.forEach((p, idx) => {
                    if (p) requests.push({ player: p, courtId: c.id, slotIndex: idx, queueTime: p.queueTime || 0 });
                });
            }
        });
        requests.sort((a, b) => a.queueTime - b.queueTime);

        requests.forEach(req => {
            if (busyPlayerIds.has(req.player.id)) return;

            const c = nextCourts.find(ct => ct.id === req.courtId);
            if (c) {
                c.players[req.slotIndex] = req.player; 
                c.nextMatch[req.slotIndex] = null;
                busyPlayerIds.add(req.player.id);
            }
        });

        nextCourts.forEach(c => {
            const validCount = c.players.filter(p => p !== null).length;
            if (validCount === 4) {
                 const balanced = getBalancedMatches(c.players as Player[]);
                 c.players = balanced;
                 c.status = 'ready';
            }
        });

        return nextCourts;
    });

    setTimeout(() => {
        setPlayers(currentPlayers => {
             const playingIds = new Set<string>();
             setCourts(currentCourts => {
                 currentCourts.forEach(c => {
                     if (c.status === 'active' || c.status === 'ready') {
                         c.players.forEach(p => { if(p) playingIds.add(p.id); });
                     }
                 });
                 return currentCourts;
             });

             return currentPlayers.map(p => {
                 if (playingIds.has(p.id)) return { ...p, status: 'playing' };
                 if (p.status === 'playing' && !playingIds.has(p.id)) return { ...p, status: 'waiting' };
                 return p;
             });
        });
    }, 50);
  };

  const performResetCounts = () => {
    setPlayers(prevPlayers => prevPlayers.map(p => ({ ...p, playCount: 0 })));
    setCourts(prevCourts => prevCourts.map(c => ({
      ...c,
      players: c.players.map(p => p ? { ...p, playCount: 0 } : null),
      nextMatch: c.nextMatch.map(p => p ? { ...p, playCount: 0 } : null)
    })));
  };

  const handleClearHistory = () => {
     if(!confirm("確定要清空所有歷史紀錄嗎？")) return;
     setHistory([]);
     performResetCounts();
  }

  const handleClearTodayHistory = () => {
      if(!confirm("確定要清空今日紀錄嗎？")) return;
      const today = new Date().toISOString().split('T')[0];
      setHistory(prev => prev.filter(r => r.date !== today));
      showToast("今日紀錄已清空");
  };

  const handleDeleteMatch = (id: string) => {
      if(!confirm("確定要刪除這筆紀錄嗎？")) return;
      setHistory(prev => prev.filter(h => h.id !== id));
      showToast("紀錄已刪除");
  };

  const handleUpdateMatch = (id: string, scoreA: number, scoreB: number, winner?: 'Team A' | 'Team B' | 'Draw') => {
      setHistory(prev => prev.map(h => {
          if (h.id !== id) return h;
          
          let computedWinner = winner || 'Draw';
          if (!winner) {
              if (scoreA > scoreB) computedWinner = 'Team A';
              else if (scoreB > scoreA) computedWinner = 'Team B';
          }
          
          return {
              ...h,
              score: `${scoreA} : ${scoreB}`,
              winner: computedWinner
          };
      }));
      showToast("紀錄已更新");
  };

  const handleClearAll = () => {
      if(!confirm("確定要清空所有資料(含球員、場地、紀錄)嗎？")) return;
      setPlayers([]);
      setCourts(JSON.parse(JSON.stringify(INITIAL_COURTS)).map((c: Court, i: number) => ({...c, id: i+1, name: `場地 ${i+1}`})));
      setHistory([]);
      showToast("已清空所有資料");
  }

  const handleClearCourts = () => {
      const playersOnCourt = new Set<string>();
      courts.forEach(c => c.players.forEach(p => { if(p) playersOnCourt.add(p.id); }));

      setPlayers(prev => prev.map(p => {
          if (playersOnCourt.has(p.id)) return { ...p, status: 'waiting' };
          return p;
      }));

      setCourts(prev => prev.map(c => ({
          ...c,
          players: [null, null, null, null],
          status: 'empty',
          startTime: undefined
      })));

      showToast("已全部下場");
  };

  const handleResetPlayCounts = () => {
      performResetCounts();
      showToast("所有球員上場次數已歸零！");
  }

  const availablePlayersForModal = players.filter(p => {
     if (targetIsNextMatch) return true; 
     const currentCourt = courts.find(c => c.id === targetCourtId);
     if (currentCourt) {
         if (targetIsNextMatch) {
             if (currentCourt.nextMatch.some(np => np?.id === p.id)) return false;
         } else {
             if (currentCourt.players.some(cp => cp?.id === p.id)) return false;
         }
     }
     return p.status !== 'playing'; 
  });

  const allQueuedPlayers = courts.flatMap(c => 
     c.nextMatch
       .filter(p => p !== null)
       .map(p => ({ pid: p!.id, cid: c.id, queueTime: p!.queueTime || 0 }))
  );
  allQueuedPlayers.sort((a, b) => a.queueTime - b.queueTime);

  const getPlayerQueueRank = (playerId: string, courtId: number): number => {
      const myEntries = allQueuedPlayers.filter(x => x.pid === playerId);
      const index = myEntries.findIndex(x => x.cid === courtId);
      return index + 1; 
  };

  const calculatePlayerStats = (player: Player) => {
      const myHistory = history.filter(r => (r.playerIds || []).includes(player.id));
      const todayStr = new Date().toISOString().split('T')[0];
      const todayHistory = myHistory.filter(r => r.date === todayStr);

      const calculateSet = (recs: MatchRecord[]) => {
          const totalGames = recs.length;
          let wins = 0;
          const partnerStats: Record<string, {name: string, count: number, wins: number}> = {};
          const opponentStats: Record<string, {name: string, count: number, wins: number}> = {};

          recs.forEach(match => {
              const currentPlayerIds = match.playerIds || [];
              const currentPlayers = match.players || [];
              
              const myIndex = currentPlayerIds.indexOf(player.id);
              if (myIndex === -1) return;

              const myTeam = myIndex < 2 ? 'Team A' : 'Team B';
              const isWin = match.winner === myTeam;
              if (isWin) wins++;

              let partnerIdx = -1;
              if (myIndex === 0) partnerIdx = 1;
              else if (myIndex === 1) partnerIdx = 0;
              else if (myIndex === 2) partnerIdx = 3;
              else if (myIndex === 3) partnerIdx = 2;

              const partnerName = currentPlayers[partnerIdx];
              if (partnerName) {
                  if (!partnerStats[partnerName]) partnerStats[partnerName] = { name: partnerName, count: 0, wins: 0 };
                  partnerStats[partnerName].count++;
                  if (isWin) partnerStats[partnerName].wins++;
              }

              const opponentIndices = myTeam === 'Team A' ? [2, 3] : [0, 1];
              opponentIndices.forEach(idx => {
                  const oppName = currentPlayers[idx];
                  if (oppName) {
                      if (!opponentStats[oppName]) opponentStats[oppName] = { name: oppName, count: 0, wins: 0 };
                      opponentStats[oppName].count++;
                      if (isWin) opponentStats[oppName].wins++;
                  }
              });
          });

          return {
              totalGames,
              wins,
              winRate: totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0,
              partners: Object.values(partnerStats).sort((a,b) => b.count - a.count),
              opponents: Object.values(opponentStats).sort((a,b) => b.count - a.count)
          };
      }

      const dailyStats: Record<string, {date: string, count: number, wins: number}> = {};
      myHistory.forEach(match => {
          const d = match.date || 'Unknown';
          if (!dailyStats[d]) dailyStats[d] = { date: d, count: 0, wins: 0 };
          dailyStats[d].count++;
          
          const myIndex = (match.playerIds || []).indexOf(player.id);
          const myTeam = myIndex < 2 ? 'Team A' : 'Team B';
          if (match.winner === myTeam) dailyStats[d].wins++;
      });
      const dailyList = Object.values(dailyStats).sort((a,b) => b.date.localeCompare(a.date));

      return {
          total: calculateSet(myHistory),
          today: calculateSet(todayHistory),
          daily: dailyList
      };
  };

  return (
    <DndContext 
        sensors={sensors} 
        onDragStart={handleDragStart} 
        onDragEnd={handleDragEnd}
        autoScroll={{ layoutShiftCompensation: false }}
    >
    <div className="h-[100dvh] bg-[#031811] text-gray-100 flex flex-col font-sans overflow-hidden">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[200] animate-fade-in-up">
           <div className="bg-emerald-600 text-white px-6 py-3 rounded-full shadow-2xl font-bold flex items-center gap-2 border border-emerald-400/50">
             <CheckCircle size={18} className="text-white" />
             {toastMessage}
           </div>
        </div>
      )}

      {/* Binding Mode Overlay */}
      {bindingSourceId && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] animate-bounce">
            <div className={`${bindingType === 'partner' ? 'bg-pink-600 border-pink-400' : 'bg-orange-600 border-orange-400'} text-white px-6 py-2 rounded-full shadow-xl font-bold border-2 flex items-center gap-2`}>
                {bindingType === 'partner' ? <LinkIcon size={16}/> : <Swords size={16}/>}
                {bindingType === 'partner' ? '請選擇要綁定的隊友...' : '請選擇要綁定的對手...'} (點擊球員)
                <button onClick={() => { setBindingSourceId(null); setBindingType(null); }} className="ml-2 bg-black/20 rounded-full p-1 hover:bg-black/40"><X size={12}/></button>
            </div>
        </div>
      )}

      {/* Overlay for closing menu */}
      {showMenu && (
          <div 
             className="fixed inset-0 z-40 bg-transparent" 
             onClick={() => setShowMenu(false)}
          ></div>
      )}

      <header className="bg-[#062c1f] border-b border-white/10 shrink-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-2 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Trophy className="text-yellow-400" size={20} />
            <h1 className="text-lg font-bold tracking-wide">
              野豬騎士 <span className="text-emerald-500 text-xs font-normal ml-2 bg-emerald-900/50 px-2 py-0.5 rounded">V9.0</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-black/20 p-1 rounded-lg">
               <button 
                 onClick={() => setActiveTab('signup')}
                 className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${activeTab === 'signup' ? 'bg-emerald-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
               >
                 報名
               </button>
               <button 
                 onClick={() => setActiveTab('manage')}
                 className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${activeTab === 'manage' ? 'bg-emerald-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
               >
                 排點
               </button>
            </div>
            
            <div className="relative">
              <button onClick={() => setShowMenu(!showMenu)} className="p-2 text-gray-300 hover:text-white md:hidden">
                 <MoreVertical size={20} />
              </button>
              
              {showMenu && (
                <div ref={menuRef} className="absolute right-0 top-full mt-2 w-48 bg-[#0a2e1f] border border-white/10 rounded-xl shadow-xl z-50 flex flex-col overflow-hidden animate-fade-in">
                   <button onClick={() => { handleClearCourts(); setShowMenu(false); }} className="px-4 py-3 text-left text-sm hover:bg-white/5 flex items-center gap-2 text-orange-300">
                      <LogOut size={16} /> 全部下場
                   </button>
                   <button onClick={() => { handleResetPlayCounts(); setShowMenu(false); }} className="px-4 py-3 text-left text-sm hover:bg-white/5 flex items-center gap-2">
                      <RotateCcw size={16} /> 重置場次
                   </button>
                   <div className="h-px bg-white/10 my-0"></div>
                   <button onClick={() => { handleClearAll(); setShowMenu(false); }} className="px-4 py-3 text-left text-sm text-red-400 hover:bg-white/5 flex items-center gap-2">
                      <Trash2 size={16} /> 全部清空
                   </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden relative flex flex-col w-full">
        
        {activeTab === 'signup' ? (
          <div className="h-full overflow-y-auto animate-fade-in">
             <SignupSystem onImportToGame={handleImportFromSignup} />
          </div>
        ) : (
          <div className="flex-1 flex flex-col lg:flex-row h-full lg:overflow-hidden overflow-y-auto animate-fade-in">
            
            {/* Top/Left Section: Courts */}
            <div className="shrink-0 lg:flex-1 flex flex-col min-w-0 relative lg:overflow-hidden">
              
              <div className="p-4 lg:flex-1 lg:overflow-y-auto custom-scrollbar pb-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
                  {courts.map(court => {
                     const ranks = court.nextMatch.map(p => 
                        p ? getPlayerQueueRank(p.id, court.id) : null
                     );

                     return (
                        <BadmintonCourt 
                          key={court.id} 
                          court={court}
                          onFinish={handleFinishMatch}
                          onStart={handleStartMatch}
                          onRemovePlayer={handleRemoveFromCourt}
                          onSelectSlot={handleSelectCourtSlot}
                          isSelected={selectedPlayerId !== null && court.players.some(p => p === null)}
                          nextMatchRanks={ranks}
                        />
                     );
                  })}
                </div>
              </div>

              {/* Quick Actions Sticky Bar */}
              <div className="shrink-0 bg-[#062c1f] border-t border-b border-white/10 p-2 z-20 shadow-[0_-5px_15px_rgba(0,0,0,0.5)] flex flex-wrap gap-2 justify-between items-center sticky bottom-0 lg:relative">
                  
                  {/* Left Controls */}
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-full">
                       <div className="flex items-center bg-black/30 rounded-lg p-0.5 border border-white/5 shrink-0">
                          <button onClick={handleRemoveCourt} className="p-2 hover:text-red-400 text-gray-300"><MinusCircle size={16}/></button>
                          <span className="px-1 text-xs font-mono font-bold text-gray-400">{courts.length}場</span>
                          <button onClick={handleAddCourt} className="p-2 hover:text-emerald-400 text-gray-300"><PlusCircle size={16}/></button>
                       </div>

                       <button 
                        onClick={handleAutoAssign}
                        className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-3 py-1.5 rounded-lg font-bold shadow-lg text-xs whitespace-nowrap shrink-0"
                      >
                        <Zap size={14} /> 智能排點
                      </button>

                      <div className="hidden md:flex items-center gap-1">
                        <button onClick={handleClearCourts} className="bg-orange-900/40 hover:bg-orange-800 text-orange-200 border border-orange-500/20 px-2 py-1.5 rounded-lg text-xs shrink-0"><LogOut size={14}/></button>
                        <button onClick={handleResetPlayCounts} className="bg-gray-700/50 hover:bg-gray-600 text-white px-2 py-1.5 rounded-lg text-xs shrink-0"><RotateCcw size={14}/></button>
                      </div>

                      <button 
                        onClick={() => setShowHistoryMobile(true)}
                        className="flex lg:hidden items-center gap-1 bg-[#1a3d32] hover:bg-[#23493e] text-emerald-400 border border-emerald-500/30 px-2 py-1.5 rounded-lg text-xs whitespace-nowrap shrink-0"
                      >
                        <History size={14} /> 紀錄
                      </button>
                  </div>

                  {/* Right Input Form */}
                  <form onSubmit={handleAddPlayer} className="flex-1 sm:flex-none flex gap-1 items-center bg-black/20 p-0.5 rounded-lg border border-white/5 min-w-[180px]">
                      <select 
                        value={newLevel}
                        onChange={(e) => setNewLevel(e.target.value as PlayerLevel)}
                        className="bg-transparent text-xs text-gray-300 focus:outline-none p-1 max-w-[50px]"
                      >
                        {Object.values(PlayerLevel).map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                      <input 
                         className="bg-transparent border-b border-gray-600 w-12 text-xs text-white focus:outline-none focus:border-emerald-500 px-1 py-1"
                         placeholder="BP"
                         type="number"
                         value={newBattlePower}
                         onChange={(e) => setNewBattlePower(e.target.value)}
                      />
                      <input 
                        className="bg-transparent border-b border-gray-600 w-full sm:w-24 text-xs text-white focus:outline-none focus:border-emerald-500 px-1 py-1"
                        placeholder="新球員..."
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                      />
                      <button type="submit" className="bg-emerald-700 p-1.5 rounded hover:bg-emerald-600 text-white"><Plus size={14} /></button>
                  </form>
              </div>
            </div>

            {/* Bottom/Right Section: Player List */}
            <div className="shrink-0 lg:h-full lg:w-80 lg:flex-none lg:border-l border-white/10 flex flex-col bg-[#082218] shadow-[0_-5px_20px_rgba(0,0,0,0.5)] z-10 relative border-t lg:border-t-0">
               <div className="shrink-0 p-3 bg-[#062c1f] border-b border-white/10 flex justify-between items-center">
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <Users size={16} className="text-emerald-400"/>
                    球員名單
                  </h3>
                  {selectedPlayerId && (
                     <div className="text-yellow-400 text-xs animate-pulse flex items-center gap-1">
                       <ArrowRight size={12} /> 請點擊場地加入
                     </div>
                  )}
               </div>
               
               <div className="p-2 lg:flex-1 lg:overflow-y-auto custom-scrollbar pb-20 lg:pb-4">
                  <PlayerList 
                    players={players} 
                    selectedPlayerId={selectedPlayerId}
                    onSelect={handleSelectPlayer}
                    onRemove={handleRemovePlayer}
                    onChangeStatus={handleChangeStatus}
                    onEdit={handleEditPlayer} 
                    onViewStats={(p) => setViewingStatsPlayer(p)}
                    onBind={handleStartBind}
                    onUnbind={handleUnbind}
                    bindingId={bindingSourceId}
                    bindingType={bindingType}
                  />
               </div>
            </div>
            
            {/* Mobile History Panel Overlay */}
            {showHistoryMobile && (
              <div className="absolute inset-0 z-50 bg-[#031811] flex flex-col animate-fade-in-up">
                 <div className="flex items-center justify-between p-3 bg-[#062c1f] border-b border-white/10 shrink-0">
                   <button 
                     onClick={() => setShowHistoryMobile(false)} 
                     className="flex items-center gap-1 px-3 py-1.5 bg-emerald-900/50 text-emerald-400 rounded-lg border border-emerald-500/30 font-bold active:scale-95 transition-transform text-xs"
                   >
                      <ArrowLeft size={14}/> 返回
                   </button>
                   <span className="text-sm font-bold text-gray-200">歷史紀錄</span>
                   <div className="w-12"></div>
                 </div>

                 <div className="flex-1 overflow-hidden p-2">
                    <HistoryPanel 
                      history={history} 
                      onClear={handleClearHistory} 
                      onClearToday={handleClearTodayHistory}
                      onDeleteMatch={handleDeleteMatch}
                      onUpdateMatch={handleUpdateMatch}
                    />
                 </div>
              </div>
            )}

          </div>
        )}

        {isPlayerSelectorOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
             <div className="bg-[#0a2e1f] w-full max-w-2xl rounded-2xl border border-emerald-500/50 shadow-2xl flex flex-col max-h-[80vh]">
               <div className="flex justify-between items-center p-5 border-b border-white/10 bg-[#062c1f] rounded-t-2xl">
                  <div>
                    <h3 className="text-xl font-bold text-white">選擇上場球員</h3>
                    <p className="text-gray-400 text-xs mt-1">
                      {targetIsNextMatch ? '加入預排區 (Next Match)' : `點擊球員以加入 ${targetCourtId} 號場地`}
                    </p>
                  </div>
                  <button 
                    onClick={() => { setIsPlayerSelectorOpen(false); setTargetCourtId(null); }} 
                    className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                  >
                    <X size={24} />
                  </button>
               </div>
               
               <div className="p-6 overflow-y-auto custom-scrollbar bg-[#0a2e1f]">
                  <PlayerList 
                    players={availablePlayersForModal}
                    selectedPlayerId={null}
                    onSelect={(p) => handleModalSelectPlayer(p)}
                    onRemove={() => {}} 
                    onChangeStatus={() => {}}
                    readOnly={true} 
                  />
               </div>
             </div>
          </div>
        )}

        {editingPlayer && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
             <div className="bg-[#062c1f] w-full max-w-sm rounded-2xl border border-emerald-500/30 p-5 shadow-2xl">
                 <div className="flex justify-between items-center mb-4">
                     <h3 className="font-bold text-white text-lg">編輯 {editingPlayer.name}</h3>
                     <button onClick={() => setEditingPlayer(null)} className="text-gray-400 hover:text-white"><X size={20}/></button>
                 </div>
                 <div className="space-y-4">
                     <div>
                        <label className="text-xs text-gray-400 mb-1 block">程度</label>
                        <select 
                            value={editingPlayer.level}
                            onChange={(e) => setEditingPlayer({...editingPlayer, level: e.target.value as PlayerLevel})}
                            className="w-full bg-[#031811] border border-white/20 rounded p-2 text-white outline-none focus:border-emerald-500"
                        >
                            {Object.values(PlayerLevel).map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                     </div>
                     <div className="grid grid-cols-2 gap-3">
                       <div>
                          <label className="text-xs text-gray-400 mb-1 block">戰鬥力 (BP)</label>
                          <input 
                              type="number"
                              value={editingPlayer.battlePower}
                              onChange={(e) => setEditingPlayer({...editingPlayer, battlePower: parseInt(e.target.value)})}
                              className="w-full bg-[#031811] border border-white/20 rounded p-2 text-white outline-none focus:border-emerald-500"
                          />
                       </div>
                       <div>
                          <label className="text-xs text-gray-400 mb-1 block text-yellow-400">上場次數</label>
                          <input 
                              type="number"
                              value={editingPlayer.playCount}
                              onChange={(e) => setEditingPlayer({...editingPlayer, playCount: parseInt(e.target.value)})}
                              className="w-full bg-[#031811] border border-white/20 rounded p-2 text-yellow-400 font-bold outline-none focus:border-yellow-500"
                          />
                       </div>
                     </div>
                     <div className="pt-2 flex gap-2">
                        <button onClick={() => setEditingPlayer(null)} className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded text-sm text-white">取消</button>
                        <button onClick={handleSavePlayerEdit} className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-2 rounded text-sm text-white font-bold">儲存變更</button>
                     </div>
                 </div>
             </div>
           </div>
        )}

        {viewingStatsPlayer && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
             <div className="bg-[#0a2e1f] w-full max-w-md rounded-2xl border border-purple-500/30 shadow-2xl flex flex-col max-h-[85vh]">
                 <div className="p-5 border-b border-white/10 bg-[#062c1f] rounded-t-2xl flex justify-between items-center">
                     <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${LEVEL_COLORS[viewingStatsPlayer.level]} text-white border-2 border-white`}>
                           {viewingStatsPlayer.name.slice(0, 2)}
                        </div>
                        <div>
                           <h3 className="text-xl font-bold text-white">{viewingStatsPlayer.name} 的戰績</h3>
                           <p className="text-xs text-purple-300">生涯詳細數據分析</p>
                        </div>
                     </div>
                     <button onClick={() => setViewingStatsPlayer(null)} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white"><X size={24}/></button>
                 </div>
                 
                 <div className="p-5 overflow-y-auto custom-scrollbar space-y-6 bg-[#0a2e1f]">
                    {(() => {
                        try {
                            const stats = calculatePlayerStats(viewingStatsPlayer);
                            
                            return (
                               <div className="space-y-6">
                                 {/* Stats Tabs or Split View */}
                                 <div className="grid grid-cols-2 gap-4">
                                    {/* Today's Stats */}
                                    <div className="space-y-3">
                                       <div className="flex items-center gap-2 text-emerald-400 font-bold border-b border-white/10 pb-1">
                                          <Calendar size={14}/> 今日戰績
                                       </div>
                                       <div className="bg-black/20 p-2 rounded-lg text-center border border-white/5">
                                           <span className="text-[10px] text-gray-400">總場次</span>
                                           <div className="text-xl font-bold text-white">{stats.today.totalGames}</div>
                                       </div>
                                       <div className="bg-black/20 p-2 rounded-lg text-center border border-white/5">
                                           <span className="text-[10px] text-gray-400">勝率</span>
                                           <div className="text-xl font-bold text-emerald-400">{stats.today.winRate}%</div>
                                       </div>
                                    </div>

                                    {/* Lifetime Stats */}
                                    <div className="space-y-3">
                                       <div className="flex items-center gap-2 text-purple-400 font-bold border-b border-white/10 pb-1">
                                          <History size={14}/> 歷史總計
                                       </div>
                                       <div className="bg-black/20 p-2 rounded-lg text-center border border-white/5">
                                           <span className="text-[10px] text-gray-400">總場次</span>
                                           <div className="text-xl font-bold text-white">{stats.total.totalGames}</div>
                                       </div>
                                       <div className="bg-black/20 p-2 rounded-lg text-center border border-white/5">
                                           <span className="text-[10px] text-gray-400">勝率</span>
                                           <div className="text-xl font-bold text-purple-400">{stats.total.winRate}%</div>
                                       </div>
                                    </div>
                                 </div>
                                 
                                 {/* Daily History Breakdown */}
                                 {stats.daily.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-300 mb-3 flex items-center gap-2"><BarChart2 size={14}/> 每日戰績</h4>
                                        <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar bg-black/10 rounded-lg p-2 border border-white/5">
                                            {stats.daily.map(d => (
                                                <div key={d.date} className="flex justify-between items-center text-xs p-2 hover:bg-white/5 rounded">
                                                    <span className="text-gray-400">{d.date}</span>
                                                    <div className="flex gap-4">
                                                        <span className="text-gray-200">{d.count} 場</span>
                                                        <span className={`${d.wins > 0 ? 'text-emerald-400' : 'text-gray-500'} font-mono`}>
                                                            勝 {d.wins} ({Math.round((d.wins/d.count)*100)}%)
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                 )}

                                 <div>
                                    <h4 className="text-sm font-bold text-blue-300 mb-3 flex items-center gap-2"><Shield size={14}/> 最佳搭檔 (歷史)</h4>
                                    {stats.total.partners.length === 0 ? (
                                       <div className="text-center text-gray-600 text-xs py-2">暫無搭檔紀錄</div>
                                    ) : (
                                       <div className="space-y-2">
                                          {stats.total.partners.slice(0, 5).map(p => (
                                             <div key={p.name} className="flex justify-between items-center text-sm bg-blue-900/20 px-3 py-2 rounded-lg">
                                                <span className="font-bold text-gray-200">{p.name}</span>
                                                <div className="flex gap-3 text-xs">
                                                   <span className="text-gray-400">{p.count} 場</span>
                                                   <span className="text-yellow-500 font-mono">勝率 {Math.round((p.wins/p.count)*100)}%</span>
                                                </div>
                                             </div>
                                          ))}
                                       </div>
                                    )}
                                 </div>

                                 <div>
                                   <h4 className="text-sm font-bold text-red-300 mb-3 flex items-center gap-2"><Swords size={14}/> 常遇對手 (歷史)</h4>
                                    {stats.total.opponents.length === 0 ? (
                                       <div className="text-center text-gray-600 text-xs py-2">暫無對戰紀錄</div>
                                    ) : (
                                       <div className="space-y-2">
                                          {stats.total.opponents.slice(0, 5).map(p => (
                                             <div key={p.name} className="flex justify-between items-center text-sm bg-red-900/20 px-3 py-2 rounded-lg">
                                                <span className="font-bold text-gray-200">{p.name}</span>
                                                <div className="flex gap-3 text-xs">
                                                   <span className="text-gray-400">{p.count} 場</span>
                                                   <span className="text-orange-400 font-mono">勝率 {Math.round((p.wins/p.count)*100)}%</span>
                                                </div>
                                             </div>
                                          ))}
                                       </div>
                                    )}
                                 </div>
                               </div>
                            );
                        } catch (err) {
                            console.error("Stats Error:", err);
                            return <div className="p-4 text-center text-red-400">數據計算錯誤，請稍後再試</div>
                        }
                    })()}
                 </div>
             </div>
           </div>
        )}

      </main>

      <DragOverlay dropAnimation={{ duration: 150, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
         {activeDragPlayer ? (
            <div className={`
              flex flex-col p-2 rounded-xl border-2 overflow-hidden h-[110px] w-[140px] shadow-2xl transform scale-110 cursor-grabbing
              ${LEVEL_STYLES[activeDragPlayer.level].bg} ${LEVEL_STYLES[activeDragPlayer.level].border}
            `}>
                <div className="flex flex-col mb-1">
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded text-black bg-white/90 w-fit mb-1 shadow-sm`}>
                        {LEVEL_STYLES[activeDragPlayer.level].name}
                    </span>
                    <span className={`font-bold text-gray-100 truncate text-sm leading-tight ${LEVEL_STYLES[activeDragPlayer.level].color} drop-shadow-md`}>
                        {activeDragPlayer.name}
                    </span>
                </div>
                 <div className="flex items-center gap-1 mt-auto z-10">
                    <div className="flex items-center gap-1 bg-black/40 px-1.5 py-0.5 rounded border border-white/10">
                      <Swords size={10} className="text-red-400" />
                      <span className="font-mono font-bold text-xs text-white">{activeDragPlayer.battlePower}</span>
                    </div>
                </div>
            </div>
         ) : null}
      </DragOverlay>
    </div>
    </DndContext>
  );
};

export default App;
