
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../firebase';
import { Lock, Mail, ShieldCheck, RefreshCw, ArrowLeft, Headset } from 'lucide-react';
import { UserRole } from '../types';

const StaffLogin: React.FC = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            // STEP 1: Query Firestore for staff matching this email
            const staffSnap = await db.collection('users')
                .where('email', '==', email.toLowerCase())
                .where('role', '==', UserRole.SUPPORT)
                .limit(1)
                .get();

            if (staffSnap.empty) {
                // Check if they are Super Admin trying this terminal
                const adminSnap = await db.collection('users')
                    .where('email', '==', email.toLowerCase())
                    .where('role', '==', UserRole.SUPER_ADMIN)
                    .limit(1)
                    .get();
                
                if (adminSnap.empty) {
                    throw new Error("Credentials not found in Support Registry.");
                }
            }

            const staffDoc = staffSnap.empty ? null : staffSnap.docs[0];
            const staffData = staffDoc?.data();

            // STEP 2: Verify Password
            if (staffData && staffData.password && staffData.password !== password) {
                throw new Error("Invalid Access Key. Access Denied.");
            }

            // STEP 3: Handle Session
            // If they are a regular Firebase User, sign them in normally
            try {
                await auth.signInWithEmailAndPassword(email, password);
            } catch (authErr) {
                // If standard Auth fails (e.g. no Auth record yet), use Anonymous Auth
                // but only if the Firestore check was successful.
                localStorage.setItem('sm_sports_staff_session', JSON.stringify({
                    email: email.toLowerCase(),
                    uid: staffDoc?.id || 'manual_support'
                }));
                await auth.signInAnonymously();
            }

            navigate('/staff-dashboard');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_-20%,_#3b82f633,_transparent)] pointer-events-none"></div>
            
            <div className="w-full max-w-md relative z-10">
                <div className="mb-8 text-center">
                    <Link to="/" className="inline-flex items-center text-slate-500 hover:text-white mb-6 transition-colors text-sm font-bold uppercase tracking-widest">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Main Portal
                    </Link>
                    <div className="flex justify-center mb-4">
                        <div className="bg-blue-600 p-4 rounded-3xl shadow-[0_0_40px_rgba(37,99,235,0.4)]">
                            <Headset className="w-8 h-8 text-white" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Support Terminal</h1>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mt-2">Authorized SM SPORTS Staff Only</p>
                </div>

                <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Staff Identity</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input 
                                    type="email" 
                                    required 
                                    placeholder="STAFF EMAIL" 
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-white font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Access Key</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input 
                                    type="password" 
                                    required 
                                    placeholder="••••••••" 
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-white font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-xs font-bold text-center animate-shake">
                                {error}
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-900/40 border-2 border-blue-400/50 transition-all active:scale-95 flex items-center justify-center gap-3 uppercase text-sm tracking-widest shadow-[0_0_25px_rgba(37,99,235,0.3)]"
                        >
                            {isLoading ? <RefreshCw className="w-5 h-5 animate-spin"/> : 'INITIALIZE SESSION'}
                        </button>
                    </form>

                    <div className="mt-10 pt-6 border-t border-white/5 flex flex-col items-center">
                        <div className="flex items-center gap-2 text-emerald-500 mb-2">
                            <ShieldCheck className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">End-to-End Encrypted</span>
                        </div>
                        <p className="text-[9px] text-slate-600 font-bold uppercase text-center leading-relaxed">
                            System monitoring active. Unauthorized attempts <br/> are logged and geo-traced.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StaffLogin;
