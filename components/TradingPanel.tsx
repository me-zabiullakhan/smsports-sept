
import React, { useState, useEffect } from 'react';
import { useAuction } from '../hooks/useAuction';
import { Team, Player, TradeRecord, UserRole } from '../types';
import { db } from '../firebase';
import { 
    ArrowRightLeft, 
    ArrowRight, 
    ArrowLeft, 
    Plus, 
    X, 
    CheckCircle, 
    History, 
    Users, 
    Wallet, 
    ShieldAlert, 
    TrendingUp, 
    Trash2,
    DollarSign,
    RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TradingPanel: React.FC = () => {
    const { activeAuctionId, state, initiateTrade, processTrade, userProfile } = useAuction();
    const [team1Id, setTeam1Id] = useState<string>('');
    const [team2Id, setTeam2Id] = useState<string>('');
    const [team1SelectedPlayerIds, setTeam1SelectedPlayerIds] = useState<string[]>([]);
    const [team2SelectedPlayerIds, setTeam2SelectedPlayerIds] = useState<string[]>([]);
    const [cashAmount, setCashAmount] = useState<number>(0);
    const [isExecuting, setIsExecuting] = useState(false);
    const [tradeHistory, setTradeHistory] = useState<TradeRecord[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isSuperAdmin = userProfile?.role === UserRole.SUPER_ADMIN;
    const isAuctionOwner = state.createdBy === userProfile?.uid;
    const isAdmin = userProfile?.role === UserRole.ADMIN || isSuperAdmin || isAuctionOwner;

    useEffect(() => {
        if (activeAuctionId) {
            const unsub = db.collection('auctions').doc(activeAuctionId).collection('trades')
                .orderBy('createdAt', 'desc')
                .limit(50)
                .onSnapshot(snap => {
                    setTradeHistory(snap.docs.map(d => ({ id: d.id, ...d.data() } as TradeRecord)));
                });
            return () => unsub();
        }
    }, [activeAuctionId]);

    const team1 = state.teams.find(t => String(t.id) === String(team1Id));
    const team2 = state.teams.find(t => String(t.id) === String(team2Id));

    const handleExecuteTrade = async (instant = false) => {
        if (!team1 || !team2) return;
        if (team1Id === team2Id) {
            setError("Cannot trade with the same team.");
            return;
        }

        setIsExecuting(true);
        setError(null);
        try {
            const tradeId = db.collection('auctions').doc(activeAuctionId!).collection('trades').doc().id;
            
            await initiateTrade({
                auctionId: activeAuctionId || '',
                team1Id,
                team2Id,
                team1PlayerIds: team1SelectedPlayerIds,
                team2PlayerIds: team2SelectedPlayerIds,
                cashAmount,
                status: instant ? 'APPROVED' : 'PENDING',
                createdAt: Date.now()
            });

            // Reset
            setTeam1SelectedPlayerIds([]);
            setTeam2SelectedPlayerIds([]);
            setCashAmount(0);
            setShowConfirmation(false);
            if (!instant) {
                alert("Trade request sent for admin approval!");
            } else {
                alert("Trade completed successfully!");
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsExecuting(false);
        }
    };

    const handleProcessTrade = async (tradeId: string, action: 'APPROVE' | 'REJECT') => {
        if (!window.confirm(`Are you sure you want to ${action.toLowerCase()} this trade?`)) return;
        try {
            await processTrade(tradeId, action);
        } catch (err: any) {
            alert(err.message);
        }
    };

    const togglePlayerSelection = (teamNum: 1 | 2, playerId: string) => {
        if (teamNum === 1) {
            setTeam1SelectedPlayerIds(prev => 
                prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]
            );
        } else {
            setTeam2SelectedPlayerIds(prev => 
                prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]
            );
        }
    };

    const getPlayer = (playerId: string) => state.players.find(p => String(p.id) === String(playerId));

    const pendingTrades = tradeHistory.filter(t => t.status === 'PENDING');
    const completedTrades = tradeHistory.filter(t => t.status !== 'PENDING');

    return (
        <div className="space-y-6">
            {/* Header with Switch */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-6">
                <div>
                    <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                        <ArrowRightLeft className="w-6 h-6 text-amber-500" />
                        Trading Terminal
                    </h2>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1">Player Transfer & Purse Adjustment</p>
                </div>
                <div className="flex items-center gap-3">
                    {pendingTrades.length > 0 && (
                        <div className="bg-amber-500 text-black px-4 py-2 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 animate-pulse">
                            <ShieldAlert className="w-4 h-4" /> {pendingTrades.length} Pending
                        </div>
                    )}
                    <button 
                        onClick={() => setShowHistory(!showHistory)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${showHistory ? 'bg-amber-600 text-black shadow-lg shadow-amber-600/20' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                    >
                        <History className="w-4 h-4" /> {showHistory ? 'Show Panel' : 'Past Trades'}
                    </button>
                </div>
            </div>

            {showHistory ? (
                <div className="space-y-8">
                    {/* Pending Section for Admins */}
                    {isAdmin && pendingTrades.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-xs font-black uppercase tracking-widest text-amber-500 flex items-center gap-2">
                                <ShieldAlert className="w-4 h-4" /> Authorization Required
                            </h3>
                            <div className="grid grid-cols-1 gap-4">
                                {pendingTrades.map(trade => {
                                    const t1 = state.teams.find(t => String(t.id) === String(trade.team1Id));
                                    const t2 = state.teams.find(t => String(t.id) === String(trade.team2Id));
                                    return (
                                        <div key={trade.id} className="bg-amber-500/5 border border-amber-500/20 rounded-[2rem] p-8 flex flex-col md:flex-row items-center justify-between gap-8 group">
                                            <div className="flex items-center gap-6 flex-1">
                                                <div className="text-right flex-1">
                                                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2">{t1?.name}</p>
                                                    <div className="flex flex-wrap justify-end gap-2">
                                                        {trade.team1PlayerIds.map(id => (
                                                            <span key={id} className="text-[9px] bg-red-500/20 text-red-400 px-3 py-1 rounded-xl font-black uppercase">{getPlayer(id)?.name}</span>
                                                        ))}
                                                        {trade.cashAmount > 0 && <span className="text-[9px] bg-red-500/20 text-red-500 px-3 py-1 rounded-xl font-black uppercase">-₹{trade.cashAmount}</span>}
                                                    </div>
                                                </div>
                                                <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                                                    <ArrowRightLeft className="w-6 h-6" />
                                                </div>
                                                <div className="text-left flex-1">
                                                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2">{t2?.name}</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {trade.team2PlayerIds.map(id => (
                                                            <span key={id} className="text-[9px] bg-green-500/20 text-green-400 px-3 py-1 rounded-xl font-black uppercase">{getPlayer(id)?.name}</span>
                                                        ))}
                                                        {trade.cashAmount > 0 && <span className="text-[9px] bg-green-500/20 text-green-500 px-3 py-1 rounded-xl font-black uppercase">+₹{trade.cashAmount}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 border-l border-white/5 pl-8">
                                                <button 
                                                    onClick={() => handleProcessTrade(trade.id!, 'REJECT')}
                                                    className="p-4 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-500/5"
                                                    title="Reject Trade"
                                                >
                                                    <X className="w-5 h-5" />
                                                </button>
                                                <button 
                                                    onClick={() => handleProcessTrade(trade.id!, 'APPROVE')}
                                                    className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/20"
                                                >
                                                    Approve
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* History List */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                            <History className="w-4 h-4" /> Transaction History
                        </h3>
                        {completedTrades.length === 0 ? (
                            <div className="text-center py-20 bg-slate-900/50 rounded-[3rem] border border-dashed border-slate-800">
                                <History className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">No trade records found</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {completedTrades.map(trade => {
                                    const t1 = state.teams.find(t => String(t.id) === String(trade.team1Id));
                                    const t2 = state.teams.find(t => String(t.id) === String(trade.team2Id));
                                    const isApproved = trade.status === 'APPROVED';
                                    return (
                                        <div key={trade.id} className={`bg-slate-900/50 border border-white/5 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 opacity-80 hover:opacity-100 transition-all ${!isApproved ? 'grayscale border-red-500/10' : ''}`}>
                                            <div className="flex items-center gap-4 flex-1">
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t1?.name}</p>
                                                    <div className="flex flex-wrap justify-end gap-1 mt-1">
                                                        {trade.team1PlayerIds.map(id => (
                                                            <span key={id} className="text-[8px] bg-white/5 text-slate-400 px-2 py-0.5 rounded-md font-bold uppercase">{getPlayer(id)?.name}</span>
                                                        ))}
                                                        {trade.cashAmount > 0 && <span className="text-[8px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded-md font-bold uppercase">-₹{trade.cashAmount}</span>}
                                                    </div>
                                                </div>
                                                <ArrowRight className={`w-5 h-5 ${isApproved ? 'text-emerald-500' : 'text-red-500'}`} />
                                                <div className="text-left">
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t2?.name}</p>
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {trade.team2PlayerIds.map(id => (
                                                            <span key={id} className="text-[8px] bg-white/5 text-slate-400 px-2 py-0.5 rounded-md font-bold uppercase">{getPlayer(id)?.name}</span>
                                                        ))}
                                                        {trade.cashAmount > 0 && <span className="text-[8px] bg-green-500/10 text-green-400 px-2 py-0.5 rounded-md font-bold uppercase">+₹{trade.cashAmount}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right border-l border-white/5 pl-6 min-w-[120px]">
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{new Date(trade.createdAt).toLocaleDateString()}</p>
                                                <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full mt-2 inline-block tracking-widest ${isApproved ? 'text-emerald-500 bg-emerald-500/10' : 'text-red-500 bg-red-500/10'}`}>
                                                    {trade.status}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
                    {/* Team 1 Selector */}
                    <div className="lg:col-span-3 space-y-4">
                        <div className="bg-slate-900/50 rounded-[2.5rem] p-6 border border-white/5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-4">Transfer From (Debiting Purse)</label>
                            <select 
                                value={team1Id}
                                onChange={(e) => { setTeam1Id(e.target.value); setTeam1SelectedPlayerIds([]); }}
                                className="w-full bg-black border border-white/10 rounded-2xl p-4 font-black uppercase tracking-widest text-sm outline-none focus:border-amber-500 transition-all"
                            >
                                <option value="">Select Team</option>
                                {state.teams.map(t => (
                                    <option key={t.id} value={t.id}>{t.name} (₹{t.budget})</option>
                                ))}
                            </select>

                            {team1 && (
                                <div className="mt-8 space-y-3">
                                    <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                        <Users className="w-3 h-3" /> Select Players to give
                                    </h4>
                                    <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                        {team1.players.length === 0 ? (
                                            <p className="text-[10px] font-bold text-slate-600 text-center py-6 border border-dashed border-slate-800 rounded-2xl">No players in squad</p>
                                        ) : (
                                            team1.players.map(player => (
                                                <button
                                                    key={player.id}
                                                    onClick={() => togglePlayerSelection(1, String(player.id))}
                                                    className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${team1SelectedPlayerIds.includes(String(player.id)) ? 'bg-amber-600 border-amber-500 text-black' : 'bg-black/40 border-white/5 text-slate-400 hover:border-white/20'}`}
                                                >
                                                    <div className="text-left">
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-xs font-black uppercase tracking-tight">{player.name}</p>
                                                            {player.isTraded && (
                                                                <span className="text-[7px] bg-amber-500/20 text-amber-500 px-1 rounded uppercase font-black tracking-widest">Traded</span>
                                                            )}
                                                        </div>
                                                        <p className={`text-[8px] font-bold uppercase tracking-widest ${team1SelectedPlayerIds.includes(String(player.id)) ? 'text-black/60' : 'text-slate-600'}`}>{player.role}</p>
                                                    </div>
                                                    <b className="text-[10px] font-black">₹{player.soldPrice}</b>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Trade Controls */}
                    <div className="lg:col-span-1 flex flex-col items-center justify-center gap-6">
                        <div className="w-12 h-12 bg-amber-600 rounded-2xl shadow-xl shadow-amber-900/40 flex items-center justify-center">
                            <ArrowRightLeft className="w-6 h-6 text-black" />
                        </div>
                        
                        <div className="w-full space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block text-center mb-2">Transfer Cash</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                                    <input 
                                        type="number"
                                        value={cashAmount}
                                        onChange={(e) => setCashAmount(Number(e.target.value))}
                                        placeholder="0"
                                        className="w-full bg-black border border-white/10 rounded-2xl py-4 pl-10 pr-4 text-center font-black text-emerald-500 text-lg outline-none focus:border-emerald-500 transition-all"
                                    />
                                </div>
                                <p className="text-[8px] font-medium text-slate-500 text-center mt-2 uppercase tracking-widest">Amount from T1 to T2</p>
                            </div>

                            <button 
                                onClick={() => setShowConfirmation(true)}
                                disabled={!team1 || !team2 || (team1SelectedPlayerIds.length === 0 && team2SelectedPlayerIds.length === 0 && cashAmount <= 0)}
                                className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-30 disabled:grayscale transition-all active:scale-95 text-black font-black py-5 rounded-[2rem] text-[10px] uppercase tracking-widest shadow-xl shadow-amber-900/40 border-2 border-amber-400/30"
                            >
                                Execute Swap
                            </button>
                        </div>
                    </div>

                    {/* Team 2 Selector */}
                    <div className="lg:col-span-3 space-y-4">
                        <div className="bg-slate-900/50 rounded-[2.5rem] p-6 border border-white/5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-4">Transfer To (Crediting Purse)</label>
                            <select 
                                value={team2Id}
                                onChange={(e) => { setTeam2Id(e.target.value); setTeam2SelectedPlayerIds([]); }}
                                className="w-full bg-black border border-white/10 rounded-2xl p-4 font-black uppercase tracking-widest text-sm outline-none focus:border-amber-500 transition-all"
                            >
                                <option value="">Select Team</option>
                                {state.teams.map(t => (
                                    <option key={t.id} value={t.id}>{t.name} (₹{t.budget})</option>
                                ))}
                            </select>

                            {team2 && (
                                <div className="mt-8 space-y-3">
                                    <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                        <Users className="w-3 h-3" /> Select Players to receive
                                    </h4>
                                    <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                        {team2.players.length === 0 ? (
                                            <p className="text-[10px] font-bold text-slate-600 text-center py-6 border border-dashed border-slate-800 rounded-2xl">No players in squad</p>
                                        ) : (
                                            team2.players.map(player => (
                                                <button
                                                    key={player.id}
                                                    onClick={() => togglePlayerSelection(2, String(player.id))}
                                                    className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${team2SelectedPlayerIds.includes(String(player.id)) ? 'bg-amber-600 border-amber-500 text-black' : 'bg-black/40 border-white/5 text-slate-400 hover:border-white/20'}`}
                                                >
                                                    <div className="text-left">
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-xs font-black uppercase tracking-tight">{player.name}</p>
                                                            {player.isTraded && (
                                                                <span className="text-[7px] bg-amber-500/20 text-amber-500 px-1 rounded uppercase font-black tracking-widest">Traded</span>
                                                            )}
                                                        </div>
                                                        <p className={`text-[8px] font-bold uppercase tracking-widest ${team2SelectedPlayerIds.includes(String(player.id)) ? 'text-black/60' : 'text-slate-600'}`}>{player.role}</p>
                                                    </div>
                                                    <b className="text-[10px] font-black">₹{player.soldPrice}</b>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Error Message */}
            <AnimatePresence>
                {error && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center"
                    >
                        <p className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center justify-center gap-2">
                            <ShieldAlert className="w-4 h-4" /> {error}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Confirmation Modal */}
            <AnimatePresence>
                {showConfirmation && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowConfirmation(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative w-full max-w-xl bg-secondary border border-white/5 rounded-[3rem] p-10 overflow-hidden shadow-2xl"
                        >
                            <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                                <ArrowRightLeft className="w-40 h-40" />
                            </div>

                            <h3 className="text-3xl font-black uppercase tracking-tighter mb-2 italic">Confirm Transaction</h3>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-10">Review swap details carefully</p>

                            <div className="space-y-8 mb-10">
                                {/* Summary Grid */}
                                <div className="grid grid-cols-2 gap-8 relative">
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-amber-600 rounded-xl flex items-center justify-center z-10 shadow-lg rotate-45">
                                        <ArrowRightLeft className="w-5 h-5 text-black -rotate-45" />
                                    </div>

                                    <div className="bg-black/40 rounded-3xl p-6 border border-white/5 space-y-4">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{team1?.name}</p>
                                        <div className="space-y-2">
                                            {team1SelectedPlayerIds.length > 0 ? (
                                                team1SelectedPlayerIds.map(id => (
                                                    <div key={id} className="flex items-center gap-2 text-red-400">
                                                        <Trash2 className="w-3 h-3" />
                                                        <span className="text-[10px] font-bold uppercase">{getPlayer(id)?.name}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-[9px] font-bold text-slate-700 italic uppercase">No players giving</p>
                                            )}
                                            {cashAmount > 0 && (
                                                <div className="flex items-center gap-2 text-red-500 font-black">
                                                    <Wallet className="w-3 h-3" />
                                                    <span className="text-[10px] uppercase">-₹{cashAmount} Purse</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="pt-4 border-t border-white/5">
                                            <p className="text-[8px] font-bold text-slate-600 uppercase mb-1">New Balance</p>
                                            <p className="text-xl font-black text-white leading-none">₹{(team1?.budget || 0) - cashAmount}</p>
                                        </div>
                                    </div>

                                    <div className="bg-black/40 rounded-3xl p-6 border border-white/5 space-y-4 text-right">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{team2?.name}</p>
                                        <div className="space-y-2 flex flex-col items-end">
                                            {team2SelectedPlayerIds.length > 0 ? (
                                                team2SelectedPlayerIds.map(id => (
                                                    <div key={id} className="flex items-center gap-2 text-emerald-400">
                                                        <span className="text-[10px] font-bold uppercase">{getPlayer(id)?.name}</span>
                                                        <Plus className="w-3 h-3" />
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-[9px] font-bold text-slate-700 italic uppercase">No players receiving</p>
                                            )}
                                            {cashAmount > 0 && (
                                                <div className="flex items-center gap-2 text-emerald-500 font-black">
                                                    <span className="text-[10px] uppercase">+₹{cashAmount} Purse</span>
                                                    <Wallet className="w-3 h-3" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="pt-4 border-t border-white/5">
                                            <p className="text-[8px] font-bold text-slate-600 uppercase mb-1 text-right">New Balance</p>
                                            <p className="text-xl font-black text-white leading-none">₹{(team2?.budget || 0) + cashAmount}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button 
                                    onClick={() => setShowConfirmation(false)}
                                    className="flex-1 px-8 py-5 rounded-2xl bg-zinc-800 text-zinc-400 font-black uppercase tracking-widest text-[10px] hover:bg-zinc-700 transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={() => handleExecuteTrade(isAdmin)}
                                    disabled={isExecuting}
                                    className="flex-2 px-8 py-5 rounded-2xl bg-amber-600 text-black font-black uppercase tracking-widest text-[10px] hover:bg-amber-500 transition-all shadow-xl shadow-amber-900/40 flex items-center justify-center gap-3"
                                >
                                    {isExecuting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <><CheckCircle className="w-5 h-5" /> {isAdmin ? "Direct Execute" : "Confirm & Propose"}</>}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default TradingPanel;
