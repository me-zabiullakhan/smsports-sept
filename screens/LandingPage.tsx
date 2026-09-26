
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuction } from '../hooks/useAuction';
import { AuctionSetup, UserRole } from '../types';
import { Play, Calendar, History, Trophy, Users, BookOpen, CheckCircle, Scale, CreditCard, ShieldCheck, FileText, Zap, Star, Monitor, MessageSquare, Smartphone, Layout, Youtube, ChevronRight, UserPlus, Sun, Moon } from 'lucide-react';
import { db } from '../firebase';

import { useTheme } from '../contexts/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';

const CricketBallIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2C12 2 15 7 15 12C15 17 12 22 12 22" fill="none" stroke="white" strokeWidth="0.5" opacity="0.5" />
        <path d="M12 2C12 2 9 7 9 12C9 17 12 22 12 22" fill="none" stroke="white" strokeWidth="0.5" opacity="0.5" />
    </svg>
);

const AuctionCard: React.FC<{ auction: AuctionSetup, navigate: (path: string) => void, getStatusBadge: (status: string) => React.ReactNode, index: number, isDark: boolean }> = ({ auction, navigate, getStatusBadge, index, isDark }) => {
    const [teamCount, setTeamCount] = useState<number | null>(null);

    useEffect(() => {
        let mounted = true;
        const fetchCount = async () => {
            if (!auction.id) return;
            try {
                const snap = await db.collection('auctions').doc(auction.id).collection('teams').get();
                if (mounted) setTeamCount(snap.size);
            } catch (e) { console.error("Error fetching team count", e); }
        };
        fetchCount();
        return () => { mounted = false; };
    }, [auction.id]);

    const isRegOpen = auction.registrationConfig?.isEnabled;
    const isPublicReg = auction.registrationConfig?.isPublic ?? true;

    return (
        <div 
            className={`${isDark ? 'bg-secondary border-accent/30 hover:border-accent shadow-[0_0_20px_rgba(251,191,36,0.1)]' : 'bg-white border-gray-200 hover:border-accent shadow-lg'} border rounded-[2rem] p-6 transition-all flex flex-col relative overflow-hidden group reveal-element`}
            style={{ transitionDelay: `${(index % 4) * 150}ms` }}
        >
            {getStatusBadge(auction.status)}
            <div className="flex justify-between items-start mb-2 mt-2">
                <h3 className={`text-xl font-black uppercase tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>{auction.title}</h3>
                <button onClick={() => navigate(`/auction/${auction.id}`)} className={`bg-accent text-primary text-[10px] font-black uppercase px-4 py-2 rounded-xl transition-all active:scale-95 shadow-lg shadow-accent/20`}>Enter Room</button>
            </div>
            <div className={`text-sm mb-4 flex items-center gap-2 font-bold ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                {(isRegOpen && isPublicReg) ? <span className="text-green-500 font-black text-[9px] uppercase border border-green-500/30 bg-green-500/10 px-2 py-0.5 rounded tracking-widest">Reg Open</span> : (isRegOpen && !isPublicReg) ? <span className="text-accent font-black text-[9px] uppercase border border-accent/30 bg-accent/10 px-2 py-0.5 rounded tracking-widest">Private</span> : <span className="text-gray-500 font-black text-[9px] uppercase border border-gray-500/30 bg-gray-500/10 px-2 py-0.5 rounded tracking-widest">Closed</span>}
                <span className="opacity-30">•</span>
                <span className="text-[11px] font-black uppercase tracking-wider">{teamCount !== null ? teamCount : '-'} / {auction.totalTeams} Teams</span>
            </div>
            <div className={`mt-auto pt-4 border-t flex justify-between items-center text-[10px] font-black uppercase tracking-widest ${isDark ? 'border-zinc-800 text-zinc-500' : 'border-gray-100 text-gray-400'}`}>
                <span>Starts: {auction.date === 'TBD' ? 'TBA' : (auction.date || 'TBA')}</span>
                <div className="flex gap-2">
                    {isRegOpen && isPublicReg && <button onClick={() => navigate(`/auction/${auction.id}/register`)} className="text-accent hover:underline transition-colors">Join Now</button>}
                </div>
            </div>
        </div>
    );
};

const LandingPage: React.FC = () => {
  const { state, userProfile, activeAuctionId } = useAuction();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [upcomingAuctions, setUpcomingAuctions] = useState<AuctionSetup[]>([]);
  const [pastAuctions, setPastAuctions] = useState<AuctionSetup[]>([]);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState('');

  const isDark = theme === 'dark';

  const isLoggedIn = !!userProfile;
  const isSuperAdmin = userProfile?.role === UserRole.SUPER_ADMIN;
  const isSupportStaff = userProfile?.role === UserRole.SUPPORT;
  const isAdmin = userProfile?.role === UserRole.ADMIN || isSuperAdmin || isSupportStaff;
  const isTeamOwner = userProfile?.role === UserRole.TEAM_OWNER;

  const dashboardLink = isSuperAdmin ? "/super-admin" : (isSupportStaff ? "/staff-dashboard" : (isAdmin ? "/admin" : (isTeamOwner && activeAuctionId ? `/auction/${activeAuctionId}` : "/auth")));

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setGreeting('Good Morning');
    else if (hour >= 12 && hour < 17) setGreeting('Good Afternoon');
    else if (hour >= 17 && hour < 21) setGreeting('Good Evening');
    else setGreeting('Good Night');
  }, []);

  const PLANS = [
      { name: 'Starter Free', price: 0, teams: 2, badge: 'Basic' },
      { name: 'Silver Pro', price: 3000, teams: 4, badge: 'Pro' },
      { name: 'Gold Elite', price: 4000, teams: 6, badge: 'Premium' },
      { name: 'Diamond Master', price: 5000, teams: 10, badge: 'Popular' },
      { name: 'Platinum Ultimate', price: 6000, teams: 15, badge: 'Expert' },
  ];

  useEffect(() => {
      setLoading(true);
      const unsubscribe = db.collection('auctions').onSnapshot((snapshot) => {
          const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AuctionSetup));
          data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          const active = data.filter(a => { 
              const s = (a.status || '').toUpperCase(); 
              const isPublic = a.registrationConfig?.isPublic !== false;
              return (s === 'DRAFT' || s === 'LIVE' || s === 'NOT_STARTED' || s === 'IN_PROGRESS') && isPublic; 
          });
          const past = data.filter(a => { 
              const s = (a.status || '').toUpperCase(); 
              const isPublic = a.registrationConfig?.isPublic !== false;
              return (s === 'FINISHED' || s === 'COMPLETED') && isPublic; 
          });
          setUpcomingAuctions(active);
          setPastAuctions(past);
          setLoading(false);
      }, (error: any) => { setLoading(false); });
      return () => unsubscribe();
  }, []);

  const getStatusBadge = (status: string) => {
      const s = (status || '').toUpperCase();
      if (s === 'IN_PROGRESS' || s === 'LIVE') return <div className="absolute top-0 right-0 bg-red-600 text-white text-[8px] font-bold tracking-[0.2em] px-3 py-1 animate-pulse z-10">LIVE NOW</div>;
      if (s === 'NOT_STARTED') return <div className="absolute top-0 right-0 bg-green-600 text-white text-[8px] font-bold tracking-[0.2em] px-3 py-1 z-10">UPCOMING</div>;
      return null;
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className={`min-h-screen font-sans relative overflow-x-hidden transition-colors duration-500 ${isDark ? 'bg-primary text-text-main' : 'bg-[#fcfcfc] text-gray-900'}`}>
      
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 pointer-events-none z-0">
          <div className={`absolute top-[20%] left-[5%] animate-float ${isDark ? 'opacity-10' : 'opacity-5'}`}>
              <CricketBallIcon className="w-16 h-16 text-red-500" />
          </div>
          <div className={`absolute top-[60%] right-[10%] animate-float ${isDark ? 'opacity-10' : 'opacity-5'}`} style={{ animationDelay: '2s' }}>
              <Zap className="w-24 h-24 text-highlight" />
          </div>
          <div className={`absolute top-[40%] left-[50%] animate-drift font-black text-6xl select-none ${isDark ? 'text-highlight' : 'text-blue-100'}`} style={{ animationDelay: '0s' }}>6</div>
          <div className={`absolute top-[15%] left-[20%] animate-drift font-black text-4xl select-none ${isDark ? 'text-white' : 'text-gray-100'}`} style={{ animationDelay: '4s' }}>4</div>
          <div className={`absolute top-[75%] left-[30%] animate-drift text-red-500 font-black text-5xl select-none ${isDark ? 'opacity-30' : 'opacity-10'}`} style={{ animationDelay: '8s' }}>W</div>
      </div>

      <nav className={`border-b sticky top-0 z-50 transition-colors duration-300 ${isDark ? 'bg-secondary/50 border-accent backdrop-blur-md' : 'bg-white/80 border-gray-100 backdrop-blur-md'}`}>
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({top:0, behavior:'smooth'})}>
            <div className="w-10 h-10 bg-black rounded-lg border-2 border-highlight p-1 shadow flex items-center justify-center overflow-hidden">
                {state.systemLogoUrl ? (
                    <img src={state.systemLogoUrl} className="max-w-full max-h-full object-contain" alt="SM Sports" />
                ) : (
                    <Trophy className="w-full h-full text-highlight" />
                )}
            </div>
            <span className={`text-xl font-bold tracking-wider hidden sm:inline uppercase ${isDark ? 'text-white' : 'text-gray-800'}`}>SM SPORTS</span>
          </div>
          <div className="flex items-center gap-4 md:gap-8">
            <button onClick={() => scrollToSection('pricing')} className={`hover:text-accent transition-colors text-[11px] font-black uppercase tracking-widest hidden md:block ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>Pricing</button>
            <button onClick={() => scrollToSection('legal')} className={`hover:text-accent transition-colors text-[11px] font-black uppercase tracking-widest hidden md:block ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>Rules</button>
            
            <ThemeToggle />

            {isLoggedIn ? (
              <Link to={dashboardLink} className="btn-golden font-black py-2.5 px-8 rounded-2xl text-[11px] uppercase tracking-[0.2em] active:scale-95">Dashboard</Link>
            ) : (
              <Link to="/auth" className="btn-golden font-black py-2.5 px-8 rounded-2xl text-[11px] uppercase tracking-[0.2em] active:scale-95">Login</Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative overflow-hidden py-24 lg:py-44">
        <div className={`absolute top-0 left-0 w-full h-full ${isDark ? 'bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-900/10 via-primary to-primary' : ''}`}></div>
        
        <div className="container mx-auto px-6 relative z-10 text-center">
          <div className={`reveal-element inline-block mb-4 px-6 py-2 rounded-full text-[10px] font-black tracking-[0.3em] uppercase border ${isDark ? 'bg-accent/10 border-accent/20 text-accent' : 'bg-accent/10 border-accent/20 text-accent'}`}>
            {greeting} • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          
          <h1 className={`reveal-element text-4xl sm:text-6xl md:text-8xl lg:text-9xl font-black mb-8 tracking-tighter leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`} style={{ transitionDelay: '200ms' }}>
            MANAGE YOUR <br/>
            <span className="advaya-text italic">AUCTION LIVE</span>
          </h1>
          
          <p className={`reveal-element text-lg max-w-2xl mx-auto mb-12 leading-relaxed font-bold uppercase tracking-widest text-[12px] ${isDark ? 'text-zinc-500' : 'text-gray-500'}`} style={{ transitionDelay: '400ms' }}>
            The professional way to organize cricket auctions. Manage team budgets, buy players in real-time, and show results on big screens.
          </p>
          
          <div className="reveal-element flex flex-col sm:flex-row justify-center gap-5" style={{ transitionDelay: '600ms' }}>
            <Link to={isLoggedIn ? "/admin/new" : "/auth?tab=admin&mode=register"} className={`btn-golden flex items-center justify-center font-black py-6 px-12 rounded-[2rem] group text-xs uppercase tracking-widest active:scale-95`}>
                <Play className="w-4 h-4 mr-3 fill-current group-hover:scale-125 transition-transform" /> Create Auction
            </Link>
            <button onClick={() => scrollToSection('pricing')} className={`btn-golden flex items-center justify-center border-2 font-black py-6 px-12 rounded-[2rem] text-xs uppercase tracking-widest active:scale-95`}>
                View Plans
            </button>
          </div>
        </div>
      </header>

      {/* Auction Center */}
      <section className={`py-24 border-t relative transition-colors ${isDark ? 'bg-secondary/30 border-accent/10' : 'bg-white border-gray-100'}`}>
        <div className="container mx-auto px-6">
          <div className={`reveal-element flex items-center justify-between mb-16 border-l-8 pl-10 ${isDark ? 'border-accent' : 'border-accent'}`}>
            <div>
              <h2 className={`text-4xl font-black uppercase tracking-tighter ${isDark ? 'text-white' : 'text-gray-900'}`}>Match Center</h2>
              <p className={`text-[10px] font-black uppercase tracking-[0.4em] mt-2 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Active and Finished Tournaments</p>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="flex flex-col gap-6">
               <h4 className={`reveal-element text-[10px] font-black uppercase tracking-[0.4em] flex items-center mb-2 ${isDark ? 'text-accent' : 'text-accent'}`}><Calendar className="w-4 h-4 mr-3" /> Live & Upcoming</h4>
               {loading ? (
                 <div className="space-y-4">
                    {[1,2].map(i => <div key={i} className={`h-32 animate-pulse rounded-[2rem] border ${isDark ? 'bg-secondary border-accent/10' : 'bg-gray-50 border-gray-100'}`}></div>)}
                 </div>
               ) : upcomingAuctions.length > 0 ? (
                   upcomingAuctions.map((auction, idx) => (
                       <AuctionCard key={auction.id} auction={auction} navigate={navigate} getStatusBadge={getStatusBadge} index={idx} isDark={isDark} />
                   ))
               ) : (
                   <div className={`reveal-element border-2 border-dashed rounded-[2rem] p-12 text-center text-[10px] font-black uppercase tracking-[0.3em] opacity-50 ${isDark ? 'bg-secondary/50 border-zinc-800 text-zinc-500' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>No auctions scheduled right now</div>
               )}
            </div>
            <div className="flex flex-col gap-6">
               <h4 className="reveal-element text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em] flex items-center mb-2"><History className="w-4 h-4 mr-3" /> Past Results</h4>
               {loading ? (
                 <div className="space-y-4">
                    {[1,2].map(i => <div key={i} className={`h-32 animate-pulse rounded-[2rem] border opacity-30 ${isDark ? 'bg-secondary border-accent/10' : 'bg-gray-50 border-gray-100'}`}></div>)}
                 </div>
               ) : pastAuctions.length > 0 ? (
                   pastAuctions.map((auction, idx) => (
                    <div 
                        key={auction.id} 
                        className={`${isDark ? 'bg-secondary border-accent/20 opacity-60 hover:border-accent' : 'bg-white border-gray-100 opacity-80 hover:border-accent'} border-2 rounded-[2rem] p-6 hover:opacity-100 transition-all group shadow-md reveal-element`}
                        style={{ transitionDelay: `${(idx % 4) * 150}ms` }}
                    >
                        <h3 className={`text-lg font-black mb-2 uppercase tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>{auction.title}</h3>
                        <p className={`text-[10px] font-black uppercase tracking-widest mb-4 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Completed on {auction.date}</p>
                        <div className={`mt-auto pt-4 border-t flex justify-between items-center text-[10px] font-black uppercase tracking-widest ${isDark ? 'border-zinc-800' : 'border-gray-100'}`}>
                            <span className={`px-3 py-1.5 rounded-lg ${isDark ? 'bg-accent/10 text-accent' : 'bg-gray-100 text-gray-500'}`}>{auction.sport}</span>
                            <button onClick={() => navigate(`/auction/${auction.id}`)} className="text-accent hover:text-amber-400 transition-colors flex items-center gap-2">View Stats <ChevronRight className="w-3 h-3"/></button>
                        </div>
                    </div>
                   ))
               ) : (
                   <div className={`reveal-element border-2 border-dashed rounded-[2rem] p-12 text-center text-[10px] font-black uppercase tracking-[0.3em] opacity-50 ${isDark ? 'bg-secondary/50 border-zinc-800 text-zinc-500' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>No past matches found</div>
               )}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className={`py-32 relative overflow-hidden transition-colors ${isDark ? 'bg-primary' : 'bg-[#f8faff]'}`}>
          <div className={`absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[150px] -mr-64 -mt-64 ${isDark ? 'bg-accent/5' : 'bg-accent/5'}`}></div>
          <div className="container mx-auto px-6 relative z-10 text-center">
              <div className="reveal-element max-w-2xl mx-auto mb-20">
                  <h2 className={`text-5xl md:text-7xl font-black mb-6 uppercase tracking-tighter ${isDark ? 'text-white' : 'text-gray-900'}`}>SELECT YOUR PLAN</h2>
                  <p className={`${isDark ? 'text-zinc-500' : 'text-gray-500'} font-bold uppercase tracking-widest text-xs`}>Choose the best plan for your tournament size.</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-24">
                  {PLANS.map((plan, i) => (
                      <div 
                        key={i} 
                        className={`${isDark ? 'bg-secondary border-accent/20' : 'bg-white border-gray-200 shadow-xl'} border-2 ${plan.price === 5000 ? 'border-accent ring-4 ring-accent/10 scale-[1.05]' : ''} rounded-[3rem] p-10 flex flex-col hover:border-accent transition-all group relative overflow-hidden reveal-element`}
                        style={{ transitionDelay: `${i * 150}ms` }}
                      >
                          {plan.price === 5000 && <div className="absolute top-6 right-8"><Zap className="w-6 h-6 text-accent fill-current animate-pulse"/></div>}
                          <div className={`text-[10px] font-black uppercase tracking-[0.3em] mb-4 text-left ${isDark ? 'text-accent' : 'text-accent'}`}>{plan.badge} Package</div>
                          <h3 className={`text-3xl font-black mb-10 text-left uppercase tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3>
                          <div className={`flex items-baseline mb-12 border-b-2 pb-8 ${isDark ? 'border-zinc-800' : 'border-gray-50'}`}>
                              <span className={`text-5xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>₹{plan.price}</span>
                              <span className="text-[10px] text-gray-500 font-black ml-2 uppercase tracking-widest">/ per auction</span>
                          </div>
                          <div className="space-y-6 mb-12 flex-grow text-left">
                              <div className={`flex items-center gap-4 text-xs font-black uppercase tracking-widest ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
                                  <Users className={`w-5 h-5 ${isDark ? 'text-accent' : 'text-accent'}`}/>
                                  Total Teams: {plan.teams}
                              </div>
                              <div className="flex items-center gap-4 text-[10px] text-gray-500 font-black uppercase tracking-widest">
                                  <CheckCircle className="w-4 h-4 text-green-500"/>
                                  {plan.price === 0 ? 'Standard Features' : 'All Pro Features'}
                              </div>
                          </div>
                          <Link to="/auth?tab=admin&mode=register" className={`btn-golden w-full py-5 rounded-2xl text-center text-[10px] font-black uppercase tracking-[0.2em] active:scale-95`}>
                              Get Started
                          </Link>
                      </div>
                  ))}

                  <div 
                    className={`${isDark ? 'bg-gradient-to-br from-secondary to-black border-accent/20' : 'bg-white border-gray-200 shadow-xl'} border-2 rounded-[3rem] p-10 flex flex-col hover:border-accent transition-all reveal-element`}
                    style={{ transitionDelay: '600ms' }}
                  >
                      <div className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] mb-4 text-left">Corporate</div>
                      <h3 className={`text-3xl font-black mb-10 text-left uppercase tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Custom Plan</h3>
                      <div className={`text-2xl font-black mb-12 h-[61px] flex items-center ${isDark ? 'text-white' : 'text-gray-900'}`}>Contact Us</div>
                      <p className="text-[11px] text-gray-500 font-black mb-12 flex-grow leading-relaxed uppercase tracking-widest text-left">For very large leagues, custom branding, and onsite support from our team.</p>
                      <button onClick={() => window.location.href='mailto:send.smsports@gmail.com'} className={`btn-golden w-full font-black py-5 rounded-2xl text-[10px] uppercase tracking-[0.2em] active:scale-95`}>
                          Email Support
                      </button>
                  </div>
              </div>

              {/* All Paid Plans Feature Highlight */}
              <div className={`${isDark ? 'bg-secondary/20 border-accent/20' : 'bg-white border-accent/10 shadow-2xl'} border-2 rounded-[3rem] p-12 md:p-20 relative overflow-hidden backdrop-blur-xl reveal-element`}>
                  <div className="absolute top-0 right-0 p-8 opacity-5">
                      <Star className={`w-64 h-64 ${isDark ? 'text-accent' : 'text-accent'}`} />
                  </div>
                  <div className="max-w-4xl mx-auto relative z-10">
                      <h3 className={`text-3xl md:text-5xl font-black mb-16 border-l-8 pl-10 text-left uppercase tracking-tighter reveal-element ${isDark ? 'text-white border-accent' : 'text-gray-900 border-accent'}`}>WHAT YOU GET <br/> IN PAID PLANS</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 text-left">
                          {[
                              { icon: <UserPlus className="w-6 h-6"/>, title: "Player Signup", desc: "Players can register online and upload their photos easily." },
                              { icon: <Layout className="w-6 h-6"/>, title: "Live Updates", desc: "Everyone can see the bidding happen live on their phones." },
                              { icon: <Zap className="w-6 h-6"/>, title: "Auto Math", desc: "The system automatically tracks team money and squad counts." },
                              { icon: <MessageSquare className="w-6 h-6"/>, title: "Phone Alerts", desc: "Automated WhatsApp updates for players and team owners." },
                              { icon: <Monitor className="w-6 h-6"/>, title: "Big Screens", desc: "Beautiful views for LED walls, projectors, and live TV." },
                              { icon: <Youtube className="w-6 h-6"/>, title: "Live Streaming", desc: "Professional scorecards for your YouTube or Facebook live." }
                          ].map((feat, idx) => (
                              <div key={idx} className="flex gap-6 group reveal-element" style={{ transitionDelay: `${idx * 100}ms` }}>
                                  <div className={`p-4 rounded-2xl h-fit border group-hover:text-primary transition-all ${isDark ? 'bg-accent/10 text-accent border-accent/20 group-hover:bg-accent' : 'bg-accent/10 text-accent border-accent/20 group-hover:bg-accent group-hover:text-white'}`}>{feat.icon}</div>
                                  <div>
                                      <h4 className={`font-black text-xs uppercase tracking-widest mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>{feat.title}</h4>
                                      <p className={`text-[10px] leading-relaxed font-black uppercase opacity-60 ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>{feat.desc}</p>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>

              <div className="mt-24 text-center">
                  <p className="text-zinc-500 font-black text-[10px] uppercase tracking-[0.5em] mb-10 reveal-element">Conduct your auction professionally</p>
                  <button onClick={() => window.location.href='mailto:send.smsports@gmail.com'} className={`btn-golden font-black px-16 py-6 rounded-[2rem] active:scale-95 uppercase tracking-[0.2em] text-xs reveal-element`}>
                      Talk to Our Team
                  </button>
              </div>
          </div>
      </section>

      {/* Legal Section */}
      <section id="legal" className={`py-32 border-t relative overflow-hidden transition-colors ${isDark ? 'bg-secondary/10 border-accent/10' : 'bg-white border-gray-100'}`}>
          <div className="absolute bottom-0 left-0 w-64 h-64 opacity-5 translate-y-1/2">
               <CricketBallIcon className={`w-full h-full ${isDark ? 'text-white' : 'text-blue-900'}`} />
          </div>
          <div className="container mx-auto px-6 relative z-10">
              <div className="flex flex-col md:flex-row gap-20 items-start">
                  <div className="md:w-1/3 reveal-element">
                      <div className="flex items-center gap-4 mb-8">
                          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-accent/10 border-accent/20' : 'bg-accent/10 border-accent/20'}`}><Scale className={`w-8 h-8 ${isDark ? 'text-accent' : 'text-accent'}`}/></div>
                          <h2 className={`text-4xl font-black uppercase tracking-tighter leading-none ${isDark ? 'text-white' : 'text-gray-900'}`}>Rules & <br/> Policies</h2>
                      </div>
                      <p className={`text-sm leading-relaxed mb-10 font-black italic opacity-70 ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
                          Simple guidelines to ensure a fair and secure auction for everyone.
                      </p>
                      <div className="space-y-6">
                          <div className={`flex items-center gap-4 text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}><ShieldCheck className="w-5 h-5 text-green-500"/> Secured Cloud Storage</div>
                          <div className={`flex items-center gap-4 text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}><FileText className="w-5 h-5 text-accent"/> Data Privacy Guaranteed</div>
                      </div>
                  </div>
                  
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-12">
                      {[
                        { title: "Organizer Rules", desc: "Organizers are responsible for managing their own auctions. SM SPORTS provides the software only and does not handle payments between teams and players." },
                        { title: "Privacy Policy", desc: "Your player data and contact details are safe with us. We do not share your tournament info with any third-party marketing agencies." },
                        { title: "Refund Policy", desc: "Payments for plan upgrades are final. If you face any software issues, we will provide extra credits for your next tournament." },
                        { title: "Content Guidelines", desc: "Please ensure tournament names and player photos are appropriate. We reserve the right to remove any illegal or offensive content." }
                      ].map((policy, idx) => (
                        <div key={idx} className="space-y-5 reveal-element" style={{ transitionDelay: `${idx * 150}ms` }}>
                            <h4 className={`font-black text-[10px] uppercase tracking-[0.3em] ${isDark ? 'text-accent' : 'text-accent'}`}>{policy.title}</h4>
                            <p className={`text-xs leading-relaxed font-black uppercase opacity-60 ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>{policy.desc}</p>
                        </div>
                      ))}
                  </div>
              </div>
          </div>
      </section>

      <footer className={`border-t py-20 mt-auto relative overflow-hidden transition-colors ${isDark ? 'bg-secondary border-accent/10' : 'bg-gray-50 border-gray-100'}`}>
        <div className="container mx-auto px-6 relative z-10">
           <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
              {[
                { icon: <Users />, title: "Team Owners", desc: "Owners can login to manage their squads and see their remaining budget." },
                { icon: <Trophy />, title: "Live Results", desc: "Bidding updates happen instantly so everyone stays informed." },
                { icon: <ShieldCheck />, title: "Admin Panel", desc: "Total control for the auctioneer to manage players and bidding." },
                { icon: <Monitor />, title: "Big Displays", desc: "Professional screen designs for your LED walls and live streams." }
              ].map((item, idx) => (
                <div key={idx} className="reveal-element" style={{ transitionDelay: `${idx * 150}ms` }}>
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border ${isDark ? 'bg-accent/10 text-accent border-accent/20' : 'bg-accent/10 text-accent border-accent/20'}`}>{item.icon}</div>
                    <h4 className={`font-black text-xs uppercase tracking-widest mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>{item.title}</h4>
                    <p className={`text-[11px] font-black uppercase opacity-60 leading-relaxed ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>{item.desc}</p>
                </div>
              ))}
           </div>
           
           <div className={`border-t pt-12 flex flex-col lg:flex-row justify-between items-center gap-10 ${isDark ? 'border-zinc-800' : 'border-gray-200'}`}>
               <div className="text-zinc-500 text-[11px] font-black uppercase tracking-[0.2em] reveal-element">&copy; 2026 SM SPORTS. All rights reserved.</div>
               <div className="flex flex-wrap justify-center gap-8 reveal-element">
                   <Link to="/guide" className={`hover:text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors ${isDark ? 'text-accent' : 'text-accent'}`}>
                       <BookOpen className="w-4 h-4"/> User Manual
                   </Link>
                   <button onClick={() => scrollToSection('pricing')} className="text-zinc-500 hover:text-accent text-[10px] font-black uppercase tracking-widest transition-colors">Plans</button>
                   <button onClick={() => scrollToSection('legal')} className="text-zinc-500 hover:text-accent text-[10px] font-black uppercase tracking-widest transition-colors">Policies</button>
                   <Link to="/auth" className="text-zinc-500 hover:text-accent text-[10px] font-black uppercase tracking-widest transition-colors">Admin Login</Link>
               </div>
           </div>
        </div>
      </footer>

      {/* Owner Attribution */}
      <div className={`py-8 border-t text-center relative overflow-hidden group transition-colors ${isDark ? 'bg-accent/5 border-accent/10' : 'bg-gray-100 border-gray-200'}`}>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
          <p className={`text-[10px] font-black uppercase tracking-[0.6em] relative z-10 reveal-element ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
              Developed by <span className={`font-black border-b-2 pb-0.5 transition-colors ${isDark ? 'text-accent border-accent/30 group-hover:border-accent' : 'text-accent border-accent/10 group-hover:border-accent'}`}>Zabiulla Khan</span>
          </p>
      </div>

      <button onClick={() => window.scrollTo({top:0, behavior:'smooth'})} className="fixed bottom-8 right-8 bg-accent text-primary p-5 rounded-full shadow-2xl z-50 hover:scale-110 active:scale-95 transition-transform hover:bg-amber-400 shadow-accent/20 border-4 border-primary"><Smartphone className="w-5 h-5"/></button>
    </div>
  );
};

export default LandingPage;
