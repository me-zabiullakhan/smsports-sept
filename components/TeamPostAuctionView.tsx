
import React from 'react';
import { Team } from '../types';
import { Download, Trophy, Users, Wallet, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
    team: Team;
}

const TeamPostAuctionView: React.FC<Props> = ({ team }) => {
    const navigate = useNavigate();

    const handleDownload = () => {
        // CSV Generation Logic
        const headers = ["Player Name", "Category", "Role", "Sold Price"];
        const rows = team.players.map(p => [
            `"${p.name}"`, // Quote strings to handle commas
            `"${p.category}"`,
            `"${p.speciality || p.category}"`, 
            p.soldPrice || 0
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map(row => row.join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${team.name.replace(/\s+/g, '_')}_Squad_List.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Calculate totals based on actual soldPrice in squad list
    const totalSpent = team.players.reduce((sum, p) => sum + (Number(p.soldPrice) || 0), 0);

    return (
        <div className="container mx-auto p-2 md:p-8 max-w-6xl">
            
            <button onClick={() => navigate('/')} className="mb-4 md:mb-6 flex items-center text-gray-500 hover:text-blue-600 transition-colors text-sm md:text-base">
                <ArrowLeft className="w-4 h-4 mr-2"/> Back to Home
            </button>

            <div className="bg-white rounded-xl md:rounded-2xl shadow-xl md:shadow-2xl overflow-hidden border border-gray-200">
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 md:p-8 text-white flex flex-col md:flex-row justify-between items-center relative overflow-hidden text-center md:text-left">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                    
                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-4 md:gap-6">
                        {team.logoUrl ? (
                            <img src={team.logoUrl} className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-white p-2 border-4 border-white/20 shadow-xl object-contain"/>
                        ) : (
                            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-blue-600 flex items-center justify-center text-3xl md:text-4xl font-bold shadow-xl border-4 border-white/20">
                                {team.name.charAt(0)}
                            </div>
                        )}
                        <div>
                            <div className="inline-block bg-green-500/20 border border-green-500/30 px-3 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider text-green-400 mb-2">
                                Auction Completed
                            </div>
                            <h1 className="text-2xl md:text-4xl font-bold mb-1">{team.name}</h1>
                            <p className="text-slate-400 text-sm md:text-base">Official Squad List</p>
                        </div>
                    </div>
                    
                    <div className="mt-6 md:mt-0 relative z-10">
                        <Trophy className="w-16 h-16 md:w-20 md:h-20 text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
                    </div>
                </div>

                {/* Statistics Grid - Compact on mobile */}
                <div className="grid grid-cols-3 gap-0 border-b border-gray-200 divide-x divide-gray-200 bg-gray-50">
                    <div className="p-3 md:p-6 flex flex-col items-center text-center">
                        <div className="bg-blue-100 p-2 md:p-3 rounded-full mb-2 md:mb-3 text-blue-600">
                            <Users className="w-4 h-4 md:w-6 md:h-6" />
                        </div>
                        <span className="text-gray-500 text-[10px] md:text-xs uppercase font-bold tracking-widest">Players</span>
                        <span className="text-lg md:text-3xl font-black text-gray-800 mt-1">{team.players.length}</span>
                    </div>
                    <div className="p-3 md:p-6 flex flex-col items-center text-center">
                        <div className="bg-red-100 p-2 md:p-3 rounded-full mb-2 md:mb-3 text-red-600">
                            <Wallet className="w-4 h-4 md:w-6 md:h-6" />
                        </div>
                        <span className="text-gray-500 text-[10px] md:text-xs uppercase font-bold tracking-widest">Spent</span>
                        <span className="text-lg md:text-3xl font-black text-gray-800 mt-1">{totalSpent}</span>
                    </div>
                    <div className="p-3 md:p-6 flex flex-col items-center text-center">
                        <div className="bg-green-100 p-2 md:p-3 rounded-full mb-2 md:mb-3 text-green-600">
                            <Wallet className="w-4 h-4 md:w-6 md:h-6" />
                        </div>
                        <span className="text-gray-500 text-[10px] md:text-xs uppercase font-bold tracking-widest">Remaining</span>
                        <span className="text-lg md:text-3xl font-black text-green-600 mt-1">{team.budget}</span>
                    </div>
                </div>

                {/* Squad Table */}
                <div className="p-4 md:p-8">
                    <div className="flex flex-col sm:flex-row justify-between items-center mb-4 md:mb-6 gap-3">
                        <h3 className="text-lg md:text-xl font-bold text-gray-800 border-l-4 border-blue-600 pl-3">Purchased Players</h3>
                        <button 
                            onClick={handleDownload} 
                            className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg flex items-center justify-center font-bold shadow-md transition-all hover:shadow-lg active:scale-95 text-sm md:text-base"
                        >
                            <Download className="w-4 h-4 md:w-5 md:h-5 mr-2" /> Download Excel
                        </button>
                    </div>
                    
                    <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
                        <table className="w-full text-left border-collapse min-w-[500px]">
                            <thead className="bg-gray-100 text-gray-500 text-xs uppercase font-bold tracking-wider">
                                <tr>
                                    <th className="p-3 md:p-4 border-b border-gray-200">#</th>
                                    <th className="p-3 md:p-4 border-b border-gray-200">Player Name</th>
                                    <th className="p-3 md:p-4 border-b border-gray-200">Category</th>
                                    <th className="p-3 md:p-4 border-b border-gray-200 text-right">Sold Price</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {team.players.length > 0 ? team.players.map((p, idx) => (
                                    <tr key={idx} className="hover:bg-blue-50/50 transition-colors text-sm md:text-base">
                                        <td className="p-3 md:p-4 text-gray-400 font-mono">{String(idx + 1).padStart(2, '0')}</td>
                                        <td className="p-3 md:p-4">
                                            <div className="font-bold text-gray-800">{p.name}</div>
                                        </td>
                                        <td className="p-3 md:p-4">
                                            <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-md font-medium border border-gray-200 whitespace-nowrap">
                                                {p.category}
                                            </span>
                                        </td>
                                        <td className="p-3 md:p-4 text-right">
                                            <span className="font-mono font-bold text-green-700 text-base md:text-lg">
                                                {p.soldPrice || 0}
                                            </span>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-gray-400 italic">
                                            No players were purchased by this team.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeamPostAuctionView;
