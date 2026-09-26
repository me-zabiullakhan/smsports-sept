import React, { useState, useMemo } from 'react';
import { useAuction } from '../hooks/useAuction';
import { useTheme } from '../contexts/ThemeContext';
import { Gavel, Lock, AlertCircle, Users, AlertTriangle, Info } from 'lucide-react';
import { calculateMaxBid } from '../utils';

const BiddingPanel: React.FC = () => {
    const { state, userProfile, placeBid, nextBid } = useAuction();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const { teams, highestBidder, biddingStatus, currentBid, currentPlayerId, players, status, categories, roles, maxPlayersPerTeam, basePrice: globalBasePrice, unlimitedPurse, autoReserveFunds } = state;
    const [isBidding, setIsBidding] = useState(false);

    const userTeam = teams.find(t => String(t.id) === String(userProfile?.teamId));
    const currentPlayer = currentPlayerId ? players.find(p => String(p.id) === String(currentPlayerId)) : null;

    // --- SMART PURSE VALIDATION ---
    const { reservedFunds, remainingSlots, categoryStatus, maxBidAllowed, allowBid, reason } = useMemo(() => {
        if (!userTeam) return {
            reservedFunds: 0,
            remainingSlots: 0,
            categoryStatus: [],
            maxBidAllowed: 0,
            allowBid: false,
            reason: 'Team not found'
        };

        const result = calculateMaxBid(userTeam, state, currentPlayer);

        return {
            reservedFunds: result.reservedFunds,
            remainingSlots: result.remainingSlots,
            categoryStatus: result.categoryStatus,
            maxBidAllowed: result.maxBid,
            allowBid: result.allowBid,
            reason: result.reason
        };
    }, [userTeam?.players, categories, roles, maxPlayersPerTeam, state.basePrice, currentPlayer, unlimitedPurse, userTeam?.budget]);

    if (!userProfile || !userProfile.teamId) return null;
    if (!userTeam) return null;

    if (status !== 'IN_PROGRESS') {
        return (
            <div className={`rounded-[2rem] shadow-2xl p-6 border-4 text-center transition-all duration-500 ${isDark ? 'bg-secondary border-accent/20 text-zinc-500' : 'bg-white border-blue-500/20 text-gray-400'}`}>
                <p className="font-black uppercase tracking-[0.3em] text-xs md:text-sm">
                    {status === 'SOLD' ? 'LOT SOLD' : status === 'UNSOLD' ? 'LOT UNSOLD' : 'BIDDING CLOSED'}
                </p>
            </div>
        );
    }

    const targetSquadSize = maxPlayersPerTeam || 11;
    const isSquadFull = targetSquadSize - userTeam.players.length <= 0;
    
    // Logic: A bid is blocked if the amount exceeds maxBidAllowed
    const isBidLimitExceeded = !unlimitedPurse && nextBid > maxBidAllowed;
    const canAfford = unlimitedPurse || userTeam.budget >= nextBid;
    const isLeading = highestBidder && String(highestBidder.id) === String(userTeam.id);
    const isLoadingBid = nextBid === 0;
    const isPaused = biddingStatus === 'PAUSED';
    const isActive = biddingStatus === 'ON';

    const handleBid = async () => {
        if (canAfford && !isLeading && isActive && allowBid && !isBidLimitExceeded) {
            setIsBidding(true);
            try {
                await placeBid(userTeam.id, nextBid);
            } catch (e) {
                console.error(e);
            } finally {
                setIsBidding(false);
            }
        }
    };

    return (
        <div className={`rounded-[2.5rem] shadow-2xl p-4 md:p-8 border-4 relative overflow-hidden transition-all duration-500 ${isDark ? 'bg-secondary border-accent/20 shadow-accent/5' : 'bg-white border-blue-500/20 shadow-blue-600/10'}`}>
            <div className={`absolute top-0 left-0 w-1.5 h-full ${isDark ? 'bg-accent' : 'bg-blue-600'}`}></div>
            
            <div className="flex flex-col gap-6">
                {/* Header Stats */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-6 border-b border-white/5">
                    <div className="w-full sm:w-auto text-center sm:text-left flex flex-row sm:flex-col justify-between sm:justify-start items-center sm:items-start px-2 sm:px-0">
                        <div className="flex flex-col gap-1">
                            <p className={`text-[10px] md:text-xs font-black uppercase tracking-[0.3em] ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Your Purse</p>
                            <p className={`text-2xl md:text-4xl font-black tabular-nums leading-none ${isDark ? 'text-white' : 'text-gray-900'}`}>₹{userTeam.budget}</p>
                        </div>
                        {!isSquadFull && !unlimitedPurse && (
                            <div className="flex flex-col gap-1 items-end sm:items-start">
                                <p className={`text-[10px] md:text-xs font-black uppercase tracking-[0.3em] ${isDark ? 'text-accent/80' : 'text-blue-600/80'}`}>Max Bid On Current Player</p>
                                <p className={`text-xl md:text-2xl font-black tabular-nums leading-none ${isDark ? 'text-accent' : 'text-blue-600'}`}>₹{Math.max(0, Math.floor(maxBidAllowed))}</p>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col items-center w-full sm:w-auto">
                        <button
                            onClick={handleBid}
                            disabled={!canAfford || isLeading || isBidding || !isActive || isLoadingBid || !allowBid || isBidLimitExceeded}
                            className={`
                                w-full sm:w-auto flex items-center justify-center py-4 md:py-6 px-10 md:px-14 rounded-2xl font-black text-sm md:text-xl tracking-[0.2em] uppercase transition-all transform active:scale-95 shadow-2xl
                                ${isLeading 
                                    ? (isDark ? 'bg-green-500 text-black shadow-green-500/20' : 'bg-green-600 text-white shadow-green-600/20')
                                    : !allowBid || isBidLimitExceeded
                                        ? (isDark ? 'bg-zinc-800 text-red-400 border-2 border-red-500/20 cursor-not-allowed opacity-50' : 'bg-gray-100 text-red-600 border-2 border-red-200 cursor-not-allowed opacity-50')
                                    : (!isActive)
                                        ? (isDark ? 'bg-red-900/20 border-2 border-red-500/30 text-red-400 cursor-not-allowed' : 'bg-red-50 border-2 border-red-200 text-red-600 cursor-not-allowed')
                                        : (!canAfford || isLoadingBid)
                                            ? (isDark ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed')
                                            : (isDark ? 'btn-golden shadow-accent/20' : 'btn-golden shadow-blue-600/20')
                                }
                            `}
                        >
                            {isLeading ? (
                                <>LEADING <span className={`ml-3 text-xs font-black ${isDark ? 'text-black/60' : 'text-white/80'}`}>₹{currentBid}</span></>
                            ) : !allowBid ? (
                                <><Lock className="mr-2.5 h-5 w-5"/> {reason?.toUpperCase() || 'LOCKED'}</>
                            ) : isBidLimitExceeded ? (
                                <><AlertTriangle className="mr-2.5 h-5 w-5"/> RESERVE REQUIRED</>
                            ) : !isActive ? (
                                <><Lock className="mr-2.5 h-5 w-5"/> PAUSED</>
                            ) : isLoadingBid ? (
                                <span className="animate-pulse">LOADING...</span>
                            ) : (
                                <><Gavel className="mr-2.5 h-6 w-6"/> BID ₹{nextBid}</>
                            )}
                        </button>
                    </div>
                </div>

                {/* Detailed Reservation Breakdown */}
                {!unlimitedPurse && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                            <div className="flex items-center justify-between mb-3">
                                <h4 className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Purse Reservation</h4>
                                <span className={`px-2 py-0.5 rounded-md text-[8px] font-black ${isDark ? 'bg-accent/10 text-accent' : 'bg-blue-100 text-blue-700'}`}>SMART PULSE</span>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <p className={`text-xs font-bold ${isDark ? 'text-zinc-300' : 'text-gray-600'}`}>Squad Completion Funds</p>
                                    <p className={`text-sm font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>₹{Math.floor(reservedFunds)}</p>
                                </div>
                                <div className="flex items-center justify-between">
                                    <p className={`text-xs font-bold ${isDark ? 'text-zinc-300' : 'text-gray-600'}`}>Mandatory Slots Remaining</p>
                                    <p className={`text-sm font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{remainingSlots}</p>
                                </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-white/5 flex items-start gap-2">
                                <Info className={`w-3 h-3 shrink-0 mt-0.5 ${isDark ? 'text-zinc-600' : 'text-gray-400'}`} />
                                <p className={`text-[9px] font-medium italic leading-relaxed ${isDark ? 'text-zinc-600' : 'text-gray-400'}`}>
                                    Funds are automatically reserved based on the lowest base prices in the available pool to guarantee squad completion.
                                </p>
                            </div>
                        </div>

                        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                            <h4 className={`text-[10px] font-black uppercase tracking-widest mb-3 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Category Requirements</h4>
                            <div className="space-y-3">
                                {categoryStatus.length > 0 ? (
                                    categoryStatus.map((cat, idx) => (
                                        <div key={idx} className="flex flex-col gap-1">
                                            <div className="flex items-center justify-between">
                                                <p className={`text-[10px] font-black uppercase tracking-tight ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>{cat.name}</p>
                                                <p className={`text-[10px] font-black ${cat.current >= cat.min ? 'text-green-500' : 'text-amber-500'}`}>
                                                    {cat.current} / {cat.min}
                                                </p>
                                            </div>
                                            <div className={`h-1 w-full rounded-full overflow-hidden ${isDark ? 'bg-zinc-800' : 'bg-gray-200'}`}>
                                                <div 
                                                    className={`h-full transition-all duration-500 ${cat.current >= cat.min ? 'bg-green-500' : 'bg-amber-500'}`}
                                                    style={{ width: `${Math.min(100, (cat.current / cat.min) * 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex items-center justify-center h-16">
                                        <p className={`text-[10px] font-black uppercase tracking-widest italic ${isDark ? 'text-zinc-600' : 'text-gray-400'}`}>All Minimums Satisfied</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BiddingPanel;
