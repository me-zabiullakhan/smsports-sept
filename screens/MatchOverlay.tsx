
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../firebase';
import { Trophy, Users, Globe } from 'lucide-react';
import { Match, InningsState, BatsmanStats, BowlerStats, OverlayView, OverlayAnimation, DecisionStatus, ScoreboardTheme } from '../types';

const MatchOverlay: React.FC = () => {
    const { matchId } = useParams<{ matchId: string }>();
    const [match, setMatch] = useState<Match | null>(null);

    useEffect(() => {
        document.body.style.backgroundColor = 'transparent';
        document.documentElement.style.backgroundColor = 'transparent';
    }, []);

    useEffect(() => {
        if (!matchId) return;
        const unsub = db.collection('matches').doc(matchId).onSnapshot(doc => {
            if (doc.exists) setMatch({ id: doc.id, ...doc.data() } as Match);
        });
        return () => unsub();
    }, [matchId]);

    if (!match) return null;

    const currentInnings = match.innings[match.currentInnings];
    if (!currentInnings) return null;

    const battingTeamName = currentInnings.battingTeamId === match.teamAId ? match.teamAName : match.teamBName;
    const bowlingTeamName = currentInnings.bowlingTeamId === match.teamAId ? match.teamAName : match.teamBName;
    const striker = currentInnings.batsmen[currentInnings.strikerId || ''];
    const nonStriker = currentInnings.batsmen[currentInnings.nonStrikerId || ''];
    const bowler = currentInnings.bowlers[currentInnings.currentBowlerId || ''];
    const recentBalls = currentInnings.recentBalls.slice(-6);

    const view = match.overlay?.currentView || 'DEFAULT';
    const theme = match.overlay?.theme || 'ICC_T20_2024';
    const decision = match.overlay?.decision || 'NONE';
    const animType = match.overlay?.animation || 'NONE';
    const backgroundUrl = match.overlay?.backgroundGraphicUrl;

    // --- SHARED COMPONENTS ---

    const DecisionBanner = () => {
        if (view !== 'DECISION' || decision === 'NONE') return null;
        let bgColor = "bg-yellow-500";
        let textColor = "text-black";
        let text = "DECISION PENDING";

        if (decision === 'OUT') {
            bgColor = "bg-red-600";
            textColor = "text-white";
            text = "OUT";
        } else if (decision === 'NOT_OUT') {
            bgColor = "bg-green-600";
            textColor = "text-white";
            text = "NOT OUT";
        }

        return (
            <div className="fixed bottom-24 left-0 w-full animate-slide-up flex justify-center px-20 z-50">
                <div className={`${bgColor} ${textColor} w-full py-4 text-center rounded-lg shadow-2xl border-4 border-white/20`}>
                    <h1 className="text-6xl font-black uppercase tracking-[0.5em] italic drop-shadow-lg">{text}</h1>
                </div>
            </div>
        );
    };

    const AnimationLayer = () => {
        if (view !== 'ANIMATION' || animType === 'NONE') return null;
        let text = "";
        let gradient = "";
        switch (animType) {
            case 'FOUR': text = "FOUR"; gradient = "from-pink-600 to-pink-400"; break;
            case 'SIX': text = "SIX"; gradient = "from-blue-600 to-blue-400"; break;
            case 'WICKET': text = "WICKET"; gradient = "from-red-700 to-red-500"; break;
            case 'FREE_HIT': text = "FREE HIT"; gradient = "from-green-600 to-green-400"; break;
            default: return null;
        }
        return (
            <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
                <div className={`bg-gradient-to-r ${gradient} text-white px-20 py-10 rounded-3xl shadow-[0_0_100px_rgba(0,0,0,0.5)] border-8 border-white animate-bounce-in relative overflow-hidden`}>
                    <h1 className="text-[12vw] font-black italic tracking-tighter leading-none drop-shadow-[0_10px_10px_rgba(0,0,0,0.3)]">{text}</h1>
                </div>
            </div>
        );
    };

    // --- THEME RENDERERS ---

    const T20_2010 = () => (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[1200px] flex flex-col font-sans animate-slide-up z-20">
            <div className="bg-[#001427]/90 text-white flex items-stretch h-14 border-t border-cyan-400/50 shadow-2xl relative">
                <div className="bg-cyan-500 text-black px-6 flex items-center font-black text-2xl uppercase tracking-wider">{battingTeamName}</div>
                <div className="bg-white text-black px-8 flex items-center gap-3">
                    <span className="text-4xl font-black">{currentInnings.totalRuns}-{currentInnings.wickets}</span>
                    <div className="flex flex-col items-center justify-center leading-none mt-1">
                        <span className="text-[10px] font-bold text-gray-500">OVERS</span>
                        <span className="text-xl font-black">{currentInnings.overs}</span>
                    </div>
                </div>
                <div className="flex-1 flex items-center px-6 gap-8 border-l border-white/10">
                    <div className="flex items-baseline gap-2">
                        <span className="text-cyan-400 text-xs font-bold uppercase tracking-widest">Target</span>
                        <span className="text-2xl font-black">{match.currentInnings === 2 ? match.innings[1].totalRuns + 1 : '-'}</span>
                    </div>
                    <div className="text-white/60 font-bold italic text-sm tracking-wide">
                        NEED {match.currentInnings === 2 ? (match.innings[1].totalRuns + 1 - currentInnings.totalRuns) : '-'} TO WIN FROM {match.currentInnings === 2 ? (match.totalOvers * 6 - (Math.floor(currentInnings.overs) * 6 + Math.round((currentInnings.overs % 1) * 10))) : '-'} BALLS
                    </div>
                </div>
            </div>
        </div>
    );

    const T20_2012 = () => (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[1100px] flex flex-col font-sans animate-slide-up z-20">
             <div className="bg-[#0e2439] rounded-lg overflow-hidden border border-white/20 shadow-2xl flex items-stretch h-14">
                <div className="w-16 bg-white flex items-center justify-center p-2"><Trophy className="text-blue-900"/></div>
                <div className="px-6 flex items-center gap-4 bg-white/10">
                    <span className="text-white text-xl font-bold">{battingTeamName} v {bowlingTeamName}</span>
                </div>
                <div className="bg-red-600 px-6 flex items-center gap-2 border-x border-white/20">
                    <span className="text-white text-3xl font-black tabular-nums">{currentInnings.totalRuns}-{currentInnings.wickets}</span>
                </div>
                <div className="px-6 flex items-center gap-4 text-white/90 font-bold bg-white/5">
                    <span className="text-xl">{currentInnings.overs}</span>
                    <span className="text-xs text-white/40 font-black">OVERS</span>
                </div>
                <div className="flex-1 px-6 flex items-center justify-end gap-6 text-white bg-black/40">
                    <span className="text-[10px] font-black tracking-widest uppercase text-white/50">THIS OVER</span>
                    <div className="flex gap-1">
                        {recentBalls.map((b, i) => (
                            <span key={i} className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-black ${b.isWicket ? 'bg-red-500' : 'bg-white/10 text-white'}`}>{b.isWicket ? 'W' : b.runs}</span>
                        ))}
                    </div>
                    <div className="ml-4 flex items-center gap-2">
                        <span className="text-[10px] font-black text-white/40 uppercase">RUN RATE</span>
                        <span className="text-xl font-black italic">{currentInnings.currentRunRate.toFixed(2)}</span>
                    </div>
                </div>
             </div>
        </div>
    );

    const T20_2024 = () => (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[1200px] font-sans animate-slide-up z-20">
            <div className="bg-[#000a20] rounded-xl h-20 border-2 border-white/5 shadow-[0_20px_60px_rgba(0,0,0,0.7)] flex items-stretch overflow-hidden relative">
                <div className="w-20 bg-gradient-to-br from-indigo-900 to-black flex items-center justify-center border-r border-white/5"><Globe className="text-white/10 w-10 h-10"/></div>
                <div className="w-[300px] flex flex-col justify-center px-8 border-r border-white/5 gap-1.5">
                    <div className="flex justify-between items-center group">
                        <div className="flex items-center gap-3">
                            <div className="w-1 h-4 bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]"></div>
                            <span className="text-white font-black uppercase text-base tracking-tight">{striker?.name || '-'}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-white font-black text-2xl tabular-nums">{striker?.runs || 0}</span>
                            <span className="text-xs font-bold text-gray-500 tabular-nums">{striker?.balls || 0}</span>
                        </div>
                    </div>
                    <div className="flex justify-between items-center opacity-40">
                         <div className="flex items-center gap-3 ml-4">
                             <span className="text-white font-bold uppercase text-sm tracking-tight">{nonStriker?.name || '-'}</span>
                         </div>
                         <div className="flex items-center gap-3">
                            <span className="text-white font-black text-lg tabular-nums">{nonStriker?.runs || 0}</span>
                            <span className="text-[10px] font-bold text-gray-500 tabular-nums">{nonStriker?.balls || 0}</span>
                        </div>
                    </div>
                </div>
                <div className="flex-1 flex flex-col items-stretch overflow-hidden relative">
                    <div className="h-full flex items-center bg-gradient-to-r from-[#000d2b] via-[#00174d] to-[#000d2b]">
                        <div className="flex-1 flex flex-col items-center justify-center">
                            <span className="text-[#64748b] text-[10px] font-black uppercase tracking-[0.4em] mb-1">{battingTeamName} v {bowlingTeamName}</span>
                            <div className="flex items-baseline gap-4 relative">
                                <span className="text-white text-6xl font-black tracking-tighter tabular-nums leading-none">{currentInnings.totalRuns}-{currentInnings.wickets}</span>
                                <div className="bg-pink-600 px-2 py-0.5 rounded-md text-white text-[10px] font-black uppercase shadow-lg">PP</div>
                                <span className="text-white text-2xl font-bold opacity-60 tabular-nums">{currentInnings.overs} <span className="text-xs font-black uppercase ml-1 tracking-widest">Overs</span></span>
                            </div>
                        </div>
                    </div>
                    <div className="absolute bottom-0 left-0 w-full h-1.5 bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-700"></div>
                </div>
                <div className="w-[380px] flex flex-col justify-center px-8 border-l border-white/5 gap-2 bg-black/20">
                    <div className="flex justify-between items-center">
                        <span className="text-white font-black uppercase text-base tracking-tight italic">{bowler?.name || '-'}</span>
                        <div className="flex items-center gap-3">
                            <span className="text-[#a5b4fc] font-black text-2xl tabular-nums leading-none">{bowler?.wickets || 0}-{bowler?.runsConceded || 0}</span>
                            <span className="text-xs font-bold text-gray-500 tabular-nums">{bowler?.overs || 0}</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {recentBalls.map((b, i) => (
                             <div key={i} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-black shadow-lg transition-all ${b.isWicket ? 'bg-pink-600 border-pink-400 text-white animate-pulse' : b.runs >= 4 ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-white/5 border-white/10 text-white/40'}`}>
                                 {b.isWicket ? 'W' : b.runs}
                             </div>
                        ))}
                    </div>
                </div>
                <div className="w-20 bg-gradient-to-br from-indigo-900 to-black flex items-center justify-center border-l border-white/5"><Globe className="text-white/10 w-10 h-10"/></div>
            </div>
        </div>
    );

    const CWC_2023 = () => (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[1200px] h-14 font-sans animate-slide-up z-20">
            {/* Direct Background Integration into the Bar Wrapper */}
            <div 
                className="w-full h-full rounded-full shadow-[0_15px_40px_rgba(0,0,0,0.4)] flex items-stretch overflow-hidden relative"
                style={backgroundUrl ? { 
                    backgroundImage: `url(${backgroundUrl})`,
                    backgroundSize: '100% 100%',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                } : {
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    backdropFilter: 'blur(4px)',
                    border: '1px solid rgba(0,0,0,0.05)'
                }}
            >
                {/* Left Flag Placeholder */}
                <div className="w-16 flex items-center justify-center pl-4">
                    <Globe className="text-gray-300 w-8 h-8 opacity-20" />
                </div>

                {/* Batsmen Segment */}
                <div className="flex flex-col justify-center px-4 min-w-[240px] relative z-10">
                    <div className="flex justify-between items-center gap-4">
                        <div className="flex items-center gap-2">
                             <div className="w-1.5 h-1.5 bg-purple-700 rounded-full"></div>
                             <span className="text-gray-800 font-black uppercase text-sm tracking-tight truncate max-w-[120px]">{striker?.name || '-'}</span>
                        </div>
                        <span className="text-gray-800 font-black text-lg tabular-nums leading-none">{striker?.runs || 0} <span className="text-[10px] font-bold text-gray-400 ml-1">{striker?.balls || 0}</span></span>
                    </div>
                    <div className="flex justify-between items-center opacity-50">
                        <span className="text-gray-800 font-bold uppercase text-[11px] truncate max-w-[120px] ml-3.5">{nonStriker?.name || '-'}</span>
                        <span className="text-gray-800 font-black text-sm tabular-nums leading-none">{nonStriker?.runs || 0} <span className="text-[10px] font-bold text-gray-400 ml-1">{nonStriker?.balls || 0}</span></span>
                    </div>
                </div>

                {/* Match Identity Box - Slanted Purple Fallback */}
                <div className="relative w-44">
                    {!backgroundUrl && <div className="absolute inset-y-0 left-[-20px] right-[-10px] bg-indigo-900 transform -skew-x-[25deg] shadow-lg"></div>}
                    <div className="relative h-full flex flex-col items-center justify-center text-white px-2">
                         <span className="text-[10px] font-black uppercase tracking-tighter truncate w-full text-center">
                            {match.teamAName} v {match.teamBName}
                         </span>
                         <span className="text-[8px] font-bold uppercase opacity-60 truncate w-full text-center tracking-widest">LIVE MATCH</span>
                    </div>
                </div>

                {/* Score Box - Slanted Pink Fallback */}
                <div className="relative w-48">
                    {!backgroundUrl && <div className="absolute inset-y-0 left-[-15px] right-[-15px] bg-pink-600 transform -skew-x-[25deg] shadow-xl border-x-2 border-white/20"></div>}
                    <div className="relative h-full flex items-center justify-center text-white gap-2">
                        <span className="text-4xl font-black italic tracking-tighter tabular-nums drop-shadow-md">
                            {currentInnings.totalRuns}-{currentInnings.wickets}
                        </span>
                        <div className="bg-yellow-400 text-black text-[9px] font-black px-1.5 py-0.5 rounded-sm transform skew-x-[25deg] -rotate-3">PP</div>
                    </div>
                </div>

                {/* Overs Segment */}
                <div className="flex items-center px-4 relative z-10">
                    <span className="text-gray-800 font-black text-xl italic tabular-nums leading-none">{currentInnings.overs}</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase ml-2 tracking-widest leading-none">Overs</span>
                </div>

                {/* Bowler Segment */}
                <div className="flex-1 flex flex-col justify-center px-4 relative z-10">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-800 font-black uppercase text-sm italic tracking-tight">{bowler?.name || '-'}</span>
                        <span className="text-gray-800 font-black text-lg tabular-nums leading-none">
                            {bowler?.wickets || 0}-{bowler?.runsConceded || 0} <span className="text-[10px] font-bold text-gray-400 ml-1 italic">{bowler?.overs || 0}</span>
                        </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                        <div className="bg-red-500 w-3 h-3 rounded-full flex items-center justify-center shadow-inner animate-pulse"><span className="text-white text-[6px] font-black">▶</span></div>
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">LIVE BROADCAST</span>
                    </div>
                </div>

                {/* Right Flag Placeholder */}
                <div className="w-16 flex items-center justify-center pr-4">
                    <Globe className="text-gray-300 w-8 h-8 opacity-20" />
                </div>
            </div>
        </div>
    );

    const RenderTheme = () => {
        switch (theme) {
            case 'ICC_T20_2010': return <T20_2010 />;
            case 'ICC_T20_2012': return <T20_2012 />;
            case 'ICC_T20_2024': return <T20_2024 />;
            case 'CWC_2023': return <CWC_2023 />;
            default: return <T20_2024 />;
        }
    };

    return (
        <div className="relative w-full h-screen overflow-hidden">
            <style>{`
                @keyframes slide-up { from { transform: translate(-50%, 100px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
                @keyframes bounce-in { 0% { transform: scale(0.3); opacity: 0; } 50% { transform: scale(1.05); opacity: 1; } 70% { transform: scale(0.9); } 100% { transform: scale(1); } }
                .animate-slide-up { animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .animate-bounce-in { animation: bounce-in 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
                .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            `}</style>
            
            <div className="relative z-20 w-full h-full">
                <DecisionBanner />
                <AnimationLayer />
                <RenderTheme />
            </div>
        </div>
    );
}

export default MatchOverlay;
