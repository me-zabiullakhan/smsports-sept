import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { Tournament, Team, Player } from '../types';
import { useAuction } from '../hooks/useAuction';
import { Plus, Trash2, Edit, Save, X, ChevronRight, ChevronDown, Users, UserPlus, Upload, Trophy } from 'lucide-react';
import firebase from 'firebase/compat/app';
import { compressImage } from '../utils';

const TournamentManager: React.FC = () => {
    const { userProfile } = useAuction();
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
    const [tournamentTeams, setTournamentTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Modal States
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState<'TOURNAMENT' | 'TEAM' | 'PLAYER'>('TOURNAMENT');
    const [editItem, setEditItem] = useState<any>(null);
    const [previewImage, setPreviewImage] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeTeamId, setActiveTeamId] = useState<string | null>(null);

    useEffect(() => {
        if (userProfile?.uid) fetchTournaments();
    }, [userProfile]);

    useEffect(() => {
        if (selectedTournament?.id) fetchTeams(selectedTournament.id);
    }, [selectedTournament]);

    const fetchTournaments = async () => {
        setLoading(true);
        const snap = await db.collection('tournaments').where('createdBy', '==', userProfile?.uid).get();
        setTournaments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Tournament)));
        setLoading(false);
    };

    const fetchTeams = async (tId: string) => {
        const snap = await db.collection('tournaments').doc(tId).collection('teams').get();
        setTournamentTeams(snap.docs.map(d => ({ id: d.id, ...d.data() } as Team)));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (modalType === 'TOURNAMENT') {
                const data = {
                    name: editItem.name,
                    createdAt: Date.now(),
                    createdBy: userProfile?.uid
                };
                if (editItem.id) {
                    await db.collection('tournaments').doc(editItem.id).update({ name: editItem.name });
                    setTournaments(prev => prev.map(t => t.id === editItem.id ? { ...t, name: editItem.name } : t));
                } else {
                    const ref = await db.collection('tournaments').add(data);
                    setTournaments(prev => [...prev, { id: ref.id, ...data } as Tournament]);
                }
            } else if (modalType === 'TEAM' && selectedTournament?.id) {
                const data = {
                    name: editItem.name,
                    logoUrl: previewImage || editItem.logoUrl || '',
                    players: editItem.players || [],
                    budget: 0
                };
                if (editItem.id) {
                    await db.collection('tournaments').doc(selectedTournament.id).collection('teams').doc(editItem.id).update(data);
                    setTournamentTeams(prev => prev.map(t => t.id === editItem.id ? { ...t, ...data } : t));
                } else {
                    const ref = db.collection('tournaments').doc(selectedTournament.id).collection('teams').doc();
                    await ref.set({ id: ref.id, ...data });
                    setTournamentTeams(prev => [...prev, { id: ref.id, ...data } as Team]);
                }
            } else if (modalType === 'PLAYER' && selectedTournament?.id && activeTeamId) {
                // Update player in team array
                const team = tournamentTeams.find(t => String(t.id) === activeTeamId);
                if (team) {
                    const newPlayer: Player = {
                        id: editItem.id || Date.now().toString(),
                        name: editItem.name,
                        role: editItem.role || 'All Rounder',
                        category: 'Standard',
                        basePrice: 0,
                        photoUrl: previewImage || editItem.photoUrl || '',
                        nationality: 'India',
                        speciality: editItem.role || 'All Rounder',
                        stats: { matches: 0, runs: 0, wickets: 0 },
                        status: 'SOLD',
                        soldPrice: 0
                    };

                    let updatedPlayers = team.players || [];
                    if (editItem.id) {
                         updatedPlayers = updatedPlayers.map(p => String(p.id) === String(editItem.id) ? newPlayer : p);
                    } else {
                         updatedPlayers = [...updatedPlayers, newPlayer];
                    }

                    await db.collection('tournaments').doc(selectedTournament.id).collection('teams').doc(activeTeamId).update({
                        players: updatedPlayers
                    });
                    setTournamentTeams(prev => prev.map(t => t.id === activeTeamId ? { ...t, players: updatedPlayers } : t));
                }
            }
            closeModal();
        } catch (error) { console.error(error); alert("Save failed"); }
    };

    const handleDelete = async (type: 'TOURNAMENT' | 'TEAM' | 'PLAYER', itemId: string) => {
        if (!window.confirm("Are you sure?")) return;
        try {
            if (type === 'TOURNAMENT') {
                await db.collection('tournaments').doc(itemId).delete();
                setTournaments(prev => prev.filter(t => t.id !== itemId));
                if (selectedTournament?.id === itemId) setSelectedTournament(null);
            } else if (type === 'TEAM' && selectedTournament) {
                await db.collection('tournaments').doc(selectedTournament.id).collection('teams').doc(itemId).delete();
                setTournamentTeams(prev => prev.filter(t => String(t.id) !== itemId));
            } else if (type === 'PLAYER' && selectedTournament && activeTeamId) {
                const team = tournamentTeams.find(t => String(t.id) === activeTeamId);
                if (team) {
                    const updatedPlayers = team.players.filter(p => String(p.id) !== itemId);
                    await db.collection('tournaments').doc(selectedTournament.id).collection('teams').doc(activeTeamId).update({
                        players: updatedPlayers
                    });
                    setTournamentTeams(prev => prev.map(t => t.id === activeTeamId ? { ...t, players: updatedPlayers } : t));
                }
            }
        } catch (e) { alert("Delete failed"); }
    };

    const openModal = (type: 'TOURNAMENT' | 'TEAM' | 'PLAYER', item: any = {}) => {
        setModalType(type);
        setEditItem(item);
        setPreviewImage(item.logoUrl || item.photoUrl || '');
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditItem(null);
        setPreviewImage('');
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const base64 = await compressImage(e.target.files[0]);
            setPreviewImage(base64);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow p-6 min-h-[400px] text-gray-900">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold flex items-center text-gray-800">
                    <Trophy className="w-6 h-6 mr-2 text-yellow-500" /> 
                    {selectedTournament ? selectedTournament.name : 'Tournaments'}
                </h2>
                {selectedTournament ? (
                    <button onClick={() => setSelectedTournament(null)} className="text-sm text-blue-600 underline">Back to List</button>
                ) : (
                    <button onClick={() => openModal('TOURNAMENT', { name: '' })} className="bg-blue-600 text-white px-3 py-1.5 rounded flex items-center text-sm font-bold"><Plus className="w-4 h-4 mr-1"/> New Tournament</button>
                )}
            </div>

            {!selectedTournament ? (
                // LIST TOURNAMENTS
                <div className="grid gap-3">
                    {tournaments.map(t => (
                        <div key={t.id} className="border p-4 rounded-lg flex justify-between items-center hover:bg-gray-50 transition-colors">
                            <div className="cursor-pointer" onClick={() => setSelectedTournament(t)}>
                                <h3 className="font-bold text-lg text-gray-900">{t.name}</h3>
                                <p className="text-xs text-gray-400">ID: {t.id}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => openModal('TOURNAMENT', t)} className="text-blue-500 p-1 hover:bg-blue-50 rounded"><Edit className="w-4 h-4"/></button>
                                <button onClick={() => handleDelete('TOURNAMENT', t.id!)} className="text-red-500 p-1 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4"/></button>
                                <button onClick={() => setSelectedTournament(t)} className="text-gray-400 p-1"><ChevronRight className="w-5 h-5"/></button>
                            </div>
                        </div>
                    ))}
                    {tournaments.length === 0 && !loading && <p className="text-center text-gray-400 py-10 italic">No tournaments found.</p>}
                </div>
            ) : (
                // TEAM MANAGER
                <div>
                     <div className="flex justify-between items-center mb-4 bg-gray-50 p-3 rounded">
                        <h3 className="font-bold text-gray-700">Participating Teams ({tournamentTeams.length})</h3>
                        <button onClick={() => openModal('TEAM', { name: '' })} className="text-green-600 text-xs font-bold border border-green-600 px-2 py-1 rounded hover:bg-green-50 flex items-center"><Plus className="w-3 h-3 mr-1"/> Add Team</button>
                     </div>
                     <div className="space-y-4">
                         {tournamentTeams.map(team => (
                             <div key={team.id} className="border rounded-lg overflow-hidden">
                                 <div 
                                    className="bg-gray-100 p-3 flex justify-between items-center cursor-pointer"
                                    onClick={() => setActiveTeamId(activeTeamId === String(team.id) ? null : String(team.id))}
                                 >
                                     <div className="flex items-center gap-3">
                                         {team.logoUrl ? <img src={team.logoUrl} className="w-8 h-8 rounded-full object-contain"/> : <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center font-bold">{team.name.charAt(0)}</div>}
                                         <span className="font-bold text-gray-800">{team.name}</span>
                                         <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full text-gray-600">{team.players?.length || 0} Players</span>
                                     </div>
                                     <div className="flex items-center gap-2">
                                         <button onClick={(e) => { e.stopPropagation(); openModal('TEAM', team); }} className="text-blue-500 p-1"><Edit className="w-3 h-3"/></button>
                                         <button onClick={(e) => { e.stopPropagation(); handleDelete('TEAM', String(team.id)); }} className="text-red-500 p-1"><Trash2 className="w-3 h-3"/></button>
                                         <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${activeTeamId === String(team.id) ? 'rotate-180' : ''}`}/>
                                     </div>
                                 </div>
                                 
                                 {/* Players List Accordion */}
                                 {activeTeamId === String(team.id) && (
                                     <div className="p-3 bg-white border-t">
                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                             {team.players?.map(p => (
                                                 <div key={p.id} className="flex justify-between items-center text-sm p-2 border rounded hover:bg-gray-50">
                                                     <div className="flex items-center gap-2">
                                                         {p.photoUrl && <img src={p.photoUrl} className="w-6 h-6 rounded-full object-cover"/>}
                                                         <span className="text-gray-900">{p.name} <span className="text-xs text-gray-400">({p.role})</span></span>
                                                     </div>
                                                     <div className="flex gap-1">
                                                         <button onClick={() => openModal('PLAYER', p)} className="text-blue-500 hover:text-blue-700"><Edit className="w-3 h-3"/></button>
                                                         <button onClick={() => handleDelete('PLAYER', String(p.id))} className="text-red-500 hover:text-red-700"><Trash2 className="w-3 h-3"/></button>
                                                     </div>
                                                 </div>
                                             ))}
                                         </div>
                                         <button onClick={() => openModal('PLAYER', { name: '' })} className="w-full mt-3 border border-dashed border-gray-300 rounded p-2 text-center text-sm text-gray-500 hover:bg-gray-50 hover:text-green-600 transition-colors flex items-center justify-center">
                                             <UserPlus className="w-4 h-4 mr-1"/> Add Player to {team.name}
                                         </button>
                                     </div>
                                 )}
                             </div>
                         ))}
                         {tournamentTeams.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No teams added yet.</p>}
                     </div>
                </div>
            )}

            {/* MODAL */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 w-full max-w-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-gray-900">
                                {editItem.id ? 'Edit' : 'Add'} {modalType === 'TOURNAMENT' ? 'Tournament' : modalType === 'TEAM' ? 'Team' : 'Player'}
                            </h3>
                            <button onClick={closeModal}><X className="w-5 h-5 text-gray-500"/></button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Name</label>
                                <input required type="text" className="w-full border rounded p-2 text-gray-900" value={editItem.name} onChange={e => setEditItem({...editItem, name: e.target.value})} />
                            </div>
                            
                            {modalType !== 'TOURNAMENT' && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Image</label>
                                    <div onClick={() => fileInputRef.current?.click()} className="border border-dashed rounded p-3 text-center cursor-pointer hover:bg-gray-50">
                                        {previewImage ? <img src={previewImage} className="h-16 mx-auto object-contain"/> : <div className="text-gray-400 text-xs"><Upload className="w-4 h-4 mx-auto mb-1"/>Upload</div>}
                                    </div>
                                    <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                                </div>
                            )}

                            {modalType === 'PLAYER' && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest text-[10px]">Select Role Identity</label>
                                    <div className="flex flex-wrap gap-2 p-2 bg-gray-50 border rounded-xl">
                                        {['Batsman', 'Bowler', 'All Rounder', 'Wicket Keeper'].map(role => (
                                            <button
                                                key={role}
                                                type="button"
                                                onClick={() => setEditItem({...editItem, role: role})}
                                                className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase transition-all border ${editItem.role === role ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'}`}
                                            >
                                                {role}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-700 shadow">Save</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TournamentManager;