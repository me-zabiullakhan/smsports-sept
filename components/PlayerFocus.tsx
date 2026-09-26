
import React from 'react';
import { Player, AuctionStatus } from '../types';
import { useAuction } from '../hooks/useAuction';
import { useTheme } from '../contexts/ThemeContext';
import { Globe, User, Tag } from 'lucide-react';
import { getEffectiveBasePrice } from '../utils';

interface PlayerFocusProps {
  player: Player;
}

const Timer: React.FC = () => {
    const { state } = useAuction();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const { timer } = state;
    const progress = (timer / 10) * 100;
    const timerColor = timer <= 3 ? 'bg-red-500' : timer <= 6 ? (isDark ? 'bg-amber-500' : 'bg-yellow-500') : (isDark ? 'bg-accent' : 'bg-green-500');

    return (
        <div className={`w-full rounded-full h-6 md:h-8 overflow-hidden shadow-inner mt-4 ${isDark ? 'bg-zinc-900' : 'bg-gray-200'}`}>
            <div 
                className={`h-full rounded-full ${timerColor} transition-all duration-500 ease-linear text-white flex items-center justify-center font-black text-sm md:text-lg uppercase tracking-widest`}
                style={{ width: `${progress}%` }}
            >
                {timer}s
            </div>
        </div>
    );
}

