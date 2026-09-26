
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useAuction } from '../hooks/useAuction';
import { useParams } from 'react-router-dom';
import { User, Gavel, DollarSign, Trophy, CheckCircle2, XCircle } from 'lucide-react';
import { getEffectiveBasePrice } from '../utils';
import { Player, Team, AuctionStatus, AuctionState } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface OverlayState {
    player: Player | null;
    bid: number;
    bidder: Team | null;
    status: 'WAITING' | 'LIVE' | 'SOLD' | 'UNSOLD' | 'FINISHED';
}

const Marquee = React.memo(({ content, show, layout }: { content: string[], show: boolean, layout?: string }) => {
    if (!show || content.length === 0) return null;
    let bgClass = "bg-gradient-to-r from-blue-950/90 via-indigo-950/90 to-blue-950/90";
    let borderClass = "border-t-2 border-cyan-500/50";
    let iconColor = "text-cyan-400";
    
    if (layout === 'ADVAYA') {
        bgClass = "bg-black/95";
        borderClass = "border-t-2 border-yellow-500/50 shadow-[0_-10px_20px_rgba(234,179,8,0.2)]";
        iconColor = "text-yellow-500";
    }
    
    return (
          <div className={`fixed bottom-0 left-0 w-full ${bgClass} backdrop-blur-md text-white py-1.5 overflow-hidden whitespace-nowrap z-50 shadow-2xl ${borderClass}`}>
              <div className="flex animate-marquee w-max will-change-transform">
                  <div className="flex shrink-0 items-center">
                    {content.map((text, i) => (
                        <span key={i} className="mx-12 font-bold text-xl tracking-wider flex items-center uppercase">
                            <span className={`${iconColor} mr-4 text-base opacity-80`}>◆</span> {text}
                        </span>
                    ))}
                  </div>
                  <div className="flex shrink-0 items-center">
                    {content.map((text, i) => (
                        <span key={`dup-${i}`} className="mx-12 font-bold text-xl tracking-wider flex items-center uppercase">
                            <span className={`${iconColor} mr-4 text-base opacity-80`}>◆</span> {text}
                        </span>
                    ))}
                  </div>
              </div>
              <style>{`
                  @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
                  .animate-marquee { animation: marquee 18s linear infinite; }
              `}</style>
          </div>
    );
});

const SystemLogoFrame = React.memo(({ tournamentName, systemLogoUrl }: { tournamentName?: string, systemLogoUrl?: string }) => null);

const TopCenterLogo = React.memo(({ tournamentName, systemLogoUrl }: { tournamentName?: string, systemLogoUrl?: string }) => null);

const SponsorLogo = React.memo(({ show, currentSponsor, sponsorsCount }: { show: boolean, currentSponsor: any, sponsorsCount: number }) => (
    show && sponsorsCount > 0 && currentSponsor && (
        <div className="absolute top-6 right-6 w-40 h-24 bg-white/90 backdrop-blur rounded-xl shadow-lg p-2 flex items-center justify-center z-50 border-2 border-white/20 overflow-hidden">
             <img src={currentSponsor.imageUrl} className="max-w-full max-h-full object-contain transition-opacity duration-500" alt="Sponsor" />
        </div>
    )
));

