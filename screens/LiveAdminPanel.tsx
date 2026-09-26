import React, { useState, useEffect, useMemo } from 'react';
import { useAuction } from '../hooks/useAuction';
import { AuctionStatus, Team, Player, ProjectorLayout, OBSLayout } from '../types';
import TeamStatusCard from '../components/TeamStatusCard';
import TradingPanel from '../components/TradingPanel';
// Fixed missing LayoutList import
import { Play, Check, X, ArrowLeft, Loader2, RotateCcw, AlertOctagon, DollarSign, Cast, Lock, Unlock, Monitor, ChevronDown, Shuffle, Search, User, Palette, Trophy, Gavel, Wallet, Eye, EyeOff, Clock, Zap, Undo2, RefreshCw, LayoutList, ArrowRightLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LiveAdminPanel: React.FC = () => {
    const { state, sellPlayer, passPlayer, startAuction, undoPlayerSelection, endAuction, resetAuction, resetCurrentPlayer, resetUnsoldPlayers, updateBiddingStatus, toggleSelectionMode, updateTheme, activeAuctionId, placeBid, nextBid, updateSponsorConfig, correctPlayerSale, setAdminView } = useAuction();
    const { teams, players, biddingStatus, playerSelectionMode, categories, maxPlayersPerTeam, roles } = state;
    const navigate = useNavigate();
    const [isProcessing, setIsProcessing] = useState(false);
    const [activeTab, setActiveTab] = useState<'AUCTION' | 'TRADING'>('AUCTION');

    // Move isRoundActive to component scope to ensure it's accessible by all inner functions
  const isRoundActive = state.status === AuctionStatus.InProgress && state.currentPlayerId;
  
  // Inline Sell State
  const [isSellingMode, setIsSellingMode] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [finalPrice, setFinalPrice] = useState<number>(0);

  // Manual Player Selection State
  const [manualPlayerId, setManualPlayerId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState(''); // New search state
  const [filterCategory, setFilterCategory] = useState<string>('ALL'); // New category filter state
  const [filterRole, setFilterRole] = useState<string>('ALL'); // New role filter state
  const [showUnsold, setShowUnsold] = useState(false); // Toggle to include unsold players

  // Undo State
  const [lastAction, setLastAction] = useState<{playerId: string, type: 'SOLD' | 'UNSOLD', name: string} | null>(null);

  // Sponsor Config Local State (debounce or immediate)
  const [sponsorLoop, setSponsorLoop] = useState(state.sponsorConfig?.loopInterval || 5);

  // Auto-fill price and leader when entering sell mode or when bid updates
  useEffect(() => {
      // 1. Determine Price
      if (state.currentBid !== null && state.currentBid > 0) {
          setFinalPrice(Number(state.currentBid));
      } else if (state.currentPlayerId) {
          // Fallback to Base Price if no bids
          const p = players.find(player => String(player.id) === String(state.currentPlayerId));
          if (p) setFinalPrice(p.basePrice);
      }

      // 2. Determine Team
      if (state.highestBidder) {
          setSelectedTeamId(String(state.highestBidder.id));
      } else if (!isSellingMode) {
          // Reset selection only if we aren't currently editing
          setSelectedTeamId('');
      }
  }, [state.currentBid, state.highestBidder, isSellingMode, state.currentPlayerId, players]);

  // Sync sponsor loop state
  useEffect(() => {
      if(state.sponsorConfig?.loopInterval) setSponsorLoop(state.sponsorConfig.loopInterval);
  }, [state.sponsorConfig]);

  // Inline Confirm States
  const [confirmingAction, setConfirmingAction] = useState<string | null>(null);

  const handleStart = async (specificId?: string) => {
      if (teams.length === 0) {
          showNotification("Cannot start auction: No teams added. Please go back to Dashboard > Edit Auction > Teams to add teams.");
          return;
      }

      const availablePlayers = players.filter(p => p.status !== 'SOLD' && p.status !== 'UNSOLD');
      if (availablePlayers.length === 0 && !showUnsold) {
          showNotification("Cannot start auction: No more players available.");
          return;
      }

      setIsProcessing(true);
      // If restarting an unsold player, specificId will be passed.
      const hasNextPlayer = await startAuction(specificId);
      
      if (!hasNextPlayer && !showUnsold) {
          // Changed to inline confirmation for endAuction
          setConfirmingAction('END_AUCTION');
      } else {
          // Clear manual selection
          setManualPlayerId('');
          setSearchTerm('');
      }
      setIsProcessing(false);
  }

  const showNotification = (msg: string) => {
      // Simple alert for critical errors, but try to avoid popups where possible
      alert(msg);
  }

  const handleResetFull = async () => {
      setConfirmingAction('RESET_FULL');
  }

  const handleResetPlayer = async () => {
      setConfirmingAction('RESET_PLAYER');
  }

  const handleCancelSelection = async () => {
      setConfirmingAction('CANCEL_ROUND');
  }

  const handleUndoLastAction = async () => {
      if (!lastAction) return;
      setConfirmingAction('UNDO_LAST');
  }

  const handleResetSingleUnsold = async (playerId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setConfirmingAction(`RESET_UNSOLD_${playerId}`);
  }
  
  const copyOBSLink = (type: 'transparent' | 'green') => {
      if (!activeAuctionId) return;
      const baseUrl = window.location.href.split('#')[0];
      const route = type === 'green' ? 'obs-green' : 'obs-overlay';
      const url = `${baseUrl}#/${route}/${activeAuctionId}`;
      navigator.clipboard.writeText(url);
      
      if (type === 'green') {
          alert("PROJECTOR VIEW URL Copied!\n\nOpen this link on the projector screen.");
      } else {
          alert("OBS OVERLAY URL Copied!\n\nPaste this into OBS Browser Source.");
      }
  };
  
  const handleSellClick = () => {
      setIsSellingMode(true);
  };

  const cancelSell = () => {
      setIsSellingMode(false);
  };

  const confirmSell = async () => {
      if (!selectedTeamId) {
          alert("Please select a team to sell to.");
          return;
      }
      if (finalPrice <= 0) {
          alert("Price must be greater than 0.");
          return;
      }

      setIsProcessing(true);
      const pid = state.currentPlayerId ? String(state.currentPlayerId) : '';
      const pName = players.find(p => String(p.id) === pid)?.name || 'Player';

      try {
          await sellPlayer(selectedTeamId, finalPrice);
          setLastAction({ playerId: pid, type: 'SOLD', name: pName });
          setIsSellingMode(false);
      } catch(e) {
          console.error(e);
          alert("Failed to sell player. Check console.");
      } finally {
          setIsProcessing(false);
      }
  };

  const handlePass = async () => {
      setConfirmingAction('PASS_PLAYER');
  }

  const handleQuickBid = async (teamId: string | number) => {
      try {
          await placeBid(teamId, nextBid);
      } catch (e) {
          console.error(e);
          // Optional: Show toast error
      }
  };

  const updateSponsorVisibility = (target: 'OBS' | 'PROJECTOR') => {
      const current = state.sponsorConfig || { showOnOBS: false, showOnProjector: false, loopInterval: 5 };
      const newConfig = {
          ...current,
          showOnOBS: target === 'OBS' ? !current.showOnOBS : current.showOnOBS,
          showOnProjector: target === 'PROJECTOR' ? !current.showOnProjector : current.showOnProjector
      };
      updateSponsorConfig(newConfig);
  };

  const toggleHighlights = () => {
    const current = state.sponsorConfig || { showOnOBS: false, showOnProjector: false, loopInterval: 5, showHighlights: false };
    updateSponsorConfig({ ...current, showHighlights: !current.showHighlights });
  };

  const handleSponsorLoopChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Number(e.target.value);
      setSponsorLoop(val);
  };

  const saveSponsorLoop = () => {
      const current = state.sponsorConfig || { showOnOBS: false, showOnProjector: false, loopInterval: 5 };
      updateSponsorConfig({ ...current, loopInterval: sponsorLoop });
  };

  const selectedPlayerObj = players.find(p => p.id === manualPlayerId);
  const currentPlayer = state.currentPlayerId ? state.players.find(p => String(p.id) === String(state.currentPlayerId)) : null;

  const getControlButtons = () => {
      // Removed local isRoundActive definition as it's now in component scope
      const availablePlayersCount = players.filter(p => p.status !== 'SOLD' && p.status !== 'UNSOLD').length;
      const isStartDisabled = isProcessing || (state.status === AuctionStatus.NotStarted && (teams.length === 0 || availablePlayersCount === 0));
      const unsoldCount = players.filter(p => p.status === 'UNSOLD').length;

      // Finish Auction Option
      if (availablePlayersCount === 0 && state.status !== AuctionStatus.NotStarted && !isRoundActive) {
          return (
             <div className="space-y-4 animate-fade-in">
                 {unsoldCount > 0 && (
                     <div className="bg-blue-900/30 border border-blue-500/50 p-4 rounded-xl text-center shadow-inner">
                        <h3 className="text-white font-bold text-lg mb-2">Unsold Players Available</h3>
                        <p className="text-gray-300 text-xs mb-4">There are {unsoldCount} unsold players. Do you want to bring them back into the bidding pool?</p>
                        
                        {confirmingAction === 'RESET_UNSOLD_ALL' ? (
                            <div className="flex gap-2">
                                <button onClick={() => setConfirmingAction(null)} className="flex-1 py-3 bg-gray-600 text-white rounded-lg text-xs font-bold uppercase">Cancel</button>
                                <button 
                                    onClick={async () => {
                                        setIsProcessing(true);
                                        await resetUnsoldPlayers();
                                        setConfirmingAction(null);
                                        setIsProcessing(false);
                                    }}
                                    className="flex-1 py-3 bg-red-600 text-white rounded-lg text-xs font-bold uppercase"
                                >
                                    Confirm Reset
                                </button>
                            </div>
                        ) : (
                            <button 
                                onClick={() => setConfirmingAction('RESET_UNSOLD_ALL')}
                                disabled={isProcessing}
                                className="btn-golden w-full font-bold py-3 rounded-lg flex items-center justify-center"
                            >
                                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <RotateCcw className="mr-2 h-4 w-4"/>}
                                BRING BACK UNSOLD ({unsoldCount})
                            </button>
                        )}
                     </div>
                 )}
                 
                 <div className="bg-green-900/30 border border-green-500/50 p-6 rounded-xl text-center shadow-inner">
                    <Trophy className="w-12 h-12 text-yellow-400 mx-auto mb-3 drop-shadow-lg" />
                    <h3 className="text-white font-bold text-xl mb-2">Auction Completed!</h3>
                    <p className="text-gray-300 text-sm mb-6">All players have been auctioned. You can now finalize the event.</p>
                    
                    {confirmingAction === 'END_AUCTION' ? (
                        <div className="flex gap-2">
                            <button onClick={() => setConfirmingAction(null)} className="flex-1 py-3 bg-gray-600 text-white rounded-lg text-xs font-bold uppercase">Cancel</button>
                            <button 
                                onClick={async () => {
                                    setIsProcessing(true);
                                    await endAuction();
                                    setConfirmingAction(null);
                                    setIsProcessing(false);
                                }}
                                className="flex-1 py-3 bg-green-600 text-white rounded-lg text-xs font-bold uppercase"
                            >
                                Finalize
                            </button>
                        </div>
                    ) : (
                        <button 
                            onClick={() => setConfirmingAction('END_AUCTION')}
                            disabled={isProcessing}
                            className="btn-golden w-full font-bold py-4 rounded-lg flex items-center justify-center tracking-wide"
                        >
                            {isProcessing ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : "GENERATE SUMMARY & FINISH"}
                        </button>
                    )}
                </div>
            </div>
          );
      }

      // 1. ACTIVE ROUND CONTROLS (SOLD / UNSOLD)
      if (isRoundActive) {
          if (isSellingMode) {
              return (
                  <div className="bg-primary/20 p-3 rounded-lg border border-gray-600 animate-fade-in space-y-3">
                      <div className="flex items-center gap-2 mb-2 text-white font-bold border-b border-gray-600 pb-1">
                          <Check className="w-4 h-4 text-green-500" /> Confirm Sale
                      </div>
                      
                      {/* Inline Form */}
                      <div>
                          <label className="block text-[10px] text-text-secondary uppercase font-bold mb-1">Sold To Team</label>
                           <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 py-1">
                              {teams.map(t => (
                                  <button 
                                      key={t.id}
                                      type="button"
                                      onClick={() => setSelectedTeamId(String(t.id))}
                                      className={`p-2 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border-2 text-left flex flex-col justify-between h-14 ${String(selectedTeamId) === String(t.id) ? 'bg-gradient-to-br from-green-600 to-green-700 border-green-400 text-white shadow-lg shadow-green-500/20 scale-105 z-10' : 'bg-primary border-gray-600 text-gray-400 hover:border-gray-500'}`}
                                  >
                                      <span className="truncate w-full">{t.name}</span>
                                      <span className={`text-[9px] ${String(selectedTeamId) === String(t.id) ? 'text-green-100' : 'text-gray-500'}`}>₹{t.budget}</span>
                                  </button>
                              ))}
                           </div>
                      </div>
                      
                      <div>
                          <label className="block text-[10px] text-text-secondary uppercase font-bold mb-1">Final Price</label>
                          <div className="relative">
                              <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                              <input 
                                type="number" 
                                value={finalPrice} 
                                onChange={(e) => setFinalPrice(Number(e.target.value))}
                                className="w-full bg-primary border border-gray-600 rounded p-2 pl-8 text-sm text-white font-bold outline-none focus:border-green-500"
                              />
                          </div>
                      </div>

                      <div className="flex gap-2 pt-1">
                          <button 
                            onClick={cancelSell}
                            className="btn-golden flex-1 py-2 rounded text-sm"
                          >
                              Cancel
                          </button>
                          <button 
                            onClick={confirmSell}
                            disabled={isProcessing}
                            className="btn-golden flex-1 py-2 rounded text-sm font-bold flex items-center justify-center"
                          >
                              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Confirm'}
                          </button>
                      </div>
                  </div>
              );
          }

          return (
              <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={handleSellClick}
                        disabled={isProcessing}
                        className="btn-golden flex flex-col items-center justify-center disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed font-bold py-4 px-2 rounded-lg"
                      >
                          {isProcessing ? <Loader2 className="mb-1 h-6 w-6 animate-spin"/> : <Check className="mb-1 h-6 w-6"/>}
                          {isProcessing ? 'SELLING...' : 'SOLD'}
                      </button>
                      <button 
                        onClick={handlePass}
                        disabled={isProcessing}
                        className="btn-golden flex flex-col items-center justify-center disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed font-bold py-4 px-2 rounded-lg"
                      >
                          {isProcessing ? <Loader2 className="mb-1 h-6 w-6 animate-spin"/> : <X className="mb-1 h-6 w-6"/>}
                          UNSOLD
                      </button>
                  </div>
                  {/* Inline Cancel / Change Player Button */}
                  {confirmingAction === 'CANCEL_ROUND' ? (
                      <div className="flex gap-2">
                          <button onClick={() => setConfirmingAction(null)} className="flex-1 py-2 bg-gray-600 text-white rounded-lg text-[10px] font-bold uppercase transition-all">Back</button>
                          <button 
                            onClick={async () => {
                                setIsProcessing(true);
                                await undoPlayerSelection();
                                setConfirmingAction(null);
                                setIsProcessing(false);
                            }}
                            className="flex-1 py-2 bg-red-600 text-white rounded-lg text-[10px] font-bold uppercase transition-all shadow-[0_0_10px_rgba(220,38,38,0.5)]"
                          >
                            Confirm Cancel
                          </button>
                      </div>
                  ) : confirmingAction === 'PASS_PLAYER' ? (
                    <div className="flex gap-2 animate-bounce">
                        <button onClick={() => setConfirmingAction(null)} className="flex-1 py-2 bg-gray-600 text-white rounded-lg text-[10px] font-bold">No</button>
                        <button 
                          onClick={async () => {
                              setIsProcessing(true);
                              const pid = state.currentPlayerId ? String(state.currentPlayerId) : '';
                              const pName = players.find(p => String(p.id) === String(pid))?.name || 'Player';
                              await passPlayer();
                              setLastAction({ playerId: String(pid), type: 'UNSOLD', name: pName });
                              setConfirmingAction(null); // Added missing line to clear confirmation
                              setIsProcessing(false);
                          }}
                          className="flex-1 py-2 bg-red-600 text-white rounded-lg text-[10px] font-bold shadow-[0_0_10px_rgba(220,38,38,0.3)]"
                        >
                            Mark UNSOLD
                        </button>
                    </div>
                  ) : (
                    <button 
                        onClick={handleCancelSelection} 
                        disabled={isProcessing}
                        className="btn-golden w-full py-2 rounded-lg text-xs"
                    >
                        <Undo2 className="w-4 h-4 mr-1" /> Change Player / Cancel Round
                    </button>
                  )}
              </div>
          );
      }

      // 2. NEXT PLAYER SELECTION (Fully Inline Options)
      if (playerSelectionMode === 'MANUAL') {
           let availablePlayers = players.filter(p => p.status !== 'SOLD' && p.status !== 'UNSOLD');
           if (showUnsold) {
               const unsoldList = players.filter(p => p.status === 'UNSOLD');
               availablePlayers = [...availablePlayers, ...unsoldList];
           }
           
           availablePlayers.sort((a, b) => a.name.localeCompare(b.name));

           const filteredPlayers = availablePlayers.filter(p => {
               const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                     p.category.toLowerCase().includes(searchTerm.toLowerCase());
               const matchesCategory = filterCategory === 'ALL' || p.category === filterCategory;
               const matchesRole = filterRole === 'ALL' || (p.role === filterRole || p.speciality === filterRole);
               return matchesSearch && matchesCategory && matchesRole;
           });
 
           return (
               <div className="space-y-4 bg-primary/20 p-4 rounded-2xl border border-gray-700 shadow-xl">
                   <div className="space-y-3">
                       <div className="flex justify-between items-center px-1">
                           <label className="block text-[10px] text-gray-400 uppercase font-black tracking-widest">Player Pool</label>
                           <label className="flex items-center text-[10px] text-amber-500 cursor-pointer hover:text-amber-400 transition-colors bg-amber-500/5 px-2 py-1 rounded-lg border border-amber-500/10">
                               <input type="checkbox" checked={showUnsold} onChange={(e) => setShowUnsold(e.target.checked)} className="mr-2 accent-amber-500" />
                               Include Unsold
                           </label>
                       </div>
                       
                       {/* Search Bar */}
                       <div className="relative">
                           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                           <input 
                                type="text"
                                className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-9 pr-4 py-2 text-[11px] h-10 text-white focus:border-blue-500/50 outline-none transition-all shadow-inner"
                                placeholder="Search player name or info..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                           />
                       </div>

                       {/* Filter by Category Buttons */}
                       <div className="space-y-2">
                            <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] px-1">Filter by Category</span>
                            <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                                <button
                                   onClick={() => setFilterCategory('ALL')}
                                   className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm transition-all border shrink-0
                                       ${filterCategory === 'ALL' 
                                           ? 'bg-amber-500 border-amber-400 text-black scale-105 z-10 shadow-lg shadow-amber-500/20' 
                                           : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'}
                                   `}
                                >
                                    ALL BOARDS
                                </button>
                                {categories.map(cat => (
                                    <button
                                       key={cat.id || cat.name}
                                       onClick={() => setFilterCategory(cat.name)}
                                       className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm transition-all border shrink-0
                                           ${filterCategory === cat.name 
                                               ? 'bg-blue-600 border-blue-400 text-white scale-105 z-10 shadow-lg shadow-blue-500/20' 
                                               : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'}
                                       `}
                                    >
                                        {cat.name.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                       </div>

                       {/* Filter by Role Buttons */}
                       <div className="space-y-2">
                            <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] px-1">Filter by Role</span>
                            <div className="flex flex-wrap gap-1.5">
                                {['ALL', 'BATSMAN', 'BOWLER', 'ALL-ROUNDER', 'WICKETKEEPER'].map(role => (
                                    <button
                                       key={role}
                                       onClick={() => setFilterRole(role)}
                                       className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm transition-all border
                                           ${filterRole === role 
                                               ? 'bg-blue-600 border-blue-400 text-white scale-105 z-10 shadow-lg shadow-blue-500/20' 
                                               : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'}
                                       `}
                                    >
                                        {role}
                                    </button>
                                ))}
                            </div>
                       </div>

                       {/* Options listed directly as per instructions */}
                       <div className="max-h-56 overflow-y-auto border border-gray-800 rounded-2xl bg-gray-950 custom-scrollbar shadow-inner">
                            {filteredPlayers.length > 0 ? filteredPlayers.map(p => (
                                <div 
                                    key={p.id}
                                    onClick={() => setManualPlayerId(String(p.id))}
                                    className={`px-4 py-3 cursor-pointer border-b border-gray-900 last:border-0 transition-all flex items-center gap-3 ${manualPlayerId === String(p.id) ? 'bg-blue-600/10 border-l-4 border-l-blue-500' : 'hover:bg-white/5'}`}
                                >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${manualPlayerId === String(p.id) ? 'bg-blue-600 border-blue-400 text-white' : 'bg-gray-800 border-gray-700 text-gray-500'}`}>
                                       <User className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex justify-between items-center mb-0.5">
                                            <span className={`text-[11px] font-black uppercase tracking-tight truncate ${manualPlayerId === String(p.id) ? 'text-blue-400' : 'text-gray-100'}`}>{p.name}</span>
                                            <span className="text-[10px] font-mono text-green-500 font-bold">₹{p.basePrice?.toLocaleString()}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{p.category}</span>
                                            <div className="w-1 h-1 rounded-full bg-gray-700"></div>
                                            <span className="text-[9px] font-bold text-blue-500/80 uppercase tracking-widest">{p.role || p.speciality}</span>
                                            
                                            {p.status === 'UNSOLD' && (
                                               <div className="ml-auto flex items-center gap-2 animate-fade-in">
                                                   {confirmingAction === `RESET_UNSOLD_${p.id}` ? (
                                                       <div className="flex items-center gap-2">
                                                           <button 
                                                               onClick={async (e) => {
                                                                   e.stopPropagation();
                                                                   setIsProcessing(true);
                                                                   try { await correctPlayerSale(String(p.id), null, 0); } catch(e){}
                                                                   finally { setIsProcessing(false); setConfirmingAction(null); }
                                                               }}
                                                               className="text-green-500 hover:bg-green-500/10 px-1.5 py-0.5 rounded text-[8px] font-black uppercase"
                                                           >
                                                               Confirm Reset
                                                           </button>
                                                           <button 
                                                               onClick={(e) => { e.stopPropagation(); setConfirmingAction(null); }}
                                                               className="text-gray-500 hover:text-white text-[8px] font-black uppercase"
                                                           >
                                                               X
                                                           </button>
                                                       </div>
                                                   ) : (
                                                       <button 
                                                           onClick={(e) => { e.stopPropagation(); setConfirmingAction(`RESET_UNSOLD_${p.id}`); }}
                                                           className="text-[8px] bg-red-900/40 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full hover:bg-red-900/60 transition-colors uppercase font-black tracking-widest"
                                                       >
                                                           Unsold (Reset?)
                                                       </button>
                                                   )}
                                               </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="py-12 text-center text-gray-600 text-[10px] font-black uppercase tracking-[0.25em]">No players available</div>
                            )}
                       </div>
                   </div>

                   <button 
                     onClick={() => handleStart(manualPlayerId)} 
                     disabled={isStartDisabled || !manualPlayerId}
                     className={`w-full flex items-center justify-center font-black uppercase tracking-[0.2em] py-4 px-6 rounded-2xl transition-all shadow-2xl
                       ${manualPlayerId 
                           ? 'bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white shadow-blue-500/20 active:scale-95' 
                           : 'bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700'}
                     `}
                   >
                       {isProcessing ? <Loader2 className="mr-3 h-5 w-5 animate-spin"/> : <Play className="mr-3 h-5 w-5"/>} 
                       {manualPlayerId && players.find(p => String(p.id) === manualPlayerId)?.status === 'UNSOLD' ? 'Re-Auction Player' : 'Bring to Board'}
                   </button>
               </div>
           );
      }

      // AUTO MODE
      return (
          <button 
            onClick={() => handleStart()} 
            disabled={isStartDisabled}
            className="btn-golden w-full flex items-center justify-center font-bold py-4 px-4 rounded-lg"
          >
              {isProcessing ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <Shuffle className="mr-2 h-5 w-5"/>} 
              {state.status === AuctionStatus.NotStarted ? 'Start Auction (Auto Random)' : 'Next Random Player'}
          </button>
      );
  }

  // --- RENDER QUICK BID BUTTONS (Inline Grid) ---
  const renderQuickBidButtons = () => {
        if (!isRoundActive || isSellingMode) return null;

        return (
            <div className="mb-4">
                <h3 className="text-xs font-bold text-text-secondary uppercase mb-2 flex items-center">
                    <Zap className="w-3 h-3 mr-1 text-yellow-400" /> Quick Bids (Next: {nextBid})
                </h3>
                <div className="grid grid-cols-2 gap-2">
                    {teams.map(team => {
                        let allowed = true;
                        let reason = '';
                        if (team.budget < nextBid) { allowed = false; reason = 'NO FUNDS'; }
                        else if (state.highestBidder?.id === team.id) { allowed = false; reason = 'LEADING'; }
                        else if (team.players.length >= (maxPlayersPerTeam || 25)) { allowed = false; reason = 'FULL'; }
                        else if (currentPlayer) {
                            if (currentPlayer.category) {
                                const catConfig = categories.find(c => c.name === currentPlayer.category);
                                if (catConfig && catConfig.maxPerTeam > 0) {
                                    const count = team.players.filter(p => p.category === currentPlayer.category).length;
                                    if (count >= catConfig.maxPerTeam) { allowed = false; reason = 'CAT LIMIT'; }
                                }
                            }
                            if (allowed) {
                                let reservedBudget = 0;
                                categories.forEach(cat => {
                                    if (cat.maxPerTeam > 0) {
                                        const playersInCat = team.players.filter(p => p.category === cat.name).length;
                                        let slotsToFill = Math.max(0, cat.maxPerTeam - playersInCat);
                                        if (currentPlayer.category === cat.name) {
                                            slotsToFill = Math.max(0, slotsToFill - 1);
                                        }
                                        reservedBudget += slotsToFill * cat.basePrice;
                                    }
                                });
                                const maxAllowedBid = team.budget - reservedBudget;
                                if (nextBid > maxAllowedBid) { allowed = false; reason = 'MAX BID'; }
                            }
                        }

                        return (
                            <button
                                key={team.id}
                                onClick={() => handleQuickBid(team.id)}
                                disabled={!allowed || isProcessing}
                                className={`
                                    flex items-center justify-between px-2 py-2 rounded border text-left transition-all relative group
                                    ${allowed 
                                        ? 'bg-white border-gray-300 hover:border-green-500 hover:shadow-md active:scale-95' 
                                        : 'bg-gray-200 border-transparent opacity-60 cursor-not-allowed'}
                                `}
                            >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                    {team.logoUrl ? (
                                        <img src={team.logoUrl} className="w-6 h-6 rounded-full object-contain bg-gray-100 flex-shrink-0" alt="" />
                                    ) : (
                                        <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-[10px] font-bold text-gray-600 flex-shrink-0">
                                            {team.name.charAt(0)}
                                        </div>
                                    )}
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-xs font-bold text-gray-800 truncate leading-none">{team.name}</span>
                                        <span className="text-[9px] text-gray-500 font-mono leading-none mt-0.5">{team.budget}</span>
                                    </div>
                                </div>
                                
                                <div className="flex-shrink-0 ml-1">
                                    {!allowed ? (
                                        <span className="text-[8px] font-black text-red-500 uppercase bg-red-100 px-1 rounded">{reason}</span>
                                    ) : (
                                        <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded group-hover:bg-green-600 group-hover:text-white transition-colors">
                                            +{nextBid}
                                        </span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
  };

  return (
    <div className="bg-secondary p-4 rounded-lg shadow-lg h-full flex flex-col border border-gray-700 relative">
      
      <div className="flex justify-between items-center mb-4 border-b border-accent pb-2">
          <div className="flex flex-col gap-2 w-full">
              <div className="flex justify-between items-center w-full">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-bold text-highlight uppercase tracking-wider">Auctioneer</h2>
                  <div className="flex bg-gray-800 rounded-xl p-1 border border-gray-700">
                    <button 
                      onClick={() => setActiveTab('AUCTION')}
                      className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'AUCTION' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-400'}`}
                    >
                      Auction
                    </button>
                    <button 
                      onClick={() => setActiveTab('TRADING')}
                      className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'TRADING' ? 'bg-amber-500 text-black' : 'text-gray-500 hover:text-gray-400'}`}
                    >
                      Trading
                    </button>
                  </div>
                </div>
                <button onClick={() => navigate('/admin')} className="text-xs text-text-secondary hover:text-white flex items-center">
                    <ArrowLeft className="w-3 h-3 mr-1"/> Dashboard
                </button>
              </div>
              
              {/* Quick Actions & Inline Status Segments */}
              <div className="flex flex-wrap gap-2 items-center bg-primary/50 rounded-lg p-2 w-full">
                  <div className="flex items-center gap-1">
                    <button 
                        onClick={(e) => { e.stopPropagation(); copyOBSLink('transparent'); }}
                        className="p-1.5 rounded hover:bg-white/10 text-highlight transition-colors"
                        title="Copy OBS Transparent Link"
                    >
                        <Cast className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); copyOBSLink('green'); }}
                        className="p-1.5 rounded hover:bg-white/10 text-green-400 transition-colors"
                        title="Copy Projector View Link"
                    >
                        <Monitor className="w-4 h-4" />
                    </button>
                    
                    {/* Bidding Status Segmented Buttons listed directly */}
                    <div className="flex bg-gray-800 rounded-xl p-1.5 ml-1 overflow-hidden border border-gray-700 shadow-inner">
                        <button 
                            onClick={() => updateBiddingStatus('ON')}
                            className={`px-5 py-2 rounded-lg text-[10px] font-black transition-all flex items-center ${biddingStatus === 'ON' ? 'bg-green-600 text-white shadow-[0_0_15px_rgba(22,163,74,0.4)] scale-105 z-10' : 'text-gray-500 hover:text-gray-300 bg-transparent'}`}
                        >
                            <Unlock className={`w-3.5 h-3.5 mr-1.5 ${biddingStatus === 'ON' ? 'animate-pulse' : ''}`}/> ON
                        </button>
                        <button 
                            onClick={() => updateBiddingStatus('PAUSED')}
                            className={`px-5 py-2 rounded-lg text-[10px] font-black transition-all flex items-center ${biddingStatus !== 'ON' ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)] scale-105 z-10' : 'text-gray-500 hover:text-gray-300 bg-transparent'}`}
                        >
                            <Lock className="w-3.5 h-3.5 mr-1.5"/> OFF
                        </button>
                    </div>
                  </div>
              </div>

              {/* Display & Sponsors Toolbar (Buttons for layouts) */}
              <div className="flex flex-col gap-3 bg-primary/50 shadow-inner rounded-xl p-3 w-full mt-1 border border-gray-800">
                  <div className="space-y-2">
                      <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] px-1">Projector Theme</span>
                      <div className="flex flex-wrap gap-1.5">
                          {['STANDARD', 'IPL', 'MODERN', 'ADVAYA', 'FUTURISTIC', 'NEON'].map(l => (
                              <button
                                key={l}
                                onClick={() => updateTheme('PROJECTOR', l as ProjectorLayout)}
                                className={`px-2 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all border
                                    ${state.projectorLayout === l 
                                        ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/20' 
                                        : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'}
                                `}
                              >
                                  {l}
                              </button>
                          ))}
                      </div>
                  </div>
                                  <div className="space-y-2">
                      <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] px-1">OBS Overlay Theme</span>
                      <div className="flex flex-wrap gap-1.5">
                          {['STANDARD', 'EMERALD_GOLD', 'ADVAYA', 'MINIMAL', 'VERTICAL'].map(l => (
                              <button
                                key={l}
                                onClick={() => updateTheme('OBS', l as OBSLayout)}
                                className={`px-2 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all border
                                    ${state.obsLayout === l 
                                        ? l === 'STANDARD' ? 'bg-[#2A0A5E] border-[#00E5FF] text-white shadow-lg shadow-[#00E5FF]/20' : l === 'EMERALD_GOLD' ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-500/20' : 'bg-green-600 border-green-400 text-white shadow-lg shadow-green-500/20' 
                                        : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'}
                                `}
                              >
                                  {l === 'STANDARD' ? '💜 Purple (Standard)' : l === 'EMERALD_GOLD' ? '💚 Green (Emerald Gold)' : l.replace('_', ' ')}
                              </button>
                          ))}
                      </div>
                  </div>
              </div>

                  <div className="w-px h-8 bg-gray-600 mx-1"></div>

                  <div className="flex flex-col gap-1 items-end">
                      <span className="text-[9px] text-gray-400 font-bold uppercase">Sponsors</span>
                      <div className="flex items-center gap-1">
                          <button 
                              onClick={() => updateSponsorVisibility('PROJECTOR')}
                              className={`p-1 rounded flex items-center gap-1 text-[9px] font-bold border transition-colors ${state.sponsorConfig?.showOnProjector ? 'bg-blue-600 border-blue-400 text-white' : 'bg-gray-800 border-gray-600 text-gray-400'}`}
                              title="Toggle on Projector"
                          >
                              <Monitor className="w-3 h-3"/> Proj
                          </button>
                          <button 
                              onClick={() => updateSponsorVisibility('OBS')}
                              className={`p-1 rounded flex items-center gap-1 text-[9px] font-bold border transition-colors ${state.sponsorConfig?.showOnOBS ? 'bg-purple-600 border-purple-400 text-white' : 'bg-gray-800 border-gray-600 text-gray-400'}`}
                              title="Toggle on OBS"
                          >
                              <Cast className="w-3 h-3"/> OBS
                          </button>
                          <div className="relative group w-10">
                              <input 
                                  type="number" 
                                  className="w-full bg-gray-800 text-white text-[9px] p-1 rounded border border-gray-600 text-center outline-none" 
                                  value={sponsorLoop}
                                  onChange={handleSponsorLoopChange}
                                  onBlur={saveSponsorLoop}
                                  title="Loop Interval (Sec)"
                              />
                              <Clock className="w-2 h-2 absolute top-0.5 right-0.5 text-gray-500 pointer-events-none"/>
                          </div>
                      </div>
                  </div>
              </div>

      {/* SELECTION MODE TOGGLE (Inline Segments) */}
      <div className="bg-primary/40 rounded-2xl p-3 mb-4 flex flex-col gap-3 border border-gray-700 shadow-xl">
          <div className="flex justify-between items-center px-1">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Selection Mode</span>
              <div className="flex bg-gray-900 rounded-xl p-1 border border-gray-800 overflow-hidden shadow-inner">
                  <button 
                    onClick={playerSelectionMode !== 'MANUAL' ? toggleSelectionMode : undefined}
                    className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${playerSelectionMode === 'MANUAL' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] scale-105 z-10' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                      Manual
                  </button>
                  <button 
                    onClick={playerSelectionMode !== 'AUTO' ? toggleSelectionMode : undefined}
                    className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${playerSelectionMode === 'AUTO' ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)] scale-105 z-10' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                      Auto
                  </button>
              </div>
          </div>

          <div className="h-px bg-gray-800/50 w-full"></div>

          <div className="flex flex-col gap-2">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Admin View Override</span>
              <div className="flex flex-wrap gap-2 p-1">
                  {[
                      { id: 'NONE', label: 'None', color: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400' },
                      { id: 'SQUAD', label: 'Squad View', color: 'bg-white border border-gray-200 text-gray-700' },
                      { id: 'PURSES', label: 'Team Purses', color: 'bg-white border border-gray-200 text-gray-700' },
                      { id: 'TRADING', label: 'Trading Board', color: 'bg-white border border-gray-200 text-gray-700' },
                      { id: 'LEADERBOARD', label: 'Leaderboard', color: 'bg-white border border-gray-200 text-gray-700' }
                  ].map(view => (
                      <button
                        key={view.id}
                        onClick={() => {
                            if (view.id === 'NONE') {
                                setAdminView({ type: 'NONE' });
                            } else if (view.id === 'SQUAD') {
                                // Default to first team if none selected
                                setAdminView({ type: 'SQUAD', data: { teamId: teams[0]?.id } });
                            } else {
                                setAdminView({ type: view.id as any });
                            }
                        }}
                        className={`flex-1 min-w-[100px] px-3 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all text-center
                            ${(state.adminViewOverride?.type === view.id) 
                                ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/20 scale-105 z-10 border-blue-400' 
                                : view.color}
                        `}
                      >
                          {view.label}
                      </button>
                  ))}
              </div>
              {state.adminViewOverride?.type === 'SQUAD' && state.adminViewOverride.data?.teamId && (
                  <div className="flex flex-wrap gap-1.5 p-1 bg-black/20 rounded-xl border border-white/5 mt-1 overflow-x-auto pb-2">
                      {teams.map(team => (
                          <button
                            key={team.id}
                            onClick={() => setAdminView({ type: 'SQUAD', data: { teamId: team.id } })}
                            className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all flex-shrink-0
                                ${state.adminViewOverride?.data?.teamId === team.id 
                                    ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20' 
                                    : 'bg-gray-800/50 text-gray-500 hover:text-white'}
                            `}
                          >
                              {team.name}
                          </button>
                      ))}
                  </div>
              )}
          </div>
      </div>

      <div className="mb-6 space-y-3">
         {/* UNDO BANNER */}
         {lastAction && (
             <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-700 p-3 rounded shadow-md flex justify-between items-center animate-fade-in mb-4">
                 <div className="flex items-center text-xs">
                     <AlertOctagon className="w-4 h-4 mr-2" />
                     <span>Just marked <b>{lastAction.name}</b> as <b>{lastAction.type}</b></span>
                 </div>
                 <div className="flex gap-2">
                     {confirmingAction === 'UNDO_LAST' ? (
                         <div className="flex gap-1">
                             <button onClick={() => setConfirmingAction(null)} className="bg-gray-500 text-white text-[10px] px-2 py-1 rounded">No</button>
                             <button 
                                onClick={async () => {
                                    setIsProcessing(true);
                                    try {
                                        await correctPlayerSale(lastAction!.playerId, null, 0);
                                        setLastAction(null);
                                    } catch (e) { console.error(e); }
                                    finally { setIsProcessing(false); setConfirmingAction(null); }
                                }}
                                className="bg-red-600 text-white text-[10px] px-2 py-1 rounded"
                             >
                                 Yes, Undo
                             </button>
                         </div>
                     ) : (
                        <button 
                            onClick={handleUndoLastAction}
                            disabled={isProcessing}
                            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-1.5 rounded flex items-center transition-colors"
                        >
                            <Undo2 className="w-3 h-3 mr-1"/> Undo
                        </button>
                     )}
                     <button onClick={() => setLastAction(null)} className="text-amber-500 hover:text-amber-800"><X className="w-4 h-4"/></button>
                 </div>
             </div>
         )}

         {confirmingAction === 'RESET_PLAYER' && (
             <div className="bg-red-900/30 border border-red-500 p-3 rounded-lg mb-4 flex justify-between items-center animate-fade-in">
                 <span className="text-white text-xs font-bold">Clear current bids?</span>
                 <div className="flex gap-2">
                    <button onClick={() => setConfirmingAction(null)} className="px-3 py-1 bg-white/10 text-white rounded text-[10px]">Cancel</button>
                    <button 
                        onClick={async () => {
                            setIsProcessing(true);
                            await resetCurrentPlayer();
                            setConfirmingAction(null);
                            setIsProcessing(false);
                        }}
                        className="px-3 py-1 bg-red-600 text-white rounded text-[10px] font-bold"
                    >
                        Confirm
                    </button>
                 </div>
             </div>
         )}

         {confirmingAction === 'RESET_FULL' && (
             <div className="bg-red-900 border border-red-500 p-4 rounded-lg mb-4 animate-fade-in">
                 <p className="text-white text-xs font-black uppercase mb-3 text-center">Full Reset: Status will be 'Not Started'. Continue?</p>
                 <div className="flex gap-2">
                    <button onClick={() => setConfirmingAction(null)} className="flex-1 py-2 bg-white/10 text-white rounded text-[10px] uppercase font-black tracking-widest">Back</button>
                    <button 
                        onClick={async () => {
                            setIsProcessing(true);
                            await resetAuction();
                            setConfirmingAction(null);
                            setIsProcessing(false);
                        }}
                        className="flex-1 py-2 bg-red-600 text-white rounded text-[10px] uppercase font-black tracking-widest shadow-lg shadow-red-900/50"
                    >
                        Reset All
                    </button>
                 </div>
             </div>
         )}

         {getControlButtons()}
         
         {renderQuickBidButtons()}

         {!isSellingMode && (
             <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-accent/30">
                 <button 
                    onClick={handleResetPlayer} 
                    disabled={isProcessing || !state.currentPlayerId}
                    className="btn-golden flex flex-col items-center justify-center text-[10px] py-3 rounded-lg transition-all disabled:opacity-30 disabled:grayscale grayscale-0"
                    title="Clears bids for current player only"
                 >
                    <RotateCcw className={`mb-1 h-5 w-5 ${isProcessing ? 'animate-spin' : ''}`}/>
                    RESET CURRENT
                 </button>
                 <button 
                    onClick={handleResetFull} 
                    disabled={isProcessing}
                    className="btn-golden flex flex-col items-center justify-center text-[10px] py-3 rounded-lg transition-all disabled:opacity-30 border border-red-500/20"
                    title="Resets auction status to Not Started"
                 >
                    <AlertOctagon className={`mb-1 h-5 w-5 ${isProcessing ? 'animate-spin' : ''}`}/>
                    RESET FULL
                 </button>
             </div>
         )}
      </div>

      {activeTab === 'TRADING' ? (
        <div className="flex-grow overflow-y-auto no-scrollbar pt-2 pb-10">
          <TradingPanel />
        </div>
      ) : (
        <>
          <h3 className="text-sm font-bold mb-3 text-text-secondary uppercase">Teams Overview</h3>
          <div className="flex-grow overflow-y-auto space-y-3 pr-1 custom-scrollbar">
            {teams.map((team: Team) => (
              <TeamStatusCard key={team.id} team={team} />
            ))}
          </div>
        </>
      )}
      </div>
    </div>
  );
};

export default LiveAdminPanel;