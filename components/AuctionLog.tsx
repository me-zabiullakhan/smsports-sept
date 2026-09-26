
import React from 'react';
import { useAuction } from '../hooks/useAuction';
import { useTheme } from '../contexts/ThemeContext';
import { AuctionLog as AuctionLogType } from '../types';
import { MessageSquare, DollarSign, CheckCircle, XCircle } from 'lucide-react';

const LogIcon: React.FC<{type: AuctionLogType['type']}> = ({type}) => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    switch (type) {
        case 'BID': return <DollarSign className={`h-4 w-4 ${isDark ? 'text-accent' : 'text-amber-500'}`}/>;
        case 'SOLD': return <CheckCircle className={`h-4 w-4 ${isDark ? 'text-green-400' : 'text-green-600'}`}/>;
        case 'UNSOLD': return <XCircle className={`h-4 w-4 ${isDark ? 'text-red-400' : 'text-red-600'}`}/>;
        case 'SYSTEM': return <MessageSquare className={`h-4 w-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}/>;
        default: return null;
    }
}

const AuctionLog: React.FC = () => {
  const { state } = useAuction();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className={`rounded-[2.5rem] shadow-2xl p-6 h-full flex flex-col border-4 transition-all duration-500 ${isDark ? 'bg-secondary border-accent/20 shadow-accent/5' : 'bg-white border-blue-500/20 shadow-blue-600/10'}`}>
      <h3 className={`text-[10px] font-black uppercase tracking-[0.3em] mb-4 border-b pb-2 ${isDark ? 'text-accent border-accent/10' : 'text-blue-600 border-blue-500/10'}`}>Auction Log</h3>
      <div className="overflow-y-auto flex-grow pr-2 custom-scrollbar">
        <ul className="space-y-3">
          {state.auctionLog.map((log, index) => (
            <li key={index} className={`flex items-start text-[10px] font-black uppercase tracking-tight animate-fade-in ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>
                <span className="mr-3 mt-0.5"><LogIcon type={log.type} /></span>
                <span className="leading-relaxed">{log.message}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default AuctionLog;
