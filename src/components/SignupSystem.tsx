import React, { useState, useEffect, useRef } from 'react';
import { SignupEvent, PlayerLevel, ParticipantDetail, FavoritePlayer } from '../types';
import { LEVEL_COLORS, LEVEL_STYLES, DEFAULT_LOCATIONS } from '../constants';
import { db } from '../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { 
  Calendar, Clock, MapPin, Users, Copy, RefreshCw, ChevronLeft, ChevronRight, 
  Plus, Trash2, Star, ArrowUp, Download, Pencil, X, Settings
} from 'lucide-react';

interface Props {
  onImportToGame: (names: string[], details?: Record<string, ParticipantDetail>) => void;
}

const DEFAULT_EVENT: SignupEvent = {
  title: '《野豬騎士來囉!》',
  location: '裕興',
  startTime: '21:00',
  endTime: '23:00',
  courts: 3,
  venueFee: 3000,
  shuttlecockFee: 500,
  limit: 20,
  participants: [],
  waitlist: [],
  notes: '',
  participantDetails: {}
};

const SignupSystem: React.FC<Props> = ({ onImportToGame }) => {
  const [currentDate, setCurrentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [currentEvent, setCurrentEvent] = useState<SignupEvent>(DEFAULT_EVENT);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');
  const [activeTab, setActiveTab] = useState<'edit' | 'preview' | 'favorites'>('edit');
  
  const [newName, setNewName] = useState('');
  const [newLevel, setNewLevel] = useState<PlayerLevel>(PlayerLevel.INTERMEDIATE);
  const [newBattlePower, setNewBattlePower] = useState<string>('1500');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [customLocations, setCustomLocations] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<FavoritePlayer[]>([]);

  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    name: string;
    level: PlayerLevel;
    battlePower: number;
    isFavorite: boolean;
  }>({
    isOpen: false,
    name: '',
    level: PlayerLevel.INTERMEDIATE,
    battlePower: 1500,
    isFavorite: false
  });

  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadData();
    
    // Load local storage items
    const storedFavs = localStorage.getItem('favorites');
    if (storedFavs) {
        try { setFavorites(JSON.parse(storedFavs)); } catch(e) {}
    }
    const storedLocs = localStorage.getItem('customLocations');
    if (storedLocs) {
        try { setCustomLocations(JSON.parse(storedLocs)); } catch(e) {}
    }
  }, [currentDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, 'events', currentDate);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as SignupEvent;
        // Merge with defaults to ensure all fields exist
        setCurrentEvent({
            ...DEFAULT_EVENT,
            ...data,
            participants: data.participants || [],
            waitlist: data.waitlist || [],
            participantDetails: data.participantDetails || {}
        });
      } else {
        setCurrentEvent({ ...DEFAULT_EVENT });
      }
      setSyncStatus('synced');
    } catch (e) {
      console.error("Firebase Load Error:", e);
      setSyncStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const saveData = (eventToSave: SignupEvent) => {
    setCurrentEvent(eventToSave);
    setSyncStatus('syncing');
    
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await setDoc(doc(db, 'events', currentDate), eventToSave);
        setSyncStatus('synced');
      } catch (e) {
        console.error("Save Error", e);
        setSyncStatus('error');
      }
    }, 1000);
  };

  const updateEventField = (field: keyof SignupEvent, value: any) => {
    const updatedEvent = { ...currentEvent, [field]: value };
    if (field === 'limit') {
       rebalanceList(updatedEvent);
    }
    saveData(updatedEvent);
  };

  const rebalanceList = (evt: SignupEvent) => {
    const limit = typeof evt.limit === 'string' ? parseInt(evt.limit) : evt.limit;
    while (evt.participants.length > limit) {
      const p = evt.participants.pop();
      if (p) evt.waitlist.unshift(p);
    }
    while (evt.participants.length < limit && evt.waitlist.length > 0) {
      const p = evt.waitlist.shift();
      if (p) evt.participants.push(p);
    }
  };

  const handleDateShift = (days: number) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + days);
    setCurrentDate(d.toISOString().split('T')[0]);
  };

  const handleAddParticipant = (
    nameToAdd: string | null = null, 
    levelToAdd: PlayerLevel | null = null, 
    bpToAdd: number | null = null
  ) => {
    const name = nameToAdd || newName.trim();
    if (!name) return;

    const level = levelToAdd || newLevel;
    const bp = bpToAdd || parseInt(newBattlePower) || 1500;

    const evt = { ...currentEvent };
    const limit = typeof evt.limit === 'string' ? parseInt(evt.limit) : evt.limit;

    if (evt.participants.includes(name) || evt.waitlist.includes(name)) {
        alert(`${name} 已經在名單中囉！`);
        return;
    }

    const newDetails = { ...(evt.participantDetails || {}) };
    newDetails[name] = { level, battlePower: bp };
    evt.participantDetails = newDetails;

    if (evt.participants.length < limit) {
        evt.participants = [...evt.participants, name];
    } else {
        evt.waitlist = [...evt.waitlist, name];
    }
    
    saveData(evt);
    
    if (!nameToAdd) {
        setNewName('');
    }
  };

  const handleRemoveParticipant = (index: number, isWaitlist: boolean) => {
    const evt = { ...currentEvent };
    if (isWaitlist) {
        evt.waitlist = evt.waitlist.filter((_, i) => i !== index);
    } else {
        evt.participants = evt.participants.filter((_, i) => i !== index);
        rebalanceList(evt);
    }
    saveData(evt);
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const evt = { ...currentEvent };
    const temp = evt.participants[index];
    evt.participants[index] = evt.participants[index - 1];
    evt.participants[index - 1] = temp;
    saveData(evt);
  };

  const handleCopyLastWeek = async () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 7);
    const lastWeekDate = d.toISOString().split('T')[0];
    
    try {
        const docRef = doc(db, 'events', lastWeekDate);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            alert("上週無資料");
            return;
        }

        const source = docSnap.data() as SignupEvent;
        const evt = { 
            ...currentEvent,
            location: source.location || DEFAULT_EVENT.location,
            startTime: source.startTime || DEFAULT_EVENT.startTime,
            endTime: source.endTime || DEFAULT_EVENT.endTime,
            courts: source.courts || DEFAULT_EVENT.courts,
            venueFee: source.venueFee || DEFAULT_EVENT.venueFee,
            shuttlecockFee: source.shuttlecockFee || DEFAULT_EVENT.shuttlecockFee,
            limit: source.limit || DEFAULT_EVENT.limit,
            participants: [...(source.participants || [])],
            waitlist: [...(source.waitlist || [])],
            participantDetails: { ...(source.participantDetails || {}) }
        };
        rebalanceList(evt);
        saveData(evt);
        alert("已繼承上週資料！");
    } catch (e) {
        console.error("Copy Error", e);
        alert("繼承失敗");
    }
  };

  const handleClearAll = () => {
    if(!confirm("確定要清空名單嗎？")) return;
    const evt = { ...currentEvent, participants: [], waitlist: [] };
    saveData(evt);
  };

  const handleAddToFavorites = (name: string, level: PlayerLevel, bp: number) => {
      if (favorites.some(f => f.name === name)) {
          alert("已在常用名單中");
          return;
      }
      const newFavs = [...favorites, { name, level, battlePower: bp }];
      setFavorites(newFavs);
      localStorage.setItem('favorites', JSON.stringify(newFavs));
  };

  const handleRemoveFavorite = (name: string) => {
      const newFavs = favorites.filter(f => f.name !== name);
      setFavorites(newFavs);
      localStorage.setItem('favorites', JSON.stringify(newFavs));
  };

  const handleEditClick = (name: string, level: PlayerLevel, battlePower: number, isFavorite: boolean) => {
      setEditModal({
          isOpen: true,
          name,
          level,
          battlePower,
          isFavorite
      });
  };

  const handleSaveEdit = () => {
      const { name, level, battlePower, isFavorite } = editModal;

      if (isFavorite) {
          const newFavs = favorites.map(f => 
             f.name === name ? { ...f, level, battlePower } : f
          );
          setFavorites(newFavs);
          localStorage.setItem('favorites', JSON.stringify(newFavs));
      } else {
          const evt = { ...currentEvent };
          const newDetails = { ...(evt.participantDetails || {}) };
          newDetails[name] = { level, battlePower };
          evt.participantDetails = newDetails;
          saveData(evt);
      }
      setEditModal({ ...editModal, isOpen: false });
  };

  const handleAddLocation = () => {
      if (!newLocationName.trim()) return;
      if (DEFAULT_LOCATIONS.includes(newLocationName) || customLocations.includes(newLocationName)) {
          alert("地點已存在");
          return;
      }
      const updated = [...customLocations, newLocationName];
      setCustomLocations(updated);
      localStorage.setItem('customLocations', JSON.stringify(updated));
      setNewLocationName('');
  };

  const handleDeleteLocation = (e: React.MouseEvent, locToDelete: string) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Removed window.confirm to avoid blocking issues on some devices/views
      
      const updated = customLocations.filter(loc => loc !== locToDelete);
      setCustomLocations(updated);
      localStorage.setItem('customLocations', JSON.stringify(updated));
      
      if (currentEvent.location === locToDelete) {
          updateEventField('location', DEFAULT_LOCATIONS[0]);
      }
  };

  const copyToClipboard = () => {
    const text = generatePreviewText();
    navigator.clipboard.writeText(text).then(() => alert("已複製！"));
  };

  const generatePreviewText = () => {
    const evt = currentEvent;
    const totalFee = (parseInt(evt.venueFee as any) || 0) + (parseInt(evt.shuttlecockFee as any) || 0);
    const count = evt.participants.length;
    const perPerson = count > 0 ? Math.round(totalFee / count) : 0;
    const isFull = count >= evt.limit;

    let text = `${evt.title}\n`;
    text += `${currentDate} (${new Date(currentDate).toLocaleDateString('zh-TW', {weekday: 'short'})})\n`;
    text += `📌地點：${evt.location}\n`;
    text += `⏰時間：${evt.startTime}～${evt.endTime}\n`;
    text += `🏸場地：${evt.courts}場\n`;
    text += `💰費用：每人 $${perPerson}\n`;
    if (evt.notes) text += `📝備註：${evt.notes}\n`;
    text += '\n';
    text += evt.participants.map((p, i) => `${i + 1}. ${p}`).join('\n');
    
    if (isFull) text += '\n滿------------------------------\n';
    
    if (evt.waitlist.length > 0) {
        text += '\n【候補名單】\n';
        text += evt.waitlist.map((p, i) => `${i + 1}. ${p}`).join('\n');
    }

    return text;
  };

  const totalFee = (parseInt(currentEvent.venueFee as any) || 0) + (parseInt(currentEvent.shuttlecockFee as any) || 0);
  const perPerson = currentEvent.participants.length > 0 ? Math.round(totalFee / currentEvent.participants.length) : 0;
  
  const filteredParticipants = currentEvent.participants
    .map((name, index) => ({ name, index }))
    .filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const getStats = (name: string) => {
      return currentEvent.participantDetails?.[name] || { level: PlayerLevel.INTERMEDIATE, battlePower: 1500 };
  };

  const isFavorite = (name: string) => favorites.some(f => f.name === name);

  return (
    <div className="flex flex-col h-full bg-[#031811] text-white relative">
      {/* Header Bar */}
      <div className="bg-[#062c1f] p-4 border-b border-white/10 flex justify-between items-center sticky top-0 z-20">
         <div className="flex items-center gap-4">
             <button onClick={() => handleDateShift(-1)} className="p-1 hover:bg-white/10 rounded"><ChevronLeft /></button>
             <div className="text-center relative group cursor-pointer">
                 <div className="font-bold text-lg text-emerald-400 flex items-center gap-2">
                    <Calendar size={18} />
                    {currentDate}
                 </div>
                 <input 
                   type="date" 
                   value={currentDate} 
                   onChange={(e) => setCurrentDate(e.target.value)} 
                   className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                 />
             </div>
             <button onClick={() => handleDateShift(1)} className="p-1 hover:bg-white/10 rounded"><ChevronRight /></button>
         </div>
         <div className="flex items-center gap-2">
            {loading && <RefreshCw className="animate-spin text-gray-400" size={16} />}
            {syncStatus === 'syncing' && <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>}
            {syncStatus === 'synced' && <div className="w-2 h-2 rounded-full bg-emerald-500"></div>}
            {syncStatus === 'error' && <div className="w-2 h-2 rounded-full bg-red-500" title="連線錯誤"></div>}
         </div>
      </div>

      {/* Tabs */}
      <div className="flex p-2 gap-2 bg-[#062c1f]">
        <button onClick={() => setActiveTab('edit')} className={`flex-1 py-2 rounded text-sm font-bold ${activeTab === 'edit' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:bg-white/5'}`}>編輯</button>
        <button onClick={() => setActiveTab('preview')} className={`flex-1 py-2 rounded text-sm font-bold ${activeTab === 'preview' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:bg-white/5'}`}>預覽</button>
        <button onClick={() => setActiveTab('favorites')} className={`flex-1 py-2 rounded text-sm font-bold ${activeTab === 'favorites' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:bg-white/5'}`}>常用</button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
        
        {activeTab === 'edit' && (
            <>
              <div className="bg-[#0a2e1f] p-4 rounded-xl border border-white/10 space-y-4">
                 <input 
                   value={currentEvent.title} 
                   onChange={(e) => updateEventField('title', e.target.value)}
                   className="w-full bg-transparent text-xl font-bold text-center border-b border-white/10 focus:border-emerald-500 outline-none pb-1"
                 />
                 
                 <div className="grid grid-cols-2 gap-4">
                     <div className="relative">
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-xs text-gray-400 flex items-center gap-1"><MapPin size={12}/> 地點</label>
                            <button onClick={() => setLocationModalOpen(true)} className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5">
                                <Settings size={10}/> 管理
                            </button>
                        </div>
                        <select 
                          value={currentEvent.location} 
                          onChange={(e) => updateEventField('location', e.target.value)}
                          className="w-full bg-[#031811] border border-white/20 rounded p-2 text-sm"
                        >
                            <optgroup label="預設地點">
                                {DEFAULT_LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                            </optgroup>
                            {customLocations.length > 0 && (
                                <optgroup label="自訂地點">
                                    {customLocations.map(l => <option key={l} value={l}>{l}</option>)}
                                </optgroup>
                            )}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 flex items-center gap-1 mb-1"><Users size={12}/> 上限</label>
                        <select 
                          value={currentEvent.limit} 
                          onChange={(e) => updateEventField('limit', parseInt(e.target.value))}
                          className="w-full bg-[#031811] border border-white/20 rounded p-2 text-sm"
                        >
                            {[8,10,12,14,16,18,20,22,24,26,28,30,32,40,50].map(n => <option key={n} value={n}>{n} 人</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 flex items-center gap-1 mb-1"><Clock size={12}/> 開始</label>
                        <input type="time" value={currentEvent.startTime} onChange={(e) => updateEventField('startTime', e.target.value)} className="w-full bg-[#031811] border border-white/20 rounded p-2 text-sm"/>
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 flex items-center gap-1 mb-1"><Clock size={12}/> 結束</label>
                        <input type="time" value={currentEvent.endTime} onChange={(e) => updateEventField('endTime', e.target.value)} className="w-full bg-[#031811] border border-white/20 rounded p-2 text-sm"/>
                    </div>
                 </div>

                 <div className="bg-black/20 p-3 rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-400">場地費</span>
                        <input type="number" value={currentEvent.venueFee} onChange={(e) => updateEventField('venueFee', parseInt(e.target.value))} className="w-20 bg-transparent text-right border-b border-white/20 focus:border-emerald-500 outline-none"/>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-400">球費</span>
                        <input type="number" value={currentEvent.shuttlecockFee} onChange={(e) => updateEventField('shuttlecockFee', parseInt(e.target.value))} className="w-20 bg-transparent text-right border-b border-white/20 focus:border-emerald-500 outline-none"/>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-white/10">
                        <span className="text-yellow-500 font-bold text-sm">每人分攤</span>
                        <span className="text-xl font-bold text-emerald-400">${perPerson}</span>
                    </div>
                 </div>

                 <textarea 
                   placeholder="備註..." 
                   value={currentEvent.notes}
                   onChange={(e) => updateEventField('notes', e.target.value)}
                   className="w-full bg-[#031811] border border-white/20 rounded p-2 text-sm h-20 resize-none"
                 />
                 
                 <div className="flex gap-2">
                    <button onClick={handleCopyLastWeek} className="flex-1 bg-blue-600/30 text-blue-300 text-xs py-2 rounded hover:bg-blue-600/50">繼承上週設定</button>
                    <button onClick={handleClearAll} className="flex-1 bg-red-600/30 text-red-300 text-xs py-2 rounded hover:bg-red-600/50">清空名單</button>
                 </div>
              </div>

              <div className="flex flex-col gap-2 bg-[#0a2e1f] p-3 rounded-xl border border-white/10">
                 <div className="flex gap-2">
                    <select 
                      value={newLevel}
                      onChange={(e) => setNewLevel(e.target.value as PlayerLevel)}
                      className="bg-[#031811] text-xs text-gray-300 rounded border border-white/20 p-1 w-20"
                    >
                      {Object.values(PlayerLevel).map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                    <input 
                       className="bg-[#031811] border border-white/20 rounded w-20 text-sm text-white px-2"
                       placeholder="BP"
                       type="number"
                       value={newBattlePower}
                       onChange={(e) => setNewBattlePower(e.target.value)}
                    />
                 </div>
                 <div className="flex gap-2">
                     <input 
                       value={newName}
                       onChange={(e) => setNewName(e.target.value)}
                       onKeyDown={(e) => e.key === 'Enter' && handleAddParticipant()}
                       placeholder="輸入名字快速新增..."
                       className="flex-1 bg-[#031811] border border-white/20 rounded-lg px-4 py-2 focus:outline-none focus:border-emerald-500"
                     />
                     <button onClick={() => handleAddParticipant()} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold"><Plus /></button>
                 </div>
              </div>

              {currentEvent.participants.length > 0 && (
                <button 
                  onClick={() => onImportToGame(currentEvent.participants, currentEvent.participantDetails)}
                  className="w-full py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 transition-all rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 active:scale-95"
                >
                    <Download size={18} />
                    匯入到排點系統
                </button>
              )}

              <div className="bg-[#0a2e1f] rounded-xl border border-white/10 overflow-hidden">
                 <div className="bg-emerald-900/30 px-4 py-2 flex justify-between items-center border-b border-white/10">
                    <span className="font-bold text-emerald-400">報名名單 ({currentEvent.participants.length}/{currentEvent.limit})</span>
                    {currentEvent.participants.length >= currentEvent.limit && <span className="text-red-400 text-xs font-bold px-2 py-0.5 bg-red-900/30 rounded">已額滿</span>}
                 </div>
                 
                 <div className="divide-y divide-white/5">
                    {currentEvent.participants.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">暫無人報名</div>
                    ) : (
                        filteredParticipants.map(({ name, index }) => {
                            const stats = getStats(name);
                            const style = LEVEL_STYLES[stats.level];
                            return (
                                <div key={index} className="flex justify-between items-center p-3 hover:bg-white/5">
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-emerald-600 w-6">{index + 1}</span>
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <span className="text-gray-200">{name}</span>
                                                {isFavorite(name) && <Star size={12} className="text-yellow-400 fill-yellow-400" />}
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                                <span className={`px-1 rounded bg-black/30 ${style.color}`}>{style.name}</span>
                                                <span className="font-mono">BP:{stats.battlePower}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button 
                                          onClick={() => handleEditClick(name, stats.level, stats.battlePower, false)}
                                          className="p-2 text-yellow-500/70 hover:text-yellow-400"
                                        >
                                           <Pencil size={16} />
                                        </button>
                                        
                                        <button 
                                            onClick={() => handleAddToFavorites(name, stats.level, stats.battlePower)} 
                                            className={`p-2 ${isFavorite(name) ? 'text-yellow-400 pointer-events-none' : 'text-gray-600 hover:text-yellow-400'}`}
                                        >
                                            <Star size={16} className={isFavorite(name) ? 'fill-yellow-400' : ''} />
                                        </button>
                                        {index > 0 && <button onClick={() => handleMoveUp(index)} className="p-2 text-gray-500 hover:text-white"><ArrowUp size={16} /></button>}
                                        <button onClick={() => handleRemoveParticipant(index, false)} className="p-2 text-gray-500 hover:text-red-400"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                 </div>
              </div>

              {currentEvent.waitlist.length > 0 && (
                  <div className="bg-[#0a2e1f] rounded-xl border border-white/10 overflow-hidden mt-4">
                    <div className="bg-orange-900/30 px-4 py-2 border-b border-white/10">
                        <span className="font-bold text-orange-400">候補名單 ({currentEvent.waitlist.length})</span>
                    </div>
                    <div className="divide-y divide-white/5">
                        {currentEvent.waitlist.map((name, index) => (
                            <div key={index} className="flex justify-between items-center p-3 hover:bg-white/5">
                                <div className="flex items-center gap-3">
                                    <span className="font-mono text-orange-600 w-6">{index + 1}</span>
                                    <span className="text-gray-200">{name}</span>
                                </div>
                                <button onClick={() => handleRemoveParticipant(index, true)} className="p-2 text-gray-500 hover:text-red-400"><Trash2 size={16} /></button>
                            </div>
                        ))}
                    </div>
                  </div>
              )}
            </>
        )}

        {activeTab === 'preview' && (
            <div className="h-full flex flex-col">
                <div className="bg-white/10 p-4 rounded-xl font-mono text-sm whitespace-pre-wrap flex-1 overflow-y-auto border border-white/10 mb-4 select-all">
                    {generatePreviewText()}
                </div>
                <button onClick={copyToClipboard} className="w-full py-4 bg-emerald-600 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2">
                    <Copy size={18} /> 複製文字
                </button>
            </div>
        )}

        {activeTab === 'favorites' && (
             <div className="bg-[#0a2e1f] rounded-xl border border-white/10 overflow-hidden">
                <div className="p-4 grid grid-cols-1 gap-2">
                    {favorites.map(fav => {
                         const style = LEVEL_STYLES[fav.level];
                         return (
                            <div key={fav.name} className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${LEVEL_COLORS[fav.level] || 'bg-gray-500'} text-white`}>
                                        {fav.name.slice(0, 1)}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-gray-200 font-bold">{fav.name}</span>
                                        <div className="flex gap-2 text-[10px] text-gray-500">
                                            <span className={`${style.color}`}>{style.name}</span>
                                            <span>BP:{fav.battlePower}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button 
                                      onClick={() => handleEditClick(fav.name, fav.level, fav.battlePower, true)}
                                      className="p-1.5 text-yellow-500/70 hover:text-yellow-400"
                                    >
                                       <Pencil size={16} />
                                    </button>

                                    <button 
                                        onClick={() => handleAddParticipant(fav.name, fav.level, fav.battlePower)} 
                                        className="p-1.5 bg-emerald-600/80 rounded text-white hover:bg-emerald-500 flex items-center gap-1 text-xs"
                                    >
                                        <Plus size={12}/> 加入
                                    </button>
                                    <button onClick={() => handleRemoveFavorite(fav.name)} className="p-1.5 bg-red-600/20 text-red-400 rounded hover:bg-red-600/50"><Trash2 size={14}/></button>
                                </div>
                            </div>
                         );
                    })}
                    {favorites.length === 0 && <div className="text-center text-gray-500 py-8">暫無常用名單</div>}
                </div>
             </div>
        )}

      </div>

      {editModal.isOpen && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
             <div className="bg-[#062c1f] w-full max-w-sm rounded-2xl border border-emerald-500/30 p-5 shadow-2xl">
                 <div className="flex justify-between items-center mb-4">
                     <h3 className="font-bold text-white text-lg">編輯 {editModal.name}</h3>
                     <button onClick={() => setEditModal({...editModal, isOpen: false})} className="text-gray-400 hover:text-white"><X size={20}/></button>
                 </div>
                 
                 <div className="space-y-4">
                     <div>
                        <label className="text-xs text-gray-400 mb-1 block">程度</label>
                        <select 
                            value={editModal.level}
                            onChange={(e) => setEditModal({...editModal, level: e.target.value as PlayerLevel})}
                            className="w-full bg-[#031811] border border-white/20 rounded p-2 text-white outline-none focus:border-emerald-500"
                        >
                            {Object.values(PlayerLevel).map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                     </div>
                     <div>
                        <label className="text-xs text-gray-400 mb-1 block">戰鬥力 (BP)</label>
                        <input 
                            type="number"
                            value={editModal.battlePower}
                            onChange={(e) => setEditModal({...editModal, battlePower: parseInt(e.target.value)})}
                            className="w-full bg-[#031811] border border-white/20 rounded p-2 text-white outline-none focus:border-emerald-500"
                        />
                     </div>
                     
                     <div className="pt-2 flex gap-2">
                        <button onClick={() => setEditModal({...editModal, isOpen: false})} className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded text-sm text-white">取消</button>
                        <button onClick={handleSaveEdit} className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-2 rounded text-sm text-white font-bold">儲存變更</button>
                     </div>
                 </div>
             </div>
         </div>
      )}

      {locationModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
             <div className="bg-[#062c1f] w-full max-w-sm rounded-2xl border border-emerald-500/30 p-5 shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                     <h3 className="font-bold text-white text-lg">地點管理</h3>
                     <button onClick={() => setLocationModalOpen(false)} className="text-gray-400 hover:text-white"><X size={20}/></button>
                 </div>

                 <div className="space-y-4">
                    <div className="flex gap-2">
                        <input 
                          value={newLocationName} 
                          onChange={(e) => setNewLocationName(e.target.value)}
                          placeholder="新地點名稱"
                          className="flex-1 bg-[#031811] border border-white/20 rounded px-3 py-2 outline-none focus:border-emerald-500"
                        />
                        <button onClick={handleAddLocation} className="bg-emerald-600 text-white px-3 py-2 rounded font-bold"><Plus size={18}/></button>
                    </div>

                    <div className="max-h-[200px] overflow-y-auto custom-scrollbar border border-white/10 rounded-lg">
                        {customLocations.length === 0 ? (
                            <div className="p-4 text-center text-gray-500 text-sm">暫無自訂地點</div>
                        ) : (
                            customLocations.map(loc => (
                                <div key={loc} className="flex justify-between items-center p-3 hover:bg-white/5 border-b border-white/5 last:border-0">
                                    <span>{loc}</span>
                                    <button 
                                      onClick={(e) => handleDeleteLocation(e, loc)}
                                      className="p-2 text-gray-500 hover:text-red-400 hover:bg-white/10 rounded transition-colors"
                                      title="刪除地點"
                                    >
                                        <Trash2 size={16}/>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                 </div>
             </div>
          </div>
      )}

    </div>
  );
};

export default SignupSystem;