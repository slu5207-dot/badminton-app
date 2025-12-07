import React, { useState, useEffect } from 'react';
import { PlayerLevel } from '../types';
import type { SignupEvent, ParticipantDetail, FavoritePlayer } from '../types';
import { LEVEL_COLORS, LEVEL_STYLES } from '../constants';
import { 
  Calendar, Copy, Download, ChevronLeft, ChevronRight, 
  Plus, Trash2, Star, ArrowUp, Pencil, MapPin, Clock, Users, RefreshCw, DollarSign, Check, X
} from 'lucide-react';

import { db } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

const DEFAULT_LOCATIONS = ['裕興', '太子'];
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2).toString().padStart(2, '0');
  const m = i % 2 === 0 ? '00' : '30';
  return `${h}:${m}`;
});

const DEFAULT_EVENT: SignupEvent = {
  title: '《野豬騎士來囉!》', location: '裕興', startTime: '21:00', endTime: '23:00',
  courts: 3, venueFee: 3000, shuttlecockFee: 500, limit: 20,
  participants: [], waitlist: [], notes: '', participantDetails: {}
};

interface Props {
  onImportToGame: (names: string[], details?: Record<string, ParticipantDetail>) => void;
}

const SignupSystem: React.FC<Props> = ({ onImportToGame }) => {
  const [currentDate, setCurrentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [events, setEvents] = useState<Record<string, SignupEvent>>({});
  const [activeTab, setActiveTab] = useState<'edit' | 'preview' | 'favorites'>('edit');
  const [isSyncing, setIsSyncing] = useState(true);
  
  // 地點管理
  const [locations, setLocations] = useState<string[]>(DEFAULT_LOCATIONS);
  const [newLocationName, setNewLocationName] = useState('');
  const [isAddingLocation, setIsAddingLocation] = useState(false);

  // 輸入欄位 (現在專注於「新增」功能)
  const [inputName, setInputName] = useState('');
  const [inputLevel, setInputLevel] = useState<PlayerLevel>(PlayerLevel.INTERMEDIATE);
  const [inputBP, setInputBP] = useState<string>('1500');

  // Modal 狀態管理
  const [favorites, setFavorites] = useState<FavoritePlayer[]>([]);
  const [editingFavorite, setEditingFavorite] = useState<FavoritePlayer | null>(null);
  
  // 🔥 [新增] 專門用來編輯「已報名選手」的 Modal 狀態
  // 這解決了「點筆沒反應」或「操作不直覺」的問題
  const [editingParticipant, setEditingParticipant] = useState<{
      name: string; 
      level: PlayerLevel; 
      bp: number;
  } | null>(null);

  // Firebase Init
  useEffect(() => {
    const docRef = doc(db, 'badminton-app', 'signup-data');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setEvents(data.events || {});
        if (data.locations) setLocations(data.locations);
        setIsSyncing(false);
      } else {
        setDoc(docRef, { events: {}, locations: DEFAULT_LOCATIONS });
      }
    });
    return () => unsubscribe();
  }, []);

  const saveToFirebase = async (newEvents: Record<string, SignupEvent>, newLocations?: string[]) => {
    setEvents(newEvents);
    if (newLocations) setLocations(newLocations);
    try {
      await setDoc(doc(db, 'badminton-app', 'signup-data'), { 
        events: newEvents,
        locations: newLocations || locations 
      }, { merge: true });
    } catch (e) {
      console.error("Save failed", e);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('badminton_favorites');
    if (saved) setFavorites(JSON.parse(saved));
  }, []);

  const saveFavorites = (favs: FavoritePlayer[]) => {
    setFavorites(favs);
    localStorage.setItem('badminton_favorites', JSON.stringify(favs));
  };

  const updateFavorite = (updatedFav: FavoritePlayer, originalName: string) => {
    const newFavs = favorites.map(f => f.name === originalName ? updatedFav : f);
    saveFavorites(newFavs);
    setEditingFavorite(null);

    const currentEvt = getEvent(currentDate);
    const inList = currentEvt.participants.includes(originalName) || currentEvt.waitlist.includes(originalName);
    if (inList) {
        if (window.confirm(`「${originalName}」已在今日報名表中。是否同步更新他的等級與戰力？`)) {
            const newDetails = { ...currentEvt.participantDetails };
            newDetails[originalName] = { level: updatedFav.level, battlePower: updatedFav.battlePower };
            updateEvent({ ...currentEvt, participantDetails: newDetails });
        }
    }
  };

  // 🔥 [核心功能] 更新已報名選手的資料 (被 Modal 呼叫)
  const handleUpdateParticipantConfirm = () => {
    if (!editingParticipant) return;
    const { name, level, bp } = editingParticipant;

    let evt = { ...currentEvent };
    const details = { ...evt.participantDetails };
    
    // 更新詳細資料
    details[name] = { level, battlePower: bp };
    evt.participantDetails = details;

    updateEvent(evt);
    setEditingParticipant(null); // 關閉視窗
  };

  const getEvent = (date: string): SignupEvent => {
    const defaultLoc = locations.length > 0 ? locations[0] : '裕興';
    const evt = events[date] ? { ...DEFAULT_EVENT, ...events[date] } : JSON.parse(JSON.stringify(DEFAULT_EVENT));
    if (!events[date] && !locations.includes(evt.location)) {
        evt.location = defaultLoc;
    }
    return evt;
  };

  const currentEvent = getEvent(currentDate);

  const updateEvent = (evt: SignupEvent) => {
    const newEvents = { ...events, [currentDate]: evt };
    saveToFirebase(newEvents);
  };

  const handleLoadFavorite = (fav: FavoritePlayer) => {
      setInputName(fav.name);
      setInputLevel(fav.level);
      setInputBP(fav.battlePower.toString());
      // 純填入，不自動切換，保持在最上方
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 此函式現在回歸單純的「新增功能」
  const handleSubmitParticipant = () => {
    const name = inputName.trim();
    if (!name) return;
    const bp = parseInt(inputBP) || 1500;

    let evt = { ...currentEvent };
    const details = { ...evt.participantDetails };

    if (evt.participants.includes(name) || evt.waitlist.includes(name)) {
        alert(`「${name}」已經報名了。\n如果想修改資料，請直接點擊下方名單右側的「筆」圖示。`);
        return;
    }
    
    details[name] = { level: inputLevel, battlePower: bp };
    evt.participantDetails = details;
    
    if (evt.participants.length < evt.limit) evt.participants.push(name);
    else evt.waitlist.push(name);
    
    updateEvent(evt);
    setInputName('');
  };

  const handleAddFromFavorite = (name: string, level: PlayerLevel, bp: number) => {
      let evt = { ...currentEvent };
      if (evt.participants.includes(name) || evt.waitlist.includes(name)) {
          alert("已在名單中");
          return;
      }
      evt.participantDetails = { ...evt.participantDetails, [name]: { level, battlePower: bp } };
      
      if (evt.participants.length < evt.limit) evt.participants.push(name);
      else evt.waitlist.push(name);

      updateEvent(evt);
  };

  const handleAddLocation = () => {
    const trimmed = newLocationName.trim();
    if (trimmed && !locations.includes(trimmed)) {
      const newLocs = [...locations, trimmed];
      setLocations(newLocs);
      setNewLocationName('');
      setIsAddingLocation(false);
      try {
          const newEvents = { ...events, [currentDate]: { ...currentEvent, location: trimmed } };
          setEvents(newEvents); 
          setDoc(doc(db, 'badminton-app', 'signup-data'), { events: newEvents, locations: newLocs }, { merge: true });
      } catch(e) { console.error(e); }
    }
  };

  const handleDeleteLocation = (loc: string) => {
    if (window.confirm(`確定要刪除地點 "${loc}" 嗎？`)) {
      const newLocs = locations.filter(l => l !== loc);
      setLocations(newLocs);
      let updatedEvent = currentEvent;
      if (currentEvent.location === loc && newLocs.length > 0) {
        updatedEvent = { ...currentEvent, location: newLocs[0] };
      }
      saveToFirebase({ ...events, [currentDate]: updatedEvent }, newLocs);
    }
  };

  const rebalanceList = (evt: SignupEvent) => {
    while (evt.participants.length > evt.limit) {
      const p = evt.participants.pop();
      if (p) evt.waitlist.unshift(p);
    }
    while (evt.participants.length < evt.limit && evt.waitlist.length > 0) {
      const p = evt.waitlist.shift();
      if (p) evt.participants.push(p);
    }
    return evt;
  };

  const handleRemove = (index: number, isWaitlist: boolean) => {
    let evt = { ...currentEvent };
    if (isWaitlist) evt.waitlist.splice(index, 1);
    else {
        evt.participants.splice(index, 1);
        evt = rebalanceList(evt);
    }
    updateEvent(evt);
  };

  const handleMoveUp = (index: number) => {
      if (index === 0) return;
      let evt = { ...currentEvent };
      [evt.participants[index], evt.participants[index-1]] = [evt.participants[index-1], evt.participants[index]];
      updateEvent(evt);
  };

  const generatePreviewText = () => {
      const evt = currentEvent;
      const totalFee = (evt.venueFee || 0) + (evt.shuttlecockFee || 0);
      const feePerPerson = evt.participants.length ? Math.round(totalFee / evt.participants.length) : 0;
      let text = `${evt.title}\n${currentDate} (${new Date(currentDate).toLocaleDateString('zh-TW', {weekday:'short'})})\n`;
      text += `地點：${evt.location}\n時間：${evt.startTime}~${evt.endTime}\n費用：$${feePerPerson}\n\n`;
      text += evt.participants.map((p, i) => `${i+1}. ${p}`).join('\n');
      if (evt.waitlist.length) text += `\n\n候補：\n${evt.waitlist.map((p, i) => `${i+1}. ${p}`).join('\n')}`;
      return text;
  };

  const totalFee = (currentEvent.venueFee || 0) + (currentEvent.shuttlecockFee || 0);
  const perPerson = currentEvent.participants.length > 0 ? Math.round(totalFee / currentEvent.participants.length) : 0;

  return (
    <div className="flex flex-col h-full bg-[#031811] text-white relative">
       {/* 📅 Date Picker */}
       <div className="bg-[#062c1f] p-4 border-b border-white/10 flex justify-between items-center sticky top-0 z-20">
          <div className="flex items-center gap-4 relative">
              <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate()-1); setCurrentDate(d.toISOString().split('T')[0]); }} className="p-1 hover:bg-white/10 rounded"><ChevronLeft/></button>
              
              <div className="relative group">
                  <div className="flex items-center gap-2 font-bold text-lg text-emerald-400 cursor-pointer px-2 py-1 hover:bg-black/20 rounded">
                      <Calendar size={18}/> 
                      {currentDate}
                  </div>
                  <input 
                    type="date" 
                    value={currentDate} 
                    onChange={(e) => setCurrentDate(e.target.value)} 
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
              </div>

              <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate()+1); setCurrentDate(d.toISOString().split('T')[0]); }} className="p-1 hover:bg-white/10 rounded"><ChevronRight/></button>
          </div>
          {isSyncing && <RefreshCw size={16} className="animate-spin text-gray-400" />}
       </div>

       <div className="flex p-2 gap-2 bg-[#062c1f]">
         {['edit', 'preview', 'favorites'].map(t => (
             <button key={t} onClick={() => setActiveTab(t as any)} className={`flex-1 py-2 rounded text-sm font-bold capitalize ${activeTab === t ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:bg-white/5'}`}>{t === 'edit' ? '編輯' : t === 'preview' ? '預覽' : '常用'}</button>
         ))}
       </div>

       <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
          
          {activeTab === 'edit' && (
              <>
                 <div className="bg-[#0a2e1f] p-4 rounded-xl border border-white/10 space-y-4">
                    <input value={currentEvent.title} onChange={e => updateEvent({...currentEvent, title: e.target.value})} className="w-full bg-transparent text-xl font-bold text-center border-b border-white/10 pb-1 outline-none focus:border-emerald-500 transition-colors"/>
                    
                    <div className="grid grid-cols-2 gap-4">
                       
                       {/* Location Manager */}
                       <div>
                           <div className="flex justify-between items-center mb-1">
                               <label className="text-xs text-gray-400 flex items-center gap-1"><MapPin size={12}/> 地點</label>
                               <button 
                                 onClick={() => setIsAddingLocation(!isAddingLocation)}
                                 className="text-[10px] text-emerald-400 hover:underline flex items-center"
                               >
                                 {isAddingLocation ? '取消' : '+新增'}
                               </button>
                           </div>
                           
                           {isAddingLocation ? (
                               <div className="flex gap-1">
                                   <input 
                                     autoFocus
                                     value={newLocationName}
                                     onChange={(e) => setNewLocationName(e.target.value)}
                                     placeholder="新地點..."
                                     className="w-full bg-[#031811] border border-emerald-500 rounded p-2 text-sm outline-none"
                                   />
                                   <button onClick={handleAddLocation} className="bg-emerald-600 px-2 rounded"><Check size={14}/></button>
                               </div>
                           ) : (
                               <div className="relative">
                                   <select 
                                     value={currentEvent.location} 
                                     onChange={e => updateEvent({...currentEvent, location: e.target.value})} 
                                     className="w-full bg-[#031811] border border-white/20 rounded p-2 text-sm appearance-none focus:border-emerald-500 outline-none"
                                   >
                                      {locations.map(l => <option key={l} value={l}>{l}</option>)}
                                   </select>
                                   <button 
                                     onClick={() => handleDeleteLocation(currentEvent.location)}
                                     className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-500 hover:text-red-400 p-1"
                                     title="刪除此地點"
                                   >
                                      <Trash2 size={12}/>
                                   </button>
                                   <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">▼</div>
                               </div>
                           )}
                       </div>

                       <div>
                           <label className="text-xs text-gray-400 flex items-center gap-1 mb-1"><Users size={12}/> 人數上限</label>
                           <select value={currentEvent.limit} onChange={e => { const newEvt = {...currentEvent, limit: parseInt(e.target.value)}; updateEvent(rebalanceList(newEvt)); }} className="w-full bg-[#031811] border border-white/20 rounded p-2 text-sm">
                               {[8,10,12,14,16,18,20,22,24,26,28,30,32].map(n => <option key={n} value={n}>{n}</option>)}
                           </select>
                       </div>

                       {/* Time Selectors */}
                       <div>
                           <label className="text-xs text-gray-400 flex items-center gap-1 mb-1"><Clock size={12}/> 開始</label>
                           <div className="relative">
                               <select 
                                 value={currentEvent.startTime} 
                                 onChange={e => updateEvent({...currentEvent, startTime: e.target.value})} 
                                 className="w-full bg-[#031811] border border-white/20 rounded p-2 text-sm appearance-none focus:border-emerald-500 outline-none block"
                               >
                                  {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                               </select>
                               <Clock size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"/>
                           </div>
                       </div>
                       
                       <div>
                           <label className="text-xs text-gray-400 flex items-center gap-1 mb-1"><Clock size={12}/> 結束</label>
                           <div className="relative">
                               <select 
                                 value={currentEvent.endTime} 
                                 onChange={e => updateEvent({...currentEvent, endTime: e.target.value})} 
                                 className="w-full bg-[#031811] border border-white/20 rounded p-2 text-sm appearance-none focus:border-emerald-500 outline-none block"
                               >
                                  {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                               </select>
                               <Clock size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"/>
                           </div>
                       </div>
                    </div>

                    <div className="bg-black/20 p-3 rounded-lg space-y-2">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-400 flex items-center gap-1"><DollarSign size={12}/> 場地費</span>
                            <input type="number" value={currentEvent.venueFee} onChange={(e) => updateEvent({...currentEvent, venueFee: parseInt(e.target.value) || 0})} className="w-20 bg-transparent text-right border-b border-white/20 focus:border-emerald-500 outline-none text-white"/>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-400 flex items-center gap-1"><DollarSign size={12}/> 球費</span>
                            <input type="number" value={currentEvent.shuttlecockFee} onChange={(e) => updateEvent({...currentEvent, shuttlecockFee: parseInt(e.target.value) || 0})} className="w-20 bg-transparent text-right border-b border-white/20 focus:border-emerald-500 outline-none text-white"/>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-white/10">
                            <span className="text-yellow-500 font-bold text-sm">每人分攤 (約)</span>
                            <span className="text-xl font-bold text-emerald-400">${perPerson}</span>
                        </div>
                    </div>
                 </div>

                 {/* 輸入區塊 (僅用於新增) */}
                 <div className="flex flex-col gap-2 p-3 bg-[#0a2e1f] rounded-xl border border-white/10">
                    <div className="flex gap-2">
                        <select value={inputLevel} onChange={(e) => setInputLevel(e.target.value as PlayerLevel)} className="bg-[#031811] text-xs text-gray-300 rounded border border-white/20 p-1 w-24">{Object.values(PlayerLevel).map(l => <option key={l} value={l}>{l}</option>)}</select>
                        <input type="number" value={inputBP} onChange={(e) => setInputBP(e.target.value)} className="bg-[#031811] border border-white/20 rounded w-20 text-sm text-white px-2" placeholder="BP"/>
                    </div>
                    <div className="flex gap-2">
                        <input 
                            value={inputName} 
                            onChange={e => setInputName(e.target.value)} 
                            onKeyDown={e => e.key === 'Enter' && handleSubmitParticipant()} 
                            placeholder="輸入名字 (按+新增)" 
                            className="flex-1 bg-[#031811] border border-white/20 rounded-lg px-4 py-2 outline-none focus:border-emerald-500"
                        />
                        <button 
                            onClick={handleSubmitParticipant} 
                            className="px-4 py-2 rounded-lg text-white font-bold bg-emerald-600 hover:bg-emerald-500"
                        >
                            <Plus size={16}/>
                        </button>
                    </div>
                 </div>

                 {currentEvent.participants.length > 0 && (
                     <button onClick={() => onImportToGame(currentEvent.participants, currentEvent.participantDetails)} className="w-full py-3 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 active:scale-95">
                        <Download size={18} /> 匯入到排點系統
                     </button>
                 )}

                 <div className="bg-[#0a2e1f] rounded-xl border border-white/10 overflow-hidden">
                    <div className="bg-emerald-900/30 px-4 py-2 flex justify-between items-center border-b border-white/10"><span className="font-bold text-emerald-400">名單 ({currentEvent.participants.length}/{currentEvent.limit})</span></div>
                    <div className="divide-y divide-white/5">
                        {currentEvent.participants.map((name, i) => {
                            const details = currentEvent.participantDetails?.[name] || { level: PlayerLevel.INTERMEDIATE, battlePower: 1500 };
                            const style = LEVEL_STYLES[details.level] || LEVEL_STYLES[PlayerLevel.INTERMEDIATE];
                            const isFav = favorites.some(f => f.name === name);
                            
                            return (
                                <div key={i} className="flex justify-between items-center p-3 hover:bg-white/5">
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-emerald-600 w-6">{i+1}</span>
                                        <div className="flex flex-col">
                                            <span className="text-gray-200">{name}</span>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className={`text-[10px] font-bold px-1.5 rounded text-black ${style.badge}`}>{style.name}</span>
                                                <span className="text-[10px] text-gray-500 font-mono">BP:{details.battlePower}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        {/* 🔥 修復完成的按鈕：點擊觸發 setEditingParticipant 開啟彈窗 */}
                                        <button 
                                          onClick={() => setEditingParticipant({ name, level: details.level, bp: details.battlePower })} 
                                          className="p-2 rounded text-gray-500 hover:text-white hover:bg-white/10"
                                          title="編輯報名資料"
                                        >
                                            <Pencil size={14}/>
                                        </button>
                                        <button 
                                          onClick={() => { if (!isFav) saveFavorites([...favorites, {name, ...details}]) }} 
                                          className={`p-2 ${isFav ? 'text-yellow-400' : 'text-gray-600 hover:text-yellow-400'}`}
                                        >
                                            <Star size={16} className={isFav ? 'fill-yellow-400' : ''}/>
                                        </button>
                                        {i>0 && <button onClick={() => handleMoveUp(i)} className="p-2 text-gray-500 hover:text-white"><ArrowUp size={16}/></button>}
                                        <button onClick={() => handleRemove(i, false)} className="p-2 text-gray-500 hover:text-red-400"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                 </div>
                 
                 {/* Waitlist (保持不變) */}
                 {currentEvent.waitlist.length > 0 && (
                    <div className="bg-[#0a2e1f] rounded-xl border border-white/10 overflow-hidden">
                        <div className="bg-orange-900/30 px-4 py-2 border-b border-white/10"><span className="font-bold text-orange-400">候補</span></div>
                        {currentEvent.waitlist.map((name, i) => {
                            const details = currentEvent.participantDetails?.[name];
                            return (
                                <div key={i} className="flex justify-between items-center p-3 hover:bg-white/5 border-b border-white/5">
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-orange-600 w-6">{i+1}</span>
                                        <span>{name}</span>
                                        {details && <span className="text-[10px] text-gray-500">BP:{details.battlePower}</span>}
                                    </div>
                                    <div className="flex gap-1">
                                        {details && (
                                            <button 
                                                onClick={() => setEditingParticipant({ name, level: details.level, bp: details.battlePower })} 
                                                className="p-2 text-gray-500 hover:text-white"
                                            >
                                                <Pencil size={14}/>
                                            </button>
                                        )}
                                        <button onClick={() => handleRemove(i, true)} className="p-2 text-gray-500 hover:text-red-400"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                 )}
              </>
          )}

          {activeTab === 'preview' && (
              <div className="h-full flex flex-col">
                  <div className="bg-white/10 p-4 rounded-xl font-mono text-sm whitespace-pre-wrap flex-1 overflow-y-auto border border-white/10 mb-4 select-all">{generatePreviewText()}</div>
                  <button onClick={() => navigator.clipboard.writeText(generatePreviewText())} className="w-full py-4 bg-emerald-600 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2"><Copy size={18} /> 複製</button>
              </div>
          )}

          {activeTab === 'favorites' && (
              <div className="bg-[#0a2e1f] rounded-xl border border-white/10 overflow-hidden p-4 grid gap-2">
                 {favorites.map(fav => (
                     <div key={fav.name} className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
                         <div className="flex items-center gap-3">
                             <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${LEVEL_COLORS[fav.level] || LEVEL_COLORS[PlayerLevel.INTERMEDIATE]} text-white`}>{fav.name.slice(0,1)}</div>
                             <div>
                                 <div className="text-gray-200 font-bold">{fav.name}</div>
                                 <div className="text-[10px] text-gray-500">BP: {fav.battlePower}</div>
                             </div>
                         </div>
                         <div className="flex gap-1">
                             {/* 編輯常用 (使用 Modal) */}
                             <button onClick={() => setEditingFavorite(fav)} className="p-1.5 text-blue-400 hover:bg-white/10 rounded">
                                <Pencil size={14}/>
                             </button>
                             {/* 填入 (只填充 input, 不開啟編輯模式) */}
                             <button onClick={() => handleLoadFavorite(fav)} className="p-1.5 bg-emerald-600 rounded text-white text-xs flex items-center gap-1"><Plus size={12}/> 填入</button>
                             <button onClick={() => saveFavorites(favorites.filter(f => f.name !== fav.name))} className="p-1.5 bg-red-600/20 text-red-400 rounded hover:bg-red-600/50"><Trash2 size={14}/></button>
                         </div>
                     </div>
                 ))}
                 {favorites.length === 0 && <div className="text-center text-gray-500 py-10">暫無常用名單</div>}
              </div>
          )}
       </div>

       {/* 🔥 [專用] 編輯報名選手的 Modal */}
       {editingParticipant && (
           <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
               <div className="bg-[#062c1f] w-full max-w-sm rounded-2xl border border-emerald-500/50 p-6 shadow-2xl animate-fade-in-up">
                   <div className="flex justify-between items-center mb-6">
                       <h3 className="font-bold text-lg text-emerald-100">編輯報名資料</h3>
                       <button onClick={() => setEditingParticipant(null)}><X size={20}/></button>
                   </div>
                   <div className="space-y-4">
                        <div className="text-center text-2xl font-bold mb-4 text-emerald-300">{editingParticipant.name}</div>
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">等級</label>
                            <select 
                                value={editingParticipant.level}
                                onChange={(e) => setEditingParticipant({...editingParticipant, level: e.target.value as PlayerLevel})}
                                className="w-full bg-black/40 border border-white/20 rounded p-2 text-white"
                            >
                                {Object.values(PlayerLevel).map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">戰鬥力 (BP)</label>
                            <input 
                                type="number" 
                                value={editingParticipant.bp}
                                onChange={(e) => setEditingParticipant({...editingParticipant, bp: parseInt(e.target.value) || 0})}
                                className="w-full bg-black/40 border border-white/20 rounded p-2 text-white"
                            />
                        </div>
                        <button 
                            onClick={handleUpdateParticipantConfirm}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 py-3 rounded-xl font-bold mt-4 shadow-lg active:scale-95 transition-transform"
                        >
                            確認更新
                        </button>
                   </div>
               </div>
           </div>
       )}

       {/* 編輯常用名單的 Modal */}
       {editingFavorite && (
           <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
               <div className="bg-[#062c1f] w-full max-w-sm rounded-2xl border border-emerald-500/50 p-6 shadow-2xl animate-fade-in-up">
                   <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-lg text-emerald-100">編輯常用選手</h3><button onClick={() => setEditingFavorite(null)}><X size={20}/></button></div>
                   <div className="space-y-4">
                        <div className="text-center text-2xl font-bold mb-4">{editingFavorite.name}</div>
                        <div><label className="text-xs text-gray-400 block mb-1">等級</label><select value={editingFavorite.level} onChange={(e) => setEditingFavorite({...editingFavorite, level: e.target.value as PlayerLevel})} className="w-full bg-black/40 border border-white/20 rounded p-2 text-white">{Object.values(PlayerLevel).map(l => <option key={l} value={l}>{l}</option>)}</select></div>
                        <div><label className="text-xs text-gray-400 block mb-1">戰鬥力 (BP)</label><input type="number" value={editingFavorite.battlePower} onChange={(e) => setEditingFavorite({...editingFavorite, battlePower: parseInt(e.target.value) || 0})} className="w-full bg-black/40 border border-white/20 rounded p-2 text-white"/></div>
                        <button onClick={() => updateFavorite(editingFavorite, editingFavorite.name)} className="w-full bg-emerald-600 hover:bg-emerald-500 py-3 rounded-xl font-bold mt-4">儲存變更</button>
                   </div>
               </div>
           </div>
       )}
    </div>
  );
};

export default SignupSystem;