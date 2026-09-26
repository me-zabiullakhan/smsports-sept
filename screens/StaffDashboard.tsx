
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { SupportTicket, SupportMessage, UserRole } from '../types';
import { useAuction } from '../hooks/useAuction';
import { 
    Headset, LogOut, MessageSquare, Clock, CheckCircle, Search, 
    Send, RefreshCw, ChevronRight, Mail, Monitor, X, ExternalLink
} from 'lucide-react';

const StaffDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { userProfile, joinAuction } = useAuction();
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
    const [messages, setMessages] = useState<SupportMessage[]>([]);
    const [reply, setReply] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [showResolved, setShowResolved] = useState(false);
    const [syncingStatus, setSyncingStatus] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const unsub = db.collection('supportTickets')
            .orderBy('updatedAt', 'desc')
            .onSnapshot(snap => {
                setTickets(snap.docs.map(d => ({ id: d.id, ...d.data() } as SupportTicket)));
                setLoading(false);
            }, (err) => {
                console.error("Support tickets listener failed:", err);
                setLoading(false);
            });
        return () => unsub();
    }, []);

    useEffect(() => {
        if (!activeTicketId) {
            setMessages([]);
            return;
        }
        const unsub = db.collection('supportTickets').doc(activeTicketId).collection('messages')
            .orderBy('timestamp', 'asc')
            .onSnapshot(snap => {
                setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as SupportMessage)));
                setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
            }, (err) => {
                console.error("Messages listener failed:", err);
            });
        return () => unsub();
    }, [activeTicketId]);

    const handleSelectTicket = async (ticket: SupportTicket) => {
        setActiveTicketId(ticket.id);
        if (ticket.status === 'OPEN' && userProfile) {
            try {
                await db.collection('supportTickets').doc(ticket.id).update({
                    status: 'IN_PROGRESS',
                    staffId: userProfile.uid,
                    staffName: userProfile.name || 'Staff',
                    updatedAt: Date.now()
                });
            } catch (err) { console.error(err); }
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanReply = reply.trim();
        if (!cleanReply || !activeTicketId || !userProfile || isSending) return;
        
        const currentTicket = tickets.find(t => t.id === activeTicketId);
        if (!currentTicket || currentTicket.status === 'RESOLVED') return;

        setIsSending(true);
        try {
            await db.collection('supportTickets').doc(activeTicketId).collection('messages').add({
                ticketId: activeTicketId,
                senderId: userProfile.uid,
                senderName: userProfile.name || 'Staff',
                senderRole: UserRole.SUPPORT,
                text: cleanReply,
                timestamp: Date.now()
            });
            
            await db.collection('supportTickets').doc(activeTicketId).update({ 
                updatedAt: Date.now(),
                status: 'IN_PROGRESS' 
            });
            setReply('');
        } catch (err) { alert("Failed to send message."); }
        finally { setIsSending(false); }
    };

    const handleResolve = async (ticketId: string) => {
        if (!ticketId || syncingStatus) return;
        if (window.confirm("CRITICAL: Finalize this ticket? This will move the conversation to archives and notify the user.")) {
            setSyncingStatus(true);
            try {
                // Ensure the document update is awaited
                await db.collection('supportTickets').doc(ticketId).update({ 
                    status: 'RESOLVED', 
                    updatedAt: Date.now() 
                });
                
                // Locally clear and switch views immediately for UX
                if (activeTicketId === ticketId) setActiveTicketId(null);
                setShowResolved(true);
                alert("Ticket status updated to RESOLVED.");
            } catch (err: any) { 
                console.error("Resolve Error:", err);
                alert("Failed to update status. Check connectivity."); 
            } finally {
                setSyncingStatus(false);
            }
        }
    };

    const handleEnterInstance = (auctionId: string) => {
        if (!auctionId) return alert("No auction ID linked to this ticket.");
        if (window.confirm("REMOTE ASSIST: Jump into the user's auction dashboard with Admin Access?")) {
            // STEP 1: Update context
            joinAuction(auctionId);
            // STEP 2: Navigate immediately
            navigate(`/auction/${auctionId}`);
        }
    };

    const filteredTickets = tickets.filter(t => showResolved ? t.status === 'RESOLVED' : t.status !== 'RESOLVED');
    const activeTicket = tickets.find(t => t.id === activeTicketId);

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans">
            <nav className="bg-slate-900 border-b border-white/5 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg"><Headset className="w-6 h-6 text-white" /></div>
                    <div>
                        <h1 className="text-xl font-black uppercase tracking-tighter text-blue-50">Support Hub</h1>
                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.3em] mt-1 opacity-60">Staff Command Terminal</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/')} className="text-slate-400 hover:text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 border border-white/5 rounded-xl transition-all">Portal</button>
                    <button onClick={() => auth.signOut()} className="bg-slate-800 hover:bg-red-600 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5 shadow-xl">Logout</button>
                </div>
            </nav>

            <main className="flex-1 flex overflow-hidden">
                <div className="w-96 border-r border-white/5 flex flex-col bg-slate-900/30">
                    <div className="p-6 border-b border-white/5 space-y-4">
                        <div className="flex items-center justify-between bg-black/20 p-1.5 rounded-2xl border border-white/5">
                            <button onClick={() => { setShowResolved(false); setActiveTicketId(null); }} className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${!showResolved ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Active Queue</button>
                            <button onClick={() => { setShowResolved(true); setActiveTicketId(null); }} className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${showResolved ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Archived</button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                        {filteredTickets.length > 0 ? filteredTickets.map(t => (
                            <div key={t.id} onClick={() => handleSelectTicket(t)} className={`p-5 rounded-[2rem] border-2 cursor-pointer transition-all ${activeTicketId === t.id ? 'bg-blue-600/10 border-blue-600 shadow-xl' : 'bg-slate-900/50 border-white/5 hover:border-white/10'}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-[10px] font-black text-blue-400">TIC-{t.id.split('-').pop()}</span>
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${t.status === 'OPEN' ? 'bg-emerald-500 text-white animate-pulse' : t.status === 'IN_PROGRESS' ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-500'}`}>{t.status}</span>
                                </div>
                                <h3 className="font-black text-sm uppercase leading-tight truncate">{t.subject}</h3>
                                <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase truncate">
                                    <div className="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center text-[8px] text-white">{t.userName.charAt(0)}</div>
                                    {t.userName}
                                </div>
                            </div>
                        )) : (
                            <div className="py-20 text-center opacity-20">
                                <MessageSquare className="w-12 h-12 mx-auto mb-2" />
                                <p className="text-[10px] font-black uppercase tracking-widest">Queue Empty</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-1 flex flex-col relative bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
                    {activeTicket ? (
                        <>
                            <div className="p-6 bg-slate-900/90 backdrop-blur-md border-b border-white/5 flex justify-between items-center z-10 shadow-2xl">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-blue-600 shadow-xl flex items-center justify-center font-black text-white text-xl">{activeTicket.userName.charAt(0)}</div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h2 className="font-black uppercase text-xl leading-none">{activeTicket.userName}</h2>
                                            {activeTicket.status === 'RESOLVED' && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                                        </div>
                                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">{activeTicket.userEmail}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {activeTicket.auctionId && (
                                        <button 
                                            onClick={() => handleEnterInstance(activeTicket.auctionId || '')} 
                                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-xl flex items-center gap-3 transition-all active:scale-95"
                                        >
                                            <ExternalLink className="w-4 h-4" /> ACCESS ACCOUNT
                                        </button>
                                    )}
                                    {activeTicket.status !== 'RESOLVED' && (
                                        <button 
                                            onClick={() => handleResolve(activeTicket.id)} 
                                            disabled={syncingStatus}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-xl flex items-center gap-3 transition-all active:scale-95 disabled:opacity-50"
                                        >
                                            {syncingStatus ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} 
                                            RESOLVE ISSUE
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-10 space-y-6 custom-scrollbar">
                                {messages.map(m => (
                                    <div key={m.id} className={`flex ${m.senderRole === UserRole.SUPPORT ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-md p-6 rounded-[2.5rem] shadow-2xl ${m.senderRole === UserRole.SUPPORT ? 'bg-blue-600 text-white rounded-br-none border border-blue-400/30' : 'bg-slate-800 text-slate-200 rounded-bl-none border border-white/5'}`}>
                                            <p className="text-sm font-medium leading-relaxed">{m.text}</p>
                                            <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center text-[8px] font-black uppercase opacity-40">
                                                <span>{m.senderName}</span>
                                                <span>{new Date(m.timestamp).toLocaleTimeString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <div ref={scrollRef} />
                            </div>
                            <div className={`p-8 bg-slate-900 border-t border-white/5 ${activeTicket.status === 'RESOLVED' ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                                <form onSubmit={handleSendMessage} className="relative max-w-4xl mx-auto">
                                    <input value={reply} onChange={e => setReply(e.target.value)} placeholder="ENTER PROTOCOL RESPONSE..." className="w-full bg-slate-950 border border-slate-800 rounded-[2.5rem] py-6 pl-10 pr-20 text-sm font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-inner" />
                                    <button type="submit" disabled={isSending || !reply.trim()} className="absolute right-4 top-1/2 -translate-y-1/2 bg-blue-600 text-white p-4 rounded-full shadow-2xl transition-all active:scale-90 hover:bg-blue-500 disabled:opacity-50">
                                        {isSending ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-700 opacity-20">
                            <Monitor className="w-40 h-40 mb-6" />
                            <h2 className="text-4xl font-black uppercase tracking-[0.5em]">Terminal Ready</h2>
                            <p className="mt-4 text-xs font-bold uppercase tracking-widest">Select an active ticket to initiate assist protocol</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default StaffDashboard;
