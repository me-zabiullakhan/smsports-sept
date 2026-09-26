import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { AuctionSetup, RegistrationConfig, FormField, PlayerRole } from '../types';
import { Upload, Calendar, CheckCircle, AlertTriangle, ArrowUpCircle, FileText, Home, ArrowLeft, Loader2, CreditCard, QrCode, ShieldCheck, AlignLeft, Sword, Shield, Trophy as TrophyIcon, Zap, Megaphone, Users, XCircle, X, Phone, MapPin, Clock, Trophy, Share2, ChevronRight, ChevronLeft, User, Info, ChevronDown, Award, Star, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuction } from '../hooks/useAuction';
import { compressImage, uploadImageOrFallback } from '../utils';

const TournamentFileInput = ({ label, value, onChange, required, theme }: any) => {
    const fileRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const isNavyGolden = theme?.toUpperCase() === 'NAVY_GOLDEN';
    const isClassicNeon = theme?.toUpperCase() === 'CLASSIC_NEON';
    const isAdvaya = theme?.toUpperCase() === 'ADVAYA';

    const containerClasses = isClassicNeon
        ? "w-full bg-[#050807] border-2 border-white/10 rounded-2xl p-4 transition-all hover:border-[#A6FF00]/40"
        : isNavyGolden 
        ? "w-full bg-[#070B0A] border-2 border-[#A6FF00]/20 rounded-2xl p-4 transition-all hover:border-[#A6FF00]/40"
        : isAdvaya
        ? "w-full bg-black/40 border-2 border-amber-900/30 rounded-2xl p-4 transition-all hover:border-amber-500/40"
        : "w-full bg-white border-2 border-gray-200 rounded-2xl p-4 shadow-sm";

    const labelClasses = isClassicNeon
        ? "text-[10px] font-black uppercase tracking-[0.2em] text-[#A6FF00]/70 flex items-center gap-1.5"
        : isNavyGolden
        ? "text-[10px] font-black uppercase tracking-widest text-[#A6FF00]/60 flex items-center gap-1.5"
        : isAdvaya
        ? "text-[10px] font-black uppercase tracking-widest text-amber-500/70 flex items-center gap-1.5"
        : "text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-1.5";

    return (
        <div className={`relative w-full space-y-2 ${containerClasses}`}>
            <label className={labelClasses}>
                <span>{label}</span>
                {required && <span className="text-red-500 font-bold">*</span>}
            </label>
            <div 
                onClick={() => !uploading && fileRef.current?.click()}
                className={`border-2 border-dashed ${isClassicNeon || isNavyGolden ? 'border-[#A6FF00]/30 hover:border-[#A6FF00]' : 'border-amber-500/30 hover:border-amber-500'} rounded-xl p-3 text-center cursor-pointer transition-all flex items-center justify-center gap-3`}
            >
                {uploading ? (
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                        <Loader2 className="w-4 h-4 animate-spin text-[#A6FF00]" />
                        <span>Uploading...</span>
                    </div>
                ) : value ? (
                    <div className="flex items-center gap-3">
                        {typeof value === 'string' && (value.startsWith('http') || value.startsWith('data:')) && (
                            <img src={value} className="w-8 h-8 object-cover rounded-lg" alt="Preview" />
                        )}
                        <span className="text-xs font-black uppercase text-green-400 flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Attached
                        </span>
                        <span className="text-[9px] font-bold text-slate-500 uppercase">(Click to replace)</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold">
                        <Upload className="w-4 h-4" />
                        <span>Upload File (Any size allowed)</span>
                    </div>
                )}
            </div>
            <input 
                ref={fileRef}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                        setUploading(true);
                        try {
                            const url = await uploadImageOrFallback(f, 'general', 'custom_file', 'GENERAL');
                            onChange({ target: { value: url } });
                        } catch (err) {
                            console.warn("Custom file upload failed:", err);
                        } finally {
                            setUploading(false);
                            if (e.target) e.target.value = '';
                        }
                    }
                }}
            />
        </div>
    );
};

