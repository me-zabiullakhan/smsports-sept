import React, { useState, useMemo, useEffect } from 'react';
import { useAuction } from '../hooks/useAuction';
import { useTheme } from '../contexts/ThemeContext';
import { Player } from '../types';
import { Search, Filter, X, Clock, CheckCircle, Users, Ban } from 'lucide-react';
import { db } from '../firebase';
import { getEffectiveBasePrice } from '../utils';

type PlayerStatus = 'upcoming' | 'sold' | 'unsold' | 'teams';

const PlayerPool: React.FC = () => {
  const { state, activeAuctionId } = useAuction();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { players, teams, currentPlayerIndex, unsoldPlayers } = state;
  const [activeTab, setActiveTab] = useState<PlayerStatus>('upcoming');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('All');
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  // Fetch Roles and Categories dynamically to populate filter
  useEffect(() => {
      if(!activeAuctionId) return;
      const unsubRoles = db.collection('auctions').doc(activeAuctionId).collection('roles').onSnapshot(s => {
          setAvailableRoles(s.docs.map(d => d.data().name));
      });
      const unsubCats = db.collection('auctions').doc(activeAuctionId).collection('categories').onSnapshot(s => {
          setAvailableCategories(s.docs.map(d => d.data().name));
      });
      return () => {
          unsubRoles();
          unsubCats();
      };
  }, [activeAuctionId]);

  const soldPlayerIds = useMemo(() => new Set(teams.flatMap(team => team.players.map(p => p.id))), [teams]);
  const currentPlayer = currentPlayerIndex !== null ? unsoldPlayers[currentPlayerIndex] : null;

  const filteredPlayers = useMemo(() => {
    let list: (Omit<Player, 'status'> & { status: PlayerStatus, soldTo?: string, teamLogo?: string })[] = [];

    if (activeTab === 'upcoming') {
        list = unsoldPlayers.filter(p => !soldPlayerIds.has(p.id)).map(p => ({ ...p, status: 'upcoming' as PlayerStatus }));
    } else if (activeTab === 'sold') {
        teams.forEach(team => {
            team.players.forEach(player => {
                list.push({ ...player, status: 'sold' as PlayerStatus, soldTo: team.name, teamLogo: team.logoUrl });
            });
        });
    } else if (activeTab === 'unsold') {
        list = players.filter(p => p.status === 'UNSOLD').map(p => ({ ...p, status: 'unsold' as PlayerStatus }));
    }

    if (selectedRole !== 'All' && activeTab !== 'teams') {
        list = list.filter(p => p.role === selectedRole || p.category === selectedRole);
    }

    if (searchTerm && activeTab !== 'teams') {
        const term = searchTerm.toLowerCase();
        list = list.filter(p => 
            p.name.toLowerCase().includes(term) || 
            (p as any).playerNumber?.toString().includes(term)
        );
    }
    
    return list;
  }, [activeTab, players, teams, soldPlayerIds, unsoldPlayers, searchTerm, selectedRole]);

  const TabButton: React.FC<{tab: PlayerStatus, label: string, icon: React.ReactNode}> = ({tab, label, icon}) => (
      <button 
        onClick={() => setActiveTab(tab)}
        className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-300 border-b-2 ${activeTab === tab ? (isDark ? 'border-accent text-accent bg-accent/5' : 'border-blue-600 text-blue-600 bg-blue-50') : (isDark ? 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50' : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50')}`}
      >
          {icon} <span className="hidden md:inline">{label}</span><span className="md:hidden">{label.slice(0,4)}</span>
      </button>
  );

  const rolesToDisplay = useMemo(() => {
      const combined = Array.from(new Set([...availableRoles, ...availableCategories]));
      return ['All', ...combined];
  }, [availableRoles, availableCategories]);

  return (
    <div className={`rounded-[2.5rem] shadow-2xl h-full flex flex-col border-4 transition-all duration-500 overflow-hidden ${isDark ? 'bg-secondary border-accent/20 shadow-accent/5' : 'bg-white border-blue-500/20 shadow-blue-600/10'}`}>
      <div className={`p-6 border-b transition-colors ${isDark ? 'bg-zinc-900/30 border-accent/10' : 'bg-gray-50/50 border-blue-500/10'}`}>
        <h2 className={`text-[10px] font-black uppercase tracking-[0.3em] mb-4 flex items-center gap-3 ${isDark ? 'text-accent' : 'text-blue-600'}`}>
            <span className={`w-1 h-4 rounded-full ${isDark ? 'bg-accent' : 'bg-blue-600'}`}></span>
            {activeTab === 'teams' ? 'Team Purses' : 'Player Pool'}
        </h2>
        
        {activeTab !== 'teams' && (
            <div className="space-y-4">
                <div className="relative group">
                    <Search className={`absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${isDark ? 'text-zinc-600 group-focus-within:text-accent' : 'text-gray-400 group-focus-within:text-blue-600'}`} />
                    <input 
                        type="text" 
                        placeholder="Search by name..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        className={`w-full border rounded-2xl py-3 pl-12 pr-12 text-xs font-black uppercase tracking-widest outline-none transition-all ${isDark ? 'bg-black border-accent/10 text-white focus:border-accent/50' : 'bg-white border-blue-500/10 text-gray-900 focus:border-blue-500/50'}`} 
                    />
                    {searchTerm && <button onClick={() => setSearchTerm('')} className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors ${isDark ? 'text-zinc-600 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`}><X className="h-4 w-4" /></button>}
                </div>

                {/* Role Filter */}
                <div className="flex flex-col gap-2">
                    <div className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-widest px-1 ${isDark ? 'text-zinc-600' : 'text-gray-400'}`}>
                        <Filter className="w-3 h-3"/> Filter By Role
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar">
                        {rolesToDisplay.map((role) => (
                            <button
                                key={role}
                                onClick={() => setSelectedRole(role)}
                                className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${selectedRole === role ? (isDark ? 'bg-accent border-accent text-zinc-950 shadow-lg shadow-accent/20' : 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20') : (isDark ? 'bg-black border-accent/10 text-zinc-500 hover:border-accent/30 hover:text-accent' : 'bg-white border-blue-500/10 text-gray-400 hover:border-blue-500/30 hover:text-blue-600')}`}
                            >
                                {role}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        )}
      </div>

      <div className={`flex border-b transition-colors ${isDark ? 'border-accent/10 bg-black/20' : 'border-blue-500/10 bg-gray-50/50'}`}>
        <TabButton tab="upcoming" label="Upcoming" icon={<Clock className="w-4 h-4"/>} />
        <TabButton tab="sold" label="Sold" icon={<CheckCircle className="w-4 h-4"/>} />
        <TabButton tab="unsold" label="Unsold" icon={<Ban className="w-4 h-4"/>} />
        <TabButton tab="teams" label="Teams" icon={<Users className="w-4 h-4"/>} />
      </div>

      <div className="flex-grow overflow-y-auto p-4 custom-scrollbar">
        {activeTab === 'teams' ? (
            <div className="space-y-3">
                {[...teams].sort((a,b) => b.budget - a.budget).map(team => (
                    <div key={team.id} className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${isDark ? 'bg-zinc-900/40 border-accent/10 hover:bg-zinc-800/60' : 'bg-gray-50 border-blue-500/10 hover:bg-white hover:shadow-md'}`}>
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl border-2 p-1.5 shadow-xl flex items-center justify-center overflow-hidden ${isDark ? 'bg-black border-accent/50' : 'bg-white border-blue-500/50'}`}>
                                {team.logoUrl ? <img src={team.logoUrl} className="max-w-full max-h-full object-contain" alt=""/> : <span className={`font-black ${isDark ? 'text-accent' : 'text-blue-600'}`}>{team.name.charAt(0)}</span>}
                            </div>
                            <div>
                                <h4 className={`text-xs font-black uppercase tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>{team.name}</h4>
                                <p className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>{team.players.length} Players</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className={`block font-black text-sm ${isDark ? 'text-accent' : 'text-blue-600'}`}>₹{team.budget}</span>
                            <span className={`text-[8px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-600' : 'text-gray-400'}`}>REMAINING</span>
                        </div>
                    </div>
                ))}
            </div>
        ) : filteredPlayers.length > 0 ? (
            <div className="space-y-3">
                {filteredPlayers.map(player => (
                    <div key={player.id} className={`p-4 rounded-2xl flex items-center gap-4 transition-all border-2 ${player.id === currentPlayer?.id && activeTab === 'upcoming' ? (isDark ? 'bg-accent/10 border-accent shadow-lg shadow-accent/10' : 'bg-blue-50 border-blue-600 shadow-lg shadow-blue-600/10') : (isDark ? 'bg-zinc-900/40 border-transparent hover:border-accent/20 hover:bg-zinc-800/60' : 'bg-gray-50 border-transparent hover:border-blue-500/20 hover:bg-white hover:shadow-md')}`}>
                        <div className="relative">
                            {player.photoUrl ? (
                                <img src={player.photoUrl} alt={player.name} className={`w-12 h-12 rounded-xl object-cover border-2 ${isDark ? 'border-accent/20' : 'border-blue-500/20'}`}/>
                            ) : (
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 ${isDark ? 'bg-zinc-800 border-accent/20' : 'bg-gray-100 border-blue-500/20'}`}>
                                    <Users className={`w-6 h-6 ${isDark ? 'text-zinc-600' : 'text-gray-400'}`} />
                                </div>
                            )}
                            {player.id === currentPlayer?.id && activeTab === 'upcoming' && (
                                <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse ${isDark ? 'bg-accent' : 'bg-blue-600'}`}></div>
                            )}
                        </div>
                        <div className="flex-grow min-w-0">
                            <h4 className={`text-xs font-black uppercase tracking-tight truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{player.name}</h4>
                            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest">
                                <span className={isDark ? 'text-accent' : 'text-blue-600'}>{player.role}</span>
                                <span className={isDark ? 'text-zinc-800' : 'text-gray-200'}>|</span>
                                <span className={isDark ? 'text-zinc-500' : 'text-gray-400'}>{player.category}</span>
                            </div>
                        </div>
                        <div className="text-right">
                            {player.status === 'upcoming' ? (
                                <span className={`inline-block px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest border ${isDark ? 'bg-black border-accent/20 text-accent' : 'bg-white border-blue-500/20 text-blue-600'}`}>₹{getEffectiveBasePrice(player as any, state.categories)}</span>
                            ) : player.status === 'unsold' ? (
                                <span className={`inline-block px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${isDark ? 'bg-red-900/20 border-red-500/30 text-red-400' : 'bg-red-50 border-red-200 text-red-600'}`}>UNSOLD</span>
                            ) : (
                                <div className="flex flex-col items-end">
                                    <span className={`text-[8px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-600' : 'text-gray-400'}`}>Sold To</span>
                                    <div className="flex items-center gap-2 mt-1">
                                        {player.teamLogo ? (
                                            <img src={player.teamLogo} alt="" className={`w-5 h-5 rounded-lg border p-0.5 ${isDark ? 'bg-black border-accent/20' : 'bg-white border-blue-500/20'}`} />
                                        ) : null}
                                        <span className={`text-[10px] font-black uppercase tracking-tight truncate max-w-[80px] ${isDark ? 'text-accent' : 'text-blue-600'}`}>{player.soldTo}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-4 ${isDark ? 'bg-zinc-900 text-zinc-700' : 'bg-gray-50 text-gray-300'}`}>
                    <Search className="w-8 h-8" />
                </div>
                <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-zinc-600' : 'text-gray-400'}`}>No warriors found in this sector</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default PlayerPool;
