
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { Match, InningsState, BatsmanStats, BowlerStats, ScoringAsset, OverlayView, OverlayAnimation, DecisionStatus, Team, Player, ScoreboardTheme } from '../types';
import { ArrowLeft, Trophy, Users, RotateCcw, Save, Loader2, Undo2, CheckSquare, Square, Palette, ChevronDown, RefreshCw, Trash2, Check, Plus, Monitor, Play, Zap, Info, UserPlus, AlignLeft, ShieldCheck, MoreHorizontal, Settings, HelpCircle, XCircle, UserMinus, Layout, Image as ImageIcon, Globe, User, Star, BarChart2, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { useAuction } from '../hooks/useAuction';

const MatchScorer: React.FC = () => {
    const { matchId } = useParams<{ matchId: string }>();
    const navigate = useNavigate();
    const { userProfile } = useAuction();
    const [match, setMatch] = useState<Match | null>(null);
    const [teamA, setTeamA] = useState<Team | null>(null);
    const [teamB, setTeamB] = useState<Team | null>(null);
    const [localAssets, setLocalAssets] = useState<ScoringAsset[]>([]);
    const [globalAssets, setGlobalAssets] = useState<ScoringAsset[]>([]);
    const [loading, setLoading] = useState(true);
    const [hiddenThemes, setHiddenThemes] = useState<string[]>([]);
    
    const [tossWinner, setTossWinner] = useState('');
    const [tossChoice, setTossChoice] = useState<'BAT' | 'BOWL'>('BAT');
    const [processing, setProcessing] = useState(false);
    const [extraControllerVisible, setExtraControllerVisible] = useState(true);

    const [isWide, setIsWide] = useState(false);
    const [isNoBall, setIsNoBall] = useState(false);
    const [isBye, setIsBye] = useState(false);
    const [isLegBye, setIsLegBye] = useState(false);
    const [isWicket, setIsWicket] = useState(false);

    const [customInput, setCustomInput] = useState('');
    const [selectedMOM, setSelectedMOM] = useState('');
    const [selectedStatsPlayer, setSelectedStatsPlayer] = useState('');
    const [teamAColor, setTeamAColor] = useState('#0000FF');
    const [teamBColor, setTeamBColor] = useState('#FF0000');

    const [manualRuns, setManualRuns] = useState<{ [key: string]: number }>({ I1: 0, I1W: 0, I2: 0, I2W: 0 });

    useEffect(() => {
        if (!matchId) return;
        const unsub = db.collection('matches').doc(matchId).onSnapshot(doc => {
            if (doc.exists) {
                const m = { id: doc.id, ...doc.data() } as Match;
                setMatch(m);
                if (m.overlay?.momId) setSelectedMOM(m.overlay.momId);
                if (m.overlay?.customMessage) setCustomInput(m.overlay.customMessage);
                if (m.overlay?.statsPlayerId) setSelectedStatsPlayer(m.overlay.statsPlayerId);
                if (m.overlay?.teamAColor) setTeamAColor(m.overlay.teamAColor);
                if (m.overlay?.teamBColor) setTeamBColor(m.overlay.teamBColor);
                
                setManualRuns({
                    I1: m.innings[1]?.totalRuns || 0,
                    I1W: m.innings[1]?.wickets || 0,
                    I2: m.innings[2]?.totalRuns || 0,
                    I2W: m.innings[2]?.wickets || 0
                });
            } else {
                navigate('/scoring');
            }
            setLoading(false);
        });

        const unsubConfig = db.collection('appConfig').doc('scoreboardConfig').onSnapshot(doc => {
            if (doc.exists) {
                setHiddenThemes(doc.data()?.hiddenThemes || []);
            }
        });

        const unsubGlobalAssets = db.collection('globalAssets').onSnapshot(snap => {
            setGlobalAssets(snap.docs.map(d => ({ id: d.id, ...d.data() } as ScoringAsset)));
        });

        return () => {
            unsub();
            unsubConfig();
            unsubGlobalAssets();
        };
    }, [matchId, navigate]);

    useEffect(() => {
        if (!match) return;
        const fetchTeams = async () => {
            const collectionName = match.sourceType === 'TOURNAMENT' ? 'tournaments' : 'auctions';
            const rootRef = db.collection(collectionName).doc(match.auctionId).collection('teams');
            const docA = await rootRef.doc(match.teamAId).get();
            const docB = await rootRef.doc(match.teamBId).get();
            if (docA.exists) setTeamA({ id: docA.id, ...docA.data() } as Team);
            if (docB.exists) setTeamB({ id: docB.id, ...docB.data() } as Team);
        };
        fetchTeams();

        if (userProfile?.uid) {
            db.collection('scoringAssets')
                .where('createdBy', '==', userProfile.uid)
                .onSnapshot(snap => {
                    setLocalAssets(snap.docs.map(d => ({ id: d.id, ...d.data() } as ScoringAsset)));
                });
        }
    }, [match?.auctionId, match?.teamAId, match?.teamBId, match?.sourceType, userProfile]);

    const currentInnings = match ? match.innings[match.currentInnings] : null;
    
    const getTeam = (id: string | undefined | null) => {
        if (!id) return null;
        if (String(teamA?.id) === String(id)) return teamA;
        if (String(teamB?.id) === String(id)) return teamB;
        return null;
    };

    const battingTeam = currentInnings ? getTeam(currentInnings.battingTeamId) : null;
    const bowlingTeam = currentInnings ? getTeam(currentInnings.bowlingTeamId) : null;
    const allPlayers = [...(teamA?.players || []), ...(teamB?.players || [])];

    // Added missing definitions for validation in scoring process
    const needsStriker = !currentInnings?.strikerId;
    const needsNonStriker = !currentInnings?.nonStrikerId;
    const needsBowler = !currentInnings?.currentBowlerId;

    const handlePlayerSelect = async (type: 'STRIKER' | 'NON_STRIKER' | 'BOWLER', playerId: string) => {
        if (!match || !playerId) return;
        const targetTeam = type === 'BOWLER' ? bowlingTeam : battingTeam;
        if (!targetTeam) return;
        const playerObj = targetTeam.players.find(p => String(p.id) === String(playerId));
        if (!playerObj) return;
        const updateData: any = {};
        const prefix = `innings.${match.currentInnings}`;
        if (type === 'BOWLER') {
            if (!currentInnings?.bowlers || !currentInnings.bowlers[playerId]) {
                updateData[`${prefix}.bowlers.${playerId}`] = { playerId, name: playerObj.name, overs: 0, ballsBowled: 0, runsConceded: 0, wickets: 0, maidens: 0 };
            }
            updateData[`${prefix}.currentBowlerId`] = playerId;
        } else {
            if (!currentInnings?.batsmen || !currentInnings.batsmen[playerId]) {
                updateData[`${prefix}.batsmen.${playerId}`] = { playerId, name: playerObj.name, runs: 0, balls: 0, fours: 0, sixes: 0, isStriker: type === 'STRIKER' };
            } else { updateData[`${prefix}.batsmen.${playerId}.isStriker`] = type === 'STRIKER'; }
            if (type === 'STRIKER') updateData[`${prefix}.strikerId`] = playerId;
            else updateData[`${prefix}.nonStrikerId`] = playerId;
        }
        await db.collection('matches').doc(match.id).update(updateData);
    };

    const handleResetPlayerSlot = async (type: 'STRIKER' | 'NON_STRIKER' | 'BOWLER') => {
        if (!match || !currentInnings) return;
        const updateData: any = {};
        const prefix = `innings.${match.currentInnings}`;
        if (type === 'STRIKER') updateData[`${prefix}.strikerId`] = null;
        else if (type === 'NON_STRIKER') updateData[`${prefix}.nonStrikerId`] = null;
        else if (type === 'BOWLER') updateData[`${prefix}.currentBowlerId`] = null;
        await db.collection('matches').doc(match.id).update(updateData);
    };

    const handleSwapBatter = async () => {
        if (!match || !currentInnings || !currentInnings.strikerId || !currentInnings.nonStrikerId) return;
        const updateData: any = {};
        const prefix = `innings.${match.currentInnings}`;
        updateData[`${prefix}.strikerId`] = currentInnings.nonStrikerId;
        updateData[`${prefix}.nonStrikerId`] = currentInnings.strikerId;
        updateData[`${prefix}.batsmen.${currentInnings.strikerId}.isStriker`] = false;
        updateData[`${prefix}.batsmen.${currentInnings.nonStrikerId}.isStriker`] = true;
        await db.collection('matches').doc(match.id).update(updateData);
    };

    const handleEndInning = async () => {
        if (!match) return;
        if (!window.confirm("End this inning and start next?")) return;
        
        if (match.currentInnings === 1) {
            const bowlingId = currentInnings?.bowlingTeamId;
            const battingId = currentInnings?.battingTeamId;
            const newInnings: InningsState = {
                battingTeamId: bowlingId || '', bowlingTeamId: battingId || '', totalRuns: 0, wickets: 0, overs: 0, ballsInCurrentOver: 0, currentRunRate: 0, extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 }, strikerId: null, nonStrikerId: null, currentBowlerId: null, batsmen: {}, bowlers: {}, recentBalls: []
            };
            await db.collection('matches').doc(match.id).update({ currentInnings: 2, [`innings.2`]: newInnings });
        } else {
            await db.collection('matches').doc(match.id).update({ status: 'COMPLETED' });
        }
    };

    const handleScore = async (runs: number) => {
        // needsStriker, needsNonStriker, and needsBowler are defined in the component scope
        if (!match || !currentInnings || needsStriker || needsNonStriker || needsBowler) return;
        setProcessing(true);
        const state = JSON.parse(JSON.stringify(currentInnings)) as InningsState;
        const striker = state.batsmen[state.strikerId!];
        const bowler = state.bowlers[state.currentBowlerId!];
        
        const isLegalBall = !isWide && !isNoBall;
        
        let totalBallRuns = runs; 
        if (isWide || isNoBall) totalBallRuns += 1; 
        state.totalRuns += totalBallRuns;
        
        if (isWide) state.extras.wides += (1 + runs); 
        if (isNoBall) state.extras.noBalls += (1 + runs); 
        if (isBye) state.extras.byes += runs; 
        if (isLegBye) state.extras.legByes += runs;
        
        if (!isWide) { 
            if (isLegalBall || isNoBall) { 
                if (!isBye && !isLegBye) { 
                    striker.runs += runs; 
                    if (runs === 4) striker.fours++; 
                    if (runs === 6) striker.sixes++; 
                } 
                striker.balls++; 
            } 
        }

        let bowlerRuns = runs; 
        if (isWide || isNoBall) bowlerRuns += 1; 
        if (isBye || isLegBye) bowlerRuns = 0; 
        bowler.runsConceded += bowlerRuns;

        if (isLegalBall) {
            state.ballsInCurrentOver++; bowler.ballsBowled++;
            const totalValidBalls = (Math.floor(state.overs) * 6) + Math.round((state.overs % 1) * 10) + 1;
            state.overs = Number(`${Math.floor(totalValidBalls / 6)}.${totalValidBalls % 6}`);
            const bValidBalls = (Math.floor(bowler.overs) * 6) + Math.round((bowler.overs % 1) * 10) + 1;
            bowler.overs = Number(`${Math.floor(bValidBalls / 6)}.${bValidBalls % 6}`);
        }

        if (isWicket) { 
            state.wickets++; 
            bowler.wickets++; 
            striker.outBy = `b ${bowler.name}`; 
            state.strikerId = null; 
        }

        state.recentBalls.push({ ballNumber: state.ballsInCurrentOver, overNumber: Math.floor(state.overs), bowlerId: bowler.playerId, batsmanId: striker.playerId, runs, isWide, isNoBall, isWicket, isBye, isLegBye, extras: (isWide || isNoBall ? 1 : 0) });
        
        if (runs % 2 !== 0) { 
            const temp = state.strikerId; 
            state.strikerId = state.nonStrikerId; 
            state.nonStrikerId = temp; 
        }

        if (state.ballsInCurrentOver === 6) { 
            state.ballsInCurrentOver = 0; 
            state.currentBowlerId = null; 
            const temp = state.strikerId; 
            state.strikerId = state.nonStrikerId; 
            state.nonStrikerId = temp; 
        }

        await db.collection('matches').doc(match.id).update({ [`innings.${match.currentInnings}`]: state });
        setIsWide(false); setIsNoBall(false); setIsBye(false); setIsLegBye(false); setIsWicket(false);
        setProcessing(false);
    };

    const handleUndo = async () => {
        if (!match || !currentInnings || currentInnings.recentBalls.length === 0) return;
        setProcessing(true);
        try {
            const state = JSON.parse(JSON.stringify(currentInnings)) as InningsState;
            const lastBall = state.recentBalls.pop();
            if (!lastBall) { setProcessing(false); return; }

            const extraRuns = (lastBall.isWide || lastBall.isNoBall) ? 1 : 0;
            state.totalRuns -= (lastBall.runs + extraRuns);
            if (lastBall.isWicket) state.wickets--;

            if (lastBall.isWide) state.extras.wides -= (1 + lastBall.runs);
            if (lastBall.isNoBall) state.extras.noBalls -= (1 + lastBall.runs);
            if (lastBall.isBye) state.extras.byes -= lastBall.runs;
            if (lastBall.isLegBye) state.extras.legByes -= lastBall.runs;

            const batsman = state.batsmen[lastBall.batsmanId];
            if (batsman && !lastBall.isWide) {
                if (!lastBall.isBye && !lastBall.isLegBye) {
                    batsman.runs -= lastBall.runs;
                    if (lastBall.runs === 4) batsman.fours--;
                    if (lastBall.runs === 6) batsman.sixes--;
                }
                batsman.balls--;
                if (lastBall.isWicket) {
                    delete batsman.outBy;
                    state.strikerId = lastBall.batsmanId;
                }
            }

            const bowler = state.bowlers[lastBall.bowlerId];
            if (bowler) {
                let bRuns = lastBall.runs;
                if (lastBall.isWide || lastBall.isNoBall) bRuns += 1;
                if (lastBall.isBye || lastBall.isLegBye) bRuns = 0;
                bowler.runsConceded -= bRuns;
                if (lastBall.isWicket) bowler.wickets--;
                
                if (!lastBall.isWide && !lastBall.isNoBall) {
                    bowler.ballsBowled--;
                    const bVal = bowler.ballsBowled;
                    bowler.overs = Number(`${Math.floor(bVal / 6)}.${bVal % 6}`);
                }
            }

            if (!lastBall.isWide && !lastBall.isNoBall) {
                state.ballsInCurrentOver--;
                const totalValidBalls = (Math.floor(state.overs) * 6) + Math.round((state.overs % 1) * 10) - 1;
                state.overs = Number(`${Math.floor(totalValidBalls / 6)}.${totalValidBalls % 6}`);
                if (state.ballsInCurrentOver < 0) state.ballsInCurrentOver = 5;
            }

            if (lastBall.runs % 2 !== 0) {
                const temp = state.strikerId;
                state.strikerId = state.nonStrikerId;
                state.nonStrikerId = temp;
            }

            await db.collection('matches').doc(match.id).update({ [`innings.${match.currentInnings}`]: state });
        } catch (e) { console.error("Undo failed", e); } finally { setProcessing(false); }
    };

    const updateOverlay = async (updates: Partial<Match['overlay']>) => {
        if (!match) return;
        await db.collection('matches').doc(match.id).update({ overlay: { ...match.overlay, ...updates } });
    };

    const handleSaveManual = async (field: 'I1' | 'I1W' | 'I2' | 'I2W') => {
        if (!match) return;
        const updates: any = {};
        if (field === 'I1') updates['innings.1.totalRuns'] = manualRuns.I1;
        if (field === 'I1W') updates['innings.1.wickets'] = manualRuns.I1W;
        if (field === 'I2') updates['innings.2.totalRuns'] = manualRuns.I2;
        if (field === 'I2W') updates['innings.2.wickets'] = manualRuns.I2W;
        await db.collection('matches').doc(match.id).update(updates);
    };

    if (loading || !match) return <div className="flex items-center justify-center h-screen bg-black"><Loader2 className="w-8 h-8 animate-spin text-purple-500"/></div>;

    const renderPlayerSelector = (type: 'STRIKER' | 'NON_STRIKER' | 'BOWLER', currentId: string | null | undefined) => {
        const isBatsman = type === 'STRIKER' || type === 'NON_STRIKER';
        const team = isBatsman ? battingTeam : bowlingTeam;
        if (!team) return <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest p-2 bg-gray-800 rounded">Protocol Waiting...</div>;
        if (currentId) {
            const playerStats = isBatsman ? currentInnings?.batsmen[currentId] : currentInnings?.bowlers[currentId];
            const name = playerStats?.name || team.players.find(p => String(p.id) === String(currentId))?.name || 'Unknown';
            const statsDisplay = isBatsman ? `${(playerStats as BatsmanStats)?.runs || 0}(${(playerStats as BatsmanStats)?.balls || 0})` : `${(playerStats as BowlerStats)?.wickets || 0}-${(playerStats as BowlerStats)?.runsConceded || 0} (${(playerStats as BowlerStats)?.overs || 0})`;
            return (
                <div className="flex justify-between items-center w-full">
                    <div className={`flex flex-col items-start font-bold text-sm ${type === 'STRIKER' ? 'text-lime-400' : 'text-white'}`}>
                        <span className="truncate max-w-[120px]">{name}</span>
                        <span className="tabular-nums text-[10px] opacity-70">{statsDisplay}</span>
                    </div>
                    <button onClick={() => handleResetPlayerSlot(type)} className="p-1 hover:bg-white/10 rounded transition-colors text-gray-400 hover:text-white" title="Reset Slot"><RefreshCw className="w-3 h-3" /></button>
                </div>
            );
        }
        return (
            <div className="w-full space-y-1">
                <div className="text-[8px] font-black text-gray-500 uppercase tracking-widest ml-1">{type} Selection</div>
                <div className="max-h-24 overflow-y-auto bg-gray-900/50 rounded border border-gray-700 p-1 custom-scrollbar">
                    {team.players.map(p => (
                        <button key={p.id} onClick={() => handlePlayerSelect(type, String(p.id))} className="w-full text-left px-2 py-1 text-[9px] font-bold text-gray-400 hover:bg-highlight hover:text-primary rounded transition-all truncate uppercase">
                            {p.name}
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    const availableThemes = [
        { id: 'ICC_T20_2010', label: 'T20 2010' },
        { id: 'ICC_T20_2012', label: 'T20 2012' },
        { id: 'ICC_T20_2014', label: 'T20 2014' },
        { id: 'ICC_T20_2016', label: 'T20 2016' },
        { id: 'ICC_T20_2021', label: 'T20 2021' },
        { id: 'ICC_T20_2022', label: 'T20 2022' },
        { id: 'ICC_T20_2024', label: 'T20 2024' },
        { id: 'CWC_2023', label: 'CWC 2023' },
        { id: 'DEFAULT', label: 'Modern' },
    ].filter(t => !hiddenThemes.includes(t.id));

    return (
        <div className="min-h-screen bg-slate-950 font-sans text-white pb-20 selection:bg-blue-500 selection:text-white">
            <div className="bg-slate-900 p-4 shadow-2xl sticky top-0 z-40 border-b border-white/5 backdrop-blur-xl">
                <div className="flex justify-between items-center mb-4">
                    <button onClick={() => navigate('/scoring')} className="p-2 bg-slate-800 rounded-xl hover:bg-slate-700 transition-all active:scale-95"><ArrowLeft className="w-5 h-5"/></button>
                    <div className="text-center flex-1">
                        <h2 className="text-lg font-black uppercase tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
                           {match.teamAName} <span className="text-white text-[10px] opacity-40 mx-2">VS</span> {match.teamBName}
                        </h2>
                    </div>
                    <button onClick={() => window.open(`/#/match-overlay/${matchId}`, '_blank')} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-xl font-black text-[10px] flex items-center gap-2 shadow-lg transition-all active:scale-95">
                        <Monitor className="w-4 h-4"/> BROADCAST
                    </button>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-black/40 p-3 rounded-2xl border border-white/5 flex flex-col justify-center gap-2">
                        {renderPlayerSelector('STRIKER', currentInnings?.strikerId)}
                        <div className="h-px bg-white/5 w-full"></div>
                        {renderPlayerSelector('NON_STRIKER', currentInnings?.nonStrikerId)}
                    </div>
                    <div className="bg-gradient-to-br from-blue-700 to-indigo-900 p-4 rounded-3xl text-center flex flex-col justify-center shadow-2xl border border-white/10 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <span className="text-5xl font-black tabular-nums leading-none tracking-tighter drop-shadow-lg">{currentInnings?.totalRuns}-{currentInnings?.wickets}</span>
                        <span className="text-[10px] font-black uppercase opacity-60 mt-2 tracking-[0.3em]">{currentInnings?.overs} / {match.totalOvers} OVR</span>
                    </div>
                    <div className="bg-black/40 p-3 rounded-2xl border border-white/5 flex flex-col justify-between">
                        {renderPlayerSelector('BOWLER', currentInnings?.currentBowlerId)}
                        <div className="flex gap-1.5 justify-center mt-3 pt-2 border-t border-white/5">
                            {currentInnings?.recentBalls.slice(-6).map((b, i) => (
                                <div key={i} className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shadow-md ${b.isWicket ? 'bg-pink-600 text-white animate-pulse' : b.runs >= 4 ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400'}`}>{b.isWicket ? 'W' : b.runs}</div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-2xl mx-auto p-4 space-y-6">
                
                <div className="bg-slate-900/80 p-6 rounded-[2.5rem] border border-white/5 shadow-2xl">
                    <h4 className="text-center text-[10px] font-black uppercase tracking-[0.4em] text-blue-400 mb-6 flex items-center justify-center gap-2">
                        <Palette className="w-3 h-3"/> Scoreboard Package
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                         {availableThemes.map(t => (
                             <button key={t.id} onClick={() => updateOverlay({ theme: t.id as ScoreboardTheme })} className={`py-3 rounded-xl text-[10px] font-black uppercase border transition-all active:scale-95 ${match.overlay?.theme === t.id ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-slate-800 border-white/5 text-slate-400 hover:text-white'}`}>
                                 {t.label}
                             </button>
                         ))}
                         {availableThemes.length === 0 && <p className="col-span-full text-center text-xs text-gray-500 italic">No packages authorized.</p>}
                    </div>
                </div>

                <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-[3rem] p-8 shadow-2xl relative overflow-hidden border border-white/5">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full"></div>
                    <h3 className="text-center font-black text-xs uppercase tracking-[0.6em] text-slate-500 mb-8">Control Deck</h3>
                    
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={handleSwapBatter} className="bg-blue-600/20 hover:bg-blue-600 border border-blue-500/30 py-4 rounded-2xl text-[10px] font-black uppercase flex flex-col items-center justify-center gap-2 transition-all active:scale-95"><RefreshCw className="w-4 h-4 text-blue-400 group-hover:text-white"/> Swap</button>
                            <button onClick={() => handleResetPlayerSlot('STRIKER')} className="bg-pink-600/20 hover:bg-pink-600 border border-pink-500/30 py-4 rounded-2xl text-[10px] font-black uppercase flex flex-col items-center justify-center gap-2 transition-all active:scale-95"><UserMinus className="w-4 h-4 text-pink-400"/> Retire</button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => handleResetPlayerSlot('BOWLER')} className="bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/30 py-4 rounded-2xl text-[10px] font-black uppercase flex flex-col items-center justify-center gap-2 transition-all active:scale-95"><RefreshCw className="w-4 h-4 text-indigo-400"/> Bowler</button>
                            <button onClick={() => updateOverlay({ currentView: 'DEFAULT' })} className="bg-emerald-500 text-black py-4 rounded-2xl text-[10px] font-black uppercase shadow-lg transition-all active:scale-95">Reset View</button>
                        </div>
                    </div>

                    <div className="flex flex-wrap justify-between items-center gap-4 mb-8 bg-black/40 p-6 rounded-3xl border border-white/5">
                        {[ 
                            { label: 'Wide', state: isWide, set: setIsWide },
                            { label: 'No Ball', state: isNoBall, set: setIsNoBall },
                            { label: 'Byes', state: isBye, set: setIsBye },
                            { label: 'Leg Byes', state: isLegBye, set: setIsLegBye },
                            { label: 'Wicket', state: isWicket, set: setIsWicket, color: 'text-pink-500' }
                        ].map(item => (
                            <button key={item.label} onClick={() => item.set(!item.state)} className={`flex flex-col items-center gap-2 transition-all active:scale-95 ${item.state ? (item.color || 'text-emerald-400') : 'text-gray-600 opacity-40'}`}>
                                {item.state ? <CheckSquare className="w-6 h-6"/> : <Square className="w-6 h-6"/>}
                                <span className="text-[9px] font-black uppercase tracking-widest">{item.label}</span>
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-4 gap-4 mb-10">
                        {[0, 1, 2, 3, 4, 5, 6].map(r => (
                            <button key={r} onClick={() => handleScore(r)} className="w-16 h-16 rounded-3xl bg-slate-100 hover:bg-white text-slate-900 flex items-center justify-center text-3xl font-black shadow-2xl transition-all active:scale-90 active:rotate-2 mx-auto">{r}</button>
                        ))}
                        <button className="w-16 h-16 rounded-3xl bg-slate-800 text-white flex items-center justify-center border-2 border-white/5 active:scale-90 transition-all"><MoreHorizontal/></button>
                    </div>

                    <div className="flex justify-center gap-4">
                        <button onClick={handleEndInning} className="bg-slate-100 hover:bg-white text-slate-900 px-8 py-3 rounded-2xl text-[10px] font-black uppercase shadow-xl transition-all active:scale-95">End Inning {match.currentInnings}</button>
                        <button onClick={handleUndo} className="bg-pink-600 hover:bg-pink-500 px-8 py-3 rounded-2xl text-[10px] font-black uppercase shadow-xl flex items-center gap-2 transition-all active:scale-95"><Undo2 className="w-4 h-4"/> Undo</button>
                    </div>
                </div>

                <div className="bg-slate-900/80 p-6 rounded-[2.5rem] border border-white/5 shadow-2xl">
                    <h4 className="text-center text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-6 flex items-center justify-center gap-2">
                        < ImageIcon className="w-3 h-3"/> Background Gallery
                    </h4>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        <button onClick={() => updateOverlay({ backgroundGraphicUrl: '' })} className={`aspect-video rounded-2xl border-2 flex flex-col items-center justify-center text-[8px] font-black uppercase transition-all ${!match.overlay?.backgroundGraphicUrl ? 'bg-slate-950 border-emerald-500 text-emerald-500' : 'bg-slate-800 border-white/5 text-slate-500 hover:text-white'}`}>
                            <XCircle className="w-5 h-5 mb-1"/> CLEAR
                        </button>
                        {[...globalAssets, ...localAssets].map(asset => (
                            <button key={asset.id} onClick={() => updateOverlay({ backgroundGraphicUrl: asset.url })} className={`group aspect-video rounded-2xl border-2 overflow-hidden relative transition-all active:scale-95 ${match.overlay?.backgroundGraphicUrl === asset.url ? 'border-emerald-500 ring-4 ring-emerald-500/20' : 'border-white/5 hover:border-white/20'}`}>
                                <img src={asset.url} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <span className="text-[7px] font-black text-white uppercase text-center p-2 leading-none">{asset.name}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* MAN OF THE MATCH INLINE SELECTION */}
                    <div className="bg-slate-900/80 p-6 rounded-[2.5rem] border border-white/5 shadow-2xl flex flex-col">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-yellow-500 mb-4 flex items-center gap-2"><Star className="w-3 h-3"/> Player of Match</h4>
                        <div className="max-h-48 overflow-y-auto bg-black/40 rounded-2xl p-2 border border-white/5 custom-scrollbar mb-3">
                            <div className="grid grid-cols-1 gap-1">
                                {allPlayers.map(p => (
                                    <button 
                                        key={p.id} 
                                        onClick={() => setSelectedMOM(String(p.id))}
                                        className={`w-full text-left px-4 py-2 rounded-xl text-[10px] font-bold uppercase transition-all flex items-center justify-between ${selectedMOM === String(p.id) ? 'bg-yellow-500 text-black' : 'text-gray-400 hover:bg-white/5'}`}
                                    >
                                        <span>{p.name}</span>
                                        {selectedMOM === String(p.id) && <Check className="w-3 h-3"/>}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button onClick={() => updateOverlay({ momId: selectedMOM, currentView: 'MOM' })} className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black text-[10px] py-3 rounded-2xl uppercase transition-all active:scale-95 shadow-lg">Display MOM</button>
                    </div>

                    {/* TOUR STATS PLAYER INLINE SELECTION */}
                    <div className="bg-slate-900/80 p-6 rounded-[2.5rem] border border-white/5 shadow-2xl flex flex-col">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-purple-500 mb-4 flex items-center gap-2"><BarChart2 className="w-3 h-3"/> Player Profile</h4>
                        <div className="max-h-48 overflow-y-auto bg-black/40 rounded-2xl p-2 border border-white/5 custom-scrollbar mb-3">
                            <div className="grid grid-cols-1 gap-1">
                                {allPlayers.map(p => (
                                    <button 
                                        key={p.id} 
                                        onClick={() => setSelectedStatsPlayer(String(p.id))}
                                        className={`w-full text-left px-4 py-2 rounded-xl text-[10px] font-bold uppercase transition-all flex items-center justify-between ${selectedStatsPlayer === String(p.id) ? 'bg-purple-600 text-white' : 'text-gray-400 hover:bg-white/5'}`}
                                    >
                                        <span>{p.name}</span>
                                        {selectedStatsPlayer === String(p.id) && <Check className="w-3 h-3"/>}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button onClick={() => updateOverlay({ statsPlayerId: selectedStatsPlayer, currentView: 'PLAYER_STATS' })} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-black text-[10px] py-3 rounded-2xl uppercase transition-all active:scale-95 shadow-lg">Display Profile</button>
                    </div>
                </div>

                <div className="bg-slate-900/80 p-6 rounded-[2.5rem] border border-white/5 shadow-2xl">
                    <h4 className="text-center text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-6">Overlay Displays</h4>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
                         {['DEFAULT', 'I1BAT', 'I1BALL', 'I2BAT', 'I2BALL'].map(view => (
                             <button key={view} onClick={() => updateOverlay({ currentView: view as any })} className={`py-3 rounded-xl text-[8px] font-black uppercase border transition-all active:scale-95 ${match.overlay?.currentView === view ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-800 border-white/5 text-slate-400'}`}>{view}</button>
                         ))}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                         {['SUMMARY', 'FOW', 'B1', 'B2'].map(view => (
                             <button key={view} onClick={() => updateOverlay({ currentView: view as any })} className={`py-3 rounded-xl text-[8px] font-black uppercase border transition-all active:scale-95 ${match.overlay?.currentView === view ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-white/5 text-slate-400'}`}>{view}</button>
                         ))}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                         {['BOWLER', 'TARGET', 'PARTNERSHIP'].map(view => (
                             <button key={view} onClick={() => updateOverlay({ currentView: view as any })} className={`py-3 rounded-xl text-[8px] font-black uppercase border transition-all active:scale-95 ${match.overlay?.currentView === view ? 'bg-pink-600 border-pink-500 text-white' : 'bg-slate-800 border-white/5 text-slate-400'}`}>{view}</button>
                         ))}
                    </div>
                </div>

                <div className="bg-slate-900/80 p-6 rounded-[2.5rem] border border-white/5 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
                    <span className="text-emerald-500 font-black text-xs uppercase tracking-[0.4em] italic">Live Decision :</span>
                    <div className="flex-1 grid grid-cols-3 gap-3 w-full">
                        <button onClick={() => updateOverlay({ currentView: 'DECISION', decision: 'PENDING' })} className="bg-yellow-500 hover:bg-yellow-400 text-black font-black text-[10px] py-4 rounded-2xl uppercase transition-all active:scale-95 shadow-lg">Pending</button>
                        <button onClick={() => updateOverlay({ currentView: 'DECISION', decision: 'OUT' })} className="bg-pink-600 hover:bg-pink-500 py-4 rounded-2xl font-black text-[10px] uppercase transition-all active:scale-95 shadow-lg">Out</button>
                        <button onClick={() => updateOverlay({ currentView: 'DECISION', decision: 'NOT_OUT' })} className="bg-emerald-600 hover:bg-emerald-500 py-4 rounded-2xl font-black text-[10px] uppercase transition-all active:scale-95 shadow-lg">Not Out</button>
                    </div>
                </div>

                <div className="bg-slate-900/80 p-6 rounded-[2.5rem] border border-white/5 shadow-2xl">
                    <h4 className="text-center text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-6">Tournament Data Pages</h4>
                    <div className="flex flex-wrap justify-center gap-2">
                        {['POINTS TABLE', 'TOP BATTERS', 'TOP BOWLERS', 'TOP STRIKERS', 'MOM'].map(stat => (
                             <button key={stat} onClick={() => updateOverlay({ currentView: stat.replace(/ /g, '_') as any })} className={`px-6 py-3 rounded-2xl text-[9px] font-black uppercase border transition-all active:scale-95 ${match.overlay?.currentView === stat.replace(/ /g, '_') ? 'bg-pink-600 border-pink-500 text-white' : 'bg-slate-800 border-white/5 text-slate-400 hover:text-white'}`}>{stat}</button>
                        ))}
                    </div>
                </div>

                <div className="bg-slate-900/80 p-6 rounded-[2.5rem] border border-white/5 shadow-2xl">
                    <h4 className="text-center text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-6">Team Aesthetics</h4>
                    <div className="flex items-center justify-around gap-6">
                        <div className="flex flex-col items-center gap-3">
                            <input type="color" className="w-16 h-16 rounded-2xl overflow-hidden border-4 border-white/10 bg-transparent cursor-pointer transition-all active:scale-90" value={teamAColor} onChange={e => setTeamAColor(e.target.value)} />
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest truncate max-w-[80px]">{match.teamAName}</span>
                        </div>
                        <button onClick={() => updateOverlay({ teamAColor, teamBColor })} className="bg-white text-slate-900 font-black text-[10px] px-10 py-3 rounded-2xl uppercase transition-all active:scale-95 shadow-xl">Apply Colors</button>
                        <div className="flex flex-col items-center gap-3">
                            <input type="color" className="w-16 h-16 rounded-2xl overflow-hidden border-4 border-white/10 bg-transparent cursor-pointer transition-all active:scale-90" value={teamBColor} onChange={e => setTeamBColor(e.target.value)} />
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest truncate max-w-[80px]">{match.teamBName}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-pink-600 rounded-[3rem] p-8 shadow-2xl relative overflow-hidden">
                    <div className="flex justify-center mb-8">
                        <button onClick={() => setExtraControllerVisible(!extraControllerVisible)} className="bg-black/40 hover:bg-black/60 px-8 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-white transition-all active:scale-95">Manual Overrides</button>
                    </div>
                    
                    {extraControllerVisible && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 animate-slide-up">
                            {[
                                { label: 'Inning 1 Runs', field: 'I1' as const, key: 'I1' },
                                { label: 'Inning 1 Wkts', field: 'I1W' as const, key: 'I1W' },
                                { label: 'Inning 2 Runs', field: 'I2' as const, key: 'I2' },
                                { label: 'Inning 2 Wkts', field: 'I2W' as const, key: 'I2W' }
                            ].map(item => (
                                <div key={item.key} className="flex flex-col items-center text-center gap-3">
                                    <p className="text-[9px] font-black text-white/60 uppercase tracking-widest leading-tight h-8 flex items-center justify-center">{item.label}</p>
                                    <input type="number" className="w-20 h-14 rounded-2xl bg-white text-slate-900 text-2xl font-black text-center shadow-lg outline-none focus:ring-4 ring-black/10" value={manualRuns[item.key]} onChange={e => setManualRuns({...manualRuns, [item.key]: Number(e.target.value)})} />
                                    <button onClick={() => handleSaveManual(item.field)} className="bg-black text-white font-black text-[9px] px-6 py-2 rounded-xl uppercase transition-all active:scale-95">Save</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default MatchScorer;