const TournamentDropdown = ({ 
    label, 
    value, 
    onChange, 
    options = [], 
    required = false, 
    placeholder = "", 
    theme = "ADVAYA" 
}: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const isNavyGolden = theme?.toUpperCase() === 'NAVY_GOLDEN';
    const isClassicNeon = theme?.toUpperCase() === 'CLASSIC_NEON';
    const isAdvaya = theme?.toUpperCase() === 'ADVAYA';

    const selectedLabel = value || '';
    const hasValue = Boolean(value);

    // Close dropdown smoothly on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent | TouchEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, []);

    // Theme-based styling
    const containerClasses = isClassicNeon
        ? "w-full bg-[#050807] border-2 border-white/10 rounded-2xl transition-all"
        : isNavyGolden 
        ? "w-full bg-[#070B0A] border-2 border-[#A6FF00]/20 rounded-2xl transition-all"
        : isAdvaya
        ? "w-full bg-black/40 border-2 border-amber-900/30 rounded-2xl transition-all"
        : "w-full bg-white border-2 border-gray-200 rounded-2xl transition-all shadow-sm";

    const activeBorderClass = isOpen
        ? (isClassicNeon || isNavyGolden
            ? "border-[#A6FF00] shadow-[0_0_20px_rgba(166,255,0,0.25)]"
            : isAdvaya
            ? "border-amber-500 shadow-[0_0_20px_rgba(251,191,36,0.25)]"
            : "border-blue-500 shadow-md shadow-blue-500/20")
        : (isClassicNeon || isNavyGolden
            ? "hover:border-[#A6FF00]/40"
            : isAdvaya
            ? "hover:border-amber-500/40"
            : "hover:border-blue-300");

    const labelClasses = isClassicNeon
        ? "text-[10px] font-black uppercase tracking-[0.2em] text-[#A6FF00]/70 flex items-center gap-1.5"
        : isNavyGolden
        ? "text-[10px] font-black uppercase tracking-widest text-[#A6FF00]/60 flex items-center gap-1.5"
        : isAdvaya
        ? "text-[10px] font-black uppercase tracking-widest text-amber-500/70 flex items-center gap-1.5"
        : "text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-1.5";

    const badgeClasses = isClassicNeon || isNavyGolden
        ? "bg-[#A6FF00]/20 text-[#A6FF00] border border-[#A6FF00]/30"
        : isAdvaya
        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
        : "bg-blue-50 text-blue-600 border border-blue-200";

    const handleSelectOption = (opt: string) => {
        onChange({ target: { value: opt } });
        setIsOpen(false);
    };

    return (
        <div ref={dropdownRef} className={`relative w-full ${containerClasses} ${activeBorderClass}`}>
            {/* The Dropdown Trigger at the exact same place */}
            <button
                type="button"
                onClick={() => setIsOpen(prev => !prev)}
                className="w-full text-left p-4 flex items-center justify-between gap-3 cursor-pointer outline-none focus:outline-none select-none"
                aria-expanded={isOpen}
            >
                <div className="flex-1 min-w-0 space-y-1">
                    <label className={labelClasses}>
                        <span>{label}</span>
                        {required && <span className="text-red-500 font-bold">*</span>}
                    </label>
                    <div className="flex items-center gap-2">
                        {hasValue ? (
                            <span className={`text-sm font-black uppercase tracking-wide truncate ${
                                isClassicNeon || isNavyGolden ? 'text-white' : isAdvaya ? 'text-amber-100' : 'text-gray-800'
                            }`}>
                                {selectedLabel}
                            </span>
                        ) : (
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                {placeholder || 'SELECT OPTION'}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {hasValue && (
                        <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg flex items-center gap-1 ${badgeClasses}`}>
                            <Check className="w-3 h-3" />
                            <span className="hidden sm:inline">Selected</span>
                        </span>
                    )}
                    <div className={`p-1.5 rounded-xl border transition-all ${
                        isOpen 
                            ? (isClassicNeon || isNavyGolden 
                                ? 'bg-[#A6FF00] text-black border-[#A6FF00]' 
                                : isAdvaya 
                                ? 'bg-amber-500 text-black border-amber-500' 
                                : 'bg-blue-600 text-white border-blue-600')
                            : (isClassicNeon || isNavyGolden
                                ? 'bg-white/5 text-white/60 border-white/10'
                                : isAdvaya
                                ? 'bg-white/5 text-amber-500/60 border-amber-900/30'
                                : 'bg-gray-100 text-gray-500 border-gray-200')
                    }`}>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                </div>
            </button>

            {/* In-place Dropdown Options - Rendered right there itself, ZERO popups */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-t border-white/5"
                    >
                        <div className="p-3 pt-2 space-y-1.5 max-h-60 overflow-y-auto">
                            {options.length > 0 ? (
                                options.map((opt: string, idx: number) => {
                                    const isSelected = value === opt;
                                    return (
                                        <button
                                            key={`dropdown-opt-${label}-${opt}-${idx}`}
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleSelectOption(opt);
                                            }}
                                            className={`w-full px-4 py-3 rounded-xl text-left text-xs font-black uppercase tracking-wider flex items-center justify-between border-2 transition-all cursor-pointer ${
                                                isSelected
                                                    ? (isClassicNeon || isNavyGolden
                                                        ? 'bg-[#A6FF00] border-[#A6FF00] text-black shadow-[0_0_15px_rgba(166,255,0,0.3)] font-black'
                                                        : isAdvaya
                                                        ? 'bg-amber-600 border-amber-600 text-black shadow-[0_0_15px_rgba(251,191,36,0.3)] font-black'
                                                        : 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20 font-black')
                                                    : (isClassicNeon || isNavyGolden
                                                        ? 'bg-[#0F1413] border-white/5 text-white/80 hover:bg-[#A6FF00]/10 hover:border-[#A6FF00]/40 hover:text-white'
                                                        : isAdvaya
                                                        ? 'bg-black/40 border-amber-900/20 text-amber-100/80 hover:bg-amber-500/10 hover:border-amber-500/40 hover:text-white'
                                                        : 'bg-gray-50 border-gray-100 text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700')
                                            }`}
                                        >
                                            <span className="truncate">{opt}</span>
                                            {isSelected ? (
                                                <Check className="w-4 h-4 shrink-0" />
                                            ) : (
                                                <span className="text-[10px] opacity-40 uppercase">Select</span>
                                            )}
                                        </button>
                                    );
                                })
                            ) : (
                                <div className="py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                                    No options available
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const TournamentInput = ({ label, value, onChange, type = "text", required = false, placeholder = "", options = [], theme = "ADVAYA" }: any) => {
    const isNavyGolden = theme?.toUpperCase() === 'NAVY_GOLDEN';
    const isClassicNeon = theme?.toUpperCase() === 'CLASSIC_NEON';
    
    const baseClasses = isClassicNeon
        ? "w-full bg-[#050807] border-2 border-white/10 rounded-2xl px-6 py-4 pt-10 font-bold text-white outline-none transition-all focus:border-[#A6FF00] focus:shadow-[0_0_20px_rgba(166,255,0,0.3)] peer cursor-pointer"
        : isNavyGolden 
        ? "w-full bg-[#070B0A] border-2 border-[#A6FF00]/20 rounded-2xl px-6 py-4 pt-10 font-bold text-white outline-none transition-all focus:border-[#A6FF00] focus:shadow-[0_0_15px_rgba(166,255,0,0.2)] peer cursor-pointer"
        : "w-full bg-black/40 border-2 border-amber-900/30 rounded-2xl px-6 py-4 pt-10 font-bold text-amber-100 outline-none transition-all focus:border-amber-500 focus:shadow-[0_0_15px_rgba(251,191,36,0.2)] peer cursor-pointer";

    const labelClasses = isClassicNeon
        ? "absolute left-6 top-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/40 transition-all peer-focus:text-[#A6FF00] pointer-events-none select-none max-w-[calc(100%-3rem)] truncate z-10"
        : isNavyGolden
        ? "absolute left-6 top-2 text-[10px] font-black uppercase tracking-widest text-[#A6FF00]/50 transition-all peer-focus:text-[#A6FF00] pointer-events-none select-none max-w-[calc(100%-3rem)] truncate z-10"
        : "absolute left-6 top-2 text-[10px] font-black uppercase tracking-widest text-amber-500/50 transition-all peer-focus:text-amber-500 pointer-events-none select-none max-w-[calc(100%-3rem)] truncate z-10";

    if (type === 'select') {
        return (
            <TournamentDropdown
                label={label}
                value={value}
                onChange={onChange}
                options={options}
                required={required}
                placeholder={placeholder}
                theme={theme}
            />
        );
    }

    if (type === 'file') {
        return (
            <TournamentFileInput
                label={label}
                value={value}
                onChange={onChange}
                required={required}
                theme={theme}
            />
        );
    }

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative group"
        >
            {type === 'textarea' ? (
                <textarea 
                    required={required}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    rows={4}
                    className={`${baseClasses} min-h-[120px] resize-none`}
                />
            ) : (
                <input 
                    type={type}
                    required={required}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    className={baseClasses}
                />
            )}
            <label className={labelClasses}>
                {label} {required && <span className="text-red-500">*</span>}
            </label>
        </motion.div>
    );
};

const TournamentCard = ({ children, title, icon: Icon, className = "", theme = "ADVAYA" }: any) => {
    const isNavyGolden = theme === 'NAVY_GOLDEN';
    const isClassicNeon = theme === 'CLASSIC_NEON';
    
    return (
        <div className={isClassicNeon
            ? `bg-[#0F1413] border-2 border-[#A6FF00]/5 rounded-[2rem] p-8 relative overflow-hidden group shadow-2xl ${className}`
            : isNavyGolden 
            ? `bg-[#070B0A] border-2 border-[#A6FF00]/20 rounded-[2.5rem] p-8 relative overflow-hidden group ${className}`
            : `bg-black/60 border-2 border-amber-900/20 rounded-[2.5rem] p-8 relative overflow-hidden group ${className}`
        }>
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                <Icon className="w-24 h-24" />
            </div>
            <h3 className={isClassicNeon || isNavyGolden
                ? "text-[11px] font-black text-[#A6FF00] uppercase tracking-[0.4em] mb-8 flex items-center gap-3 drop-shadow-[0_0_15px_rgba(166,255,0,0.3)]"
                : `text-[11px] font-black ${isClassicNeon ? 'text-[#A6FF00]' : 'text-amber-500'} uppercase tracking-[0.3em] mb-8 flex items-center gap-3`
            }>
                <Icon className="w-4 h-4" /> {title}
            </h3>
            <div className="relative z-10 space-y-6">
                {children}
            </div>
        </div>
    );
};

const JerseyPreview = ({ name, number, auctionLogo, theme, season, viewMode = 'back', jerseyUrl, jerseyOverlayUrl }: { name: string, number: string, auctionLogo?: string, theme?: string, season?: any, viewMode?: 'front' | 'back', jerseyUrl?: string, jerseyOverlayUrl?: string }) => {
    const isNavyGolden = theme === 'NAVY_GOLDEN';
    const isClassicNeon = theme === 'CLASSIC_NEON';
    
    return (
        <div className={`relative w-full aspect-[4/5] max-w-[350px] mx-auto perspective-1000 group`}>
            <AnimatePresence mode="wait">
                <motion.div 
                    key={`${viewMode}-${name}-${number}`}
                    initial={{ rotateY: -90, opacity: 0 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    exit={{ rotateY: 90, opacity: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className={`w-full h-full relative rounded-[3rem] overflow-hidden shadow-2xl border-4 ${
                        isClassicNeon 
                        ? 'border-[#A6FF00]/40 shadow-[#A6FF00]/10 bg-[#070B0A]' 
                        : isNavyGolden 
                        ? 'border-[#A6FF00]/30 shadow-[#A6FF00]/20 bg-[#121212]' 
                        : 'border-amber-500/30 shadow-amber-500/20 bg-amber-950'
                    }`}
                >
                    {/* Jersey Image Background */}
                    {jerseyUrl && (
                        <div className="absolute inset-0 z-0 flex items-center justify-center p-4">
                            <img src={jerseyUrl} referrerPolicy="no-referrer" className="w-full h-full object-contain" alt="Jersey Base" />
                        </div>
                    )}

                    {/* Jersey Overlay Image - Put it above Name/Number for texture */}
                    {jerseyOverlayUrl && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center p-4">
                            <img src={jerseyOverlayUrl} referrerPolicy="no-referrer" className="w-full h-full object-contain pointer-events-none" alt="Jersey Overlay" />
                        </div>
                    )}

                    {/* Texture Pattern */}
                    {!jerseyUrl && <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/micro-carbon.png')] mix-blend-overlay z-[15]" />}
                    
                    {/* Design Elements */}
                    {!jerseyUrl && <div className={`absolute top-0 left-0 w-full h-full z-[12] ${
                        isClassicNeon ? "bg-[radial-gradient(circle_at_top,#A6FF0005_0%,transparent_70%)]" : ""
                    }`} />}

                    {viewMode === 'back' ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center pt-16 font-sans z-[18]">
                            <motion.h4 
                                key={name}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-3xl md:text-4xl font-black uppercase tracking-[0.2em] italic text-[#00FF41] mb-0 px-6 text-center"
                            >
                                {name || "NAME"}
                            </motion.h4>
                            <div className="w-24 h-1 mt-2 mb-8 bg-[#00FF41]" />
                            <motion.div 
                                key={number}
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="text-[9rem] md:text-[10rem] font-black leading-none tracking-tighter text-[#00FF41] font-sans italic"
                            >
                                {number || "00"}
                            </motion.div>
                        </div>
                    ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-start pt-16 font-sans z-[18]">
                            {/* Collar & Shoulder Stripes */}
                            {!jerseyUrl && (
                                <>
                                    <div className="absolute top-0 w-full h-24 bg-gradient-to-b from-[#A6FF00]/10 to-transparent" />
                                    <div className="w-full h-8 flex justify-between px-6 absolute top-0">
                                        <div className="w-12 h-1 bg-[#A6FF00]" />
                                        <div className="w-12 h-1 bg-[#A6FF00]" />
                                    </div>
                                </>
                            )}

                            {auctionLogo && (
                                <motion.img 
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    src={auctionLogo} 
                                    referrerPolicy="no-referrer"
                                    className="w-28 h-28 object-contain drop-shadow-[0_0_20px_rgba(166,255,0,0.3)] mb-8 relative z-10" 
                                />
                            )}
                            
                            <div className={`text-xs font-black italic tracking-[0.4em] ${jerseyUrl ? 'text-[#00FF41]' : isClassicNeon ? 'text-[#A6FF00]' : 'text-white/60'} mb-6 uppercase relative z-10`}>
                                TOURNAMENT SELECTION
                            </div>

                            <div className="relative">
                                <div className={`text-[8rem] font-black leading-none ${jerseyUrl ? 'text-[#00FF41]/10' : isClassicNeon ? 'text-white/5 blur-[2px]' : 'text-white/5'}`}>
                                    {number || "00"}
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center text-center">
                                    <h4 className={`text-4xl font-black italic tracking-tighter drop-shadow-2xl uppercase ${jerseyUrl ? 'text-[#00FF41]' : 'text-white'}`}>
                                        {season ? `SEASON ${season.toString().replace(/[^0-9]/g, '') || season}` : ""}
                                    </h4>
                                </div>
                            </div>

                            <div className="mt-auto mb-10 text-center px-8">
                                <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${jerseyUrl ? 'text-[#00FF41]' : 'text-white'}`}>
                                    {isClassicNeon ? 'PLAY SMART' : 'REGISTRATION OPEN'}
                                </p>
                                <div className={`w-12 h-0.5 mx-auto ${jerseyUrl ? 'bg-[#00FF41]' : 'bg-[#A6FF00]'}`} />
                            </div>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
            <div className={`absolute -bottom-8 left-1/2 -translate-x-1/2 w-[70%] h-6 bg-black/60 blur-2xl rounded-full group-hover:w-[85%] group-hover:h-8 group-hover:blur-3xl transition-all duration-700`} />
        </div>
    );
};

const TournamentDetailCard = ({ icon: Icon, title, value, description, theme, isClassicNeon }: any) => {
    const isNavyGolden = theme === 'NAVY_GOLDEN';
    
    return (
        <motion.div 
            whileHover={{ y: -5, scale: 1.02, boxShadow: isClassicNeon ? "0 20px 40px rgba(166,255,0,0.1)" : "" }}
            className={`${isClassicNeon ? 'bg-gradient-to-b from-[#0F1413] to-[#050807] shadow-xl shadow-black/60' : isNavyGolden ? 'bg-[#001f3f]/60' : 'bg-black/60'} border-2 ${isClassicNeon ? 'border-white/5 hover:border-[#A6FF00]/50' : isNavyGolden ? 'border-[#ffd700]/20' : 'border-amber-900/20'} rounded-[2.5rem] p-8 text-center relative overflow-hidden group transition-all duration-300`}
        >
            <div className="relative z-10">
                <div className={`w-16 h-16 ${isClassicNeon ? 'bg-gradient-to-br from-[#A6FF00] to-[#FFFFFF] border-white/20' : isNavyGolden ? 'bg-[#A6FF00]/10 border-[#A6FF00]/20' : 'bg-amber-500/10 border-amber-500/20'} rounded-2xl flex items-center justify-center mx-auto mb-5 border transition-transform duration-500 group-hover:scale-110 shadow-lg`}>
                    <Icon className={`w-8 h-8 ${isClassicNeon ? 'text-black' : (isClassicNeon || isNavyGolden) ? 'text-[#A6FF00] drop-shadow-[0_0_8px_rgba(166,255,0,0.5)]' : 'text-amber-50'}`} />
                </div>
                <h4 className={`text-[10px] font-black uppercase tracking-[0.3em] mb-3 ${isClassicNeon ? 'text-white' : (isClassicNeon || isNavyGolden) ? 'text-[#A6FF00]' : 'text-slate-500'}`}>{title}</h4>
                <p className={`text-2xl font-black uppercase tracking-tight italic mb-2 ${isClassicNeon ? 'text-[#A6FF00] drop-shadow-[0_0_10px_rgba(166,255,0,0.4)]' : 'text-amber-50'}`}>{value}</p>
                <p className={`text-[9px] font-bold text-slate-500 uppercase tracking-widest ${isClassicNeon ? 'opacity-80' : ''}`}>{description}</p>
            </div>
            {isClassicNeon && <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-[#A6FF00] to-transparent opacity-40" />}
        </motion.div>
    );
};

const PlayerRegistration: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { state } = useAuction();
    const [auction, setAuction] = useState<AuctionSetup | null>(null);
    const [config, setConfig] = useState<RegistrationConfig | null>(null);
    const [roles, setRoles] = useState<PlayerRole[]>([]);
    const [dbPromoCodes, setDbPromoCodes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [isRazorpayLoaded, setIsRazorpayLoaded] = useState(false);
    const [showBattleEntrance, setShowBattleEntrance] = useState(false);
    const [battleStarted, setBattleStarted] = useState(false);
    const [showWelcomePopup, setShowWelcomePopup] = useState(false);
    const [welcomeTimer, setWelcomeTimer] = useState(0);
    const [hasSeenWelcome, setHasSeenWelcome] = useState(false);
    const [showPoster, setShowPoster] = useState(false);
    const [agreedToRules, setAgreedToRules] = useState(false);
    const [approvedCount, setApprovedCount] = useState(0);
    const [poolPlayerCount, setPoolPlayerCount] = useState(0);
    const [isClosed, setIsClosed] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [playerID, setPlayerID] = useState('');
    const [waitlistSuccess, setWaitlistSuccess] = useState(false);
    const [showAdLocal, setShowAdLocal] = useState(true);

    const handleWaitlistSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id) return;
        setSubmitting(true);
        try {
            await db.collection('auctions').doc(id).collection('waitlist').add({
                fullName: formData.fullName,
                mobile: formData.mobile,
                submittedAt: Date.now()
            });
            setWaitlistSuccess(true);
        } catch (err: any) {
            handleFirestoreError(err, 'JOIN_WAITLIST', `auctions/${id}/waitlist`);
        } finally {
            setSubmitting(false);
        }
    };

    useEffect(() => {
        if (!id) return;
        const unsubscribe = db.collection('auctions').doc(id).collection('registrations')
            .where('status', '==', 'APPROVED')
            .onSnapshot(snapshot => {
                setApprovedCount(snapshot.size);
            }, err => {
                console.error("Error monitoring registration count:", err);
                // Don't alert here to avoid spamming the user on page load if it's a minor sync issue
            });
        return () => unsubscribe();
    }, [id]);

    useEffect(() => {
        if (!id) return;
        const unsubscribe = db.collection('auctions').doc(id).collection('players')
            .onSnapshot(snapshot => {
                setPoolPlayerCount(snapshot.size);
            }, err => {
                console.error("Error monitoring player pool count:", err);
            });
        return () => unsubscribe();
    }, [id]);

    // Captain Registration State
    const [isCaptain, setIsCaptain] = useState<boolean | null>(null);
    const [hasTeamCode, setHasTeamCode] = useState<boolean | null>(null);
    const [captainCode, setCaptainCode] = useState('');
    const [teamCode, setTeamCode] = useState('');
    const [codeStatus, setCodeStatus] = useState<{ type: 'success' | 'error' | 'loading' | null, message: string }>({ type: null, message: '' });
    const [teamCodeStatus, setTeamCodeStatus] = useState<{ type: 'success' | 'error' | 'loading' | null, message: string }>({ type: null, message: '' });
    const [validatedCode, setValidatedCode] = useState<any>(null);
    const [validatedTeamCode, setValidatedTeamCode] = useState<any>(null);

    // Organizer Registration Codes State
    const [organiserCode, setOrganiserCode] = useState('');
    const [organiserCodeStatus, setOrganiserCodeStatus] = useState<{ type: 'success' | 'error' | 'loading' | null, message: string }>({ type: null, message: '' });
    const [validatedOrganiserCode, setValidatedOrganiserCode] = useState<any>(null);
    const [showOrganiserCodeEntry, setShowOrganiserCodeEntry] = useState(false);

    const totalSlots = config?.maxRegistrations || 36;
    const reserveCount = config?.reserveSlotsEnabled && config?.reserveSlotsCount ? config.reserveSlotsCount : 0;
    const effectiveLimit = Math.max(0, totalSlots - reserveCount);
    const isFull = poolPlayerCount >= effectiveLimit;
    const displayCount = poolPlayerCount;
    const displayMax = totalSlots;

    useEffect(() => {
        if (config?.isEnabled) {
            const isManuallyClosed = config?.registrationStatus === 'CLOSED';
            if ((isFull || isManuallyClosed) && !isCaptain && !hasTeamCode && !validatedOrganiserCode) {
                setIsClosed(true);
            } else {
                setIsClosed(false);
            }
        }
    }, [isFull, isCaptain, hasTeamCode, config?.isEnabled, config?.registrationStatus, validatedOrganiserCode]);

    const [formData, setFormData] = useState<any>({
        fullName: '', playerType: '', gender: '', mobile: '', dob: '', battleOath: false,
        jerseyName: '', jerseyNumber: '', jerseySize: ''
    });
    const [profilePic, setProfilePic] = useState<string>('');
    const [paymentScreenshot, setPaymentScreenshot] = useState<string>('');
    const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
    const [isUploadingPayment, setIsUploadingPayment] = useState<boolean>(false);
    const [jerseyViewMode, setJerseyViewMode] = useState<'front' | 'back'>('back');
    const profileInputRef = useRef<HTMLInputElement>(null);
    const paymentInputRef = useRef<HTMLInputElement>(null);

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploadingPhoto(true);
        try {
            // Immediate local preview for zero-delay UX
            const previewReader = new FileReader();
            previewReader.onload = () => {
                if (typeof previewReader.result === 'string' && previewReader.result) {
                    setProfilePic(previewReader.result);
                }
            };
            previewReader.readAsDataURL(file);

            // Fast compression & upload: <=1MB untouched; >1MB compressed to 1MB (not less)
            const url = await uploadImageOrFallback(file, id || 'general', 'player_photo', 'PROFILE');
            if (url) {
                setProfilePic(url);
            }
        } catch (err: any) {
            console.error("Photo upload error:", err);
            alert("Could not process photo. Please try again.");
        } finally {
            setIsUploadingPhoto(false);
            if (e.target) e.target.value = '';
        }
    };

    const handlePaymentProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploadingPayment(true);
        try {
            // Immediate local preview for zero-delay UX
            const previewReader = new FileReader();
            previewReader.onload = () => {
                if (typeof previewReader.result === 'string' && previewReader.result) {
                    setPaymentScreenshot(previewReader.result);
                }
            };
            previewReader.readAsDataURL(file);

            // Fast compression & upload: <=1MB untouched; >1MB compressed to 1MB (not less)
            const url = await uploadImageOrFallback(file, id || 'general', 'payment_proof', 'PAYMENT');
            if (url) {
                setPaymentScreenshot(url);
            }
        } catch (err: any) {
            console.error("Payment proof upload error:", err);
            alert("Could not process payment proof. Please try again.");
        } finally {
            setIsUploadingPayment(false);
            if (e.target) e.target.value = '';
        }
    };

    // Promo / Coupon Code states
    const [promoInput, setPromoInput] = useState('');
    const [promoError, setPromoError] = useState('');
    const [promoSuccess, setPromoSuccess] = useState('');
    const [appliedDiscount, setAppliedDiscount] = useState(0);
    const [couponCode, setCouponCode] = useState('');
    const [isCouponApplied, setIsCouponApplied] = useState(false);

    const isAdvaya = config?.theme?.toUpperCase() === 'ADVAYA';
    const isNavyGolden = config?.theme?.toUpperCase() === 'NAVY_GOLDEN';
    const isClassicNeon = config?.theme?.toUpperCase() === 'CLASSIC_NEON';

    const discountAmount = isCouponApplied 
        ? appliedDiscount 
        : (validatedOrganiserCode ? (config?.fee || 0) : 0);
    const finalFee = Math.max(0, (config?.fee || 0) - discountAmount);

    useEffect(() => {
        if (config) {
            // Priority 1: Poster takes precedence if provided
            if (config.welcomePosterUrl) {
                setShowPoster(true);
                setShowBattleEntrance(false);
                setBattleStarted(false);
            } 
            // Priority 2: Classic Neon - Remove its theme-specific welcome page per user request
            else if (isClassicNeon) {
                setShowPoster(false);
                setShowBattleEntrance(false);
                setBattleStarted(true);
            }
            // Priority 3: Default behavior for other themes
            else if (isAdvaya || isNavyGolden) {
                setShowPoster(false);
                setShowBattleEntrance(true);
                setBattleStarted(false);
            }
            else {
                // Non-themed or default
                setShowPoster(false);
                setShowBattleEntrance(false);
                setBattleStarted(true);
            }
        }
    }, [config, isClassicNeon, isAdvaya, isNavyGolden]);

    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.onload = () => setIsRazorpayLoaded(true);
        document.body.appendChild(script);
        return () => { if (document.body.contains(script)) document.body.removeChild(script); };
    }, []);

    useEffect(() => {
        if (config?.welcomePopup?.isEnabled && !loading && !error) {
            setShowWelcomePopup(true);
            setWelcomeTimer(config.welcomePopup.autoCloseTimer);
        }
    }, [config, loading, error]);

    useEffect(() => {
        let timer: any;
        if (showWelcomePopup && welcomeTimer > 0) {
            timer = setTimeout(() => {
                setWelcomeTimer(prev => prev - 1);
            }, 1000);
        } else if (showWelcomePopup && welcomeTimer === 0) {
            setShowWelcomePopup(false);
        }
        return () => clearTimeout(timer);
    }, [showWelcomePopup, welcomeTimer]);

    useEffect(() => {
        const fetchAuction = async () => {
            if (!id) return;
            try {
                // Initial fetch attempt
                let docSnap;
                try {
                    docSnap = await db.collection('auctions').doc(id).get();
                } catch (snapErr: any) {
                    if (snapErr.code === 'permission-denied' && !auth.currentUser) {
                        console.log("Permission denied for public auction read, attempting anonymous sign-in...");
                        try {
                            await auth.signInAnonymously();
                            docSnap = await db.collection('auctions').doc(id).get();
                        } catch (authErr) {
                            throw snapErr; // Re-throw original permission error if login fails
                        }
                    } else {
                        throw snapErr;
                    }
                }

                if (docSnap && docSnap.exists) {
                    const data = docSnap.data() as AuctionSetup;
                    setAuction(data);
                    const regConfig = data.registrationConfig;
                    if (regConfig?.isEnabled) {
                        setConfig(regConfig);
                        if (regConfig.theme === 'ADVAYA') {
                            setShowBattleEntrance(true);
                            if (regConfig.hideLandingPage) {
                                setBattleStarted(true);
                            }
                            if (regConfig.bannerUrl) {
                                setShowPoster(true);
                            }
                        }
                        
                        // Initialize dynamic fields
                        const dynamicDefaults: any = {};
                        (regConfig.customFields || []).forEach(f => {
                            dynamicDefaults[f.id] = '';
                        });
                        setFormData((prev: any) => ({ ...prev, ...dynamicDefaults }));

                        // Fetch initial player pool and approved count - be resilient to permission errors
                        try {
                            const [playersSnap, regSnap] = await Promise.all([
                                db.collection('auctions').doc(id).collection('players').get(),
                                db.collection('auctions').doc(id).collection('registrations')
                                    .where('status', '==', 'APPROVED')
                                    .get()
                            ]);
                            setPoolPlayerCount(playersSnap.size);
                            setApprovedCount(regSnap.size);
                            
                            const currentReserveCount = regConfig.reserveSlotsEnabled && regConfig.reserveSlotsCount ? regConfig.reserveSlotsCount : 0;
                            const currentEffectiveLimit = Math.max(0, (regConfig.maxRegistrations || 36) - currentReserveCount);
                            const isManuallyClosed = regConfig.registrationStatus === 'CLOSED';
                            if (isManuallyClosed || (regConfig.maxRegistrations > 0 && playersSnap.size >= currentEffectiveLimit)) {
                                setIsClosed(true);
                            }
                        } catch (regErr) {
                            console.warn("Could not fetch player pool or registration count, assuming available slots:", regErr);
                        }
                    }
                    else {
                        setIsClosed(true);
                        if (regConfig) setConfig(regConfig);
                    }
                } else setError("Auction not found.");
            } catch (e: any) { 
                console.error("Fetch Auction Error:", e);
                if (e.code === 'permission-denied') {
                    setError("This auction registration form is private or restricted. Please contact the organizer if you believe this is an error.");
                } else {
                    setError(e.message || "Failed to load form. Please refresh the page.");
                }
            }
            finally { setLoading(false); }
        };
        fetchAuction();

        // Real-time roles fetching
        const unsubRoles = db.collection('auctions').doc(id).collection('roles').onSnapshot(snap => {
            setRoles(snap.docs.map(d => ({ id: d.id, ...d.data() } as PlayerRole)));
        }, err => {
            console.error("Error fetching roles:", err);
        });

        // Real-time promo/registration codes fetching
        const unsubPromo = db.collection('auctions').doc(id).collection('registrationCodes').onSnapshot(snap => {
            const activeDbCodes = snap.docs
                .map(d => ({ id: d.id, ...d.data() } as any))
                .filter(code => code.isActive && (!code.usageLimit || (code.currentUsage || 0) < code.usageLimit));
            setDbPromoCodes(activeDbCodes);
        }, err => {
            console.warn("Could not load registration codes from database:", err);
        });

        return () => {
            unsubRoles();
            unsubPromo();
        };
    }, [id]);

    const validateCaptainCode = async (code: string) => {
        if (!code || !id) return;
        setCodeStatus({ type: 'loading', message: 'Verifying Code...' });
        try {
            const snap = await db.collection('auctions').doc(id).collection('captainCodes')
                .where('code', '==', code.toUpperCase())
                .get();
            
            if (snap.empty) {
                setCodeStatus({ type: 'error', message: 'Invalid Captain Code' });
                setValidatedCode(null);
                return;
            }

            const codeData = { id: snap.docs[0].id, ...snap.docs[0].data() } as any;
            
            if (!codeData.isActive) {
                setCodeStatus({ type: 'error', message: 'This code is inactive' });
                setValidatedCode(null);
            } else if (codeData.currentUsage >= codeData.usageLimit) {
                setCodeStatus({ type: 'error', message: 'This code has already been used' });
                setValidatedCode(null);
            } else {
                setCodeStatus({ type: 'success', message: 'Captain verified successfully!' });
                setValidatedCode(codeData);
                // Auto-fill name if assigned
                if (codeData.assignedTo && codeData.assignedTo.trim() !== '' && codeData.assignedTo.toLowerCase() !== 'general code') {
                    setFormData(prev => ({ ...prev, fullName: codeData.assignedTo }));
                }
            }
        } catch (err) {
            setCodeStatus({ type: 'error', message: 'Verification failed' });
        }
    };

    const validateOrganiserCode = async (code: string) => {
        if (!code || !id) return;
        setOrganiserCodeStatus({ type: 'loading', message: 'Verifying Registration Code...' });
        try {
            const snap = await db.collection('auctions').doc(id).collection('registrationCodes')
                .where('code', '==', code.toUpperCase())
                .get();

            if (snap.empty) {
                setOrganiserCodeStatus({ type: 'error', message: 'Invalid Registration Code' });
                setValidatedOrganiserCode(null);
                return;
            }

            const codeData = { id: snap.docs[0].id, ...snap.docs[0].data() } as any;

            if (!codeData.isActive) {
                setOrganiserCodeStatus({ type: 'error', message: 'This code is inactive' });
                setValidatedOrganiserCode(null);
            } else if (codeData.currentUsage >= codeData.usageLimit) {
                setOrganiserCodeStatus({ type: 'error', message: 'This code has reached its usage limit' });
                setValidatedOrganiserCode(null);
            } else {
                setOrganiserCodeStatus({ type: 'success', message: 'Registration Code accepted! Loading form...' });
                setValidatedOrganiserCode(codeData);
                // Auto-fill name if assigned
                if (codeData.assignedTo && codeData.assignedTo.trim() !== '' && codeData.assignedTo.toLowerCase() !== 'general code') {
                    setFormData(prev => ({ ...prev, fullName: codeData.assignedTo }));
                }
                // Automatically open form
                setIsClosed(false);
            }
        } catch (err) {
            setOrganiserCodeStatus({ type: 'error', message: 'Verification failed' });
        }
    };

    const validateTeamCode = async (code: string) => {
        if (!code || !id) return;
        setTeamCodeStatus({ type: 'loading', message: 'Verifying Team Code...' });
        try {
            // Since we have unique codes per player, we need to find the captain code that contains this specific player code
            const snap = await db.collection('auctions').doc(id).collection('captainCodes').get();
            
            let foundCodeData: any = null;
            let specificPlayerCode: any = null;

            snap.docs.forEach(doc => {
                const data = doc.data() as any;
                const playerCode = data.teamCodes?.find((tc: any) => tc.code === code.toUpperCase());
                if (playerCode) {
                    foundCodeData = { id: doc.id, ...data };
                    specificPlayerCode = playerCode;
                }
            });
            
            if (!foundCodeData) {
                setTeamCodeStatus({ type: 'error', message: 'Invalid Team Code' });
                setValidatedTeamCode(null);
                return;
            }

            if (!foundCodeData.isActive) {
                setTeamCodeStatus({ type: 'error', message: 'This team code is no longer active' });
                setValidatedTeamCode(null);
            } else if (specificPlayerCode.isUsed) {
                setTeamCodeStatus({ type: 'error', message: 'This specific player code has already been used' });
                setValidatedTeamCode(null);
            } else {
                setTeamCodeStatus({ type: 'success', message: 'Team code applied successfully!' });
                // We store the specific code as well so we know which one to mark as used
                setValidatedTeamCode({ ...foundCodeData, usedSpecificCode: code.toUpperCase() });
                // Auto-fill team name if applicable
                if (foundCodeData.teamName) {
                    setFormData(prev => ({ ...prev, teamName: foundCodeData.teamName }));
                }
            }
        } catch (err) {
            setTeamCodeStatus({ type: 'error', message: 'Verification failed' });
        }
    };

    const handleApplyPromo = async (codeToApply: string) => {
        const cleanCode = codeToApply.trim().toUpperCase();
        if (!cleanCode) {
            setPromoError('Please enter a coupon code.');
            setPromoSuccess('');
            return;
        }
        
        setPromoError('');
        setPromoSuccess('Verifying code...');
        
        // 1. Check Master Promo Codes (Hardcoded fallback for admin)
        const masterCodes = ['ADMIN100', 'FREE100', 'ORGANIZER100'];
        if (masterCodes.includes(cleanCode)) {
            setAppliedDiscount(config?.fee || 0);
            setCouponCode(cleanCode);
            setIsCouponApplied(true);
            setPromoSuccess(`100% Discount Applied! Fee is now ₹0.`);
            setPromoError('');
            return;
        }
        
        if (cleanCode === 'DISCOUNT50') {
            const halfFee = Math.round((config?.fee || 0) / 2);
            setAppliedDiscount(halfFee);
            setCouponCode(cleanCode);
            setIsCouponApplied(true);
            setPromoSuccess(`50% Discount Applied! Fee is now ₹${Math.max(0, (config?.fee || 0) - halfFee)}.`);
            setPromoError('');
            return;
        }

        // 2. Check Database Registration Codes
        try {
            const snap = await db.collection('auctions').doc(id).collection('registrationCodes')
                .where('code', '==', cleanCode)
                .get();

            if (snap.empty) {
                setPromoError('Invalid coupon or registration code.');
                setPromoSuccess('');
                setAppliedDiscount(0);
                setIsCouponApplied(false);
                setCouponCode('');
                return;
            }

            const codeData = { id: snap.docs[0].id, ...snap.docs[0].data() } as any;

            if (!codeData.isActive) {
                setPromoError('This code is inactive.');
                setPromoSuccess('');
                return;
            } 
            
            if (codeData.currentUsage >= codeData.usageLimit) {
                setPromoError('This code has reached its usage limit.');
                setPromoSuccess('');
                return;
            }

            // Valid DB registration code!
            setOrganiserCodeStatus({ type: 'success', message: 'Registration Code accepted!' });
            setValidatedOrganiserCode(codeData);
            
            // Apply 100% discount
            setAppliedDiscount(config?.fee || 0);
            setCouponCode(cleanCode);
            setIsCouponApplied(true);
            setPromoSuccess('Organizer Registration Code Accepted! 100% Discount Applied.');
            setPromoError('');
        } catch (err) {
            setPromoError('Verification failed. Please try again.');
            setPromoSuccess('');
        }
    };

    const handleRemovePromo = () => {
        setPromoInput('');
        setPromoError('');
        setPromoSuccess('');
        setAppliedDiscount(0);
        setIsCouponApplied(false);
        setCouponCode('');
        if (validatedOrganiserCode && !showOrganiserCodeEntry) {
            setValidatedOrganiserCode(null);
        }
    };

    const handleFirestoreError = (error: any, operation: string, path: string) => {
        const errInfo = {
            error: error.message || String(error),
            operation,
            path,
            authInfo: {
                userId: auth.currentUser?.uid,
                email: auth.currentUser?.email,
                emailVerified: auth.currentUser?.emailVerified,
                isAnonymous: auth.currentUser?.isAnonymous
            }
        };
        console.error(`Firestore Error [${operation}]:`, JSON.stringify(errInfo));
        alert(`Error: ${error.message || "Missing or insufficient permissions."}`);
    };

    const submitToFirebase = async (razorpayId?: string) => {
        if (!id) return;
        setSubmitting(true);
        try {
            const generatedID = `WAR-${Math.floor(1000 + Math.random() * 9000)}`;
            setPlayerID(generatedID);
            const isAutoApprove = !!config?.autoApprove;
            const submissionData = {
                ...formData, 
                profilePic,
                // Avoid duplicating full base64 string to keep document size well under Firestore's 1MB limit
                photoUrl: profilePic && profilePic.startsWith('http') ? profilePic : '',
                playerID: generatedID,
                isCaptain: !!isCaptain,
                captainCode: isCaptain ? captainCode.toUpperCase() : '',
                teamCode: hasTeamCode ? teamCode.toUpperCase() : '',
                registeredViaCode: (isCaptain && !!validatedCode) || (hasTeamCode && !!validatedTeamCode) || !!validatedOrganiserCode,
                organiserCode: validatedOrganiserCode ? validatedOrganiserCode.code.toUpperCase() : '',
                paymentScreenshot: config?.paymentMethod === 'MANUAL' && finalFee > 0 ? (paymentScreenshot || '') : '',
                paymentScreenshotUrl: config?.paymentMethod === 'MANUAL' && finalFee > 0 && paymentScreenshot.startsWith('http') ? paymentScreenshot : '',
                razorpayPaymentId: finalFee > 0 ? (razorpayId || '') : 'Bypassed (Promo Applied)',
                discountApplied: discountAmount || 0,
                finalFeePaid: finalFee || 0,
                promoCodeUsed: couponCode || (validatedOrganiserCode ? validatedOrganiserCode.code : ''),
                submittedAt: Date.now(), 
                status: isAutoApprove ? 'APPROVED' : 'PENDING'
            };
            
            // Clean submissionData of any undefined fields which cause Firestore errors
            const cleanSubmissionData = JSON.parse(JSON.stringify(submissionData));

            // Hard safety check: ensure document payload stays safely within Firestore's 1,048,576 bytes limit
            // Never crush down to tiny 35KB; allow full ~950KB for crystal-clear images
            let currentPayloadSize = JSON.stringify(cleanSubmissionData).length;
            if (currentPayloadSize > 1000000) {
                const hasBoth = !!(cleanSubmissionData.profilePic && cleanSubmissionData.paymentScreenshot);
                const targetLen = hasBoth ? 480000 : 950000;
                if (cleanSubmissionData.profilePic && cleanSubmissionData.profilePic.startsWith('data:') && cleanSubmissionData.profilePic.length > targetLen) {
                    cleanSubmissionData.profilePic = await compressImage(cleanSubmissionData.profilePic, { type: 'PROFILE', maxDataUrlLength: targetLen });
                }
                if (cleanSubmissionData.paymentScreenshot && cleanSubmissionData.paymentScreenshot.startsWith('data:') && cleanSubmissionData.paymentScreenshot.length > targetLen) {
                    cleanSubmissionData.paymentScreenshot = await compressImage(cleanSubmissionData.paymentScreenshot, { type: 'PAYMENT', maxDataUrlLength: targetLen });
                }
            }

            // If photoUrl is still empty and document payload has room, set photoUrl to profilePic for legacy queries
            if (!cleanSubmissionData.photoUrl && cleanSubmissionData.profilePic && JSON.stringify(cleanSubmissionData).length + cleanSubmissionData.profilePic.length < 1000000) {
                cleanSubmissionData.photoUrl = cleanSubmissionData.profilePic;
            }

            const regRef = db.collection('auctions').doc(id).collection('registrations');
            await regRef.add(cleanSubmissionData);

            if (isAutoApprove) {
                try {
                    const newPlayer = {
                        name: formData.fullName,
                        photoUrl: profilePic,
                        category: 'Standard',
                        role: formData.playerType,
                        basePrice: auction?.basePrice || 0,
                        nationality: 'India',
                        speciality: formData.playerType,
                        stats: { matches: 0, runs: 0, wickets: 0 }
                    };
                    await db.collection('auctions').doc(id).collection('players').add(newPlayer);
                } catch (playerAddErr) {
                    console.error("Error auto-adding approved player to pool:", playerAddErr);
                }
            }
            
            // 5. Update Code Usage if applicable
            if (isCaptain && validatedCode) {
                try {
                    console.log("Attempting to update captain code usage for:", validatedCode.id);
                    const codeRef = db.collection('auctions').doc(id).collection('captainCodes').doc(validatedCode.id);
                    
                    await db.runTransaction(async (transaction) => {
                        const codeDoc = await transaction.get(codeRef);
                        if (!codeDoc.exists) {
                            throw new Error("Captain code document not found during update");
                        }
                        const currentVal = codeDoc.data()?.currentUsage || 0;
                        transaction.update(codeRef, { 
                            currentUsage: currentVal + 1 
                        });
                    });
                    console.log("Captain code usage updated successfully via transaction");
                } catch (codeErr) {
                    console.error("Error updating captain code usage:", codeErr);
                }
            }

            if (hasTeamCode && validatedTeamCode) {
                try {
                    console.log("Attempting to update team code usage for:", validatedTeamCode.id);
                    const codeRef = db.collection('auctions').doc(id).collection('captainCodes').doc(validatedTeamCode.id);
                    
                    await db.runTransaction(async (transaction) => {
                        const codeDoc = await transaction.get(codeRef);
                        if (!codeDoc.exists) {
                            throw new Error("Team code document not found during update");
                        }
                        
                        const data = codeDoc.data();
                        const currentTeamCodes = data?.teamCodes || [];
                        const updatedTeamCodes = currentTeamCodes.map((tc: any) => 
                            tc.code === teamCode ? { ...tc, isUsed: true, usedBy: submissionData.fullName } : tc
                        );
                        const currentTeamUsed = data?.teamUsedCount || 0;
                        
                        transaction.update(codeRef, {
                            teamUsedCount: currentTeamUsed + 1,
                            teamCodes: updatedTeamCodes
                        });
                    });
                    console.log("Team code usage updated successfully via transaction");
                } catch (teamErr) {
                    console.error("Error updating team code usage:", teamErr);
                }
            }

            // Update Organizer Code Usage if applicable
            if (validatedOrganiserCode) {
                try {
                    console.log("Attempting to update organiser registration code usage for:", validatedOrganiserCode.id);
                    const codeRef = db.collection('auctions').doc(id).collection('registrationCodes').doc(validatedOrganiserCode.id);
                    
                    await db.runTransaction(async (transaction) => {
                        const codeDoc = await transaction.get(codeRef);
                        if (!codeDoc.exists) {
                            throw new Error("Registration code document not found during update");
                        }
                        const data = codeDoc.data();
                        const currentVal = data?.currentUsage || 0;
                        const redemptions = data?.redemptions || [];
                        
                        transaction.update(codeRef, { 
                            currentUsage: currentVal + 1,
                            redemptions: [
                                ...redemptions,
                                {
                                    playerName: formData.fullName,
                                    registeredAt: Date.now(),
                                    registrationID: generatedID
                                }
                            ]
                        });
                    });
                    console.log("Organizer registration code usage updated successfully via transaction");
                } catch (codeErr) {
                    console.error("Error updating organiser registration code usage:", codeErr);
                }
            }

            setSuccess(true);
        } catch (e: any) { 
            handleFirestoreError(e, 'CREATE_REGISTRATION', `auctions/${id}/registrations`);
        }
        finally { setSubmitting(false); }
    };

    const handleRazorpayModal = () => {
        if (!isRazorpayLoaded) { alert("Payment system not ready."); setSubmitting(false); return; }
        const options = {
            key: config?.razorpayKey || "", 
            amount: finalFee * 100, 
            currency: "INR",
            name: auction?.title || "Tournament Registration",
            description: `Player Enrollment Fee`,
            image: config?.logoUrl || '',
            handler: (res: any) => submitToFirebase(res.razorpay_payment_id),
            prefill: { 
                name: formData.fullName, 
                contact: formData.mobile,
                email: ''
            },
            theme: { color: (isClassicNeon || isNavyGolden) ? "#A6FF00" : "#fbbf24" },
            modal: { ondismiss: () => setSubmitting(false) }
        };
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // 1. Check Slot Availability
        if (isFull && !isCaptain && !hasTeamCode && !validatedOrganiserCode) {
            return alert("Registrations are currently full. Only Captains, Team members, or Players with direct Organizer codes can register.");
        }

        // 2. Code Validation
        if (isCaptain && (!validatedCode || validatedCode.code !== captainCode.toUpperCase())) {
            return alert("Please verify your captain code again.");
        }

        if (hasTeamCode && (!validatedTeamCode || validatedTeamCode.usedSpecificCode !== teamCode.toUpperCase())) {
            return alert("Please verify your team code again.");
        }
        if (hasTeamCode && !validatedTeamCode) {
            return alert("Please verify a valid team code first.");
        }
        if (validatedOrganiserCode && validatedOrganiserCode.code !== organiserCode.toUpperCase()) {
            return alert("Please verify your registration code again.");
        }

        // 3. Comprehensive Field Validation
        const missingFields: string[] = [];
        
        // Basic Fields (Config Driven)
        const basicFields = config?.basicFields || {
            name: { show: true, required: true },
            dob: { show: true, required: true },
            photo: { show: true, required: true },
            mobile: { show: true, required: true },
            gender: { show: true, required: true },
            role: { show: true, required: true }
        };

        if (basicFields.name?.required !== false && !formData.fullName?.trim()) missingFields.push("Full Name");
        if (basicFields.mobile?.required !== false && !formData.mobile?.trim()) missingFields.push("Mobile Number");
        if (basicFields.dob?.required !== false && !formData.dob) missingFields.push("Date of Birth");
        if (basicFields.gender?.required !== false && !formData.gender) missingFields.push("Gender");
        if (basicFields.role?.required !== false && !formData.playerType) missingFields.push("Player Role");
        if (basicFields.photo?.required !== false && !profilePic) missingFields.push("Player Photo");

        // Custom Fields
        (config?.customFields || []).forEach(field => {
            if (field.required && !formData[field.id]) {
                missingFields.push(field.label);
            }
        });

        // Jersey Details
        if (config?.jerseyDetailsEnabled) {
            const jerseyFields = config.jerseyFields || {
                name: { show: true, required: true },
                number: { show: true, required: true },
                size: { show: true, required: true }
            };
            if (jerseyFields.name?.show && jerseyFields.name?.required && !formData.jerseyName?.trim()) missingFields.push("Name on Jersey");
            if (jerseyFields.number?.show && jerseyFields.number?.required && !formData.jerseyNumber) missingFields.push("Number on Jersey");
            if (jerseyFields.size?.show && jerseyFields.size?.required && !formData.jerseySize) missingFields.push("Jersey Size");
        }

        // Payment
        if (config?.includePayment && finalFee > 0) {
            if (config.paymentMethod === 'MANUAL' && !paymentScreenshot) {
                missingFields.push("Payment Proof/Screenshot");
            }
        }

        // Tournament Terms
        if (!formData.battleOath) {
            missingFields.push("Tournament Terms Acceptance");
        }

        if (missingFields.length > 0) {
            return alert(`The following required fields are missing:\n\n• ${missingFields.join('\n• ')}`);
        }

        setSubmitting(true);
        
        // Handle Razorpay if enabled
        if (config?.includePayment && config.paymentMethod === 'RAZORPAY' && finalFee > 0) {
            handleRazorpayModal();
            return;
        }

        await submitToFirebase();
    };

    if (loading) return <div className={`min-h-screen flex items-center justify-center ${isClassicNeon ? 'bg-[#070B0A]' : 'bg-slate-900'} text-white`}><Loader2 className={`animate-spin w-10 h-10 ${isClassicNeon ? 'text-[#A6FF00]' : 'text-amber-500'}`}/></div>;
    if (error) return <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900"><div className="bg-white p-8 rounded-[2rem] shadow-2xl text-center max-w-md border-4 border-red-500/20"><h2 className="text-2xl font-black mb-2 text-red-600 uppercase tracking-tighter">Access Denied</h2><p className="font-bold text-gray-500 uppercase text-xs tracking-widest">{error}</p></div></div>;

    if (isClosed) {
        return (
            <div className={`min-h-screen flex items-center justify-center p-4 ${isClassicNeon ? 'bg-[#070B0A]' : isAdvaya ? 'bg-[#0a0a0a]' : 'bg-slate-900'}`}>
                <div className={`${isClassicNeon ? 'bg-[#0F1413] border-[#A6FF00]/30 text-white' : isAdvaya ? 'bg-[#151515] border-amber-500/30 text-amber-50' : 'bg-white text-gray-800'} p-10 rounded-[2.5rem] shadow-2xl text-center max-w-md border-4 animate-fade-in`}>
                    <div className={`w-20 h-20 ${isClassicNeon ? 'bg-[#A6FF00]/10' : isAdvaya ? 'bg-amber-500/10' : 'bg-orange-50'} rounded-full flex items-center justify-center mx-auto mb-6`}>
                        <XCircle className={`w-10 h-10 ${isClassicNeon ? 'text-[#A6FF00]' : isAdvaya ? 'text-amber-500' : 'text-orange-500'}`} />
                    </div>
                    <h2 className="text-2xl font-black mb-4 uppercase tracking-tighter">{isClassicNeon ? 'REGISTRATION CLOSED' : 'Registration Closed'}</h2>
                    <p className="font-bold text-gray-500 uppercase text-xs tracking-widest leading-relaxed mb-8">
                        {config?.closedMessage || "The registration limit has been reached or the form has been closed by the organizer."}
                    </p>

                    <div className={`mb-8 p-6 ${isClassicNeon ? 'bg-[#A6FF00]/5 border-[#A6FF00]/20' : 'bg-amber-500/5 border-amber-500/20'} rounded-3xl text-left`}>
                        <p className={`text-[10px] font-black ${isClassicNeon ? 'text-[#A6FF00]' : 'text-amber-500'} uppercase tracking-widest mb-4`}>Do you have a registration code provided by organizer?</p>
                        
                        {!showOrganiserCodeEntry ? (
                            <button 
                                type="button"
                                onClick={() => setShowOrganiserCodeEntry(true)}
                                className={`w-full py-4 ${isClassicNeon ? 'bg-[#A6FF00] hover:bg-[#b8ff33]' : 'bg-amber-500 hover:bg-amber-400'} text-black font-black rounded-2xl text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95`}
                            >
                                I have registration code
                            </button>
                        ) : (
                            <div className="space-y-4">
                                <div className="relative">
                                    <input 
                                        type="text"
                                        value={organiserCode}
                                        onChange={e => {
                                            setOrganiserCode(e.target.value.toUpperCase());
                                            setOrganiserCodeStatus({ type: null, message: '' });
                                        }}
                                        placeholder="ENTER REGISTRATION CODE"
                                        className={`w-full ${isClassicNeon ? 'bg-black/40 border-[#A6FF00]/30 text-white focus:border-[#A6FF00]' : 'bg-black/65 border-2 border-amber-950 text-amber-100 focus:border-amber-500'} rounded-2xl pl-5 pr-24 py-4 text-xs font-black outline-none uppercase font-mono`}
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => validateOrganiserCode(organiserCode)}
                                        className={`absolute right-2 top-2 bottom-2 ${isClassicNeon ? 'bg-[#A6FF00] hover:bg-[#b8ff33] text-black' : 'bg-amber-600 hover:bg-amber-500 text-white'} px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all`}
                                    >
                                        VERIFY
                                    </button>
                                </div>
                                
                                {organiserCodeStatus.type && (
                                    <p className={`text-[9px] font-black uppercase tracking-widest leading-relaxed ${
                                        organiserCodeStatus.type === 'success' ? 'text-green-400' :
                                        organiserCodeStatus.type === 'error' ? 'text-red-400' : 'text-amber-400'
                                    }`}>
                                        {organiserCodeStatus.message}
                                    </p>
                                )}
                                
                                <button
                                    type="button"
                                    onClick={() => setShowOrganiserCodeEntry(false)}
                                    className="text-[9px] font-black text-gray-400 hover:text-white uppercase tracking-widest transition-colors block text-center w-full"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>

                    {config?.enableWaitlist ? (
                        <form onSubmit={handleWaitlistSubmit} className="space-y-4 text-left">
                            <div className="text-center mb-4">
                                <p className={`text-[10px] font-black ${isClassicNeon ? 'text-[#A6FF00]' : 'text-amber-500'} uppercase tracking-[0.2em] mb-1`}>Join Waitlist</p>
                                {config?.waitlistMessage && (
                                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed">
                                        {config.waitlistMessage}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Full Name</label>
                                <input 
                                    required
                                    className={`w-full px-5 py-4 rounded-2xl text-xs font-bold outline-none border-2 transition-all ${isClassicNeon ? 'bg-black border-[#A6FF00]/20 text-white focus:border-[#A6FF00]' : isAdvaya ? 'bg-black border-amber-900/30 text-amber-100 focus:border-amber-500' : 'bg-gray-50 border-gray-100 focus:border-blue-500'}`}
                                    value={formData.fullName}
                                    onChange={e => setFormData({...formData, fullName: e.target.value})}
                                    placeholder="Enter your name"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Mobile Number</label>
                                <input 
                                    required
                                    type="tel"
                                    className={`w-full px-5 py-4 rounded-2xl text-xs font-bold outline-none border-2 transition-all ${isClassicNeon ? 'bg-black border-[#A6FF00]/20 text-white focus:border-[#A6FF00]' : isAdvaya ? 'bg-black border-amber-900/30 text-amber-100 focus:border-amber-500' : 'bg-gray-50 border-gray-100 focus:border-blue-500'}`}
                                    value={formData.mobile}
                                    onChange={e => setFormData({...formData, mobile: e.target.value})}
                                    placeholder="Enter mobile number"
                                />
                            </div>
                            <button 
                                disabled={submitting}
                                type="submit"
                                className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3 ${isClassicNeon ? 'bg-[#A6FF00] hover:bg-[#b8ff33] text-black shadow-[0_0_20px_rgba(166,255,0,0.3)]' : isAdvaya ? 'bg-amber-600 hover:bg-amber-500 text-black' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                            >
                                {submitting ? <Loader2 className="animate-spin w-5 h-5" /> : <><Users className="w-5 h-5" /> Join Waitlist</>}
                            </button>
                            <button type="button" onClick={() => navigate('/')} className={`w-full py-4 text-[10px] font-black uppercase tracking-widest transition-colors ${isClassicNeon ? 'text-[#A6FF00]/50 hover:text-[#A6FF00]' : 'text-gray-500 hover:text-gray-400'}`}>Back to Portal</button>
                        </form>
                    ) : (
                        <button onClick={() => navigate('/')} className={`w-full font-black py-4 rounded-2xl uppercase tracking-widest shadow-xl active:scale-95 transition-all ${isClassicNeon ? 'bg-[#A6FF00] text-black shadow-[0_0_20px_rgba(166,255,0,0.3)]' : isAdvaya ? 'bg-amber-600 text-black' : 'bg-slate-900 text-white'}`}>Back to Portal</button>
                    )}
                </div>
            </div>
        );
    }

    if (waitlistSuccess) {
        return (
            <div className={`min-h-screen flex items-center justify-center p-4 ${isClassicNeon ? 'bg-[#070B0A]' : isAdvaya ? 'bg-[#0a0a0a]' : 'bg-slate-900'}`}>
                <div className={`${isClassicNeon ? 'bg-[#0F1413] border-[#A6FF00]/30 text-white' : isAdvaya ? 'bg-[#151515] border-amber-500/30 text-amber-50' : 'bg-white text-gray-800'} p-10 rounded-[2.5rem] shadow-2xl text-center max-w-md border-4 animate-fade-in`}>
                    <div className={`w-20 h-20 ${isClassicNeon ? 'bg-[#A6FF00]/10' : isAdvaya ? 'bg-amber-500/10' : 'bg-green-50'} rounded-full flex items-center justify-center mx-auto mb-6`}>
                        <CheckCircle className={`w-10 h-10 ${isClassicNeon ? 'text-[#A6FF00]' : isAdvaya ? 'text-amber-500' : 'text-green-500'}`} />
                    </div>
                    <h2 className="text-2xl font-black mb-4 uppercase tracking-tighter">{isClassicNeon ? 'WAITLIST CONFIRMED' : 'Waitlist Joined!'}</h2>
                    <p className="font-bold text-gray-500 uppercase text-xs tracking-widest leading-relaxed mb-8">
                        You've been added to the waitlist. We'll contact you if a slot becomes available.
                    </p>
                    <button onClick={() => navigate('/')} className={`w-full font-black py-5 rounded-2xl uppercase tracking-widest shadow-xl active:scale-95 transition-all ${isClassicNeon ? 'bg-[#A6FF00] text-black shadow-[0_0_20px_rgba(166,255,0,0.3)]' : isAdvaya ? 'bg-amber-600 text-black' : 'bg-blue-600 text-white'}`}>OK</button>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className={`min-h-screen flex items-center justify-center p-4 ${isClassicNeon ? 'bg-[#070B0A]' : isAdvaya ? 'bg-[#0a0a0a]' : 'bg-gray-50'}`}>
                <AnimatePresence>
                    {state.successAdPosterUrl && state.isAdPosterEnabled && showAdLocal && (
                         <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-4 overflow-hidden"
                         >
                            <div className="relative max-w-lg w-full">
                                <motion.button 
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    whileHover={{ scale: 1.1, rotate: 90 }}
                                    onClick={() => setShowAdLocal(false)}
                                    className="absolute -top-12 -right-2 md:-right-12 z-50 p-3 bg-red-600 text-white rounded-full shadow-2xl hover:bg-white hover:text-black transition-all"
                                >
                                    <XCircle className="w-8 h-8" />
                                </motion.button>
                                <motion.div
                                    initial={{ y: 50, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    className="rounded-[3rem] overflow-hidden border-4 border-white/20 shadow-[0_0_80px_rgba(255,255,255,0.1)]"
                                >
                                    <img src={state.successAdPosterUrl} className="w-full h-auto block" referrerPolicy="no-referrer" />
                                </motion.div>
                                <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.5em] text-center mt-6">SM SPORTS ADVERTISEMENT</p>
                            </div>
                         </motion.div>
                    )}
                </AnimatePresence>

                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`max-w-md w-full rounded-[3rem] p-10 text-center relative overflow-hidden border-2 shadow-2xl ${isClassicNeon ? 'bg-[#0F1413] border-white/10 text-white shadow-[#A6FF00]/5' : isAdvaya ? 'bg-[#151515] border-amber-500/30 text-amber-50' : 'bg-white border-blue-100 text-gray-900'}`}
                >
                    {isClassicNeon && <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#A6FF00] to-transparent pointer-events-none" />}
                    {isClassicNeon && <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(166,255,0,0.1)_0%,transparent_70%)] pointer-events-none" />}
                    {isAdvaya && !isClassicNeon && <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.15)_0%,transparent_70%)] pointer-events-none" />}
                    
                    <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border-2 ${isClassicNeon ? 'bg-gradient-to-br from-[#A6FF00] to-[#FFFFFF] border-white/20 shadow-[0_0_30px_rgba(166,255,0,0.4)]' : isAdvaya ? 'bg-amber-500/10 border-amber-500/20' : 'bg-green-50 border-green-100'}`}>
                        <CheckCircle className={`w-12 h-12 ${isClassicNeon ? 'text-black' : isAdvaya ? 'text-amber-500' : 'text-green-500'}`} />
                    </div>
                    
                    <h2 className={`text-3xl font-black uppercase tracking-tight mb-2 ${isClassicNeon ? 'text-white drop-shadow-[0_0_10px_rgba(166,255,0,0.3)]' : ''}`}>
                        {isClassicNeon ? 'VERIFICATION GRANTED!' : isAdvaya ? 'Battle Enrolled!' : 'Registration Successful!'}
                    </h2>
                    <p className={`text-[10px] font-black uppercase tracking-[0.3em] mb-8 ${isClassicNeon ? 'text-[#A6FF00]' : isAdvaya ? 'text-amber-500/50' : 'text-gray-400'}`}>
                        {isClassicNeon ? 'PLAYER IDENTITY AUTHENTICATED' : 'Registration Confirmed'}
                    </p>
                    
                    <div className="flex flex-wrap justify-center gap-2 mb-8">
                        {isCaptain && (
                            <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg ${isClassicNeon ? 'bg-[#A6FF00] text-black shadow-[#A6FF00]/20' : 'bg-amber-500 text-black shadow-amber-500/20'}`}>
                                <ShieldCheck className="w-4 h-4" /> Captain 🧑‍✈️
                            </div>
                        )}
                        {hasTeamCode && (
                            <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg ${isClassicNeon ? 'bg-[#A6FF00]/20 border border-[#A6FF00]/30 text-[#A6FF00] shadow-[#A6FF00]/10' : 'bg-blue-600 text-white shadow-blue-600/20'}`}>
                                <Users className="w-4 h-4" /> Team Player 🏏
                            </div>
                        )}
                    </div>

                    <div className={`p-8 rounded-[2rem] mb-8 border-2 ${isClassicNeon ? 'bg-black/60 border-[#A6FF00]/10' : isAdvaya ? 'bg-black/40 border-amber-500/10' : 'bg-gray-50 border-gray-100'}`}>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${isClassicNeon ? 'text-[#A6FF00]/60' : 'text-slate-500'} mb-2`}>
                            {isClassicNeon ? 'VERIFICATION STATUS' : isAdvaya ? 'Registry Status' : 'Registration Status'}
                        </p>
                        <p className={`text-2xl font-black uppercase tracking-tight leading-tight ${isAdvaya ? 'text-amber-500' : 'text-blue-600'}`}>
                            {config?.customSuccessMessage || (isAdvaya ? 'BATTLE ENROLLED' : 'SUCCESSFUL')}
                        </p>
                    </div>

                    <div className="space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                            Your Player ID: <span className={isAdvaya && !isClassicNeon && !isNavyGolden ? 'text-amber-200' : isClassicNeon ? 'text-[#A6FF00]' : 'text-gray-900'}>{playerID || 'PID-7782'}</span>
                        </p>
                        
                        {(config?.organizerContacts || []).length > 0 && (
                            <div className="space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Organizer Contacts</p>
                                 {(config?.organizerContacts || []).map((contact, idx) => (
                                    <div key={`contact-idx-${idx}`} className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${isAdvaya ? 'bg-amber-500/5 border-amber-500/10 text-amber-500/70' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
                                        <div className="flex items-center gap-3">
                                            <Phone className="w-4 h-4" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-inherit">{contact.name}</span>
                                        </div>
                                        <span className="text-[10px] font-black tracking-widest text-inherit">{contact.phone}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex items-center justify-center gap-4 pt-4">
                            <button 
                                onClick={() => {
                                    let baseUrl = window.location.origin;
                                    if (baseUrl.includes('-dev-')) {
                                        baseUrl = baseUrl.replace('-dev-', '-pre-');
                                    }
                                    const regUrl = `${baseUrl}/#/auction/${id}/register`;
                                    const text = `I just registered for ${auction?.title}! My Player ID is ${playerID}. Check it out here: ${regUrl}`;
                                    if (navigator.share) {
                                        navigator.share({ title: auction?.title, text, url: regUrl });
                                    } else {
                                        navigator.clipboard.writeText(text);
                                        alert("Registration details copied to clipboard!");
                                    }
                                }}
                                className={`p-4 rounded-2xl transition-all active:scale-90 ${isAdvaya ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}
                            >
                                <Share2 className="w-5 h-5" />
                            </button>
                            <button 
                                onClick={() => navigate('/')}
                                className={`flex-1 py-5 rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95 ${isAdvaya ? 'bg-amber-600 hover:bg-amber-500 text-black' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    const steps = [
        { id: 'details', label: isClassicNeon ? 'OVERVIEW' : isAdvaya ? 'Info' : 'Information' },
        { id: 'personal', label: isClassicNeon ? 'PROFILE' : isAdvaya ? 'Contact' : 'Details' },
        { id: 'role', label: isClassicNeon ? 'ROLE' : isAdvaya ? 'Role' : 'Position' },
        ...(config?.customFields && config.customFields.length > 0 ? [{ id: 'custom', label: isClassicNeon ? 'DETAILS' : isAdvaya ? 'Profile' : 'Skills' }] : []),
        ...(config?.jerseyDetailsEnabled ? [{ id: 'jersey', label: isClassicNeon ? 'KIT' : 'Jersey' }] : []),
        ...(config?.includePayment && config.paymentMethod === 'MANUAL' ? [{ id: 'payment', label: isClassicNeon ? 'PAYMENT' : isAdvaya ? 'Fee' : 'Payment' }] : []),
        { id: 'rules', label: isClassicNeon ? 'TERMS' : isAdvaya ? 'Rules' : 'Rules' }
    ];

    const currentStepId = steps[currentStep]?.id;

    const nextStep = () => {
        if (currentStep < steps.length - 1) setCurrentStep(prev => prev + 1);
    };

    const prevStep = () => {
        if (currentStep > 0) setCurrentStep(prev => prev - 1);
    };

    if (isAdvaya || isNavyGolden || isClassicNeon) {
        if (!battleStarted && !config?.hideLandingPage && !isClassicNeon) {
            return (
                <div className={`min-h-screen ${isClassicNeon ? 'bg-[#070B0A]' : isNavyGolden ? 'bg-[#000a1a]' : 'bg-[#0a0a0a]'} ${isClassicNeon ? 'text-white' : 'text-amber-50'} font-sans overflow-hidden relative particle-bg`}>
                    {/* Glowing Borders */}
                    <div className={`fixed inset-0 border-[12px] ${isClassicNeon || isNavyGolden ? 'border-[#A6FF00]/10' : 'border-amber-500/10'} pointer-events-none z-50`} />
                    <div className={`fixed inset-0 border-[1px] ${isClassicNeon || isNavyGolden ? 'border-[#A6FF00]/20' : 'border-amber-500/20'} pointer-events-none z-50 m-2`} />
                    
                    {/* Stadium Floodlights for Classic Neon */}
                    {isClassicNeon && (
                        <>
                            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-[#A6FF00]/5 blur-[120px] rounded-full -translate-x-1/2 -translate-y-1/2" />
                            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#A6FF00]/5 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2" />
                            <div className="absolute top-0 left-1/2 w-full h-[300px] bg-gradient-to-b from-[#A6FF00]/5 to-transparent -translate-x-1/2" />
                        </>
                    )}

                    {/* Particle Background Simulation */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        {[...Array(30)].map((_, i) => (
                            <motion.div
                                key={`landing-particle-${i}`}
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ 
                                    opacity: [0, 0.4, 0],
                                    scale: [0, 1.5, 0],
                                    x: [Math.random() * 100 + "%", Math.random() * 100 + "%"],
                                    y: [Math.random() * 100 + "%", Math.random() * 100 + "%"]
                                }}
                                transition={{ 
                                    duration: Math.random() * 8 + 5, 
                                    repeat: Infinity,
                                    ease: "linear"
                                }}
                                className={`absolute w-1 h-1 ${isClassicNeon || isNavyGolden ? 'bg-[#A6FF00]' : 'bg-amber-400'} rounded-full blur-[1px]`}
                            />
                        ))}
                    </div>

                    <AnimatePresence mode="wait">
                        {showPoster ? (
                            <motion.div 
                                key="poster"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.1 }}
                                className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-6"
                            >
                                <div className={`relative z-20 max-w-2xl w-full bg-black border-4 ${isClassicNeon || isNavyGolden ? 'border-[#A6FF00]/40 shadow-[0_0_50px_rgba(166,255,0,0.2)]' : 'border-amber-500/30 shadow-[0_0_50px_rgba(251,191,36,0.2)]'} rounded-[3rem] overflow-hidden`}>
                                    <div className="w-full overflow-y-auto max-h-[90vh] custom-scrollbar">
                                        <img src={config?.bannerUrl || null} className="w-full h-auto block" referrerPolicy="no-referrer" />
                                        
                                        {/* Showcase Gallery after Banner/Poster */}
                                        {config?.showcaseImages && config.showcaseImages.length > 0 && (
                                            <div className="p-8 space-y-12 bg-black/40">
                                                <div className="flex flex-col items-center gap-4">
                                                    <h3 className={`text-2xl font-black italic uppercase tracking-tighter text-center ${isClassicNeon || isNavyGolden ? 'text-[#A6FF00] drop-shadow-[0_0_10px_rgba(166,255,0,0.5)]' : 'text-amber-500'}`}>TOURNAMENT HIGHLIGHTS</h3>
                                                    <div className={`w-24 h-1 ${isClassicNeon || isNavyGolden ? 'bg-[#A6FF00]' : 'bg-amber-500'} rounded-full`} />
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                    {config.showcaseImages.map((showcase, sidx) => (
                                                        <motion.div 
                                                            key={`showcase-gallery-${sidx}`}
                                                            initial={{ opacity: 0, scale: 0.95 }}
                                                            whileInView={{ opacity: 1, scale: 1 }}
                                                            viewport={{ once: true }}
                                                            className={`relative rounded-[2rem] overflow-hidden border-2 ${isClassicNeon || isNavyGolden ? 'border-[#A6FF00]/30 shadow-[0_0_30px_rgba(166,255,0,0.15)]' : 'border-amber-900/30' } bg-black/60 group`}
                                                        >
                                                            <div className="aspect-[4/3] w-full overflow-hidden">
                                                                <img src={showcase.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
                                                            </div>
                                                            {showcase.caption && (
                                                                <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black via-black/90 to-transparent">
                                                                    <p className="text-white text-sm font-black uppercase italic tracking-wider leading-tight drop-shadow-lg">{showcase.caption}</p>
                                                                </div>
                                                            )}
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className={`p-8 bg-black/95 border-t ${isClassicNeon || isNavyGolden ? 'border-[#A6FF00]/30' : 'border-amber-500/20'} text-center`}>
                                            <button 
                                                onClick={() => setShowPoster(false)}
                                                className={`${isClassicNeon || isNavyGolden ? 'bg-[#A6FF00] hover:bg-[#b8ff33] text-black shadow-[0_0_30px_rgba(166,255,0,0.4)]' : 'bg-amber-600 hover:bg-amber-500 text-black shadow-[0_0_30px_rgba(251,191,36,0.4)]'} font-black px-12 py-5 rounded-full text-lg uppercase tracking-widest transition-all shadow-2xl flex items-center gap-4 mx-auto active:scale-95`}
                                            >
                                                REGISTER NOW
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="hero"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="relative z-10 min-h-screen w-full max-w-7xl mx-auto flex flex-col items-center justify-start text-center p-6 pt-12"
                            >
                                <div className={`absolute inset-0 bg-[radial-gradient(circle_at_center,${isClassicNeon ? 'rgba(166,255,0,0.1)' : isNavyGolden ? 'rgba(255,215,0,0.08)' : 'rgba(251,191,36,0.08)'}_0%,transparent_70%)]`} />
                                
                                {isClassicNeon ? (
                                    <div className="w-full flex-1 flex flex-col items-center justify-center space-y-12">
                                        <div className="w-full flex flex-col md:flex-row items-center justify-between gap-6">
                                           {config?.logoUrl && (
                                                <img src={config.logoUrl} referrerPolicy="no-referrer" className="w-24 h-24 md:w-32 md:h-32 object-contain drop-shadow-[0_0_20px_rgba(166,255,0,0.4)]" />
                                           )}
                                           <div className="text-center md:text-right">
                                               <p className="text-[#A6FF00] font-black text-xs md:text-base tracking-[0.4em] mb-1">MAN OF THE SERIES</p>
                                               <h2 className="text-3xl md:text-6xl font-black text-white italic truncate uppercase">WINS A BIKE</h2>
                                           </div>
                                        </div>

                                        <div className="relative w-full max-w-4xl py-6">
                                            <div className="absolute inset-0 bg-[#A6FF00]/10 blur-[120px] rounded-full animate-pulse" />
                                            <img 
                                                src="https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&q=80&w=1200" 
                                                referrerPolicy="no-referrer"
                                                className="w-full max-w-2xl mx-auto rounded-[3rem] border-4 border-[#A6FF00]/20 shadow-[0_0_80px_rgba(166,255,0,0.2)] object-cover h-[300px] md:h-[450px]"
                                            />
                                            <div className="absolute inset-0 flex flex-col justify-center pointer-events-none">
                                                <h3 className="text-4xl md:text-8xl font-black text-white italic pl-4 md:pl-12 text-left leading-none uppercase">
                                                    {auction?.season && `SEASON ${auction.season}`}
                                                </h3>
                                                <div className="text-right pr-4 md:pr-12 space-y-2 mt-4">
                                                    <h1 className="text-5xl md:text-9xl font-black text-[#A6FF00] italic leading-none drop-shadow-[0_0_30px_rgba(166,255,0,0.5)] uppercase">PLAY HARD</h1>
                                                    <h1 className="text-4xl md:text-8xl font-black text-white italic leading-none uppercase">WIN BIG!</h1>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="w-full flex flex-col md:flex-row items-center justify-between gap-8 pt-8">
                                            <div className="text-left">
                                                <div className="flex gap-2 mb-2 text-[#A6FF00]"><Star size={16} fill="currentColor" /><Star size={16} fill="currentColor" /><Star size={16} fill="currentColor" /></div>
                                                <p className="text-white font-black text-sm md:text-xl tracking-[0.2em] uppercase">ONE TOURNAMENT. ONE CHAMPION. ONE BIKE.</p>
                                            </div>
                                            <motion.button
                                                whileHover={{ scale: 1.05, boxShadow: "0 0 80px rgba(166,255,0,0.5)" }}
                                                onClick={() => setBattleStarted(true)}
                                                className="bg-[#A6FF00] text-black font-black px-12 py-5 rounded-full text-xl uppercase tracking-widest flex items-center gap-4 transition-all border-4 border-[#A6FF00]/50"
                                            >
                                                START <ChevronRight size={24} />
                                            </motion.button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {/* 1. Logo Placement */}
                                        {config?.logoUrl && (
                                            <motion.div 
                                                initial={{ y: -50, opacity: 0 }}
                                                animate={{ y: 0, opacity: 1 }}
                                                transition={{ duration: 1 }}
                                                className="relative mb-4 z-20"
                                            >
                                                <div className={`absolute inset-0 ${isClassicNeon || isNavyGolden ? 'bg-[#A6FF00]' : 'bg-amber-500'} rounded-full blur-[60px] opacity-20 animate-pulse`}></div>
                                                <img 
                                                    src={config.logoUrl} 
                                                    className={`w-32 h-32 md:w-48 md:h-48 mx-auto object-contain ${isClassicNeon || isNavyGolden ? 'drop-shadow-[0_0_20px_rgba(166,255,0,0.5)]' : 'drop-shadow-[0_0_20px_rgba(251,191,36,0.5)]'}`} 
                                                    referrerPolicy="no-referrer"
                                                />
                                            </motion.div>
                                        )}
        
                                        {/* 2. Tagline Below Logo */}
                                        <motion.p 
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.5 }}
                                            className={`${isClassicNeon || isNavyGolden ? 'text-[#A6FF00]' : 'golden-text'} font-cinzel font-black text-sm md:text-2xl uppercase tracking-[0.6em] mb-12 drop-shadow-[0_0_10px_rgba(166,255,0,0.5)]`}
                                        >
                                            THE STAGE FOR CRICKET
                                        </motion.p>
                                        {/* 3. Main Banner Section */}
                                        <motion.div
                                            initial={{ scale: 0.9, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ delay: 0.8, duration: 1 }}
                                            className={`cinematic-frame border-beam-container max-w-4xl w-full p-1 md:p-2 mb-12 group ${isClassicNeon || isNavyGolden ? 'shadow-[0_0_60px_rgba(166,255,0,0.2)] border-[#A6FF00]/30' : 'shadow-[0_0_60px_rgba(251,191,36,0.3)] border-amber-500/30'}`}
                                        >
                                            <div className={`${isClassicNeon || isNavyGolden ? 'bg-[#070B0A]/95' : 'bg-black/95'} rounded-[2.8rem] p-4 md:p-8 relative overflow-hidden text-white`}>
                                                {/* Stadium Lights Effect */}
                                                <div className={`absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_left,${isClassicNeon || isNavyGolden ? 'rgba(166,255,0,0.15)' : 'rgba(251,191,36,0.15)'}_0%,transparent_60%)]`} />
                                                <div className={`absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_bottom_right,${isClassicNeon || isNavyGolden ? 'rgba(166,255,0,0.15)' : 'rgba(251,191,36,0.15)'}_0%,transparent_60%)]`} />
                                                
                                                <div className="relative z-10 space-y-6">
                                                    <div className="space-y-2">
                                                        <h2 className={`text-4xl md:text-8xl font-cinzel font-black ${isClassicNeon || isNavyGolden ? 'text-[#A6FF00] drop-shadow-[0_0_20px_rgba(166,255,0,0.5)]' : 'golden-text'} tracking-widest drop-shadow-[0_5px_15px_rgba(0,0,0,0.8)]`}>
                                                            {auction?.title || "BBL 2026"}
                                                        </h2>
                                                        {auction?.fullTournamentName && (
                                                            <p className={`text-sm md:text-2xl font-cinzel font-bold ${isClassicNeon || isNavyGolden ? 'text-[#A6FF00]/80' : 'golden-text'} tracking-[0.3em] opacity-80`}>
                                                                {auction.fullTournamentName}
                                                            </p>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="flex flex-col items-center pt-4">
                                                        <p className={`text-xs md:text-xl font-cinzel font-black ${isClassicNeon || isNavyGolden ? 'text-[#A6FF00]/70' : 'golden-text'} uppercase tracking-[0.5em] mb-4 opacity-70`}>
                                                            GET READY FOR
                                                        </p>
                                                        <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-8">
                                                            <span className={`text-4xl md:text-8xl font-cinzel font-black ${isClassicNeon || isNavyGolden ? 'text-white' : 'golden-text'} tracking-tighter`}>
                                                                SEASON
                                                            </span>
                                                            <motion.span 
                                                                animate={{ 
                                                                    y: [0, -10, 0],
                                                                    rotate: [0, 2, -2, 0],
                                                                    scale: [1, 1.02, 1]
                                                                }}
                                                                transition={{ 
                                                                    duration: 3, 
                                                                    repeat: Infinity, 
                                                                    ease: "easeInOut" 
                                                                }}
                                                                className={`text-8xl md:text-[12rem] font-cinzel font-black ${isClassicNeon ? 'text-[#A6FF00] drop-shadow-[0_0_50px_rgba(166,255,0,0.6)]' : isNavyGolden ? 'text-[#A6FF00] drop-shadow-[0_10px_50px_rgba(166,255,0,0.4)]' : 'golden-text drop-shadow-[0_10px_50px_rgba(251,191,36,0.9)]'} leading-none shine-effect inline-block`}
                                                            >
                                                                {auction?.season || ""}
                                                            </motion.span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
        
                                        {/* 4. Welcome Section */}
                                        <motion.div
                                            initial={{ y: 30, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 1.2 }}
                                            className="space-y-6 mb-12"
                                        >
                                            <h1 className={`text-6xl md:text-[10rem] font-cinzel font-black ${isClassicNeon || isNavyGolden ? 'text-[#A6FF00] drop-shadow-[0_0_30px_rgba(166,255,0,0.4)]' : 'golden-text'} uppercase tracking-tight`}>
                                                Welcome
                                            </h1>
                                            
                                            <div className="flex items-center justify-center gap-4 md:gap-8">
                                                <div className={`h-[2px] flex-1 max-w-[150px] bg-gradient-to-r from-transparent ${isClassicNeon || isNavyGolden ? 'via-[#A6FF00]/50 to-[#A6FF00]' : 'via-amber-500/50 to-amber-500'}`} />
                                                <p className={`text-[10px] md:text-2xl font-cinzel font-black ${isClassicNeon || isNavyGolden ? 'text-[#A6FF00]' : 'text-amber-100'} uppercase tracking-[0.4em] whitespace-nowrap`}>
                                                    JOIN THE EVENT
                                                </p>
                                                <div className={`h-[2px] flex-1 max-w-[150px] bg-gradient-to-l from-transparent ${isClassicNeon || isNavyGolden ? 'via-[#A6FF00]/50 to-[#A6FF00]' : 'via-amber-500/50 to-amber-500'}`} />
                                            </div>
                                        </motion.div>
                                         {/* Enter Button */}
                                         <motion.button
                                            whileHover={{ scale: 1.05, boxShadow: (isClassicNeon || isNavyGolden) ? "0 0 100px rgba(166,255,0,1)" : "0 0 100px rgba(251,191,36,1)" }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => setBattleStarted(true)}
                                            className={`relative group overflow-hidden ${isClassicNeon || isNavyGolden ? 'bg-[#A6FF00] hover:bg-[#b8ff33] text-black shadow-[0_0_60px_rgba(166,255,0,0.6)]' : 'bg-amber-400 hover:bg-amber-300 text-white shadow-[0_0_60px_rgba(251,191,36,0.8)]'} font-cinzel font-black px-8 py-4 md:px-20 md:py-6 rounded-full text-lg md:text-2xl uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-4 md:gap-10 mx-auto w-full max-w-[340px] md:max-w-none md:w-auto border-4 ${isClassicNeon || isNavyGolden ? 'border-[#A6FF00]/50' : 'border-amber-200/50'}`}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                            {(isClassicNeon || isNavyGolden) ? <Zap className="w-8 h-8 md:w-10 md:h-10" /> : <Sword className="w-8 h-8 md:w-10 md:h-10" />} 
                                            {(isClassicNeon || isNavyGolden) ? 'START' : 'JOIN'}
                                        </motion.button>
                                    </>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            );
        }

        return (
            <div className={`min-h-screen ${isClassicNeon ? 'bg-[#070B0A]' : isNavyGolden ? 'bg-[#000a08]' : 'bg-[#0a0a0a]'} ${isClassicNeon || isNavyGolden ? 'text-white' : 'text-amber-50'} font-sans py-6 md:py-12 px-4 relative overflow-x-hidden`}>
                {/* Background Effects */}
                <div className={`fixed inset-0 bg-[radial-gradient(circle_at_top_right,${isClassicNeon || isNavyGolden ? 'rgba(166,255,0,0.1)' : 'rgba(251,191,36,0.05)'}_0%,transparent_50%)] pointer-events-none`} />
                <div className={`fixed inset-0 bg-[radial-gradient(circle_at_bottom_left,${isClassicNeon || isNavyGolden ? 'rgba(166,255,0,0.1)' : 'rgba(251,191,36,0.05)'}_0%,transparent_50%)] pointer-events-none`} />
                
                {/* Stadium atmosphere for Classic Neon & Navy Golden */}
                {(isClassicNeon || isNavyGolden) && (
                    <>
                        <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-[#A6FF00]/5 blur-[120px] rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                        <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-[#A6FF00]/5 blur-[120px] rounded-full translate-x-1/2 translate-y-1/2 pointer-events-none" />
                    </>
                )}

                <div className={`${isClassicNeon ? 'max-w-7xl' : 'max-w-4xl'} mx-auto relative z-10`}>
                    {/* Header & Progress */}
                    <div className="text-center mb-8 md:mb-12">
                        <motion.div
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="flex items-center justify-center gap-4 mb-6"
                        >
                            <button 
                                onClick={() => navigate('/')}
                                className={`p-3 rounded-2xl bg-white/5 border border-white/10 ${isClassicNeon || isNavyGolden ? 'text-[#A6FF00] hover:border-[#A6FF00]/50' : 'text-amber-500'} hover:bg-white/10 transition-all active:scale-90`}
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div className={`flex-1 h-[1px] bg-gradient-to-r from-transparent ${isClassicNeon || isNavyGolden ? 'via-[#A6FF00]/20' : 'via-amber-500/20'} to-transparent`} />
                            <h2 className={`text-xl md:text-3xl font-black ${isClassicNeon || isNavyGolden ? 'text-[#A6FF00] italic' : 'text-amber-500'} uppercase tracking-tighter`}>{auction?.title}</h2>
                            <div className={`flex-1 h-[1px] bg-gradient-to-l from-transparent ${isClassicNeon || isNavyGolden ? 'via-[#A6FF00]/20' : 'via-amber-500/20'} to-transparent`} />
                            <div className={`px-4 py-2 rounded-2xl ${isClassicNeon || isNavyGolden ? 'bg-[#A6FF00]/10 border-[#A6FF00]/20 text-[#A6FF00]' : 'bg-amber-500/10 border-amber-500/20 text-amber-500'} text-[10px] font-black uppercase tracking-widest flex items-center gap-2`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${isClassicNeon || isNavyGolden ? 'bg-[#A6FF00]' : 'bg-current'} animate-pulse`} />
                                {displayCount} {displayMax ? `of ${displayMax}` : ''} ENROLLED
                            </div>
                        </motion.div>

                        {/* Slot System UI */}
                        {config?.maxRegistrations && !config?.hideProgressBar && (
                            <div className={`${isClassicNeon ? 'max-w-4xl' : 'max-w-2xl'} mx-auto mb-10 space-y-4`}>
                                <div className="flex justify-between items-end mb-2">
                                    <div className="text-left">
                                        <p className={`text-[10px] font-black ${isClassicNeon ? 'text-[#A6FF00]/50' : 'text-amber-500/50'} uppercase tracking-[0.2em]`}>Registration Progress</p>
                                        <h4 className={`text-lg md:text-xl font-black ${isClassicNeon ? 'text-white' : 'text-amber-100'} uppercase tracking-tight`}>Slots Filled: {displayCount}/{displayMax}</h4>
                                    </div>
                                    <div className="text-right">
                                        {displayCount >= displayMax ? (
                                            (isCaptain || hasTeamCode) ? (
                                                <span className={`text-[10px] font-black ${isClassicNeon ? 'text-[#A6FF00] bg-[#A6FF00]/10 border-[#A6FF00]/20' : 'text-amber-500 bg-amber-500/10 border-amber-500/20'} uppercase tracking-widest px-3 py-1 rounded-lg border`}>Priority Access Active</span>
                                            ) : (
                                                <span className="text-[10px] font-black text-red-500 uppercase tracking-widest bg-red-500/10 px-3 py-1 rounded-lg border border-red-500/20">Registrations Closed</span>
                                            )
                                        ) : displayCount > (displayMax - 5) ? (
                                            <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest animate-pulse">Only a few spots left!</span>
                                        ) : displayCount > (displayMax - 10) ? (
                                            <span className={`text-[10px] font-black ${isClassicNeon ? 'text-[#A6FF00]' : 'text-amber-500'} uppercase tracking-widest animate-pulse`}>Hurry! Slots are filling fast.</span>
                                        ) : (
                                            <span className={`text-[10px] font-black ${isClassicNeon ? 'text-[#A6FF00]/80' : 'text-green-500'} uppercase tracking-widest`}>Secure your spot now</span>
                                        )}
                                    </div>
                                </div>
                                <div className={`h-3 w-full ${isClassicNeon ? 'bg-[#0F1413]' : 'bg-white/5'} rounded-full overflow-hidden border ${isClassicNeon ? 'border-[#A6FF00]/10' : 'border-white/10'} p-0.5`}>
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(100, (displayCount / displayMax) * 100)}%` }}
                                        className={`h-full rounded-full ${
                                            displayCount >= displayMax ? 'bg-red-500' :
                                            displayCount > (displayMax - 5) ? 'bg-orange-500' :
                                            isClassicNeon || isNavyGolden ? 'bg-[#A6FF00] shadow-[0_0_15px_rgba(166,255,0,0.5)]' :
                                            'bg-gradient-to-r from-amber-600 to-amber-400'
                                        }`}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Progress Tracker */}
                        <div className="flex items-center justify-between gap-2 max-w-2xl mx-auto mb-8 overflow-x-auto no-scrollbar pb-2">
                            {steps.map((step, idx) => (
                                <button 
                                    key={`step-tracker-${step.id}-${idx}`} 
                                    onClick={() => setCurrentStep(idx)}
                                    className="flex-1 flex flex-col items-center gap-2 min-w-[80px] group transition-all"
                                >
                                    <div className={`h-1 w-full rounded-full transition-all duration-500 ${
                                        idx <= currentStep 
                                            ? (isClassicNeon || isNavyGolden ? 'bg-[#A6FF00] shadow-[0_0_10px_rgba(166,255,0,0.5)]' : 'bg-amber-500 shadow-[0_0_10px_rgba(251,191,36,0.5)]') 
                                            : 'bg-white/10 group-hover:bg-white/20'}`} 
                                    />
                                    <span className={`text-[8px] font-black uppercase tracking-widest transition-colors whitespace-nowrap ${
                                        idx === currentStep 
                                            ? (isClassicNeon || isNavyGolden ? 'text-[#A6FF00]' : 'text-amber-500') 
                                            : 'text-white/20 group-hover:text-white/40'}`}>
                                        {step.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className={isClassicNeon ? "grid grid-cols-1 lg:grid-cols-2 gap-12 items-start" : ""}>
                        {/* Left Side: Form Content */}
                        <div className={isClassicNeon ? "space-y-8" : ""}>
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={currentStep}
                                            initial={{ x: 20, opacity: 0 }}
                                            animate={{ x: 0, opacity: 1 }}
                                            exit={{ x: -20, opacity: 0 }}
                                            transition={{ duration: 0.4, ease: "easeOut" }}
                                            className={`min-h-[400px] ${(isFull && !isCaptain && !hasTeamCode) ? 'opacity-50 pointer-events-none' : ''}`}
                                        >
                                            {/* Welcome Banner - Replaces the Popup */}
                                            {config?.welcomePopup?.isEnabled && !hasSeenWelcome && currentStepId === 'details' && (
                                                <motion.div 
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    className={`mb-8 p-6 rounded-[2rem] border-2 relative overflow-hidden ${
                                                        isClassicNeon || isNavyGolden ? 'bg-[#A6FF00]/10 border-[#A6FF00]/20 text-[#A6FF00]' : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                                                    }`}
                                                >
                                                    <div className="flex items-start gap-4">
                                                        <div className="p-3 rounded-2xl bg-white/10">
                                                            <Megaphone className="w-5 h-5" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <h4 className="text-[10px] font-black uppercase tracking-widest">Organizer's Message</h4>
                                                                <button onClick={() => setHasSeenWelcome(true)} className="p-1 hover:bg-white/10 rounded-lg"><X className="w-4 h-4" /></button>
                                                            </div>
                                                            <p className="text-xs font-bold leading-relaxed opacity-80">{config.welcomePopup.message}</p>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                            {currentStepId === 'details' && (
                                                <div className="space-y-8">
                                                    {config?.welcomePosterUrl ? (
                                                        <motion.div 
                                                            initial={{ opacity: 0, scale: 0.95 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            className="space-y-8 text-center"
                                                        >
                                                            <div className={`relative rounded-[3rem] overflow-hidden border-2 ${isClassicNeon ? 'border-white/10 shadow-[0_0_50px_rgba(255,255,255,0.05)]' : 'border-amber-500/20 shadow-2xl'}`}>
                                                                <img src={config.welcomePosterUrl} className="w-full h-auto block shadow-2xl" referrerPolicy="no-referrer" />
                                                            </div>

                                                            {/* Showcase Section with Captions */}
                                                            {config?.showcaseImages && config.showcaseImages.length > 0 && (
                                                                <div className="space-y-6 pt-8 text-left">
                                                                    <div className="flex items-center justify-between">
                                                                        <h4 className={`text-xl md:text-2xl font-black italic uppercase tracking-tighter ${isClassicNeon ? 'text-white' : 'text-amber-500'}`}>Tournament Highlights</h4>
                                                                        <div className={`h-px flex-1 ml-6 bg-gradient-to-r from-white/10 to-transparent`} />
                                                                    </div>
                                                                    <div className="grid grid-cols-1 gap-8">
                                                                        {config.showcaseImages.map((showcase, sidx) => (
                                                                            <motion.div 
                                                                                key={`showcase-details-${sidx}`}
                                                                                initial={{ opacity: 0, y: 30 }}
                                                                                whileInView={{ opacity: 1, y: 0 }}
                                                                                viewport={{ once: true }}
                                                                                className={`relative rounded-[2.5rem] overflow-hidden border-2 ${isClassicNeon ? 'border-white/5' : 'border-amber-900/20'} bg-black/60 group shadow-2xl`}
                                                                            >
                                                                                <div className="aspect-video w-full overflow-hidden">
                                                                                    <img src={showcase.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
                                                                                </div>
                                                                                {showcase.caption && (
                                                                                    <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black via-black/80 to-transparent">
                                                                                        <p className="text-white text-sm font-black uppercase italic tracking-wider leading-tight drop-shadow-md">{showcase.caption}</p>
                                                                                    </div>
                                                                                )}
                                                                            </motion.div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            <motion.button 
                                                                whileHover={{ scale: 1.05, boxShadow: isClassicNeon ? "0 0 50px rgba(166,255,0,0.5)" : "" }}
                                                                whileTap={{ scale: 0.95 }}
                                                                onClick={() => setCurrentStep(1)}
                                                                className={`w-full max-w-sm mx-auto py-6 rounded-full text-xl font-black uppercase tracking-widest transition-all shadow-2xl flex items-center justify-center gap-4 ${isClassicNeon ? 'bg-gradient-to-br from-[#A6FF00] to-[#FFFFFF] text-black' : 'bg-amber-600 text-white'}`}
                                                            >
                                                                REGISTER NOW <ChevronRight className="w-6 h-6" />
                                                            </motion.button>
                                                        </motion.div>
                                                    ) : (
                                                        <>
                                                            <div className="text-center md:text-left space-y-4 mb-12">
                                                                <h3 className={`text-4xl md:text-5xl font-black ${isClassicNeon || isNavyGolden ? 'text-[#A6FF00] drop-shadow-[0_0_15px_rgba(166,255,0,0.3)] italic' : 'text-amber-100'} uppercase tracking-tighter`}>
                                                                    {isClassicNeon || isNavyGolden ? 'TOURNAMENT BRIEFING' : 'Tournament Intel'}
                                                                </h3>
                                                                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                                                                    {isClassicNeon || isNavyGolden ? 'Complete your registration for the upcoming season' : 'Review the tournament details before joining'}
                                                                </p>
                                                            </div>
                                                            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-6 ${isClassicNeon || isNavyGolden ? 'md:grid-cols-2' : 'lg:grid-cols-5'}`}>
                                                                <TournamentDetailCard icon={Calendar} title="Auction Date" value={auction?.date || 'TBD'} description="Draft day" theme={config?.theme} isClassicNeon={isClassicNeon} />
                                                                <TournamentDetailCard icon={Clock} title="Matches Date" value={auction?.matchesDate || 'TBD'} description="League schedule" theme={config?.theme} isClassicNeon={isClassicNeon} />
                                                                <TournamentDetailCard icon={Users} title="Total Teams" value={auction?.totalTeams || '0'} description="Competing squads" theme={config?.theme} isClassicNeon={isClassicNeon} />
                                                                <TournamentDetailCard icon={MapPin} title="Ground" value={auction?.venue || 'TBD'} description="Tournament venue" theme={config?.theme} isClassicNeon={isClassicNeon} />
                                                            </div>
                                                            
                                                            <div className={`${isClassicNeon || isNavyGolden ? 'bg-[#0F1413] border-[#A6FF00]/10' : 'bg-black/40 border-amber-500/10'} border-2 rounded-[2.5rem] p-8 mt-10`}>
                                                                <h4 className={`${isClassicNeon || isNavyGolden ? 'text-[#A6FF00]' : 'text-amber-500'} font-black uppercase tracking-widest text-xs mb-4 flex items-center gap-2`}>
                                                                    <Info className="w-4 h-4" /> {isClassicNeon || isNavyGolden ? 'OFFICIAL BRIEFING' : isAdvaya ? "Commander's Briefing" : "Tournament Briefing"}
                                                                </h4>
                                                                <p className="text-sm font-bold text-slate-400 leading-relaxed uppercase tracking-wide">
                                                                    {config?.welcomePopup?.message || "Welcome to the ultimate cricket showdown. Ensure all your details are accurate as they will be used for the official player draft and auction process."}
                                                                </p>
                                                            </div>

                                                            <div className="mt-10 flex justify-center">
                                                                <motion.button 
                                                                    whileHover={{ scale: 1.03, boxShadow: isClassicNeon ? "0 0 50px rgba(166,255,0,0.4)" : "" }}
                                                                    whileTap={{ scale: 0.97 }}
                                                                    onClick={() => setCurrentStep(1)}
                                                                    className={`w-full max-w-md py-5 font-black rounded-2xl text-sm uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-3 ${
                                                                        isClassicNeon || isNavyGolden 
                                                                            ? 'bg-gradient-to-r from-[#A6FF00] to-[#FFFFFF] text-black shadow-[0_10px_30px_rgba(166,255,0,0.3)]' 
                                                                            : 'bg-amber-600 hover:bg-amber-500 text-white'
                                                                    }`}
                                                                >
                                                                    START REGISTRATION <ChevronRight className="w-5 h-5" />
                                                                </motion.button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            )}

                                            {currentStepId === 'personal' && (
                                <div className="max-w-xl mx-auto space-y-8">
                                                    <div className="text-center mb-12">
                                                        <h3 className={`text-3xl font-black ${isClassicNeon || isNavyGolden ? 'text-[#A6FF00] drop-shadow-[0_0_10px_rgba(166,255,0,0.3)]' : 'text-amber-100'} uppercase tracking-tight`}>
                                                            {isClassicNeon || isNavyGolden ? 'PLAYER PROFILE' : 'Player Identity'}
                                                        </h3>
                                                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                                                            {isClassicNeon || isNavyGolden ? 'Complete your player registration' : 'Establish your presence in the registry'}
                                                        </p>
                                                    </div>
                                    <div className="space-y-6">
                                        {/* Captain Option */}
                                        {config?.enableCaptainCodes && (
                                            <div className={`${isClassicNeon || isNavyGolden ? 'bg-[#0F1413] border-[#A6FF00]/10' : 'bg-amber-500/5 border-amber-500/10'} border-2 rounded-3xl p-6 space-y-4`}>
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className={`text-[10px] font-black ${isClassicNeon || isNavyGolden ? 'text-[#A6FF00]' : 'text-amber-500'} uppercase tracking-widest mb-1`}>Captain Registration</p>
                                                        <h4 className={`text-sm font-black ${isClassicNeon || isNavyGolden ? 'text-white' : 'text-amber-100'} uppercase tracking-tight`}>Are you registering as Captain?</h4>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        {[true, false].map((val, idx) => (
                                                            <button 
                                                                key={`opt-captain-${val}-${idx}`}
                                                                type="button"
                                                                onClick={() => {
                                                                    setIsCaptain(val);
                                                                    if (!val) {
                                                                        setCaptainCode('');
                                                                        setCodeStatus({ type: null, message: '' });
                                                                        setValidatedCode(null);
                                                                    }
                                                                }}
                                                                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                                                    isCaptain === val 
                                                                        ? (isClassicNeon || isNavyGolden ? 'bg-[#A6FF00] text-black shadow-lg shadow-[#A6FF00]/20' : 'bg-amber-600 text-black shadow-lg shadow-amber-600/20') 
                                                                        : (isClassicNeon || isNavyGolden ? 'bg-black/40 text-[#A6FF00]/50 border-[#A6FF00]/20' : 'bg-black/40 text-amber-500/50 border border-amber-900/20')
                                                                }`}
                                                            >
                                                                {val ? 'YES' : 'NO'}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {isCaptain && (
                                                    <motion.div 
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        className={`pt-4 border-t ${isClassicNeon || isNavyGolden ? 'border-[#A6FF00]/10' : 'border-amber-500/10'} space-y-4`}
                                                    >
                                                        <div className="relative">
                                                            <input 
                                                                type="text"
                                                                value={captainCode}
                                                                onChange={e => setCaptainCode(e.target.value.toUpperCase())}
                                                                placeholder="ENTER CAPTAIN CODE (e.g. ARSLT1)"
                                                                className={`w-full ${isClassicNeon || isNavyGolden ? 'bg-black/40 border-[#A6FF00]/30 text-white focus:border-[#A6FF00]' : 'bg-black/60 border-2 border-amber-900/30 text-amber-100 focus:border-amber-500'} rounded-2xl px-6 py-4 font-black outline-none uppercase font-mono`}
                                                            />
                                                            <button 
                                                                type="button"
                                                                onClick={() => validateCaptainCode(captainCode)}
                                                                className={`absolute right-2 top-2 bottom-2 ${isClassicNeon || isNavyGolden ? 'bg-[#A6FF00] hover:bg-[#b8ff33] text-black' : 'bg-amber-600 hover:bg-amber-500'} text-white px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all`}
                                                            >
                                                                VERIFY
                                                            </button>
                                                        </div>
                                                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">Get the captain code from the tournament organizer</p>
                                                        
                                                        {codeStatus.type && (
                                                            <motion.div 
                                                                initial={{ opacity: 0, y: -10 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                className={`p-4 rounded-2xl border flex items-center gap-3 ${
                                                                    codeStatus.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-500' :
                                                                    codeStatus.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-500' :
                                                                    'bg-blue-500/10 border-blue-500/20 text-blue-500'
                                                                }`}
                                                            >
                                                                {codeStatus.type === 'success' ? <ShieldCheck className="w-4 h-4" /> : codeStatus.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <Loader2 className="w-4 h-4 animate-spin" />}
                                                                <span className="text-[10px] font-black uppercase tracking-widest">{codeStatus.message}</span>
                                                            </motion.div>
                                                        )}
                                                    </motion.div>
                                                )}
                                            </div>
                                        )}

                                        {/* Team Code Option */}
                                        {!isCaptain && config?.enablePlayerCodes && (
                                            <div className={`${isClassicNeon || isNavyGolden ? 'bg-[#0F1413] border-[#A6FF00]/10' : 'bg-amber-500/5 border-amber-500/10'} border-2 rounded-3xl p-6 space-y-4`}>
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className={`text-[10px] font-black ${isClassicNeon || isNavyGolden ? 'text-[#A6FF00]' : 'text-amber-500'} uppercase tracking-widest mb-1`}>Team Registration</p>
                                                        <h4 className={`text-sm font-black ${isClassicNeon || isNavyGolden ? 'text-white' : 'text-amber-100'} uppercase tracking-tight`}>Do you have a Captain's Team Code?</h4>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        {[true, false].map((val, idx) => (
                                                            <button 
                                                                key={`opt-teamcode-${val}-${idx}`}
                                                                type="button"
                                                                onClick={() => {
                                                                    setHasTeamCode(val);
                                                                    if (!val) {
                                                                        setTeamCode('');
                                                                        setTeamCodeStatus({ type: null, message: '' });
                                                                        setValidatedTeamCode(null);
                                                                    }
                                                                }}
                                                                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                                                    hasTeamCode === val 
                                                                        ? (isClassicNeon || isNavyGolden ? 'bg-[#A6FF00] text-black shadow-lg shadow-[#A6FF00]/20' : 'bg-amber-600 text-black shadow-lg shadow-amber-600/20') 
                                                                        : (isClassicNeon || isNavyGolden ? 'bg-black/40 text-[#A6FF00]/50 border-[#A6FF00]/20' : 'bg-black/40 text-amber-500/50 border border-amber-900/20')
                                                                }`}
                                                            >
                                                                {val ? 'YES' : 'NO'}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {hasTeamCode && (
                                                    <motion.div 
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        className={`pt-4 border-t ${isClassicNeon || isNavyGolden ? 'border-[#A6FF00]/10' : 'border-amber-500/10'} space-y-4`}
                                                    >
                                                        <div className="relative">
                                                            <input 
                                                                type="text"
                                                                value={teamCode}
                                                                onChange={e => setTeamCode(e.target.value.toUpperCase())}
                                                                placeholder="ENTER TEAM CODE (e.g. ARSPLAYERS)"
                                                                className={`w-full ${isClassicNeon || isNavyGolden ? 'bg-black/40 border-[#A6FF00]/30 text-white focus:border-[#A6FF00]' : 'bg-black/60 border-2 border-amber-900/30 text-amber-100 focus:border-amber-500'} rounded-2xl px-6 py-4 font-black outline-none uppercase font-mono`}
                                                            />
                                                            <button 
                                                                type="button"
                                                                onClick={() => validateTeamCode(teamCode)}
                                                                className={`absolute right-2 top-2 bottom-2 ${isClassicNeon || isNavyGolden ? 'bg-[#A6FF00] hover:bg-[#b8ff33] text-black' : 'bg-amber-600 hover:bg-amber-500'} text-white px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all`}
                                                            >
                                                                VERIFY
                                                            </button>
                                                        </div>
                                                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">Get the team code from your team captain</p>
                                                        
                                                        {teamCodeStatus.type && (
                                                            <motion.div 
                                                                initial={{ opacity: 0, y: -10 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                className={`p-4 rounded-2xl border flex items-center gap-3 ${
                                                                    teamCodeStatus.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-500' :
                                                                    teamCodeStatus.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-500' :
                                                                    'bg-blue-500/10 border-blue-500/20 text-blue-500'
                                                                }`}
                                                            >
                                                                {teamCodeStatus.type === 'success' ? <ShieldCheck className="w-4 h-4" /> : teamCodeStatus.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <Loader2 className="w-4 h-4 animate-spin" />}
                                                                <span className="text-[10px] font-black uppercase tracking-widest">{teamCodeStatus.message}</span>
                                                            </motion.div>
                                                        )}
                                                    </motion.div>
                                                )}
                                            </div>
                                        )}

                                        {(!config?.basicFields || config?.basicFields?.name?.show !== false) && (
                                            <TournamentInput 
                                                label={isClassicNeon ? "Player Name" : isAdvaya ? "Player Name" : "Full Name"} 
                                                value={formData.fullName} 
                                                onChange={(e: any) => setFormData({...formData, fullName: e.target.value})} 
                                                placeholder="ENTER FULL NAME" 
                                                required={!config?.basicFields || config?.basicFields?.name?.required !== false} 
                                                theme={config?.theme?.toUpperCase()}
                                            />
                                        )}
                                        {(!config?.basicFields || config?.basicFields?.mobile?.show !== false) && (
                                            <TournamentInput 
                                                label="Mobile Primary" 
                                                type="tel" 
                                                value={formData.mobile} 
                                                onChange={(e: any) => setFormData({...formData, mobile: e.target.value})} 
                                                placeholder="10 DIGIT NUMBER" 
                                                required={!config?.basicFields || config?.basicFields?.mobile?.required !== false} 
                                                theme={config?.theme?.toUpperCase()}
                                            />
                                        )}
                                        {(!config?.basicFields || config?.basicFields?.dob?.show !== false) && (
                                            <TournamentInput 
                                                label="Date of Birth" 
                                                type="date" 
                                                value={formData.dob} 
                                                onChange={(e: any) => setFormData({...formData, dob: e.target.value})} 
                                                required={!config?.basicFields || config?.basicFields?.dob?.required !== false} 
                                                theme={config?.theme?.toUpperCase()}
                                            />
                                        )}
                                        
                                        {(!config?.basicFields || config.basicFields.gender?.show !== false) && (
                                            <TournamentInput 
                                                label="Gender Identity" 
                                                type="select"
                                                value={formData.gender} 
                                                onChange={(e: any) => setFormData({...formData, gender: e.target.value})} 
                                                options={['Male', 'Female', 'Other']}
                                                required={config?.basicFields?.gender?.required !== false} 
                                                placeholder="SELECT GENDER"
                                                theme={config?.theme?.toUpperCase()}
                                            />
                                        )}

                                        {(!config?.basicFields || config.basicFields.photo?.show !== false) && (
                                            <div className="space-y-3">
                                        <label className={`text-[10px] font-black uppercase tracking-widest ${isClassicNeon || isNavyGolden ? 'text-[#A6FF00]' : 'text-blue-500'}/50 ml-1`}>
                                            {isClassicNeon || isAdvaya || isNavyGolden ? 'PLAYER PHOTO' : 'Player Photo'} {(config?.basicFields?.photo?.required !== false) && <span className="text-red-500">*</span>}
                                        </label>
                                <div 
                                    onClick={() => !isUploadingPhoto && profileInputRef.current?.click()}
                                    className={`w-full h-48 rounded-[2.5rem] ${isClassicNeon || isNavyGolden ? 'bg-[#0F1413] border-[#A6FF00]/20 hover:border-[#A6FF00]' : 'bg-black/40 border-amber-900/30 hover:border-amber-500'} border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative group`}
                                >
                                                    {isUploadingPhoto ? (
                                                        <div className="text-center p-4">
                                                            <Loader2 className={`w-8 h-8 animate-spin mx-auto mb-2 ${isClassicNeon || isNavyGolden ? 'text-[#A6FF00]' : 'text-amber-500'}`} />
                                                            <p className={`text-[10px] font-black uppercase tracking-widest ${isClassicNeon || isNavyGolden ? 'text-[#A6FF00]' : 'text-amber-500'}`}>Uploading Image...</p>
                                                            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">Images over 1MB compressed to 1MB</p>
                                                        </div>
                                                    ) : profilePic ? (
                                                        <div className="w-full h-full bg-white relative group">
                                                            <img src={profilePic} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-black uppercase tracking-widest">
                                                                Click to Replace Photo
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="text-center">
                                                            <div className={`w-16 h-16 ${isClassicNeon || isNavyGolden ? 'bg-[#A6FF00]/10 border-[#A6FF00]/20' : 'bg-amber-500/10 border-amber-500/20'} rounded-2xl flex items-center justify-center mx-auto mb-4 border`}>
                                                                <Upload className={`w-8 h-8 ${isClassicNeon || isNavyGolden ? 'text-[#A6FF00]' : 'text-amber-500'}`} />
                                                            </div>
                                                            <p className={`text-[10px] font-black uppercase tracking-widest ${isClassicNeon || isNavyGolden ? 'text-[#A6FF00]/50' : 'text-amber-500'}/50`}>{isClassicNeon || isNavyGolden ? 'Upload Photo' : 'Upload Portrait'}</p>
                                                            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">Up to 1MB original • Larger compressed to 1MB</p>
                                                        </div>
                                                    )}
                                                    <input ref={profileInputRef} type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {currentStepId === 'role' && (
                                <div className="space-y-8">
                                    <div className="text-center mb-12">
                                        <h3 className={`text-3xl font-black ${isClassicNeon || isNavyGolden ? 'text-[#A6FF00] drop-shadow-[0_0_10px_rgba(166,255,0,0.3)]' : 'text-amber-100'} uppercase tracking-tight`}>
                                            {isClassicNeon || isNavyGolden ? 'PICK YOUR ROLE' : isAdvaya ? 'Playing Role' : 'Playing Role'}
                                        </h3>
                                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                                            {isClassicNeon || isNavyGolden ? 'Choose your primary playing role' : 'Select your primary skill on the field'}
                                        </p>
                                    </div>
                                    {(!config?.basicFields || config.basicFields.role?.show !== false) ? (
                                        <div className="max-w-xl mx-auto">
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                                {roles.map((r, rIdx) => (
                                                    <button 
                                                        key={`role-step-btn-${r.id}-${rIdx}`} 
                                                        type="button"
                                                        onClick={() => setFormData({...formData, playerType: r.name})}
                                                        className={`p-6 rounded-[2.5rem] border-2 transition-all flex flex-col items-center justify-center gap-4 group relative overflow-hidden ${
                                                            formData.playerType === r.name 
                                                                ? (isClassicNeon || isNavyGolden ? 'bg-[#A6FF00] border-[#A6FF00] text-black shadow-[0_0_30px_rgba(166,255,0,0.3)]' : 'bg-amber-600 border-amber-600 text-black shadow-2xl shadow-amber-600/20') 
                                                                : (isClassicNeon || isNavyGolden ? 'bg-[#0F1413] border-[#A6FF00]/10 text-[#A6FF00]/50 hover:border-[#A6FF00]/40' : 'bg-black/40 border-amber-900/30 text-amber-500/50 hover:border-amber-500/50')
                                                        }`}
                                                    >
                                                        {isClassicNeon && formData.playerType === r.name && (
                                                            <motion.div layoutId="role-glow" className="absolute inset-0 bg-[#A6FF00]/10 blur-xl px-4" />
                                                        )}
                                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                                                            formData.playerType === r.name 
                                                                ? (isClassicNeon ? 'bg-black/10 scale-110' : 'bg-black/20') 
                                                                : (isClassicNeon ? 'bg-[#A6FF00]/5 border border-[#A6FF00]/10' : 'bg-amber-500/10')
                                                        }`}>
                                                            {r.name.toLowerCase().includes('bat') ? <Sword className="w-7 h-7" /> : 
                                                             r.name.toLowerCase().includes('bowl') ? <Zap className="w-7 h-7" /> : 
                                                             r.name.toLowerCase().includes('wicket') ? <ShieldCheck className="w-7 h-7" /> : 
                                                             <Star className="w-7 h-7" />}
                                                        </div>
                                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-center leading-tight">{r.name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                                                    <div className={`p-12 text-center border-2 border-dashed rounded-[3rem] ${isClassicNeon || isNavyGolden ? 'border-[#A6FF00]/20' : 'border-amber-900/20'}`}>
                                                                        <p className={`${isClassicNeon || isNavyGolden ? 'text-[#A6FF00]/50' : 'text-amber-500/50'} font-black uppercase tracking-widest`}>Role selection is hidden</p>
                                                                    </div>
                                    )}
                                </div>
                            )}

                            {currentStepId === 'custom' && (
                                <div className="max-w-xl mx-auto space-y-8">
                                    <div className="text-center mb-12">
                                        <h3 className={`text-3xl font-black ${isClassicNeon || isNavyGolden ? 'text-[#A6FF00] drop-shadow-[0_0_10px_rgba(166,255,0,0.3)]' : 'text-amber-100'} uppercase tracking-tight`}>
                                            {isClassicNeon || isNavyGolden ? 'ADDITIONAL INFO' : isAdvaya ? 'Additional Info' : 'Additional Info'}
                                        </h3>
                                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                                            {isClassicNeon || isNavyGolden ? 'Fill in specific tournament requirements' : 'Provide your specific details'}
                                        </p>
                                    </div>
                                        <div className="space-y-8">
                                            {(config?.customFields || []).map((field: any, idx: number) => (
                                                <motion.div 
                                                    key={`custom-step-${field.id}-${idx}`}
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: idx * 0.1 }}
                                                >
                                                    <TournamentInput 
                                                        label={field.label} 
                                                        type={field.type}
                                                        value={formData[field.id]} 
                                                        onChange={(e: any) => setFormData({...formData, [field.id]: e.target.value})} 
                                                        required={field.required}
                                                        placeholder={`ENTER ${field.label.toUpperCase()}`}
                                                        options={field.options || []}
                                                        theme={config?.theme}
                                                    />
                                                </motion.div>
                                            ))}
                                            {(config?.customFields || []).length === 0 && (
                                                <div className={`p-12 text-center border-2 border-dashed rounded-[3rem] ${isClassicNeon || isNavyGolden ? 'border-[#A6FF00]/20' : 'border-amber-900/20'}`}>
                                                    <p className={`${isClassicNeon || isNavyGolden ? 'text-[#A6FF00]/50' : 'text-amber-500/50'} font-black uppercase tracking-widest`}>No additional info required</p>
                                                </div>
                                            )}
                                        </div>
                                </div>
                            )}

                            {currentStepId === 'jersey' && (
                                <div className="max-w-xl mx-auto space-y-8">
                                    <div className="text-center mb-12">
                                        <h3 className={`text-3xl font-black ${isClassicNeon || isNavyGolden ? 'text-[#A6FF00] drop-shadow-[0_0_10px_rgba(166,255,0,0.3)]' : 'text-amber-100'} uppercase tracking-tight`}>
                                            {isClassicNeon || isNavyGolden ? 'JERSEY CONFIG' : 'Jersey Details'}
                                        </h3>
                                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Customize your field uniform</p>
                                    </div>
                                    <div className="space-y-6">
                                        {config?.jerseyFields?.name?.show && (
                                            <TournamentInput 
                                                label="Name on Jersey" 
                                                value={formData.jerseyName} 
                                                onChange={(e: any) => setFormData({...formData, jerseyName: e.target.value})} 
                                                placeholder="ENTER NAME TO PRINT" 
                                                required={config?.jerseyFields?.name?.required} 
                                                theme={config?.theme}
                                            />
                                        )}
                                        {config?.jerseyFields?.number?.show && (
                                            <TournamentInput 
                                                label="Jersey Number" 
                                                type="number"
                                                value={formData.jerseyNumber} 
                                                onChange={(e: any) => setFormData({...formData, jerseyNumber: e.target.value})} 
                                                placeholder="ENTER NUMBER" 
                                                required={config?.jerseyFields?.number?.required} 
                                                theme={config?.theme}
                                            />
                                        )}
                                        {config?.jerseyFields?.size?.show && (
                                            <TournamentInput 
                                                label="Select Size" 
                                                type="select"
                                                value={formData.jerseySize} 
                                                onChange={(e: any) => setFormData({...formData, jerseySize: e.target.value})} 
                                                options={config.jerseyFields.size.options && config.jerseyFields.size.options.length > 0 ? config.jerseyFields.size.options : ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL']}
                                                required={config?.jerseyFields?.size?.required} 
                                                theme={config?.theme}
                                            />
                                        )}

                                        {/* Jersey Live Preview */}
                                        <JerseyPreview 
                                            name={formData.jerseyName} 
                                            number={formData.jerseyNumber} 
                                            auctionLogo={config?.logoUrl || auction?.logoUrl}
                                            theme={config?.theme}
                                            season={auction?.season}
                                            viewMode={jerseyViewMode}
                                            jerseyUrl={config?.jerseyUrl || state.globalJerseyUrl}
                                            jerseyOverlayUrl={state.globalJerseyOverlayUrl}
                                        />
                                    </div>
                                </div>
                            )}

                            {currentStepId === 'payment' && (
                                <div className="max-w-2xl mx-auto space-y-8">
                                    <div className="text-center mb-12">
                                        <h3 className={`text-3xl font-black ${isClassicNeon || isNavyGolden ? 'text-[#A6FF00] drop-shadow-[0_0_10px_rgba(166,255,0,0.3)]' : 'text-amber-100'} uppercase tracking-tight`}>
                                            {isClassicNeon || isNavyGolden ? 'FEE SETTLEMENT' : 'Payment Verification'}
                                        </h3>
                                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                                            {isClassicNeon || isNavyGolden ? 'Confirm registration fee payment' : 'Secure your spot in the arena with registration fee'}
                                        </p>
                                    </div>
                                    
                                    {config?.includePayment ? (
                                        <div className="space-y-8">
                                            {finalFee === 0 ? (
                                                <div className="p-12 text-center border-2 border-dashed border-green-500/20 bg-black/40 rounded-[3rem]">
                                                    <div className="w-20 h-20 bg-green-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-green-500/20">
                                                        <ShieldCheck className="w-10 h-10 text-green-400" />
                                                    </div>
                                                    <h4 className="text-2xl font-black text-green-400 uppercase tracking-tight mb-2">FEE WAIVED</h4>
                                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{validatedOrganiserCode ? `Registration Code ${validatedOrganiserCode.code} applied successfully.` : 'Free registration for this tournament.'}</p>
                                                    <p className="text-[10px] font-medium uppercase tracking-widest text-slate-500 mt-2">You can proceed to the next step without any payment.</p>
                                                </div>
                                            ) : (
                                                <div className={`bg-black/60 border-2 ${isClassicNeon || isNavyGolden ? 'border-[#A6FF00]/20 shadow-[0_0_40px_rgba(166,255,0,0.1)]' : 'border-amber-500/20 shadow-2xl'} rounded-[3rem] p-10 text-center relative overflow-hidden`}>
                                                    {(isAdvaya || isNavyGolden || isClassicNeon) && (
                                                        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit]">
                                                            <motion.div
                                                                animate={{ rotate: 360 }}
                                                                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                                                                className={`absolute inset-[-150%] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_270deg,${isClassicNeon || isNavyGolden ? '#A6FF00' : '#f59e0b'}_360deg)] opacity-60 blur-[10px]`}
                                                            />
                                                            <div className={`absolute inset-[2px] ${isClassicNeon || isNavyGolden ? 'bg-[#070B0A]' : 'bg-black/80'} rounded-[inherit] z-0`} />
                                                        </div>
                                                    )}
                                                    <div className="relative z-10">
                                                        <div className="absolute top-0 right-0 p-6">
                                                            <div className={`px-4 py-2 rounded-full ${isClassicNeon || isNavyGolden ? 'bg-[#A6FF00]/10 border-[#A6FF00]/20 text-[#A6FF00]' : 'bg-amber-500/10 border-amber-500/20 text-amber-500'} text-[10px] font-black uppercase tracking-widest`}>
                                                                FEE: ₹{config.fee}
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="space-y-6 mb-10">
                                                            <div className={`w-20 h-20 ${isClassicNeon || isNavyGolden ? 'bg-[#A6FF00]/10 border-[#A6FF00]/20' : 'bg-amber-500/10 border-amber-500/20'} rounded-[2rem] flex items-center justify-center mx-auto border`}>
                                                                <QrCode className={`w-10 h-10 ${isClassicNeon || isNavyGolden ? 'text-[#A6FF00]' : 'text-amber-500'}`} />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <h4 className={`text-xl font-black ${isClassicNeon || isNavyGolden ? 'text-white' : 'text-amber-100'} uppercase tracking-tight`}>Scan to Pay via UPI</h4>
                                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Receiver: <span className={isClassicNeon || isNavyGolden ? 'text-[#A6FF00]' : 'text-amber-500'}>{config.upiName}</span> • UPI ID: <span className={isClassicNeon || isNavyGolden ? 'text-[#A6FF00]' : 'text-amber-500'}>{config.upiId}</span></p>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className={`bg-white p-6 rounded-[2.5rem] shadow-2xl ${isClassicNeon || isNavyGolden ? 'shadow-[0_0_50px_rgba(166,255,0,0.3)] border-[#A6FF00]' : 'shadow-[0_0_50px_rgba(251,191,36,0.3)] border-amber-500'} border-8 inline-block mb-10`}>
                                                            {config.qrCodeUrl && <img src={config.qrCodeUrl} referrerPolicy="no-referrer" className="w-64 h-64 object-contain" />}
                                                        </div>
                                                        
                                                        <div className="space-y-4">
                                                            <label className={`text-[10px] font-black uppercase tracking-widest ${isClassicNeon || isNavyGolden ? 'text-[#A6FF00]' : 'text-amber-500'}/50`}>Upload Payment Proof</label>
                                                            <div 
                                                                onClick={() => !isUploadingPayment && paymentInputRef.current?.click()}
                                                                className={`w-full max-w-sm mx-auto h-32 rounded-[2rem] border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative group ${isClassicNeon || isNavyGolden ? 'bg-[#0F1413] border-[#A6FF00]/30 hover:border-[#A6FF00]' : 'bg-black/40 border-amber-900/30 hover:border-amber-500'}`}
                                                            >
                                                                {(isAdvaya || isNavyGolden || isClassicNeon) && (
                                                                    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit] z-0">
                                                                        <motion.div
                                                                            animate={{ rotate: 360 }}
                                                                            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                                                                            className={`absolute inset-[-150%] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_270deg,${isClassicNeon || isNavyGolden ? '#A6FF00' : '#f59e0b'}_360deg)] opacity-20 blur-[8px]`}
                                                                        />
                                                                        <div className={`absolute inset-[2px] ${isClassicNeon || isNavyGolden ? 'bg-[#0F1413]' : 'bg-black/80'} rounded-[inherit] z-0`} />
                                                                    </div>
                                                                )}
                                                                <div className="relative z-10 w-full h-full flex items-center justify-center">
                                                                    {isUploadingPayment ? (
                                                                        <div className="text-center p-2">
                                                                            <Loader2 className={`w-6 h-6 animate-spin mx-auto mb-1 ${isClassicNeon || isNavyGolden ? 'text-[#A6FF00]' : 'text-amber-500'}`} />
                                                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Uploading Screenshot...</span>
                                                                        </div>
                                                                    ) : paymentScreenshot ? (
                                                                        <div className="relative group w-full h-full flex items-center justify-center">
                                                                            <img src={paymentScreenshot} referrerPolicy="no-referrer" className="max-h-full max-w-full object-contain p-2" />
                                                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[9px] font-black uppercase tracking-widest">
                                                                                Click to Replace
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="text-center group">
                                                                            <Upload className={`w-8 h-8 mx-auto mb-2 ${isClassicNeon || isNavyGolden ? 'text-[#A6FF00]/50' : 'text-amber-900'} group-hover:text-${isClassicNeon || isNavyGolden ? '[#A6FF00]' : 'amber-500'} transition-colors`} />
                                                                            <p className={`text-[10px] font-black uppercase tracking-widest ${isClassicNeon || isNavyGolden ? 'text-[#A6FF00]/50' : 'text-amber-900'} group-hover:text-${isClassicNeon || isNavyGolden ? '[#A6FF00]' : 'amber-500'} transition-colors`}>Upload Screenshot</p>
                                                                            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Upload whatever size you want</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <input ref={paymentInputRef} type="file" className="hidden" accept="image/*" onChange={handlePaymentProofUpload} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="p-20 text-center border-2 border-dashed border-amber-900/20 rounded-[3rem]">
                                            <div className="w-20 h-20 bg-amber-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-amber-500/20">
                                                <CreditCard className="w-10 h-10 text-amber-500" />
                                            </div>
                                            <h4 className="text-xl font-black text-amber-100 uppercase tracking-tight mb-2">No Tribute Required</h4>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Registration for this battle is free of charge</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {currentStepId === 'rules' && (
                                <div className="max-w-2xl mx-auto space-y-8">
                                    <div className="text-center mb-12">
                                        <h3 className={`text-3xl font-black ${isClassicNeon || isNavyGolden ? 'text-[#A6FF00] drop-shadow-[0_0_10px_rgba(166,255,0,0.3)]' : 'text-amber-100'} uppercase tracking-tight`}>
                                            {isClassicNeon || isNavyGolden ? 'ACCEPT RULES' : 'Accept Rules'}
                                        </h3>
                                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest text-center">
                                            {isClassicNeon || isNavyGolden ? 'Finalize your commitment to the tournament rules' : 'Review and accept the rules to continue'}
                                        </p>
                                    </div>
                                    
                                    <div className="space-y-6">
                                        <div className={`bg-black/60 border-2 ${isClassicNeon || isNavyGolden ? 'border-[#A6FF00]/20' : 'border-amber-900/20'} rounded-[2.5rem] p-8 max-h-[300px] overflow-y-auto custom-scrollbar relative overflow-hidden`}>
                                            {(isAdvaya || isNavyGolden || isClassicNeon) && (
                                                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit]">
                                                    <motion.div
                                                        animate={{ rotate: 360 }}
                                                        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                                                        className={`absolute inset-[-150%] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_270deg,${isClassicNeon || isNavyGolden ? '#A6FF00' : '#f59e0b'}_360deg)] opacity-60 blur-[10px]`}
                                                    />
                                                    <div className={`absolute inset-[2px] ${isClassicNeon || isNavyGolden ? 'bg-[#070B0A]' : 'bg-black/80'} rounded-[inherit] z-0`} />
                                                </div>
                                            )}
                                            <div className="relative z-10">
                                                <h4 className={`${isClassicNeon || isNavyGolden ? 'text-[#A6FF00]' : 'text-amber-500'} font-black uppercase tracking-widest text-xs mb-4 flex items-center gap-2`}>
                                                    <ShieldCheck className="w-4 h-4" /> Rules & Regulations
                                                </h4>
                                                <div className="text-xs font-bold text-slate-400 leading-relaxed uppercase tracking-wide whitespace-pre-wrap">
                                                    {config?.rules || "1. Respect the spirit of the game.\n2. Arrive at the venue 30 minutes before the match.\n3. Follow all umpire decisions.\n4. Maintain sportsmanship at all times."}
                                                </div>
                                            </div>
                                        </div>

                                        <div className={`bg-black/60 border-2 ${isClassicNeon || isNavyGolden ? 'border-[#A6FF00]/20' : 'border-amber-900/20'} rounded-[2.5rem] p-8`}>
                                            <h4 className={`${isClassicNeon || isNavyGolden ? 'text-[#A6FF00]' : 'text-amber-500'} font-black uppercase tracking-widest text-xs mb-4 flex items-center gap-2`}>
                                                <Phone className="w-4 h-4" /> Organizer Contact
                                            </h4>
                                            <div className="space-y-2">
                                                {(config?.organizerContacts || []).map((contact, idx) => (
                                                    <div key={`contact-rules-view-${idx}-${contact.name}`} className="flex items-center justify-between">
                                                        <p className="text-sm font-black text-amber-100 uppercase tracking-tight">{contact.name}</p>
                                                        <p className={`text-sm font-black ${isClassicNeon || isNavyGolden ? 'text-[#A6FF00]/70' : 'text-amber-500/70'} tracking-widest`}>{contact.phone}</p>
                                                    </div>
                                                ))}
                                                {(config?.organizerContacts || []).length === 0 && (
                                                    <p className="text-sm font-black text-amber-100 uppercase tracking-tight">N/A</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className={`bg-black/60 border-2 ${isClassicNeon || isNavyGolden ? 'border-[#A6FF00]/20' : 'border-amber-900/20'} rounded-[2.5rem] p-8`}>
                                            <label className="flex items-start gap-4 cursor-pointer group">
                                                <div className="mt-1">
                                                    <input 
                                                        type="checkbox" 
                                                        className="sr-only peer" 
                                                        checked={formData.battleOath}
                                                        onChange={() => setFormData({...formData, battleOath: !formData.battleOath})}
                                                    />
                                        <div className={`bg-black/60 border-2 ${isClassicNeon || isNavyGolden ? 'border-[#A6FF00]/50 group-hover:border-[#A6FF00]' : 'border-amber-900/50 group-hover:border-amber-500'} rounded-lg flex items-center justify-center transition-all peer-checked:${isClassicNeon || isNavyGolden ? 'bg-[#A6FF00] border-[#A6FF00]' : 'bg-amber-600 border-amber-600'}`}>
                                            <CheckCircle className={`w-4 h-4 ${isClassicNeon || isNavyGolden ? 'text-black' : 'text-black'} transition-opacity ${formData.battleOath ? 'opacity-100' : 'opacity-0'}`} />
                                        </div>
                                                </div>
                                <div className="space-y-1">
                                                    <p className={`text-xs font-black ${isClassicNeon || isNavyGolden ? 'text-white' : 'text-amber-100'} uppercase tracking-tight`}>
                                                        {isClassicNeon || isNavyGolden ? 'I accept all rules' : 'I accept the terms'}
                                                    </p>
                                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                                                        I confirm that all information provided is accurate.
                                                    </p>
                                                </div>
                                            </label>
                                        </div>
                                    </div>

             </div>
                            )}
                        </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Right Side: Preview & Highlights (For Neon Themes) */}
                        {(isClassicNeon || isNavyGolden) && (
                            <div className="hidden lg:block lg:w-[400px] space-y-8 sticky top-12">
                                {/* Jersey Preview Card */}
                                <div className="bg-[#0F1413] border-2 border-[#A6FF00]/10 rounded-[3rem] p-8 relative overflow-hidden group shadow-2xl">
                                    <div className="flex items-center justify-between mb-8">
                                        <div>
                                            <h3 className="text-[11px] font-black text-[#A6FF00] uppercase tracking-[0.4em] mb-1 drop-shadow-[0_0_10px_rgba(166,255,0,0.3)] flex items-center gap-2">
                                                <Zap className="w-4 h-4" /> LIVE JERSEY PREVIEW
                                            </h3>
                                            <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">Custom kit visualization</p>
                                        </div>
                                        <div className="flex bg-black/40 border border-white/5 rounded-full p-1">
                                            {['back', 'front'].map((mode) => (
                                                <button
                                                    key={mode}
                                                    onClick={() => setJerseyViewMode(mode as any)}
                                                    className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${
                                                        jerseyViewMode === mode ? 'bg-[#A6FF00] text-black shadow-lg shadow-[#A6FF00]/10' : 'text-white/40 hover:text-white/60'
                                                    }`}
                                                >
                                                    {mode}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <JerseyPreview 
                                        name={formData.jerseyName || formData.fullName} 
                                        number={formData.jerseyNumber} 
                                        auctionLogo={config?.logoUrl || auction?.logoUrl}
                                        theme={config?.theme}
                                        viewMode={jerseyViewMode}
                                        jerseyUrl={config?.jerseyUrl || state.globalJerseyUrl}
                                        jerseyOverlayUrl={state.globalJerseyOverlayUrl}
                                    />

                                    <div className="mt-8 flex items-center justify-between gap-4 px-4">
                                        <div className="text-center">
                                            <p className="text-[10px] font-black text-white uppercase tracking-tighter">Premium Fabric</p>
                                            <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Dri-Fit Technology</p>
                                        </div>
                                        <div className="h-8 w-px bg-white/10" />
                                        <div className="text-center">
                                            <p className="text-[10px] font-black text-white uppercase tracking-tighter">HD Sublimation</p>
                                            <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Glow-Safe Prints</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Highlights Section */}
                                <div className="bg-[#0F1413] border-2 border-[#A6FF00]/5 rounded-[3rem] p-8 relative overflow-hidden group shadow-2xl">
                                    <h3 className="text-[11px] font-black text-[#A6FF00] uppercase tracking-[0.4em] mb-10 flex items-center gap-3 drop-shadow-[0_0_10px_rgba(166,255,0,0.3)]">
                                        TOURNAMENT HIGHLIGHTS
                                    </h3>
                                    <div className="space-y-6">
                                        {[
                                            { icon: Megaphone, title: 'EXCITING MATCHES', desc: 'T20 High-Octane Format' },
                                            { icon: Users, title: 'TOP TALENTS', desc: 'Best players in the region' },
                                            { icon: Trophy, title: 'GRAND CEREMONY', desc: 'IPL Style auction & finale' }
                                        ].map((item, idx) => (
                                            <div key={`rule-item-${idx}`} className="flex items-center gap-4 group/item">
                                                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 group-hover/item:border-[#A6FF00]/30 group-hover/item:bg-[#A6FF00]/5 transition-all">
                                                    <item.icon className="w-5 h-5 text-[#A6FF00]/60 group-hover/item:text-[#A6FF00]" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-white uppercase tracking-[0.1em] mb-0.5">{item.title}</p>
                                                    <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">{item.desc}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Navigation Buttons */}
                    <div className="mt-12 flex items-center justify-between gap-6">
                        {currentStep > 0 ? (
                                <button 
                                    onClick={prevStep}
                                    className={`px-10 py-5 rounded-full border-2 transition-all active:scale-95 flex items-center gap-3 font-black uppercase tracking-widest ${
                                        isClassicNeon || isNavyGolden 
                                            ? 'border-[#A6FF00]/20 text-[#A6FF00] hover:bg-[#A6FF00]/5' 
                                            : 'border-amber-900/30 text-amber-500 hover:bg-amber-500/10'
                                    }`}
                                >
                                    <ChevronLeft className="w-5 h-5" /> BACK
                                </button>
                        ) : <div />}

                        {currentStep < steps.length - 1 ? (
                                <button 
                                    onClick={nextStep}
                                    className={`px-12 py-5 rounded-full transition-all shadow-2xl active:scale-95 flex items-center gap-3 font-black uppercase tracking-widest ${
                                        isClassicNeon || isNavyGolden 
                                            ? 'bg-[#A6FF00] text-black shadow-[#A6FF00]/20 hover:scale-[1.02]' 
                                            : 'bg-amber-600 hover:bg-amber-500 text-black shadow-[0_10px_30px_-10px_rgba(251,191,36,0.5)]'
                                    }`}
                                >
                                    NEXT <ChevronRight className="w-5 h-5" />
                                </button>
                        ) : (
                            <button 
                                disabled={!formData.battleOath || submitting}
                                onClick={handleSubmit}
                                className={`px-16 py-6 rounded-full font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-4 ${
                                    !formData.battleOath || submitting 
                                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50 shadow-none' 
                                        : isClassicNeon 
                                            ? 'bg-[#A6FF00] text-black shadow-[#A6FF00]/40' 
                                            : 'bg-amber-600 hover:bg-amber-500 text-black shadow-[0_10px_40px_-10px_rgba(251,191,36,0.5)]'
                                }`}
                            >
                                {submitting ? <Loader2 className="animate-spin w-6 h-6" /> : (
                                    <>
                                        {isClassicNeon ? <Zap className="w-6 h-6" /> : isAdvaya ? <Sword className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />} 
                                        {isClassicNeon ? 'REGISTER NOW' : isAdvaya ? 'REGISTER NOW' : 'FINISH REGISTRATION'}
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen font-sans py-10 px-4 transition-colors duration-1000 ${isAdvaya || isClassicNeon ? 'bg-[#0a0a0a] text-amber-50' : 'bg-gray-50 text-gray-900'}`}>
            {/* Back Button */}
            <div className="max-w-2xl mx-auto mb-6 flex items-center justify-between relative z-[110]">
                <button 
                    onClick={() => navigate('/')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                        isAdvaya 
                        ? 'bg-amber-600/10 border border-amber-600/30 text-amber-500 hover:bg-amber-600/20' 
                        : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 shadow-sm'
                    }`}
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Home
                </button>
            </div>

            <AnimatePresence>
                {isAdvaya && showBattleEntrance && !battleStarted && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-6 overflow-hidden"
                    >
                        {/* Background Effects */}
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.15)_0%,transparent_70%)]" />
                        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
                        
                        {showPoster ? (
                            <motion.div 
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 1.1, opacity: 0 }}
                                className="relative z-20 max-w-2xl w-full bg-black border-4 border-amber-500/30 rounded-[3rem] overflow-hidden shadow-[0_0_50px_rgba(251,191,36,0.2)]"
                            >
                                <div className="w-full overflow-y-auto max-h-[90vh] custom-scrollbar">
                                    <img src={config?.bannerUrl || null} referrerPolicy="no-referrer" className="w-full h-auto block" />
                                    <div className="p-8 bg-black/95 border-t border-amber-500/20 text-center">
                                        <button 
                                            onClick={() => setShowPoster(false)}
                                            className="bg-amber-600 hover:bg-amber-500 text-black font-black px-12 py-5 rounded-full text-lg uppercase tracking-widest transition-all shadow-2xl flex items-center gap-4 mx-auto active:scale-95"
                                        >
                                            NEXT
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ scale: 0.5, opacity: 0, y: 50 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className="relative z-10 text-center"
                            >
                                {config?.logoUrl && (
                                    <motion.img 
                                        initial={{ y: -20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.5, duration: 0.8 }}
                                        src={config.logoUrl} 
                                        referrerPolicy="no-referrer"
                                        className="w-40 h-40 mx-auto mb-8 object-contain drop-shadow-[0_0_25px_rgba(251,191,36,0.5)]" 
                                    />
                                )}
                                
                                <motion.h2 
                                    initial={{ letterSpacing: "0.5em", opacity: 0 }}
                                    animate={{ letterSpacing: "0.1em", opacity: 1 }}
                                    transition={{ delay: 1, duration: 1.2 }}
                                    className="text-4xl md:text-6xl font-black text-amber-500 uppercase mb-4 drop-shadow-lg"
                                >
                                    {auction?.title || 'JOIN TOURNAMENT'}
                                </motion.h2>

                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 1.5, duration: 0.8 }}
                                    className="flex flex-col items-center gap-2 mb-8"
                                >
                                    <div className="flex items-center gap-3 text-amber-200/60 font-black uppercase tracking-[0.2em] text-sm">
                                        <Calendar className="w-4 h-4" /> Auction Date: {auction?.date || 'TBD'}
                                    </div>
                                    <div className="flex items-center gap-3 text-amber-200/60 font-black uppercase tracking-[0.2em] text-sm">
                                        <Home className="w-4 h-4" /> Ground: {auction?.venue || 'TBD'}
                                    </div>
                                </motion.div>
                                
                                <motion.p 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 2.2, duration: 0.8 }}
                                    className="text-xl md:text-2xl font-bold text-white uppercase tracking-[0.3em] mb-12 italic"
                                >
                                    Are you ready to join?
                                </motion.p>
                                
                                <motion.button
                                    whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(251,191,36,0.4)" }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setBattleStarted(true)}
                                    className="bg-amber-600 hover:bg-amber-500 text-black font-black px-12 py-5 rounded-full text-xl uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(251,191,36,0.2)] flex items-center gap-4 mx-auto"
                                >
                                    REGISTER NOW
                                </motion.button>
                            </motion.div>
                        )}

                        {/* Animated Particles/Lines */}
                        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-30 animate-pulse" />
                    </motion.div>
                )}
            </AnimatePresence>


            <div className={`max-w-2xl mx-auto shadow-2xl rounded-[2.5rem] overflow-hidden border animate-fade-in relative ${isNavyGolden || isClassicNeon ? 'bg-[#070B0A] border-[#A6FF00]/20' : isAdvaya ? 'bg-[#151515] border-amber-900/30' : 'bg-white border-gray-200'}`}>
                {/* Main Card Neon Border */}
                {(isAdvaya || isNavyGolden || isClassicNeon) && (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit] z-0">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                            className={`absolute inset-[-150%] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_270deg,${isClassicNeon || isNavyGolden ? '#A6FF00' : '#f59e0b'}_360deg)] opacity-30 blur-[15px]`}
                        />
                    </div>
                )}
                <div className="relative z-10">
                    <div className={`${isClassicNeon || isNavyGolden ? 'bg-[#0F1413]' : isAdvaya ? 'bg-gradient-to-b from-amber-900/40 to-transparent' : 'bg-blue-600'} p-10 text-center relative overflow-hidden`}>
                    {(isAdvaya || isNavyGolden || isClassicNeon) ? (
                        <>
                            <div className={`absolute inset-0 opacity-10 ${isClassicNeon || isNavyGolden ? 'bg-transparent' : "bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]"}`} />
                            <motion.div 
                                initial={{ y: -50, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className="relative z-10"
                            >
                                {config?.bannerUrl && (
                                    <img src={config.bannerUrl} referrerPolicy="no-referrer" className={`w-full h-32 object-cover rounded-2xl mb-6 border ${isClassicNeon || isNavyGolden ? 'border-[#A6FF00]/20' : 'border-amber-500/20'} shadow-2xl`} />
                                )}
                                <div className="flex items-center justify-center gap-4 mb-4">
                                    {isClassicNeon || isNavyGolden ? <Zap className="w-8 h-8 text-[#A6FF00]" /> : isAdvaya ? <Sword className="w-8 h-8 text-amber-500" /> : <ShieldCheck className="w-8 h-8 text-amber-500" />}
                                    <h3 className={`text-4xl font-black uppercase tracking-tighter ${isClassicNeon || isNavyGolden ? 'text-[#A6FF00]' : 'text-amber-500'} drop-shadow-md italic`}>{auction?.title || "JOIN TOURNAMENT"}</h3>
                                    {isClassicNeon || isNavyGolden ? <Zap className="w-8 h-8 text-[#A6FF00]" /> : isAdvaya ? <Shield className="w-8 h-8 text-amber-500" /> : <Trophy className="w-8 h-8 text-amber-500" />}
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <p className={`text-[10px] font-black tracking-[0.5em] ${isClassicNeon || isNavyGolden ? 'text-[#A6FF00]/60' : 'text-amber-200/60'} uppercase`}>
                                        {isClassicNeon || isNavyGolden ? 'OFFICIAL REGISTRATION' : 'Player Registration'}
                                    </p>
                                    <div className="flex items-center gap-3">
                                        {config?.maxRegistrations > 0 && (
                                            <div className={`mt-4 px-4 py-2 rounded-full ${isClassicNeon || isNavyGolden ? 'bg-[#A6FF00]/10 border border-[#A6FF00]/30 text-[#A6FF00]' : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'} text-[10px] font-black uppercase tracking-widest`}>
                                                <Users className="inline w-3 h-3 mr-2" /> {displayCount} {displayMax ? `/ ${displayMax} PLAYERS REGISTERED` : 'PLAYERS REGISTERED'}
                                            </div>
                                        )}
                                        {auction?.season && (
                                            <div className={`mt-4 px-4 py-2 rounded-full ${isClassicNeon || isNavyGolden ? 'bg-[#A6FF00]/10 border border-[#A6FF00]/30 text-[#A6FF00]' : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'} text-[11px] font-black uppercase tracking-[0.2em] italic shadow-[0_0_15px_rgba(166,255,0,0.1)]`}>
                                                {auction?.season && `SEASON ${auction.season.toString().replace(/[^0-9]/g, '') || auction.season}`}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        </>
                    ) : (
                        <>
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                            <h1 className="text-3xl font-black uppercase tracking-tighter relative z-10">{auction?.title || "REGISTRATION"}</h1>
                            <p className="text-[10px] font-bold tracking-[0.4em] mt-2 opacity-60 relative z-10 uppercase">Official Form</p>
                            {config?.maxRegistrations > 0 && (
                                <div className="mt-6 inline-flex items-center px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white text-[10px] font-black uppercase tracking-widest relative z-10">
                                    <Users className="inline w-3 h-3 mr-2" /> {displayCount} {displayMax ? `/ ${displayMax} REGISTERED` : 'REGISTERED'}
                                </div>
                            )}
                        </>
                    )}
                </div>
                
                <form onSubmit={handleSubmit} className="p-10 space-y-8">
                    <div className={`space-y-6 ${isNavyGolden ? 'bg-[#001f3f]' : ''}`}>
                        {validatedOrganiserCode && (
                            <div className={`p-5 rounded-3xl border-2 font-black text-xs uppercase tracking-widest text-center flex flex-col md:flex-row items-center justify-center gap-3 ${
                                isClassicNeon ? 'bg-[#A6FF00]/10 border-[#A6FF00]/30 text-[#A6FF00]' : 'bg-green-500/10 border-green-500/30 text-green-400'
                            }`}>
                                <CheckCircle className="w-5 h-5" />
                                <span>VERIFIED ORGANIZER REGISTRATION : <span className="font-mono text-white bg-black/40 px-3 py-1.5 rounded-xl ml-1">{validatedOrganiserCode.code}</span></span>
                            </div>
                        )}
                        {/* DEFAULT FIELDS */}
                        {(!config?.basicFields || config.basicFields.name?.show !== false) && (
                                <motion.div
                                    initial={(isAdvaya || isNavyGolden) ? { x: -20, opacity: 0 } : {}}
                                    animate={(isAdvaya || isNavyGolden) ? { x: 0, opacity: 1 } : {}}
                                    transition={{ delay: 0.1 }}
                                >
                                <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ml-1 ${isClassicNeon || isNavyGolden ? 'text-[#A6FF00]/70' : 'text-amber-500/70'}`}>
                                    {isClassicNeon || isAdvaya || isNavyGolden ? 'Full Name' : 'Full Name'} {(!config?.basicFields || config.basicFields.name?.required !== false) && <span className="text-red-500">*</span>}
                                </label>
                                <input required={!config?.basicFields || config.basicFields.name?.required !== false} className={`w-full rounded-2xl px-6 py-4 font-bold outline-none transition-all ${isClassicNeon || isNavyGolden ? 'bg-[#0F1413] border-2 border-[#A6FF00]/20 text-white focus:border-[#A6FF00] focus:shadow-[0_0_20px_rgba(166,255,0,0.1)]' : 'bg-black/40 border-2 border-amber-900/30 text-amber-100 focus:border-amber-500'}`} value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} placeholder={isClassicNeon || isAdvaya || isNavyGolden ? "ENTER PLAYER NAME" : "ENTER FULL NAME"} />
                            </motion.div>
                        )}
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {(!config?.basicFields || config.basicFields.mobile?.show !== false) && (
                                <motion.div
                                    initial={isAdvaya ? { x: -20, opacity: 0 } : {}}
                                    animate={isAdvaya ? { x: 0, opacity: 1 } : {}}
                                    transition={{ delay: 0.2 }}
                                >
                                    <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ml-1 ${isClassicNeon || isNavyGolden ? 'text-[#A6FF00]/70' : 'text-amber-500/70'}`}>
                                        {isClassicNeon || isAdvaya || isNavyGolden ? 'Mobile Number' : 'Mobile Number'} {(!config?.basicFields || config.basicFields.mobile?.required !== false) && <span className="text-red-500">*</span>}
                                    </label>
                                    <input required={!config?.basicFields || config.basicFields.mobile?.required !== false} type="tel" className={`w-full rounded-2xl px-6 py-4 font-bold outline-none transition-all ${isClassicNeon || isNavyGolden ? 'bg-[#0F1413] border-2 border-[#A6FF00]/20 text-white focus:border-[#A6FF00] focus:shadow-[0_0_20px_rgba(166,255,0,0.1)]' : 'bg-black/40 border-2 border-amber-900/30 text-amber-100 focus:border-amber-500'}`} value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} placeholder="Enter 10 digit mobile number" />
                                </motion.div>
                            )}
                            {(!config?.basicFields || config.basicFields.dob?.show !== false) && (
                                <motion.div
                                    initial={isAdvaya ? { x: 20, opacity: 0 } : {}}
                                    animate={isAdvaya ? { x: 0, opacity: 1 } : {}}
                                    transition={{ delay: 0.2 }}
                                >
                                    <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ml-1 ${isClassicNeon || isNavyGolden ? 'text-[#A6FF00]/70' : 'text-amber-500/70'}`}>
                                        Date of Birth {(!config?.basicFields || config.basicFields.dob?.required !== false) && <span className="text-red-500">*</span>}
                                    </label>
                                    <input required={!config?.basicFields || config.basicFields.dob?.required !== false} type="date" className={`w-full rounded-2xl px-6 py-4 font-bold outline-none transition-all ${isClassicNeon || isNavyGolden ? 'bg-[#0F1413] border-2 border-[#A6FF00]/20 text-white focus:border-[#A6FF00] focus:shadow-[0_0_20px_rgba(166,255,0,0.1)]' : 'bg-black/40 border-2 border-amber-900/30 text-amber-100 focus:border-amber-500'}`} value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} />
                                </motion.div>
                            )}
                        </div>

                        {(!config?.basicFields || config.basicFields.gender?.show !== false) && (
                            <motion.div
                                initial={isAdvaya ? { y: 20, opacity: 0 } : {}}
                                animate={isAdvaya ? { y: 0, opacity: 1 } : {}}
                                transition={{ delay: 0.3 }}
                            >
                                <TournamentDropdown
                                    label="Gender"
                                    value={formData.gender}
                                    onChange={(e: any) => setFormData({...formData, gender: e.target.value})}
                                    options={['Male', 'Female', 'Other']}
                                    required={!config?.basicFields || config.basicFields.gender?.required !== false}
                                    placeholder="SELECT GENDER"
                                    theme={config?.theme}
                                />
                            </motion.div>
                        )}

                        {(!config?.basicFields || config.basicFields.role?.show !== false) && (
                            <motion.div
                                initial={isAdvaya ? { y: 20, opacity: 0 } : {}}
                                animate={isAdvaya ? { y: 0, opacity: 1 } : {}}
                                transition={{ delay: 0.35 }}
                            >
                                <label className={`block text-[10px] font-black uppercase tracking-widest mb-3 ml-1 ${isClassicNeon ? 'text-[#A6FF00]/70' : isAdvaya ? 'text-blue-500' : 'text-gray-400'}`}>
                                    Select Your Role {(!config?.basicFields || config.basicFields.role?.required !== false) && <span className="text-red-500">*</span>}
                                </label>
                                <div className="flex flex-wrap gap-2.5">
                                    {roles.length > 0 ? (
                                        roles.map((r, idx) => (
                                            <button key={`role-btn-${r.id}-${idx}`} type="button" onClick={() => setFormData({...formData, playerType: r.name})} className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all active:scale-95 ${formData.playerType === r.name ? (isClassicNeon ? 'bg-[#A6FF00] border-[#A6FF00] text-black shadow-[0_0_15px_rgba(166,255,0,0.3)]' : isAdvaya ? 'bg-amber-600 border-amber-600 text-black shadow-[0_0_15px_rgba(251,191,36,0.3)]' : 'bg-blue-600 border-blue-600 text-white shadow-lg') : (isClassicNeon ? 'bg-[#0F1413] border-[#A6FF00]/20 text-[#A6FF00]/50 hover:border-[#A6FF00]/50' : isAdvaya ? 'bg-black/40 border-amber-900/30 text-amber-500/50 hover:border-amber-500/50' : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200')}`}>
                                                {r.name}
                                            </button>
                                        ))
                                    ) : (
                                        <div className={`text-[10px] font-bold uppercase tracking-widest p-4 border border-dashed rounded-xl w-full text-center ${isClassicNeon ? 'border-[#A6FF00]/20 text-[#A6FF00]/40' : isAdvaya ? 'border-amber-900/30 text-amber-500/40' : 'border-gray-200 text-gray-400'}`}>
                                            No roles defined.
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* CUSTOM FIELDS DYNAMIC RENDERING */}
                        {(config?.customFields || []).length > 0 && (
                            <div className={`pt-4 border-t space-y-6 ${isClassicNeon ? 'border-[#A6FF00]/20' : isNavyGolden ? 'border-[#ffd700]/20' : isAdvaya ? 'border-amber-900/30' : 'border-gray-100'}`}>
                                <h3 className={`text-[11px] font-black uppercase tracking-[0.25em] flex items-center gap-2 ${isClassicNeon ? 'text-[#A6FF00]' : isNavyGolden ? 'text-[#ffd700]' : isAdvaya ? 'text-amber-500' : 'text-indigo-500'}`}>
                                    {isClassicNeon ? <Zap className="w-4 h-4"/> : isNavyGolden ? <Trophy className="w-4 h-4"/> : isAdvaya ? <Zap className="w-4 h-4"/> : <AlignLeft className="w-4 h-4"/>} {isAdvaya || isClassicNeon ? 'ADDITIONAL ATTRIBUTES' : 'ADDITIONAL DETAILS'}
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {(config?.customFields || []).map((field: any, idx: number) => (
                                        <motion.div 
                                            key={`custom-field-${field.id}-${idx}`} 
                                            initial={isAdvaya ? { opacity: 0, y: 10 } : {}}
                                            animate={isAdvaya ? { opacity: 1, y: 0 } : {}}
                                            transition={{ delay: 0.4 + (idx * 0.05) }}
                                            className={field.type === 'textarea' ? 'md:col-span-2' : ''}
                                        >
                                            {field.type === 'select' ? (
                                                <TournamentDropdown
                                                    label={field.label}
                                                    value={formData[field.id]}
                                                    onChange={(e: any) => setFormData({...formData, [field.id]: e.target.value})}
                                                    options={field.options || []}
                                                    required={field.required}
                                                    placeholder={`SELECT ${field.label.toUpperCase()}`}
                                                    theme={config?.theme}
                                                />
                                            ) : field.type === 'textarea' ? (
                                                <textarea 
                                                    required={field.required}
                                                    className={`w-full rounded-2xl px-6 py-4 font-bold outline-none transition-all min-h-[100px] ${isClassicNeon ? 'bg-[#0F1413] border-2 border-[#A6FF00]/20 text-white focus:border-[#A6FF00]' : isAdvaya ? 'bg-black/40 border-2 border-amber-900/30 text-amber-100 focus:border-amber-500' : 'bg-gray-50 border-2 border-gray-100 text-gray-700 focus:bg-white focus:border-blue-400'}`}
                                                    value={formData[field.id]}
                                                    onChange={e => setFormData({...formData, [field.id]: e.target.value})}
                                                />
                                            ) : (
                                                <input 
                                                    required={field.required}
                                                    type={field.type}
                                                    className={`w-full rounded-2xl px-6 py-4 font-bold outline-none transition-all ${isClassicNeon ? 'bg-[#0F1413] border-2 border-[#A6FF00]/20 text-white focus:border-[#A6FF00]' : isAdvaya ? 'bg-black/40 border-2 border-amber-900/30 text-amber-100 focus:border-amber-500' : 'bg-gray-50 border-2 border-gray-100 text-gray-700 focus:bg-white focus:border-blue-400'}`}
                                                    value={formData[field.id]}
                                                    onChange={e => setFormData({...formData, [field.id]: e.target.value})}
                                                />
                                            )}
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* JERSEY DETAILS */}
                        {config?.jerseyDetailsEnabled && (
                            <div className={`pt-4 border-t space-y-6 ${isClassicNeon ? 'border-[#A6FF00]/20' : isNavyGolden ? 'border-[#ffd700]/20' : isAdvaya ? 'border-amber-900/30' : 'border-gray-100'}`}>
                                <h3 className={`text-[11px] font-black uppercase tracking-[0.25em] flex items-center gap-2 ${isClassicNeon ? 'text-[#A6FF00]' : isNavyGolden ? 'text-[#ffd700]' : isAdvaya ? 'text-amber-500' : 'text-indigo-500'}`}>
                                    <Shield className="w-4 h-4"/> JERSEY SPECIFICATIONS
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {(!config?.jerseyFields || config.jerseyFields.name?.show !== false) && (
                                        <motion.div initial={isAdvaya ? { opacity: 0, y: 10 } : {}} animate={isAdvaya ? { opacity: 1, y: 0 } : {}}>
                                            <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ml-1 ${isClassicNeon || isNavyGolden ? 'text-[#A6FF00]/70' : 'text-amber-500/70'}`}>
                                                Name on Jersey {config?.jerseyFields?.name?.required && <span className="text-red-500">*</span>}
                                            </label>
                                            <input 
                                                required={config?.jerseyFields?.name?.required}
                                                className={`w-full rounded-2xl px-6 py-4 font-bold outline-none transition-all ${isClassicNeon || isNavyGolden ? 'bg-[#0F1413] border-2 border-[#A6FF00]/20 text-white focus:border-[#A6FF00]' : 'bg-black/40 border-2 border-amber-900/30 text-amber-100 focus:border-amber-500'}`}
                                                value={formData.jerseyName}
                                                onChange={e => setFormData({...formData, jerseyName: e.target.value})}
                                                placeholder="NAME ON JERSEY"
                                            />
                                        </motion.div>
                                    )}
                                    {(!config?.jerseyFields || config.jerseyFields.number?.show !== false) && (
                                        <motion.div initial={isAdvaya ? { opacity: 0, y: 10 } : {}} animate={isAdvaya ? { opacity: 1, y: 0 } : {}}>
                                            <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ml-1 ${isClassicNeon || isNavyGolden ? 'text-[#A6FF00]/70' : 'text-amber-500/70'}`}>
                                                Jersey Number {config?.jerseyFields?.number?.required && <span className="text-red-500">*</span>}
                                            </label>
                                            <input 
                                                required={config?.jerseyFields?.number?.required}
                                                type="number"
                                                className={`w-full rounded-2xl px-6 py-4 font-bold outline-none transition-all ${isClassicNeon || isNavyGolden ? 'bg-[#0F1413] border-2 border-[#A6FF00]/20 text-white focus:border-[#A6FF00]' : 'bg-black/40 border-2 border-amber-900/30 text-amber-100 focus:border-amber-500'}`}
                                                value={formData.jerseyNumber}
                                                onChange={e => setFormData({...formData, jerseyNumber: e.target.value})}
                                                placeholder="JERSEY NUMBER"
                                            />
                                        </motion.div>
                                    )}
                                    {(!config?.jerseyFields || config.jerseyFields.size?.show !== false) && (
                                        <motion.div initial={isAdvaya ? { opacity: 0, y: 10 } : {}}>
                                            <TournamentDropdown
                                                label="Select Size"
                                                value={formData.jerseySize}
                                                onChange={(e: any) => setFormData({...formData, jerseySize: e.target.value})}
                                                options={config?.jerseyFields?.size?.options && config.jerseyFields.size.options.length > 0 ? config.jerseyFields.size.options : ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL']}
                                                required={config?.jerseyFields?.size?.required}
                                                placeholder="SELECT SIZE"
                                                theme={config?.theme}
                                            />
                                        </motion.div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                            {(!config?.basicFields || config.basicFields.photo?.show !== false) && (
                                <motion.div
                                    initial={(isAdvaya || isNavyGolden) ? { opacity: 0, scale: 0.9 } : {}}
                                    animate={(isAdvaya || isNavyGolden) ? { opacity: 1, scale: 1 } : {}}
                                    transition={{ delay: 0.5 }}
                                >
                                    <label className={`block text-[10px] font-black uppercase tracking-widest mb-3 ml-1 ${isClassicNeon ? 'text-[#A6FF00]/70' : isNavyGolden ? 'text-[#ffd700]/70' : isAdvaya ? 'text-blue-500' : 'text-gray-400'}`}>
                                        {isClassicNeon || !isAdvaya ? 'PLAYER PHOTO' : 'PLAYER PORTRAIT'} {(!config?.basicFields || config.basicFields.photo?.required !== false) && <span className="text-red-500">*</span>}
                                    </label>
                                    <div onClick={() => !isUploadingPhoto && profileInputRef.current?.click()} className={`w-full h-48 rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative group border-2 border-dashed ${isClassicNeon ? 'bg-[#0F1413] border-[#A6FF00]/30 hover:border-[#A6FF00]' : isNavyGolden ? 'bg-[#001f3f]/40 border-[#ffd700]/30 hover:border-[#ffd700]' : isAdvaya ? 'bg-black/40 border-amber-900/30 hover:border-amber-500' : 'bg-gray-50 border-gray-200 hover:bg-white hover:border-blue-400'}`}>
                                        {(isAdvaya || isNavyGolden || isClassicNeon) && (
                                            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit] z-0">
                                                <motion.div
                                                    animate={{ rotate: 360 }}
                                                    transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                                                    className={`absolute inset-[-150%] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_270deg,${isClassicNeon ? '#A6FF00' : isNavyGolden ? '#ffd700' : '#f59e0b'}_360deg)] opacity-20 blur-[8px]`}
                                                />
                                                <div className={`absolute inset-[2px] ${isClassicNeon ? 'bg-[#0F1413]' : isNavyGolden ? 'bg-[#001f3f]/80' : 'bg-black/80'} rounded-[inherit] z-0`} />
                                            </div>
                                        )}
                                        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
                                            {isUploadingPhoto ? (
                                                <div className="text-center p-4">
                                                    <Loader2 className={`w-8 h-8 animate-spin mx-auto mb-2 ${isClassicNeon ? 'text-[#A6FF00]' : isNavyGolden ? 'text-[#ffd700]' : 'text-amber-500'}`} />
                                                    <p className={`text-[10px] font-black uppercase tracking-widest ${isClassicNeon ? 'text-[#A6FF00]' : isNavyGolden ? 'text-[#ffd700]' : 'text-amber-500'}`}>Uploading Image...</p>
                                                    <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">Images over 1MB compressed to 1MB</p>
                                                </div>
                                            ) : profilePic ? (
                                                <div className="w-full h-full relative group">
                                                    <img src={profilePic} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-black uppercase tracking-widest">
                                                        Click to Replace Photo
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-center">
                                                    <Upload className={`w-8 h-8 mx-auto mb-2 ${isClassicNeon ? 'text-[#A6FF00]' : isNavyGolden ? 'text-[#ffd700]' : isAdvaya ? 'text-amber-900' : 'text-gray-300'}`} />
                                                    <p className={`text-[10px] font-black uppercase tracking-widest ${isClassicNeon ? 'text-[#A6FF00]' : isNavyGolden ? 'text-[#ffd700]' : isAdvaya ? 'text-amber-900' : 'text-gray-400'}`}>{isClassicNeon || !isAdvaya ? 'Select Photo' : 'Select Image'}</p>
                                                    <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">Up to 1MB original • Larger compressed to 1MB</p>
                                                </div>
                                            )}
                                        </div>
                                        <input ref={profileInputRef} type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                                    </div>
                                </motion.div>
                            )}
                            
                            {config?.includePayment && config.paymentMethod === 'MANUAL' && (
                                <motion.div
                                    initial={(isAdvaya || isNavyGolden) ? { opacity: 0, scale: 0.9 } : {}}
                                    animate={(isAdvaya || isNavyGolden) ? { opacity: 1, scale: 1 } : {}}
                                    transition={{ delay: 0.6 }}
                                    className="md:col-span-2"
                                >
                                    {finalFee === 0 ? (
                                        <div className={`p-12 text-center border-2 border-dashed rounded-[3rem] ${isNavyGolden ? 'bg-[#001f3f]/40 border-green-500/20 text-green-400' : isAdvaya ? 'bg-black/40 border-green-500/20 text-green-400' : 'bg-green-50 border-green-100 text-green-700'}`}>
                                            <div className="w-20 h-20 bg-green-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-green-500/20">
                                                <ShieldCheck className="w-10 h-10" />
                                            </div>
                                            <h4 className="text-2xl font-black uppercase tracking-tight mb-2">FEE WAIVED</h4>
                                            <p className="text-xs font-bold uppercase tracking-widest opacity-80">{validatedOrganiserCode ? `Registration Code ${validatedOrganiserCode.code} applied successfully.` : 'Registration is free for this tournament.'}</p>
                                            <p className="text-[10px] font-medium uppercase tracking-widest opacity-60 mt-2">Registration is free. You can submit the form directly.</p>
                                        </div>
                                    ) : (
                                        <>
                                            <label className={`block text-[10px] font-black uppercase tracking-widest mb-4 ml-1 text-center ${isNavyGolden ? 'text-[#ffd700]/70' : isAdvaya ? 'text-amber-500/70' : 'text-gray-400'}`}>{isAdvaya ? 'Verify Payment' : 'Payment Confirmation'} (₹{finalFee})</label>
                                            <div className={`p-8 rounded-[2.5rem] border-2 flex flex-col items-center gap-8 ${isNavyGolden ? 'bg-[#001f3f]/40 border-[#ffd700]/20' : isAdvaya ? 'bg-black/40 border-amber-500/20' : 'bg-blue-50 border-blue-100'}`}>
                                                <div className="text-center space-y-2">
                                                    <p className={`text-[11px] font-black uppercase tracking-[0.2em] ${isNavyGolden ? 'text-[#ffd700]' : isAdvaya ? 'text-amber-500' : 'text-blue-600'}`}>{isAdvaya ? 'Scan to Pay via UPI' : 'Scan to Pay'}</p>
                                                    <div className="space-y-1">
                                                        <p className={`text-[10px] font-bold uppercase tracking-widest ${isNavyGolden ? 'text-[#ffd700]/70' : isAdvaya ? 'text-slate-400' : 'text-gray-500'}`}>{isAdvaya ? 'Receiver' : 'Pay to'}: <span className={isNavyGolden ? 'text-[#ffd700]' : isAdvaya ? 'text-amber-200' : 'text-gray-900'}>{config.upiName}</span></p>
                                                        <p className={`text-[10px] font-bold uppercase tracking-widest ${isNavyGolden ? 'text-[#ffd700]/70' : isAdvaya ? 'text-slate-400' : 'text-gray-500'}`}>UPI ID: <span className={isNavyGolden ? 'text-[#ffd700]' : isAdvaya ? 'text-amber-200' : 'text-gray-900'}>{config.upiId}</span></p>
                                                    </div>
                                                </div>
                                                
                                                <div className={`p-6 bg-white rounded-[2.5rem] shadow-2xl border-4 ${isNavyGolden ? 'border-[#ffd700]' : isAdvaya ? 'border-amber-500' : 'border-blue-600'}`}>
                                                    <img src={config.qrCodeUrl} referrerPolicy="no-referrer" className="w-64 h-64 object-contain" />
                                                </div>

                                                <div className="flex items-center gap-4 w-full max-w-xs">
                                                    <div className={`h-[1px] flex-1 ${isNavyGolden ? 'bg-[#ffd700]/20' : isAdvaya ? 'bg-amber-500/20' : 'bg-blue-200'}`} />
                                                    <span className={`text-[8px] font-black uppercase tracking-widest ${isNavyGolden ? 'text-[#ffd700]/50' : isAdvaya ? 'text-amber-500/50' : 'text-blue-400'}`}>{isAdvaya ? 'Then' : 'Next Step'}</span>
                                                    <div className={`h-[1px] flex-1 ${isNavyGolden ? 'bg-[#ffd700]/20' : isAdvaya ? 'bg-amber-500/20' : 'bg-blue-200'}`} />
                                                </div>

                                                <div onClick={() => !isUploadingPayment && paymentInputRef.current?.click()} className={`w-full max-w-sm h-24 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative border-2 border-dashed group ${isNavyGolden ? 'bg-[#001f3f]/40 border-[#ffd700]/30 hover:border-[#ffd700]' : isAdvaya ? 'bg-black/40 border-amber-900/30 hover:border-amber-500' : 'bg-white border-blue-200 hover:bg-blue-50 hover:border-blue-400'}`}>
                                                    {(isAdvaya || isNavyGolden) && (
                                                        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit] z-0">
                                                            <motion.div
                                                                animate={{ rotate: 360 }}
                                                                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                                                                className={`absolute inset-[-150%] bg-[conic-gradient(from_0deg,transparent_0deg,transparent_270deg,${isNavyGolden ? '#ffd700' : '#f59e0b'}_360deg)] opacity-60 blur-[8px]`}
                                                            />
                                                            <div className={`absolute inset-[2px] ${isNavyGolden ? 'bg-[#001f3f]/80' : 'bg-black/80'} rounded-[inherit] z-0`} />
                                                        </div>
                                                    )}
                                                    <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
                                                        {isUploadingPayment ? (
                                                            <div className="text-center p-2">
                                                                <Loader2 className={`w-6 h-6 animate-spin mx-auto mb-1 ${isClassicNeon ? 'text-[#A6FF00]' : 'text-amber-500'}`} />
                                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Uploading Screenshot...</span>
                                                            </div>
                                                        ) : paymentScreenshot ? (
                                                            <div className="relative group w-full h-full flex items-center justify-center">
                                                                <div className="flex items-center gap-3 text-green-500">
                                                                    <CheckCircle className="w-5 h-5" />
                                                                    <span className="text-[10px] font-black uppercase tracking-widest">{isClassicNeon || !isAdvaya ? 'Photo Uploaded' : 'Screenshot Attached'}</span>
                                                                </div>
                                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[9px] font-black uppercase tracking-widest rounded-xl">
                                                                    Click to Replace
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="text-center">
                                                                <Upload className={`w-6 h-6 mx-auto mb-2 ${isClassicNeon ? 'text-[#A6FF00]' : isAdvaya ? 'text-amber-900 group-hover:text-amber-500' : 'text-gray-300 group-hover:text-blue-500'} transition-colors`} />
                                                                <p className={`text-[10px] font-black uppercase tracking-widest ${isClassicNeon ? 'text-[#A6FF00]/50' : isAdvaya ? 'text-amber-900 group-hover:text-amber-500' : 'text-gray-400 group-hover:text-blue-500'} transition-colors`}>{isClassicNeon || !isAdvaya ? 'Upload Payment Screenshot' : 'Upload Payment Proof'}</p>
                                                                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Upload whatever size you want</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <input ref={paymentInputRef} type="file" className="hidden" accept="image/*" onChange={handlePaymentProofUpload} />
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </motion.div>
                            )}
                        </div>
                    </div>

                    {/* RULES & TERMS SECTION */}
                    <div className="space-y-6">
                        {(config?.organizerContacts || []).length > 0 && (
                            <motion.div 
                                initial={isAdvaya ? { opacity: 0 } : {}}
                                animate={isAdvaya ? { opacity: 1 } : {}}
                                className={`p-8 rounded-[2.5rem] border-2 ${isAdvaya ? 'bg-black/40 border-blue-500/20 text-blue-100/70' : 'bg-blue-50 border-blue-100 text-blue-900/70'}`}
                            >
                                <h4 className={`text-xs font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-3 ${isAdvaya ? 'text-blue-500' : 'text-blue-600'}`}>
                                    <Phone className="w-5 h-5" /> {isAdvaya ? 'Organizer Contact' : 'Contact Person'}
                                </h4>
                                <div className="space-y-3">
                                    {(config?.organizerContacts || []).map((contact, idx) => (
                                        <div key={`contact-item-classic-final-${idx}-${contact.name}`} className="flex items-center justify-between">
                                            <div className={`text-sm font-black tracking-widest uppercase ${isClassicNeon ? 'text-white' : ''}`}>
                                                {contact.name}
                                            </div>
                                            <a href={`tel:${contact.phone}`} className={`${isClassicNeon ? 'text-[#A6FF00]' : 'text-blue-500'} hover:opacity-80 font-bold text-xs uppercase tracking-tighter`}>
                                                {contact.phone}
                                            </a>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-[9px] font-bold mt-4 opacity-60 uppercase tracking-widest">Contact for any registration related queries</p>
                            </motion.div>
                        )}

                        {/* Terms Acceptance for Single Page Form */}
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`p-8 rounded-[2.5rem] border-2 ${isClassicNeon ? 'bg-[#0F1413] border-[#A6FF00]/20 shadow-[0_0_20px_rgba(166,255,0,0.05)]' : isAdvaya ? 'bg-amber-900/10 border-amber-500/20' : 'bg-amber-50 border-amber-100'}`}
                        >
                            <div className="flex items-start gap-4">
                                <div className="pt-1">
                                    <input 
                                        type="checkbox" 
                                        id="battle-oath-checkbox"
                                        checked={formData.battleOath}
                                        onChange={() => setFormData({...formData, battleOath: !formData.battleOath})}
                                        className={`w-6 h-6 rounded-lg cursor-pointer ${isClassicNeon ? 'accent-[#A6FF00]' : 'accent-amber-600'}`}
                                    />
                                </div>
                                <label htmlFor="battle-oath-checkbox" className="cursor-pointer">
                                    <h4 className={`text-sm font-black uppercase tracking-widest mb-2 ${isClassicNeon ? 'text-[#A6FF00]' : isAdvaya ? 'text-blue-500' : 'text-amber-700'}`}>
                                        {isClassicNeon ? 'ACCEPT TOURNAMENT POLICIES' : isAdvaya ? 'ACCEPT TERMS' : 'I Accept the Terms & Conditions'}
                                    </h4>
                                    <p className={`text-[10px] font-bold leading-relaxed uppercase tracking-widest ${isClassicNeon ? 'text-white/60' : isAdvaya ? 'text-amber-200/60' : 'text-amber-800/60'}`}>
                                        I hereby declare that all information provided is accurate and authentic. I agree to abide by the tournament protocols and maintain sportsmanship.
                                    </p>
                                </label>
                            </div>
                        </motion.div>
                    </div>

                                <button disabled={!formData.battleOath || submitting} type="submit" className={`w-full font-black py-5 rounded-[1.5rem] shadow-2xl transition-all flex items-center justify-center gap-4 group active:scale-95 uppercase text-sm tracking-widest ${isClassicNeon ? 'bg-[#A6FF00] hover:shadow-[0_0_20px_rgba(166,255,0,0.4)] text-black' : isAdvaya ? 'bg-amber-600 hover:bg-amber-500 text-black shadow-amber-900/20' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-900/20'} ${!formData.battleOath ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        {submitting ? <Loader2 className="animate-spin" /> : (config?.includePayment && config.paymentMethod === 'RAZORPAY' && finalFee > 0 ? <><CreditCard className="w-6 h-6"/> {isClassicNeon || !isAdvaya ? 'Pay' : 'Authorize'} ₹{finalFee}</> : 'REGISTER NOW')}
                    </button>
                    
                    <p className={`text-[9px] font-bold text-center uppercase tracking-widest leading-relaxed ${isClassicNeon ? 'text-white/40' : isAdvaya ? 'text-amber-900' : 'text-gray-400'}`}>
                        By submitting, you agree to the tournament protocols <br/> and verify all information is legally accurate.
                    </p>
                </form>
            </div>
        </div>
    </div>
);
};

export default PlayerRegistration;