import React, { useMemo } from 'react';
import { Team, UserRole } from '../types';
import { useAuction } from '../hooks/useAuction';
import { useTheme } from '../contexts/ThemeContext';
import { Wallet, Users, Gavel } from 'lucide-react';
import { calculateMaxBid } from '../utils';

interface Props {
    team: Team;
}

const TeamStatusCard: React.FC<Props> = ({ team }) => {
    const { state, placeBid, userProfile, nextBid } = useAuction();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const { currentPlayerId, players, maxPlayersPerTeam, categories, roles, basePrice: globalBasePrice } = state;
    const isAdmin = userProfile?.role === UserRole.ADMIN || userProfile?.role === UserRole.SUPER_ADMIN;
    const isAuctionLive = state.status === 'IN_PROGRESS';
    const currentPlayer = currentPlayerId ? players.find(p => String(p.id) === String(currentPlayerId)) : null;

    // --- REFINED SQUAD SURVIVAL CALCULATION ---
    const { isLimitReached, limitReason, biddingCapacity } = useMemo(() => {
        const targetSquadSize = maxPlayersPerTeam || 11;
        const currentSquadCount = (team.players || []).length;

        // 1. Check Global Squad Limit
        if (targetSquadSize - currentSquadCount <= 0) {
            return { isLimitReached: true, limitReason: "Squad Full", biddingCapacity: 0 };
        }

        // 2. Check Category Specific Max Limit
        if (currentPlayer && currentPlayer.category) {
            const catConfig = categories.find(c => c.name?.toLowerCase().trim() === currentPlayer.category?.toLowerCase().trim());
            if (catConfig && catConfig.maxPerTeam > 0) {
                const count = (team.players || []).filter(p => p.category?.toLowerCase().trim() === currentPlayer.category?.toLowerCase().trim()).length;
                if (count >= catConfig.maxPerTeam) {
                    return { isLimitReached: true, limitReason: "Cat. Full", biddingCapacity: 0 };
                }
            }
        }

        const result = calculateMaxBid(team, state, currentPlayer);
        const maxBid = result.maxBid;

        let reached = false;
        let reason = "";
        
        if (!result.allowBid) {
            reached = true;
            reason = result.reason || "Limit Hit";
        } else if (nextBid > maxBid) {
            reached = true;
            reason = "Reserve Hit";
        }

        return { isLimitReached: reached, limitReason: reason, biddingCapacity: maxBid };
    }, [team.players, team.budget, categories, roles, maxPlayersPerTeam, globalBasePrice, currentPlayer, nextBid, state.unlimitedPurse, state.autoReserveFunds]);

    const canAfford = team.budget >= nextBid;
    const isHighest = state.highestBidder?.id === team.id;

    const handleAdminBid = async () => {
        if (canAfford && !isHighest && !isLimitReached && nextBid > 0) {
            try {
                await placeBid(team.id, nextBid);
            } catch (e) {
                console.error(e);
            }
        }
    };

    return (
        <div className={`p-3 rounded-2xl border-2 transition-all duration-500 shadow-xl ${
            isHighest 
                ? (isDark ? 'bg-green-900/20 border-green-500 shadow-green-500/10' : 'bg-green-50 border-green-500 shadow-green-600/10') 
                : (isDark ? 'bg-black/40 border-accent/10 hover:border-accent/30' : 'bg-white border-blue-500/10 hover:border-blue-500/30')
        }`}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center min-w-0">
                    <div className={`w-10 h-10 rounded-xl border p-1 shadow-inner flex items-center justify-center shrink-0 mr-3 ${isDark ? 'bg-zinc-900 border-accent/20' : 'bg-gray-50 border-blue-500/20'}`}>
                        {team.logoUrl ? (
                            <img src={team.logoUrl} alt={team.name} className="max-w-full max-h-full object-contain" />
                        ) : (
                            <span className={`text-xs font-black ${isDark ? 'text-accent' : 'text-blue-600'}`}>{team.name.charAt(0)}</span>
                        )}
                    </div>
                    <div className="min-w-0">
                        <h4 className={`font-black uppercase tracking-tighter text-sm truncate leading-none ${isDark ? 'text-white' : 'text-gray-900'}`}>{team.name}</h4>
                        <p className={`text-[8px] font-black uppercase tracking-widest mt-1 ${isDark ? 'text-zinc-600' : 'text-gray-400'}`}>ID: {team.id}</p>
                    </div>
                </div>
            </div>
            
            <div className="space-y-2">
                <div className={`flex items-center justify-between p-2 rounded-xl transition-colors ${isDark ? 'bg-zinc-900/50' : 'bg-gray-50'}`}>
                    <div className="flex items-center">
                        <Wallet className={`w-3.5 h-3.5 mr-2 ${isDark ? 'text-accent' : 'text-blue-600'}`} /> 
                        <span className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Purse</span>
                    </div>
                    <span className={`text-xs font-black tabular-nums ${isDark ? 'text-white' : 'text-gray-900'}`}>₹{team.budget}</span>
                </div>
                <div className={`flex items-center justify-between p-2 rounded-xl transition-colors ${isDark ? 'bg-zinc-900/50' : 'bg-gray-50'}`}>
                    <div className="flex items-center">
                        <Users className={`w-3.5 h-3.5 mr-2 ${isDark ? 'text-accent' : 'text-blue-600'}`} />
                        <span className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Squad</span>
                    </div>
                    <span className={`text-xs font-black tabular-nums ${maxPlayersPerTeam && (maxPlayersPerTeam - (team.players || []).length <= 0) ? 'text-red-500' : (isDark ? 'text-white' : 'text-gray-900')}`}>
                        {(team.players || []).length} / {maxPlayersPerTeam || '-'}
                    </span>
                </div>
                {currentPlayer && (
                    <div className={`flex items-center justify-between p-2 rounded-xl transition-colors ${isDark ? 'bg-zinc-900/50' : 'bg-gray-50'}`}>
                        <div className="flex items-center">
                            <Gavel className={`w-3.5 h-3.5 mr-2 ${isDark ? 'text-accent' : 'text-blue-600'}`} />
                            <span className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Max Bid</span>
                        </div>
                        <span className={`text-xs font-black tabular-nums ${isDark ? 'text-accent font-black' : 'text-blue-600 font-black'}`}>
                            ₹{state.unlimitedPurse ? team.budget : Math.max(0, Math.floor(biddingCapacity))}
                        </span>
                    </div>
                )}
            </div>

            {isAdmin && isAuctionLive && (
                <div className="mt-3 pt-3 border-t border-dashed border-accent/20">
                    <button 
                        onClick={handleAdminBid}
                        disabled={!canAfford || isHighest || isLimitReached}
                        className={`w-full py-2 px-3 rounded-xl text-[10px] font-black flex items-center justify-center uppercase tracking-[0.2em] transition-all transform active:scale-95 shadow-lg ${
                            isHighest 
                                ? (isDark ? 'bg-green-500 text-black' : 'bg-green-600 text-white') 
                                : isLimitReached
                                    ? (isDark ? 'bg-zinc-800 text-red-400 border border-red-500/20 cursor-not-allowed' : 'bg-gray-100 text-red-600 border border-red-200 cursor-not-allowed')
                                : !canAfford 
                                    ? (isDark ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed') 
                                    : (isDark ? 'bg-accent text-zinc-950 hover:bg-white shadow-accent/20' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/20')
                        }`}
                    >
                        {isHighest ? (
                            <>LEADING</>
                        ) : isLimitReached ? (
                            <span className="truncate">{limitReason}</span>
                        ) : !canAfford ? (
                            <>NO FUNDS</>
                        ) : (
                            <><Gavel className="w-3.5 h-3.5 mr-2"/> BID ₹{nextBid}</>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};

export default TeamStatusCard;
