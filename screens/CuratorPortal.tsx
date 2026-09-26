import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuction } from '../hooks/useAuction';
import { useTheme } from '../contexts/ThemeContext';
import { calculateMaxBid, getEffectiveBasePrice } from '../utils';
import { Player, Team, AuctionStatus } from '../types';
import { db } from '../firebase';
import confetti from 'canvas-confetti';
import { 
    Trophy, Search, Filter, Compass, AlertCircle, RefreshCw, 
    TrendingUp, Users, HeartPulse, Wallet, ArrowLeft, ArrowUpRight,
    SearchCode, Timer, Eye, CheckCircle2, XCircle, ChevronRight, FileText, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const CuratorPortal: React.FC = () => {
    const { id: auctionId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { state, error, joinAuction } = useAuction();
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const [activeTab, setActiveTab] = useState<'upcoming' | 'sold' | 'unsold'>('upcoming');
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('ALL');
    const [categoryFilter, setCategoryFilter] = useState('ALL');

    useEffect(() => {
        if (auctionId) {
            joinAuction(auctionId);
        }
    }, [auctionId]);

    const lastStateStatusRef = useRef<AuctionStatus | null>(null);
    const lastPlayerIdRef = useRef<string | number | null>(null);

    useEffect(() => {
        if (state.status === AuctionStatus.Sold && state.currentPlayerId) {
            const isNewSold = lastStateStatusRef.current !== AuctionStatus.Sold || lastPlayerIdRef.current !== state.currentPlayerId;
            if (isNewSold) {
                confetti({
                    particleCount: 150,
                    spread: 85,
                    origin: { y: 0.6 }
                });
            }
        }
        lastStateStatusRef.current = state.status;
        lastPlayerIdRef.current = state.currentPlayerId;
    }, [state.status, state.currentPlayerId]);

    // Active Player reference
    const currentPlayer = useMemo(() => {
        if (!state.currentPlayerId || state.players.length === 0) return null;
        return state.players.find(p => String(p.id) === String(state.currentPlayerId)) || null;
    }, [state.currentPlayerId, state.players]);

    // Unsold Pool & Sold Pool
    const soldPlayers = useMemo(() => {
        return state.players.filter(p => p.status === 'SOLD');
    }, [state.players]);

    const unsoldPlayers = useMemo(() => {
        return state.players.filter(p => p.status === 'UNSOLD');
    }, [state.players]);

    const upcomingPlayers = useMemo(() => {
        return state.players.filter(p => !p.status || (p.status !== 'SOLD' && p.status !== 'UNSOLD' && String(p.id) !== String(state.currentPlayerId)));
    }, [state.players, state.currentPlayerId]);

    // Computed Roles and Categories list for filtering
    const rolesList = useMemo(() => {
        const set = new Set<string>();
        state.players.forEach(p => { if (p.role) set.add(p.role); });
        return Array.from(set);
    }, [state.players]);

    const categoriesList = useMemo(() => {
        return state.categories.map(c => c.name);
    }, [state.categories]);

    // Tab Filtrations
    const filteredUpcoming = useMemo(() => {
        return upcomingPlayers.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesRole = roleFilter === 'ALL' || p.role === roleFilter;
            const matchesCategory = categoryFilter === 'ALL' || p.category === categoryFilter;
            return matchesSearch && matchesRole && matchesCategory;
        });
    }, [upcomingPlayers, searchTerm, roleFilter, categoryFilter]);

    const filteredSold = useMemo(() => {
        return soldPlayers.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesSearch;
        });
    }, [soldPlayers, searchTerm]);

    const filteredUnsold = useMemo(() => {
        return unsoldPlayers.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesSearch;
        });
    }, [unsoldPlayers, searchTerm]);

    // Total stats
    const totalPurseAllocated = useMemo(() => {
        return state.teams.reduce((acc, t) => acc + (t.budget || 0), 0);
    }, [state.teams]);

    const totalPurseSpent = useMemo(() => {
        return soldPlayers.reduce((acc, p) => acc + (p.soldPrice || 0), 0);
    }, [soldPlayers]);

    // Team calculations listing
    const calculatedTeams = useMemo(() => {
        return state.teams.map(team => {
            const maxBidInfo = currentPlayer ? calculateMaxBid(team, state, currentPlayer) : null;
            return {
                ...team,
                maxBidInfo
            };
        }).sort((a, b) => b.budget - a.budget);
    }, [state.teams, state, currentPlayer]);

    // Status checks
    if (error) {
        return (
            <div className={`min-h-screen flex items-center justify-center p-6 ${isDark ? 'bg-zinc-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
                <div className={`p-8 rounded-[2.5rem] border text-center shadow-2xl max-w-md w-full ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'}`}>
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6 animate-bounce" />
                    <h2 className="text-2xl font-black uppercase tracking-tight mb-2">Auction Room Not Found</h2>
                    <p className={`text-sm mb-8 ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
                        Make sure the URL contains a valid auction ID. If the room was recently shut down, return to Dashboard.
                    </p>
                    <button 
                        onClick={() => navigate('/')} 
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest py-4 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" /> Go to Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen font-sans transition-colors duration-500 ${isDark ? 'bg-zinc-950 text-white' : 'bg-slate-50 text-slate-800'}`}>
            
            {/* Upper Banner / Header Info */}
            <header className={`border-b transition-colors sticky top-0 z-40 ${isDark ? 'bg-zinc-900 border-zinc-800/80 backdrop-blur-md bg-opacity-95' : 'bg-white border-slate-200/80 backdrop-blur-md bg-opacity-95'}`}>
                <div className="max-w-7xl mx-auto px-4 py-3.5 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => navigate(`/auction/${auctionId}`)}
                            className={`p-2.5 rounded-xl border transition-all ${isDark ? 'hover:bg-zinc-800 border-zinc-800 text-zinc-400' : 'hover:bg-slate-100 border-slate-200 text-slate-500'}`}
                            title="Back to Spectator Screen"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="flex h-2.5 w-2.5 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                </span>
                                <h1 className="text-xl font-black uppercase tracking-tight leading-none">
                                    {state.tournamentName || "LIVE AUCTION"}
                                </h1>
                            </div>
                            <p className={`text-[10px] font-black uppercase tracking-[0.2em] mt-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                                Professional Curator Console • Real-Time Broadcast
                            </p>
                        </div>
                    </div>

                    {/* Compact Analytics Bar */}
                    <div className="flex flex-wrap items-center gap-3 sm:gap-6">
                        <div className={`px-4 py-2 rounded-xl text-center border ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-slate-100/50 border-slate-200'}`}>
                            <p className={`text-[8px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Sold Players</p>
                            <p className="text-xs font-black tabular-nums">{soldPlayers.length} / {state.players.length}</p>
                        </div>
                        <div className={`px-4 py-2 rounded-xl text-center border ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-slate-100/50 border-slate-200'}`}>
                            <p className={`text-[8px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Unsold Pools</p>
                            <p className="text-xs font-black tabular-nums">{unsoldPlayers.length}</p>
                        </div>
                        <div className={`px-4 py-2 rounded-xl text-center border ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-slate-100/50 border-slate-200'}`}>
                            <p className={`text-[8px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Total Spent Purse</p>
                            <p className="text-xs font-black tabular-nums text-emerald-500">₹{totalPurseSpent.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Layout Master Content */}
            <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
                
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* LEFT PANEL: ACTIVE BIDDING DECK AND TEAMS (8 Cols) */}
                    <div className="lg:col-span-7 col-span-1 space-y-6">
                        
                        {/* CURRENT ROUND / FLOOR CARD */}
                        <div className={`rounded-3xl border overflow-hidden shadow-2xl transition-all ${isDark ? 'bg-zinc-900 border-zinc-800/80 shadow-accent/5' : 'bg-white border-slate-200/80 shadow-slate-200/50'}`}>
                            <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-slate-50 border-slate-100'}`}>
                                <div className="flex items-center gap-2">
                                    <HeartPulse className="w-4 h-4 text-rose-500 animate-pulse" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Bidding Floor Area</span>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                    state.status === AuctionStatus.InProgress 
                                        ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' 
                                        : 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20'
                                }`}>
                                    {state.status === AuctionStatus.InProgress ? "ROUND ACTIVE" : state.status}
                                </div>
                            </div>

                            {currentPlayer ? (
                                <div className="p-6">
                                    <div className="flex flex-col sm:flex-row gap-6 items-center">
                                        
                                        {/* Player Mugshot Avatar preview */}
                                        <div className="relative group flex-shrink-0">
                                            <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
                                            <img 
                                                src={currentPlayer.photoUrl || null} 
                                                alt={currentPlayer.name} 
                                                className={`relative w-32 h-32 rounded-2xl border-2 object-cover shadow-lg ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}
                                                referrerPolicy="no-referrer"
                                                onError={(e) => {
                                                    // Fallback placeholder image or default state
                                                    (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentPlayer.name)}`;
                                                }}
                                            />
                                            {(currentPlayer as any).playerNumber && (
                                                <span className="absolute -bottom-2 -right-2 bg-blue-600 text-white font-black text-xs px-2 py-0.5 rounded-lg shadow-md border border-blue-500">
                                                    #{(currentPlayer as any).playerNumber}
                                                </span>
                                            )}
                                        </div>

                                        {/* Player metadata details */}
                                        <div className="flex-grow w-full text-center sm:text-left">
                                            <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2 mb-1.5">
                                                <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-slate-100 text-slate-600'}`}>
                                                    {currentPlayer.role || "No Role"}
                                                </span>
                                                <span className="px-2.5 py-0.5 rounded-lg text-[9px] bg-amber-500/10 text-amber-500 border border-amber-500/20 font-black uppercase tracking-widest">
                                                    {currentPlayer.category || "No Category"}
                                                </span>
                                            </div>
                                            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight italic mb-2">
                                                {currentPlayer.name}
                                            </h2>

                                            <div className="grid grid-cols-3 gap-2.5 mt-4">
                                                <div className={`p-3 rounded-2xl border ${isDark ? 'bg-zinc-950/40 border-zinc-800/80' : 'bg-slate-50 border-slate-100'}`}>
                                                    <p className={`text-[8px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Base Price</p>
                                                    <p className="text-sm font-black text-blue-500 tabular-nums">
                                                        ₹{getEffectiveBasePrice(currentPlayer, state.categories).toLocaleString()}
                                                    </p>
                                                </div>
                                                <div className={`p-3 rounded-2xl border ${isDark ? 'bg-zinc-950/40 border-zinc-800/80' : 'bg-slate-50 border-slate-100'}`}>
                                                    <p className={`text-[8px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Current Bid</p>
                                                    <p className="text-sm font-black text-amber-500 tabular-nums">
                                                        ₹{(state.currentBid || 0).toLocaleString()}
                                                    </p>
                                                </div>
                                                <div className={`p-3 rounded-2xl border ${isDark ? 'bg-zinc-950/40 border-zinc-800/80' : 'bg-slate-50 border-slate-100'}`}>
                                                    <p className={`text-[8px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Highest Bidder</p>
                                                    <p className={`text-xs font-black truncate uppercase ${isDark ? 'text-white' : 'text-slate-700'}`}>
                                                        {state.highestBidderId ? (state.teams.find(t => String(t.id) === String(state.highestBidderId))?.name || "Loading...") : "None"}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-12 text-center text-zinc-500 uppercase tracking-widest font-black text-xs flex flex-col items-center justify-center gap-3">
                                    <Timer className="w-10 h-10 text-zinc-400 animate-pulse" />
                                    No player is currently on the floor
                                </div>
                            )}
                        </div>

                        {/* FULL TEAMS GRID AND MAX BIDS CAPACITY */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center px-1">
                                <h3 className="text-xs font-black uppercase tracking-[0.25em] flex items-center gap-1.5 opacity-80">
                                    <Users className="w-3.5 h-3.5 text-blue-500" /> Bidding Capacity Analyzer
                                </h3>
                                <div className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                                    <Info className="w-3 h-3" /> Auto-Updates Live
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {calculatedTeams.map((team) => {
                                    const maxBidInfo = team.maxBidInfo;
                                    const squadCount = (team.players || []).length;
                                    const maxPlayers = state.maxPlayersPerTeam || 25;
                                    const isBiddingAllowed = maxBidInfo ? maxBidInfo.allowBid : true;
                                    const bidLimitValue = maxBidInfo ? maxBidInfo.maxBid : team.budget;

                                    return (
                                        <div 
                                            key={`curator-team-${team.id}`}
                                            className={`p-4 rounded-3xl border transition-all relative overflow-hidden ${
                                                isDark 
                                                    ? 'bg-zinc-900 border-zinc-800/80 hover:bg-zinc-900/70 shadow-accent/2' 
                                                    : 'bg-white border-slate-200 hover:shadow-lg hover:shadow-slate-200/40'
                                            }`}
                                        >
                                            {/* Header Section for Team */}
                                            <div className="flex justify-between items-start gap-2 pb-3 mb-3 border-b border-dashed border-zinc-800/50">
                                                <div>
                                                    <h4 className="font-black text-sm uppercase tracking-tight truncate max-w-[180px]">
                                                        {team.name}
                                                    </h4>
                                                    <p className={`text-[8px] font-black uppercase tracking-widest mt-0.5 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                                                        Squad size: {squadCount} / {maxPlayers}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs font-black text-rose-500">₹{team.budget.toLocaleString()}</p>
                                                    <p className={`text-[8px] font-bold uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Purse Available</p>
                                                </div>
                                            </div>

                                            {/* Dynamic calculation values */}
                                            <div className="grid grid-cols-2 gap-2.5 mb-2">
                                                <div className={`p-2 rounded-xl text-center ${isDark ? 'bg-zinc-950/50' : 'bg-slate-50'}`}>
                                                    <p className={`text-[8px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Smart Max Bid</p>
                                                    <p className={`text-sm font-black tabular-nums leading-none mt-1 ${isBiddingAllowed ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                        {(!currentPlayer || state.status !== AuctionStatus.InProgress) ? (
                                                            <span>₹{team.budget.toLocaleString()}</span>
                                                        ) : (
                                                            <span>{bidLimitValue === Infinity ? "Unlimited" : `₹${bidLimitValue.toLocaleString()}`}</span>
                                                        )}
                                                    </p>
                                                </div>

                                                <div className={`p-2 rounded-xl text-center ${isDark ? 'bg-zinc-950/50' : 'bg-slate-50'}`}>
                                                    <p className={`text-[8px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Purse Reservation</p>
                                                    <p className={`text-sm font-black tabular-nums leading-none mt-1 ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                                                        ₹{maxBidInfo ? Math.floor(maxBidInfo.reservedFunds).toLocaleString() : '0'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Bidding eligibility indicator */}
                                            {currentPlayer && state.status === AuctionStatus.InProgress && (
                                                <div className={`mt-2.5 px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${
                                                    isBiddingAllowed 
                                                        ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400' 
                                                        : 'bg-red-500/5 border-red-500/10 text-red-400'
                                                }`}>
                                                    {isBiddingAllowed ? (
                                                        <>
                                                            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                                                            <span className="text-[9px] font-black uppercase tracking-wider">Eligible to bid</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                                            <span className="text-[9px] font-black uppercase tracking-wide truncate">
                                                                Blocked: {maxBidInfo?.reason || "Check Category reservation limits"}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                    </div>

                    {/* RIGHT PANEL: STATISTICS, SEARCH, TABLES (5 Cols) */}
                    <div className="lg:col-span-5 col-span-1 space-y-6">
                        
                        {/* TAB CONTROLS CARD */}
                        <div className={`rounded-3xl border overflow-hidden shadow-xl ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'}`}>
                            
                            {/* Tabs Navigation */}
                            <div className={`flex border-b ${isDark ? 'bg-zinc-900/40 border-zinc-800' : 'bg-slate-50 border-slate-100'}`}>
                                <button 
                                    onClick={() => { setActiveTab('upcoming'); setSearchTerm(''); }}
                                    className={`flex-1 py-3 text-center text-[10px] font-black uppercase tracking-widest transition-all ${
                                        activeTab === 'upcoming' 
                                            ? (isDark ? 'bg-zinc-900 border-b-2 border-accent text-accent' : 'bg-white border-b-2 border-blue-600 text-blue-600') 
                                            : 'text-zinc-500 hover:text-zinc-300'
                                    }`}
                                >
                                    Upcoming ({upcomingPlayers.length})
                                </button>
                                <button 
                                    onClick={() => { setActiveTab('sold'); setSearchTerm(''); }}
                                    className={`flex-1 py-3 text-center text-[10px] font-black uppercase tracking-widest transition-all ${
                                        activeTab === 'sold' 
                                            ? (isDark ? 'bg-zinc-900 border-b-2 border-accent text-accent' : 'bg-white border-b-2 border-blue-600 text-blue-600') 
                                            : 'text-zinc-500 hover:text-zinc-300'
                                    }`}
                                >
                                    Sold ({soldPlayers.length})
                                </button>
                                <button 
                                    onClick={() => { setActiveTab('unsold'); setSearchTerm(''); }}
                                    className={`flex-1 py-3 text-center text-[10px] font-black uppercase tracking-widest transition-all ${
                                        activeTab === 'unsold' 
                                            ? (isDark ? 'bg-zinc-900 border-b-2 border-accent text-accent' : 'bg-white border-b-2 border-blue-600 text-blue-600') 
                                            : 'text-zinc-500 hover:text-zinc-300'
                                    }`}
                                >
                                    Unsold ({unsoldPlayers.length})
                                </button>
                            </div>

                            {/* Filters Bar info */}
                            <div className="p-4 border-b border-dashed border-zinc-800/65 space-y-4">
                                <div className="relative">
                                    <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-zinc-600' : 'text-slate-400'}`} />
                                    <input 
                                        type="text" 
                                        placeholder={`Search ${activeTab} players...`} 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className={`w-full pl-10 pr-4 py-2.5 rounded-2xl border text-xs font-medium focus:outline-none focus:ring-2 transition-all ${
                                            isDark 
                                                ? 'bg-zinc-950 border-zinc-800 focus:ring-accent/45 text-white' 
                                                : 'bg-white border-slate-200 focus:ring-blue-500/40 text-slate-800'
                                        }`}
                                    />
                                </div>

                                {/* Dual Filter list (Available only on Pending Upcoming tab) */}
                                {activeTab === 'upcoming' && (
                                    <div className="flex flex-col gap-3">
                                        <div className="flex flex-col gap-1.5">
                                            <p className={`text-[8px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Role Filter</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                <button
                                                    onClick={() => setRoleFilter('ALL')}
                                                    className={`py-1 px-2.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border ${
                                                        roleFilter === 'ALL'
                                                            ? (isDark ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_10px_rgba(37,99,235,0.3)] font-bold' : 'bg-blue-600 border-blue-600 text-white font-bold')
                                                            : (isDark ? 'bg-zinc-900 border-zinc-800/80 text-zinc-300 hover:text-white hover:border-zinc-700' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200')
                                                    }`}
                                                >
                                                    ALL
                                                </button>
                                                {rolesList.map(r => (
                                                    <button
                                                        key={`btn-role-${r}`}
                                                        onClick={() => setRoleFilter(r)}
                                                        className={`py-1 px-2.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border ${
                                                            roleFilter === r
                                                                ? (isDark ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_10px_rgba(37,99,235,0.3)] font-bold' : 'bg-blue-600 border-blue-600 text-white font-bold')
                                                                : (isDark ? 'bg-zinc-900 border-zinc-800/80 text-zinc-300 hover:text-white hover:border-zinc-700' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200')
                                                        }`}
                                                    >
                                                        {r}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-1.5">
                                            <p className={`text-[8px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Category Filter</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                <button
                                                    onClick={() => setCategoryFilter('ALL')}
                                                    className={`py-1 px-2.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border ${
                                                        categoryFilter === 'ALL'
                                                            ? (isDark ? 'bg-amber-500 border-amber-400 text-black shadow-[0_0_10px_rgba(245,158,11,0.3)] font-black' : 'bg-amber-500 border-amber-500 text-black font-black')
                                                            : (isDark ? 'bg-zinc-900 border-zinc-800/80 text-zinc-300 hover:text-white hover:border-zinc-700' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200')
                                                    }`}
                                                >
                                                    ALL
                                                </button>
                                                {categoriesList.map(c => (
                                                    <button
                                                        key={`btn-cat-${c}`}
                                                        onClick={() => setCategoryFilter(c)}
                                                        className={`py-1 px-2.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border ${
                                                            categoryFilter === c
                                                                ? (isDark ? 'bg-amber-500 border-amber-400 text-black shadow-[0_0_10px_rgba(245,158,11,0.3)] font-black' : 'bg-amber-500 border-amber-500 text-black font-black')
                                                                : (isDark ? 'bg-zinc-900 border-zinc-800/80 text-zinc-300 hover:text-white hover:border-zinc-700' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200')
                                                        }`}
                                                    >
                                                        {c}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Tables render height limit area */}
                            <div className="overflow-y-auto max-h-[500px] custom-scrollbar">
                                
                                <AnimatePresence mode="popLayout">
                                    
                                    {/* UPCOMING TAB VIEW */}
                                    {activeTab === 'upcoming' && (
                                        <div className="divide-y divide-zinc-800/40">
                                            {filteredUpcoming.length > 0 ? filteredUpcoming.map((player) => (
                                                <motion.div 
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    key={`upcoming-${player.id}`}
                                                    className="p-3.5 flex items-center justify-between gap-4"
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <img 
                                                            src={player.photoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(player.name)}`} 
                                                            className="w-10 h-10 rounded-xl object-cover border border-zinc-800/40"
                                                            alt={player.name}
                                                            referrerPolicy="no-referrer"
                                                        />
                                                        <div className="min-w-0">
                                                            <h5 className="font-bold text-xs uppercase truncate">{player.name}</h5>
                                                            <p className={`text-[8px] font-black uppercase tracking-widest mt-0.5 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                                                                {player.role} • {player.category}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right flex-shrink-0">
                                                        <p className="text-xs font-black text-amber-500">₹{getEffectiveBasePrice(player, state.categories).toLocaleString()}</p>
                                                        <p className={`text-[8px] font-bold uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Base Price</p>
                                                    </div>
                                                </motion.div>
                                            )) : (
                                                <div className="p-8 text-center text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                                    No pending players found
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* SOLD TAB VIEW */}
                                    {activeTab === 'sold' && (
                                        <div className="divide-y divide-zinc-800/40">
                                            {filteredSold.length > 0 ? filteredSold.map((player) => (
                                                <motion.div 
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    key={`sold-${player.id}`}
                                                    className="p-3.5 flex items-center justify-between gap-4"
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500 flex-shrink-0">
                                                            <CheckCircle2 className="w-5 h-5" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h5 className="font-bold text-xs uppercase truncate">{player.name}</h5>
                                                            <p className={`text-[8px] font-black uppercase tracking-widest mt-0.5 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                                                                Sold to: <span className={isDark ? 'text-white' : 'text-slate-700'}>{player.soldTo || 'Unknown'}</span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right flex-shrink-0">
                                                        <p className="text-xs font-black text-emerald-500">₹{(player.soldPrice || 0).toLocaleString()}</p>
                                                        <p className={`text-[8px] font-bold uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Winning Bid</p>
                                                    </div>
                                                </motion.div>
                                            )) : (
                                                <div className="p-8 text-center text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                                    No sold players history
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* UNSOLD TAB VIEW */}
                                    {activeTab === 'unsold' && (
                                        <div className="divide-y divide-zinc-800/40">
                                            {filteredUnsold.length > 0 ? filteredUnsold.map((player) => (
                                                <motion.div 
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    key={`unsold-${player.id}`}
                                                    className="p-3.5 flex items-center justify-between gap-4"
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="p-2 bg-red-500/10 rounded-xl text-red-500 flex-shrink-0">
                                                            <XCircle className="w-5 h-5" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h5 className="font-bold text-xs uppercase truncate">{player.name}</h5>
                                                            <p className={`text-[8px] font-black uppercase tracking-widest mt-0.5 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                                                                {player.role || 'Passed'} • {player.category || 'General'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right flex-shrink-0">
                                                        <p className="text-xs font-black text-rose-500">₹{getEffectiveBasePrice(player, state.categories).toLocaleString()}</p>
                                                        <p className={`text-[8px] font-bold uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Base Price</p>
                                                    </div>
                                                </motion.div>
                                            )) : (
                                                <div className="p-8 text-center text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                                    No passed players in pool
                                                </div>
                                            )}
                                        </div>
                                    )}

                                </AnimatePresence>

                            </div>

                        </div>
                    </div>

                </div>

            </main>

        </div>
    );
};

export default CuratorPortal;
