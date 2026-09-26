import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuction } from '../hooks/useAuction';
import { db } from '../firebase';
import { AuctionSetup, ScoreboardTheme, ScoringAsset, PromoCode, SystemPopup, UserRole, UserProfile } from '../types';
import { 
    Users, Gavel, PlayCircle, Shield, Search, RefreshCw, Trash2, Edit, ExternalLink, 
    LogOut, Database, UserCheck, LayoutDashboard, Settings, Image as ImageIcon, 
    Upload, Save, Eye, EyeOff, Layout, XCircle, Plus, CreditCard, CheckCircle, 
    Tag, Clock, Ban, Check, Zap, Server, Activity, AlertTriangle, HardDrive, 
    Calendar, ShieldCheck, Megaphone, Bell, Timer, Infinity as InfinityIcon, 
    MessageSquare, Layers, Newspaper, Headset, UserMinus, UserPlus, Mail, ShieldAlert, Key, Filter, ChevronDown, UserX, Monitor, Fingerprint,
    Type as Shirt
} from 'lucide-react';

import { compressImage } from '../utils';

const SuperAdminDashboard: React.FC = () => {
    const { state, logout, joinAuction } = useAuction();
    const getAutoDeleteRemainingDays = (auction: AuctionSetup) => {
        if (auction.isLifetime) return 'Lifetime (Never deleted)';
        const created = auction.createdAt || Date.now();
        const retentionLimit = state?.defaultRetentionDays || 30;
        const expiryTime = created + retentionLimit * 24 * 60 * 60 * 1000;
        const remainingMs = expiryTime - Date.now();
        const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
        return remainingDays > 0 ? remainingDays : 0;
    };
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'USERS' | 'AUCTIONS' | 'PLANS' | 'COUPONS' | 'POPUP' | 'BROADCAST' | 'SYSTEM' | 'IMAGES'>('DASHBOARD');
    const [auctions, setAuctions] = useState<AuctionSetup[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [auctionStatusFilter, setAuctionStatusFilter] = useState<'ALL' | 'PAID' | 'FREE'>('ALL');
    const [userRoleFilter, setUserRoleFilter] = useState<UserRole | 'ALL'>('ALL');
    const [stats, setStats] = useState({
        totalAuctions: 0, activeAuctions: 0, totalAccounts: 0, totalPlayers: 0, totalMatches: 0, totalTeams: 0, totalDocsEstimate: 0, supportStaffCount: 0
    });

    const totalGB = (stats.totalDocsEstimate * 0.00002).toFixed(2);
    const logoInputRef = useRef<HTMLInputElement>(null);
    const adPosterInputRef = useRef<HTMLInputElement>(null);
    const jerseyInputRef = useRef<HTMLInputElement>(null);
    const jerseyOverlayInputRef = useRef<HTMLInputElement>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Sub-Registry States
    const [userRegistry, setUserRegistry] = useState<UserProfile[]>([]);
    const [editingAuctionId, setEditingAuctionId] = useState<string | null>(null);
    const [auctionEditForm, setAuctionEditForm] = useState<Partial<AuctionSetup>>({});
    const [dbPlans, setDbPlans] = useState<any[]>([]);
    const [planForm, setPlanForm] = useState({ id: '', name: '', price: 0, teams: 0 });
    const [isAddingPlan, setIsAddingPlan] = useState(false);
    const [promos, setPromos] = useState<PromoCode[]>([]);
    const [isAddingPromo, setIsAddingPromo] = useState(false);
    const [promoForm, setPromoForm] = useState<Partial<PromoCode>>({
        code: '', discountType: 'PERCENT', discountValue: 0, maxClaims: 10, expiryDate: Date.now() + 604800000, active: true
    });
    const [isAddingUser, setIsAddingUser] = useState(false);
    const [userForm, setUserForm] = useState<Partial<UserProfile>>({
        email: '', role: UserRole.SUPPORT, plan: { type: 'FREE', maxTeams: 5, maxAuctions: 1 }
    });
    const [popups, setPopups] = useState<SystemPopup[]>([]);
    const [isAddingPopup, setIsAddingPopup] = useState(false);
    const [popupForm, setPopupForm] = useState<Partial<SystemPopup>>({
        title: '', message: '', showImage: false, showText: true, delaySeconds: 5, okButtonText: 'OK', closeButtonText: 'CLOSE', isActive: true, expiryDate: Date.now() + 86400000 * 7
    });
    const [popupPreviewImg, setPopupPreviewImg] = useState('');
    const [retentionDays, setRetentionDays] = useState(30);
    const [globalAssets, setGlobalAssets] = useState<ScoringAsset[]>([]);
    const [broadcasts, setBroadcasts] = useState<any[]>([]);

    useEffect(() => {
        setLoading(true);
        const unsubscribe = db.collection('auctions').onSnapshot(async (snapshot) => {
            const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AuctionSetup));
            data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            setAuctions(data);
            setStats(prev => ({ ...prev, totalAuctions: data.length }));
            setLoading(false);
        }, (err) => {
            console.error("Auctions listener failed:", err);
            setLoading(false);
        });

        const u1 = db.collection('users').onSnapshot(snap => setUserRegistry(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile))), (err) => console.error("Users listener failed:", err));
        const u2 = db.collection('subscriptionPlans').orderBy('price', 'asc').onSnapshot(snap => setDbPlans(snap.docs.map(d => ({ id: d.id, ...d.data() }))), (err) => console.error("Plans listener failed:", err));
        const u3 = db.collection('promoCodes').onSnapshot(snap => setPromos(snap.docs.map(d => ({ id: d.id, ...d.data() } as PromoCode))), (err) => console.error("Promos listener failed:", err));
        const u4 = db.collection('systemPopups').orderBy('createdAt', 'desc').onSnapshot(snap => setPopups(snap.docs.map(d => ({ id: d.id, ...d.data() } as SystemPopup))), (err) => console.error("Popups listener failed:", err));
        const u5 = db.collection('globalAssets').onSnapshot(snap => setGlobalAssets(snap.docs.map(d => ({ id: d.id, ...d.data() } as ScoringAsset))), (err) => console.error("Assets listener failed:", err));
        const u6 = db.collection('systemBroadcasts').onSnapshot(snap => setBroadcasts(snap.docs.map(d => ({ id: d.id, ...d.data() }))), (err) => console.error("Broadcasts listener failed:", err));

        return () => {
            unsubscribe();
            u1(); u2(); u3(); u4(); u5(); u6();
        };
    }, []);

    const handleSaveAuctionMetadata = async () => {
        if (!editingAuctionId) return;
        setIsProcessing(true);
        try {
            await db.collection('auctions').doc(editingAuctionId).update(auctionEditForm);
            setEditingAuctionId(null);
            alert("Auction Metadata Patched!");
        } catch (err: any) { alert("Patch Failed: " + err.message); }
        setIsProcessing(false);
    };

    const handleSavePlan = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);
        try {
            if (planForm.id) await db.collection('subscriptionPlans').doc(planForm.id).update(planForm);
            else await db.collection('subscriptionPlans').add({ ...planForm, createdAt: Date.now() });
            setIsAddingPlan(false);
            setPlanForm({ id: '', name: '', price: 0, teams: 0 });
        } catch (e: any) { alert(e.message); }
        setIsProcessing(false);
    };

    const handleSavePromo = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);
        try {
            await db.collection('promoCodes').add({ 
                ...promoForm, 
                createdAt: Date.now(),
                currentClaims: 0 
            });
            setIsAddingPromo(false);
            setPromoForm({ code: '', discountType: 'PERCENT', discountValue: 0, maxClaims: 10, expiryDate: Date.now() + 604800000, active: true });
        } catch (e: any) { alert(e.message); }
        setIsProcessing(false);
    };

    const handleSaveUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userForm.email) return;
        setIsProcessing(true);
        try {
            // Note: In a real app, you'd use Firebase Admin SDK to create the user account.
            // Here we just add the profile to the users collection.
            // The user will still need to sign up with this email.
            const q = await db.collection('users').where('email', '==', userForm.email).get();
            if (!q.empty) {
                await db.collection('users').doc(q.docs[0].id).update(userForm);
                alert("Identity Updated.");
            } else {
                // Generate a dummy UID if not exists, though normally UID comes from Auth
                const dummyUid = 'manual_' + Math.random().toString(36).substr(2, 9);
                await db.collection('users').doc(dummyUid).set({
                    ...userForm,
                    createdAt: Date.now()
                });
                alert("Identity Created. User must sign in with this email.");
            }
            setIsAddingUser(false);
            setUserForm({ email: '', role: UserRole.SUPPORT, plan: { type: 'FREE', maxTeams: 5, maxAuctions: 1 } });
        } catch (e: any) { alert(e.message); }
        setIsProcessing(false);
    };

    const handleSavePopup = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);
        try {
            await db.collection('systemPopups').add({
                ...popupForm,
                imageUrl: popupPreviewImg,
                createdAt: Date.now()
            });
            setIsAddingPopup(false);
            setPopupForm({ title: '', message: '', showImage: false, showText: true, delaySeconds: 5, okButtonText: 'OK', closeButtonText: 'CLOSE', isActive: true, expiryDate: Date.now() + 86400000 * 7 });
            setPopupPreviewImg('');
        } catch (e: any) { alert(e.message); }
        setIsProcessing(false);
    };

    const handleRemoteAssist = (auctionId: string) => {
        if (window.confirm("REMOTE ASSIST: Access this instance as Admin?")) {
            joinAuction(auctionId);
            navigate(`/auction/${auctionId}`);
        }
    };

    const filteredAuctions = auctions.filter(a => {
        const term = searchTerm.toLowerCase();
        const matchesSearch = (a.title || '').toLowerCase().includes(term) || (a.id || '').toLowerCase().includes(term);
        const matchesStatus = auctionStatusFilter === 'ALL' || 
                             (auctionStatusFilter === 'PAID' && a.isPaid) || 
                             (auctionStatusFilter === 'FREE' && !a.isPaid);
        return matchesSearch && matchesStatus;
    });

    const filteredUsers = userRegistry.filter(u => {
        const term = searchTerm.toLowerCase();
        const matchesSearch = (u.email || '').toLowerCase().includes(term) || (u.uid || '').toLowerCase().includes(term);
        const matchesRole = userRoleFilter === 'ALL' || u.role === userRoleFilter;
        return matchesSearch && matchesRole;
    });

    return (
        <div className="min-h-screen bg-black font-sans text-white selection:bg-red-500">
            <nav className="bg-zinc-950 border-b border-zinc-800/50 sticky top-0 z-50 backdrop-blur-xl">
                <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-4 group cursor-pointer" onClick={() => setActiveTab('DASHBOARD')}>
                        <div className="bg-red-600 p-2.5 rounded-2xl shadow-xl group-hover:rotate-12 transition-all">
                            <Shield className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black tracking-tighter uppercase leading-none">Admin Settings</h1>
                            <p className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.4em] mt-1 opacity-60">Control Center</p>
                        </div>
                    </div>
                    <div className="flex bg-zinc-900 rounded-xl p-1 gap-1 overflow-x-auto no-scrollbar">
                        {[
                            {id: 'DASHBOARD', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4"/>}, 
                            {id: 'USERS', label: 'Users', icon: <Users className="w-4 h-4"/>}, 
                            {id: 'AUCTIONS', label: 'Events', icon: <Gavel className="w-4 h-4"/>}, 
                            {id: 'PLANS', label: 'Plans', icon: <Server className="w-4 h-4"/>}, 
                            {id: 'COUPONS', label: 'Coupons', icon: <Tag className="w-4 h-4"/>}, 
                            {id: 'POPUP', label: 'Alerts', icon: <Megaphone className="w-4 h-4"/>}, 
                            {id: 'BROADCAST', label: 'Ticker', icon: <Newspaper className="w-4 h-4"/>}, 
                            {id: 'SYSTEM', label: 'System', icon: <HardDrive className="w-4 h-4"/>}, 
                            {id: 'IMAGES', label: 'Images', icon: <ImageIcon className="w-4 h-4"/>}
                        ].map(t => (
                            <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === t.id ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}>
                                {t.icon} <span className="hidden lg:inline">{t.label}</span>
                            </button>
                        ))}
                    </div>
                    <button onClick={logout} className="bg-zinc-900 hover:bg-red-600 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center transition-all">
                        <LogOut className="w-4 h-4 mr-2"/> Exit
                    </button>
                </div>
            </nav>

            <main className="container mx-auto px-6 py-10 max-w-7xl">
                {activeTab === 'DASHBOARD' && (
                    <div className="space-y-12 animate-fade-in">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                            {[ { label: 'Storage Usage', val: totalGB, unit: 'GB', color: 'text-red-500' }, { label: 'Live Auctions', val: auctions.length, unit: 'Active', color: 'text-green-500' }, { label: 'Total Users', val: userRegistry.length, unit: 'IDs', color: 'text-blue-500' }, { label: 'Support Staff', val: userRegistry.filter(u => u.role === UserRole.SUPPORT).length, unit: 'Online', color: 'text-white' } ].map(s => (
                                <div key={s.label} className="bg-zinc-900/30 p-10 rounded-[2.5rem] border border-white/5 shadow-inner">
                                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] mb-4">{s.label}</p>
                                    <div className="flex items-baseline gap-2">
                                        <h2 className={`text-5xl font-black ${s.color}`}>{s.val}</h2>
                                        <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{s.unit}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="bg-zinc-900/50 p-10 rounded-[3rem] border border-white/5 shadow-2xl flex flex-col md:flex-row items-center gap-12">
                             <div className="w-48 h-48 rounded-3xl bg-black border-4 border-zinc-800 p-4 shadow-xl flex items-center justify-center overflow-hidden relative">
                                {state.systemLogoUrl ? <img src={state.systemLogoUrl} className="max-w-full max-h-full object-contain" /> : <ImageIcon className="w-12 h-12 text-zinc-800" />}
                             </div>
                             <div className="flex-1 text-center md:text-left">
                                <h2 className="text-4xl font-black uppercase tracking-tighter mb-4">System Branding</h2>
                                <p className="text-zinc-400 text-sm max-w-xl mb-6 font-medium">Global system branding for the app.</p>
                                
                                <div className="space-y-4 mb-8">
                                    <div>
                                        <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">System Tagline</label>
                                        <input 
                                            type="text" 
                                            placeholder="Your streaming partner"
                                            className="w-full bg-black border border-zinc-800 rounded-xl py-3 px-4 text-sm font-bold outline-none focus:border-red-600 transition-all"
                                            value={state.systemTagline || ''}
                                            onChange={async (e) => {
                                                await db.collection('appConfig').doc('globalSettings').set({ systemTagline: e.target.value }, { merge: true });
                                            }}
                                        />
                                    </div>
                                    <button onClick={() => logoInputRef.current?.click()} className="bg-white text-black font-black px-10 py-4 rounded-2xl flex items-center gap-3 transition-all hover:bg-red-600 hover:text-white">
                                        <Upload className="w-5 h-5" /> UPDATE LOGO
                                    </button>
                                </div>
                                <input ref={logoInputRef} type="file" className="hidden" accept="image/*" onChange={async (e) => {
                                    if (e.target.files?.[0]) {
                                        const base64 = await compressImage(e.target.files[0]);
                                        await db.collection('appConfig').doc('globalSettings').set({ systemLogoUrl: base64 }, { merge: true });
                                        alert("Branding Synced.");
                                    }
                                }} />
                             </div>
                        </div>

                        <div className="bg-zinc-900/50 p-10 rounded-[3rem] border border-white/5 shadow-2xl flex flex-col md:flex-row items-center gap-12">
                             <div className="w-48 h-48 rounded-3xl bg-black border-4 border-zinc-800 p-4 shadow-xl flex items-center justify-center overflow-hidden relative">
                                <Activity className={`w-12 h-12 ${state.hideScoringSection ? 'text-zinc-800' : 'text-red-600'}`} />
                             </div>
                             <div className="flex-1 text-center md:text-left">
                                <h2 className="text-4xl font-black uppercase tracking-tighter mb-4">Scoring Module Control</h2>
                                <p className="text-zinc-400 text-sm max-w-xl mb-8 font-medium">Toggle the visibility of the scoring section across the entire platform.</p>
                                <div className="flex items-center gap-4 justify-center md:justify-start">
                                    <button 
                                        onClick={async () => {
                                            await db.collection('appConfig').doc('globalSettings').set({ hideScoringSection: !state.hideScoringSection }, { merge: true });
                                        }} 
                                        className={`font-black px-10 py-4 rounded-2xl flex items-center gap-3 transition-all ${state.hideScoringSection ? 'bg-zinc-800 text-zinc-500' : 'bg-red-600 text-white shadow-[0_0_30px_rgba(220,38,38,0.4)]'}`}
                                    >
                                        {state.hideScoringSection ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        {state.hideScoringSection ? 'SCORING HIDDEN' : 'SCORING VISIBLE'}
                                    </button>
                                </div>
                             </div>
                        </div>
                    </div>
                )}

                {activeTab === 'USERS' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black uppercase tracking-tighter">Registered Users</h2>
                            <button onClick={() => setIsAddingUser(true)} className="bg-blue-600 px-6 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2"><Plus className="w-4 h-4"/> ADD USER</button>
                        </div>
                        
                        <div className="flex flex-col lg:flex-row gap-4 mb-8">
                            <div className="relative flex-1 group">
                                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-red-600 transition-colors" />
                                <input placeholder="SEARCH USERS..." className="w-full bg-zinc-900/50 border border-zinc-800 rounded-[2rem] py-6 pl-16 pr-6 text-sm font-bold uppercase outline-none focus:border-red-600 transition-all shadow-xl" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                            </div>
                            
                            <div className="p-1.5 bg-zinc-900/50 rounded-[2rem] border border-zinc-800 flex gap-1 overflow-x-auto no-scrollbar">
                                {['ALL', UserRole.SUPPORT, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.TEAM_OWNER].map(role => (
                                    <button
                                        key={role}
                                        onClick={() => setUserRoleFilter(role as any)}
                                        className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${userRoleFilter === role ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-zinc-500 hover:text-white'}`}
                                    >
                                        {role === 'ALL' ? 'ALL ROLES' : role}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            {filteredUsers.map(user => (
                                <div key={user.uid} className="bg-zinc-900/30 p-5 rounded-2xl border border-white/5 flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-base">{user.email}</p>
                                        <p className="text-[9px] text-zinc-500 uppercase font-black">{user.role}</p>
                                    </div>
                                    <button onClick={async () => { if(window.confirm("Purge?")) await db.collection('users').doc(user.uid).delete(); }} className="p-3 bg-zinc-800 rounded-xl hover:bg-red-600 transition-all text-zinc-400 hover:text-white"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'AUCTIONS' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex flex-col lg:flex-row gap-4 mb-8">
                            <div className="relative flex-1 group">
                                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-red-600 transition-colors" />
                                <input placeholder="SEARCH AUCTIONS..." className="w-full bg-zinc-900/50 border border-zinc-800 rounded-[2rem] py-6 pl-16 pr-6 text-sm font-bold uppercase outline-none focus:border-red-600 transition-all shadow-xl" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                            </div>

                            <div className="p-1.5 bg-zinc-900/50 rounded-[2rem] border border-zinc-800 flex gap-1">
                                {[
                                    { id: 'ALL', label: 'All', icon: <Database className="w-4 h-4" /> },
                                    { id: 'PAID', label: 'Paid', icon: <CreditCard className="w-4 h-4" /> },
                                    { id: 'FREE', label: 'Free', icon: <Zap className="w-4 h-4" /> }
                                ].map(f => (
                                    <button
                                        key={f.id}
                                        onClick={() => setAuctionStatusFilter(f.id as any)}
                                        className={`px-8 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${auctionStatusFilter === f.id ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-zinc-500 hover:text-white'}`}
                                    >
                                        {f.icon} {f.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4">
                            {filteredAuctions.map(auction => (
                                <div key={auction.id} className="bg-zinc-900/30 p-8 rounded-[2rem] border border-white/5 hover:border-red-600/30 transition-all group overflow-hidden">
                                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                                        <div className="flex items-center gap-6">
                                            <div className="w-16 h-16 rounded-2xl bg-black border border-white/5 flex items-center justify-center overflow-hidden shrink-0">
                                                {auction.logoUrl ? <img src={auction.logoUrl} className="w-full h-full object-contain" /> : <Gavel className="w-6 h-6 text-zinc-700" />}
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-black uppercase tracking-tighter text-white">{auction.title}</h3>
                                                <div className="flex items-center gap-3 mt-1.5">
                                                    <span className="text-[10px] font-black text-red-500 uppercase tracking-widest bg-red-500/10 px-3 py-0.5 rounded-full border border-red-500/20">#{auction.id}</span>
                                                    <span className={`text-[9px] font-black px-3 py-0.5 rounded-full border ${auction.razorpayAuthorized ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-zinc-800 text-zinc-500 border-white/5'}`}>
                                                        {auction.razorpayAuthorized ? 'RAZORPAY AUTH' : 'PAYMENT LOCKED'}
                                                    </span>
                                                    <span className={`text-[9px] font-black px-3 py-0.5 rounded-full border flex items-center gap-1 ${
                                                        typeof getAutoDeleteRemainingDays(auction) === 'number' && (getAutoDeleteRemainingDays(auction) as number) <= 5
                                                            ? 'bg-red-500/10 text-red-500 border-red-500/20 animate-pulse' 
                                                            : 'bg-zinc-800 text-zinc-500 border-white/5'
                                                    }`}>
                                                        <Clock className="w-3 h-3" />
                                                        {typeof getAutoDeleteRemainingDays(auction) === 'number' 
                                                            ? `${getAutoDeleteRemainingDays(auction)} ${getAutoDeleteRemainingDays(auction) === 1 ? 'day' : 'days'} left` 
                                                            : getAutoDeleteRemainingDays(auction)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => { setEditingAuctionId(auction.id!); setAuctionEditForm(auction); }} className="p-4 bg-zinc-800 rounded-2xl hover:bg-zinc-700 transition-all"><Edit className="w-5 h-5 text-zinc-400" /></button>
                                            <button onClick={() => handleRemoteAssist(auction.id!)} className="p-4 bg-blue-600 rounded-2xl hover:bg-blue-500 transition-all"><Monitor className="w-5 h-5 text-white" /></button>
                                            <button onClick={async () => { if(window.confirm("Purge?")) db.collection('auctions').doc(auction.id!).delete(); }} className="p-4 bg-zinc-800 rounded-2xl hover:bg-red-600 transition-all"><Trash2 className="w-5 h-5 text-zinc-400" /></button>
                                        </div>
                                    </div>
                                    {editingAuctionId === auction.id && (
                                        <div className="mt-8 pt-8 border-t border-white/5 grid grid-cols-1 md:grid-cols-4 gap-8 animate-slide-up bg-zinc-950/30 p-6 rounded-3xl">
                                            <div className="col-span-full mb-2 flex items-center gap-2">
                                                <Fingerprint className="w-4 h-4 text-red-500" />
                                                <h4 className="text-xs font-black uppercase tracking-widest text-zinc-300">Advanced Override Panel</h4>
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-2">Integrated Payments (Razorpay)</label>
                                                <div className="flex items-center justify-between bg-black/40 p-4 rounded-2xl border border-white/5">
                                                    <span className="text-[10px] font-bold text-zinc-400">Authorize Integrated Gateway</span>
                                                    <button onClick={() => setAuctionEditForm({...auctionEditForm, razorpayAuthorized: !auctionEditForm.razorpayAuthorized})} className={`w-12 h-6 rounded-full transition-all relative ${auctionEditForm.razorpayAuthorized ? 'bg-indigo-600' : 'bg-zinc-700'}`}>
                                                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${auctionEditForm.razorpayAuthorized ? 'left-7' : 'left-1'}`}></div>
                                                    </button>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2">Retention Lock</label>
                                                <div className="flex items-center justify-between bg-black/40 p-4 rounded-2xl border border-white/5">
                                                    <span className="text-[10px] font-bold text-zinc-400">Lifetime Registry Active</span>
                                                    <button onClick={() => setAuctionEditForm({...auctionEditForm, isLifetime: !auctionEditForm.isLifetime})} className={`w-12 h-6 rounded-full transition-all relative ${auctionEditForm.isLifetime ? 'bg-red-600' : 'bg-zinc-700'}`}>
                                                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${auctionEditForm.isLifetime ? 'left-7' : 'left-1'}`}></div>
                                                    </button>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-2">Subscription Access</label>
                                                <div className="flex items-center justify-between bg-black/40 p-4 rounded-2xl border border-white/5">
                                                    <span className="text-[10px] font-bold text-zinc-400">Manual Paid Activation</span>
                                                    <button onClick={() => setAuctionEditForm({...auctionEditForm, isPaid: !auctionEditForm.isPaid})} className={`w-12 h-6 rounded-full transition-all relative ${auctionEditForm.isPaid ? 'bg-emerald-600' : 'bg-zinc-700'}`}>
                                                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${auctionEditForm.isPaid ? 'left-7' : 'left-1'}`}></div>
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex items-end col-start-4">
                                                <button onClick={handleSaveAuctionMetadata} className="w-full bg-white text-black font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest shadow-xl transition-all active:scale-95">SYNC OVERRIDE</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'PLANS' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black uppercase tracking-tighter">Pricing Plans</h2>
                            <button onClick={() => setIsAddingPlan(true)} className="bg-blue-600 px-6 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2"><Plus className="w-4 h-4"/> NEW PLAN</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {dbPlans.map(plan => (
                                <div key={plan.id} className="bg-zinc-900/30 p-8 rounded-[2rem] border border-white/5 relative group">
                                    <button onClick={async () => { if(window.confirm("Delete?")) db.collection('subscriptionPlans').doc(plan.id).delete(); }} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-red-500"><Trash2 className="w-4 h-4"/></button>
                                    <h3 className="text-xl font-black uppercase mb-4">{plan.name}</h3>
                                    <p className="text-4xl font-black text-blue-500 mb-6">₹{plan.price}</p>
                                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 font-mono tracking-widest"><Users className="w-4 h-4"/> UPTO {plan.teams} FRANCHISES</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'COUPONS' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black uppercase tracking-tighter">Discount Codes</h2>
                            <button onClick={() => setIsAddingPromo(true)} className="bg-blue-600 px-6 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2"><Plus className="w-4 h-4"/> NEW PROMO</button>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            {promos.map(promo => (
                                <div key={promo.id} className="bg-zinc-900/30 p-6 rounded-2xl border border-white/5 flex justify-between items-center group">
                                    <div>
                                        <p className="font-black text-2xl tracking-widest text-emerald-400 italic">{promo.code}</p>
                                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{promo.discountType}: {promo.discountValue}</p>
                                    </div>
                                    <div className="text-right flex items-center gap-6">
                                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest font-mono">{promo.currentClaims} / {promo.maxClaims} CLAIMS</p>
                                        <button onClick={async () => { if(window.confirm("Purge?")) db.collection('promoCodes').doc(promo.id!).delete(); }} className="p-3 bg-zinc-800 rounded-xl hover:bg-red-600 transition-all"><Trash2 className="w-4 h-4"/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'POPUP' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black uppercase tracking-tighter">System Popups</h2>
                            <button onClick={() => setIsAddingPopup(true)} className="bg-blue-600 px-6 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2"><Plus className="w-4 h-4"/> NEW ALERT</button>
                        </div>
                        <div className="grid grid-cols-1 gap-6">
                            {popups.map(popup => (
                                <div key={popup.id} className="bg-zinc-900/30 p-8 rounded-[2.5rem] border border-white/5 flex flex-col md:flex-row gap-8 items-center group relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
                                    {popup.imageUrl && <div className="w-40 h-40 bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/5"><img src={popup.imageUrl} className="w-full h-full object-cover" /></div>}
                                    <div className="flex-1">
                                        <h3 className="text-xl font-black uppercase mb-2 tracking-tight">{popup.title}</h3>
                                        <p className="text-sm text-zinc-500 line-clamp-3 font-medium">{popup.message}</p>
                                    </div>
                                    <button onClick={async () => { if(window.confirm("Purge?")) db.collection('systemPopups').doc(popup.id!).delete(); }} className="p-4 bg-zinc-800 rounded-2xl hover:bg-red-600 transition-all"><Trash2 className="w-5 h-5"/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'BROADCAST' && (
                    <div className="space-y-6 animate-fade-in">
                        <h2 className="text-2xl font-black uppercase tracking-tighter">News Ticker</h2>
                        <div className="bg-zinc-900/30 p-10 rounded-[3rem] border border-white/5">
                            <div className="space-y-4">
                                {broadcasts.map(b => (
                                    <div key={b.id} className="bg-black/40 p-4 rounded-2xl border border-white/5 flex justify-between items-center">
                                        <p className="text-sm font-bold uppercase tracking-widest text-zinc-300">{b.message}</p>
                                        <button onClick={async () => db.collection('systemBroadcasts').doc(b.id).delete()} className="text-red-500 hover:scale-125 transition-all"><XCircle className="w-5 h-5"/></button>
                                    </div>
                                ))}
                                <div className="pt-6 flex gap-4">
                                    <input id="ticker-msg" placeholder="ENTER GLOBAL ANNOUNCEMENT..." className="flex-1 bg-black border border-white/10 rounded-2xl px-6 py-4 text-xs font-bold outline-none focus:border-red-600 transition-all uppercase tracking-widest" />
                                    <button onClick={async () => {
                                        const msg = (document.getElementById('ticker-msg') as HTMLInputElement).value;
                                        if(msg) { await db.collection('systemBroadcasts').add({ message: msg, createdAt: Date.now() }); (document.getElementById('ticker-msg') as HTMLInputElement).value = ''; }
                                    }} className="bg-blue-600 px-10 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">DEPLOY</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'SYSTEM' && (
                    <div className="space-y-8 animate-fade-in">
                        <div className="bg-zinc-900/30 p-10 rounded-[3rem] border border-white/5">
                            <div className="flex items-center gap-6 mb-8">
                                <HardDrive className="w-12 h-12 text-red-500" />
                                <div>
                                    <h2 className="text-3xl font-black uppercase tracking-tighter">Data Auto-Cleanup</h2>
                                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.4em] mt-1 opacity-60">Global cleanup settings</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                <div className="space-y-6">
                                    <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest">Auto Cleanup (Days)</label>
                                    <div className="flex items-center gap-4">
                                        <input type="number" value={retentionDays} onChange={e => setRetentionDays(Number(e.target.value))} className="w-24 bg-black border border-white/10 rounded-2xl py-4 text-center text-xl font-black text-red-500" />
                                        <button onClick={async () => { await db.collection('appConfig').doc('globalSettings').set({ defaultRetentionDays: retentionDays }, { merge: true }); alert("Cleanup Policy Updated."); }} className="bg-white text-black px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-2xl">SAVE SETTINGS</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'IMAGES' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
                            <div>
                                <h2 className="text-2xl font-black uppercase tracking-tighter">Global Media Assets</h2>
                                <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">Manage platform-wide images and designs</p>
                            </div>
                            <div className="flex flex-wrap gap-4">
                                <button
                                    onClick={async () => {
                                        const newValue = !state.isAdPosterEnabled;
                                        await db.collection('appConfig').doc('globalSettings').set({ isAdPosterEnabled: newValue }, { merge: true });
                                    }}
                                    className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-xl transition-all ${state.isAdPosterEnabled ? 'bg-green-600 text-white' : 'bg-zinc-800 text-zinc-500'}`}
                                >
                                    {state.isAdPosterEnabled ? <Eye className="w-4 h-4"/> : <EyeOff className="w-4 h-4"/>}
                                    {state.isAdPosterEnabled ? 'POSTER ON' : 'POSTER OFF'}
                                </button>
                                <button onClick={() => adPosterInputRef.current?.click()} className="bg-red-600 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-xl hover:bg-white hover:text-black transition-all">
                                    <ImageIcon className="w-4 h-4"/> UPLOAD POSTER
                                </button>
                                <button onClick={() => jerseyInputRef.current?.click()} className="bg-emerald-600 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-xl hover:bg-white hover:text-black transition-all">
                                    <Shirt className="w-4 h-4"/> PLAIN JERSEY
                                </button>
                                <button onClick={() => jerseyOverlayInputRef.current?.click()} className="bg-indigo-600 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-xl hover:bg-white hover:text-black transition-all">
                                    <ImageIcon className="w-4 h-4"/> JERSEY DESIGN
                                </button>
                                <button onClick={() => document.getElementById('asset-up')?.click()} className="bg-white text-black px-8 py-3 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-xl hover:bg-red-600 hover:text-white transition-all">
                                    <Upload className="w-4 h-4"/> UPLOAD IMAGE
                                </button>
                            </div>
                        </div>

                        {/* Previews for Global Images */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                            <div className="bg-zinc-900/50 p-6 rounded-[2rem] border border-white/5 space-y-4">
                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Global Ad Poster</p>
                                <div className="aspect-[4/5] bg-black rounded-2xl border border-white/5 overflow-hidden flex items-center justify-center relative group">
                                    {state.successAdPosterUrl ? (
                                        <>
                                            <img src={state.successAdPosterUrl} referrerPolicy="no-referrer" className="w-full h-full object-contain" alt="Poster" />
                                            <button 
                                                onClick={async () => { if(window.confirm("Remove Poster?")) await db.collection('appConfig').doc('globalSettings').update({ successAdPosterUrl: '' }); }}
                                                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-red-500"
                                            >
                                                <Trash2 className="w-8 h-8" />
                                            </button>
                                        </>
                                    ) : (
                                        <div className="text-zinc-800 flex flex-col items-center">
                                            <ImageIcon className="w-12 h-12 mb-2" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">No Poster</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="bg-zinc-900/50 p-6 rounded-[2rem] border border-white/5 space-y-4">
                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Universal Plain Jersey</p>
                                <div className="aspect-[4/5] bg-black rounded-2xl border border-white/5 overflow-hidden flex items-center justify-center relative group">
                                    {state.globalJerseyUrl ? (
                                        <>
                                            <img src={state.globalJerseyUrl} referrerPolicy="no-referrer" className="w-full h-full object-contain" alt="Jersey" />
                                            <button 
                                                onClick={async () => { if(window.confirm("Remove Jersey?")) await db.collection('appConfig').doc('globalSettings').update({ globalJerseyUrl: '' }); }}
                                                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-red-500"
                                            >
                                                <Trash2 className="w-8 h-8" />
                                            </button>
                                        </>
                                    ) : (
                                        <div className="text-zinc-800 flex flex-col items-center">
                                            <Shirt className="w-12 h-12 mb-2" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">No Base Jersey</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="bg-zinc-900/50 p-6 rounded-[2rem] border border-white/5 space-y-4">
                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Global Jersey Design (Overlay)</p>
                                <div className="aspect-[4/5] bg-black rounded-2xl border border-white/5 overflow-hidden flex items-center justify-center relative group">
                                    {state.globalJerseyOverlayUrl ? (
                                        <>
                                            <img src={state.globalJerseyOverlayUrl} referrerPolicy="no-referrer" className="w-full h-full object-contain" alt="Overlay" />
                                            <button 
                                                onClick={async () => { if(window.confirm("Remove Overlay?")) await db.collection('appConfig').doc('globalSettings').update({ globalJerseyOverlayUrl: '' }); }}
                                                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-red-500"
                                            >
                                                <Trash2 className="w-8 h-8" />
                                            </button>
                                        </>
                                    ) : (
                                        <div className="text-zinc-800 flex flex-col items-center">
                                            <Layers className="w-12 h-12 mb-2" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">No Overlay</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="pt-8 border-t border-white/5">
                            <h3 className="text-sm font-black uppercase tracking-[0.3em] text-zinc-500 mb-6">General Assets Gallery</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {globalAssets.map(asset => (
                                <div key={asset.id} className="aspect-video bg-zinc-900 rounded-2xl border border-white/5 overflow-hidden group relative shadow-2xl">
                                    <img src={asset.url} referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button onClick={async () => db.collection('globalAssets').doc(asset.id).delete()} className="bg-red-600 p-3 rounded-full shadow-xl hover:scale-110 transition-transform"><Trash2 className="w-5 h-5"/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <input type="file" ref={adPosterInputRef} className="hidden" accept="image/*" onChange={async (e) => {
                            if(e.target.files?.[0]) {
                                setIsProcessing(true);
                                try {
                                    const img = await compressImage(e.target.files[0]);
                                    await db.collection('appConfig').doc('globalSettings').set({ successAdPosterUrl: img }, { merge: true });
                                    alert("Add Poster Updated!");
                                } catch (err) {
                                    console.error(err);
                                } finally {
                                    setIsProcessing(false);
                                }
                            }
                        }} />
                        <input type="file" ref={jerseyInputRef} className="hidden" accept="image/*" onChange={async (e) => {
                            if(e.target.files?.[0]) {
                                setIsProcessing(true);
                                try {
                                    const img = await compressImage(e.target.files[0]);
                                    await db.collection('appConfig').doc('globalSettings').set({ globalJerseyUrl: img }, { merge: true });
                                    alert("Plain Jersey Image Updated!");
                                } catch (err) {
                                    console.error(err);
                                } finally {
                                    setIsProcessing(false);
                                }
                            }
                        }} />
                        <input type="file" ref={jerseyOverlayInputRef} className="hidden" accept="image/*" onChange={async (e) => {
                            if(e.target.files?.[0]) {
                                setIsProcessing(true);
                                try {
                                    const img = await compressImage(e.target.files[0]);
                                    await db.collection('appConfig').doc('globalSettings').set({ globalJerseyOverlayUrl: img }, { merge: true });
                                    alert("Jersey Overlay Image Updated!");
                                } catch (err) {
                                    console.error(err);
                                } finally {
                                    setIsProcessing(false);
                                }
                            }
                        }} />
                        <input type="file" id="asset-up" className="hidden" accept="image/*" onChange={async (e) => {
                            if(e.target.files?.[0]) {
                                const img = await compressImage(e.target.files[0]);
                                await db.collection('globalAssets').add({ url: img, name: 'Image ' + Date.now(), createdAt: Date.now(), type: 'BACKGROUND' });
                            }
                        }} />
                    </div>
                </div>
                )}
            </main>

            {/* MODALS */}
            {isAddingPlan && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
                    <div className="bg-zinc-900 p-10 rounded-[3rem] border border-white/10 w-full max-w-md shadow-[0_0_100px_rgba(37,99,235,0.2)]">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-black uppercase tracking-tighter italic">Create New Plan</h3>
                            <button onClick={() => setIsAddingPlan(false)}><XCircle className="w-8 h-8 text-zinc-700 hover:text-white transition-colors"/></button>
                        </div>
                        <form onSubmit={handleSavePlan} className="space-y-6">
                            <input placeholder="PLAN NAME" className="w-full bg-black border border-white/10 rounded-2xl py-4 px-6 text-xs font-bold uppercase tracking-widest outline-none focus:border-blue-600" value={planForm.name} onChange={e => setPlanForm({...planForm, name: e.target.value})} required />
                            <input type="number" placeholder="PRICE (₹)" className="w-full bg-black border border-white/10 rounded-2xl py-4 px-6 text-xs font-bold outline-none focus:border-blue-600" value={planForm.price} onChange={e => setPlanForm({...planForm, price: Number(e.target.value)})} required />
                            <input type="number" placeholder="MAX TEAMS" className="w-full bg-black border border-white/10 rounded-2xl py-4 px-6 text-xs font-bold outline-none focus:border-blue-600" value={planForm.teams} onChange={e => setPlanForm({...planForm, teams: Number(e.target.value)})} required />
                            <button type="submit" disabled={isProcessing} className="w-full bg-blue-600 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl transition-all active:scale-95 disabled:opacity-50">SAVE PLAN</button>
                        </form>
                    </div>
                </div>
            )}

            {isAddingPromo && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
                    <div className="bg-zinc-900 p-10 rounded-[3rem] border border-white/10 w-full max-w-md shadow-[0_0_100px_rgba(16,185,129,0.2)]">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-black uppercase tracking-tighter italic">Promo Protocol</h3>
                            <button onClick={() => setIsAddingPromo(false)}><XCircle className="w-8 h-8 text-zinc-700 hover:text-white transition-colors"/></button>
                        </div>
                        <form onSubmit={handleSavePromo} className="space-y-6">
                            <input placeholder="PROMO CODE" className="w-full bg-black border border-white/10 rounded-2xl py-4 px-6 text-xs font-bold uppercase tracking-widest outline-none focus:border-emerald-600" value={promoForm.code} onChange={e => setPromoForm({...promoForm, code: e.target.value.toUpperCase()})} required />
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex bg-black border border-white/10 rounded-2xl p-1">
                                    {['PERCENT', 'FLAT'].map(type => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setPromoForm({...promoForm, discountType: type as any})}
                                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${promoForm.discountType === type ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-zinc-500 hover:text-zinc-300'}`}
                                        >
                                            {type === 'PERCENT' ? 'PERCENT' : 'FLAT'}
                                        </button>
                                    ))}
                                </div>
                                <input type="number" placeholder="VALUE" className="w-full bg-black border border-white/10 rounded-2xl py-4 px-6 text-xs font-bold outline-none focus:border-emerald-600" value={promoForm.discountValue} onChange={e => setPromoForm({...promoForm, discountValue: Number(e.target.value)})} required />
                            </div>
                            <input type="number" placeholder="MAX CLAIMS" className="w-full bg-black border border-white/10 rounded-2xl py-4 px-6 text-xs font-bold outline-none focus:border-emerald-600" value={promoForm.maxClaims} onChange={e => setPromoForm({...promoForm, maxClaims: Number(e.target.value)})} required />
                            <button type="submit" disabled={isProcessing} className="w-full bg-emerald-600 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl transition-all active:scale-95 disabled:opacity-50">GENERATE PROMO</button>
                        </form>
                    </div>
                </div>
            )}

            {isAddingUser && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
                    <div className="bg-zinc-900 p-10 rounded-[3rem] border border-white/10 w-full max-w-md shadow-[0_0_100px_rgba(239,68,68,0.2)]">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-black uppercase tracking-tighter italic">Add New User</h3>
                            <button onClick={() => setIsAddingUser(false)}><XCircle className="w-8 h-8 text-zinc-700 hover:text-white transition-colors"/></button>
                        </div>
                        <form onSubmit={handleSaveUser} className="space-y-6">
                            <input type="email" placeholder="USER EMAIL" className="w-full bg-black border border-white/10 rounded-2xl py-4 px-6 text-xs font-bold outline-none focus:border-red-600" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} required />
                            
                            <div className="space-y-3">
                                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Assign Role</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: UserRole.SUPPORT, label: 'SUPPORT' },
                                        { id: UserRole.ADMIN, label: 'ADMIN' },
                                        { id: UserRole.SUPER_ADMIN, label: 'S-ADMIN' },
                                        { id: UserRole.TEAM_OWNER, label: 'OWNER' }
                                    ].map(r => (
                                        <button
                                            key={r.id}
                                            type="button"
                                            onClick={() => setUserForm({...userForm, role: r.id})}
                                            className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${userForm.role === r.id ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-600/20' : 'bg-black border-white/10 text-zinc-500 hover:border-white/20'}`}
                                        >
                                            {r.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Select Access Plan</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: 'FREE', label: 'FREE' },
                                        { id: 'BASIC', label: 'BASIC' },
                                        { id: 'PREMIUM', label: 'PREM' }
                                    ].map(p => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => {
                                                let plan: any = { type: 'FREE', maxTeams: 5, maxAuctions: 1 };
                                                if (p.id === 'BASIC') plan = { type: 'BASIC', maxTeams: 15, maxAuctions: 5 };
                                                if (p.id === 'PREMIUM') plan = { type: 'PREMIUM', maxTeams: 50, maxAuctions: 20 };
                                                setUserForm({...userForm, plan});
                                            }}
                                            className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${userForm.plan?.type === p.id ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-600/20' : 'bg-black border-white/10 text-zinc-500 hover:border-white/20'}`}
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button type="submit" disabled={isProcessing} className="w-full bg-red-600 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl transition-all active:scale-95 disabled:opacity-50">FINISH ADDING USER</button>
                        </form>
                    </div>
                </div>
            )}

            {isAddingPopup && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
                    <div className="bg-zinc-900 p-10 rounded-[3rem] border border-white/10 w-full max-w-lg shadow-[0_0_100px_rgba(59,130,246,0.2)]">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-black uppercase tracking-tighter italic">Alert Deployment</h3>
                            <button onClick={() => setIsAddingPopup(false)}><XCircle className="w-8 h-8 text-zinc-700 hover:text-white transition-colors"/></button>
                        </div>
                        <form onSubmit={handleSavePopup} className="space-y-6">
                            <input placeholder="ALERT TITLE" className="w-full bg-black border border-white/10 rounded-2xl py-4 px-6 text-xs font-bold uppercase tracking-widest outline-none focus:border-blue-600" value={popupForm.title} onChange={e => setPopupForm({...popupForm, title: e.target.value})} required />
                            <textarea placeholder="ALERT MESSAGE" className="w-full bg-black border border-white/10 rounded-2xl py-4 px-6 text-xs font-bold outline-none focus:border-blue-600 min-h-[100px]" value={popupForm.message} onChange={e => setPopupForm({...popupForm, message: e.target.value})} required />
                            <div className="flex items-center gap-4">
                                <button type="button" onClick={() => document.getElementById('popup-img')?.click()} className="flex-1 bg-zinc-800 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                                    <Upload className="w-4 h-4"/> {popupPreviewImg ? 'IMAGE LOADED' : 'ATTACH IMAGE'}
                                </button>
                                <input type="file" id="popup-img" className="hidden" accept="image/*" onChange={async (e) => {
                                    if(e.target.files?.[0]) {
                                        const base64 = await compressImage(e.target.files[0]);
                                        setPopupPreviewImg(base64);
                                        setPopupForm({...popupForm, showImage: true});
                                    }
                                }} />
                            </div>
                            <button type="submit" disabled={isProcessing} className="w-full bg-blue-600 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl transition-all active:scale-95 disabled:opacity-50">DEPLOY ALERT</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SuperAdminDashboard;
