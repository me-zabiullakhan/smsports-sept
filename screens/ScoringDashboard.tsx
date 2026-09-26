
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { AuctionSetup, Match, Team, Tournament, ScoringAsset } from '../types';
/* Added Gavel icon to the import list below */
import { ArrowLeft, Plus, Calendar, Play, Monitor, Trash2, Loader2, Trophy, Layers, Image as ImageIcon, Upload, X, Check, Target, Gavel } from 'lucide-react';
import { useAuction } from '../hooks/useAuction';
import TournamentManager from '../components/TournamentManager';
import { compressImage } from '../utils';

const ScoringDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { userProfile } = useAuction();
    const [matches, setMatches] = useState<Match[]>([]);
    const [assets, setAssets] = useState<ScoringAsset[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [activeTab, setActiveTab] = useState<'MATCHES' | 'TOURNAMENTS' | 'GRAPHICS'>('MATCHES');

    const [sourceType, setSourceType] = useState<'AUCTION' | 'TOURNAMENT'>('AUCTION');
    const [sourceList, setSourceList] = useState<(AuctionSetup | Tournament)[]>([]);
    const [selectedSourceId, setSelectedSourceId] = useState('');
    const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
    
    const [teamA, setTeamA] = useState('');
    const [teamB, setTeamB] = useState('');
    const [overs, setOvers] = useState(20);
    const [creating, setCreating] = useState(false);

    const [newAssetName, setNewAssetName] = useState('');
    const [newAssetType, setNewAssetType] = useState<ScoringAsset['type']>('FRAME');
    const [assetPreview, setAssetPreview] = useState('');
    const assetFileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!userProfile?.uid) return;

        setLoading(true);
        const unsubMatches = db.collection('matches')
            .orderBy('createdAt', 'desc')
            .onSnapshot(snap => {
                setMatches(snap.docs.map(d => ({ id: d.id, ...d.data() } as Match)));
                setLoading(false);
            });

        const unsubAssets = db.collection('scoringAssets')
            .where('createdBy', '==', userProfile.uid)
            .onSnapshot(snap => {
                setAssets(snap.docs.map(d => ({ id: d.id, ...d.data() } as ScoringAsset)));
            });

        return () => {
            unsubMatches();
            unsubAssets();
        };
    }, [userProfile]);

    useEffect(() => {
        if (!userProfile?.uid) return;
        setSourceList([]);
        setSelectedSourceId('');
        setAvailableTeams([]);

        const collection = sourceType === 'AUCTION' ? 'auctions' : 'tournaments';
        
        db.collection(collection)
            .where('createdBy', '==', userProfile.uid)
            .get()
            .then(snap => {
                const list = snap.docs.map(d => ({ id: d.id, name: (d.data().title || d.data().name), ...d.data() } as any));
                setSourceList(list);
            });
    }, [sourceType, userProfile]);

    useEffect(() => {
        if (!selectedSourceId) {
            setAvailableTeams([]);
            return;
        }
        const collection = sourceType === 'AUCTION' ? 'auctions' : 'tournaments';
        db.collection(collection).doc(selectedSourceId).collection('teams').get()
            .then(snap => {
                setAvailableTeams(snap.docs.map(d => ({ id: d.id, ...d.data() } as Team)));
            });
    }, [selectedSourceId, sourceType]);

    const handleCreateMatch = async () => {
        if (!selectedSourceId || !teamA || !teamB || !overs) {
            alert("Please select both teams and overs.");
            return;
        }
        if (teamA === teamB) {
            alert("Teams must be different");
            return;
        }

        setCreating(true);
        try {
            const teamAObj = availableTeams.find(t => t.id === teamA);
            const teamBObj = availableTeams.find(t => t.id === teamB);

            const newMatch: Omit<Match, 'id'> = {
                auctionId: selectedSourceId, 
                sourceType: sourceType, 
                teamAId: teamA,
                teamBId: teamB,
                teamAName: teamAObj?.name || 'Team A',
                teamBName: teamBObj?.name || 'Team B',
                totalOvers: overs,
                status: 'SCHEDULED',
                currentInnings: 1,
                createdAt: Date.now(),
                innings: {
                    1: { battingTeamId: '', bowlingTeamId: '', totalRuns: 0, wickets: 0, overs: 0, ballsInCurrentOver: 0, currentRunRate: 0, extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 }, strikerId: null, nonStrikerId: null, currentBowlerId: null, batsmen: {}, bowlers: {}, recentBalls: [] },
                    2: { battingTeamId: '', bowlingTeamId: '', totalRuns: 0, wickets: 0, overs: 0, ballsInCurrentOver: 0, currentRunRate: 0, extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 }, strikerId: null, nonStrikerId: null, currentBowlerId: null, batsmen: {}, bowlers: {}, recentBalls: [] }
                }
            };

            await db.collection('matches').add(newMatch);
            setCreating(false);
            setTeamA(''); setTeamB(''); 
        } catch (e: any) {
            alert("Error creating match: " + e.message);
            setCreating(false);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const compressed = await compressImage(e.target.files[0]);
            setAssetPreview(compressed);
        }
    };

    const handleUploadAsset = async () => {
        if (!assetPreview || !newAssetName || !userProfile?.uid) return;
        setCreating(true);
        try {
            await db.collection('scoringAssets').add({
                name: newAssetName,
                type: newAssetType,
                url: assetPreview,
                createdBy: userProfile.uid,
                createdAt: Date.now()
            });
            setNewAssetName('');
            setAssetPreview('');
            alert("Background added to your library!");
        } catch (e: any) {
            alert("Upload failed: " + e.message);
        }
        setCreating(false);
    };

    const deleteAsset = async (id: string) => {
        if (!window.confirm("Remove this graphic from library?")) return;
        await db.collection('scoringAssets').doc(id).delete();
    };

    const deleteMatch = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if(window.confirm("Are you sure you want to permanently delete this match?")) {
            try {
                await db.collection('matches').doc(id).delete();
            } catch (err: any) {
                alert("Error deleting match: " + err.message);
            }
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-800 pb-20">
            <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-20">
                <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/admin')} className="text-gray-400 hover:text-gray-700">
                            <ArrowLeft className="w-5 h-5"/>
                        </button>
                        <h1 className="text-lg font-bold text-gray-700 flex items-center gap-2">
                           <Trophy className="w-5 h-5 text-yellow-500"/> Cricket Scoring
                        </h1>
                    </div>
                    
                    <div className="flex bg-gray-100 rounded-lg p-1 overflow-x-auto">
                        <button 
                            onClick={() => setActiveTab('MATCHES')}
                            className={`px-4 py-1.5 rounded-md text-sm font-bold whitespace-nowrap transition-all ${activeTab === 'MATCHES' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Matches
                        </button>
                        <button 
                            onClick={() => setActiveTab('TOURNAMENTS')}
                            className={`px-4 py-1.5 rounded-md text-sm font-bold whitespace-nowrap transition-all ${activeTab === 'TOURNAMENTS' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Tournaments
                        </button>
                        <button 
                            onClick={() => setActiveTab('GRAPHICS')}
                            className={`px-4 py-1.5 rounded-md text-sm font-bold whitespace-nowrap transition-all ${activeTab === 'GRAPHICS' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Graphics Library
                        </button>
                    </div>
                </div>
            </header>

            <main className="w-full max-w-7xl 2xl:max-w-[1700px] mx-auto px-3 sm:px-6 lg:px-8 py-6">
                
                {activeTab === 'TOURNAMENTS' && <TournamentManager />}

                {activeTab === 'GRAPHICS' && (
                    <div className="space-y-8 animate-fade-in">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h2 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
                                <ImageIcon className="w-5 h-5 text-blue-500"/> Upload Scoreboard Background
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Background Name</label>
                                        <input 
                                            type="text" 
                                            className="w-full border rounded-lg px-4 py-2 text-sm" 
                                            placeholder="e.g. T20 World Cup Style" 
                                            value={newAssetName}
                                            onChange={e => setNewAssetName(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Asset Type</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {['FRAME', 'BACKGROUND', 'LOGO'].map(type => (
                                                <button 
                                                    key={type}
                                                    onClick={() => setNewAssetType(type as any)}
                                                    className={`py-2 rounded text-[10px] font-black transition-all border ${newAssetType === type ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-gray-400'}`}
                                                >
                                                    {type}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <button 
                                        onClick={handleUploadAsset}
                                        disabled={creating || !assetPreview || !newAssetName}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                    >
                                        {creating ? <Loader2 className="animate-spin w-5 h-5"/> : <Upload className="w-5 h-5"/>}
                                        Save to My Library
                                    </button>
                                </div>

                                <div 
                                    onClick={() => assetFileRef.current?.click()}
                                    className="border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center p-4 cursor-pointer hover:bg-gray-50 min-h-[160px] relative overflow-hidden"
                                >
                                    {assetPreview ? (
                                        <img src={assetPreview} className="max-h-full object-contain" />
                                    ) : (
                                        <>
                                            <Upload className="w-10 h-10 text-gray-300 mb-2"/>
                                            <p className="text-xs text-gray-500 font-bold uppercase tracking-tight">Select Background Image</p>
                                            <p className="text-[10px] text-gray-400 mt-1">PNG/JPG 1280x720 recommended</p>
                                        </>
                                    )}
                                    <input ref={assetFileRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {assets.map(asset => (
                                <div key={asset.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden group relative">
                                    <div className="aspect-video bg-gray-100 flex items-center justify-center overflow-hidden">
                                        <img src={asset.url} className="max-h-full transition-transform group-hover:scale-110" />
                                    </div>
                                    <div className="p-3">
                                        <p className="font-bold text-sm truncate text-gray-700">{asset.name}</p>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">{asset.type}</p>
                                    </div>
                                    <button 
                                        onClick={() => deleteAsset(asset.id)}
                                        className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                    >
                                        <Trash2 className="w-3 h-3"/>
                                    </button>
                                </div>
                            ))}
                            {assets.length === 0 && (
                                <div className="col-span-full py-12 text-center text-gray-400">
                                    <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-20"/>
                                    <p>Your library is empty.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'MATCHES' && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-3">
                                <Calendar className="w-5 h-5 text-blue-500"/> Schedule New Match
                            </h2>
                            
                            <div className="space-y-6">
                                {/* STEP 1: SELECT SOURCE */}
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">1. Select Source Protocol</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {['AUCTION', 'TOURNAMENT'].map(type => (
                                            <button 
                                                key={type}
                                                onClick={() => setSourceType(type as any)}
                                                className={`py-4 rounded-xl font-black text-xs transition-all border-2 flex flex-col items-center gap-2 ${sourceType === type ? 'bg-blue-600 border-blue-400 text-white shadow-lg scale-[1.02]' : 'bg-white border-gray-100 text-gray-400 hover:bg-gray-50'}`}
                                            >
                                                {type === 'AUCTION' ? <Gavel className="w-5 h-5"/> : <Trophy className="w-5 h-5"/>}
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* STEP 2: SELECT SPECIFIC SOURCE */}
                                {sourceList.length > 0 && (
                                    <div className="animate-slide-up">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">2. Select {sourceType === 'AUCTION' ? 'Auction' : 'Tournament'}</label>
                                        <div className="max-h-48 overflow-y-auto border border-gray-100 rounded-xl bg-gray-50 p-2 custom-scrollbar">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {sourceList.map((s: any) => (
                                                    <button 
                                                        key={s.id}
                                                        onClick={() => setSelectedSourceId(s.id)}
                                                        className={`p-3 text-left rounded-lg text-xs font-bold transition-all border-2 ${selectedSourceId === s.id ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-white border-transparent text-gray-600 hover:border-gray-200'}`}
                                                    >
                                                        {s.name || s.title}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* STEP 3: SELECT TEAMS & OVERS */}
                                {availableTeams.length > 0 && selectedSourceId && (
                                    <div className="animate-slide-up space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">3A. Batting Team</label>
                                                <div className="max-h-48 overflow-y-auto border border-gray-100 rounded-xl bg-gray-50 p-2 custom-scrollbar">
                                                    <div className="grid grid-cols-1 gap-2">
                                                        {availableTeams.map(t => (
                                                            <button 
                                                                key={t.id}
                                                                onClick={() => setTeamA(String(t.id))}
                                                                className={`p-3 text-left rounded-lg text-xs font-bold transition-all border-2 flex items-center gap-3 ${teamA === String(t.id) ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white border-transparent text-gray-600 hover:border-gray-200'}`}
                                                            >
                                                                {teamA === String(t.id) && <Check className="w-4 h-4"/>}
                                                                {t.name}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">3B. Bowling Team</label>
                                                <div className="max-h-48 overflow-y-auto border border-gray-100 rounded-xl bg-gray-50 p-2 custom-scrollbar">
                                                    <div className="grid grid-cols-1 gap-2">
                                                        {availableTeams.map(t => (
                                                            <button 
                                                                key={t.id}
                                                                onClick={() => setTeamB(String(t.id))}
                                                                className={`p-3 text-left rounded-lg text-xs font-bold transition-all border-2 flex items-center gap-3 ${teamB === String(t.id) ? 'bg-red-50 border-red-500 text-red-700' : 'bg-white border-transparent text-gray-600 hover:border-gray-200'}`}
                                                            >
                                                                {teamB === String(t.id) && <Check className="w-4 h-4"/>}
                                                                {t.name}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6">
                                            <div className="w-full md:w-48">
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Match Overs</label>
                                                <div className="flex bg-white rounded-lg border p-1">
                                                    {[5, 10, 20, 50].map(ov => (
                                                        <button 
                                                            key={ov}
                                                            onClick={() => setOvers(ov)}
                                                            className={`flex-1 py-2 rounded text-xs font-black transition-all ${overs === ov ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-blue-500'}`}
                                                        >
                                                            {ov}
                                                        </button>
                                                    ))}
                                                    <input 
                                                        type="number" 
                                                        className="w-14 text-center text-xs font-black outline-none border-l ml-1" 
                                                        value={overs} 
                                                        onChange={e => setOvers(Number(e.target.value))} 
                                                    />
                                                </div>
                                            </div>
                                            
                                            <button 
                                                onClick={handleCreateMatch} 
                                                disabled={creating || !teamA || !teamB}
                                                className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white font-black py-4 px-12 rounded-xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                                            >
                                                {creating ? <Loader2 className="animate-spin w-5 h-5"/> : <Target className="w-5 h-5"/>}
                                                ESTABLISH MATCH PROTOCOL
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex justify-center p-10"><Loader2 className="animate-spin w-8 h-8 text-blue-600"/></div>
                        ) : matches.length === 0 ? (
                            <div className="text-center p-12 text-gray-400 bg-white rounded-xl shadow-sm border border-dashed border-gray-300">
                                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20"/>
                                <p>No matches in the current registry.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {matches.map(match => (
                                    <div key={match.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all group">
                                        <div className="p-4 border-b border-gray-50">
                                            <div className="flex justify-between items-center mb-3">
                                                <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${match.status === 'LIVE' ? 'bg-red-50 text-red-600 animate-pulse border border-red-100' : match.status === 'COMPLETED' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-gray-100 text-gray-500'}`}>
                                                    {match.status}
                                                </span>
                                                <span className="text-[10px] text-gray-400 font-bold bg-gray-50 px-2 py-1 rounded">
                                                    {match.sourceType === 'TOURNAMENT' ? '🏆 TOUR' : '🔨 AUCTION'}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="w-[45%]">
                                                    <div className="font-bold text-gray-800 truncate text-sm" title={match.teamAName}>{match.teamAName}</div>
                                                </div>
                                                <div className="text-gray-300 font-bold text-xs px-2">VS</div>
                                                <div className="w-[45%] text-right">
                                                    <div className="font-bold text-gray-800 truncate text-sm" title={match.teamBName}>{match.teamBName}</div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 p-3 flex justify-between gap-2 opacity-90 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => navigate(`/scoring/${match.id}`)}
                                                className="flex-1 bg-white hover:bg-blue-50 text-blue-600 border border-blue-200 text-xs font-bold py-2 rounded flex items-center justify-center gap-2 transition-colors"
                                            >
                                                <Play className="w-3 h-3"/> Scorer
                                            </button>
                                            <button 
                                                onClick={() => window.open(`/#/match-overlay/${match.id}`, '_blank')}
                                                className="bg-white hover:bg-gray-100 text-gray-600 border border-gray-200 p-2 rounded shadow-sm"
                                                title="OBS Overlay"
                                            >
                                                <Monitor className="w-4 h-4"/>
                                            </button>
                                            <button 
                                                onClick={(e) => deleteMatch(match.id, e)}
                                                className="bg-white hover:bg-red-50 text-red-400 border border-gray-200 hover:border-red-200 p-2 rounded transition-colors shadow-sm"
                                                title="Delete Match"
                                            >
                                                <Trash2 className="w-4 h-4"/>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

export default ScoringDashboard;
