
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useAuction } from '../hooks/useAuction';
import { useParams } from 'react-router-dom';
import { Globe, User, TrendingUp, Wallet, Trophy, Star, AlertTriangle, Users, Zap, CheckCircle, Activity, ArrowRightLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Team, Player, AuctionStatus, ProjectorLayout } from '../types';
import { getEffectiveBasePrice } from '../utils';
import confetti from 'canvas-confetti';

interface DisplayState {
    player: Player | null;
    bid: number;
    bidder: Team | null;
    status: 'WAITING' | 'LIVE' | 'SOLD' | 'UNSOLD' | 'FINISHED';
}

const Marquee = React.memo(({ content, show, layout }: { content: string[], show: boolean, layout?: ProjectorLayout }) => {
    if (!show || content.length === 0) return null;
    let bgClass = "bg-black";
    let borderClass = "border-t-4 border-highlight";
    let iconColor = "text-highlight";

    if (layout === 'IPL') bgClass = "bg-slate-900";
    if (layout === 'MODERN') bgClass = "bg-zinc-950";
    if (layout === 'STANDARD') bgClass = "bg-gray-800";
    if (layout === 'ADVAYA') {
        bgClass = "bg-[#050505]";
        borderClass = "border-t-2 border-yellow-500 shadow-[0_-5px_20px_rgba(234,179,8,0.4)]";
        iconColor = "text-yellow-500 glow-text-gold";
    }

    return (
          <div className={`fixed bottom-0 left-0 w-full ${bgClass} text-white py-2 overflow-hidden whitespace-nowrap z-50 shadow-2xl ${borderClass}`}>
              <div className="flex animate-marquee w-max will-change-transform">
                  <div className="flex shrink-0 items-center">
                    {content.map((text, i) => (
                        <span key={i} className="mx-8 font-bold text-2xl tracking-wide flex items-center uppercase">
                            <span className={`${iconColor} mr-3 text-xl`}>★</span> {text}
                        </span>
                    ))}
                  </div>
                  <div className="flex shrink-0 items-center">
                    {content.map((text, i) => (
                        <span key={`dup-${i}`} className="mx-8 font-bold text-2xl tracking-wide flex items-center uppercase">
                            <span className={`${iconColor} mr-3 text-xl`}>★</span> {text}
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

const IplRotatingRings = () => (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
            className="absolute -top-[30%] -right-[20%] w-[100vw] h-[100vw] rounded-full border-[120px] border-blue-900/10"
        />
        <motion.div 
            animate={{ rotate: -360 }}
            transition={{ duration: 100, repeat: Infinity, ease: "linear" }}
            className="absolute -bottom-[30%] -left-[20%] w-[100vw] h-[100vw] rounded-full border-[120px] border-blue-900/10"
        />
        
        {/* Specific Ring clusters like IPL theme */}
        {[1, 2, 3].map(i => (
            <motion.div
                key={`ring-${i}`}
                animate={{ rotate: i * 120 }}
                className="absolute rounded-full border-[20px] border-blue-800/15"
                style={{
                    width: `${300 + i * 400}px`,
                    height: `${300 + i * 400}px`,
                    top: i === 1 ? '-10%' : i === 2 ? '60%' : '20%',
                    left: i === 1 ? '-5%' : i === 2 ? '70%' : '10%',
                }}
            >
                <div className="absolute top-[-10px] left-1/2 -translate-x-1/2 w-3 h-3 bg-white/30 rounded-full blur-sm"></div>
                <div className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 w-3 h-3 bg-white/30 rounded-full blur-sm"></div>
                <div className="absolute left-[-10px] top-1/2 -translate-y-1/2 w-3 h-3 bg-white/30 rounded-full blur-sm"></div>
                <div className="absolute right-[-10px] top-1/2 -translate-y-1/2 w-3 h-3 bg-white/30 rounded-full blur-sm"></div>
            </motion.div>
        ))}
    </div>
);

const ProjectorScreen: React.FC = () => {
  const { state, joinAuction } = useAuction();
  const { id: auctionId } = useParams<{ id: string }>();
  const [display, setDisplay] = useState<DisplayState>({ player: null, bid: 0, bidder: null, status: 'WAITING' });
  const [latestLog, setLatestLog] = useState<string>('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [currentSponsorIndex, setCurrentSponsorIndex] = useState(0);
  const loopInterval = state.sponsorConfig?.loopInterval || 5;
  const sponsorsLength = state.sponsors.length;

  useEffect(() => {
      if (sponsorsLength <= 1) return;
      const interval = setInterval(() => { setCurrentSponsorIndex(prev => (prev + 1) % sponsorsLength); }, loopInterval * 1000);
      return () => clearInterval(interval);
  }, [sponsorsLength, loopInterval]);

  const marqueeContent = useMemo(() => {
       const tName = state.tournamentName?.toUpperCase() || "TOURNAMENT";
       const items = ["WELCOME TO AUCTION"];
       if (tName) items.push(tName);
       if (state.sponsorConfig?.showHighlights) {
           const soldPlayers = state.teams.flatMap(t => t.players).sort((a, b) => (b.soldPrice || 0) - (a.soldPrice || 0));
           if (soldPlayers.length > 0) items.push(`RECORD BUY: ${soldPlayers[0].name.toUpperCase()} SOLD FOR ${soldPlayers[0].soldPrice} TO ${soldPlayers[0].soldTo?.toUpperCase()}`);
           const purseLeader = [...state.teams].sort((a,b) => b.budget - a.budget)[0];
           if (purseLeader) items.push(`HIGHEST PURSE: ${purseLeader.name.toUpperCase()} WITH ${purseLeader.budget.toLocaleString()}`);
       }
       if (state.sponsors.length > 0) {
           items.push("SPONSORS:");
           state.sponsors.forEach(s => { items.push(s.name.toUpperCase()); });
       }
       return items;
  }, [state.sponsors, state.tournamentName, state.sponsorConfig?.showHighlights, state.teams]);

    useEffect(() => {
        let bg = '#f3f4f6';
        if (state.projectorLayout === 'IPL') bg = '#020617';
        if (state.projectorLayout === 'MODERN') bg = '#000000';
        if (state.projectorLayout === 'ADVAYA') bg = '#050505';
        document.body.style.backgroundColor = bg;
        document.documentElement.style.backgroundColor = bg;
    }, [state.projectorLayout]);

  useEffect(() => {
    if (auctionId) joinAuction(auctionId);
  }, [auctionId]);

  const [showSoldOverlay, setShowSoldOverlay] = useState(false);
  const [soldAnimationPlayer, setSoldAnimationPlayer] = useState<{player: Player, bid: number, bidder: Team | null} | null>(null);

  useEffect(() => {
    if (display.status === 'SOLD' && display.player) {
        setSoldAnimationPlayer({ player: display.player, bid: display.bid, bidder: display.bidder });
        if (!showSoldOverlay) {
            confetti({
                particleCount: 180,
                spread: 90,
                origin: { y: 0.65 }
            });
        }
        setShowSoldOverlay(true);
        const timer = setTimeout(() => {
            setShowSoldOverlay(false);
            // Optionally clear soldAnimationPlayer after transition
        }, 4000); // 3 seconds + 1s for fade out
        return () => clearTimeout(timer);
    }
  }, [display.status, display.player, showSoldOverlay]);

  useEffect(() => {
      const { currentPlayerId, players, currentBid, highestBidder, status, teams, auctionLog } = state;
      const currentPlayer = currentPlayerId ? players.find(p => String(p.id) === String(currentPlayerId)) : null;
      if (status === AuctionStatus.Finished) { setDisplay({ player: null, bid: 0, bidder: null, status: 'FINISHED' }); return; }
      if (auctionLog.length > 0) {
          const relevantLog = auctionLog.find(l => l.type === 'SOLD' || l.type === 'UNSOLD');
          if (relevantLog) setLatestLog(relevantLog.message);
      }
      if (currentPlayer) {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          let derivedStatus: 'LIVE' | 'SOLD' | 'UNSOLD' | 'FINISHED' = 'LIVE';
          if (status === AuctionStatus.Sold || currentPlayer.status === 'SOLD') {
              derivedStatus = 'SOLD';
          } else if (status === AuctionStatus.Unsold) {
              derivedStatus = 'UNSOLD';
          } else if (currentPlayer.status === 'UNSOLD') {
              // If player is UNSOLD from a previous round but is now the currentPlayer and auction is back in progress,
              // treat them as LIVE/Fresh unless specifically marked UNSOLD again in this session.
              derivedStatus = (status === AuctionStatus.InProgress || status === AuctionStatus.Paused) ? 'LIVE' : 'UNSOLD';
          }
          let resolvedBidder = highestBidder;
          if (derivedStatus === 'SOLD' && !resolvedBidder && currentPlayer.soldTo) {
             resolvedBidder = teams.find(t => t.name === currentPlayer.soldTo) || null;
          }
          const effectiveBase = getEffectiveBasePrice(currentPlayer, state.categories);
          setDisplay({ player: currentPlayer, bid: currentPlayer.soldPrice || currentBid || effectiveBase, bidder: resolvedBidder, status: derivedStatus });
      } else if (display.status !== 'WAITING' && display.status !== 'FINISHED') {
          timeoutRef.current = setTimeout(() => { setDisplay({ player: null, bid: 0, bidder: null, status: 'WAITING' }); }, 2000); 
      }
  }, [state]);

  const Header = () => {
    const layout = state.projectorLayout;
    
    if (layout === 'IPL') {
        const smLogo = state.systemLogoUrl || "/sm-sports-logo.png"; // Fallback or standard
        const tournamentLogo = state.auctionLogoUrl;
        
        return (
            <div className="h-32 bg-transparent flex items-center justify-between px-16 z-[60] shrink-0 relative">
                {/* Left: SM Sports Logo */}
                <div className="flex items-center gap-6 w-1/4">
                    <motion.div 
                        initial={{ x: -50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        className="bg-transparent h-24 flex items-center justify-center"
                    >
                        <img src={smLogo} className="h-20 w-auto object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" referrerPolicy="no-referrer" alt="SM Sports Logo" />
                    </motion.div>
                </div>
                
                {/* Middle: Auction Name + Tournament Logo */}
                <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="flex items-center gap-6">
                        {tournamentLogo && (
                            <motion.div
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="bg-white p-2 rounded-xl shadow-2xl h-16 w-16 flex items-center justify-center border-2 border-blue-900"
                            >
                                <img src={tournamentLogo} className="h-full w-full object-contain" referrerPolicy="no-referrer" alt="Tournament Logo" />
                            </motion.div>
                        )}
                        <h1 className="text-6xl lg:text-7xl font-black uppercase tracking-tighter golden-text glow-text-gold italic drop-shadow-[0_0_30px_rgba(234,179,8,0.4)]">
                            {state.tournamentName || "LIVE AUCTION"}
                        </h1>
                    </div>
                </div>

                {/* Right: Sponsors pics */}
                <div className="w-1/4 flex justify-end py-4">
                    {state.sponsorConfig?.showOnProjector && state.sponsors.length > 0 ? (
                        <div className="h-20 bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-2 flex items-center justify-center border-4 border-blue-900 min-w-40">
                            <img 
                              src={state.sponsors[currentSponsorIndex]?.imageUrl} 
                              className="max-h-full max-w-full object-contain" 
                              alt="Sponsor" 
                              referrerPolicy="no-referrer"
                              key={currentSponsorIndex}
                            />
                        </div>
                    ) : null}
                </div>
            </div>
        );
    }

    if (layout === 'ADVAYA') {
        return (
            <div className="h-32 bg-black border-b-2 border-yellow-500/50 flex items-center justify-between px-16 z-[60] shrink-0 relative overflow-hidden">
                {/* Stadium background overlay for depth */}
                <div className="absolute inset-0 stadium-bg opacity-30"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black"></div>
                
                <div className="flex items-center gap-6 w-1/4 relative z-10">
                    <div className="advaya-border-glow p-0.5 rounded-xl overflow-hidden shadow-2xl">
                        <div className="bg-black backdrop-blur-3xl px-6 py-2 rounded-xl flex items-center gap-3">
                            <Trophy className="w-8 h-8 text-yellow-500" />
                            <div className="flex flex-col">
                                <span className="text-white text-xl font-black italic tracking-tighter leading-none">{state.tournamentName || "LIVE AUCTION"}</span>
                                <span className="text-yellow-500 text-[8px] font-bold uppercase tracking-[0.3em] text-right">Live System</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="flex-1 flex justify-center relative z-10 px-8">
                    <div className="bg-black/80 backdrop-blur-2xl px-12 py-4 rounded-[40px] border-2 border-yellow-500/30">
                        <h1 className="text-5xl lg:text-7xl font-black uppercase tracking-[0.15em] text-white drop-shadow-2xl text-center italic">
                            {state.tournamentName || "LIVE AUCTION"}
                        </h1>
                    </div>
                </div>

                <div className="w-1/4 flex justify-end relative z-10 h-full py-4">
                    {state.sponsors.length > 0 && (
                        <div className="h-full aspect-video bg-white/10 backdrop-blur-xl rounded-2xl border-2 border-yellow-500/20 p-2 flex items-center justify-center overflow-hidden shadow-2xl">
                            <img src={state.sponsors[currentSponsorIndex]?.imageUrl} className="max-h-full max-w-full object-contain" alt="Sponsor" />
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
      <div className="h-32 bg-slate-950 border-b-2 border-yellow-500/50 flex items-center justify-between px-16 z-[60] shrink-0 relative overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.8)]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-transparent to-transparent opacity-50"></div>
          
          {/* Left: SM Sports Logo */}
          {/* Header Logo */}
          <div className="flex items-center gap-6 w-1/4 relative z-10">
               {state.systemLogoUrl ? (
                  <div className="relative group">
                      <div className="absolute inset-0 bg-white/20 blur-xl rounded-full opacity-50 group-hover:opacity-100 transition-opacity"></div>
                      <img src={state.systemLogoUrl} className="h-20 w-auto object-contain drop-shadow-2xl relative z-10" alt="Left Logo" />
                  </div>
              ) : (
                  <div className="flex items-center gap-4 bg-gradient-to-br from-black/80 to-slate-900/80 backdrop-blur-xl px-8 py-3 rounded-2xl border border-white/10 shadow-2xl skew-x-[-12deg]">
                      <div className="transform skew-x-[12deg] flex items-center gap-3">
                          <Trophy className="w-10 h-10 text-yellow-500" />
                          <div className="flex flex-col">
                              <span className="text-white text-2xl font-black italic tracking-tighter leading-none uppercase">{state.tournamentName || "LIVE AUCTION"}</span>
                              <span className="text-yellow-500 text-[8px] font-bold uppercase tracking-[0.3em] mt-1 text-right">Live System</span>
                          </div>
                      </div>
                  </div>
              )}
          </div>
          
          {/* Middle: Auction Name */}
          <div className="flex-1 flex justify-center relative z-10 px-8">
              <div className="relative group">
                  <div className="absolute inset-[-20px] bg-yellow-500/10 blur-[40px] rounded-full group-hover:bg-yellow-500/20 transition-all duration-700"></div>
                  <div className="bg-black/60 backdrop-blur-xl px-12 py-4 rounded-[40px] border border-yellow-500/30 shadow-[0_0_50px_rgba(234,179,8,0.15)] relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent"></div>
                      <h1 className="text-4xl md:text-5xl lg:text-7xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white via-yellow-100 to-yellow-500 drop-shadow-[0_0_30px_rgba(234,179,8,0.6)] truncate max-w-[45vw] text-center italic">
                          {state.tournamentName || "LIVE AUCTION"}
                      </h1>
                  </div>
              </div>
          </div>

          {/* Right: Sponsors pics */}
          <div className="w-1/4 flex justify-end relative z-10 h-full py-4">
              {state.sponsorConfig?.showOnProjector && state.sponsors.length > 0 ? (
                  <div className="h-full aspect-video bg-white/90 backdrop-blur rounded-2xl shadow-2xl p-2.5 flex items-center justify-center overflow-hidden border-2 border-white/20 group hover:scale-105 transition-transform duration-500">
                      <img 
                        src={state.sponsors[currentSponsorIndex]?.imageUrl} 
                        className="max-h-full max-w-full object-contain transition-opacity duration-700 hover:scale-110" 
                        alt="Sponsor" 
                        key={currentSponsorIndex}
                      />
                  </div>
              ) : (
                  <div className="h-full aspect-video bg-slate-900/50 backdrop-blur rounded-2xl border border-white/5 flex items-center justify-center">
                       <Star className="text-yellow-500/20 w-10 h-10 animate-pulse" />
                  </div>
              )}
          </div>
      </div>
    );
  };

  if (state.adminViewOverride && state.adminViewOverride.type !== 'NONE') {
      const { type, data } = state.adminViewOverride;
      const RenderOverrideContainer = ({ children, title }: any) => {
          const isIpl = state.projectorLayout === 'IPL';
          return (
          <div className={`h-screen w-full bg-[#020617] text-white flex flex-col relative overflow-hidden font-sans`}>
              {isIpl ? <IplRotatingRings /> : <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_#1e293b_0%,_transparent_100%)] opacity-30"></div>}
              <Header />
              <div className="flex-1 p-10 flex flex-col overflow-hidden relative z-10">
                  {title ? (
                      <div className="mb-10 text-center animate-fade-in">
                          <div className="inline-block relative">
                              <h1 className={`text-6xl lg:text-8xl font-black uppercase tracking-tighter italic text-transparent bg-clip-text ${isIpl ? 'bg-gradient-to-b from-white to-gray-400' : 'bg-gradient-to-b from-yellow-300 to-yellow-600'} drop-shadow-2xl`}>
                                  {title}
                              </h1>
                              <div className={`absolute -bottom-4 left-0 w-full h-1.5 ${isIpl ? 'bg-gradient-to-r from-transparent via-blue-500 to-transparent' : 'bg-gradient-to-r from-transparent via-yellow-500 to-transparent'} rounded-full shadow-[0_0_20px_rgba(234,179,8,0.5)]`}></div>
                          </div>
                      </div>
                  ) : null}
                  <div className={`flex-1 overflow-hidden ${isIpl ? 'bg-[#0d1333]/80 border-2 border-white/20' : 'bg-slate-900/40 border border-white/10'} backdrop-blur-3xl rounded-[3rem] p-10 shadow-[0_20px_100px_rgba(0,0,0,0.5)] relative flex flex-col animate-slide-up`}>
                      {children}
                  </div>
              </div>
              <Marquee show={state.sponsorConfig?.showTickerOnProjector ?? state.sponsorConfig?.showHighlights ?? false} content={marqueeContent} layout={state.projectorLayout} />
          </div>
          );
      };
      if (type === 'SQUAD' && data?.teamId) {
          const team = state.teams.find(t => String(t.id) === String(data.teamId));
          if (team) return (
              <RenderOverrideContainer title={`Squad Overview`}>
                  <div className="h-full flex flex-col gap-10">
                      <div className="flex items-center justify-between bg-gradient-to-r from-blue-900/30 to-slate-900/30 p-10 rounded-[2.5rem] border border-blue-500/20 shadow-2xl">
                          <div className="flex items-center gap-10">
                              <div className="relative group">
                                  <div className="absolute inset-[-10px] bg-blue-500 blur-3xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                                  {team.logoUrl ? (
                                      <img src={team.logoUrl} className="w-48 h-48 rounded-[2rem] bg-white p-3 object-contain relative z-10 shadow-2xl border-2 border-white/20" />
                                  ) : (
                                      <div className="w-48 h-48 rounded-[2rem] bg-blue-600 flex items-center justify-center text-8xl font-black relative z-10 border-4 border-white/20 shadow-2xl italic tracking-tighter">
                                          {team.name.charAt(0)}
                                      </div>
                                  )}
                              </div>
                              <div>
                                  <h2 className="text-7xl font-black text-white uppercase italic tracking-tighter mb-4 drop-shadow-lg">{team.name}</h2>
                                  <div className="flex gap-4">
                                      <div className="bg-slate-800/80 px-6 py-2 rounded-full border border-white/10 text-slate-400 font-black uppercase text-xs tracking-widest">Team ID: {team.teamCode || 'N/A'}</div>
                                      <div className="bg-green-500/20 px-6 py-2 rounded-full border border-green-500/30 text-green-400 font-black uppercase text-xs tracking-widest">Active Status</div>
                                  </div>
                              </div>
                          </div>
                          <div className="flex gap-8">
                              <div className="bg-black/40 backdrop-blur-md p-8 rounded-3xl border border-white/5 text-center min-w-[200px] shadow-xl">
                                  <p className="text-slate-500 text-xs font-black uppercase tracking-[0.2em] mb-2 font-mono">Total Roster</p>
                                  <span className="text-7xl font-black text-white italic tracking-tighter">{team.players.length}</span>
                              </div>
                              <div className="bg-black/40 backdrop-blur-md p-8 rounded-3xl border border-white/5 text-center min-w-[240px] shadow-xl border-t-green-500/20">
                                  <p className="text-slate-500 text-xs font-black uppercase tracking-[0.2em] mb-2 font-mono">Available Purse</p>
                                  <span className="text-7xl font-black text-green-400 italic tracking-tighter">₹{team.budget.toLocaleString()}</span>
                              </div>
                          </div>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-2 custom-scrollbar pr-6">
                          {team.players.map((p, i) => (
                              <div key={i} className="bg-gradient-to-br from-slate-800/50 to-slate-950/50 p-6 rounded-[2rem] flex items-center gap-6 border border-white/5 hover:border-blue-500/50 transition-all hover:scale-[1.05] shadow-xl hover:shadow-blue-500/10 group">
                                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-yellow-500 to-yellow-300 text-black flex items-center justify-center font-black text-xl shadow-lg transform -rotate-6 group-hover:rotate-0 transition-transform italic">#{i+1}</div>
                                  <div className="min-w-0 flex-1">
                                      <p className="font-black text-2xl text-white truncate uppercase italic tracking-tighter">{p.name}</p>
                                      <div className="flex items-center gap-3 mt-1">
                                          <span className="text-blue-400 font-black text-xs uppercase tracking-widest">{p.role || p.speciality}</span>
                                          <div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div>
                                          <span className="text-green-400 font-mono font-black text-sm">₹{p.soldPrice?.toLocaleString()}</span>
                                      </div>
                                  </div>
                              </div>
                          ))}
                          {team.players.length === 0 && (
                               <div className="col-span-full h-full flex flex-col items-center justify-center text-slate-700 italic uppercase tracking-[0.5em] gap-6">
                                    <Users className="w-32 h-32 opacity-10" />
                                    <p className="text-4xl font-black">Roster Empty</p>
                               </div>
                          )}
                      </div>
                  </div>
              </RenderOverrideContainer>
          );
      }
      if (type === 'PURSES') {
          const sortedTeams = [...state.teams].sort((a,b) => b.budget - a.budget);
          const isIpl = state.projectorLayout === 'IPL';
          
          if (isIpl) {
              const rowVariants: any = {
                hidden: { opacity: 0, y: 30 },
                visible: (i: number) => ({
                  opacity: 1,
                  y: 0,
                  transition: {
                    delay: i * 0.05,
                    duration: 0.4,
                  },
                }),
              };

              return (
                  <RenderOverrideContainer title="">
                      <div className="h-full flex flex-col overflow-hidden">
                           <div className="flex items-center justify-center gap-6 mb-8 mt-2">
                               <div className="bg-white p-2 rounded-lg h-16 w-16 flex items-center justify-center border-2 border-blue-900 shadow-xl">
                                   <img src={state.systemLogoUrl || "https://picsum.photos/seed/logo/200/200"} className="h-full object-contain" referrerPolicy="no-referrer" />
                               </div>
                               <div className="flex flex-col">
                                   <h2 className="text-4xl font-black italic tracking-tighter text-white uppercase">{state.tournamentName || "LIVE AUCTION"}</h2>
                                   <p className="text-sm font-bold text-blue-400 uppercase tracking-widest -mt-1">PURSE REMAINING</p>
                               </div>
                           </div>

                           <div className="grid grid-cols-12 bg-gradient-to-b from-white via-gray-100 to-gray-400 text-blue-900 font-black p-3 rounded-t-lg mb-2 text-xs tracking-tighter shadow-xl">
                               <div className="col-span-4 pl-4">TEAM</div>
                               <div className="col-span-3 text-right pr-12">PURSE REMAINING</div>
                               <div className="col-span-2 text-center">SLOTS REMAINING</div>
                               <div className="col-span-3 text-center">MAX TOTALS</div>
                           </div>

                           <div className="flex-1 overflow-y-auto space-y-1.5 pr-2 custom-scrollbar">
                               {sortedTeams.map((team, idx) => {
                                   const slotsTaken = team.players.length;
                                   const maxSlots = state.maxPlayersPerTeam || 15;
                                   const slotsRemaining = maxSlots - slotsTaken;
                                   return (
                                       <motion.div
                                           key={team.id}
                                           custom={idx}
                                           initial="hidden"
                                           animate="visible"
                                           variants={rowVariants}
                                           whileHover={{ scale: 1.01, backgroundColor: 'rgba(255,255,255,0.08)' }}
                                           className="grid grid-cols-12 bg-gradient-to-r from-[#1c2b6b] via-[#283593] to-[#1c2b6b] text-white p-3 rounded border border-white/10 items-center shadow-lg"
                                       >
                                           <div className="col-span-4 flex items-center gap-4 pl-2">
                                               {team.logoUrl ? <img src={team.logoUrl} className="w-9 h-9 object-contain rounded-full bg-white p-0.5 shadow-md" referrerPolicy="no-referrer" /> : <div className="w-9 h-9 bg-slate-800 rounded-full flex items-center justify-center text-[10px] shadow-md">{team.name.charAt(0)}</div>}
                                               <span className="font-black text-xl uppercase italic tracking-tighter truncate drop-shadow-lg">{team.name}</span>
                                           </div>
                                           <div className="col-span-3 text-right pr-12 font-mono font-black text-3xl text-yellow-400 italic drop-shadow-[0_0_10px_rgba(234,179,8,0.3)]">
                                               ₹ {(team.budget / 100).toFixed(2)}Cr
                                           </div>
                                           <div className="col-span-2 flex justify-center">
                                               <div className="bg-[#0b0f2a] w-20 h-10 flex items-center justify-center rounded border border-blue-400/50 font-black text-2xl shadow-inner">{slotsRemaining}</div>
                                           </div>
                                           <div className="col-span-3 flex justify-center">
                                               <div className="bg-slate-800/80 w-20 h-10 flex items-center justify-center rounded border border-white/20 font-black text-2xl text-gray-300 shadow-inner">{maxSlots}</div>
                                           </div>
                                       </motion.div>
                                   );
                               })}
                           </div>

                           <div className="mt-4 bg-[#0a0f2b] border-t-2 border-blue-500/50 p-4 flex justify-between items-center text-xs font-black italic tracking-[0.2em] text-blue-300 rounded-b-xl shadow-2xl">
                               <div className="flex items-center gap-3">
                                   <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(59,130,246,1)]"></div>
                                   <span>MAXIMUM OVERSEAS PLAYERS: 2</span>
                               </div>
                               <div className="flex items-center gap-3">
                                   <span>MAXIMUM SLOTS: {state.maxPlayersPerTeam || 15}</span>
                                   <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(59,130,246,1)]"></div>
                               </div>
                           </div>
                      </div>
                  </RenderOverrideContainer>
              );
          }

          return (
              <RenderOverrideContainer title="Live Purse Standings">
                  <div className="h-full overflow-y-auto p-4 custom-scrollbar pr-6">
                      <div className="grid grid-cols-1 gap-6">
                          {sortedTeams.map((team, i) => (
                              <div key={team.id} className="flex items-center justify-between bg-gradient-to-r from-slate-800/40 to-black/40 p-10 rounded-[2.5rem] border border-white/5 hover:border-green-500/50 transition-all hover:translate-x-4 shadow-2xl relative overflow-hidden group">
                                  <div className={`absolute left-0 top-0 h-full w-3 transition-colors ${i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-slate-300' : i === 2 ? 'bg-orange-500' : 'bg-slate-700'}`}></div>
                                  <div className="flex items-center gap-10">
                                      <span className={`text-6xl font-black w-24 text-center italic ${i === 0 ? 'text-yellow-400 drop-shadow-[0_0_20px_rgba(234,179,8,0.5)]' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-orange-400' : 'text-slate-700'}`}>
                                          #{i+1}
                                      </span>
                                      {team.logoUrl ? (
                                          <img src={team.logoUrl} className="w-28 h-28 rounded-3xl bg-white p-2 object-contain shadow-2xl border-2 border-white/10 group-hover:scale-110 transition-transform" />
                                      ) : (
                                          <div className="w-28 h-28 rounded-3xl bg-slate-800 flex items-center justify-center font-black text-5xl italic border-2 border-white/10">
                                              {team.name.charAt(0)}
                                          </div>
                                      )}
                                      <div>
                                          <h3 className="text-5xl font-black text-white italic uppercase tracking-tighter mb-2">{team.name}</h3>
                                          <div className="flex items-center gap-4">
                                              <p className="text-sm text-slate-500 font-black uppercase tracking-[0.3em] font-mono">{team.players.length} Players Signed</p>
                                              <div className="w-2 h-2 rounded-full bg-slate-800"></div>
                                              <p className="text-sm text-blue-500 font-bold uppercase tracking-widest">{team.teamCode}</p>
                                          </div>
                                      </div>
                                  </div>
                                  <div className="text-right bg-white/5 px-12 py-6 rounded-[2rem] border border-white/10 shadow-inner group-hover:bg-green-500/10 transition-colors">
                                      <p className="text-xs text-slate-500 uppercase font-black tracking-[0.3em] mb-3 font-mono">Available Funds</p>
                                      <p className="text-7xl font-black text-green-400 tabular-nums italic tracking-tighter drop-shadow-[0_0_20px_rgba(74,222,128,0.3)]">
                                          ₹{team.budget.toLocaleString()}
                                      </p>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              </RenderOverrideContainer>
          );
      }
      if (type === 'TOP_5') {
          const soldPlayers = state.teams.flatMap(t => t.players.map(p => ({ ...p, soldToTeam: t })))
              .sort((a, b) => (Number(b.soldPrice) || 0) - (Number(a.soldPrice) || 0))
              .slice(0, 5);
          return (
              <RenderOverrideContainer title="Top 5 Tournament Deals">
                  <div className="h-full p-4 space-y-8 pb-10">
                      {soldPlayers.map((p, i) => (
                          <div key={i} className="flex items-center justify-between bg-gradient-to-br from-slate-800/40 to-slate-950/80 p-10 rounded-[3rem] border-2 border-yellow-500/20 animate-slide-up hover:border-yellow-500/50 transition-all shadow-2xl relative overflow-hidden group" style={{ animationDelay: `${i * 150}ms` }}>
                              <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-yellow-500/5 to-transparent skew-x-[-12deg] pointer-events-none"></div>
                              <div className="flex items-center gap-12 relative z-10">
                                  <span className={`text-8xl font-black italic w-32 text-center ${i === 0 ? 'text-yellow-400 drop-shadow-[0_0_30px_rgba(234,179,8,0.7)]' : 'text-slate-600 opacity-50'}`}>
                                      #{i + 1}
                                  </span>
                                  <div className="flex items-center gap-10">
                                      <div className="relative">
                                          <div className="absolute inset-[-8px] bg-yellow-500 blur-2xl opacity-0 group-hover:opacity-30 transition-opacity"></div>
                                          <img src={p.photoUrl} className="w-40 h-40 rounded-[2.5rem] object-cover border-4 border-slate-700 shadow-2xl relative z-10 p-1" alt={p.name} />
                                      </div>
                                      <div>
                                          <h2 className="text-5xl font-black text-white uppercase italic tracking-tighter mb-4 group-hover:text-yellow-400 transition-colors leading-none">{p.name}</h2>
                                          <div className="flex items-center gap-4">
                                              <span className="bg-blue-600/20 text-blue-400 px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest border border-blue-500/30 shadow-lg">{p.role || p.speciality}</span>
                                              <span className="text-slate-600 font-bold">•</span>
                                              <span className="text-slate-400 font-bold uppercase tracking-widest text-xs italic">{p.category}</span>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                              <div className="flex items-center gap-16 relative z-10">
                                  <div className="text-right">
                                      <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.4em] mb-4 font-mono">Acquired By</p>
                                      <div className="flex items-center gap-5 justify-end">
                                          <p className="text-4xl font-black text-white uppercase italic tracking-tighter drop-shadow-md">{p.soldToTeam.name}</p>
                                          {p.soldToTeam.logoUrl && <img src={p.soldToTeam.logoUrl} className="w-14 h-14 object-contain" />}
                                      </div>
                                  </div>
                                  <div className="bg-yellow-500 text-black px-12 py-6 rounded-[2rem] font-black text-6xl shadow-[0_15px_30px_rgba(234,179,8,0.3)] italic tracking-tighter animate-pulse border-4 border-white transform hover:rotate-3 transition-transform">
                                      ₹{p.soldPrice?.toLocaleString()}
                                  </div>
                              </div>
                          </div>
                      ))}
                      {soldPlayers.length === 0 && (
                          <div className="h-full flex flex-col items-center justify-center text-slate-700 italic uppercase tracking-[0.5em] gap-8">
                              <Trophy className="w-40 h-40 opacity-10 animate-bounce" />
                              <p className="text-4xl font-black">Waiting for major signings...</p>
                          </div>
                      )}
                  </div>
              </RenderOverrideContainer>
          );
      }
      if (type === 'UNSOLD') {
          const unsoldPlayers = state.players.filter(p => p.status === 'UNSOLD');
          return (
            <RenderOverrideContainer title="Unsold Player Pool">
                <div className="h-full overflow-y-auto p-4 custom-scrollbar pr-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {unsoldPlayers.map((p, i) => (
                            <div key={i} className="bg-slate-900 border border-white/5 rounded-3xl overflow-hidden shadow-2xl hover:border-red-500/50 transition-all hover:scale-105 group">
                                <div className="h-72 relative">
                                    <img src={p.photoUrl} className="w-full h-full object-cover grayscale opacity-50 transition-all group-hover:grayscale-0 group-hover:opacity-100" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                                    <div className="absolute top-4 left-4 bg-red-600 text-white px-4 py-1 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] shadow-lg">UNSOLD</div>
                                </div>
                                <div className="p-6">
                                    <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-2 truncate">{p.name}</h3>
                                    <div className="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-white/5">
                                        <div>
                                            <p className="text-slate-500 text-[8px] font-black uppercase tracking-widest mb-1">Base Price</p>
                                            <p className="text-yellow-500 font-black font-mono">₹{getEffectiveBasePrice(p, state.categories).toLocaleString()}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-slate-500 text-[8px] font-black uppercase tracking-widest mb-1">Role</p>
                                            <p className="text-white text-xs font-bold uppercase">{p.role || p.speciality}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    {unsoldPlayers.length === 0 && (
                         <div className="h-full flex flex-col items-center justify-center text-slate-700 italic uppercase tracking-[0.5em] gap-8">
                            <CheckCircle className="w-40 h-40 opacity-10" />
                            <p className="text-4xl font-black">No Unsold Players</p>
                       </div>
                    )}
                </div>
            </RenderOverrideContainer>
          );
      }
      if (type === 'TRADING') {
          return (
              <RenderOverrideContainer title="Live Trading Activity">
                  <div className="h-full flex flex-col pt-4">
                      {/* We'll use a local state to fetch trades in ProjectorScreen if we wanted, 
                          but since it's an override, we can just show a message or a small list 
                          if we added trades to global state.
                          For now, let's keep it simple and show that trading is active. */}
                      <div className="flex-1 flex flex-col items-center justify-center text-center space-y-10 group">
                          <motion.div 
                            animate={{ rotateY: 360 }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            className="bg-gradient-to-br from-amber-400 to-amber-600 p-12 rounded-[3.5rem] shadow-[0_0_80px_rgba(245,158,11,0.3)] border-4 border-white/40"
                          >
                              <ArrowRightLeft className="w-48 h-48 text-black" />
                          </motion.div>
                          <div className="space-y-4">
                              <h2 className="text-8xl font-black italic text-white uppercase tracking-tighter drop-shadow-2xl">Transfer Market Open</h2>
                              <p className="text-2xl font-bold text-amber-500 uppercase tracking-[0.5em] animate-pulse">Deals in progress...</p>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-10 w-full max-w-6xl mt-12">
                              <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[2rem] border border-white/10 text-center">
                                  <Users className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                                  <p className="text-sm font-black text-slate-500 uppercase tracking-widest mb-1">Player Swaps</p>
                                  <p className="text-white text-xs font-bold uppercase opacity-60">Team to Team</p>
                              </div>
                              <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[2rem] border border-white/10 text-center">
                                  <Wallet className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                                  <p className="text-sm font-black text-slate-500 uppercase tracking-widest mb-1">Cash Trades</p>
                                  <p className="text-white text-xs font-bold uppercase opacity-60">Purse Transfers</p>
                              </div>
                              <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[2rem] border border-white/10 text-center">
                                  <TrendingUp className="w-12 h-12 text-white mx-auto mb-4" />
                                  <p className="text-sm font-black text-slate-500 uppercase tracking-widest mb-1">Real-time Updates</p>
                                  <p className="text-white text-xs font-bold uppercase opacity-60">Instant Sync</p>
                              </div>
                          </div>
                      </div>
                  </div>
              </RenderOverrideContainer>
          );
      }
  }

  if (display.status === 'FINISHED') return <div className="h-screen w-full bg-slate-900 text-white flex flex-col relative overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black font-sans"><div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div><Header /><div className="flex-1 flex flex-col items-center justify-center p-8 z-10 animate-slide-up"><div className="text-center"><h1 className="text-5xl lg:text-9xl font-black text-yellow-400 tracking-widest uppercase drop-shadow-[0_0_45px_rgba(250,204,21,0.6)]">AUCTION COMPLETED</h1><div className="h-3 w-64 bg-gradient-to-r from-transparent via-yellow-500 to-transparent mx-auto mt-10 rounded-full"></div><p className="text-2xl lg:text-4xl text-gray-500 uppercase tracking-[0.6em] font-light mt-12 animate-pulse">Thank You For Watching</p></div></div><Marquee show={!!(state.sponsorConfig?.showOnProjector && state.sponsors.length > 0)} content={marqueeContent} layout={state.projectorLayout} /></div>;

  if (display.status === 'WAITING' || !display.player) {
    const tName = state.tournamentName || "LIVE AUCTION";
    const tLogo = state.auctionLogoUrl || state.systemLogoUrl;

    return (
      <div className={`h-screen w-full flex flex-col relative overflow-hidden ${state.projectorLayout === 'IPL' ? 'bg-[#020617]' : 'bg-gray-100'}`}>
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-10 z-10">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`p-20 rounded-[4rem] shadow-[0_0_100px_rgba(59,130,246,0.3)] text-center border-4 relative overflow-hidden backdrop-blur-2xl ${state.projectorLayout === 'IPL' ? 'bg-slate-900/40 border-yellow-500/20' : 'bg-white border-gray-100'}`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent pointer-events-none"></div>
            
            {tLogo && (
              <motion.img 
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                src={tLogo} 
                className="h-32 w-auto mx-auto mb-10 object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]" 
                referrerPolicy="no-referrer"
              />
            )}
            
            <h1 className={`text-7xl lg:text-8xl font-black tracking-tighter mb-8 italic uppercase ${state.projectorLayout === 'IPL' ? 'golden-text glow-text-gold' : 'text-gray-900'}`}>
              {tName}
            </h1>
            
            <div className="flex flex-col items-center gap-4">
               <div className={`h-1 w-48 rounded-full mb-4 ${state.projectorLayout === 'IPL' ? 'bg-yellow-500' : 'bg-gray-900'}`}></div>
               <p className={`${state.projectorLayout === 'IPL' ? 'text-blue-400' : 'text-gray-500'} text-3xl animate-pulse font-black tracking-[0.2em] uppercase italic`}>
                 {state.status === AuctionStatus.NotStarted ? "AUCTION STARTING SOON" : "AWAITING SELECTION"}
               </p>
               <p className="text-white/40 text-sm font-bold uppercase tracking-widest mt-4">Stay tuned for the next player</p>
            </div>
          </motion.div>
        </div>
        <Marquee show={!!(state.sponsorConfig?.showOnProjector && state.sponsors.length > 0)} content={marqueeContent} layout={state.projectorLayout} />
      </div>
    );
  }

  const { player, bid, bidder, status } = display;
  const layout = state.projectorLayout || 'STANDARD';

  if (!state.status && !state.tournamentName) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white font-black uppercase tracking-widest">
              <div className="flex flex-col items-center gap-6">
                  <div className="w-20 h-20 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-2xl animate-pulse">Loading Auction Data...</p>
                  <p className="text-[10px] text-zinc-500 tracking-[0.5em]">SM SPORTS LIVE SYSTEM</p>
              </div>
          </div>
      );
  }

  return (
      <div className="h-screen w-full relative flex flex-col overflow-hidden bg-black">
          <div className="flex-1 relative overflow-hidden">
          {layout === 'STANDARD' && (
              <div className="h-full w-full bg-slate-100 flex flex-col font-sans overflow-hidden relative">
                <Header />
                <div className="absolute inset-0 stadium-bg opacity-10 blur-sm pointer-events-none"></div>
                
                <div className="flex-1 flex gap-6 p-8 min-h-0 relative z-10 items-center justify-center">
                    {/* Player Image with strong frame */}
                    <div className="w-[35%] bg-white rounded-[2rem] shadow-2xl overflow-hidden relative border-[12px] border-white h-[75vh] group">
                        <img src={player?.photoUrl} alt={player?.name} className="w-full h-full object-cover object-top" />
                    </div>

                    <div className="flex-1 flex flex-col gap-6 h-[75vh]">
                        {/* Name Bar - High Contrast */}
                        <div className="bg-slate-900 rounded-[2rem] p-10 shadow-2xl border border-white/10 flex justify-between items-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-slate-800 to-transparent opacity-50"></div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-4 mb-3">
                                    <span className="bg-yellow-500 text-black px-4 py-1 rounded-lg text-xs font-black uppercase tracking-widest">{player?.category}</span>
                                    <div className="flex items-center gap-2 text-slate-400 font-bold tracking-[0.3em] uppercase text-xs">
                                        <Globe className="w-4 h-4" /> {player?.nationality}
                                    </div>
                                </div>
                                <h1 className="text-7xl font-black text-white leading-none mb-3 drop-shadow-lg">{player?.name}</h1>
                                <div className="flex items-center gap-6">
                                    <p className="text-3xl text-yellow-500 font-black flex items-center uppercase tracking-wide italic">
                                        <Star className="w-8 h-8 mr-3 fill-yellow-500"/> {player?.role || player?.speciality}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right bg-white/10 backdrop-blur-xl p-6 rounded-2xl border border-white/20 relative z-10">
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Base Valuation</p>
                                <p className="text-5xl font-black text-white font-mono italic">₹{player ? getEffectiveBasePrice(player, state.categories).toLocaleString() : '0'}</p>
                            </div>
                        </div>

                        {/* Bid Display */}
                        <div className="flex-1 bg-white rounded-[2rem] p-8 shadow-2xl relative overflow-hidden flex flex-col justify-center items-center border-[12px] border-slate-900">
                            {status === 'SOLD' && (
                                <div className="absolute inset-0 z-50 flex items-center justify-center bg-green-600/95 backdrop-blur-md animate-fade-in">
                                    <div className="text-center group">
                                        <div className="bg-white text-green-700 font-black text-[12vh] px-20 py-6 border-[16px] border-green-700 -rotate-3 shadow-2xl animate-bounce-in tracking-widest uppercase mb-10">SOLD</div>
                                        {bidder && (
                                            <div className="bg-slate-900 text-white px-12 py-6 rounded-full shadow-2xl flex items-center gap-8 animate-slide-up border-4 border-white">
                                                {bidder.logoUrl ? <img src={bidder.logoUrl} className="w-20 h-20 rounded-2xl bg-white p-2 object-contain" /> : <div className="w-20 h-20 rounded-2xl bg-slate-700 flex items-center justify-center font-bold text-4xl">{bidder.name.charAt(0)}</div>}
                                                <div className="text-left">
                                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">New Acquisition</p>
                                                    <p className="text-5xl font-black">{bidder.name}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {status === 'UNSOLD' && (
                                <div className="absolute inset-0 z-50 flex items-center justify-center bg-red-600/95 backdrop-blur-md animate-fade-in">
                                    <div className="bg-white text-red-600 font-black text-[12vh] px-20 py-6 border-[16px] border-red-600 rotate-12 shadow-2xl animate-bounce-in tracking-widest uppercase italic">UNSOLD</div>
                                </div>
                            )}

                            <p className="text-slate-400 font-black text-2xl uppercase tracking-[0.8em] mb-6">{bidder ? 'CURRENT BID' : 'STARTING PRICE'}</p>
                            <div className={`text-[18vh] leading-none font-black tabular-nums transition-all ${bidder ? 'text-slate-900 scale-110' : 'text-slate-300'}`}>
                                {bid.toLocaleString()}
                            </div>
                            
                            {status === 'LIVE' && bidder && (
                                <div className="mt-10 bg-slate-900 text-white px-10 py-5 rounded-3xl flex items-center gap-6 animate-slide-up shadow-2xl border-b-8 border-yellow-500">
                                    <div className="text-right">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Leading Bidder</p>
                                        <p className="text-4xl font-black italic">{bidder.name}</p>
                                    </div>
                                    {bidder.logoUrl ? <img src={bidder.logoUrl} className="w-16 h-16 rounded-xl bg-white p-1" /> : <div className="w-16 h-16 bg-slate-700 rounded-xl" />}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Ticker */}
                <div className="mt-auto flex gap-4 h-[20vh] relative z-20 bg-gray-100 shrink-0 p-4 pt-0">
                    <div className="w-1/3 bg-white rounded-3xl shadow-lg border border-gray-200 p-6 flex flex-col justify-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-2 h-full bg-highlight"></div>
                        <h3 className="text-gray-400 font-bold uppercase text-sm tracking-widest mb-2 flex items-center"><TrendingUp className="w-4 h-4 mr-2"/> Recent Activity</h3>
                        <div className="text-2xl lg:text-3xl font-black text-gray-800 leading-tight line-clamp-2">{latestLog || "Auction in progress..."}</div>
                    </div>
                    <div className="flex-1 bg-gray-900 rounded-3xl shadow-lg border border-gray-800 p-6 overflow-hidden flex flex-col">
                        <h3 className="text-gray-400 font-bold uppercase text-sm tracking-widest mb-3 flex items-center"><Wallet className="w-4 h-4 mr-2"/> Team Purses Remaining</h3>
                        <div className="flex-1 overflow-x-auto overflow-y-hidden flex items-center gap-4 custom-scrollbar">
                            {state.teams.map(team => (
                                <div key={team.id} className="min-w-[180px] bg-gray-800 p-4 rounded-2xl border border-gray-700 flex items-center gap-4 shrink-0 hover:border-highlight/50 transition-colors">
                                    {team.logoUrl ? <img src={team.logoUrl} className="w-10 h-10 rounded-full bg-white p-1 object-contain" /> : <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-white font-bold text-lg">{team.name.charAt(0)}</div>}
                                    <div className="min-w-0">
                                        <h4 className="text-white font-black text-sm truncate">{team.name}</h4>
                                        <p className="text-green-400 font-mono font-black text-lg leading-none mt-1">₹{team.budget.toLocaleString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
              </div>
          )}

          {layout === 'IPL' && (
              <div className="h-full w-full bg-[#020617] flex flex-col font-sans overflow-hidden relative text-white">
                  <IplRotatingRings />
                  
                  <Header />

                  <div className="flex-1 flex flex-col p-4 relative z-10 items-center justify-start">
                       {/* Main Content Box from Image */}
                       <AnimatePresence mode="wait">
                           <motion.div 
                                key={player?.id}
                                initial={{ opacity: 0, scale: 0.9, y: 50 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
                                transition={{ duration: 0.6, ease: "circOut" }}
                                className="w-[95%] h-[65%] border-4 border-white/40 rounded-[2.5rem] bg-black/60 backdrop-blur-3xl p-8 flex flex-col relative overflow-hidden shadow-[0_0_120px_rgba(59,130,246,0.4)]"
                           >
                            <div className="flex items-center justify-end mb-2">
                                <div className="bg-yellow-500 text-black px-6 py-1.5 rounded-xl font-black text-lg italic tracking-widest uppercase shadow-lg">
                                    LIVE BIDDING
                                </div>
                            </div>

                            <div className="flex-1 flex gap-10 items-center px-4">
                                 {/* Left: Player Circle */}
                                 <div className="relative w-[30%] aspect-square flex items-center justify-center shrink-0">
                                      <motion.div 
                                        animate={{ rotate: 360, scale: [1, 1.05, 1] }}
                                        transition={{ rotate: { duration: 12, repeat: Infinity, ease: "linear" }, scale: { duration: 4, repeat: Infinity } }}
                                        className="absolute inset-[-25px] rounded-full border-[8px] border-blue-500/20 border-t-yellow-500/60 border-b-yellow-500/60 shadow-[0_0_60px_rgba(59,130,246,0.3)]"
                                      />
                                      <motion.div 
                                        animate={{ rotate: -360 }}
                                        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                                        className="absolute inset-[-12px] rounded-full border-[1.5px] border-white/20 border-dashed"
                                      />
                                      <motion.div 
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="w-full h-full rounded-full border-[10px] border-[#0d1333] overflow-hidden shadow-[0_0_80px_rgba(0,0,0,1)] bg-gradient-to-b from-blue-900 via-blue-950 to-black z-10"
                                      >
                                           <img src={player?.photoUrl} className="w-full h-full object-cover object-top filter contrast-125" referrerPolicy="no-referrer" />
                                      </motion.div>
                                 </div>

                                 {/* Right: Details */}
                                 <div className="flex-1 flex flex-col gap-4 justify-center pl-4">
                                      <div className="space-y-0.5">
                                          <motion.p 
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="text-blue-400 font-black text-4xl lg:text-5xl uppercase tracking-[0.4em] italic mb-2"
                                          >
                                              {player?.category || 'PLATINUM SET'}
                                          </motion.p>
                                          <motion.h2 
                                            initial={{ opacity: 0, x: 50 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="text-6xl lg:text-8xl font-black italic text-white tracking-tighter uppercase leading-none drop-shadow-[0_10px_40px_rgba(0,0,0,1)] truncate"
                                          >
                                              {player?.name}
                                          </motion.h2>
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                           <motion.div 
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.3 }}
                                                className="bg-blue-900/40 p-4 rounded-3xl border border-white/10 relative overflow-hidden"
                                            >
                                                <div className="relative z-10">
                                                    <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest mb-0.5">PLAYER SKILL</p>
                                                    <p className="text-2xl font-black text-white italic tracking-tighter leading-tight truncate">{player?.role || player?.speciality}</p>
                                                </div>
                                                <Trophy className="absolute right-[-5px] bottom-[-5px] w-14 h-14 text-white/5 rotate-[-12deg]" />
                                            </motion.div>
                                            
                                            <motion.div 
                                                 initial={{ opacity: 0, y: 20 }}
                                                 animate={{ opacity: 1, y: 0 }}
                                                 transition={{ delay: 0.35 }}
                                                 className="bg-slate-900/60 p-4 rounded-3xl border border-white/10 flex flex-col justify-center px-6 shadow-inner relative overflow-hidden"
                                             >
                                                 <div className="relative z-10">
                                                     <p className="text-yellow-500/60 text-[10px] font-black uppercase tracking-widest mb-0.5 font-mono">BASE PRICE</p>
                                                     <p className="text-4xl font-black text-white italic tracking-tighter font-mono leading-none">
                                                         ₹ {player ? getEffectiveBasePrice(player, state.categories).toLocaleString() : '0'}
                                                     </p>
                                                 </div>
                                                 <div className="absolute right-[-10px] bottom-[-10px] opacity-10">
                                                     <Wallet className="w-16 h-16 text-white" />
                                                 </div>
                                            </motion.div>
                                           <motion.div 
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.4 }}
                                                className="bg-slate-900/80 p-4 rounded-3xl border border-white/10 flex items-center justify-between"
                                            >
                                                <div className="flex-1">
                                                    <p className="text-yellow-500 text-[10px] font-black uppercase tracking-widest mb-0.5 italic opacity-80">
                                                        {bidder ? 'CURRENT BID' : 'OPENING BID'}
                                                    </p>
                                                    <p className="text-5xl font-black text-white italic tracking-tighter uppercase leading-tight font-mono drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]">
                                                        ₹ {bid.toLocaleString()}
                                                    </p>
                                                </div>
                                                {bidder && (
                                                    <motion.div 
                                                        initial={{ x: 20, opacity: 0 }}
                                                        animate={{ x: 0, opacity: 1 }}
                                                        className="flex items-center gap-3 bg-blue-600/10 p-2 rounded-2xl border border-blue-500/20"
                                                    >
                                                        <div className="flex flex-col items-end shrink-0">
                                                            <span className="text-2xl font-black text-white uppercase tracking-tighter truncate max-w-[150px] drop-shadow-md italic">
                                                                {bidder.name}
                                                            </span>
                                                            <span className="text-xs font-bold text-yellow-500 uppercase tracking-widest leading-none">LEADING BIDDER</span>
                                                        </div>
                                                        {bidder.logoUrl ? (
                                                            <img src={bidder.logoUrl} className="w-14 h-14 object-contain bg-white rounded-full p-1 shadow-2xl border border-white/10" />
                                                        ) : (
                                                            <div className="w-14 h-14 bg-blue-900 rounded-full flex items-center justify-center text-xl font-black text-white italic">
                                                                {bidder.name.charAt(0)}
                                                            </div>
                                                        )}
                                                    </motion.div>
                                                )}
                                           </motion.div>
                                      </div>
                                 </div>
                            </div>

                            {/* Bottom: Price Boxes with higher impact */}
                            <div className="mt-8 grid grid-cols-2 gap-8 h-32 shrink-0">
                                 <motion.div 
                                    initial={{ x: -100, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    className="bg-gradient-to-r from-blue-600 via-blue-500 to-transparent p-0.5 rounded-[1.5rem] shadow-[0_0_50px_rgba(37,99,235,0.4)]"
                                 >
                                      <div className="h-full w-full bg-[#050505] rounded-[1.5rem] flex items-center justify-between px-10 border border-white/20">
                                          <div className="flex flex-col">
                                              <span className="text-blue-400 text-[12px] font-black uppercase tracking-[0.2em] leading-none mb-2 font-mono">CURRENT VALUATION</span>
                                              <div className="flex items-baseline gap-3">
                                                  <span className="text-4xl font-black text-yellow-500 italic">₹</span>
                                                  <motion.span 
                                                    key={bid}
                                                    initial={{ scale: 1.2, filter: "brightness(200%)" }}
                                                    animate={{ scale: 1, filter: "brightness(100%)" }}
                                                    className="text-6xl font-black text-white italic font-mono tracking-tighter"
                                                  >
                                                      {bid.toLocaleString()}
                                                  </motion.span>
                                              </div>
                                          </div>
                                          {bidder && (
                                              <div className="bg-blue-600 px-6 py-4 rounded-2xl border-2 border-white/30 flex items-center gap-4 shadow-[0_0_30px_rgba(37,99,235,0.6)] animate-pulse">
                                                   {bidder.logoUrl ? <img src={bidder.logoUrl} className="w-14 h-14 object-contain bg-white rounded-full p-1 shrink-0" /> : <div className="w-14 h-14 bg-blue-900 rounded-full flex items-center justify-center font-black text-2xl shrink-0">{bidder.name.charAt(0)}</div>}
                                                   <span className="text-3xl font-black italic uppercase tracking-tighter truncate max-w-[200px] text-white drop-shadow-md">{bidder.name}</span>
                                              </div>
                                          )}
                                      </div>
                                 </motion.div>
                                 <motion.div 
                                    initial={{ x: 100, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    className="bg-gradient-to-l from-yellow-700 via-yellow-600/40 to-transparent p-0.5 rounded-[1.5rem] shadow-2xl"
                                 >
                                      <div className="h-full w-full bg-[#050505] rounded-[1.5rem] flex flex-col justify-center items-center border border-yellow-500/30">
                                          <span className="text-yellow-500 text-[12px] font-black uppercase tracking-[0.5em] mb-2 font-mono opacity-60">STARTING PRICE</span>
                                          <p className="text-5xl font-black text-white italic tracking-tighter font-mono leading-none">
                                              ₹ {player ? getEffectiveBasePrice(player, state.categories).toLocaleString() : '0'}
                                          </p>
                                      </div>
                                 </motion.div>
                            </div>

                            {/* Status Overlays */}
                            <AnimatePresence>
                                {showSoldOverlay && soldAnimationPlayer && (
                                    <motion.div 
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-[#020617]/95 backdrop-blur-[50px] overflow-hidden"
                                    >
                                        {/* Particle Bursts */}
                                        {[...Array(12)].map((_, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                                                animate={{ 
                                                    scale: [0, 1.5, 0], 
                                                    x: (Math.random() - 0.5) * 1200, 
                                                    y: (Math.random() - 0.5) * 1200,
                                                    opacity: [1, 1, 0]
                                                }}
                                                transition={{ duration: 2.5, ease: "easeOut", delay: 0.1 }}
                                                className="absolute w-4 h-4 bg-yellow-500 rounded-full"
                                            />
                                        ))}

                                        <motion.div
                                            initial={{ scale: 0, rotate: -45, y: -100 }}
                                            animate={{ scale: 1.4, rotate: -8, y: 0 }}
                                            transition={{ type: "spring", stiffness: 260, damping: 20 }}
                                            className="bg-yellow-500 text-black font-black text-[14vw] px-32 py-12 shadow-[0_0_200px_rgba(234,179,8,0.9)] border-[20px] border-black flex flex-col items-center italic tracking-tighter ring-[40px] ring-white/10 relative z-20"
                                        >
                                            <span className="drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)]">SOLD</span>
                                        </motion.div>

                                        <motion.div 
                                            initial={{ y: 100, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.3 }}
                                            className="flex flex-col items-center mt-12 relative z-20"
                                        >
                                            <div className="flex items-center gap-12 bg-black/80 backdrop-blur-2xl p-14 rounded-[5rem] border-4 border-yellow-500 shadow-[0_50px_100px_rgba(0,0,0,0.9)] scale-110">
                                                {soldAnimationPlayer.bidder?.logoUrl ? (
                                                    <img src={soldAnimationPlayer.bidder.logoUrl} className="w-48 h-48 object-contain bg-white p-4 rounded-full shadow-2xl border-4 border-blue-900" />
                                                ) : (
                                                    <div className="w-48 h-48 bg-blue-900 rounded-full flex items-center justify-center text-8xl font-black text-white italic">{soldAnimationPlayer.bidder?.name?.charAt(0) || '?'}</div>
                                                )}
                                                <div className="flex flex-col">
                                                    <p className="text-blue-400 font-bold uppercase tracking-[0.5em] mb-2 font-mono">CONGRATULATIONS</p>
                                                    <h3 className="text-8xl font-black uppercase tracking-tighter text-white italic leading-none drop-shadow-lg">
                                                        {soldAnimationPlayer.bidder?.name}
                                                    </h3>
                                                    <p className="text-5xl font-black text-yellow-500 mt-6 font-mono border-t border-white/10 pt-6">
                                                        ₹ {soldAnimationPlayer.bid.toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </motion.div>
                                        
                                        {/* Background Celebration Elements */}
                                        <motion.div 
                                            animate={{ scale: [1, 1.5, 1], opacity: [0.1, 0.3, 0.1] }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                            className="absolute inset-0 bg-[radial-gradient(circle_at_center,_white_0%,_transparent_70%)] z-10 pointer-events-none"
                                        />
                                    </motion.div>
                                )}

                                {status === 'UNSOLD' && !showSoldOverlay && (
                                    <motion.div 
                                        initial={{ scale: 0.5, rotate: 30, opacity: 0 }}
                                        animate={{ scale: 1, rotate: 12, opacity: 1 }}
                                        exit={{ scale: 1.5, opacity: 0 }}
                                        className="absolute inset-0 z-50 flex items-center justify-center bg-red-950/95 backdrop-blur-3xl"
                                    >
                                        <div className="bg-red-600 text-white font-black text-9xl px-24 py-10 shadow-[0_0_120px_rgba(220,38,38,1)] italic border-[12px] border-white tracking-widest ring-[20px] ring-red-500/30">
                                            UNSOLD
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                       </motion.div>
                       </AnimatePresence>

                       {/* Team Purses at Bottom */}
                       <div className="w-[98%] mt-4 min-h-[140px] mb-12 bg-slate-900/80 backdrop-blur-3xl rounded-[3rem] border-2 border-white/10 p-6 flex flex-col shadow-[0_20px_100px_rgba(0,0,0,0.6)] relative z-[20]">
                              <p className="text-blue-400 text-xs font-black uppercase tracking-[0.5em] mb-4 flex items-center gap-2">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,1)] animate-ping"></div>
                                  LIVE TEAM PURSES & STATUS
                              </p>
                              <div className="flex-1 flex flex-wrap items-center justify-start gap-4 px-2">
                                  {state.teams.map((team, idx) => (
                                      <motion.div 
                                        key={team.id} 
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="bg-black/60 px-6 py-5 rounded-2xl border-2 border-white/10 flex items-center gap-6 hover:bg-blue-900/40 transition-all border-l-[6px] border-l-blue-500 shadow-2xl min-w-[320px] flex-1 max-w-[450px]"
                                      >
                                          {team.logoUrl ? (
                                              <img src={team.logoUrl} className="w-16 h-16 object-contain bg-white p-2 rounded-full shrink-0 shadow-lg border-2 border-white/20" referrerPolicy="no-referrer" />
                                          ) : (
                                                  <div className="w-16 h-16 bg-gradient-to-br from-blue-700 to-blue-900 rounded-full flex items-center justify-center font-black text-2xl shrink-0 italic text-white border-2 border-white/20 shadow-lg">
                                                      {team.name.charAt(0)}
                                                  </div>
                                          )}
                                          <div className="min-w-0 flex-1">
                                              <p className="text-blue-200 font-black text-xs uppercase tracking-wider leading-tight mb-2 drop-shadow-sm whitespace-normal break-words line-clamp-2 h-8 overflow-visible">{team.name}</p>
                                              <div className="flex items-center justify-between">
                                                  <p className="text-white font-mono font-black text-3xl italic leading-none drop-shadow-md whitespace-nowrap">
                                                       ₹ {team.budget.toLocaleString()}
                                                  </p>
                                                  <div className="bg-blue-500/20 px-3 py-1 rounded-lg text-[10px] font-black text-blue-400 border border-blue-400/20 font-mono">
                                                      {team.players.length} / {state.maxPlayersPerTeam}
                                                  </div>
                                              </div>
                                          </div>
                                      </motion.div>
                                  ))}
                              </div>
                       </div>
                  </div>
              </div>
          )}

          {layout === 'MODERN' && (
              <div className="h-full w-full bg-black flex flex-col font-sans overflow-hidden relative text-white">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(20,20,20,1)_0%,_rgba(0,0,0,1)_100%)]"></div>
                  
                  <Header />

                  <div className="flex-1 flex p-10 gap-10 min-h-0 relative z-10">
                      <div className="w-[42%] bg-zinc-950 rounded-[3rem] overflow-hidden relative border border-white/10 shadow-2xl flex flex-col">
                          <div className="flex-1 relative">
                             <img src={player?.photoUrl} className="w-full h-full object-cover object-top" />
                             <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                          </div>
                          <div className="p-10 bg-black/40 backdrop-blur-md">
                              <div className="flex items-center gap-4 mb-6">
                                  <span className="bg-teal-500 text-black px-6 py-2 rounded-xl font-black text-xl uppercase tracking-widest shadow-[0_0_30px_rgba(20,184,166,0.3)]">{player?.category}</span>
                                  <span className="text-white/40 font-mono text-lg">SCAN_PID/{player?.id.toString().slice(-4)}</span>
                              </div>
                              <h2 className="text-7xl font-black uppercase tracking-tighter leading-none mb-6 italic drop-shadow-2xl">{player?.name}</h2>
                              <div className="flex gap-12 border-t border-white/10 pt-8">
                                  <div>
                                      <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-2">Primary Speciality</p>
                                      <p className="text-2xl font-bold uppercase text-teal-400">{player?.role || player?.speciality || player?.category}</p>
                                  </div>
                                  <div className="h-12 w-px bg-white/10"></div>
                                  <div>
                                      <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-2">Base Valuation</p>
                                      <p className="text-2xl font-bold font-mono text-white italic">₹{player ? getEffectiveBasePrice(player, state.categories).toLocaleString() : '0'}</p>
                                  </div>
                              </div>
                          </div>
                      </div>

                      <div className="flex-1 flex flex-col gap-10">
                          <div className="flex-1 bg-zinc-900/60 backdrop-blur-md rounded-[3rem] border border-white/10 relative overflow-hidden flex flex-col items-center justify-center shadow-inner">
                              {status === 'SOLD' && (
                                  <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/95 backdrop-blur-3xl animate-fade-in text-center">
                                      <div className="text-teal-400 font-black text-[12vw] italic tracking-tighter leading-none animate-bounce-in mb-12 drop-shadow-[0_0_50px_rgba(20,184,166,0.5)]">SOLD</div>
                                      {bidder && (
                                          <div className="flex items-center gap-10 bg-white/5 p-10 rounded-[3rem] border border-white/10 animate-slide-up shadow-2xl">
                                              {bidder.logoUrl ? <img src={bidder.logoUrl} className="w-24 h-24 object-contain bg-white p-2 rounded-2xl" /> : <div className="w-24 h-24 bg-zinc-800 rounded-2xl flex items-center justify-center text-4xl font-bold">{bidder.name.charAt(0)}</div>}
                                              <div className="text-left">
                                                  <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-2">Acquired By Entity</p>
                                                  <h3 className="text-5xl font-black uppercase italic text-white tracking-tight">{bidder.name}</h3>
                                              </div>
                                          </div>
                                      )}
                                  </div>
                              )}

                              {status === 'UNSOLD' && (
                                  <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-3xl animate-fade-in">
                                      <div className="text-red-500 font-black text-[12vw] italic tracking-tighter leading-none animate-bounce-in drop-shadow-[0_0_50px_rgba(239,68,68,0.4)]">UNSOLD</div>
                                  </div>
                              )}

                              <div className="text-white/5 font-black text-[18vw] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none uppercase italic tracking-tighter">DATASET</div>
                              
                              <p className="text-teal-400 font-mono text-2xl tracking-[0.6em] mb-6 relative z-10 opacity-60">CURRENTVAL_NODE</p>
                              <div className="text-[22vh] font-black text-white leading-none tabular-nums relative z-10 italic tracking-tighter drop-shadow-[0_20px_60px_rgba(0,0,0,0.8)]">{bid.toLocaleString()}</div>
                              
                              {status === 'LIVE' && bidder && (
                                  <div className="mt-14 flex items-center gap-6 bg-white/5 px-12 py-6 rounded-full border border-teal-500/20 relative z-10 animate-slide-up shadow-2xl">
                                      <div className="w-4 h-4 bg-teal-400 rounded-full animate-ping"></div>
                                      <span className="text-white/40 font-bold uppercase tracking-[0.3em] text-[10px]">Leader Presence Detected:</span>
                                      <span className="text-4xl font-black uppercase italic text-white tracking-widest">{bidder.name}</span>
                                  </div>
                              )}
                          </div>

                          <div className="h-36 flex gap-6">
                              <div className="flex-1 bg-zinc-900 rounded-[2.5rem] border border-white/10 p-6 flex flex-col justify-center overflow-hidden">
                                  <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-4 flex items-center"><TrendingUp className="text-teal-400 w-4 h-4 mr-2" /> Live Ticker Data</p>
                                  <div className="flex-1 overflow-x-auto flex items-center gap-6 custom-scrollbar pb-2">
                                      {state.teams.map(team => (
                                          <div key={team.id} className="min-w-[200px] bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center gap-4 shrink-0">
                                              {team.logoUrl ? <img src={team.logoUrl} className="w-10 h-10 object-contain bg-white rounded-lg p-1" /> : <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center font-bold text-[10px]">{team.name.charAt(0)}</div>}
                                              <div className="min-w-0">
                                                  <p className="text-white/40 font-bold text-[10px] uppercase truncate">{team.name}</p>
                                                  <p className="text-teal-400 font-mono font-bold text-lg leading-none mt-1">₹{team.budget.toLocaleString()}</p>
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          )}
          {layout === 'ADVAYA' && (
              <div className="h-screen w-full bg-transparent flex flex-col font-sans overflow-hidden relative text-white">
                  <div className="absolute top-10 left-10 z-50">
                      <img src={state.auctionLogoUrl || state.systemLogoUrl} className="h-20 w-auto object-contain" />
                  </div>
                  
                  <div className="flex-1 flex flex-col items-center justify-end pb-20 relative z-10 p-10">
                       {/* Lower Third Widget for Advaya */}
                       <div className="w-full max-w-[1400px] flex items-end gap-10">
                           {/* Left: Base Price info */}
                           <div className="flex-1 flex flex-col items-end pb-4">
                               <div className="bg-black/80 backdrop-blur-md border-l-4 border-yellow-500 px-6 py-4 rounded-tl-3xl shadow-2xl transform skew-x-[-12deg] w-[300px]">
                                   <div className="transform skew-x-[12deg] text-right">
                                       <p className="text-yellow-500 font-black text-xs uppercase tracking-[0.3em] mb-1 opacity-70">BASE PRICE</p>
                                       <p className="text-4xl font-black italic tracking-tighter">₹ {player ? getEffectiveBasePrice(player, state.categories).toLocaleString() : '0'}</p>
                                   </div>
                               </div>
                           </div>

                           {/* Middle: Main Player Plate */}
                           <div className="shrink-0 flex flex-col items-center relative gap-4">
                               <div className="relative group">
                                    <div className="absolute inset-[-10px] rounded-full border-4 border-yellow-500/20 border-t-yellow-500 border-b-yellow-500 animate-spin-slow"></div>
                                    <div className="w-48 h-48 rounded-full border-8 border-[#050505] overflow-hidden shadow-[0_0_60px_rgba(0,0,0,1)] relative z-10 advaya-border-glow p-1">
                                        <img src={player?.photoUrl} className="w-full h-full object-cover object-top" />
                                    </div>
                               </div>

                               <div className="w-[600px] bg-[#050505] border-t-4 border-yellow-500 rounded-2xl p-6 shadow-[0_30px_100px_rgba(0,0,0,1)] relative flex flex-col items-center">
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full px-8 py-1 bg-yellow-500 text-black font-black italic tracking-widest text-sm uppercase rounded-t-lg">
                                        {player?.category}
                                    </div>
                                    <h2 className="text-6xl font-black uppercase italic tracking-tighter leading-none mb-2 text-center w-full truncate">{player?.name}</h2>
                                    <p className="text-yellow-500/80 font-black uppercase tracking-[0.4em] text-xs italic">{player?.role || player?.speciality}</p>
                               </div>
                           </div>

                           {/* Right: Current Bid & Stats */}
                           <div className="flex-1 flex flex-col items-start gap-4 pb-4">
                               <div className="bg-black/80 backdrop-blur-md border-r-4 border-yellow-500 px-8 py-4 rounded-tr-3xl shadow-2xl transform skew-x-[-12deg] w-[400px] flex justify-between items-center h-[88px]">
                                   <div className="transform skew-x-[-12deg]">
                                       <p className="text-yellow-500 font-black text-xs uppercase tracking-[0.3em] mb-1 opacity-70">CURRENT BID</p>
                                       <p className="text-5xl font-black italic tracking-tighter tabular-nums">₹ {bid.toLocaleString()}</p>
                                   </div>
                                   {bidder && (
                                       <div className="transform skew-x-[-12deg] flex items-center gap-3">
                                           {bidder.logoUrl ? <img src={bidder.logoUrl} className="w-12 h-12 object-contain bg-white rounded-xl p-1" /> : <div className="w-12 h-12 bg-yellow-600 rounded-xl flex items-center justify-center font-black">{bidder.name.charAt(0)}</div>}
                                           <p className="text-xl font-black uppercase italic tracking-tighter leading-tight max-w-[120px] truncate">{bidder.name}</p>
                                       </div>
                                   )}
                               </div>

                               {/* Squad Table Overlay */}
                               <div className="bg-[#050505]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl min-w-[300px] transform skew-x-[12deg]">
                                    <div className="transform skew-x-[-12deg]">
                                        <table className="w-full text-[10px] font-bold text-gray-400">
                                           <thead>
                                               <tr className="border-b border-white/10">
                                                   <th className="text-left pb-2">TEAMS</th>
                                                   <th className="text-right pb-2 px-4">PURSE REM</th>
                                                   <th className="text-right pb-2">PLAYERS</th>
                                               </tr>
                                           </thead>
                                           <tbody>
                                               {state.teams.slice(0, 3).map(team => (
                                                   <tr key={team.id} className="border-b border-white/5 last:border-0">
                                                       <td className="py-2 text-white truncate max-w-[80px]">{team.name}</td>
                                                       <td className="py-2 text-yellow-500 text-right px-4">₹{(team.budget/10000000).toFixed(2)}Cr</td>
                                                       <td className="py-2 text-right text-white">{team.players.length}</td>
                                                   </tr>
                                               ))}
                                           </tbody>
                                        </table>
                                    </div>
                               </div>
                           </div>
                       </div>

                       {/* Sold Animation Absolute - Advaya */}
                       {status === 'SOLD' && (
                           <motion.div 
                               initial={{ scale: 0.5, opacity: 0, y: 100 }}
                               animate={{ scale: 1, opacity: 1, y: 0 }}
                               className="absolute bottom-[30%] z-[100] bg-yellow-500 text-black font-black text-9xl px-20 py-8 shadow-[0_0_150px_rgba(234,179,8,0.8)] -rotate-3 border-[12px] border-black italic tracking-tighter"
                           >
                               SOLD
                           </motion.div>
                       )}
                  </div>
              </div>
          )}

          {layout === 'NEON' && (
              <div className="h-full w-full bg-black flex flex-col font-sans overflow-hidden relative text-white">
                  <Header />
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-50 pointer-events-none" style={{ backgroundSize: '100% 2px, 3px 100%' }}></div>
                  
                  <div className="flex-1 flex p-8 gap-8 min-h-0 relative z-10">
                      <div className="w-[40%] relative">
                          <div className="absolute inset-0 bg-magenta-500 blur-[100px] opacity-20"></div>
                          <div className="h-full bg-zinc-900 rounded-[2rem] border-2 border-magenta-500/50 overflow-hidden relative shadow-[0_0_40px_rgba(255,0,255,0.2)]">
                              <img src={player?.photoUrl} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                              <div className="absolute bottom-8 left-8 right-8">
                                  <div className="bg-cyan-500 text-black px-4 py-1 rounded-sm font-black text-sm uppercase tracking-widest inline-block mb-4 shadow-[0_0_15px_rgba(6,182,212,0.8)]">
                                      {player?.category}
                                  </div>
                                  <h2 className="text-6xl font-black uppercase italic tracking-tighter leading-none text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] mb-2">{player?.name}</h2>
                                  <p className="text-2xl font-black text-cyan-400 italic tracking-widest uppercase flex items-center gap-2"><Zap className="w-6 h-6"/> {player?.role || player?.speciality}</p>
                              </div>
                          </div>
                      </div>

                      <div className="flex-1 flex flex-col gap-8">
                          <div className="flex-1 bg-black rounded-[2rem] border-2 border-cyan-500/50 relative overflow-hidden flex flex-col items-center justify-center shadow-[0_0_40px_rgba(6,182,212,0.2)]">
                              {status === 'SOLD' && (
                                  <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in">
                                      <div className="text-magenta-500 font-black text-[12vw] italic tracking-tighter leading-none animate-bounce-in drop-shadow-[0_0_30px_rgba(255,0,255,0.8)]">SOLD</div>
                                      {bidder && (
                                          <div className="flex items-center gap-6 bg-zinc-900 p-6 rounded-2xl border-2 border-cyan-500 animate-slide-up shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                                              {bidder.logoUrl ? <img src={bidder.logoUrl} className="w-20 h-20 object-contain bg-white p-1 rounded-full" /> : <div className="w-20 h-20 bg-cyan-600 rounded-full flex items-center justify-center text-3xl font-bold">{bidder.name.charAt(0)}</div>}
                                              <div>
                                                  <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest mb-1">Acquired By</p>
                                                  <h3 className="text-4xl font-black uppercase italic text-white">{bidder.name}</h3>
                                              </div>
                                          </div>
                                      )}
                                  </div>
                              )}

                              {status === 'UNSOLD' && (
                                  <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in">
                                      <div className="text-red-500 font-black text-[12vw] italic tracking-tighter leading-none animate-bounce-in drop-shadow-[0_0_30px_rgba(239,68,68,0.8)]">UNSOLD</div>
                                  </div>
                              )}

                              <p className="text-cyan-400 font-mono text-xl tracking-[0.8em] mb-4 opacity-50">CURRENT_BID</p>
                              <div className="text-[18vh] font-black text-white leading-none tabular-nums italic tracking-tighter drop-shadow-[0_0_40px_rgba(6,182,212,0.6)]">{bid.toLocaleString()}</div>
                              
                              {status === 'LIVE' && bidder && (
                                  <div className="mt-10 flex items-center gap-6 bg-magenta-500/10 px-10 py-4 rounded-full border-2 border-magenta-500 animate-slide-up shadow-[0_0_20px_rgba(255,0,255,0.3)]">
                                      <div className="w-4 h-4 bg-magenta-500 rounded-full animate-ping"></div>
                                      <span className="text-magenta-500 font-black uppercase tracking-widest text-xl italic">{bidder.name}</span>
                                  </div>
                              )}
                          </div>

                          <div className="h-32 bg-zinc-900 rounded-[2rem] border-2 border-yellow-400/30 p-4 flex items-center gap-6 overflow-hidden shadow-[0_0_20px_rgba(250,204,21,0.1)]">
                              <div className="shrink-0 bg-yellow-400 text-black p-3 rounded-xl font-black italic">PURSES</div>
                              <div className="flex-1 overflow-x-auto flex items-center gap-6 custom-scrollbar">
                                  {state.teams.map(team => (
                                      <div key={team.id} className="min-w-[150px] flex flex-col shrink-0">
                                          <p className="text-white/40 text-[10px] font-bold uppercase truncate">{team.name}</p>
                                          <p className="text-yellow-400 font-mono font-black text-xl">₹{team.budget.toLocaleString()}</p>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {layout === 'FUTURISTIC' && (
              <div className="h-full w-full bg-[#0a0a0f] flex flex-col font-mono overflow-hidden relative text-cyan-400">
                  <Header />
                  {/* HUD Elements */}
                  <div className="absolute inset-0 border-[20px] border-cyan-500/5 pointer-events-none z-50"></div>
                  <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none"></div>
                  
                  <div className="flex-1 flex p-10 gap-10 min-h-0 relative z-10">
                      {/* Player Data Frame */}
                      <div className="w-[42%] flex flex-col gap-6">
                          <div className="flex-1 bg-black rounded-tl-[4rem] rounded-br-[4rem] border-2 border-cyan-500/30 overflow-hidden relative group">
                              <div className="absolute top-0 left-0 w-full h-full bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                              <img src={player?.photoUrl} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                              
                              {/* Data Readout Overlay */}
                              <div className="absolute top-6 right-6 text-right">
                                  <div className="text-[8px] text-cyan-500/50 uppercase mb-1">ID_SCAN</div>
                                  <div className="text-xs font-bold text-cyan-400">PX-{player?.id.toString().slice(-6)}</div>
                              </div>

                              <div className="absolute bottom-10 left-10 right-10">
                                  <div className="h-px w-full bg-gradient-to-r from-cyan-500 to-transparent mb-4"></div>
                                  <h2 className="text-6xl font-black uppercase tracking-tighter text-white mb-2">{player?.name}</h2>
                                  <div className="flex gap-4">
                                      <div className="bg-cyan-500/10 px-4 py-1 border border-cyan-500/30 rounded-sm">
                                          <span className="text-[10px] uppercase font-bold text-cyan-400">{player?.category}</span>
                                      </div>
                                      <div className="bg-cyan-500/10 px-4 py-1 border border-cyan-500/30 rounded-sm">
                                          <span className="text-[10px] uppercase font-bold text-cyan-400">{player?.role || player?.speciality}</span>
                                      </div>
                                  </div>
                              </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-6 h-24">
                              <div className="bg-black border border-cyan-500/20 p-4 rounded-xl flex flex-col justify-center">
                                  <span className="text-[8px] text-cyan-500/50 uppercase mb-1">Base_Valuation</span>
                                  <p className="text-2xl font-black text-white">₹{player ? getEffectiveBasePrice(player, state.categories).toLocaleString() : '0'}</p>
                              </div>
                              <div className="bg-black border border-cyan-500/20 p-4 rounded-xl flex flex-col justify-center">
                                  <span className="text-[8px] text-cyan-500/50 uppercase mb-1">Origin_Node</span>
                                  <p className="text-2xl font-black text-white uppercase">{player?.nationality}</p>
                              </div>
                          </div>
                      </div>

                      {/* Bidding Core */}
                      <div className="flex-1 flex flex-col gap-6">
                          <div className="flex-1 bg-black rounded-tr-[4rem] rounded-bl-[4rem] border-2 border-cyan-500/30 relative overflow-hidden flex flex-col items-center justify-center">
                              {/* Scanline Effect */}
                              <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] z-20 pointer-events-none" style={{ backgroundSize: '100% 4px' }}></div>
                              
                              {status === 'SOLD' && (
                                  <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl animate-fade-in">
                                      <div className="text-cyan-400 font-black text-[10vw] tracking-widest animate-pulse mb-8 border-y-4 border-cyan-400 px-10 py-2">SOLD_CORE</div>
                                      {bidder && (
                                          <div className="flex items-center gap-8 bg-cyan-500/5 p-8 rounded-2xl border border-cyan-500/40 animate-slide-up">
                                              {bidder.logoUrl ? <img src={bidder.logoUrl} className="w-24 h-24 object-contain bg-white p-1 rounded-sm" /> : <div className="w-24 h-24 bg-cyan-900 flex items-center justify-center text-4xl font-bold">{bidder.name.charAt(0)}</div>}
                                              <div>
                                                  <p className="text-cyan-500/50 text-[10px] font-bold uppercase tracking-widest mb-2">Target_Entity</p>
                                                  <h3 className="text-5xl font-black uppercase text-white">{bidder.name}</h3>
                                                  <p className="text-2xl font-bold text-cyan-400 mt-2">VAL: {bid.toLocaleString()}</p>
                                              </div>
                                          </div>
                                      )}
                                  </div>
                              )}

                              {status === 'UNSOLD' && (
                                  <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl animate-fade-in">
                                      <div className="text-red-500 font-black text-[10vw] tracking-widest animate-pulse border-y-4 border-red-500 px-10 py-2">UNSOLD_ERR</div>
                                  </div>
                              )}

                              <div className="absolute top-10 left-10 flex items-center gap-2">
                                  <div className="w-2 h-2 bg-cyan-500 animate-ping"></div>
                                  <span className="text-[10px] uppercase tracking-widest text-cyan-500/50">Bidding.Active</span>
                              </div>

                              <div className="text-[20vh] font-black text-white leading-none tabular-nums tracking-tighter drop-shadow-[0_0_50px_rgba(6,182,212,0.4)]">{bid.toLocaleString()}</div>
                              
                              {status === 'LIVE' && bidder && (
                                  <div className="mt-12 flex flex-col items-center animate-slide-up">
                                      <div className="text-[10px] text-cyan-500/50 uppercase tracking-[0.5em] mb-4">Leading_Entity</div>
                                      <div className="bg-cyan-500/10 px-12 py-4 border border-cyan-500/50 rounded-sm relative">
                                          <div className="absolute -top-1 -left-1 w-2 h-2 bg-cyan-500"></div>
                                          <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-cyan-500"></div>
                                          <span className="text-4xl font-black uppercase text-white tracking-widest">{bidder.name}</span>
                                      </div>
                                  </div>
                              )}
                          </div>

                          {/* Data Stream Ticker */}
                          <div className="h-24 bg-black border border-cyan-500/20 p-4 flex items-center gap-8 overflow-hidden">
                              <div className="shrink-0 text-cyan-500/50 text-[10px] font-bold uppercase tracking-[0.3em] rotate-180" style={{ writingMode: 'vertical-rl' }}>PURSE_DATA</div>
                              <div className="flex-1 overflow-x-auto flex items-center gap-10 custom-scrollbar">
                                  {state.teams.map(team => (
                                      <div key={team.id} className="flex flex-col shrink-0 border-l border-cyan-500/20 pl-4">
                                          <span className="text-[8px] text-cyan-500/30 uppercase mb-1">{team.name}</span>
                                          <span className="text-xl font-black text-white">₹{team.budget.toLocaleString()}</span>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          )}
          </div>
          <Marquee show={state.sponsorConfig?.showTickerOnProjector ?? state.sponsorConfig?.showHighlights ?? false} content={marqueeContent} layout={state.projectorLayout} />
      </div>
  );
};

export default ProjectorScreen;
