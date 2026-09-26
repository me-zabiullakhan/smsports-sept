
import React, { useState } from 'react';
import { useAuction } from '../hooks/useAuction';
import { useTheme } from '../contexts/ThemeContext';
import { Gavel, Wallet, Shirt, Users, Info } from 'lucide-react';
import { calculateMaxBid } from '../utils';

const MyTeamPanel: React.FC = () => {
  const { state, placeBid, userProfile, nextBid } = useAuction();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { teams, highestBidder, currentPlayerId, players } = state;
  const [activeTab, setActiveTab] = useState<'MY_SQUAD' | 'ALL_TEAMS'>('MY_SQUAD');

  // Find the specific team belonging to this logged-in user
  const userTeam = teams.find(t => String(t.id) === String(userProfile?.teamId));
  
  const currentPlayer = currentPlayerId ? players.find(p => String(p.id) === String(currentPlayerId)) : null;
  const { maxBidAllowed } = React.useMemo(() => {
    if (!userTeam) return { maxBidAllowed: 0 };
    const result = calculateMaxBid(userTeam, state, currentPlayer);
    return { maxBidAllowed: result.maxBid };
  }, [userTeam, state, currentPlayer]);

  const teamPlayers = React.useMemo(() => {
    if (!userTeam) return [];
    const merged = [...(userTeam.players || [])];
    const soldToMe = (players || []).filter(p => p.status === 'SOLD' && (String(p.soldTo).toLowerCase() === userTeam.name.toLowerCase() || String((p as any).soldToId) === String(userTeam.id)));
    soldToMe.forEach(sp => {
      if (!merged.some(mp => String(mp.id) === String(sp.id))) {
        merged.push({
          id: sp.id,
          name: sp.name,
          role: sp.role || '',
          category: sp.category || '',
          soldPrice: sp.soldPrice || 0,
          soldTo: sp.soldTo || userTeam.name,
          status: 'SOLD',
          isTraded: (sp as any).isTraded || false
        } as any);
      }
    });
    return merged;
  }, [userTeam, players]);

  if (!userTeam) return (
      <div className={`rounded-[2rem] p-8 text-center border-2 border-dashed ${isDark ? 'bg-secondary/50 border-zinc-800 text-zinc-500' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
          <p className="text-xs font-black uppercase tracking-widest">Team data not found.</p>
      </div>
  );

  const canAfford = userTeam.budget >= nextBid && (state.unlimitedPurse || maxBidAllowed >= nextBid);
  const isLeading = highestBidder && String(highestBidder.id) === String(userTeam.id);

  const handleBid = async () => {
    if (canAfford) {
        try {
             await placeBid(userTeam.id, nextBid);
        } catch (e) {
             console.error(e);
        }
    }
  };

  const sortedTeams = [...teams].sort((a,b) => b.budget - a.budget);

  return (
    <div className={`rounded-[2.5rem] shadow-2xl p-6 flex flex-col h-full border-4 transition-all duration-500 ${isDark ? 'bg-secondary border-accent/20 shadow-accent/5' : 'bg-white border-blue-500/20 shadow-blue-600/10'}`}>
      <div className={`flex items-center mb-6 border-b pb-4 ${isDark ? 'border-accent/20' : 'border-blue-500/20'}`}>
        {userTeam.logoUrl ? (
            <div className={`w-14 h-14 rounded-2xl border-2 p-1.5 shadow-xl flex items-center justify-center overflow-hidden mr-4 ${isDark ? 'bg-black border-accent/50' : 'bg-white border-blue-500/50'}`}>
                <img src={userTeam.logoUrl} alt={userTeam.name} className="max-w-full max-h-full object-contain" />
            </div>
        ) : (
            <div className={`w-14 h-14 rounded-2xl mr-4 flex items-center justify-center font-black text-xl shadow-xl ${isDark ? 'bg-accent text-zinc-950' : 'bg-blue-600 text-white'}`}>
                {userTeam.name.charAt(0)}
            </div>
        )}
        <div className="flex-1">
            <h3 className={`text-xl font-black uppercase tracking-tighter italic ${isDark ? 'text-white' : 'text-gray-900'}`}>{userTeam.name}</h3>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                <p className="flex items-center">
                    <Wallet className={`w-3.5 h-3.5 mr-2 ${isDark ? 'text-accent' : 'text-blue-500'}`} /> 
                    <span className={`text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>₹{userTeam.budget}</span>
                    <span className={`text-[9px] font-black uppercase tracking-widest ml-2 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Left</span>
                </p>
                {currentPlayer && !state.unlimitedPurse && (
                    <p className="flex items-center">
                        <Info className={`w-3.5 h-3.5 mr-2 ${isDark ? 'text-accent/60' : 'text-blue-400'}`} />
                        <span className={`text-lg font-black tracking-tight ${isDark ? 'text-accent' : 'text-blue-600'}`}>₹{Math.max(0, Math.floor(maxBidAllowed))}</span>
                        <span className={`text-[9px] font-black uppercase tracking-widest ml-2 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Bid Limit</span>
                    </p>
                )}
            </div>
        </div>
      </div>
      
      <div className="mb-6">
        <button
          onClick={handleBid}
          disabled={!canAfford || isLeading}
          className={`w-full flex items-center justify-center font-black py-4 px-6 rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shadow-xl uppercase tracking-widest text-xs ${
            isLeading 
            ? (isDark ? 'bg-green-500 text-black shadow-green-500/20' : 'bg-green-600 text-white shadow-green-600/20')
            : (isDark ? 'bg-accent text-zinc-950 hover:bg-white shadow-accent/20' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/20')
          }`}
        >
          <Gavel className="mr-2 h-5 w-5"/> {isLeading ? 'Leading' : `Bid ₹${nextBid}`}
        </button>
        {!canAfford && <p className="text-red-500 text-[9px] mt-2 text-center font-black uppercase tracking-widest">Insufficient budget.</p>}
        {isLeading && <p className="text-green-500 text-[9px] mt-2 text-center font-black uppercase tracking-widest animate-pulse">You are the highest bidder!</p>}
      </div>

      {state.autoReserveFunds && !state.unlimitedPurse && state.categories && state.categories.length > 0 && (
        <div className={`mb-6 p-4 rounded-2xl border transition-all ${isDark ? 'bg-black/20 border-accent/15' : 'bg-gray-50 border-gray-100'}`}>
          <div className="flex items-center justify-between mb-3 border-b pb-1.5 border-white/5">
            <h4 className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-accent' : 'text-blue-600'}`}>Max Bid By Category</h4>
            <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase ${isDark ? 'bg-accent/10 text-accent' : 'bg-blue-100 text-blue-700'}`}>RESERVE ACTIVE</span>
          </div>
          <div className="space-y-1.5">
            {state.categories.map((cat, idx) => {
              const dummyPlayer = {
                id: 'dummy_' + cat.name,
                name: 'Dummy',
                category: cat.name,
                basePrice: cat.basePrice,
                status: 'UNSOLD',
              };
              const result = calculateMaxBid(userTeam, state, dummyPlayer as any);
              return (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${result.allowBid ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    <span className={`font-black uppercase text-[9px] ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>{cat.name} (₹{cat.basePrice})</span>
                  </div>
                  <span className={`font-black tracking-tight ${result.allowBid ? (isDark ? 'text-white' : 'text-gray-900') : 'text-red-500 text-[10px]'}`}>
                    {result.allowBid ? `₹${Math.max(0, Math.floor(result.maxBid))}` : (result.reason || 'LOCKED')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className={`flex p-1 rounded-2xl mb-4 transition-colors ${isDark ? 'bg-zinc-900/50' : 'bg-gray-100'}`}>
          <button 
            onClick={() => setActiveTab('MY_SQUAD')} 
            className={`flex-1 text-[9px] font-black py-2 rounded-xl uppercase tracking-widest transition-all ${activeTab === 'MY_SQUAD' ? (isDark ? 'bg-accent text-zinc-950 shadow-lg shadow-accent/20' : 'bg-white text-blue-600 shadow-sm') : (isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-gray-400 hover:text-gray-600')}`}
          >
            My Squad
          </button>
          <button 
            onClick={() => setActiveTab('ALL_TEAMS')} 
            className={`flex-1 text-[9px] font-black py-2 rounded-xl uppercase tracking-widest transition-all ${activeTab === 'ALL_TEAMS' ? (isDark ? 'bg-accent text-zinc-950 shadow-lg shadow-accent/20' : 'bg-white text-blue-600 shadow-sm') : (isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-gray-400 hover:text-gray-600')}`}
          >
            All Purses
          </button>
      </div>

      <div className="flex-grow flex flex-col min-h-0">
         {activeTab === 'MY_SQUAD' ? (
             <>
                <h4 className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center border-b pb-2 ${isDark ? 'text-accent border-accent/10' : 'text-blue-600 border-blue-500/10'}`}>
                    <Shirt className="w-4 h-4 mr-2"/>
                    Players ({teamPlayers.length})
                </h4>
                <div className="space-y-2 pr-1 flex-grow overflow-y-auto custom-scrollbar">
                    {teamPlayers.length > 0 ? teamPlayers.map(player => (
                        <div key={player.id} className={`p-3 rounded-2xl border-l-4 flex justify-between items-center transition-all ${isDark ? 'bg-zinc-900/40 border-accent/50 hover:bg-zinc-800/60' : 'bg-gray-50 border-blue-500/50 hover:bg-white hover:shadow-md'}`}>
                            <div>
                                <div className="flex items-center gap-1.5">
                                    <p className={`text-xs font-black uppercase tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>{player.name}</p>
                                    {player.isTraded && (
                                        <span className="text-[7px] bg-amber-500/20 text-amber-500 px-1 rounded uppercase font-black tracking-widest border border-amber-500/20">Traded</span>
                                    )}
                                </div>
                                <p className={`text-[8px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>{player.category}</p>
                            </div>
                            {(player as any).soldPrice && (
                                <span className={`font-black text-xs ${isDark ? 'text-accent' : 'text-blue-600'}`}>
                                    ₹{(player as any).soldPrice}
                                </span>
                            )}
                        </div>
                    )) : (
                        <div className={`text-[10px] font-black uppercase tracking-widest text-center py-8 opacity-30 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
                            No players bought yet.
                        </div>
                    )}
                </div>
             </>
         ) : (
             <>
                <h4 className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center border-b pb-2 ${isDark ? 'text-accent border-accent/10' : 'text-blue-600 border-blue-500/10'}`}>
                    <Users className="w-4 h-4 mr-2"/>
                    Leaderboard
                </h4>
                <div className="space-y-2 pr-1 flex-grow overflow-y-auto custom-scrollbar">
                    {sortedTeams.map(t => (
                        <div key={t.id} className={`p-3 rounded-2xl border transition-all flex justify-between items-center ${t.id === userTeam.id ? (isDark ? 'bg-accent/10 border-accent/30' : 'bg-blue-50 border-blue-500/30') : (isDark ? 'bg-zinc-900/40 border-zinc-800' : 'bg-gray-50 border-gray-100')}`}>
                            <div className="flex items-center gap-3">
                                <span className={`text-xs font-black uppercase tracking-tight ${t.id === userTeam.id ? (isDark ? 'text-accent' : 'text-blue-600') : (isDark ? 'text-zinc-300' : 'text-gray-700')}`}>{t.name}</span>
                                <span className={`text-[8px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-600' : 'text-gray-400'}`}>({(t.players || []).length})</span>
                            </div>
                            <span className={`font-black text-xs ${isDark ? 'text-white' : 'text-gray-900'}`}>₹{t.budget}</span>
                        </div>
                    ))}
                </div>
             </>
         )}
      </div>
    </div>
  );
};

export default MyTeamPanel;
