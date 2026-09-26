import React from 'react';
import { useNavigate } from 'react-router-dom';
// Added Wallet to the imports from lucide-react
import { ArrowLeft, Settings, Layers, UserPlus, Zap, Monitor, Gavel, ShieldCheck, QrCode, TrendingUp, Trophy, LayoutList, Share2, ClipboardList, Wallet } from 'lucide-react';

const PlatformGuide: React.FC = () => {
    const navigate = useNavigate();

    const SectionHeader = ({ title, icon, color }: { title: string, icon: React.ReactNode, color: string }) => (
        <div className="flex items-center gap-4 mb-8">
            <div className={`${color} p-4 rounded-2xl shadow-xl text-white`}>
                {icon}
            </div>
            <h2 className="text-3xl font-black uppercase tracking-tighter text-gray-800">{title}</h2>
        </div>
    );

    const FeatureCard = ({ title, description, icon }: { title: string, description: string, icon: React.ReactNode }) => (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
            <div className="text-blue-600 mb-4 group-hover:scale-110 transition-transform">{icon}</div>
            <h4 className="text-sm font-bold text-gray-800 mb-2 uppercase tracking-wide">{title}</h4>
            <p className="text-xs text-gray-500 leading-relaxed font-medium">{description}</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#f8f9fa] font-sans text-gray-900 pb-20">
            {/* Nav */}
            <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
                <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                            <ArrowLeft className="w-5 h-5 text-gray-500" />
                        </button>
                        <h1 className="text-sm font-black uppercase tracking-[0.2em] text-gray-700">Operational Manual</h1>
                    </div>
                    <button 
                        onClick={() => navigate('/auth')}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-black py-2 px-6 rounded-xl text-[10px] uppercase tracking-widest shadow-lg shadow-blue-900/20"
                    >
                        Access Terminal
                    </button>
                </div>
            </nav>

            <header className="bg-gradient-to-b from-white to-transparent py-16 text-center">
                <div className="container mx-auto px-6 max-w-4xl">
                    <div className="inline-block bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 border border-blue-100 shadow-sm">
                        Documentation Alpha v2.5
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black text-gray-900 tracking-tighter mb-6">Master the <span className="text-blue-600 italic">Manage</span> Section</h1>
                    <p className="text-lg text-gray-500 font-medium leading-relaxed max-w-2xl mx-auto">
                        Learn how to configure your tournament identity, handle real-time biddings, and deploy public registration protocols with secure integrated payments.
                    </p>
                </div>
            </header>

            <main className="container mx-auto px-6 max-w-5xl space-y-24">
                
                {/* Section 1: Auction Config */}
                <section className="animate-fade-in">
                    <SectionHeader title="Auction Configuration" icon={<Settings className="w-8 h-8"/>} color="bg-blue-600" />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                        <div className="space-y-6">
                            <p className="text-gray-600 font-medium leading-relaxed">
                                Establish the core parameters of your event. From visual branding to default pricing rules, this section determines the logic of your auction room.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FeatureCard 
                                    title="System Branding" 
                                    description="Upload custom logos that automatically render across all spectator views and OBS overlays." 
                                    icon={<Trophy className="w-5 h-5"/>} 
                                />
                                <FeatureCard 
                                    title="Global Increment" 
                                    description="Set a default bid step or create custom 'Slabs' for automated price increases." 
                                    icon={<TrendingUp className="w-5 h-5"/>} 
                                />
                                <FeatureCard 
                                    title="Purse Registry" 
                                    description="Define starting budgets and squad limits for all participating franchise teams." 
                                    icon={<Wallet className="w-5 h-5"/>} 
                                />
                                <FeatureCard 
                                    title="Sport Selection" 
                                    description="Switch between Cricket, Football, or Kabaddi presets for optimized stat tracking." 
                                    icon={<LayoutList className="w-5 h-5"/>} 
                                />
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-3xl shadow-2xl border border-gray-100 relative group overflow-hidden">
                            <div className="absolute inset-0 bg-blue-600 opacity-0 group-hover:opacity-5 transition-opacity"></div>
                            <img 
                                src="https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=2000&auto=format&fit=crop" 
                                className="rounded-2xl w-full h-[300px] object-cover" 
                                alt="Config Visualization" 
                            />
                            <div className="p-4 mt-2">
                                <div className="flex items-center gap-2 text-[10px] font-black text-blue-500 uppercase tracking-widest">
                                    <Zap className="w-3 h-3"/> Advanced Logic Active
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Section 2: Auction Sets */}
                <section className="animate-fade-in">
                    <SectionHeader title="Category Management" icon={<Layers className="w-8 h-8"/>} color="bg-indigo-600" />
                    
                    <div className="bg-white rounded-[2.5rem] border border-gray-200 shadow-xl overflow-hidden">
                        <div className="p-10 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
                            <div className="max-w-md">
                                <h3 className="text-xl font-black uppercase text-gray-800 mb-2">Dynamic Sets (Auction Sets)</h3>
                                <p className="text-xs text-gray-500 font-bold leading-relaxed">
                                    Organize players into pools (e.g., Marquee, Uncapped, Overseas). Each category can have independent base prices and squad-per-team limits.
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <span className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest">Auto-Registry</span>
                                <span className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest">Bidding Slabs</span>
                            </div>
                        </div>
                        <div className="p-8 bg-gray-50/50">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {[
                                    { step: "01", title: "Set Definition", desc: "Create sets with unique names and starting unit values." },
                                    { step: "02", title: "Logic Rules", desc: "Define how many players of this set a single team can purchase." },
                                    { step: "03", title: "Bid Control", desc: "Assign category-specific bid increments for high-value lots." }
                                ].map(step => (
                                    <div key={step.step} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
                                        <span className="absolute top-[-10px] right-[-10px] text-5xl font-black text-gray-50">{step.step}</span>
                                        <h4 className="text-sm font-black text-indigo-600 uppercase mb-2 relative z-10">{step.title}</h4>
                                        <p className="text-xs text-gray-500 font-medium leading-relaxed relative z-10">{step.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Section 3: Registration */}
                <section className="animate-fade-in">
                    <SectionHeader title="Public Registration" icon={<UserPlus className="w-8 h-8"/>} color="bg-emerald-600" />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div className="space-y-8">
                            <div className="bg-emerald-50/50 border border-emerald-100 p-8 rounded-3xl">
                                <h3 className="text-emerald-700 font-black uppercase text-sm mb-4 flex items-center gap-2">
                                    <ShieldCheck className="w-5 h-5"/> Secure Deployment Protocol
                                </h3>
                                <p className="text-xs text-emerald-600 font-medium leading-relaxed mb-6">
                                    Our platform generates unique public links for your tournament. Players can self-register, upload identity proof, and pay registration fees via UPI or Integrated Gateway.
                                </p>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-emerald-100 shadow-sm">
                                        <QrCode className="w-4 h-4 text-emerald-500" />
                                        <span className="text-[10px] font-black text-gray-700 uppercase">Integrated UPI / QR Verification</span>
                                    </div>
                                    <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-emerald-100 shadow-sm">
                                        <ClipboardList className="w-4 h-4 text-emerald-500" />
                                        <span className="text-[10px] font-black text-gray-700 uppercase">Custom Dynamic Form Fields</span>
                                    </div>
                                    <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-emerald-100 shadow-sm">
                                        <Share2 className="w-4 h-4 text-emerald-500" />
                                        <span className="text-[10px] font-black text-gray-700 uppercase">Public Link & One-Click Toggle</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
                             <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl"></div>
                             <div className="relative z-10">
                                 <h3 className="text-xl font-black uppercase tracking-tight mb-4">Verification Logic</h3>
                                 <ul className="space-y-4">
                                     <li className="flex gap-4 items-start">
                                         <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">1</div>
                                         <p className="text-xs text-slate-300 leading-relaxed"><b className="text-white uppercase tracking-widest text-[9px] block mb-1">Queue Management</b> All registrations land in a "Request" queue for admin approval before entering the auction pool.</p>
                                     </li>
                                     <li className="flex gap-4 items-start">
                                         <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">2</div>
                                         <p className="text-xs text-slate-300 leading-relaxed"><b className="text-white uppercase tracking-widest text-[9px] block mb-1">Payment Guard</b> If Razorpay is enabled, form data is only persistent AFTER the payment signature is verified.</p>
                                     </li>
                                     <li className="flex gap-4 items-start">
                                         <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">3</div>
                                         <p className="text-xs text-slate-300 leading-relaxed"><b className="text-white uppercase tracking-widest text-[9px] block mb-1">Legal Compliance</b> Define custom terms and conditions line-by-line that players MUST accept to register.</p>
                                     </li>
                                 </ul>
                             </div>
                        </div>
                    </div>
                </section>

                <div className="pt-12 border-t border-gray-200 text-center">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.5em] mb-10">End of Feature Overview</p>
                    <button 
                        onClick={() => navigate('/')}
                        className="bg-white border border-gray-200 hover:border-blue-600 hover:text-blue-600 text-gray-600 font-black px-12 py-5 rounded-2xl shadow-xl transition-all active:scale-95 text-sm uppercase tracking-widest"
                    >
                        Return to Dashboard Home
                    </button>
                </div>
            </main>

            <footer className="mt-20 py-10 bg-white border-t border-gray-100 text-center">
                <div className="w-12 h-12 bg-blue-600 text-white font-black flex items-center justify-center rounded-xl mx-auto mb-4 text-xs shadow-lg">SM</div>
                <p className="font-black text-gray-800 uppercase tracking-widest text-xs">SM SPORTS CORE</p>
                <p className="text-gray-400 text-[10px] mt-2 font-bold uppercase tracking-widest tracking-[0.3em]">Operational Protocol Documentation &copy; 2026</p>
            </footer>
        </div>
    );
};

export default PlatformGuide;