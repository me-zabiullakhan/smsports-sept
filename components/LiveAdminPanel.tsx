import React, { useState, useEffect, useMemo } from 'react';
import { useAuction } from '../hooks/useAuction';
import { useTheme } from '../contexts/ThemeContext';
import { AuctionStatus, Team, Player, ProjectorLayout, OBSLayout, UserRole } from '../types';
import TeamStatusCard from '../components/TeamStatusCard';
import { Play, Check, X, ArrowLeft, Loader2, RotateCcw, AlertOctagon, DollarSign, Cast, Lock, Unlock, Monitor, ChevronDown, Shuffle, Search, User, Palette, Trophy, Gavel, Wallet, Eye, EyeOff, Clock, Zap, Undo2, RefreshCw, LayoutList, ShieldAlert, CreditCard, AlertTriangle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { calculateMaxBid, getEffectiveBasePrice } from '../utils';

const LiveAdminPanel: React.FC = () => {
  const { state, userProfile, sellPlayer, passPlayer, startAuction, undoPlayerSelection, endAuction, resetAuction, resetCurrentPlayer, resetUnsoldPlayers, updateBiddingStatus, toggleSelectionMode, updateTheme, activeAuctionId, placeBid, nextBid, updateSponsorConfig, correctPlayerSale, setAdminView, repairAuctionDocument } = useAuction();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { teams, players, biddingStatus, playerSelectionMode, categories, maxPlayersPerTeam } = state;
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);

  // Move isRoundActive to component scope to ensure it's accessible by all inner functions
  const isRoundActive = state.status === AuctionStatus.InProgress && state.currentPlayerId;
  
  // Logic: Only block bidding if it's NOT a paid plan AND there are more than 2 teams.
  // This allows free users to test the app with up to 2 teams.
  const isFreeTrialAllowed = teams.length <= 2;
  const hasPaidPlan = state.isPaid === true || userProfile?.role === UserRole.SUPER_ADMIN || isFreeTrialAllowed;

  // Inline Sell State
  const [isSellingMode, setIsSellingMode] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [finalPrice, setFinalPrice] = useState<number>(0);

  // Manual Player Selection State
  const [manualPlayerId, setManualPlayerId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState(''); // New search state
  const [showUnsold, setShowUnsold] = useState(false); // Toggle to include unsold players

  // Undo State
  const [lastAction, setLastAction] = useState<{playerId: string, type: 'SOLD' | 'UNSOLD', name: string} | null>(null);

  const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'error' | 'success' } | null>(null);

  const showNotification = (message: string, type: 'error' | 'success' = 'error') => {
      setNotification({ message, type });
      setTimeout(() => setNotification(null), 5000);
  };

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
          if (p) setFinalPrice(getEffectiveBasePrice(p, state.categories));
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

  const handleStart = async (specificId?: string) => {
      if (!hasPaidPlan) {
          showNotification(`Auction cannot be started: Free plan is limited to 2 teams. You have created ${teams.length} teams. Please purchase a plan to start the auction.`, "error");
          return;
      }

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
          setConfirmAction({
              title: "Pool Empty",
              message: "No more players available in the pool. Do you want to MARK AUCTION AS COMPLETED?",
              onConfirm: async () => {
                  await endAuction();
                  setConfirmAction(null);
              }
          });
      } else {
          // Clear manual selection
          setManualPlayerId('');
          setSearchTerm('');
      }
      setIsProcessing(false);
  }

  const handleResetFull = async () => {
      setConfirmAction({
          title: "Reset Auction",
          message: "WARNING: This will reset the auction status to 'Not Started'. It will NOT remove sold players from teams. Proceed?",
          onConfirm: async () => {
              setIsProcessing(true);
              try {
                  await resetAuction();
              } catch (e) {
                  showNotification((e as Error).message);
              } finally {
                  setIsProcessing(false);
                  setConfirmAction(null);
              }
          }
      });
  }

  const handleResetPlayer = async () => {
      setConfirmAction({
          title: "Reset Player",
          message: "This will clear the current bid and timer for this player. Proceed?",
          onConfirm: async () => {
              setIsProcessing(true);
              try {
                  await resetCurrentPlayer();
              } catch (e) {
                  showNotification((e as Error).message);
              } finally {
                  setIsProcessing(false);
                  setConfirmAction(null);
              }
          }
      });
  }

  const handleCancelSelection = async () => {
      setConfirmAction({
          title: "Change Player",
          message: "Change Player? This will cancel the current round and allow you to select a different player.",
          onConfirm: async () => {
              setIsProcessing(true);
              try {
                  await undoPlayerSelection();
              } catch (e) {
                  showNotification((e as Error).message);
              } finally {
                  setIsProcessing(false);
                  setConfirmAction(null);
              }
          }
      });
  }

  const handleUndoLastAction = async () => {
      if (!lastAction) return;
      setConfirmAction({
          title: "Undo Action",
          message: `Undo ${lastAction.type} status for ${lastAction.name}? This will return them to the pool.`,
          onConfirm: async () => {
              setIsProcessing(true);
              try {
                  await correctPlayerSale(lastAction.playerId, null, 0); // null team, 0 price = reset to pool
                  setLastAction(null);
              } catch (e) {
                  console.error(e);
                  showNotification("Failed to undo action.");
              } finally {
                  setIsProcessing(false);
                  setConfirmAction(null);
              }
          }
      });
  }

  const handleResetSingleUnsold = async (playerId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setConfirmAction({
          title: "Reset Unsold Player",
          message: "Bring this player back to pool (remove UNSOLD status)?",
          onConfirm: async () => {
              setIsProcessing(true);
              try {
                  await correctPlayerSale(playerId, null, 0);
              } catch (e) {
                  showNotification("Failed to reset player.");
              } finally {
                  setIsProcessing(false);
                  setConfirmAction(null);
              }
          }
      });
  }
  
  const copyOBSLink = (type: 'transparent' | 'green') => {
      if (!activeAuctionId) return;
      const baseUrl = window.location.href.split('#')[0];
      const route = type === 'green' ? 'obs-green' : 'obs-overlay';
      const url = `${baseUrl}#/${route}/${activeAuctionId}`;
      navigator.clipboard.writeText(url);
      showNotification("URL Copied to Clipboard!", "success");
  };
  
  const handleSellClick = () => {
      if (!hasPaidPlan) return;
      setIsSellingMode(true);
  };

  const cancelSell = () => {
      setIsSellingMode(false);
  };

  const confirmSell = async () => {
      if (!selectedTeamId) {
          showNotification("Please select a team to sell to.");
          return;
      }
      if (finalPrice <= 0) {
          showNotification("Price must be greater than 0.");
          return;
      }

      setIsProcessing(true);
      const pid = state.currentPlayerId ? String(state.currentPlayerId) : '';
      const pName = players.find(p => String(p.id) === pid)?.name || 'Player';

      try {
          await sellPlayer(selectedTeamId, finalPrice);
          setLastAction({ playerId: pid, type: 'SOLD', name: pName });
          setIsSellingMode(false);
          showNotification("Player sold successfully!", "success");
      } catch(e: any) {
          console.error(e);
          showNotification(e.message || "Failed to sell player. Check console.");
      } finally {
          setIsProcessing(false);
      }
  };

  const handlePass = async () => {
      if (!hasPaidPlan) return;
      setConfirmAction({
          title: "Mark Unsold",
          message: "Are you sure you want to mark this player as UNSOLD?",
          onConfirm: async () => {
              setIsProcessing(true);
              const pid = state.currentPlayerId ? String(state.currentPlayerId) : '';
              const pName = players.find(p => String(p.id) === String(pid))?.name || 'Player';
              try {
                  await passPlayer();
                  setLastAction({ playerId: String(pid), type: 'UNSOLD', name: pName });
              } catch (e) {
                  showNotification("Failed to mark unsold.");
              } finally {
                  setIsProcessing(false);
                  setConfirmAction(null);
              }
          }
      });
  };

  const handleQuickBid = async (teamId: string | number) => {
      if (!hasPaidPlan) return;
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
      const isStartDisabled = isProcessing || (state.status === AuctionStatus.NotStarted && (teams.length === 0 || availablePlayersCount === 0)) || !hasPaidPlan;
      const unsoldCount = players.filter(p => p.status === 'UNSOLD').length;

      // Finish Auction Option
      if (availablePlayersCount === 0 && state.status !== AuctionStatus.NotStarted && !isRoundActive) {
          return (
             <div className="space-y-4 animate-fade-in">
                 {unsoldCount > 0 && (
                     <div className={`p-4 rounded-2xl text-center shadow-inner border-2 ${isDark ? 'bg-blue-900/10 border-blue-500/30' : 'bg-blue-50 border-blue-200'}`}>
                        <h3 className={`font-black uppercase tracking-widest text-sm mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Unsold Players Available</h3>
                        <p className={`text-[10px] font-black uppercase tracking-tight mb-4 ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>There are {unsoldCount} unsold players. Do you want to bring them back into the bidding pool?</p>
                        <button 
                            onClick={async () => {
                                setConfirmAction({
                                    title: "Bring Back Unsold",
                                    message: `Bring back ${unsoldCount} unsold players to the pool?`,
                                    onConfirm: async () => {
                                        setIsProcessing(true);
                                        await resetUnsoldPlayers();
                                        setIsProcessing(false);
                                        setConfirmAction(null);
                                    }
                                });
                            }}
                            disabled={isProcessing}
                            className={`w-full font-black py-3 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center uppercase tracking-widest text-xs ${isDark ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'}`}
                        >
                            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <RotateCcw className="mr-2 h-4 w-4"/>}
                            BRING BACK UNSOLD ({unsoldCount})
                        </button>
                     </div>
                 )}
                 
                 <div className={`p-6 rounded-2xl text-center shadow-inner border-2 ${isDark ? 'bg-green-900/10 border-green-500/30' : 'bg-green-50 border-green-200'}`}>
                    <Trophy className={`w-12 h-12 mx-auto mb-3 drop-shadow-lg ${isDark ? 'text-accent' : 'text-amber-500'}`} />
                    <h3 className={`font-black uppercase tracking-widest text-lg mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Auction Completed!</h3>
                    <p className={`text-[10px] font-black uppercase tracking-tight mb-6 ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>All players have been auctioned. You can now finalize the event.</p>
                    <button 
                        onClick={async () => {
                            setConfirmAction({
                                title: "Finish Auction",
                                message: "Are you sure you want to finish the auction? This will enable the summary view for all users.",
                                onConfirm: async () => {
                                    setIsProcessing(true);
                                    await endAuction();
                                    setIsProcessing(false);
                                    setConfirmAction(null);
                                }
                            });
                        }}
                        disabled={isProcessing}
                        className={`w-full font-black py-4 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center uppercase tracking-[0.2em] text-xs ${isDark ? 'bg-green-600 hover:bg-green-500 text-white shadow-green-600/20' : 'bg-green-600 hover:bg-green-700 text-white shadow-green-600/20'}`}
                    >
                        {isProcessing ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : "GENERATE SUMMARY & FINISH"}
                    </button>
                </div>
            </div>
          );
      }

      // 1. ACTIVE ROUND CONTROLS (SOLD / UNSOLD)
      if (isRoundActive) {
          if (isSellingMode) {
              return (
                  <div className={`p-4 rounded-2xl border-2 animate-fade-in space-y-4 transition-all duration-500 ${isDark ? 'bg-black/40 border-accent/20 shadow-accent/5' : 'bg-white border-blue-500/20 shadow-blue-600/10'}`}>
                      <div className={`flex items-center gap-2 mb-2 font-black uppercase tracking-widest text-xs border-b pb-2 ${isDark ? 'text-white border-accent/10' : 'text-gray-900 border-blue-500/10'}`}>
                          <Check className={`w-4 h-4 ${isDark ? 'text-accent' : 'text-blue-600'}`} /> Confirm Sale
                      </div>
                      
                      {/* Inline Form */}
                      <div>
                          <label className={`block text-[9px] uppercase font-black tracking-widest mb-1.5 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Sold To Team</label>
                          <div className={`grid grid-cols-2 gap-1.5 overflow-y-auto max-h-40 p-1.5 rounded-xl border ${isDark ? 'bg-zinc-900/50 border-accent/10' : 'bg-gray-50 border-blue-500/10'}`}>
                              {teams.map(t => (
                                  <button 
                                    key={t.id}
                                    type="button"
                                    onClick={() => setSelectedTeamId(String(t.id))}
                                    className={`px-2 py-2 rounded-lg text-[9px] font-black uppercase tracking-tighter border transition-all truncate ${selectedTeamId === String(t.id) 
                                        ? (isDark ? 'bg-accent text-zinc-950 border-accent' : 'bg-blue-600 text-white border-blue-600') 
                                        : (isDark ? 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:text-white' : 'bg-white text-gray-500 border-gray-200 hover:text-blue-600')}`}
                                  >
                                      {t.name}
                                  </button>
                              ))}
                          </div>
                      </div>
                      
                      <div>
                          <label className={`block text-[9px] uppercase font-black tracking-widest mb-1.5 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Final Price</label>
                          <div className="relative">
                              <DollarSign className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-accent' : 'text-blue-600'}`} />
                              <input 
                                type="number" 
                                value={finalPrice} 
                                onChange={(e) => setFinalPrice(Number(e.target.value))}
                                className={`w-full border-2 rounded-xl p-3 pl-10 text-sm font-black tabular-nums transition-all outline-none ${isDark ? 'bg-zinc-900 border-accent/20 text-white focus:border-accent' : 'bg-white border-blue-500/20 text-gray-900 focus:border-blue-500'}`}
                              />
                          </div>
                      </div>

                      <div className="flex gap-3 pt-2">
                          <button 
                            onClick={cancelSell}
                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${isDark ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                          >
                              Cancel
                          </button>
                          <button 
                            onClick={confirmSell}
                            disabled={isProcessing}
                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center justify-center transition-all active:scale-95 ${isDark ? 'bg-accent text-zinc-950 hover:bg-white shadow-accent/20' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/20'}`}
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
                        disabled={isProcessing || !hasPaidPlan}
                        className={`flex flex-col items-center justify-center font-black py-5 px-2 rounded-2xl transition-all shadow-xl active:scale-95 ${isDark 
                            ? 'bg-green-500 text-black hover:bg-white shadow-green-500/10' 
                            : 'bg-green-600 text-white hover:bg-green-700 shadow-green-600/10'} 
                            disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed`}
                      >
                          {isProcessing ? <Loader2 className="mb-1 h-6 w-6 animate-spin"/> : <Check className="mb-1 h-6 w-6"/>}
                          <span className="text-[10px] uppercase tracking-[0.2em]">{isProcessing ? 'SELLING...' : 'SOLD'}</span>
                      </button>
                      <button 
                        onClick={handlePass}
                        disabled={isProcessing || !hasPaidPlan}
                        className={`flex flex-col items-center justify-center font-black py-5 px-2 rounded-2xl transition-all shadow-xl active:scale-95 ${isDark 
                            ? 'bg-red-500 text-white hover:bg-white hover:text-black shadow-red-500/10' 
                            : 'bg-red-600 text-white hover:bg-red-700 shadow-red-600/10'} 
                            disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed`}
                      >
                          {isProcessing ? <Loader2 className="mb-1 h-6 w-6 animate-spin"/> : <X className="mb-1 h-6 w-6"/>}
                          <span className="text-[10px] uppercase tracking-[0.2em]">UNSOLD</span>
                      </button>
                  </div>
                  {/* Inline Cancel / Change Player Button */}
                  <button 
                    onClick={handleCancelSelection} 
                    disabled={isProcessing}
                    className={`w-full flex items-center justify-center font-black py-3 rounded-xl text-[9px] uppercase tracking-[0.2em] transition-all shadow-md active:scale-95 ${isDark ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  >
                      <Undo2 className="w-4 h-4 mr-2" /> Change Player / Cancel Round
                  </button>
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

           const filteredPlayers = availablePlayers.filter(p => 
               p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
               p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
               (p as any).playerNumber?.toString().includes(searchTerm)
           );

           return (
               <div className={`p-4 rounded-2xl border-2 space-y-4 transition-all duration-500 ${isDark ? 'bg-black/40 border-accent/20' : 'bg-white border-blue-500/20'}`}>
                   <div>
                       <div className="flex justify-between items-center mb-2">
                           <label className={`block text-[9px] uppercase font-black tracking-widest ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Select Next Player</label>
                           <label className={`flex items-center text-[9px] font-black uppercase tracking-widest cursor-pointer ${isDark ? 'text-accent' : 'text-blue-600'}`}>
                               <input type="checkbox" checked={showUnsold} onChange={(e) => setShowUnsold(e.target.checked)} className={`mr-2 rounded-sm ${isDark ? 'accent-accent' : 'accent-blue-600'}`} />
                               Include Unsold
                           </label>
                       </div>
                       
                       {/* Inline Search Input */}
                       <div className="relative mb-3">
                           <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isDark ? 'text-zinc-600' : 'text-gray-400'}`} />
                           <input 
                                type="text"
                                className={`w-full border-2 rounded-xl p-2.5 pl-10 text-xs font-black uppercase tracking-tight transition-all outline-none ${isDark ? 'bg-zinc-900 border-accent/10 text-white focus:border-accent' : 'bg-gray-50 border-blue-500/10 text-gray-900 focus:border-blue-500'}`}
                                placeholder="Search player name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                           />
                       </div>

                       {/* Options listed directly as per instructions */}
                       <div className={`max-h-52 overflow-y-auto border-2 rounded-xl custom-scrollbar mb-3 ${isDark ? 'bg-zinc-900/50 border-accent/10' : 'bg-gray-50 border-blue-500/10'}`}>
                            {filteredPlayers.length > 0 ? filteredPlayers.map(p => (
                                <div 
                                    key={p.id}
                                    onClick={() => setManualPlayerId(String(p.id))}
                                    className={`p-3 text-[10px] cursor-pointer border-b last:border-0 transition-all ${manualPlayerId === String(p.id) 
                                        ? (isDark ? 'bg-accent/20 text-accent font-black border-accent/30' : 'bg-blue-50 text-blue-600 font-black border-blue-200') 
                                        : (isDark ? 'text-zinc-400 border-accent/5 hover:bg-accent/5' : 'text-gray-600 border-blue-500/5 hover:bg-blue-50/50')}`}
                                >
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <span className={`px-1.5 py-0.5 rounded-md border text-[8px] font-black ${isDark ? 'bg-zinc-800 border-zinc-700 text-accent' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
                                                #{(p as any).playerNumber || '-'}
                                            </span>
                                            <span className="uppercase tracking-tight">{p.name} <span className={`opacity-60 text-[8px] ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>({p.category})</span></span>
                                        </div>
                                        <span className="font-black tabular-nums">₹{getEffectiveBasePrice(p, state.categories).toLocaleString()}</span>
                                    </div>
                                    {p.status === 'UNSOLD' && <span className={`text-[8px] font-black uppercase tracking-[0.2em] mt-1 block ${isDark ? 'text-red-400' : 'text-red-600'}`}>Unsold</span>}
                                </div>
                            )) : (
                                <div className={`p-6 text-center text-[10px] font-black uppercase tracking-widest italic ${isDark ? 'text-zinc-600' : 'text-gray-400'}`}>No players found</div>
                            )}
                       </div>
                   </div>

                   <button 
                     onClick={() => handleStart(manualPlayerId)} 
                     disabled={isStartDisabled || !manualPlayerId}
                     className={`w-full flex items-center justify-center font-black py-4 px-4 rounded-xl transition-all shadow-xl active:scale-95 uppercase tracking-[0.2em] text-xs
                         ${isStartDisabled || !manualPlayerId
                             ? (isDark ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' : 'bg-gray-100 text-gray-400 cursor-not-allowed') 
                             : (isDark ? 'bg-accent text-zinc-950 hover:bg-white shadow-accent/20' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/20')}`
                     }
                   >
                       {isProcessing ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <Play className="mr-2 h-5 w-5"/>} 
                       {manualPlayerId && players.find(p => String(p.id) === manualPlayerId)?.status === 'UNSOLD' ? 'Re-Auction Player' : 'Start Bidding'}
                   </button>
               </div>
           );
      }

      // AUTO MODE
      return (
          <button 
            onClick={() => handleStart()} 
            disabled={isStartDisabled}
            className={`w-full flex items-center justify-center font-black py-5 px-4 rounded-2xl transition-all shadow-xl active:scale-95 uppercase tracking-[0.2em] text-sm
                ${isStartDisabled 
                    ? (isDark ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' : 'bg-gray-100 text-gray-400 cursor-not-allowed') 
                    : (isDark ? 'bg-accent text-zinc-950 hover:bg-white shadow-accent/20' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/20')}`
            }
          >
              {isProcessing ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <Shuffle className="mr-2 h-5 w-5"/>} 
              {state.status === AuctionStatus.NotStarted ? 'Start Auction (Auto Random)' : 'Next Random Player'}
          </button>
      );
  }

  // --- RENDER QUICK BID BUTTONS (Inline Grid) ---
  const renderQuickBidButtons = () => {
        if (!isRoundActive || isSellingMode || !hasPaidPlan) return null;

        return (
            <div className="mb-6">
                <h3 className={`text-[10px] font-black uppercase tracking-[0.3em] mb-3 flex items-center ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
                    <Zap className={`w-3.5 h-3.5 mr-2 ${isDark ? 'text-accent' : 'text-blue-600'}`} /> Quick Bids (Next: ₹{nextBid})
                </h3>
                <div className="grid grid-cols-2 gap-2.5">
                    {teams.map(team => {
                        let allowed = true;
                        let reason = '';
                        const maxBidResult = currentPlayer ? calculateMaxBid(team, state, currentPlayer) : null;
                        const maxPossibleBid = maxBidResult ? (state.unlimitedPurse ? team.budget : Math.max(0, Math.floor(maxBidResult.maxBid))) : team.budget;

                        if (team.budget < nextBid) { allowed = false; reason = 'NO FUNDS'; }
                        else if (state.highestBidder?.id === team.id) { allowed = false; reason = 'LEADING'; }
                        else if ((team.players || []).length >= (maxPlayersPerTeam || 25)) { allowed = false; reason = 'FULL'; }
                        else if (currentPlayer) {
                            if (currentPlayer.category) {
                                const catConfig = categories.find(c => c.name?.toLowerCase().trim() === currentPlayer.category?.toLowerCase().trim());
                                if (catConfig && catConfig.maxPerTeam > 0) {
                                    const playersList = team.players || [];
                                    const count = playersList.filter(p => p.category?.toLowerCase().trim() === currentPlayer.category?.toLowerCase().trim()).length;
                                    if (count >= catConfig.maxPerTeam) { allowed = false; reason = 'CAT LIMIT'; }
                                }
                            }
                            if (allowed && maxBidResult && !maxBidResult.allowBid) {
                                allowed = false;
                                reason = maxBidResult.reason || 'LIMIT HIT';
                            } else if (allowed && nextBid > maxPossibleBid) {
                                allowed = false;
                                reason = 'MAX BID';
                            }
                        }

                        return (
                            <button
                                key={team.id}
                                onClick={() => handleQuickBid(team.id)}
                                disabled={!allowed || isProcessing}
                                className={`
                                    flex items-center justify-between px-2.5 py-2.5 rounded-xl border-2 text-left transition-all relative group shadow-sm
                                    ${allowed 
                                        ? (isDark ? 'bg-zinc-900/50 border-accent/10 hover:border-accent hover:bg-accent/5 active:scale-95' : 'bg-white border-blue-500/10 hover:border-blue-600 hover:bg-blue-50 active:scale-95') 
                                        : (isDark ? 'bg-zinc-800 border-transparent opacity-40 cursor-not-allowed' : 'bg-gray-100 border-transparent opacity-60 cursor-not-allowed')}
                                `}
                            >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                    <div className={`w-7 h-7 rounded-lg border p-0.5 shadow-inner flex items-center justify-center shrink-0 ${isDark ? 'bg-black border-accent/20' : 'bg-gray-50 border-blue-500/20'}`}>
                                        {team.logoUrl ? (
                                            <img src={team.logoUrl} className="max-w-full max-h-full object-contain" alt="" />
                                        ) : (
                                            <span className={`text-[10px] font-black ${isDark ? 'text-accent' : 'text-blue-600'}`}>{team.name.charAt(0)}</span>
                                        )}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className={`text-[10px] font-black uppercase tracking-tighter truncate leading-none ${isDark ? 'text-white' : 'text-gray-900'}`}>{team.name}</span>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <span className={`text-[8px] font-black tabular-nums leading-none ${isDark ? 'text-zinc-650' : 'text-gray-400'}`}>₹{team.budget}</span>
                                            <span className={`text-[8px] font-black leading-none px-1 rounded-sm ${isDark ? 'bg-accent/15 text-accent' : 'bg-blue-100 text-blue-700'}`}>
                                                Max: ₹{maxPossibleBid}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex-shrink-0 ml-1.5">
                                    {!allowed ? (
                                        <span className={`text-[7px] font-black uppercase tracking-widest px-1 py-0.5 rounded ${isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600'}`}>{reason}</span>
                                    ) : (
                                        <span className={`text-[9px] font-black tabular-nums px-1.5 py-1 rounded-lg transition-colors ${isDark ? 'bg-accent/10 text-accent group-hover:bg-accent group-hover:text-zinc-950' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'}`}>
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
    <div className={`p-4 md:p-6 rounded-[2.5rem] shadow-2xl h-full flex flex-col border-4 relative transition-all duration-500 ${isDark ? 'bg-secondary border-accent/20 shadow-accent/5' : 'bg-white border-blue-500/20 shadow-blue-600/10'}`}>

      {!hasPaidPlan ? (
        <div className={`mb-6 p-5 rounded-2xl border-2 animate-pulse ${isDark ? 'bg-red-900/10 border-red-500/30' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center gap-3 text-red-500 mb-2">
            <ShieldAlert className="w-6 h-6" />
            <h3 className="font-black uppercase tracking-[0.2em] text-xs">Auction Cannot Be Started</h3>
          </div>
          <p className={`text-[10px] font-black uppercase tracking-tight mb-4 leading-relaxed ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>
            The auction cannot be started until the plan is purchased. Free plan is limited to only 2 teams (this auction has {teams.length} teams). Please purchase any plan to start the auction and remove limits.
          </p>
          <button
            onClick={() => navigate(`/admin?upgrade=${activeAuctionId}`)}
            className={`w-full font-black py-3 rounded-xl text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg ${isDark ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/20' : 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/20'}`}
          >
            <CreditCard className="w-4 h-4" /> Purchase Plan
          </button>
        </div>
      ) : (state.isPaid || userProfile?.role === UserRole.SUPER_ADMIN) ? (
        <div className={`mb-6 px-5 py-3 rounded-2xl border flex items-center justify-between ${isDark ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
                Current Plan: {state.planId ? state.planId.replace(/_/g, ' ').toUpperCase() : 'Pro Plan'}
              </p>
              <p className={`text-[9px] font-bold ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                All Limits Removed • Live Bidding Active
              </p>
            </div>
          </div>
          <span className="text-[8px] font-black bg-emerald-500/20 px-2.5 py-1 rounded-full text-emerald-400 uppercase tracking-widest">Active</span>
        </div>
      ) : null}

      <div className={`flex justify-between items-center mb-6 border-b pb-4 ${isDark ? 'border-accent/10' : 'border-blue-500/10'}`}>
        <div className="flex flex-col gap-3 w-full">
          <div className="flex justify-between items-center w-full">
            <h2 className={`text-2xl font-black uppercase tracking-tighter italic ${isDark ? 'advaya-text' : 'text-gray-900'}`}>Auctioneer</h2>
            <button onClick={() => navigate('/admin')} className={`text-[10px] font-black uppercase tracking-widest flex items-center transition-colors ${isDark ? 'text-zinc-500 hover:text-accent' : 'text-gray-400 hover:text-blue-600'}`}>
              <ArrowLeft className="w-3.5 h-3.5 mr-2" /> Dashboard
            </button>
          </div>

          {/* Quick Actions & Inline Status Segments */}
          <div className={`flex flex-wrap gap-3 items-center rounded-2xl p-2.5 w-full border ${isDark ? 'bg-primary/50 border-accent/10' : 'bg-gray-50 border-blue-500/10'}`}>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); copyOBSLink('transparent'); }}
                className={`p-2 rounded-xl border transition-all ${isDark ? 'bg-zinc-900 border-accent/20 text-accent hover:bg-accent hover:text-zinc-950' : 'bg-white border-blue-500/20 text-blue-600 hover:bg-blue-600 hover:text-white'}`}
                title="Copy OBS Transparent Link"
              >
                <Cast className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); copyOBSLink('green'); }}
                className={`p-2 rounded-xl border transition-all ${isDark ? 'bg-zinc-900 border-accent/20 text-accent hover:bg-accent hover:text-zinc-950' : 'bg-white border-blue-500/20 text-blue-600 hover:bg-blue-600 hover:text-white'}`}
                title="Copy Projector View Link"
              >
                <Monitor className="w-4 h-4" />
              </button>

              {/* Bidding Status Segmented Buttons listed directly */}
              <div className={`flex rounded-xl p-1 ml-2 border ${isDark ? 'bg-zinc-900 border-accent/10' : 'bg-white border-blue-500/10'}`}>
                <button
                  onClick={() => updateBiddingStatus('ON')}
                  disabled={!hasPaidPlan}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center ${biddingStatus === 'ON'
                      ? 'bg-accent text-primary shadow-lg shadow-accent/20'
                      : (isDark ? 'text-zinc-600 hover:text-zinc-400' : 'text-gray-400 hover:text-gray-600')}`}
                >
                  <Unlock className="w-3.5 h-3.5 mr-2" /> ON
                </button>
                <button
                  onClick={() => updateBiddingStatus('PAUSED')}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center ${biddingStatus !== 'ON'
                      ? 'bg-accent text-primary shadow-lg shadow-accent/20'
                      : (isDark ? 'text-zinc-600 hover:text-zinc-400' : 'text-gray-400 hover:text-gray-600')}`}
                >
                  <Lock className="w-3.5 h-3.5 mr-2" /> OFF
                </button>
              </div>
            </div>
          </div>

          {/* Display & Sponsors Toolbar (Fully Inline Buttons) */}
          <div className={`flex flex-col gap-3 rounded-2xl p-3 w-full mt-1 border ${isDark ? 'bg-primary/50 border-accent/10' : 'bg-gray-50 border-blue-500/10'}`}>
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
              <div className="w-full sm:flex-1">
                <label className={`block text-[8px] uppercase font-black tracking-[0.2em] mb-1.5 ${isDark ? 'text-zinc-600' : 'text-gray-400'}`}>Projector Theme</label>
                <div className={`flex flex-wrap gap-1 p-1 rounded-xl border ${isDark ? 'bg-zinc-900 border-accent/10' : 'bg-white border-blue-500/10'}`}>
                  {['STANDARD', 'IPL', 'MODERN', 'ADVAYA', 'NEON', 'FUTURISTIC'].map(l => (
                    <button
                      key={l}
                      onClick={() => updateTheme('PROJECTOR', l)}
                      className={`flex-1 px-2 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-tighter transition-all ${state.projectorLayout === l
                          ? 'bg-accent text-primary'
                          : (isDark ? 'text-zinc-500 hover:text-white' : 'text-gray-400 hover:text-blue-600')}`}
                    >
                      {l.slice(0, 4)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="w-full sm:flex-1">
                <label className={`block text-[8px] uppercase font-black tracking-[0.2em] mb-1.5 ${isDark ? 'text-zinc-600' : 'text-gray-400'}`}>OBS Theme</label>
                <div className={`flex flex-wrap gap-1.5 p-1 rounded-xl border ${isDark ? 'bg-zinc-900 border-accent/10' : 'bg-white border-blue-500/10'}`}>
                  {['STANDARD', 'EMERALD_GOLD', 'ADVAYA', 'MINIMAL', 'VERTICAL'].map(l => (
                    <button
                      key={l}
                      onClick={() => updateTheme('OBS', l)}
                      className={`px-2 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-tight transition-all border
                        ${state.obsLayout === l
                          ? l === 'STANDARD' ? 'bg-[#2A0A5E] border-[#00E5FF] text-white shadow-lg' : l === 'EMERALD_GOLD' ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg' : 'bg-accent border-accent text-primary'
                          : (isDark ? 'bg-zinc-900/40 border-transparent text-zinc-500 hover:text-white' : 'bg-white border-gray-150 text-gray-400 hover:text-blue-600')}`}
                    >
                      {l === 'STANDARD' ? '💜 Purple' : l === 'EMERALD_GOLD' ? '💚 Green' : l.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className={`flex flex-col gap-2 w-full pt-3 border-t ${isDark ? 'border-accent/10' : 'border-blue-500/10'}`}>
              <div className="flex justify-between items-center">
                <label className={`block text-[8px] uppercase font-black tracking-[0.2em] ${isDark ? 'text-zinc-600' : 'text-gray-400'}`}>Admin View Override</label>
                {state.adminViewOverride?.type === 'SQUAD' && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {teams.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setAdminView({ type: 'SQUAD', data: { teamId: t.id } })}
                        className={`px-3 py-1 rounded-lg text-[7px] font-black uppercase tracking-widest border transition-all ${
                          state.adminViewOverride?.data?.teamId === t.id
                          ? (isDark ? 'bg-accent text-zinc-950 border-accent' : 'bg-blue-600 text-white border-blue-600')
                          : (isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white' : 'bg-white border-gray-100 text-gray-400 hover:text-blue-600')
                        }`}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className={`flex flex-wrap gap-1.5 p-1.5 rounded-xl border ${isDark ? 'bg-zinc-900 border-accent/10' : 'bg-white border-blue-500/10'}`}>
                {['NONE', 'SQUAD', 'PURSES', 'TOP_5', 'UNSOLD'].map(v => (
                  <button
                    key={v}
                    onClick={() => {
                      if (v === 'SQUAD') {
                        setAdminView({ type: 'SQUAD', data: { teamId: teams[0]?.id } });
                      } else {
                        setAdminView(v === 'NONE' ? null : { type: v as any });
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${(!state.adminViewOverride && v === 'NONE') || (state.adminViewOverride?.type === v)
                        ? 'bg-accent text-primary'
                        : (isDark ? 'text-zinc-500 hover:text-white' : 'text-gray-400 hover:text-blue-600')}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div className={`flex flex-wrap items-center justify-between gap-3 w-full pt-3 border-t ${isDark ? 'border-accent/10' : 'border-blue-500/10'}`}>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => updateSponsorVisibility('PROJECTOR')}
                  className={`px-3 py-2 rounded-xl flex items-center gap-2 text-[9px] font-black uppercase tracking-widest border transition-all active:scale-95 ${state.sponsorConfig?.showOnProjector
                      ? 'bg-accent text-primary border-accent shadow-lg shadow-accent/20'
                      : (isDark ? 'bg-zinc-900 border-accent/10 text-zinc-500' : 'bg-white border-blue-500/10 text-gray-400')}`}
                >
                  <Monitor className="w-3.5 h-3.5" /> Proj
                </button>
                <button
                  onClick={() => updateSponsorVisibility('OBS')}
                  className={`px-3 py-2 rounded-xl flex items-center gap-2 text-[9px] font-black uppercase tracking-widest border transition-all active:scale-95 ${state.sponsorConfig?.showOnOBS
                      ? (isDark ? 'bg-purple-500 text-white border-purple-500 shadow-lg shadow-purple-500/20' : 'bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-600/20')
                      : (isDark ? 'bg-zinc-900 border-accent/10 text-zinc-500' : 'bg-white border-blue-500/10 text-gray-400')}`}
                >
                  <Cast className="w-3.5 h-3.5" /> OBS
                </button>
                <button
                  onClick={toggleHighlights}
                  className={`px-3 py-2 rounded-xl flex items-center gap-2 text-[9px] font-black uppercase tracking-widest border transition-all active:scale-95 ${state.sponsorConfig?.showHighlights
                      ? (isDark ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/20' : 'bg-orange-600 text-white border-orange-600 shadow-lg shadow-orange-600/20')
                      : (isDark ? 'bg-zinc-900 border-accent/10 text-zinc-500' : 'bg-white border-blue-500/10 text-gray-400')}`}
                >
                  <LayoutList className="w-3.5 h-3.5" /> Ticker
                </button>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative group w-14">
                  <input
                    type="number"
                    className={`w-full border-2 rounded-xl text-[10px] p-2 pr-6 text-center font-black tabular-nums transition-all outline-none ${isDark ? 'bg-zinc-900 border-accent/10 text-white focus:border-accent' : 'bg-gray-50 border-blue-500/10 text-gray-900 focus:border-blue-500'}`}
                    value={sponsorLoop}
                    onChange={handleSponsorLoopChange}
                    onBlur={saveSponsorLoop}
                    title="Loop Interval (Sec)"
                  />
                  <Clock className={`w-3 h-3 absolute top-1/2 -translate-y-1/2 right-2 ${isDark ? 'text-zinc-600' : 'text-gray-400'} pointer-events-none`} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* NOTIFICATION BANNER */}
      {notification && (
        <div className={`fixed top-6 right-6 z-[100] p-5 rounded-2xl shadow-2xl border-2 animate-slide-in flex items-center gap-4 max-w-md ${notification.type === 'error' ? 'bg-red-900/90 border-red-500 text-white backdrop-blur-md' : 'bg-green-900/90 border-green-500 text-white backdrop-blur-md'}`}>
          {notification.type === 'error' ? <AlertOctagon className="w-6 h-6 text-red-400" /> : <CheckCircle className="w-6 h-6 text-green-400" />}
          <span className="text-xs font-black uppercase tracking-tight">{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-auto hover:scale-110 transition-transform"><X className="w-5 h-5" /></button>
        </div>
      )}

      {/* CUSTOM CONFIRMATION MODAL (INLINE) */}
      {confirmAction && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className={`border-4 rounded-[3rem] p-8 max-w-md w-full shadow-2xl transition-all duration-500 ${isDark ? 'bg-secondary border-accent/30 shadow-accent/10' : 'bg-white border-blue-500/30 shadow-blue-600/10'}`}>
            <div className={`flex items-center gap-4 mb-6 ${isDark ? 'text-accent' : 'text-amber-500'}`}>
              <AlertTriangle className="w-8 h-8" />
              <h3 className="text-2xl font-black uppercase tracking-tighter italic">{confirmAction.title}</h3>
            </div>
            <p className={`text-sm font-bold mb-8 leading-relaxed ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>{confirmAction.message}</p>
            <div className="flex gap-4">
              <button
                onClick={() => setConfirmAction(null)}
                className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 ${isDark ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              >
                Cancel
              </button>
              <button
                onClick={confirmAction.onConfirm}
                className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg transition-all active:scale-95 ${isDark ? 'bg-accent text-zinc-950 hover:bg-white shadow-accent/20' : 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/20'}`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SELECTION MODE TOGGLE (Inline Segments) */}
      <div className={`rounded-2xl p-2.5 mb-6 flex justify-between items-center border transition-all duration-500 ${isDark ? 'bg-primary/40 border-accent/10' : 'bg-gray-50 border-blue-500/10'}`}>
        <span className={`text-[10px] font-black uppercase tracking-widest ml-2 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Selection Mode</span>
        <div className={`flex p-1 rounded-xl border ${isDark ? 'bg-zinc-900 border-accent/10' : 'bg-white border-blue-500/10'}`}>
          <button
            onClick={playerSelectionMode !== 'MANUAL' ? toggleSelectionMode : undefined}
            className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${playerSelectionMode === 'MANUAL'
                ? 'bg-accent text-primary shadow-lg shadow-accent/20'
                : (isDark ? 'text-zinc-600 hover:text-zinc-400' : 'text-gray-400 hover:text-gray-600')}`}
          >
            Manual
          </button>
          <button
            onClick={playerSelectionMode !== 'AUTO' ? toggleSelectionMode : undefined}
            className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${playerSelectionMode === 'AUTO'
                ? 'bg-accent text-primary shadow-lg shadow-accent/20'
                : (isDark ? 'text-zinc-600 hover:text-zinc-400' : 'text-gray-400 hover:text-gray-600')}`}
          >
            Auto
          </button>
        </div>
      </div>

      {/* REPAIR DOCUMENT SIZE BUTTON */}
      <div className={`rounded-2xl p-2.5 mb-6 flex justify-between items-center border transition-all duration-500 ${isDark ? 'bg-primary/40 border-accent/10' : 'bg-gray-50 border-blue-500/10'}`}>
        <div className="flex items-center gap-3 ml-2">
            <ShieldAlert className={`w-4 h-4 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`} />
            <div>
                <p className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Size Repair</p>
                <p className="text-[8px] font-bold text-zinc-500 uppercase">Database Cleanup</p>
            </div>
        </div>
        <button
          onClick={async () => {
            if (window.confirm("This will overwrite your auction document with a clean version, removing large bulky data (like old player/team lists) that exceeds 1MB limits. Your sub-collections are safe. Continue?")) {
              try {
                setIsProcessing(true);
                await repairAuctionDocument();
                showNotification("Repair successful! Document size reset.", "success");
              } catch (e: any) {
                showNotification("Repair failed: " + e.message);
              } finally {
                setIsProcessing(false);
              }
            }
          }}
          className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isDark ? 'bg-zinc-800 text-zinc-400 hover:bg-red-950/20 hover:text-red-400 hover:border-red-900/50' : 'bg-white border-gray-100 text-gray-400 hover:text-red-500'} border`}
        >
          {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : 'Run Repair'}
        </button>
      </div>

      <div className="mb-8 space-y-4">
        {/* UNDO BANNER */}
        {lastAction && (
          <div className={`border-l-8 p-4 rounded-2xl shadow-xl flex justify-between items-center animate-fade-in mb-6 ${isDark ? 'bg-amber-900/20 border-amber-500 text-amber-200' : 'bg-amber-50 border-amber-500 text-amber-900'}`}>
            <div className="flex items-center text-xs font-bold uppercase tracking-tight">
              <AlertOctagon className="w-5 h-5 mr-3" />
              <span>Just marked <b className={isDark ? 'text-white' : 'text-black'}>{lastAction.name}</b> as <b className={isDark ? 'text-white' : 'text-black'}>{lastAction.type}</b></span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleUndoLastAction}
                disabled={isProcessing}
                className={`font-black px-4 py-2 rounded-xl flex items-center transition-all active:scale-95 uppercase tracking-widest text-[10px] ${isDark ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/20' : 'bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/20'}`}
              >
                <Undo2 className="w-3.5 h-3.5 mr-2" /> Undo
              </button>
              <button onClick={() => setLastAction(null)} className="hover:scale-110 transition-transform"><X className="w-5 h-5" /></button>
            </div>
          </div>
        )}

        {getControlButtons()}

        {renderQuickBidButtons()}

        {!isSellingMode && (
          <div className={`grid grid-cols-2 gap-3 mt-6 pt-6 border-t ${isDark ? 'border-accent/10' : 'border-blue-500/10'}`}>
            <button
              onClick={handleResetPlayer}
              disabled={isProcessing || !state.currentPlayerId}
              className={`flex flex-col items-center justify-center font-black py-4 rounded-2xl transition-all active:scale-95 uppercase tracking-widest text-[9px] ${isDark ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'} disabled:opacity-30`}
              title="Clears bids for current player only"
            >
              <RotateCcw className={`mb-1.5 h-5 w-5 ${isProcessing ? 'animate-spin' : ''}`} />
              Reset Current
            </button>
            <button
              onClick={handleResetFull}
              disabled={isProcessing}
              className={`flex flex-col items-center justify-center font-black py-4 rounded-2xl transition-all active:scale-95 uppercase tracking-widest text-[9px] border-2 ${isDark ? 'bg-red-950/20 border-red-900/50 text-red-400 hover:bg-red-900/30' : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'} disabled:opacity-30`}
              title="Resets auction status to Not Started"
            >
              <AlertOctagon className={`mb-1.5 h-5 w-5 ${isProcessing ? 'animate-spin' : ''}`} />
              Reset Full
            </button>
          </div>
        )}
      </div>

      <h3 className={`text-[10px] font-black uppercase tracking-[0.3em] mb-4 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Teams Overview</h3>
      <div className="flex-grow overflow-y-auto space-y-4 pr-2 custom-scrollbar">
        {teams.map((team: Team) => (
          <TeamStatusCard key={team.id} team={team} />
        ))}
      </div>
    </div>
  );
};

export default LiveAdminPanel;