
import React from 'react';
import { useAuction } from '../hooks/useAuction';
import { useTheme } from '../contexts/ThemeContext';
import { UserRole } from '../types';
import PlayerFocus from '../components/PlayerFocus';
import MyTeamPanel from '../components/MyTeamPanel';
import AuctionLog from '../components/AuctionLog';
import PlayerPool from '../components/PlayerPool';
import BiddingPanel from '../components/BiddingPanel';
import { Loader2 } from 'lucide-react';

const AuctionRoom: React.FC = () => {
  const { state, userProfile } = useAuction();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  // Find player by ID from full list to persist display after sale, instead of relying on unsold pool index
  const currentPlayer = state.currentPlayerId ? state.players.find(p => String(p.id) === String(state.currentPlayerId)) : null;
  
  const isTeamOwner = userProfile?.role === UserRole.TEAM_OWNER;

  return (
    <div className="min-h-full transition-all duration-500">
      {currentPlayer ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4 sm:gap-6 lg:gap-8">
          {/* Center Column: Main Action (Live Player) - First on Mobile, Top on Tablet, Center on Desktop */}
          <div className="md:col-span-2 xl:col-span-6 xl:order-2 flex flex-col gap-6">
            <PlayerFocus player={currentPlayer} />
            {isTeamOwner && <div className="mt-auto"><BiddingPanel /></div>}
          </div>

          {/* Left Column: Team Info or Log */}
          <div className="md:col-span-1 xl:col-span-3 xl:order-1 space-y-6 flex flex-col xl:h-[calc(100vh-140px)]">
            {isTeamOwner && <div className="flex-1 min-h-[350px]"><MyTeamPanel /></div>}
            <div className="flex-1 min-h-[300px] xl:min-h-0"><AuctionLog /></div>
          </div>

          {/* Right Column: Player Pool */}
          <div className="md:col-span-1 xl:col-span-3 xl:order-3 xl:h-[calc(100vh-140px)] min-h-[400px] xl:min-h-0">
            <PlayerPool />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4 sm:gap-6 lg:gap-8">
          {/* Center Column: Waiting state */}
          <div className="md:col-span-2 xl:col-span-6 xl:order-2 flex flex-col gap-6 justify-center">
            <div className={`flex items-center justify-center min-h-[350px] md:h-[400px] rounded-[3rem] border-4 border-dashed transition-all duration-500 ${isDark ? 'bg-secondary/30 border-accent/20' : 'bg-gray-50 border-blue-500/20'}`}>
                <div className="text-center p-6 sm:p-8">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl ${isDark ? 'bg-zinc-900' : 'bg-white'}`}>
                        <Loader2 className={`w-8 h-8 animate-spin ${isDark ? 'text-accent' : 'text-blue-600'}`} />
                    </div>
                    <h2 className={`text-2xl md:text-3xl font-black uppercase tracking-tighter italic mb-2 ${isDark ? 'advaya-text' : 'text-gray-900'}`}>Waiting for Auctioneer</h2>
                    <p className={`text-[10px] font-black uppercase tracking-[0.3em] animate-pulse ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>The next lot will appear shortly...</p>
                </div>
            </div>
          </div>

          {/* Left Column: Team Info or Log */}
          <div className="md:col-span-1 xl:col-span-3 xl:order-1 space-y-6 flex flex-col xl:h-[calc(100vh-140px)]">
            {isTeamOwner && <div className="flex-1 min-h-[350px]"><MyTeamPanel /></div>}
            <div className="flex-1 min-h-[300px] xl:min-h-0"><AuctionLog /></div>
          </div>

          {/* Right Column: Player Pool */}
          <div className="md:col-span-1 xl:col-span-3 xl:order-3 xl:h-[calc(100vh-140px)] min-h-[400px] xl:min-h-0">
            <PlayerPool />
          </div>
        </div>
      )}
    </div>
  );
};

export default AuctionRoom;