const IPLTicker = React.memo(({ teams, systemLogoUrl }: { teams: Team[], systemLogoUrl?: string }) => {
    const sortedTeams = useMemo(() => [...teams].sort((a,b) => b.budget - a.budget), [teams]);
    const topSold = useMemo(() => teams.flatMap(t => t.players).sort((a,b) => (b.soldPrice || 0) - (a.soldPrice || 0)).slice(0, 5), [teams]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [viewMode, setViewMode] = useState<'PURSE' | 'TOP_BUY'>('PURSE');

    useEffect(() => {
        const interval = setInterval(() => {
            if (viewMode === 'PURSE' && topSold.length > 0 && Math.random() > 0.7) {
                setViewMode('TOP_BUY');
            } else {
                setViewMode('PURSE');
                setCurrentIndex(prev => (prev + 1) % Math.max(1, sortedTeams.length));
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [sortedTeams.length, viewMode, topSold.length]);

    if (sortedTeams.length === 0) return null;
    const t = sortedTeams[currentIndex];
    const top = topSold[Math.floor(Math.random() * topSold.length)];

    return (
        <div className="fixed bottom-0 left-0 w-full bg-[#001c4b] h-10 flex items-center border-t-2 border-[#fbbf24]/50 z-[100] font-sans shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
            <div className="bg-[#fbbf24] h-full px-8 flex items-center shrink-0 skew-x-[-15deg] -ml-4 pr-12 relative z-20 shadow-[10px_0_20px_rgba(0,0,0,0.4)]">
                <span className="text-black font-black text-[10px] uppercase tracking-widest italic skew-x-[15deg]">
                    {viewMode === 'PURSE' ? 'Purse Remaining' : 'Tournament Top Buy'}
                </span>
            </div>
            <div className="flex-1 overflow-hidden relative h-full">
                <AnimatePresence mode="wait">
                   <motion.div 
                       key={viewMode === 'PURSE' ? `purse-${t?.id}` : `top-${top?.id}`}
                       initial={{ y: 30, opacity: 0 }}
                       animate={{ y: 0, opacity: 1 }}
                       exit={{ y: -30, opacity: 0 }}
                       className="flex items-center justify-between px-10 h-full w-full"
                   >
                       {viewMode === 'PURSE' ? (
                           <>
                               <div className="flex items-center gap-3 italic">
                                   <div className="bg-white p-1 rounded-full shadow-lg">
                                       <img src={t.logoUrl} className="w-4 h-4 object-contain" />
                                   </div>
                                   <span className="text-white font-black text-xs uppercase tracking-tighter">{t.name}</span>
                               </div>
                               <div className="flex items-center gap-6">
                                   <span className="text-[#fbbf24] font-black text-sm uppercase tracking-tighter italic drop-shadow-md">
                                       ₹ {t.budget >= 10000000 ? (t.budget/10000000).toFixed(2) + 'Cr' : (t.budget/100000).toFixed(2) + 'Lks'}
                                   </span>
                                   <div className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                                       <User className="w-2.5 h-2.5 text-white/40" />
                                       <span className="text-white/80 font-bold text-[9px] uppercase tracking-widest leading-none">
                                           {t.players.length} Signed
                                       </span>
                                   </div>
                               </div>
                           </>
                       ) : (
                           <>
                               <div className="flex items-center gap-3 italic text-white font-black text-xs uppercase tracking-tighter">
                                   <span className="text-[#fbbf24]">STAR PLAYER:</span> {top.name}
                               </div>
                               <div className="flex items-center gap-4">
                                   <span className="text-[#fbbf24] font-black text-sm uppercase tracking-tighter italic">₹ {(top.soldPrice || 0) >= 10000000 ? ((top.soldPrice || 0)/10000000).toFixed(2) + 'Cr' : ((top.soldPrice || 0)/100000).toFixed(2) + 'Lks'}</span>
                                   <span className="text-white/40 font-bold text-[9px] uppercase italic">To {top.soldTo}</span>
                               </div>
                           </>
                       )}
                   </motion.div>
                </AnimatePresence>
            </div>
            <div className="h-full bg-black/40 px-6 flex items-center border-l border-white/10 shrink-0">
                <div className="flex flex-col items-end mr-3">
                    <span className="text-[8px] font-black text-[#fbbf24] uppercase tracking-[0.2em] italic leading-none">Live Auction</span>
                    <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] italic leading-none mt-0.5">VERSION 2.0</span>
                </div>
                {systemLogoUrl && <img src={systemLogoUrl} className="h-6 object-contain opacity-50 contrast-125" />}
            </div>
        </div>
    );
});

const OverlayCard = React.memo(({ children, title, tickerShow, tickerContent, layout, currentSponsor, sponsorsCount, showSponsor }: any) => (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative p-12 bg-transparent">
        <SponsorLogo show={showSponsor} currentSponsor={currentSponsor} sponsorsCount={sponsorsCount} />
        <div className="bg-gradient-to-br from-[#0f172a]/95 via-[#020617]/95 to-black/95 backdrop-blur-2xl rounded-[2.5rem] border-2 border-cyan-500/40 shadow-[0_0_80px_rgba(6,182,212,0.25)] p-0 w-full max-w-6xl animate-slide-up overflow-hidden relative mt-20">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_#1e293b_0%,_transparent_100%)] opacity-20"></div>
            <div className="bg-gradient-to-r from-blue-900/50 via-indigo-900/50 to-blue-900/50 px-10 py-6 border-b-2 border-cyan-500/30 flex items-center justify-center relative">
                <div className="absolute left-0 top-0 h-full w-3 bg-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.6)]"></div>
                <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-cyan-400 uppercase tracking-[0.2em] drop-shadow-lg text-center italic">{title}</h1>
            </div>
            <div className="p-10 max-h-[75vh] overflow-y-auto custom-scrollbar relative z-10">{children}</div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
        </div>
        <Marquee show={tickerShow} content={tickerContent} layout={layout} />
    </div>
));

const OBSOverlay: React.FC = () => {
  const { state, joinAuction } = useAuction();
  const { id: auctionId } = useParams<{ id: string }>();
  const [display, setDisplay] = useState<OverlayState>({ player: null, bid: 0, bidder: null, status: 'WAITING' });
  const [currentSponsorIndex, setCurrentSponsorIndex] = useState(0);

  const [activeAlert, setActiveAlert] = useState<{
      show: boolean;
      type: 'SOLD' | 'UNSOLD';
      playerName: string;
      playerPhoto?: string;
      playerCategory?: string;
      playerRole?: string;
      teamName?: string;
      teamLogo?: string;
      price?: number;
  } | null>(null);

  const lastOverlayStatusRef = useRef<'WAITING' | 'LIVE' | 'SOLD' | 'UNSOLD' | 'FINISHED' | null>(null);
  const lastOverlayPlayerIdRef = useRef<string | number | null>(null);

  const [hideBottomOverlay, setHideBottomOverlay] = useState(false);
  const lastPlayerIdRef = useRef<string | number | null>(null);
  const lastStatusRef = useRef<string | null>(null);

  useEffect(() => {
      const currentPlayerId = display.player?.id;
      const currentStatus = display.status;

      if (!currentPlayerId) {
          setHideBottomOverlay(false);
          return;
      }

      // Reset bottom overlay if player changes
      if (currentPlayerId !== lastPlayerIdRef.current) {
          setHideBottomOverlay(false);
          lastPlayerIdRef.current = currentPlayerId;
      }

      // Handle transition to SOLD/UNSOLD
      if (currentStatus !== lastStatusRef.current) {
          if (currentStatus === 'SOLD' || currentStatus === 'UNSOLD') {
              setHideBottomOverlay(false); // make sure it's shown at the beginning of the 5s
              const timer = setTimeout(() => {
                  setHideBottomOverlay(true);
              }, 5000);
              lastStatusRef.current = currentStatus;
              return () => clearTimeout(timer);
          } else {
              setHideBottomOverlay(false);
          }
          lastStatusRef.current = currentStatus;
      }
  }, [display.status, display.player?.id]);

  useEffect(() => {
      if (!display.player) return;
      const currentStatus = display.status;
      const currentPlayerId = display.player.id;

      // Detect if we transitioned into SOLD or UNSOLD status
      const isNewTransition = currentStatus !== lastOverlayStatusRef.current || currentPlayerId !== lastOverlayPlayerIdRef.current;

      if (isNewTransition && (currentStatus === 'SOLD' || currentStatus === 'UNSOLD')) {
          setActiveAlert({
              show: true,
              type: currentStatus,
              playerName: display.player.name,
              playerPhoto: display.player.photoUrl,
              playerCategory: display.player.category,
              playerRole: display.player.role,
              teamName: display.bidder?.name || display.player.soldTo || undefined,
              teamLogo: display.bidder?.logoUrl || undefined,
              price: display.bid
          });

          // Auto close after 3 seconds (3000ms)
          const timer = setTimeout(() => {
              setActiveAlert(prev => prev ? { ...prev, show: false } : null);
          }, 3000);

          lastOverlayStatusRef.current = currentStatus;
          lastOverlayPlayerIdRef.current = currentPlayerId;

          return () => clearTimeout(timer);
      } else {
          lastOverlayStatusRef.current = currentStatus;
          lastOverlayPlayerIdRef.current = currentPlayerId;
      }
  }, [display]);
  const loopInterval = state.sponsorConfig?.loopInterval || 5;
  const sponsorsLength = state.sponsors.length;

  useEffect(() => {
      if (sponsorsLength <= 1) return;
      const interval = setInterval(() => { setCurrentSponsorIndex(prev => (prev + 1) % sponsorsLength); }, loopInterval * 1000);
      return () => clearInterval(interval);
  }, [sponsorsLength, loopInterval]);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const marqueeContent = useMemo(() => {
    if (!state.sponsorConfig?.showHighlights) return [];
    const items: string[] = [`WELCOME TO ${state.tournamentName?.toUpperCase() || 'AUCTION'}`];
    const soldPlayers = state.teams.flatMap(t => t.players).sort((a, b) => (b.soldPrice || 0) - (a.soldPrice || 0));
    if (soldPlayers.length > 0) {
        const topBuy = soldPlayers[0];
        items.push(`RECORD BUY: ${topBuy.name.toUpperCase()} SOLD FOR ${topBuy.soldPrice?.toLocaleString()} TO ${topBuy.soldTo?.toUpperCase()}`);
    }
    const soldLogs = state.auctionLog.filter(l => l.type === 'SOLD').reverse();
    if (soldLogs.length > 0) items.push(`RECENT: ${soldLogs[0].message.toUpperCase()}`);
    const purseLeader = [...state.teams].sort((a,b) => b.budget - a.budget)[0];
    if (purseLeader) items.push(`MAX BUDGET: ${purseLeader.name.toUpperCase()} HAS ${purseLeader.budget.toLocaleString()} REMAINING`);
    if (state.sponsors.length > 0) items.push(`PARTNERS: ${state.sponsors.map(s => s.name.toUpperCase()).join(" | ")}`);
    return items;
  }, [state.sponsorConfig?.showHighlights, state.teams, state.auctionLog, state.tournamentName, state.sponsors]);

  const [showRightPanel, setShowRightPanel] = useState(false);
  const [rightPanelType, setRightPanelType] = useState<any>('PURSES');

  useEffect(() => {
    if (state.obsLayout !== 'IPL') return;
    const interval = setInterval(() => {
      setShowRightPanel(prev => !prev);
    }, 12000); 
    return () => clearInterval(interval);
  }, [state.obsLayout]);

  useEffect(() => {
     if (!showRightPanel && state.obsLayout === 'IPL') {
         const types = ['PURSES', 'TOP_BUYS', 'CATEGORY_STATS', 'REMAINING_PLAYERS'];
         setRightPanelType((prev: any) => {
             const idx = types.indexOf(prev);
             return types[(idx + 1) % types.length];
         });
     }
  }, [showRightPanel, state.obsLayout]);

  useEffect(() => {
      document.body.style.backgroundColor = 'transparent';
      document.documentElement.style.backgroundColor = 'transparent';
  }, []);

  useEffect(() => { if (auctionId) joinAuction(auctionId); }, [auctionId]);

  useEffect(() => {
      const { currentPlayerId, players, currentBid, highestBidder, status, teams, categories } = state;
      const currentPlayer = currentPlayerId ? players.find(p => String(p.id) === String(currentPlayerId)) : null;
      if (status === AuctionStatus.Finished) { setDisplay({ player: null, bid: 0, bidder: null, status: 'FINISHED' }); return; }
      if (currentPlayer) {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          let derivedStatus: 'LIVE' | 'SOLD' | 'UNSOLD' | 'FINISHED' = 'LIVE';
          if (status === AuctionStatus.Sold || currentPlayer.status === 'SOLD') derivedStatus = 'SOLD';
          else if (status === AuctionStatus.Unsold || currentPlayer.status === 'UNSOLD') derivedStatus = 'UNSOLD';
          let resolvedBidder = highestBidder;
          if (derivedStatus === 'SOLD' && !resolvedBidder && currentPlayer.soldTo) {
             const winningTeam = teams.find(t => t.name === currentPlayer.soldTo);
             if (winningTeam) resolvedBidder = winningTeam;
          }
          const effectiveBase = getEffectiveBasePrice(currentPlayer, categories);
          setDisplay({ player: currentPlayer, bid: currentPlayer.soldPrice || currentBid || effectiveBase, bidder: resolvedBidder, status: derivedStatus });
      } else if (display.status !== 'WAITING' && display.status !== 'FINISHED') {
          timeoutRef.current = setTimeout(() => { setDisplay({ player: null, bid: 0, bidder: null, status: 'WAITING' }); }, 2000); 
      }
  }, [state.currentPlayerId, state.players, state.currentBid, state.highestBidder, state.status, state.teams, state.categories]);

  if (window.location.protocol === 'blob:') return <div className="min-h-screen w-full flex items-center justify-center bg-black/90 p-10"><div className="bg-red-600/20 border border-red-500 text-white p-8 rounded-xl text-center"><h1 className="text-2xl font-bold mb-2">Preview Mode Detected</h1><p>Please deploy the app to use the OBS Overlay.</p></div></div>;

  if (state.adminViewOverride && state.adminViewOverride.type !== 'NONE') {
      const { type, data } = state.adminViewOverride;
      const showSponsor = state.sponsorConfig?.showOnOBS ?? false;
      const tickerShow = state.sponsorConfig?.showTickerOnOBS ?? state.sponsorConfig?.showHighlights ?? false;
      
      const cardProps = {
          tickerShow,
          tickerContent: marqueeContent,
          layout: state.obsLayout,
          currentSponsor: state.sponsors[currentSponsorIndex],
          sponsorsCount: state.sponsors.length,
          showSponsor
      };

      if (type === 'SQUAD' && data?.teamId) {
          const team = state.teams.find(t => String(t.id) === String(data.teamId));
          if (team) return (
            <OverlayCard title={team.name} {...cardProps}>
                <div className="flex flex-col gap-8">
                    <div className="flex items-center justify-between bg-white/5 p-6 rounded-3xl border border-white/10">
                        <div className="flex items-center gap-6">
                            {team.logoUrl ? <img src={team.logoUrl} className="w-20 h-20 rounded-2xl bg-white p-1.5 object-contain shadow-xl" /> : <div className="w-20 h-20 bg-cyan-600 rounded-2xl flex items-center justify-center text-4xl font-black text-white">{team.name.charAt(0)}</div>}
                            <div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">{team.name}</h3>
                                <p className="text-cyan-400/60 font-black text-[10px] uppercase tracking-widest mt-1">SQUAD ROSTER • {team.players.length} PLAYERS</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">Available Purse</p>
                            <p className="text-4xl font-black text-green-400 tabular-nums italic tracking-tighter">₹{team.budget.toLocaleString()}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                        {team.players.map((p, i) => (
                            <div key={i} className="bg-slate-800/60 backdrop-blur-sm p-4 rounded-2xl flex items-center gap-4 border border-white/5 hover:border-cyan-500/50 transition-all shadow-xl group">
                                <div className="w-10 h-10 rounded-xl bg-cyan-500 text-black flex items-center justify-center font-black text-sm italic shadow-lg group-hover:rotate-6 transition-transform">#{i+1}</div>
                                <img src={p.photoUrl} className="w-12 h-12 rounded-xl object-cover border border-white/10" alt={p.name} />
                                <div className="min-w-0 flex-1">
                                    <p className="text-white font-black text-sm truncate uppercase tracking-tight italic">{p.name}</p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] text-cyan-400 font-bold uppercase tracking-widest">{p.role || p.speciality}</span>
                                        <span className="text-green-400 font-mono font-black text-xs">₹{p.soldPrice?.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    {team.players.length === 0 && (
                        <div className="py-20 text-center flex flex-col items-center gap-4 opacity-30">
                            <Trophy className="w-16 h-16 text-cyan-500" />
                            <p className="text-xl font-black uppercase tracking-[0.3em] italic">No Signings Recorded</p>
                        </div>
                    )}
                </div>
            </OverlayCard>
          );
      }
      if (type === 'TOP_5') {
          const soldPlayers = state.teams.flatMap(t => t.players.map(p => ({ ...p, soldToTeam: t })))
              .sort((a, b) => (Number(b.soldPrice) || 0) - (Number(a.soldPrice) || 0))
              .slice(0, 5);
          return (
            <OverlayCard title="Top 5 Most Expensive Players">
                <div className="space-y-4">
                    {soldPlayers.map((p, i) => (
                        <div key={i} className="flex justify-between items-center bg-gradient-to-r from-indigo-900/30 to-black/30 p-5 rounded-3xl border-l-[8px] border-cyan-500 hover:scale-[1.02] transition-all shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-cyan-500/5 to-transparent pointer-events-none"></div>
                            <div className="flex items-center gap-8 relative z-10">
                                <div className={`text-5xl font-black italic w-16 text-center ${i === 0 ? 'text-yellow-400 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-orange-400' : 'text-slate-600'}`}>#{i + 1}</div>
                                <div className="relative">
                                    <div className="absolute inset-[-4px] bg-cyan-500 blur-xl opacity-0 group-hover:opacity-20 transition-opacity"></div>
                                    <img src={p.photoUrl} className="w-20 h-20 rounded-2xl object-cover border-2 border-white/20 shadow-xl relative z-10"/>
                                </div>
                                <div>
                                    <p className="text-white font-black text-3xl leading-none mb-2 uppercase tracking-tight italic group-hover:text-cyan-400 transition-colors">{p.name}</p>
                                    <p className="text-cyan-400 text-[10px] uppercase font-black tracking-[0.2em] opacity-70">{p.role || p.speciality} • {p.category}</p>
                                </div>
                            </div>
                            <div className="text-right flex items-center gap-10 relative z-10">
                                <div className="hidden md:block">
                                    <p className="text-[8px] text-white/40 uppercase font-black mb-1 text-right">Acquired By</p>
                                    <p className="text-xl font-black text-white uppercase italic tracking-tighter truncate max-w-[150px]">{p.soldToTeam.name}</p>
                                </div>
                                <div className="bg-cyan-500 text-black px-8 py-4 rounded-2xl font-black text-4xl tabular-nums italic tracking-tighter shadow-lg transform group-hover:rotate-2 transition-transform">
                                    ₹{p.soldPrice?.toLocaleString()}
                                </div>
                            </div>
                        </div>
                    ))}
                    {soldPlayers.length === 0 && (
                        <div className="py-20 text-center flex flex-col items-center gap-4 opacity-30 italic font-black uppercase tracking-widest">
                            <Gavel className="w-16 h-16 text-cyan-500" />
                            <p className="text-2xl">Awaiting Big Purchases...</p>
                        </div>
                    )}
                </div>
            </OverlayCard>
          );
      }
      if (type === 'PURSES') {
          const sortedTeams = [...state.teams].sort((a,b) => b.budget - a.budget);
          return (
            <OverlayCard title="Purse Remaining">
                <div className="grid grid-cols-2 gap-6">
                    {sortedTeams.map((team, i) => (
                        <div key={team.id} className="flex justify-between items-center bg-white/5 p-6 rounded-[1.5rem] border border-white/5 relative overflow-hidden group hover:bg-white/10 transition-all">
                            <div className={`absolute left-0 top-0 h-full w-2 transition-colors ${i === 0 ? 'bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.5)]' : 'bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)]'}`}></div>
                            <div className="flex items-center gap-5 pl-4">
                                {team.logoUrl ? <img src={team.logoUrl} className="w-14 h-14 object-contain bg-white rounded-xl p-1 shadow-lg group-hover:scale-110 transition-transform"/> : <div className="w-14 h-14 bg-slate-800 rounded-xl flex items-center justify-center font-black text-xl text-white italic">{team.name.charAt(0)}</div>}
                                <div>
                                    <span className="text-white font-black text-lg uppercase tracking-tight block truncate max-w-[140px] italic">{team.name}</span>
                                    <span className="text-white/30 text-[8px] font-bold uppercase tracking-widest">{team.teamCode}</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[8px] text-zinc-500 font-black uppercase mb-1">Available</p>
                                <span className="text-green-400 font-mono font-black text-3xl tabular-nums italic tracking-tighter group-hover:text-green-300 transition-colors">₹{team.budget.toLocaleString()}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </OverlayCard>
          );
      }
      if (type === 'UNSOLD') {
          const unsoldPlayers = state.players.filter(p => p.status === 'UNSOLD');
          return (
            <OverlayCard title="Unsold Player List">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    {unsoldPlayers.map((p, i) => (
                        <div key={i} className="bg-slate-900/80 border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl group hover:border-red-500/50 transition-all">
                            <div className="h-48 relative overflow-hidden">
                                <img src={p.photoUrl} className="w-full h-full object-cover grayscale transition-transform duration-500 group-hover:scale-110" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80"></div>
                                <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest shadow-lg">UNSOLD</div>
                            </div>
                            <div className="p-5">
                                <h3 className="text-xl font-black text-white uppercase italic tracking-tighter truncate mb-3">{p.name}</h3>
                                <div className="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-white/5">
                                    <div>
                                        <p className="text-white/30 text-[7px] font-black uppercase mb-0">Base</p>
                                        <p className="text-yellow-500 font-black font-mono text-sm leading-none mt-1">₹{getEffectiveBasePrice(p, state.categories).toLocaleString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-white/30 text-[7px] font-black uppercase mb-0">Role</p>
                                        <p className="text-cyan-400 text-[10px] font-black uppercase leading-none mt-1 italic">{p.role || p.speciality}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {unsoldPlayers.length === 0 && (
                        <div className="col-span-full py-20 text-center opacity-30 italic font-black uppercase tracking-widest">
                            <p className="text-2xl">No Players Left Unsold</p>
                        </div>
                    )}
                </div>
            </OverlayCard>
          );
      }
  }

  if (display.status === 'FINISHED') return <div className="min-h-screen w-full flex flex-col items-center justify-center relative"><div className="bg-green-900/90 text-white px-16 py-8 rounded-3xl border-4 border-green-500 shadow-[0_0_50px_rgba(34,197,94,0.5)] animate-bounce-in text-center"><h1 className="text-4xl md:text-6xl font-black tracking-widest uppercase text-green-400 mb-2">AUCTION</h1><h1 className="text-4xl md:text-6xl font-black tracking-widest uppercase text-white">COMPLETED</h1></div><Marquee show={state.sponsorConfig?.showTickerOnOBS ?? state.sponsorConfig?.showHighlights ?? false} content={marqueeContent} layout={state.obsLayout} /></div>;

  if (display.status === 'WAITING' || !display.player) return <div className="min-h-screen w-full flex flex-col items-center justify-end pb-20 relative"><div className="bg-slate-900/90 text-white px-12 py-4 rounded-full border-2 border-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.3)] animate-pulse mb-10"><h1 className="text-2xl font-bold tracking-[0.5em] uppercase text-cyan-400">{state.status === AuctionStatus.NotStarted ? "AUCTION STARTING SOON" : "WAITING FOR AUCTION"}</h1></div><Marquee show={state.sponsorConfig?.showTickerOnOBS ?? state.sponsorConfig?.showHighlights ?? false} content={marqueeContent} layout={state.obsLayout} /></div>;

  const { player, bid, bidder, status } = display;
  const layout = state.obsLayout || 'STANDARD';

  if (!state.status && !state.tournamentName) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-transparent text-white font-black uppercase tracking-widest">
              <div className="flex flex-col items-center gap-4 p-8 rounded-3xl bg-black/50 backdrop-blur-md border border-white/10">
                  <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sm animate-pulse">Initializing Overlay...</p>
              </div>
          </div>
      );
  }

  return (
    <>
        <SponsorLogo 
            show={state.sponsorConfig?.showOnOBS ?? false} 
            currentSponsor={state.sponsors[currentSponsorIndex]} 
            sponsorsCount={state.sponsors.length} 
        />
        
        {layout !== 'IPL' && (
             <SystemLogoFrame tournamentName={state.tournamentName} systemLogoUrl={state.systemLogoUrl} />
        )}

        {layout === 'IPL' && (
            <div className="min-h-screen w-full relative font-sans overflow-hidden bg-transparent select-none">
                 {/* Top Left: Removed Auction Logo */}

                 {/* Main Content Area */}
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     <motion.div 
                        animate={{ 
                            x: showRightPanel ? -280 : 0,
                            scale: showRightPanel ? 0.85 : 1
                        }}
                        transition={{ type: 'spring', damping: 25, stiffness: 120 }}
                        className="relative flex flex-col items-center"
                     >
                         {/* Player Image with Frame & Team Logos */}
                         <div className="relative mb-8 pb-4">
                             {/* Team Logos on sides - Floating Style */}
                             <AnimatePresence>
                                {bidder && (
                                    <motion.div 
                                        initial={{ opacity: 0, x: 100 }}
                                        animate={{ opacity: 1, x: 260 }}
                                        exit={{ opacity: 0, x: 100 }}
                                        className="absolute top-1/2 -translate-y-1/2 right-0 z-0 bg-white p-3 rounded-[2.5rem] border-4 border-[#fbbf24] shadow-2xl w-40 h-40 flex items-center justify-center overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-br from-black/5 to-transparent"></div>
                                        <img src={bidder.logoUrl} className="w-full h-full object-contain p-2" alt="Bidder" />
                                    </motion.div>
                                )}
                             </AnimatePresence>

                             <div className="absolute top-1/2 -left-[260px] -translate-y-1/2 z-0 opacity-20 hidden">
                                 <Gavel className="w-48 h-48 text-white rotate-12" />
                             </div>

                             {/* Player Avatar Central Photo */}
                             <motion.div 
                                layoutId="player-photo"
                                className="w-64 h-64 bg-gradient-to-b from-[#1e1b4b] to-[#0f172a] rounded-full border-[6px] border-[#fbbf24] shadow-[0_0_80px_rgba(251,191,36,0.3)] overflow-hidden relative z-10 p-1"
                             >
                                 <div className="w-full h-full rounded-full overflow-hidden border-2 border-white/10 bg-slate-900">
                                    <img src={player?.photoUrl} className="w-full h-full object-cover object-top" alt={player?.name} />
                                 </div>
                                 {status === 'UNSOLD' && (
                                     <div className="absolute inset-0 bg-red-600/70 backdrop-blur-md flex items-center justify-center">
                                         <span className="text-white font-black text-5xl -rotate-12 border-[6px] border-white px-6 py-2 tracking-tighter">UNSOLD</span>
                                     </div>
                                 )}
                             </motion.div>
                         </div>

                         {/* Info Plates: Base Price | Name | Current Bid */}
                         <div className="flex items-end gap-1 relative z-20">
                             {/* Base Price Box */}
                             <div className="bg-black/90 border-2 border-[#fbbf24]/30 rounded-tl-3xl rounded-bl-lg p-5 w-56 text-center -skew-x-[12deg] shadow-xl">
                                 <div className="skew-x-[12deg]">
                                     <p className="text-[#fbbf24] text-[10px] font-black uppercase tracking-[0.2em] mb-1">Base Price</p>
                                     <p className="text-white font-black text-3xl italic tracking-tighter tabular-nums drop-shadow-sm">
                                         ₹ {player ? (getEffectiveBasePrice(player, state.categories) >= 10000000 ? (getEffectiveBasePrice(player, state.categories)/10000000).toFixed(2) + 'Cr' : (getEffectiveBasePrice(player, state.categories)/100000).toFixed(2) + 'Lks') : '0.00'}
                                     </p>
                                 </div>
                             </div>

                             {/* Player Name Central Box */}
                             <div className="bg-gradient-to-b from-[#fbbf24] to-[#d97706] border-2 border-white/30 p-6 px-16 min-w-[420px] text-center shadow-[0_0_50px_rgba(251,191,36,0.4)] relative">
                                 <div className="absolute -top-2 left-0 w-full h-2 bg-white/40 blur-sm"></div>
                                 <h1 className="text-black font-black text-5xl uppercase tracking-tighter italic leading-none drop-shadow-md">{player?.name}</h1>
                                 <div className="flex items-center justify-center gap-4 mt-2">
                                     <span className="bg-black text-[#fbbf24] px-3 py-0.5 rounded-sm text-[10px] font-black uppercase tracking-widest leading-none">
                                         {player?.category}
                                     </span>
                                     <span className="text-black/70 font-black uppercase tracking-[0.15em] text-xs italic">{player?.role || player?.speciality || 'PLAYER'}</span>
                                 </div>
                             </div>

                             {/* Current Bid Box */}
                             <div className="bg-black/90 border-2 border-[#fbbf24]/30 rounded-tr-3xl rounded-br-lg p-5 w-56 text-center skew-x-[12deg] shadow-xl">
                                 <div className="skew-x-[-12deg]">
                                     <p className="text-[#fbbf24] text-[10px] font-black uppercase tracking-[0.2em] mb-1">{bidder ? 'Current Bid' : 'Base Price'}</p>
                                     <p className={`text-white font-black text-3xl italic tracking-tighter tabular-nums drop-shadow-md ${!bidder ? 'animate-pulse text-[#fbbf24]/80' : ''}`}>
                                         ₹ {bid >= 10000000 ? (bid/10000000).toFixed(2) + 'Cr' : (bid/100000).toFixed(2) + 'Lks'}
                                     </p>
                                 </div>
                             </div>
                         </div>

                         {/* Career Stats Ticker Area */}
                         <div className="mt-1 bg-black/95 w-full h-10 border-x-2 border-b-2 border-white/10 flex items-center justify-center">
                             <div className="flex items-center gap-12 font-black uppercase italic tracking-tighter">
                                 <div className="flex items-center gap-3">
                                     <span className="text-[#fbbf24] text-[10px]">IPL CAREER</span>
                                     <span className="text-white text-sm">MTS <span className="text-[#fbbf24]">{player?.stats?.matches || 0}</span></span>
                                 </div>
                                 <div className="flex items-center gap-3">
                                     <span className="text-white text-sm">RUNS <span className="text-[#fbbf24]">{player?.stats?.runs || 0}</span></span>
                                 </div>
                                 <div className="flex items-center gap-3">
                                     <span className="text-white text-sm">WKTS <span className="text-[#fbbf24]">{player?.stats?.wickets || 0}</span></span>
                                 </div>
                             </div>
                         </div>
                     </motion.div>

                     {/* Right Dynamic Information Panel */}
                     <AnimatePresence>
                         {showRightPanel && (
                             <motion.div 
                                initial={{ x: 500, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: 500, opacity: 0 }}
                                className="absolute right-12 w-[420px] bg-black/80 backdrop-blur-3xl border-t border-x border-[#fbbf24]/30 shadow-2xl pointer-events-auto"
                             >
                                 {/* Header with Background Pattern */}
                                 <div className="bg-gradient-to-r from-[#1e1b4b] to-black p-4 border-b-2 border-[#fbbf24] flex items-center justify-between">
                                     <h3 className="text-[#fbbf24] font-black text-xl uppercase tracking-tighter italic">
                                         {rightPanelType === 'PURSES' ? 'PURSE REMAINING' : rightPanelType === 'TOP_BUYS' ? 'TOP BUYS' : rightPanelType === 'REMAINING_PLAYERS' ? 'REMAINING' : 'CATEGORY OVERVIEW'}
                                     </h3>
                                     <div className="w-2 h-2 bg-[#fbbf24] rounded-full animate-pulse"></div>
                                 </div>

                                 <div className="p-1 space-y-px">
                                     {/* Side Panel Table Style Content */}
                                     <div className="bg-white/5 grid grid-cols-[2fr_1.5fr_1fr] p-2 px-4 text-[9px] font-black text-[#fbbf24]/50 uppercase tracking-widest border-b border-white/5">
                                         <span>Teams</span>
                                         <span className="text-right">Purse Rem</span>
                                         <span className="text-right">Players</span>
                                     </div>

                                     {rightPanelType === 'PURSES' && [...state.teams].sort(() => Math.random() - 0.5).slice(0, 4).map((t, i) => (
                                         <motion.div 
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.1 }}
                                            key={t.id} 
                                            className="grid grid-cols-[2fr_1.5fr_1fr] p-3 px-4 items-center bg-black/40 border-b border-white/5 group hover:bg-[#fbbf24]/5 transition-colors"
                                         >
                                             <div className="flex items-center gap-3">
                                                 <img src={t.logoUrl} className="w-5 h-5 object-contain bg-white rounded-full p-0.5" />
                                                 <span className="text-white font-black text-xs uppercase tracking-tighter truncate italic">{t.name}</span>
                                             </div>
                                             <span className="text-[#fbbf24] font-black text-sm text-right tabular-nums italic">
                                                 ₹{t.budget >= 10000000 ? (t.budget/10000000).toFixed(2) + 'Cr' : (t.budget/100000).toFixed(2) + 'Lks'}
                                             </span>
                                             <span className="text-white text-center font-black text-sm tabular-nums italic">{t.players.length}</span>
                                         </motion.div>
                                     ))}

                                     {rightPanelType === 'TOP_BUYS' && state.teams.flatMap(t => t.players).sort((a,b) => (b.soldPrice || 0) - (a.soldPrice || 0)).slice(0, 4).map((p, i) => (
                                         <motion.div 
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.1 }}
                                            key={i} 
                                            className="grid grid-cols-[2fr_1.5fr_1fr] p-3 px-4 items-center bg-black/40 border-b border-white/5 group"
                                         >
                                             <div className="flex items-center gap-3">
                                                 <span className="text-white/20 text-[10px] font-bold">#{i+1}</span>
                                                 <span className="text-white font-black text-xs uppercase tracking-tighter truncate italic">{p.name}</span>
                                             </div>
                                             <span className="text-[#fbbf24] font-black text-sm text-right tabular-nums italic">
                                                 ₹{(p.soldPrice || 0) >= 10000000 ? ((p.soldPrice || 0)/10000000).toFixed(2) + 'Cr' : ((p.soldPrice || 0)/100000).toFixed(2) + 'Lks'}
                                             </span>
                                             <span className="text-white/40 text-[7px] font-bold text-right uppercase truncate pl-4">{p.soldTo || '-'}</span>
                                         </motion.div>
                                     ))}

                                     {rightPanelType === 'CATEGORY_STATS' && state.categories.sort(() => Math.random() - 0.5).slice(0, 4).map((cat, i) => {
                                         const soldInCat = state.teams.flatMap(t => t.players).filter(p => p.category === cat.name).length;
                                         return (
                                            <motion.div 
                                               initial={{ opacity: 0, x: 20 }}
                                               animate={{ opacity: 1, x: 0 }}
                                               transition={{ delay: i * 0.1 }}
                                               key={i} 
                                               className="grid grid-cols-[2.5fr_1fr_1fr] p-3 px-4 items-center bg-black/40 border-b border-white/5 group"
                                            >
                                                <span className="text-white font-black text-xs uppercase tracking-tighter truncate italic">{cat.name}</span>
                                                <span className="text-[#fbbf24] font-black text-sm text-right tabular-nums italic pr-4">₹{(cat.basePrice/10000000).toFixed(2)}Cr</span>
                                                <span className="text-white text-center font-black text-sm tabular-nums italic">{soldInCat}</span>
                                            </motion.div>
                                         );
                                     })}

                                      {rightPanelType === 'REMAINING_PLAYERS' && state.players.filter(p => p.status !== 'SOLD' && p.status !== 'UNSOLD').sort(() => Math.random() - 0.5).slice(0, 4).map((p, i) => (
                                         <motion.div 
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.1 }}
                                            key={i} 
                                            className="grid grid-cols-[3fr_1.5fr] p-3 px-4 items-center bg-black/40 border-b border-white/5 group"
                                         >
                                             <div className="flex items-center gap-3">
                                                 <img src={p.photoUrl} className="w-6 h-6 rounded object-cover border border-white/10" />
                                                 <span className="text-white font-black text-xs uppercase tracking-tighter truncate italic">{p.name}</span>
                                             </div>
                                             <span className="text-[#fbbf24] font-black text-xs text-right tabular-nums italic">
                                                 {p.category}
                                             </span>
                                         </motion.div>
                                     ))}
                                 </div>
                                 {/* Squad Size Footer */}
                                 <div className="bg-black p-3 px-5 border-t border-[#fbbf24]/50 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-white/40">
                                     <span>Squad Size</span>
                                     <div className="flex items-center gap-4">
                                         <span>MIN: {state.maxPlayersPerTeam ? Math.floor(state.maxPlayersPerTeam * 0.8) : 18}</span>
                                         <span>MAX: {state.maxPlayersPerTeam || 25}</span>
                                     </div>
                                 </div>
                             </motion.div>
                         )}
                     </AnimatePresence>
                 </div>

                 {/* Sold Animation Overlay */}
                 <AnimatePresence>
                    {status === 'SOLD' && bidder && (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[300] flex items-end justify-center pb-20 bg-black/20 backdrop-blur-sm pointer-events-none"
                        >
                            <motion.div 
                                initial={{ y: 200, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: 200, opacity: 0 }}
                                transition={{ type: 'spring', damping: 20, stiffness: 150 }}
                                className="relative w-full max-w-5xl"
                            >
                                {/* Impact Background Ring */}
                                <div className="absolute inset-x-[-100px] -bottom-[100px] h-[300px] bg-[#fbbf24]/10 blur-[100px] rounded-full animate-pulse"></div>
                                
                                <div className="bg-[#fbbf24] p-1 shadow-[0_0_100px_rgba(251,191,36,0.4)] skew-x-[-15deg] relative z-10 overflow-hidden">
                                    <div className="bg-black py-8 flex items-center justify-between skew-x-[15deg] border-x-[8px] border-[#fbbf24] relative px-12">
                                        
                                        <div className="flex items-center gap-8">
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                transition={{ delay: 0.2 }}
                                                className="bg-white p-2 rounded-2xl shadow-xl border-4 border-[#fbbf24] w-24 h-24 flex items-center justify-center shrink-0"
                                            >
                                                <img src={bidder?.logoUrl} className="w-full h-full object-contain" />
                                            </motion.div>
                                            <div className="flex flex-col">
                                                <span className="text-[#fbbf24] text-xs font-black uppercase tracking-[0.4em] mb-1 italic">Sold To</span>
                                                <h1 className="text-white text-5xl font-black uppercase tracking-tighter italic leading-none drop-shadow-lg">
                                                    {bidder?.name}
                                                </h1>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end">
                                            <motion.div
                                                initial={{ x: 50, opacity: 0 }}
                                                animate={{ x: 0, opacity: 1 }}
                                                transition={{ delay: 0.4 }}
                                                className="flex flex-col items-end"
                                            >
                                                <span className="text-[#fbbf24] text-xs font-black uppercase tracking-[0.3em] mb-1">Final Price</span>
                                                <span className="text-white text-6xl font-black tabular-nums italic tracking-tighter drop-shadow-lg leading-none">
                                                    ₹ {bid >= 10000000 ? (bid/10000000).toFixed(2) + 'Cr' : (bid/100000).toFixed(2) + 'Lks'}
                                                </span>
                                            </motion.div>
                                        </div>

                                        {/* Decorative Element */}
                                        <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-[#fbbf24]/5 to-transparent pointer-events-none"></div>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                 </AnimatePresence>
                 <IPLTicker teams={state.teams} systemLogoUrl={state.systemLogoUrl} />
            </div>
        )}
        {(layout === 'STANDARD' || layout === 'EMERALD_GOLD') && (() => {
            const isSold = status === 'SOLD';
            const isUnsold = status === 'UNSOLD';
            const isSoldOrUnsold = isSold || isUnsold;
            const isPurple = layout === 'STANDARD';

            // BASE COLORS CONFIGURATION
            const normalBg = isPurple ? 'bg-[#2A0A5E]' : 'bg-[#101820]';
            const accentTextClass = isPurple ? 'text-[#00E5FF]' : 'text-[#00C853]';
            const accentBgClass = isPurple ? 'bg-[#00E5FF]' : 'bg-[#00C853]';

            // LeftBox styling based on state
            let leftBoxBgClass = '';
            if (isSold) {
                leftBoxBgClass = isPurple
                    ? 'bg-gradient-to-r from-violet-950 via-[#2A0A5E]/90 to-violet-950 border-[#AEEA00] border-l-8'
                    : 'bg-gradient-to-r from-emerald-950 via-[#101820]/90 to-emerald-950 border-[#FFD700] border-l-8';
            } else if (isUnsold) {
                leftBoxBgClass = 'bg-gradient-to-r from-red-950 via-[#7f1d1d]/90 to-red-950 border-red-500 border-l-8';
            } else {
                leftBoxBgClass = `${normalBg} border-l-8 ${isPurple ? 'border-[#00E5FF]' : 'border-[#00C853]'} border-t border-b border-r border-white/10`;
            }

            // RightBox styling based on state
            let rightBoxBgClass = '';
            if (isSold) {
                rightBoxBgClass = isPurple
                    ? 'bg-gradient-to-l from-violet-950 via-[#2A0A5E]/90 to-violet-950 border-[#AEEA00] border-r-8'
                    : 'bg-gradient-to-l from-emerald-950 via-[#101820]/90 to-emerald-950 border-[#FFD700] border-r-8';
            } else if (isUnsold) {
                rightBoxBgClass = 'bg-gradient-to-l from-red-950 via-[#7f1d1d]/90 to-red-950 border-red-500 border-r-8';
            } else {
                rightBoxBgClass = `${normalBg} border-r-8 ${isPurple ? 'border-[#00E5FF]' : 'border-[#00C853]'} border-t border-b border-l border-white/10`;
            }

            return (
                <div className="min-h-screen w-full relative font-sans overflow-hidden">
                    <style>{`
                        @keyframes marquee-very-fast {
                            0% { transform: translateX(0); }
                            100% { transform: translateX(-33.333%); }
                        }
                    `}</style>

                    {/* Right-mid Side Static/Fading Card showing sold/unsold details until new player is selected */}
                    {isSoldOrUnsold && player && (
                        <div className="absolute right-10 top-1/2 -translate-y-1/2 z-40 animate-slide-in-right">
                            <div className={`w-[400px] border-4 rounded-[2rem] overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.85)] relative transition-all duration-500 ${
                                isPurple ? 'bg-[#2A0A5E] border-[#00E5FF]' : 'bg-[#101820] border-[#00C853]'
                            }`}>
                                {/* Header */}
                                <div className={`p-4 text-center border-b ${
                                    isPurple ? 'bg-[#150430] border-[#00E5FF]/20' : 'bg-[#060a0e] border-[#00C853]/20'
                                }`}>
                                    <h2 className="text-2xl font-black text-white uppercase tracking-wider leading-none">{player.name}</h2>
                                    <p className={`text-xs font-black uppercase tracking-[0.2em] mt-1.5 ${
                                        isPurple ? 'text-[#00E5FF]' : 'text-[#00C853]'
                                    }`}>{player.category} • {player.role || player.speciality}</p>
                                </div>
                                
                                {/* Photo Container */}
                                <div className="h-[320px] w-full bg-slate-950 relative overflow-hidden">
                                    <img src={player.photoUrl} className="w-full h-full object-cover object-top" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-transparent to-transparent"></div>
                                    
                                    {isUnsold && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[1.5px]">
                                            <div className="bg-red-600 text-white font-black text-4xl uppercase px-6 py-2 border-4 border-white shadow-2xl skew-x-[-10deg] animate-pulse">
                                                UNSOLD
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Bottom detail bar */}
                                {isSold && bidder ? (
                                    <div className={`h-24 flex items-center px-6 relative overflow-visible ${
                                        isPurple ? 'bg-gradient-to-r from-[#AEEA00] to-[#00E5FF]' : 'bg-gradient-to-r from-[#FFD700] to-[#00C853]'
                                    }`}>
                                        <div className="flex flex-col z-10 text-black">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="bg-black text-white font-black text-[10px] italic uppercase px-2 py-0.5 rounded leading-none shadow">
                                                    SOLD
                                                </span>
                                                <span className="font-extrabold text-[11px] uppercase tracking-wider">
                                                    To {bidder.name}
                                                </span>
                                            </div>
                                            <p className="text-5xl font-black tracking-tighter leading-none mt-1">
                                                ₹ {bid.toLocaleString()}
                                            </p>
                                        </div>
                                        <div className={`absolute -top-8 right-6 w-24 h-24 bg-white rounded-2xl p-1.5 shadow-2xl border-4 ${
                                            isPurple ? 'border-[#00E5FF]' : 'border-[#00C853]'
                                        } flex items-center justify-center overflow-hidden z-20`}>
                                            {bidder.logoUrl ? (
                                                <img src={bidder.logoUrl} className="w-full h-full object-contain" />
                                            ) : (
                                                <div className="w-full h-full bg-slate-800 flex items-center justify-center font-black text-2xl text-white">
                                                    {bidder.name.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-red-600 h-24 flex items-center justify-between px-6">
                                        <div className="flex flex-col">
                                            <span className="text-red-200 text-xs font-black uppercase tracking-widest leading-none">Status</span>
                                            <span className="text-white text-3xl font-black uppercase tracking-wider leading-none mt-1">UNSOLD</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-red-200 text-xs font-black uppercase tracking-widest leading-none">Base Price</span>
                                            <span className="text-white text-2xl font-black leading-none mt-1 block">₹ {bid.toLocaleString()}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Bottom overlay designed strictly to have a smooth transition/fade downwards on hideBottomOverlay */}
                    <motion.div 
                        initial={{ y: 0, opacity: 1 }}
                        animate={{ 
                            y: hideBottomOverlay ? 220 : 0, 
                            opacity: hideBottomOverlay ? 0 : 1 
                        }}
                        transition={{ type: 'spring', stiffness: 180, damping: 22 }}
                        className="fixed bottom-16 left-0 right-0 w-full px-2 md:px-6 flex items-end justify-between gap-4 z-30"
                    >
                        {/* Left Box */}
                        <div className="flex-1 flex flex-col items-end mr-2 min-w-0">
                            <div className={`w-full text-white py-4 px-6 rounded-l-lg shadow-2xl transform skew-x-[-12deg] origin-bottom-right flex items-center justify-end relative overflow-hidden h-[88px] transition-all duration-300 ${leftBoxBgClass}`}>
                                {isSoldOrUnsold ? (
                                    <div className="absolute inset-0 overflow-hidden flex items-center w-full h-full z-10">
                                        <div className="flex animate-[marquee-very-fast_4s_linear_infinite] whitespace-nowrap select-none w-max uppercase italic font-black">
                                            {Array(8).fill(isSold ? "SOLD. " : "UNSOLD. ").map((t, idx) => (
                                                <span 
                                                    key={idx} 
                                                    className="mx-3 text-3xl md:text-4xl tracking-widest text-white"
                                                    style={{
                                                        textShadow: isSold 
                                                            ? (isPurple ? '0 0 4px #fff, 0 0 12px #AEEA00, 0 0 24px #00E5FF' : '0 0 4px #fff, 0 0 12px #FFD700, 0 0 24px #00C853')
                                                            : '0 0 4px #fff, 0 0 12px #ef4444, 0 0 24px #ef4444'
                                                    }}
                                                >
                                                    {t}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="transform skew-x-[12deg] text-right truncate w-full z-10">
                                        <h1 className="text-2xl md:text-3xl lg:text-4xl font-black uppercase tracking-tight truncate drop-shadow-md leading-tight">{player?.name}</h1>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2 mt-[-4px] mr-8 transform skew-x-[-12deg] z-10">
                                <div className={`${accentBgClass} ${isPurple ? 'text-black' : 'text-white'} py-1.5 px-6 rounded-b shadow-lg border-b-2 border-white`}>
                                    <div className="transform skew-x-[12deg] text-center font-extrabold text-sm uppercase tracking-widest">{player?.category}</div>
                                </div>
                                <div className={`bg-white ${isPurple ? 'text-[#2A0A5E]' : 'text-[#101820]'} py-1.5 px-6 rounded-b shadow-lg border-b-2 ${isPurple ? 'border-[#00E5FF]' : 'border-[#00C853]'}`}>
                                    <div className="transform skew-x-[12deg] text-center font-extrabold text-sm uppercase tracking-widest">{player?.role || player?.speciality || player?.category}</div>
                                </div>
                            </div>
                        </div>

                        {/* Center Box */}
                        <div className="shrink-0 flex flex-col items-center relative z-20 -mb-4 mx-2">
                            <div className={`w-56 h-56 rounded-full border-[6px] ${isPurple ? 'border-[#00E5FF]' : 'border-[#00C853]'} ${isPurple ? 'bg-[#2A0A5E]' : 'bg-[#101820]'} shadow-[0_0_30px_rgba(0,0,0,0.5)] overflow-hidden relative z-10`}>
                                <img src={player?.photoUrl} alt={player?.name} className="w-full h-full object-cover object-top" />
                                {isUnsold && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[2px] rounded-full">
                                        <span className="font-black text-3xl uppercase -rotate-12 border-4 px-3 py-1 tracking-wider shadow-xl text-red-500 border-red-500">UNSOLD</span>
                                    </div>
                                )}
                            </div>
                            <div className="relative z-30 mt-6">
                                <div className="flex items-stretch shadow-2xl rounded-full overflow-hidden border-4 border-white min-w-[280px] transform hover:scale-105 transition-transform">
                                    <div className={`${normalBg} text-white px-5 py-3 flex items-center justify-center border-r border-gray-700`}>
                                        <span className={`text-xs font-bold uppercase tracking-widest ${accentTextClass}`}>{bidder ? 'Current Bid' : 'Base Price'}</span>
                                    </div>
                                    <div className={`bg-gradient-to-r ${isPurple ? 'from-[#00E5FF] to-blue-700' : 'from-[#00C853] to-emerald-800'} px-6 py-2 flex items-center justify-center flex-grow`}>
                                        <span className={`text-5xl font-black text-white leading-none tabular-nums drop-shadow-sm ${!bidder ? 'animate-pulse text-cyan-200' : ''}`}>{bid.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Box */}
                        <div className="flex-1 flex flex-col items-start ml-2 relative min-w-0">
                            <div className={`w-full text-white py-4 px-6 rounded-r-lg shadow-2xl transform skew-x-[12deg] origin-bottom-left flex items-center relative h-[88px] z-20 transition-all duration-300 ${rightBoxBgClass}`}>
                                {isSoldOrUnsold ? (
                                    <div className="absolute inset-0 overflow-hidden flex items-center w-full h-full z-10">
                                        <div className="flex animate-[marquee-very-fast_4s_linear_infinite] whitespace-nowrap select-none w-max uppercase italic font-black">
                                            {Array(8).fill(isSold ? "SOLD. " : "UNSOLD. ").map((t, idx) => (
                                                <span 
                                                    key={idx} 
                                                    className="mx-3 text-3xl md:text-4xl tracking-widest text-white"
                                                    style={{
                                                        textShadow: isSold 
                                                            ? (isPurple ? '0 0 4px #fff, 0 0 12px #AEEA00, 0 0 24px #00E5FF' : '0 0 4px #fff, 0 0 12px #FFD700, 0 0 24px #00C853')
                                                            : '0 0 4px #fff, 0 0 12px #ef4444, 0 0 24px #ef4444'
                                                    }}
                                                >
                                                    {t}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="transform skew-x-[-12deg] w-full pl-4 pr-32 z-10">
                                        <h2 className="text-2xl md:text-3xl lg:text-4xl font-black uppercase tracking-tight truncate drop-shadow-md leading-tight text-left">{bidder ? bidder.name : "NO BIDS YET"}</h2>
                                    </div>
                                )}
                            </div>
                            <div className={`bg-white ${isPurple ? 'text-[#2A0A5E]' : 'text-[#101820]'} py-1.5 px-8 rounded-b-lg shadow-lg mt-[-4px] ml-8 transform skew-x-[12deg] border-b-2 ${isPurple ? 'border-[#00E5FF]' : 'border-[#00C853]'} z-10 min-w-[220px]`}>
                                <div className="transform skew-x-[12deg] flex items-center gap-3">
                                    <span className="font-bold text-sm uppercase text-gray-500">Balance:</span>
                                    <span className="font-extrabold text-2xl">{bidder ? bidder.budget.toLocaleString() : "-"}</span>
                                </div>
                            </div>
                            {bidder && !isSoldOrUnsold && (
                                <div className="absolute bottom-6 right-8 z-30">
                                    <div className={`w-28 h-28 bg-white rounded-full shadow-2xl border-4 ${isPurple ? 'border-[#00E5FF]' : 'border-[#00C853]'} p-2 flex items-center justify-center transform hover:scale-105 transition-transform overflow-hidden font-sans`}>
                                        {bidder.logoUrl ? <img src={bidder.logoUrl} className="w-full h-full object-contain" /> : <span className="text-4xl font-bold text-gray-300">?</span>}
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            );
        })()}
        {layout === 'MINIMAL' && <div className="min-h-screen w-full relative"><div className="absolute bottom-12 left-0 right-0 flex justify-center"><div className="bg-gradient-to-r from-indigo-900 to-blue-900 backdrop-blur-md rounded-full px-6 py-2 flex items-center gap-6 border-2 border-cyan-500 shadow-xl"><div className="flex items-center gap-3"><img src={player?.photoUrl} className="w-12 h-12 rounded-full border-2 border-white object-cover" /><div><h1 className="text-white font-bold text-lg leading-none">{player?.name}</h1><span className="text-xs text-cyan-400 uppercase font-bold">{player?.category}</span></div></div><div className="w-px h-8 bg-white/20"></div><div className="flex items-center gap-2"><DollarSign className="w-5 h-5 text-green-400" /><span className="text-3xl font-black text-white tabular-nums">{bid.toLocaleString()}</span></div>{bidder && (<><div className="w-px h-8 bg-white/20"></div><div className="flex items-center gap-2">{bidder.logoUrl && <img src={bidder.logoUrl} className="w-8 h-8 object-contain bg-white rounded-full p-0.5" />}<span className="text-white font-bold">{bidder.name}</span></div></>)}{status !== 'LIVE' && (<div className={`px-3 py-1 rounded-full font-bold text-xs ${status === 'SOLD' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>{status}</div>)}</div></div></div>}
        {layout === 'VERTICAL' && <div className="min-h-screen w-full relative"><div className="absolute top-0 right-0 h-full w-[300px] bg-gradient-to-b from-indigo-900 to-slate-900 border-l-4 border-cyan-500 flex flex-col p-6 shadow-2xl"><div className="bg-white/10 rounded-full p-2 mb-4 flex justify-center mx-auto w-36 h-36 border-4 border-cyan-500 relative"><img src={player?.photoUrl} className="w-full h-full rounded-full object-cover" /></div><h1 className="text-white text-2xl font-black text-center mb-1 leading-tight">{player?.name}</h1><p className="text-cyan-400 text-center text-sm font-bold uppercase mb-6 tracking-widest">{player?.role || player?.speciality || player?.category}</p><div className="bg-white/10 p-4 rounded-xl text-center mb-6 border border-white/20"><p className="text-gray-300 text-xs uppercase mb-1 font-bold">Current Bid</p><p className="text-4xl font-black text-white">{bid.toLocaleString()}</p></div>{bidder ? (<div className="bg-indigo-800 p-4 rounded-xl border border-indigo-600"><p className="text-xs text-gray-300 uppercase mb-2 font-bold">Highest Bidder</p><div className="flex items-center gap-3">{bidder.logoUrl ? <img src={bidder.logoUrl} className="w-10 h-10 rounded-full bg-white p-0.5"/> : <div className="w-10 h-10 bg-gray-600 rounded-full"/>}<p className="font-bold text-white leading-tight">{bidder.name}</p></div></div>) : (<div className="text-center text-gray-500 italic mt-4">Waiting for bids...</div>)}<div className="mt-auto">{status === 'SOLD' && <div className="bg-green-600 text-white text-center py-2 font-black text-xl rounded uppercase animate-pulse shadow-lg">SOLD</div>}{status === 'UNSOLD' && <div className="bg-red-600 text-white text-center py-2 font-black text-xl rounded uppercase shadow-lg">UNSOLD</div>}</div></div></div>}
        
        {layout === 'ADVAYA' && (
            <div className="min-h-screen w-full relative font-sans overflow-hidden bg-transparent flex items-center justify-center">
                
                <AnimatePresence mode="wait">
                    {state.adminViewOverride?.type === 'TOP_5' ? (
                        <motion.div 
                            key="top-buys"
                            initial={{ x: -1000, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -1000, opacity: 0 }}
                            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                            className="absolute left-10 top-32 w-[600px] z-[100]"
                        >
                            <div className="bg-black/95 rounded-[2rem] border-2 border-yellow-500/50 advaya-border-glow p-8 shadow-[0_0_50px_rgba(0,0,0,1)]">
                                <h3 className="text-yellow-500 font-black text-3xl uppercase tracking-widest italic mb-8 border-b-2 border-yellow-500/30 pb-4">Tournament Top Buys</h3>
                                <div className="space-y-4">
                                    {state.teams.flatMap(t => t.players).sort((a,b) => (b.soldPrice || 0) - (a.soldPrice || 0)).slice(0, 5).map((p, i) => (
                                        <div key={i} className="flex justify-between items-center bg-yellow-500/5 p-4 rounded-xl border border-yellow-500/10">
                                            <div className="flex items-center gap-4">
                                                <span className="text-yellow-500 font-black text-xl italic">#{i+1}</span>
                                                <span className="text-white font-black uppercase text-sm italic">{p.name}</span>
                                            </div>
                                            <span className="text-yellow-500 font-black text-lg italic">₹{p.soldPrice?.toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div 
                            key={player?.id || 'empty'}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.5 }}
                            className="flex flex-col items-center gap-6"
                        >
                            {/* Central Middle Layout - Advaya */}
                            <div className="advaya-border-glow p-1 rounded-full shadow-[0_0_100px_rgba(250,204,21,0.15)] relative">
                                <div className="w-64 h-64 rounded-full overflow-hidden border-4 border-yellow-500 bg-black p-1">
                                    <img src={player?.photoUrl} className="w-full h-full object-cover object-top" />
                                </div>
                                {status === 'UNSOLD' && (
                                    <div className="absolute inset-0 bg-red-600/60 backdrop-blur-sm rounded-full flex items-center justify-center border-4 border-red-600">
                                        <span className="text-white font-black text-4xl -rotate-12 border-4 px-4 py-1">UNSOLD</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col items-center gap-1 w-[800px]">
                                {/* Middle Stats Plate */}
                                <div className="w-full bg-black/95 rounded-[2rem] border-2 border-yellow-500/50 advaya-border-glow p-8 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500/40 to-transparent"></div>
                                    
                                    <div className="flex items-center justify-center gap-4 mb-4">
                                        <span className="bg-yellow-500 text-black px-6 py-1 rounded-lg font-black text-xl uppercase tracking-[0.2em] italic skew-x-[-12deg]">
                                            {player?.category}
                                        </span>
                                        <span className="text-yellow-500/60 font-black uppercase tracking-widest text-lg italic">{player?.role || player?.speciality}</span>
                                    </div>

                                    <h1 className="text-7xl font-black uppercase italic text-white tracking-tighter mb-6 text-center leading-none">{player?.name}</h1>

                                    <div className="w-full flex items-center justify-between border-t border-yellow-500/20 pt-6 px-10">
                                        <div className="flex flex-col items-center">
                                            <span className="text-yellow-500/40 text-[10px] font-black uppercase tracking-widest mb-1">Base Price</span>
                                            <span className="text-white font-black text-4xl italic tracking-tighter">₹ {player ? getEffectiveBasePrice(player, state.categories).toLocaleString() : '0'}</span>
                                        </div>
                                        <div className="h-16 w-px bg-yellow-500/20"></div>
                                        <div className="flex flex-col items-center">
                                            <span className="text-yellow-500 text-[10px] font-black uppercase tracking-widest mb-1">{bidder ? 'Current Bid' : 'No Bid'}</span>
                                            <span className="text-yellow-500 font-black text-5xl italic tracking-tighter drop-shadow-[0_0_15px_rgba(250,204,21,0.3)] tabular-nums">
                                                ₹ {bid.toLocaleString()}
                                            </span>
                                        </div>
                                        {bidder && (
                                            <>
                                                <div className="h-16 w-px bg-yellow-500/20"></div>
                                                <div className="flex flex-col items-center">
                                                    <span className="text-yellow-500/40 text-[10px] font-black uppercase tracking-widest mb-1">Leader</span>
                                                    <div className="flex items-center gap-3">
                                                       {bidder.logoUrl && <img src={bidder.logoUrl} className="w-8 h-8 object-contain bg-white rounded-full p-1 shadow-md" />}
                                                       <span className="text-white font-black text-3xl italic tracking-tighter uppercase">{bidder.name}</span>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Sold Animation Bottom - Advaya */}
                <AnimatePresence>
                    {status === 'SOLD' && bidder && (
                        <motion.div 
                            initial={{ y: 200, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 200, opacity: 0 }}
                            className="fixed bottom-10 left-0 w-full flex justify-center z-[200]"
                        >
                            <div className="w-[1000px] bg-black/95 border-b-8 border-yellow-500 advaya-border-glow rounded-3xl p-6 flex items-center justify-between shadow-[0_0_100px_rgba(0,0,0,1)] relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-yellow-500/10 to-transparent pointer-events-none"></div>
                                <div className="flex items-center gap-8">
                                    <div className="bg-white p-3 rounded-2xl border-4 border-yellow-500 w-24 h-24 flex items-center justify-center shrink-0 shadow-2xl">
                                        <img src={bidder.logoUrl} className="w-full h-full object-contain" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-yellow-500 font-black text-xl italic skew-x-[-12deg] tracking-widest mb-1 uppercase">SOLD TO</span>
                                        <h2 className="text-white text-6xl font-black uppercase italic tracking-tighter leading-none drop-shadow-2xl">{bidder.name}</h2>
                                    </div>
                                </div>
                                <div className="text-right flex flex-col items-end">
                                    <span className="text-yellow-500 font-black text-xl italic tracking-[0.2em] mb-1 uppercase">WINNING BID</span>
                                    <span className="text-white text-7xl font-black italic tracking-tighter drop-shadow-2xl leading-none">₹ {bid.toLocaleString()}</span>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        )}
        <Marquee show={state.sponsorConfig?.showTickerOnOBS ?? state.sponsorConfig?.showHighlights ?? false} content={marqueeContent} layout={state.obsLayout} />

        {/* Full Bottom-Covering Announcement Overlay (3-second duration) */}
        <AnimatePresence>
            {activeAlert && activeAlert.show && layout !== 'STANDARD' && layout !== 'EMERALD_GOLD' && (
                <motion.div 
                    initial={{ y: 250, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 250, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 220, damping: 20 }}
                    className={`fixed bottom-0 left-0 w-full z-[999] flex flex-col bg-zinc-950 font-sans border-t-4 transition-all duration-300 ${
                        activeAlert.type === 'SOLD' 
                            ? 'border-amber-500 shadow-[0_-15px_40px_rgba(234,179,8,0.45)]' 
                            : 'border-red-500 shadow-[0_-15px_40px_rgba(239,68,68,0.45)]'
                    }`}
                    style={{ height: '220px' }}
                >
                    {/* Marquee Stripe */}
                    <div className={`w-full overflow-hidden whitespace-nowrap py-1.5 font-black uppercase text-xs tracking-[0.3em] relative z-20 ${
                        activeAlert.type === 'SOLD' 
                            ? 'bg-amber-500 text-black' 
                            : 'bg-red-500 text-white'
                    }`}>
                        <div className="flex animate-marquee-fast w-max will-change-transform">
                            {Array(18).fill(activeAlert.type).map((t, i) => (
                                <span key={i} className="mx-8 flex items-center">
                                    ★ {t} ★
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Announcement Main Content Area */}
                    <div className="flex-1 flex items-center justify-between px-16 relative z-10 bg-slate-950/95">
                        {activeAlert.type === 'SOLD' ? (
                            <>
                                <div className="flex items-center gap-8">
                                    <div className="w-24 h-24 bg-white/95 rounded-2xl p-2 border-4 border-amber-500 flex items-center justify-center shadow-2xl shrink-0">
                                         {activeAlert.teamLogo ? (
                                             <img src={activeAlert.teamLogo} className="w-full h-full object-contain" alt="" />
                                         ) : (
                                             <div className="w-full h-full bg-blue-900 rounded-xl flex items-center justify-center text-4xl font-extrabold text-white">{activeAlert.teamName?.charAt(0)}</div>
                                         )}
                                    </div>
                                    <div>
                                        <div className="text-amber-500 font-extrabold text-xs tracking-[0.3em] uppercase mb-1 flex items-center gap-1.5">
                                            <CheckCircle2 className="w-4 h-4 text-amber-400" /> CONGRATULATIONS
                                        </div>
                                        <h2 className="text-white text-5xl font-black italic tracking-tighter leading-none uppercase">
                                            {activeAlert.teamName}
                                        </h2>
                                        <div className="text-zinc-400 font-bold text-sm mt-1 uppercase">
                                            SIGNED PLAYER: <span className="text-white font-black text-lg tracking-tight bg-white/5 py-0.5 px-2.5 rounded border border-white/10 ml-1.5">{activeAlert.playerName}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="text-right">
                                    <div className="text-amber-500/70 font-extrabold text-[10px] tracking-widest uppercase mb-1">WINNING INVEST</div>
                                    <p className="text-amber-400 font-black text-6xl italic tracking-tighter leading-none glow-text-gold drop-shadow-[0_0_20px_rgba(234,179,8,0.5)]">
                                        ₹ {activeAlert.price?.toLocaleString()}
                                    </p>
                                </div>
                            </>
                        ) : (
                            <div className="w-full flex items-center justify-between">
                                <div className="flex items-center gap-8">
                                    <div className="w-24 h-24 bg-red-500/10 rounded-2xl border-4 border-red-500 flex items-center justify-center shadow-2xl shrink-0">
                                         <XCircle className="w-14 h-14 text-red-500" />
                                    </div>
                                    <div>
                                        <div className="text-red-500 font-extrabold text-xs tracking-[0.3em] uppercase mb-1">LOT STATUS PASS</div>
                                        <h2 className="text-red-500 text-5xl font-black italic tracking-tighter leading-none glow-text-red uppercase">
                                            UNSOLD
                                        </h2>
                                        <div className="text-zinc-400 font-bold text-sm mt-1 uppercase">
                                            PLAYER: <span className="text-white font-black text-lg tracking-tight bg-white/5 py-0.5 px-2.5 rounded border border-white/10 ml-1.5">{activeAlert.playerName}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-zinc-500 font-black uppercase text-xl italic tracking-widest bg-red-500/5 px-6 py-3 rounded-2xl border border-red-500/15">
                                    No Bids Received
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Repeating marquee helper styles */}
                    <style>{`
                        @keyframes marquee-fast {
                            0% { transform: translateX(0); }
                            100% { transform: translateX(-50%); }
                        }
                        .animate-marquee-fast {
                            animation: marquee-fast 12s linear infinite;
                        }
                    `}</style>
                </motion.div>
            )}
        </AnimatePresence>
    </>
  );
};

export default OBSOverlay;