const PlayerFocus: React.FC<PlayerFocusProps> = ({ player }) => {
  const { state } = useAuction();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { currentBid, highestBidder, status, categories } = state;

  // Calculate effective base price
  const effectiveBasePrice = getEffectiveBasePrice(player, categories);

  const displayPrice = (currentBid !== null && currentBid > 0) ? Math.max(currentBid, effectiveBasePrice) : effectiveBasePrice;
  const isSold = status === AuctionStatus.Sold || player.status === 'SOLD';
  const isUnsold = status === AuctionStatus.Unsold || player.status === 'UNSOLD';

  return (
    <div className={`rounded-[2.5rem] shadow-2xl p-4 md:p-8 relative overflow-hidden border-4 flex flex-col justify-between min-h-[350px] md:min-h-[450px] transition-all duration-500 ${isDark ? 'bg-secondary border-accent/20 shadow-accent/5' : 'bg-white border-blue-500/20 shadow-blue-600/10'}`}>
        {isDark && (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.1)_0%,transparent_70%)] pointer-events-none" />
        )}
        
        <div className={`absolute -top-12 -right-12 w-32 h-32 md:w-48 md:h-48 rounded-full blur-3xl ${isDark ? 'bg-accent/10' : 'bg-blue-500/10'}`}></div>
        <div className={`absolute -bottom-16 -left-12 w-24 h-24 md:w-40 md:h-40 rounded-full blur-3xl ${isDark ? 'bg-accent/10' : 'bg-blue-500/10'}`}></div>

        <div className="relative z-10 flex flex-col h-full">
            {/* Player Info Header */}
            <div className="flex flex-col items-center text-center space-y-4 md:space-y-6 mb-6 md:mb-8">
                <div className="relative group">
                    <div className={`absolute -inset-1 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200 ${isDark ? 'bg-accent' : 'bg-blue-600'}`}></div>
                    <img src={player.photoUrl || null} alt={player.name} className={`relative w-28 h-28 md:w-44 md:h-44 rounded-full border-4 object-cover shadow-2xl transition-transform duration-500 group-hover:scale-105 ${isDark ? 'border-accent' : 'border-blue-600'}`} />
                </div>
                <div>
                    <h2 className={`text-3xl md:text-5xl font-black uppercase tracking-tighter italic leading-tight pb-1 ${isDark ? 'advaya-text' : 'text-gray-900'}`}>{player.name}</h2>
                    <div className="flex flex-wrap items-center justify-center gap-2 mt-3 md:mt-4">
                        {/* ROLE (Player Type) - Primary Badge */}
                        <span className={`px-4 py-1.5 md:px-6 md:py-2 text-[10px] md:text-xs font-black rounded-xl uppercase tracking-[0.2em] shadow-lg flex items-center transition-all ${isDark ? 'bg-accent text-zinc-950' : 'bg-blue-600 text-white'}`}>
                            <User className="w-3.5 h-3.5 mr-2 opacity-80"/>
                            {player.role || player.category}
                        </span>
                        
                        {/* AUCTION CATEGORY (Group) - Secondary Badge */}
                        <span className={`px-4 py-1.5 md:px-5 md:py-2 text-[10px] md:text-xs font-black rounded-xl uppercase tracking-[0.2em] border flex items-center shadow-sm transition-all ${isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-400' : 'bg-gray-100 border-gray-200 text-gray-600'}`}>
                            <Tag className="w-3.5 h-3.5 mr-2 opacity-70"/>
                            {player.category}
                        </span>

                        {/* Nationality Badge */}
                        <span className={`flex items-center font-black px-4 py-1.5 md:px-5 md:py-2 text-[10px] md:text-xs rounded-xl border transition-all ${isDark ? 'bg-zinc-900/50 border-zinc-800 text-zinc-500' : 'bg-white border-gray-200 text-gray-400'}`}>
                            <Globe className={`w-3.5 h-3.5 mr-2 ${isDark ? 'text-accent' : 'text-blue-500'}`}/>{player.nationality}
                        </span>
                    </div>
                </div>
            </div>

            {/* Bidding Info */}
            <div className={`p-6 md:p-10 rounded-[2rem] border flex flex-col items-center justify-center flex-grow relative overflow-hidden transition-all duration-500 ${isDark ? 'bg-black/40 border-accent/10 shadow-inner' : 'bg-gray-50 border-blue-100 shadow-inner'}`}>
                {isSold && (
                    <div className="absolute inset-0 bg-black/80 z-20 flex flex-col items-center justify-center animate-fade-in backdrop-blur-md">
                        <div className={`font-black text-4xl md:text-7xl px-10 py-6 border-8 -rotate-12 shadow-2xl tracking-[0.2em] uppercase transition-all ${isDark ? 'bg-accent border-white text-black' : 'bg-green-600 border-white text-white'}`}>SOLD</div>
                        {player.soldTo && <div className={`mt-6 text-xl md:text-2xl font-black uppercase tracking-widest ${isDark ? 'text-accent' : 'text-white'}`}>To {player.soldTo}</div>}
                        {player.soldPrice && <div className={`text-2xl md:text-3xl font-black ${isDark ? 'text-white' : 'text-green-400'}`}>₹{player.soldPrice}</div>}
                    </div>
                )}
                {isUnsold && (
                    <div className="absolute inset-0 bg-black/80 z-20 flex items-center justify-center animate-fade-in backdrop-blur-md">
                        <div className="bg-red-600 text-white font-black text-4xl md:text-7xl px-10 py-6 border-8 -rotate-12 shadow-2xl tracking-[0.2em] uppercase">UNSOLD</div>
                    </div>
                )}

                <div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-accent to-transparent opacity-50`}></div>
                
                <p className={`uppercase tracking-[0.4em] text-[10px] md:text-xs font-black mb-2 md:mb-4 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
                    {highestBidder ? 'Current Bid' : 'Starting Price'}
                </p>
                <p className={`text-6xl sm:text-7xl md:text-9xl font-black tabular-nums drop-shadow-2xl mb-4 transition-all ${isDark ? 'advaya-text' : 'text-blue-600'}`}>
                    ₹{displayPrice}
                </p>
                
                <div className="flex items-center gap-8 md:gap-12 mt-4">
                    <div className={`text-center px-4 md:px-8 border-r ${isDark ? 'border-zinc-800' : 'border-gray-200'}`}>
                        <p className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest mb-1 ${isDark ? 'text-zinc-600' : 'text-gray-400'}`}>Base Price</p>
                        <p className={`text-xl md:text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>₹{effectiveBasePrice}</p>
                    </div>
                    <div className="text-center px-4 md:px-8">
                        <p className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest mb-1 ${isDark ? 'text-zinc-600' : 'text-gray-400'}`}>Highest Bidder</p>
                        <div className="flex items-center justify-center mt-1">
                            {highestBidder ? (
                                <div className="flex items-center gap-3">
                                    {highestBidder.logoUrl && <img src={highestBidder.logoUrl} className="w-6 h-6 md:w-8 md:h-8 rounded-xl shadow-lg" alt=""/>}
                                    <span className={`text-lg md:text-2xl font-black uppercase tracking-tight truncate max-w-[150px] md:max-w-[200px] ${isDark ? 'text-accent' : 'text-blue-600'}`}>{highestBidder.name}</span>
                                </div>
                            ) : (
                                <span className={`text-lg md:text-xl font-black uppercase tracking-widest italic ${isDark ? 'text-zinc-700' : 'text-gray-300'}`}>No Bids Yet</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <Timer />
        </div>
    </div>
  );
};

export default PlayerFocus;
