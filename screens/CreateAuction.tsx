import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Upload, CheckCircle, AlertTriangle, Plus, Trash2, RefreshCw } from 'lucide-react';
import { db } from '../firebase';
import { AuctionSetup, BidIncrementSlab } from '../types';
import { useAuction } from '../hooks/useAuction';

const CreateAuction: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuction();
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dbPlans, setDbPlans] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
      sport: '',
      title: '',
      season: '',
      date: '',
      dateTBD: false,
      plan: '',
      totalTeams: 2,
      purseValue: 10000,
      basePrice: 20,
      bidIncrement: 10,
      playersPerTeam: 15
  });

  useEffect(() => {
      const unsub = db.collection('subscriptionPlans').orderBy('price', 'asc').onSnapshot(snap => {
          if (snap.empty) {
              setDbPlans([
                  { id: 'starter_free', name: 'Starter Free', teams: 2 },
                  { id: 'silver_pro', name: 'Silver Pro', teams: 4 },
                  { id: 'gold_elite', name: 'Gold Elite', teams: 6 },
                  { id: 'diamond_master', name: 'Diamond Master', teams: 10 },
                  { id: 'platinum_ultimate', name: 'Platinum Ultimate', teams: 15 }
              ]);
          } else {
              setDbPlans(snap.docs.map(d => ({ id: d.id, name: d.data().name, ...d.data() })));
          }
      });
      return () => unsub();
  }, []);

  const [slabs, setSlabs] = useState<BidIncrementSlab[]>([]);
  const [newSlab, setNewSlab] = useState<{from: string, increment: string}>({from: '', increment: ''});

  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaError, setCaptchaError] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value, type } = e.target;
      if (type === 'checkbox') {
          const checked = (e.target as HTMLInputElement).checked;
          setFormData(prev => ({ ...prev, [name]: checked }));
      } else {
          setFormData(prev => ({ ...prev, [name]: value }));
      }
  }

  const addSlab = () => {
      const fromVal = Number(newSlab.from);
      const incVal = Number(newSlab.increment);
      if (fromVal >= 0 && incVal > 0) {
          setSlabs(prev => [...prev, { from: fromVal, increment: incVal }]);
          setNewSlab({ from: '', increment: '' });
      }
  };

  const removeSlab = (index: number) => {
      setSlabs(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setErrorMsg(null);
      if (captchaInput.toLowerCase() !== 'jgmuj') { setCaptchaError(true); return; }
      if (!formData.sport) return alert("Please select a sport.");
      if (!formData.plan) return alert("Please select a plan.");
      if (!formData.dateTBD && !formData.date) return alert("Please select an auction date or check 'Date not decided'.");

      setLoading(true);
      try {
          const uid = userProfile?.uid || 'unknown_user';
          const newAuction: AuctionSetup = {
              title: formData.title,
              sport: formData.sport,
              date: formData.dateTBD ? 'TBD' : formData.date,
              dateTBD: formData.dateTBD,
              plan: formData.plan,
              totalTeams: Number(formData.totalTeams),
              purseValue: Number(formData.purseValue),
              basePrice: Number(formData.basePrice),
              bidIncrement: Number(formData.bidIncrement),
              playersPerTeam: Number(formData.playersPerTeam),
              slabs: slabs,
              status: 'DRAFT',
              createdAt: Date.now(),
              createdBy: uid,
              isPaid: false
          };
          await db.collection('auctions').add(newAuction);
          setShowSuccessModal(true);
      } catch (error: any) {
          setErrorMsg(`Failed to save: ${error.message}`);
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 relative">
      
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Auction Created!</h2>
                <p className="text-gray-600 mb-8">Your auction <span className="font-bold">{formData.title}</span> has been saved.</p>
                <button onClick={() => navigate('/admin')} className="w-full bg-accent text-white font-bold py-3 px-6 rounded-lg shadow-lg">Go to Dashboard</button>
            </div>
        </div>
      )}

      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-20">
        <div className="container mx-auto px-6 py-3 flex items-center">
             <button onClick={() => navigate('/admin')} className="text-gray-500 hover:text-gray-800 mr-4 transition-colors"><ArrowLeft /></button>
             <h1 className="text-xl font-bold text-gray-700">Create New Auction</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-8 max-w-4xl">
        <div className="bg-white rounded-2xl shadow p-6 md:p-8 border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Auction Details</h2>
            
            {errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6 flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <span className="text-sm font-bold">{errorMsg}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
                
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-3">1. Select Sport <span className="text-red-500">*</span></label>
                    <div className="flex flex-wrap gap-2">
                        {['Cricket', 'Football', 'Kabaddi'].map(s => (
                            <button key={s} type="button" onClick={() => setFormData({...formData, sport: s})}
                                className={`px-6 py-3 rounded-xl text-xs font-bold uppercase transition-all border-2 ${formData.sport === s ? 'bg-accent border-accent text-white shadow-lg' : 'bg-white border-gray-100 text-gray-400'}`}>
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">2. Auction Name <span className="text-red-500">*</span></label>
                    <input type="text" name="title" required placeholder="e.g. Premier League 2026" value={formData.title} onChange={handleChange}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm font-bold text-gray-700 focus:bg-white outline-none focus:ring-2 ring-blue-500 transition-all"/>
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Season Number</label>
                    <input type="text" name="season" placeholder="e.g. 4" value={formData.season || ''} onChange={handleChange}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm font-bold text-gray-700 focus:bg-white outline-none focus:ring-2 ring-blue-500 transition-all"/>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase">3. Auction Date <span className="text-red-500">*</span></label>
                        <label className="flex items-center gap-2 text-xs font-bold text-blue-600 cursor-pointer">
                            <input type="checkbox" name="dateTBD" checked={formData.dateTBD} onChange={handleChange} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                            Date not decided yet
                        </label>
                    </div>
                    <div className="relative">
                        <input type="date" name="date" required={!formData.dateTBD} disabled={formData.dateTBD} value={formData.date} onChange={handleChange}
                            className={`w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm font-bold text-gray-700 focus:bg-white outline-none ${formData.dateTBD ? 'opacity-50 cursor-not-allowed' : ''}`}/>
                        <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-3">4. Choose a Plan <span className="text-red-500">*</span></label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {dbPlans.map(plan => (
                            <button key={plan.id} type="button" onClick={() => setFormData({...formData, plan: plan.id})}
                                className={`px-4 py-3 rounded-xl text-xs font-bold uppercase transition-all border-2 text-center flex flex-col ${formData.plan === plan.id ? 'bg-accent border-accent text-white shadow-lg' : 'bg-white border-gray-100 text-gray-400'}`}>
                                <span>{plan.name}</span>
                                {plan.teams && <span className="text-[10px] opacity-60 mt-1">Up to {plan.teams} Teams</span>}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-gray-50 rounded-2xl border border-gray-100">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Number of Teams</label>
                        <input type="number" name="totalTeams" min="2" required value={formData.totalTeams} onChange={handleChange} className="w-full border border-gray-200 rounded-xl py-2 px-4 text-sm font-bold outline-none" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Players per Team</label>
                        <input type="number" name="playersPerTeam" required value={formData.playersPerTeam} onChange={handleChange} className="w-full border border-gray-200 rounded-xl py-2 px-4 text-sm font-bold outline-none" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Team Budget</label>
                        <input type="number" name="purseValue" required value={formData.purseValue} onChange={handleChange} className="w-full border border-gray-200 rounded-xl py-2 px-4 text-sm font-bold outline-none" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Starting Player Price</label>
                        <input type="number" name="basePrice" required value={formData.basePrice} onChange={handleChange} className="w-full border border-gray-200 rounded-xl py-2 px-4 text-sm font-bold outline-none" />
                    </div>
                </div>

                <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                    <h3 className="text-xs font-bold text-blue-600 uppercase mb-4 flex items-center gap-2"><Plus className="w-4 h-4"/> Bid Settings</h3>
                    <div className="mb-6">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Standard Bid Increase <span className="text-red-500">*</span></label>
                        <input type="number" name="bidIncrement" required value={formData.bidIncrement} onChange={handleChange} className="w-full border border-gray-200 rounded-xl py-3 px-4 text-sm font-bold outline-none"/>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Custom Bid Rules (Optional)</label>
                        <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                             {slabs.map((slab, idx) => (
                                 <div key={idx} className="flex justify-between items-center text-xs font-bold bg-gray-50 p-3 rounded-lg border border-gray-100">
                                     <span className="text-gray-600">Above {slab.from}: Increase by {slab.increment}</span>
                                     <button type="button" onClick={() => removeSlab(idx)} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4"/></button>
                                 </div>
                             ))}
                             <div className="grid grid-cols-2 gap-3 pt-2">
                                 <div><label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Price Above</label><input type="number" className="w-full border border-gray-100 bg-gray-50 rounded-lg p-2 text-xs font-bold outline-none" value={newSlab.from} onChange={e => setNewSlab({...newSlab, from: e.target.value})} /></div>
                                 <div><label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Increase By</label><input type="number" className="w-full border border-gray-100 bg-gray-50 rounded-lg p-2 text-xs font-bold outline-none" value={newSlab.increment} onChange={e => setNewSlab({...newSlab, increment: e.target.value})} /></div>
                             </div>
                             <button type="button" onClick={addSlab} className="mt-4 w-full py-3 bg-accent text-white text-[10px] font-bold uppercase rounded-lg shadow-lg active:scale-95">Add Rule</button>
                        </div>
                    </div>
                </div>

                <div className="bg-gray-100 p-8 rounded-2xl border border-gray-200">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-4">Verification Code <span className="text-red-500">*</span></label>
                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                        <div className="w-full sm:w-48 h-16 bg-white flex items-center justify-center font-mono text-3xl text-gray-300 line-through italic border border-gray-200 rounded-xl shadow-inner">jgmuj</div>
                        <input type="text" required value={captchaInput} onChange={(e) => { setCaptchaInput(e.target.value); setCaptchaError(false); }}
                            className={`flex-1 w-full bg-white border-2 ${captchaError ? 'border-red-500' : 'border-transparent'} rounded-xl py-4 px-6 font-bold uppercase text-center outline-none`} placeholder="Type the code above"/>
                    </div>
                </div>

                <button type="submit" disabled={loading} className={`w-full bg-accent text-white font-bold py-5 rounded-2xl shadow-xl transition-all active:scale-95 uppercase text-sm flex items-center justify-center gap-3 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}>
                    {loading ? <RefreshCw className="animate-spin h-5 w-5"/> : <CheckCircle className="h-5 w-5"/>}
                    Confirm and Create Auction
                </button>

            </form>
        </div>
      </main>
    </div>
  );
};

export default CreateAuction;