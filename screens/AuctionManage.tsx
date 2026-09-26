import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { AuctionSetup, Team, Player, AuctionCategory, Sponsor, PlayerRole, RegistrationConfig, FormField, RegisteredPlayer, BidIncrementSlab, CaptainCode, RegistrationCode, UserRole } from '../types';
import { getEffectiveBasePrice, compressImage, safeSaveAuctionDocument, FORBIDDEN_BLOATED_AUCTION_FIELDS, pruneAndRepairAuctionDocument } from '../utils';
import { 
    ArrowLeft, Plus, Trash2, Edit, Save, X, Upload, Users, Layers, Trophy, 
    DollarSign, Image as ImageIcon, Briefcase, FileText, Settings, QrCode, 
    AlignLeft, CheckSquare, Square, Palette, ChevronDown, Search, CheckCircle, 
    XCircle, Clock, Calendar, Info, ListPlus, Eye, EyeOff, Copy, Link as LinkIcon, 
    Check as CheckIcon, Check, ShieldCheck, Tag, User, TrendingUp, CreditCard, Shield, 
    UserCheck, UserX, Share2, Download, FileSpreadsheet, Filter, Key, 
    ExternalLink, LayoutList, ToggleRight, ToggleLeft, RefreshCw, FileUp, 
    Star, UserPlus, Loader2, FileDown, ChevronRight, Zap, ListChecks, Type, Hash, ChevronDownCircle, Megaphone, Phone, Printer, LayoutGrid, Maximize2, AlertTriangle, Move
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import * as XLSX from 'xlsx';
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { useAuction } from '../hooks/useAuction';

import heic2any from 'heic2any';
import { useTheme } from '../contexts/ThemeContext';

import RecollectionManager from './RecollectionManager';

const DEFAULT_REG_CONFIG: RegistrationConfig = {
    isEnabled: false,
    registrationStatus: 'OPEN',
    autoApprove: false,
    includePayment: false,
    paymentMethod: 'MANUAL',
    isPublic: true,
    hideLandingPage: false,
    fee: 0,
    upiId: '',
    upiName: '',
    qrCodeUrl: '',
    terms: '1. Registration fee is non-refundable.\n2. Players must reporting 30 mins before match.',
    welcomePopup: { isEnabled: false, message: '', autoCloseTimer: 0 },
    welcomePosterUrl: '',
    maxRegistrations: 36,
    hideProgressBar: false,
    reserveSlotsEnabled: false,
    reserveSlotsCount: 0,
    customFields: [],
    organizerContacts: [],
    basicFields: {
        name: { show: true, required: true },
        dob: { show: true, required: true },
        photo: { show: true, required: true },
        mobile: { show: true, required: true },
        gender: { show: true, required: true },
        role: { show: true, required: true }
    },
    enableCaptainCodes: true,
    enablePlayerCodes: true,
    jerseyDetailsEnabled: false,
    jerseyFields: {
        name: { show: true, required: true },
        number: { show: true, required: true },
        size: { show: true, required: true, options: ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'] }
    }
};

const TabLoader: React.FC<{ message: string; isDark: boolean }> = ({ message, isDark }) => (
    <div className={`flex flex-col items-center justify-center py-20 px-6 rounded-[2.5rem] border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-100 shadow-sm'} animate-pulse`}>
        <div className="flex flex-col items-center gap-4">
            <Loader2 className={`w-10 h-10 animate-spin ${isDark ? 'text-accent' : 'text-blue-600'}`} />
            <p className={`text-[10px] font-black uppercase tracking-[0.2em] text-center ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                {message}
            </p>
        </div>
    </div>
);

const AuctionManage: React.FC = () => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const { userProfile } = useAuction();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'SETTINGS' | 'TEAMS' | 'PLAYERS' | 'REQUESTS' | 'CATEGORIES' | 'ROLES' | 'SPONSORS' | 'REGISTRATION' | 'WAITLIST' | 'CAPTAIN_CODES' | 'REG_CODES' | 'RECOLLECTION' | 'EXPORT'>('SETTINGS');
    const [loading, setLoading] = useState(true);
    const [auction, setAuction] = useState<AuctionSetup | null>(null);

    const [teams, setTeams] = useState<Team[]>([]);
    const [players, setPlayers] = useState<Player[]>([]);
    const [categories, setCategories] = useState<AuctionCategory[]>([]);
    const [roles, setRoles] = useState<PlayerRole[]>([]);
    const [sponsors, setSponsors] = useState<Sponsor[]>([]);
    const [registrations, setRegistrations] = useState<RegisteredPlayer[]>([]);
    const [waitlist, setWaitlist] = useState<any[]>([]);
    const [captainCodes, setCaptainCodes] = useState<CaptainCode[]>([]);
    const [registrationCodes, setRegistrationCodes] = useState<RegistrationCode[]>([]);
    
    const [teamsLoaded, setTeamsLoaded] = useState(false);
    const [playersLoaded, setPlayersLoaded] = useState(false);
    const [categoriesLoaded, setCategoriesLoaded] = useState(false);
    const [rolesLoaded, setRolesLoaded] = useState(false);
    const [sponsorsLoaded, setSponsorsLoaded] = useState(false);
    const [registrationsLoaded, setRegistrationsLoaded] = useState(false);
    const [waitlistLoaded, setWaitlistLoaded] = useState(false);
    const [captainCodesLoaded, setCaptainCodesLoaded] = useState(false);
    const [registrationCodesLoaded, setRegistrationCodesLoaded] = useState(false);
    
    const [showRegCodeModal, setShowRegCodeModal] = useState(false);
    const [editRegCode, setEditRegCode] = useState<any>({ code: '', assignedTo: 'General Code', usageLimit: 1, isActive: true });
    
    const [regConfig, setRegConfig] = useState<RegistrationConfig>(DEFAULT_REG_CONFIG);

    const [settingsForm, setSettingsForm] = useState({
        title: '', fullTournamentName: '', season: '', date: '', matchesDate: '', sport: '', purseValue: 0, basePrice: 0, bidIncrement: 0, playersPerTeam: 0, totalTeams: 0, logoUrl: '', dateTBD: false, venue: '', eventVenue: '',
        unlimitedPurse: false, autoReserveFunds: false
    });
    const [slabs, setSlabs] = useState<BidIncrementSlab[]>([]);
    const [newSlab, setNewSlab] = useState({ from: '', increment: '' });

    // CRUD Modals
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState<'TEAM' | 'PLAYER' | 'CATEGORY' | 'ROLE' | 'SPONSOR' | 'CSV'>('TEAM');
    const [editItem, setEditItem] = useState<any>(null);
    const [previewImage, setPreviewImage] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);
    const qrInputRef = useRef<HTMLInputElement>(null);
    const regLogoInputRef = useRef<HTMLInputElement>(null);
    const regBannerInputRef = useRef<HTMLInputElement>(null);
    const welcomePosterInputRef = useRef<HTMLInputElement>(null);

    // Custom Field State
    const [newField, setNewField] = useState<Partial<FormField>>({ label: '', type: 'text', required: true, options: [] });
    const [optionInput, setOptionInput] = useState('');

    // Registration Details Modal
    const [showRegModal, setShowRegModal] = useState(false);
    const [selectedReg, setSelectedReg] = useState<RegisteredPlayer | null>(null);
    const [isEditingReg, setIsEditingReg] = useState(false);
    const [expandedRegId, setExpandedRegId] = useState<string | null>(null);
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
    const [regSearchQuery, setRegSearchQuery] = useState('');
    const [regStatusFilter, setRegStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
    const [allAuctions, setAllAuctions] = useState<any[]>([]);
    const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
    const [notification, setNotification] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
    const [copySuccess, setCopySuccess] = useState(false);
    const [isAuctionSelectorOpen, setIsAuctionSelectorOpen] = useState(false);
    const [isTabSelectorOpen, setIsTabSelectorOpen] = useState(false);

    const showNotification = (message: string, type: 'error' | 'success' = 'error') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 5000);
    };

    useEffect(() => {
        if (!userProfile?.uid) return;
        const unsub = db.collection('auctions')
            .where('createdBy', '==', userProfile.uid)
            .onSnapshot(snap => {
                const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setAllAuctions(data);
            });
        return () => unsub();
    }, [userProfile]);
    
    // PDF Export States
    const [pdfTheme, setPdfTheme] = useState<'NORMAL' | 'ADVAYA'>('NORMAL');
    const [selectedFields, setSelectedFields] = useState<string[]>(['playerNumber', 'name', 'fullName', 'mobile', 'category', 'role', 'soldPrice', 'soldTo', 'jerseyName', 'jerseyNumber', 'jerseySize']);
    const [viewSummary, setViewSummary] = useState(false);
    const [playersPerPage, setPlayersPerPage] = useState<1 | 2 | 4 | 6 | 9 | 'LIST'>(1);
    const [exportCategorizedPDF, setExportCategorizedPDF] = useState(false);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const isPdfCancelled = useRef(false);
    const [pdfProgress, setPdfProgress] = useState(0);
    const [autoAssignFromBoard, setAutoAssignFromBoard] = useState(false);
    const [systemBranding, setSystemBranding] = useState({ logo: '', tagline: 'Your streaming partner' });

    const filteredRegistrations = registrations.filter(reg => {
        const matchesSearch = reg.fullName.toLowerCase().includes(regSearchQuery.toLowerCase()) || 
                             reg.mobile.includes(regSearchQuery);
        const matchesStatus = regStatusFilter === 'ALL' || reg.status === regStatusFilter;
        return matchesSearch && matchesStatus;
    });

    const autoAssignPlayerNumbers = async () => {
        if (!auction?.id) return;
        setIsGeneratingPDF(true);
        try {
            if (autoAssignFromBoard) {
                // Fetch All Category Board Data
                const draftsSnap = await db.collection('auctions').doc(id!).collection('arrangementDrafts').get();
                const settingsDoc = draftsSnap.docs.find(d => d.id === 'SETTINGS');
                const settings = settingsDoc?.data() || {};
                
                const colCount = (6 + (settings.colCountExtra || 0));
                const continuousNumbering = settings.continuousNumbering !== false; // Default to true if not specified, or match the arrangement logic

                const boardMap: { [playerId: string]: number } = {};
                
                // Get Categories for order mapping
                const catsSnap = await db.collection('auctions').doc(id!).collection('categories').get();
                const sortedCats = catsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any))
                    .sort((a, b) => (a.order || 0) - (b.order || 0));

                draftsSnap.docs.forEach(doc => {
                    if (doc.id === 'SETTINGS') return;
                    const data = doc.data();
                    const slots = data.slots || {};
                    const catIndex = sortedCats.findIndex(c => c.id === doc.id);
                    
                    Object.entries(slots).forEach(([slotKey, slotData]: [string, any]) => {
                        if (slotData.playerId) {
                            // Extract r, c from slotKey (format: CATR_C)
                            const match = slotKey.match(/(\d+)_(\d+)$/);
                            if (match) {
                                const rowIdx = parseInt(match[1]) - 1;
                                const colIdx = parseInt(match[2]) - 1;
                                
                                let slotNumber = 0;
                                if (catIndex !== -1) {
                                    slotNumber = (catIndex * colCount) + (rowIdx * colCount) + colIdx + 1;
                                } else {
                                    slotNumber = (rowIdx * colCount) + colIdx + 1;
                                }
                                boardMap[String(slotData.playerId)] = slotNumber;
                            }
                        }
                    });
                });

                if (Object.keys(boardMap).length === 0) {
                    showNotification("No placements found on Category Board to assign from.");
                    setIsGeneratingPDF(false);
                    return;
                }

                const batch = db.batch();
                let assignCount = 0;
                registrations.forEach(reg => {
                    if (boardMap[reg.id]) {
                        batch.update(db.collection('auctions').doc(id!).collection('registrations').doc(reg.id), {
                            playerNumber: boardMap[reg.id]
                        });
                        assignCount++;
                    }
                });
                await batch.commit();
                showNotification(`Assigned ${assignCount} player numbers from Category Board!`, "success");
            } else {
                const sortedRegs = [...registrations].sort((a, b) => (a.submittedAt || 0) - (b.submittedAt || 0));
                const batch = db.batch();
                sortedRegs.forEach((reg, index) => {
                    const docRef = db.collection('auctions').doc(id!).collection('registrations').doc(reg.id);
                    batch.update(docRef, { playerNumber: index + 1 });
                });
                await batch.commit();
                showNotification("Player numbers assigned by registration order!", "success");
            }
        } catch (e: any) {
            showNotification("Error assigning numbers: " + e.message);
        }
        setIsGeneratingPDF(false);
    };

    const handleUpdatePlayerNumber = async (regId: string, value: string) => {
        const num = parseInt(value);
        if (isNaN(num)) return;
        try {
            await db.collection('auctions').doc(id!).collection('registrations').doc(regId).update({
                playerNumber: num
            });
            showNotification("Number updated", "success");
        } catch (e: any) {
            showNotification("Update failed: " + e.message);
        }
    };

    const handleExportExcel = (mode: 'MASTER') => {
        if (!id) return;
        
        const wb = XLSX.utils.book_new();
        
        // Prepare Data for each team
        teams.forEach(team => {
            const teamPlayers = players.filter(p => p.soldTo === team.name);
            
            const sheetData = teamPlayers.map(p => {
                const row: any = {};
                
                // Get corresponding registration for custom fields and jersey info
                // Match by ID or name (fallback)
                const reg = registrations.find(r => String(r.id) === String(p.id)) || registrations.find(r => r.fullName === p.name);

                selectedFields.forEach(fieldId => {
                    if (fieldId === 'name') row['Player Name'] = p.name;
                    else if (fieldId === 'category') row['Category'] = p.category;
                    else if (fieldId === 'role') row['Role'] = p.role;
                    else if (fieldId === 'soldPrice') row['Sold Price'] = p.soldPrice;
                    else if (fieldId === 'soldTo') row['Team'] = p.soldTo;
                    else if (fieldId === 'isTraded') row['Traded'] = p.isTraded ? 'YES' : 'NO';
                    else if (fieldId === 'mobile') row['Mobile'] = reg?.mobile || (p as any).mobile || '-';
                    else if (fieldId === 'jerseyName') row['Jersey Name'] = reg?.jerseyName || '-';
                    else if (fieldId === 'jerseyNumber') row['Jersey Number'] = reg?.jerseyNumber || '-';
                    else if (fieldId === 'jerseySize') row['Jersey Size'] = reg?.jerseySize || '-';
                    else if (fieldId.startsWith('cf_')) {
                        const fieldIdClean = fieldId.replace('cf_', '');
                        const fieldConfig = regConfig.customFields.find(f => f.id === fieldIdClean);
                        const fieldLabel = fieldConfig?.label || fieldIdClean;
                        row[fieldLabel] = reg ? (reg as any)[fieldIdClean] || '-' : '-';
                    }
                });
                
                return row;
            });

            if (sheetData.length > 0) {
                const ws = XLSX.utils.json_to_sheet(sheetData);
                XLSX.utils.book_append_sheet(wb, ws, team.name.substring(0, 31).replace(/[\[\]\*\?\/\\]/g, '')); 
            }
        });

        // Add an "All Sold Players" sheet
        const allSold = players.filter(p => p.status === 'SOLD').map(p => ({
            'Team': p.soldTo,
            'Player Name': p.name,
            'Category': p.category,
            'Role': p.role,
            'Price': p.soldPrice
        }));
        
        if (allSold.length > 0) {
            const wsAll = XLSX.utils.json_to_sheet(allSold);
            XLSX.utils.book_append_sheet(wb, wsAll, "Master Summary");
        } else {
            // Add a placeholder sheet if no one sold yet
            const wsEmpty = XLSX.utils.json_to_sheet([{ Message: "No players sold yet." }]);
            XLSX.utils.book_append_sheet(wb, wsEmpty, "Summary");
        }

        XLSX.writeFile(wb, `${auction?.title || 'Auction'}_Summary.xlsx`);
        showNotification("Excel exported successfully!", "success");
    };

    // Captain Code State
    const [showCodeModal, setShowCodeModal] = useState(false);
    const [editCode, setEditCode] = useState<Partial<CaptainCode>>({
        code: '', assignedTo: '', teamName: '', usageLimit: 1, isActive: true, teamCodes: [], teamMaxPlayers: 11, teamUsedCount: 0
    });

    // Image Overlay State
    const [overlayImage, setOverlayImage] = useState<{ 
        url: string, 
        title: string, 
        type: 'PLAYER' | 'REGISTRATION', 
        id: string, 
        field: string 
    } | null>(null);
    const overlayInputRef = useRef<HTMLInputElement>(null);

    // Database Document Optimization & Health State
    const [docSizeInfo, setDocSizeInfo] = useState<{ size: number; isBloated: boolean } | null>(null);
    const [isRepairingDoc, setIsRepairingDoc] = useState(false);

    useEffect(() => {
        if (!id) return;
        const unsubAuction = db.collection('auctions').doc(id).onSnapshot(async doc => {
            if (doc.exists) {
                const data = doc.data() as any;
                const rawSize = JSON.stringify(data).length;
                const hasBloated = FORBIDDEN_BLOATED_AUCTION_FIELDS.some(k => data[k] !== undefined);
                setDocSizeInfo({ size: rawSize, isBloated: hasBloated || rawSize > 150000 });

                // Automatic recovery: If document is bloated with duplicate subcollection arrays or oversized fields
                if (hasBloated || rawSize > 250000) {
                    console.warn(`[SM SPORTS] Auto-repairing oversized auction document (${(rawSize/1024).toFixed(1)} KB)...`);
                    try {
                        const repairResult = await safeSaveAuctionDocument(id, {}, db);
                        if (repairResult.prunedBytes > 0) {
                            showNotification(`Database Auto-Optimized: Purged ${(repairResult.prunedBytes / 1024).toFixed(1)} KB of redundant data. Document is now safely ${(repairResult.cleanSize / 1024).toFixed(1)} KB.`, "success");
                        }
                    } catch (repairErr) {
                        console.error("Auto repair error:", repairErr);
                    }
                }

                setAuction(data as AuctionSetup);
                if (data.registrationConfig) setRegConfig({ ...DEFAULT_REG_CONFIG, ...data.registrationConfig });
                setSettingsForm({
                    title: data.title || '', 
                    fullTournamentName: data.fullTournamentName || '',
                    season: data.season || '',
                    date: data.date === 'TBD' ? '' : (data.date || ''), 
                    matchesDate: data.matchesDate || '',
                    sport: data.sport || '', 
                    venue: data.venue || '',
                    eventVenue: data.eventVenue || '',
                    purseValue: data.purseValue || 0,
                    basePrice: data.basePrice || 0, 
                    bidIncrement: data.bidIncrement || 0, 
                    playersPerTeam: data.playersPerTeam || 0, 
                    totalTeams: data.totalTeams || 0,
                    logoUrl: data.logoUrl || '',
                    dateTBD: data.date === 'TBD' || !!data.dateTBD,
                    unlimitedPurse: !!data.unlimitedPurse,
                    autoReserveFunds: !!data.autoReserveFunds
                });
                if (data.slabs) setSlabs(data.slabs);
            }
            setLoading(false);
        });

        const unsubTeams = db.collection('auctions').doc(id).collection('teams').onSnapshot(s => {
            setTeams(s.docs.map(d => ({id: d.id, ...d.data()}) as Team));
            setTeamsLoaded(true);
        });
        const unsubPlayers = db.collection('auctions').doc(id).collection('players').onSnapshot(s => {
            setPlayers(s.docs.map(d => ({id: d.id, ...d.data()}) as Player));
            setPlayersLoaded(true);
        });
        const unsubCats = db.collection('auctions').doc(id).collection('categories').onSnapshot(s => {
            setCategories(s.docs.map(d => ({id: d.id, ...d.data()}) as AuctionCategory));
            setCategoriesLoaded(true);
        });
        const unsubRoles = db.collection('auctions').doc(id).collection('roles').onSnapshot(s => {
            setRoles(s.docs.map(d => ({id: d.id, ...d.data()}) as PlayerRole));
            setRolesLoaded(true);
        });
        const unsubSponsors = db.collection('auctions').doc(id).collection('sponsors').onSnapshot(s => {
            setSponsors(s.docs.map(d => ({id: d.id, ...d.data()}) as Sponsor));
            setSponsorsLoaded(true);
        });
        const unsubRegs = db.collection('auctions').doc(id).collection('registrations').onSnapshot(s => {
            setRegistrations(s.docs.map(d => ({id: d.id, ...d.data()}) as RegisteredPlayer));
            setRegistrationsLoaded(true);
        });
        const unsubWaitlist = db.collection('auctions').doc(id).collection('waitlist').onSnapshot(s => {
            setWaitlist(s.docs.map(d => ({id: d.id, ...d.data()})));
            setWaitlistLoaded(true);
        });
        const unsubCodes = db.collection('auctions').doc(id).collection('captainCodes').onSnapshot(s => {
            setCaptainCodes(s.docs.map(d => ({id: d.id, ...d.data()}) as CaptainCode));
            setCaptainCodesLoaded(true);
        });
        const unsubRegCodes = db.collection('auctions').doc(id).collection('registrationCodes').onSnapshot(s => {
            setRegistrationCodes(s.docs.map(d => ({id: d.id, ...d.data()}) as RegistrationCode));
            setRegistrationCodesLoaded(true);
        });

        const unsubBranding = db.collection('appConfig').doc('globalSettings').onSnapshot(doc => {
            if (doc.exists) {
                const data = doc.data();
                setSystemBranding({
                    logo: data?.systemLogoUrl || '',
                    tagline: data?.systemTagline || 'Your streaming partner'
                });
            }
        });

        return () => {
            unsubAuction(); unsubTeams(); unsubPlayers(); unsubCats(); unsubRoles(); unsubSponsors(); unsubRegs(); unsubWaitlist(); unsubCodes(); unsubRegCodes(); unsubBranding();
        };
    }, [id]);

    const handleManualRepairDocument = async () => {
        if (!id) return;
        setIsRepairingDoc(true);
        try {
            const res = await pruneAndRepairAuctionDocument(id, db);
            setDocSizeInfo({ size: res.cleanSize, isBloated: false });
            showNotification(`Document Optimized! Reduced to ${(res.cleanSize / 1024).toFixed(1)} KB (Purged ${(res.prunedBytes / 1024).toFixed(1)} KB of duplicate data).`, "success");
        } catch (err: any) {
            showNotification("Optimization failed: " + err.message, "error");
        } finally {
            setIsRepairingDoc(false);
        }
    };

    const handleSaveSettings = async () => {
        if (!id) return;
        try {
            let safeSettings = { ...settingsForm };
            if (safeSettings.logoUrl && safeSettings.logoUrl.startsWith('data:') && safeSettings.logoUrl.length > 35000) {
                safeSettings.logoUrl = await compressImage(safeSettings.logoUrl, 'LOGO');
            }
            const updateData = {
                ...safeSettings,
                date: safeSettings.dateTBD ? 'TBD' : (safeSettings.date || ''),
                slabs: slabs || []
            };
            const cleanSettings = JSON.parse(JSON.stringify(updateData));
            const saveRes = await safeSaveAuctionDocument(id, cleanSettings, db);
            setSettingsForm(safeSettings);
            setDocSizeInfo({ size: saveRes.cleanSize, isBloated: false });
            showNotification(`Settings Saved Successfully! (Size: ${(saveRes.cleanSize / 1024).toFixed(1)} KB)`, "success");
        } catch (e: any) { 
            console.error("Save settings error:", e);
            showNotification("Save failed: " + e.message, "error"); 
        }
    };

    const handleSaveRegistration = async () => {
        if (!id) return;
        try {
            let safeConfig = { ...regConfig };
            if (safeConfig.bannerUrl && safeConfig.bannerUrl.startsWith('data:') && safeConfig.bannerUrl.length > 55000) {
                safeConfig.bannerUrl = await compressImage(safeConfig.bannerUrl, 'REG_BANNER');
            }
            if (safeConfig.welcomePosterUrl && safeConfig.welcomePosterUrl.startsWith('data:') && safeConfig.welcomePosterUrl.length > 55000) {
                safeConfig.welcomePosterUrl = await compressImage(safeConfig.welcomePosterUrl, 'REG_WELCOME_POSTER');
            }
            if (safeConfig.logoUrl && safeConfig.logoUrl.startsWith('data:') && safeConfig.logoUrl.length > 35000) {
                safeConfig.logoUrl = await compressImage(safeConfig.logoUrl, 'REG_LOGO');
            }
            if (safeConfig.qrCodeUrl && safeConfig.qrCodeUrl.startsWith('data:') && safeConfig.qrCodeUrl.length > 35000) {
                safeConfig.qrCodeUrl = await compressImage(safeConfig.qrCodeUrl, 'QR');
            }
            if (safeConfig.showcaseImages && Array.isArray(safeConfig.showcaseImages)) {
                safeConfig.showcaseImages = await Promise.all(
                    safeConfig.showcaseImages.map(async (img) => {
                        if (img.imageUrl && img.imageUrl.startsWith('data:') && img.imageUrl.length > 55000) {
                            const compressed = await compressImage(img.imageUrl, 'REG_BANNER');
                            return { ...img, imageUrl: compressed };
                        }
                        return img;
                    })
                );
            }
            const cleanConfig = JSON.parse(JSON.stringify(safeConfig));
            const saveRes = await safeSaveAuctionDocument(id, { registrationConfig: cleanConfig }, db);
            setRegConfig(safeConfig);
            setDocSizeInfo({ size: saveRes.cleanSize, isBloated: false });
            showNotification("Registration Settings Saved!", "success");
        } catch (e: any) { showNotification("Failed: " + e.message, "error"); }
    };

    const handleToggleAutoApprove = async (checked: boolean) => {
        if (!id) return;
        try {
            const updatedConfig = { ...regConfig, autoApprove: checked };
            setRegConfig(updatedConfig);
            await safeSaveAuctionDocument(id, { registrationConfig: updatedConfig }, db);
            showNotification(checked ? "Auto Approval Enabled!" : "Auto Approval Disabled!", "success");
        } catch (err: any) {
            showNotification("Failed to update auto approval: " + err.message, "error");
        }
    };

    const handleRevertToPending = async (regId: string) => {
        if (!id) return;
        try {
            await db.collection('auctions').doc(id).collection('registrations').doc(regId).update({ status: 'PENDING' });
        } catch (e: any) { showNotification("Revert failed: " + e.message); }
    };

    const handleApproveAndAdd = async (reg: RegisteredPlayer) => {
        if (!id) return;
        try {
            // 1. Update registration status
            await db.collection('auctions').doc(id).collection('registrations').doc(reg.id).update({ status: 'APPROVED' });
            
            // Check if already in pool (by name)
            const existing = players.find(p => p.name === reg.fullName);
            if (existing) {
                showNotification(`${reg.fullName} is already in the player pool.`);
                return;
            }

            // 2. Add to players collection
            const newPlayer: Partial<Player> = {
                name: reg.fullName,
                photoUrl: reg.profilePic,
                category: 'Standard', // Default category
                role: reg.playerType,
                basePrice: auction?.basePrice || 0,
                nationality: 'India',
                speciality: reg.playerType,
                stats: { matches: 0, runs: 0, wickets: 0 }
            };
            
            await db.collection('auctions').doc(id).collection('players').add(newPlayer);
            showNotification(`${reg.fullName} approved and added to player pool!`, "success");
        } catch (e: any) { showNotification("Approval failed: " + e.message); }
    };

    const handleUpdateRegistration = async (updatedReg: RegisteredPlayer) => {
        if (!id) return;
        try {
            const { id: regId, ...data } = updatedReg;
            await db.collection('auctions').doc(id).collection('registrations').doc(regId).update(data);
            setSelectedReg(updatedReg);
            setIsEditingReg(false);
            showNotification("Registration details updated!", "success");
        } catch (e: any) { showNotification("Update failed: " + e.message); }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'MODAL' | 'LOGO' | 'QR' | 'REG_LOGO' | 'REG_BANNER' | 'OVERLAY' | 'REG_WELCOME_POSTER') => {
        if (e.target.files && e.target.files[0]) {
            const base64 = await compressImage(e.target.files[0], type);
            
            if (type === 'OVERLAY' && overlayImage) {
                try {
                    if (overlayImage.type === 'PLAYER') {
                        await db.collection('auctions').doc(id).collection('players').doc(overlayImage.id).update({ [overlayImage.field]: base64 });
                    } else {
                        await db.collection('auctions').doc(id).collection('registrations').doc(overlayImage.id).update({ [overlayImage.field]: base64 });
                        if (selectedReg && selectedReg.id === overlayImage.id) {
                            setSelectedReg({ ...selectedReg, [overlayImage.field]: base64 });
                        }
                    }
                    setOverlayImage({ ...overlayImage, url: base64 });
                    showNotification("Image updated successfully!", "success");
                } catch (err: any) {
                    showNotification("Update failed: " + err.message);
                }
                return;
            }

            if (type === 'MODAL') setPreviewImage(base64);
            if (type === 'LOGO') setSettingsForm({ ...settingsForm, logoUrl: base64 });
            if (type === 'QR') setRegConfig({ ...regConfig, qrCodeUrl: base64 });
            if (type === 'REG_LOGO') setRegConfig({ ...regConfig, logoUrl: base64 });
            if (type === 'REG_BANNER') setRegConfig({ ...regConfig, bannerUrl: base64 });
            if (type === 'REG_WELCOME_POSTER') setRegConfig({ ...regConfig, welcomePosterUrl: base64 });
        }
    };

    const handleCrudSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id) return;
        let col = modalType.toLowerCase() + 's';
        if (modalType === 'CATEGORY') col = 'categories';
        
        let itemData = { 
            ...editItem, 
            logoUrl: previewImage || editItem.logoUrl || '', 
            photoUrl: previewImage || editItem.photoUrl || '', 
            imageUrl: previewImage || editItem.imageUrl || '',
            id: editItem.id || db.collection('auctions').doc(id).collection(col).doc().id
        };

        try {
            const batch = db.batch();
            
            // Handle Category Renaming Propagation
            if (modalType === 'CATEGORY' && editItem.id) {
                const oldCategory = categories.find(c => c.id === editItem.id);
                if (oldCategory && oldCategory.name !== itemData.name) {
                    const oldName = oldCategory.name;
                    const newName = itemData.name;
                    const oldPrefix = oldName.substring(0, 3).toUpperCase();
                    const newPrefix = newName.substring(0, 3).toUpperCase();

                    // 1. Update all players who were in the old category
                    players.filter(p => p.category === oldName).forEach(p => {
                        batch.update(db.collection('auctions').doc(id).collection('players').doc(String(p.id)), {
                            category: newName,
                            updatedAt: Date.now()
                        });
                    });

                    // 2. Update all arrangement drafts to reflect the new category name in slots
                    const draftsSnap = await db.collection('auctions').doc(id).collection('arrangementDrafts').get();
                    draftsSnap.docs.forEach(draftDoc => {
                        if (draftDoc.id === 'SETTINGS') return;

                        const draftData = draftDoc.data();
                        const draftSlots = draftData.slots || {};
                        const draftCategory = categories.find(c => c.id === draftDoc.id);
                        const isThisDraftAllRounder = draftCategory?.name.toLowerCase() === 'allrounder';
                        
                        let changed = false;
                        const updatedDraftSlots: any = {};

                        Object.entries(draftSlots).forEach(([slotId, slot]: [string, any]) => {
                            let newSlotId = slotId;
                            const newSlot = { ...slot };

                            if (slot.category === oldName) {
                                newSlot.category = newName;
                                changed = true;
                            }

                            if (draftDoc.id === editItem.id && oldPrefix !== newPrefix && !isThisDraftAllRounder) {
                                if (slotId.startsWith(oldPrefix)) {
                                    newSlotId = slotId.replace(oldPrefix, newPrefix);
                                    changed = true;
                                }
                            }
                            
                            if (isThisDraftAllRounder) {
                                if (slotId.startsWith(oldName + "_")) {
                                    newSlotId = slotId.replace(oldName + "_", newName + "_");
                                    changed = true;
                                }
                            }

                            updatedDraftSlots[newSlotId] = newSlot;
                        });

                        if (changed) {
                            batch.update(draftDoc.ref, { slots: updatedDraftSlots });
                        }
                    });
                }
            }

            // Auto-generate GLOBAL Team ID for new teams
            if (modalType === 'TEAM' && !editItem.id) {
                const isAuctionPaid = auction?.isPaid === true || userProfile?.role === UserRole.SUPER_ADMIN;
                if (!isAuctionPaid && teams.length >= 2) {
                    showNotification("Free plan is limited to only 2 teams. Please purchase a plan to add more teams.", "error");
                    return;
                }
                await db.runTransaction(async (transaction) => {
                    const counterRef = db.collection('system').doc('metadata');
                    const counterDoc = await transaction.get(counterRef);
                    
                    let nextId = 10; // Start with T010 as requested
                    if (counterDoc.exists) {
                        const currentCounter = counterDoc.data()?.teamIdCounter || 9;
                        nextId = currentCounter + 1;
                    }
                    
                    itemData.teamCode = `T${nextId.toString().padStart(3, '0')}`;
                    transaction.set(counterRef, { teamIdCounter: nextId }, { merge: true });
                });
            }
            
            const docRef = db.collection('auctions').doc(id).collection(col).doc(itemData.id);
            if (editItem.id) {
                batch.set(docRef, itemData, { merge: true });
            } else {
                batch.set(docRef, { ...itemData, createdAt: Date.now() });
            }

            await batch.commit();
            closeModal();
            showNotification(`${modalType} saved and synced successfully!`, "success");
        } catch (err: any) { 
            console.error(err);
            showNotification("Save failed: " + err.message); 
        }
    };

    const [playerSearchQuery, setPlayerSearchQuery] = useState('');
    const [assignSearch, setAssignSearch] = useState('');

    const filteredPlayers = players
        .filter(p => 
            p.name.toLowerCase().includes(playerSearchQuery.toLowerCase()) ||
            p.category.toLowerCase().includes(playerSearchQuery.toLowerCase()) ||
            p.role.toLowerCase().includes(playerSearchQuery.toLowerCase()) ||
            (p as any).playerNumber?.toString().includes(playerSearchQuery)
        )
        .sort((a, b) => {
            const numA = (a as any).playerNumber || 999999;
            const numB = (b as any).playerNumber || 999999;
            if (numA !== numB) return numA - numB;
            return a.name.localeCompare(b.name);
        });

    const handleUpdatePlayerStatus = async (playerId: string | number, newStatus: string) => {
        try {
            await db.collection('auctions').doc(id!).collection('players').doc(String(playerId)).update({
                status: newStatus,
                updatedAt: Date.now()
            });
            showNotification(`Player status updated to ${newStatus}`, 'success');
        } catch (err) {
            console.error(err);
            showNotification('Failed to update status', 'error');
        }
    };

    const handleAssignPlayerToCategory = async (playerId: string | number, categoryName: string) => {
        if (!id) return;
        try {
            await db.collection('auctions').doc(id).collection('players').doc(String(playerId)).update({
                category: categoryName
            });
            showNotification(`Player assigned to ${categoryName}`, "success");
            setAssignSearch('');
        } catch (error) {
            console.error(error);
            showNotification("Failed to assign player");
        }
    };

    const handleRemovePlayerFromCategory = async (playerId: string | number) => {
        if (!id) return;
        try {
            await db.collection('auctions').doc(id).collection('players').doc(String(playerId)).update({
                category: 'Standard'
            });
            showNotification("Player removed from category", "success");
        } catch (error) {
            console.error(error);
            showNotification("Failed to remove player");
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setEditItem(null);
        setPreviewImage('');
    };

    const handleDelete = async (type: string, itemId: string) => {
        const title = type === 'CATEGORIE' ? 'Delete Category' : `Purge ${type}`;
        const message = type === 'CATEGORIE' 
            ? "Are you sure you want to delete this category? All player assignments and arrangement drafts for this category will be reset permanently."
            : `Are you sure you want to purge this ${type.toLowerCase()}? This action cannot be undone.`;

        setConfirmAction({
            title,
            message,
            onConfirm: async () => {
                const batch = db.batch();
                const colName = type.toLowerCase() + 's';
                
                if (type === 'CATEGORIE') {
                    const catId = itemId;
                    const category = categories.find(c => c.id === catId);
                    
                    if (category) {
                        // 1. Reset player categories
                        players.filter(p => p.category === category.name).forEach(p => {
                            batch.update(db.collection('auctions').doc(id!).collection('players').doc(String(p.id)), { 
                                category: 'Standard' 
                            });
                        });
                        
                        // 2. Delete Arrangement Draft
                        batch.delete(db.collection('auctions').doc(id!).collection('arrangementDrafts').doc(catId));
                        
                        // 3. Delete Category
                        batch.delete(db.collection('auctions').doc(id!).collection('categories').doc(catId));
                    }
                } else {
                    batch.delete(db.collection('auctions').doc(id!).collection(colName).doc(itemId));
                }

                try {
                    await batch.commit();
                    showNotification(`${type} deleted successfully`, "success");
                } catch (e: any) {
                    showNotification("Delete failed: " + e.message);
                }
                setConfirmAction(null);
            }
        });
    };

    const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>, type: 'TEAM' | 'PLAYER') => {
        const file = e.target.files?.[0];
        if (!file || !id) return;
        
        const reader = new FileReader();
        reader.onload = async (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data: any[] = XLSX.utils.sheet_to_json(ws);
            
            const batch = db.batch();
            const col = type.toLowerCase() + 's';
            
            try {
                let globalTeamIdx = 9; // Default starting point - 1
                if (type === 'TEAM') {
                    const counterDoc = await db.collection('system').doc('metadata').get();
                    if (counterDoc.exists) {
                        globalTeamIdx = counterDoc.data()?.teamIdCounter || 9;
                    }
                }

                data.forEach(row => {
                    const ref = db.collection('auctions').doc(id).collection(col).doc();
                    if (type === 'TEAM') {
                        globalTeamIdx++;
                        const generatedCode = `T${globalTeamIdx.toString().padStart(3, '0')}`;
                        batch.set(ref, { 
                            id: ref.id, 
                            teamCode: row.ID || row.Id || row.teamCode || generatedCode,
                            name: row.Name || row.name, 
                            owner: row.Owner || '', 
                            budget: Number(row.Budget) || settingsForm.purseValue, 
                            players: [], 
                            logoUrl: '',
                            password: String(row.Password || row.password || '').trim()
                        });
                    } else {
                        batch.set(ref, { id: ref.id, name: row.Name || row.name, category: row.Category || 'Standard', role: row.Role || 'All Rounder', basePrice: Number(row.BasePrice) || settingsForm.basePrice, nationality: 'India', photoUrl: '', stats: { matches: 0, runs: 0, wickets: 0 } });
                    }
                });
                
                if (type === 'TEAM') {
                    batch.set(db.collection('system').doc('metadata'), { teamIdCounter: globalTeamIdx }, { merge: true });
                }

                await batch.commit();
                showNotification(`Imported ${data.length} records!`, "success");
            } catch (err: any) {
                console.error(err);
                showNotification("Import failed: " + err.message);
            }
        };
        reader.readAsBinaryString(file);
    };

    const generatePDF = async () => {
        // Use players pool as primary source to reflect edited roles/categories
        // Otherwise fallback to approved registrations if players pool is empty (initial state)
        const activePlayers = players.length > 0 
            ? players.map(p => {
                const reg = registrations.find(r => r.fullName === p.name);
                return {
                    ...(reg || {}),
                    id: String(p.id),
                    fullName: p.name,
                    profilePic: p.photoUrl,
                    playerType: p.role || p.speciality,
                    category: p.category,
                    playerNumber: reg?.playerNumber,
                    submittedAt: reg?.submittedAt || 0,
                    status: 'APPROVED' // Since they are in the players pool
                };
            }) 
            : registrations.filter(r => r.status === 'APPROVED');

        if (activePlayers.length === 0) {
            showNotification("No approved players to export.");
            return;
        }
        setIsGeneratingPDF(true);
        isPdfCancelled.current = false;
        setPdfProgress(0);

        const doc = new jsPDF('p', 'mm', 'a4');

        // Fetch category mapping if categorized export is enabled
        let playerCategoryMap: { [playerId: string]: string } = {};
        if (exportCategorizedPDF) {
            try {
                // Get Categories for names
                const catsSnap = await db.collection('auctions').doc(id).collection('categories').get();
                const catNames: { [id: string]: string } = {};
                catsSnap.docs.forEach(d => {
                    catNames[d.id] = d.data().name;
                });

                // Get Mapping from Boards
                const draftsSnap = await db.collection('auctions').doc(id).collection('arrangementDrafts').get();
                draftsSnap.docs.forEach(doc => {
                    if (doc.id === 'SETTINGS') return;
                    const data = doc.data();
                    const slots = data.slots || {};
                    const categoryName = catNames[doc.id] || 'Other';
                    Object.values(slots).forEach((slot: any) => {
                        if (slot.playerId) {
                            playerCategoryMap[String(slot.playerId)] = categoryName;
                        }
                    });
                });
            } catch (e) {
                console.error("Failed to map categories for PDF:", e);
            }
        }

        const pdfContainer = document.createElement('div');
        pdfContainer.style.position = 'fixed';
        pdfContainer.style.left = '-9999px';
        pdfContainer.style.top = '0';
        pdfContainer.style.width = '210mm'; // A4 width
        document.body.appendChild(pdfContainer);

        try {
            // Group and Sort players
            let sortedRegistrations = [...activePlayers];
            
            if (exportCategorizedPDF) {
                const categoryOrder: { [name: string]: number } = {};
                [...categories].sort((a, b) => (a.order || 0) - (b.order || 0)).forEach((cat, idx) => {
                    categoryOrder[cat.name] = idx;
                });

                sortedRegistrations.sort((a, b) => {
                    const catA = playerCategoryMap[a.id] || a.category || 'Uncategorized';
                    const catB = playerCategoryMap[b.id] || b.category || 'Uncategorized';
                    
                    if (catA !== catB) {
                        const orderA = categoryOrder[catA] ?? 999;
                        const orderB = categoryOrder[catB] ?? 999;
                        if (orderA !== orderB) return orderA - orderB;
                    }

                    const numA = (a.playerNumber !== undefined && a.playerNumber !== null && a.playerNumber !== "") ? Number(a.playerNumber) : 999999;
                    const numB = (b.playerNumber !== undefined && b.playerNumber !== null && b.playerNumber !== "") ? Number(b.playerNumber) : 999999;
                    if (numA !== numB) return numA - numB;
                    return (a.submittedAt || 0) - (b.submittedAt || 0);
                });
            } else {
                sortedRegistrations.sort((a, b) => {
                    const numA = (a.playerNumber !== undefined && a.playerNumber !== null && a.playerNumber !== "") ? Number(a.playerNumber) : 999999;
                    const numB = (b.playerNumber !== undefined && b.playerNumber !== null && b.playerNumber !== "") ? Number(b.playerNumber) : 999999;
                    if (numA !== numB) return numA - numB;
                    return (a.submittedAt || 0) - (b.submittedAt || 0);
                });
            }

            const actualPlayersPerPage = playersPerPage === 'LIST' ? 14 : (playersPerPage as number);
            
            interface PDFPageData {
                category: string;
                players: any[];
                globalStartIndex: number;
            }
            
            const pagesToRender: PDFPageData[] = [];
            if (sortedRegistrations.length > 0) {
                if (exportCategorizedPDF) {
                    const groups: { [cat: string]: { reg: any, globalIdx: number }[] } = {};
                    const categoriesInOrder: string[] = [];
                    
                    sortedRegistrations.forEach((reg, idx) => {
                        const cat = playerCategoryMap[reg.id] || reg.category || 'Uncategorized';
                        if (!groups[cat]) {
                            groups[cat] = [];
                            categoriesInOrder.push(cat);
                        }
                        groups[cat].push({ reg, globalIdx: idx });
                    });

                    categoriesInOrder.forEach(cat => {
                        const catPlayers = groups[cat];
                        const catPages = Math.ceil(catPlayers.length / actualPlayersPerPage);
                        for (let i = 0; i < catPages; i++) {
                            const chunk = catPlayers.slice(i * actualPlayersPerPage, (i + 1) * actualPlayersPerPage);
                            pagesToRender.push({
                                category: cat,
                                players: chunk.map(cp => cp.reg),
                                globalStartIndex: chunk[0].globalIdx
                            });
                        }
                    });
                } else {
                    const totalPages = Math.ceil(sortedRegistrations.length / actualPlayersPerPage);
                    for (let i = 0; i < totalPages; i++) {
                        pagesToRender.push({
                            category: 'All',
                            players: sortedRegistrations.slice(i * actualPlayersPerPage, (i + 1) * actualPlayersPerPage),
                            globalStartIndex: i * actualPlayersPerPage
                        });
                    }
                }
            }

            const totalPages = pagesToRender.length;
            
            for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
                if (isPdfCancelled.current) {
                    throw new Error("PDF_CANCELLED");
                }
                setPdfProgress(Math.round(((pageIndex + 1) / totalPages) * 100));
                
                const { players: pageRegs, globalStartIndex } = pagesToRender[pageIndex];

                // Determine grid columns based on playersPerPage
                let gridCols = 1;
                let gridRows = '1fr';
                let cardHeight = '235mm';
                
                if (playersPerPage === 1) { gridCols = 1; gridRows = '1fr'; cardHeight = '235mm'; }
                else if (playersPerPage === 2) { gridCols = 1; gridRows = 'repeat(2, 1fr)'; cardHeight = '116mm'; }
                else if (playersPerPage === 4) { gridCols = 2; gridRows = 'repeat(2, 1fr)'; cardHeight = '116mm'; }
                else if (playersPerPage === 6) { gridCols = 2; gridRows = 'repeat(3, 1fr)'; cardHeight = '76mm'; }
                else if (playersPerPage === 9) { gridCols = 3; gridRows = 'repeat(3, 1fr)'; cardHeight = '76mm'; }
                else if (playersPerPage === 'LIST') { gridCols = 1; gridRows = 'none'; cardHeight = 'auto'; }

                const isSinglePage = playersPerPage === 1;

                // Render page content
                pdfContainer.innerHTML = `
                    <div id="pdf-page" style="
                        width: 210mm; 
                        height: 297mm; 
                        padding: 8mm 10mm; 
                        background: ${pdfTheme === 'ADVAYA' ? '#0a0a0a' : '#ffffff'};
                        color: ${pdfTheme === 'ADVAYA' ? '#fbbf24' : '#1f2937'};
                        font-family: sans-serif;
                        box-sizing: border-box;
                        position: relative;
                        overflow: hidden;
                        display: flex;
                        flex-direction: column;
                    ">
                        ${pdfTheme === 'ADVAYA' ? `
                            <div style="position: absolute; top: 0; right: 0; width: 100mm; height: 100mm; background: radial-gradient(circle at top right, rgba(251,191,36,0.05) 0%, transparent 70%); pointer-events: none;"></div>
                            <div style="position: absolute; bottom: 0; left: 0; width: 100mm; height: 100mm; background: radial-gradient(circle at bottom left, rgba(251,191,36,0.05) 0%, transparent 70%); pointer-events: none;"></div>
                        ` : ''}

                        <!-- Header -->
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid ${pdfTheme === 'ADVAYA' ? '#fbbf24' : '#3b82f6'}; padding: 0 0 3mm 0; margin-bottom: 4mm; position: relative; z-index: 10; height: 25mm; flex-shrink: 0; box-sizing: border-box;">
                            <div style="display: flex; align-items: center; gap: 5mm;">
                                ${systemBranding.logo ? `<img src="${systemBranding.logo}" referrerpolicy="no-referrer" style="height: 18mm; width: 18mm; object-fit: contain; border-radius: 2mm;" />` : ''}
                                <div style="display: flex; flex-direction: column; justify-content: center;">
                                    <h1 style="margin: 0; font-size: 22pt; font-weight: 900; text-transform: uppercase; letter-spacing: -0.5px; color: ${pdfTheme === 'ADVAYA' ? '#fbbf24' : '#1f2937'}; line-height: 1;">SM SPORTS</h1>
                                    <p style="margin: 1mm 0 0 0; font-size: 10pt; font-weight: 700; opacity: 0.9; text-transform: uppercase; letter-spacing: 1.5px;">${systemBranding.tagline}</p>
                                </div>
                            </div>
                            <div style="text-align: right; display: flex; align-items: center; gap: 5mm;">
                                <div style="display: flex; flex-direction: column; justify-content: center;">
                                    <h2 style="margin: 0; font-size: 15pt; font-weight: 900; text-transform: uppercase; color: ${pdfTheme === 'ADVAYA' ? '#fbbf24' : '#1f2937'}; line-height: 1;">${auction?.title || 'Tournament'}</h2>
                                    <p style="margin: 1mm 0 0 0; font-size: 9pt; font-weight: 700; opacity: 0.7; text-transform: uppercase; letter-spacing: 1px;">Official Player List</p>
                                </div>
                                ${auction?.logoUrl ? `<img src="${auction.logoUrl}" referrerpolicy="no-referrer" style="height: 18mm; width: 18mm; object-fit: contain;" />` : ''}
                            </div>
                        </div>

                        <!-- Players Grid -->
                        <div style="
                            height: 238mm;
                            max-height: 238mm;
                            display: ${playersPerPage === 'LIST' ? 'flex' : 'grid'};
                            ${playersPerPage === 'LIST' ? 'flex-direction: column;' : ''}
                            grid-template-columns: repeat(${gridCols}, 1fr);
                            grid-template-rows: ${gridRows};
                            gap: 2mm;
                            align-content: start;
                            min-height: 0;
                            box-sizing: border-box;
                            overflow: hidden;
                        ">
                            ${pageRegs.map((reg, idx) => {
                                const currentCat = playerCategoryMap[reg.id] || 'Uncategorized';
                                // Show category header only if category changed
                                const prevReg = idx > 0 ? pageRegs[idx - 1] : null;
                                const prevCat = prevReg ? (playerCategoryMap[prevReg.id] || 'Uncategorized') : null;
                                const showHeader = exportCategorizedPDF && currentCat !== prevCat;

                                const playerNum = (reg.playerNumber !== undefined && reg.playerNumber !== null && reg.playerNumber !== "") ? reg.playerNumber : (globalStartIndex + idx + 1);
                                const isDense = (typeof playersPerPage === 'number' && playersPerPage > 4) || playersPerPage === 'LIST';
                                const isSingle = playersPerPage === 1;
                                const isList = playersPerPage === 'LIST';

                                 const extraFieldsToDisplay = [
                                    { id: 'jerseyName', label: 'Jersey Name', value: reg.jerseyName },
                                    { id: 'jerseyNumber', label: 'Jersey Number', value: reg.jerseyNumber },
                                    { id: 'jerseySize', label: 'Jersey Size', value: reg.jerseySize },
                                    ...(regConfig.customFields || []).map(f => ({ id: `cf_${f.id}`, label: f.label, value: (reg as any)[f.id] }))
                                ].filter(f => selectedFields.includes(f.id));

                                let itemHtml = '';

                                if (isList) {
                                    itemHtml = `
                                    <div style="
                                        background: ${pdfTheme === 'ADVAYA' ? 'rgba(251,191,36,0.03)' : '#f9fafb'};
                                        border: 1px solid ${pdfTheme === 'ADVAYA' ? 'rgba(251,191,36,0.1)' : '#f1f5f9'};
                                        border-radius: 2mm;
                                        padding: 2mm 4mm;
                                        display: flex;
                                        align-items: center;
                                        gap: 4mm;
                                        margin-bottom: 1mm;
                                    ">
                                        <div style="font-size: 10pt; font-weight: 900; width: 10mm; color: ${pdfTheme === 'ADVAYA' ? '#fbbf24' : '#3b82f6'};">#${playerNum}</div>
                                        ${selectedFields.includes('profilePic') ? `
                                            <div style="width: 10mm; height: 10mm; border-radius: 1mm; overflow: hidden; flex-shrink: 0; background: #e2e8f0; display: flex; align-items: center; justify-content: center;">
                                                ${reg.profilePic ? `
                                                    <img src="${reg.profilePic}" referrerpolicy="no-referrer" style="width: 100%; height: 100%; object-fit: cover;" />
                                                ` : `
                                                    <span style="font-size: 6pt; font-weight: bold; color: #94a3b8; font-family: sans-serif;">${reg.fullName ? reg.fullName.charAt(0).toUpperCase() : '?'}</span>
                                                `}
                                            </div>
                                        ` : ''}
                                        <div style="flex: 1; min-width: 0;">
                                            ${selectedFields.includes('fullName') ? `<h3 style="margin: 0; font-size: 10pt; font-weight: 900; text-transform: uppercase; line-height: 1.2; padding: 1mm 0;">${reg.fullName}</h3>` : ''}
                                            <p style="margin: 0; font-size: 7pt; font-weight: 700; opacity: 0.6;">
                                                ${[
                                                    selectedFields.includes('playerType') ? reg.playerType : null,
                                                    selectedFields.includes('mobile') ? reg.mobile : null
                                                ].filter(Boolean).join(' • ')}
                                            </p>
                                        </div>
                                        <div style="display: flex; gap: 4mm; flex-wrap: wrap; justify-content: flex-end;">
                                            ${extraFieldsToDisplay.slice(0, 8).map(field => `
                                                <div style="text-align: right; min-width: 15mm;">
                                                    <p style="margin: 0; font-size: 5pt; font-weight: 900; opacity: 0.5; text-transform: uppercase;">${field.label}</p>
                                                    <p style="margin: 0; font-size: 8pt; font-weight: 700;">${field.value || '-'}</p>
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                    `;
                                } else {
                                    itemHtml = `
                                    <div style="
                                        background: ${pdfTheme === 'ADVAYA' ? '#0f172a' : '#ffffff'};
                                        border: 2px solid ${pdfTheme === 'ADVAYA' ? 'rgba(251,191,36,0.2)' : '#e2e8f0'};
                                        border-radius: ${isSingle ? '10mm' : '3.5mm'};
                                        padding: ${isSingle ? '8mm 10mm' : isDense ? '3mm' : '5.5mm'};
                                        display: flex;
                                        flex-direction: column;
                                        justify-content: space-between;
                                        position: relative;
                                        overflow: hidden;
                                        height: ${cardHeight};
                                        box-sizing: border-box;
                                        box-shadow: ${pdfTheme === 'ADVAYA' ? 'none' : '0 4px 6px -1px rgb(0 0 0 / 0.05)'};
                                    ">
                                        ${selectedFields.includes('playerNumber') ? `
                                            <div style="position: absolute; top: 0; right: 0; padding: ${isSingle ? '4mm 12mm' : '1.5mm 4mm'}; background: ${pdfTheme === 'ADVAYA' ? '#fbbf24' : '#2563eb'}; color: ${pdfTheme === 'ADVAYA' ? '#000000' : '#ffffff'}; font-size: ${isSingle ? '24pt' : isDense ? '8pt' : '10pt'}; font-weight: 900; border-bottom-left-radius: 3mm; z-index: 5; font-family: monospace;">
                                                #${playerNum}
                                            </div>
                                        ` : ''}
                                        <div style="display: flex; gap: ${isSingle ? '12mm' : '4mm'}; align-items: start;">
                                            ${selectedFields.includes('profilePic') ? `
                                                <div style="width: ${isSingle ? '68mm' : isDense ? '18mm' : '30mm'}; height: ${isSingle ? '80mm' : isDense ? '22mm' : '38mm'}; border-radius: ${isSingle ? '8mm' : '2.5mm'}; overflow: hidden; border: ${isSingle ? '6px' : '2px'} solid ${pdfTheme === 'ADVAYA' ? '#fbbf2444' : '#f1f5f9'}; flex-shrink: 0; background: ${pdfTheme === 'ADVAYA' ? '#1e293b' : '#f1f5f9'}; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                                                    ${reg.profilePic ? `
                                                        <img src="${reg.profilePic}" referrerpolicy="no-referrer" style="width: 100%; height: 100%; object-fit: cover;" />
                                                    ` : `
                                                        <span style="font-size: ${isSingle ? '48pt' : '18pt'}; font-weight: 900; color: #94a3b8; font-family: sans-serif;">${reg.fullName ? reg.fullName.charAt(0).toUpperCase() : '?'}</span>
                                                    `}
                                                </div>
                                            ` : ''}
                                            <div style="flex: 1; min-width: 0; display: flex; flex-direction: column;">
                                                ${selectedFields.includes('fullName') ? `
                                                    <h3 style="margin: 0 0 1.5mm 0; font-size: ${isSingle ? '32pt' : isDense ? '8.5pt' : '11.5pt'}; font-weight: 900; text-transform: uppercase; line-height: 1.25; color: ${pdfTheme === 'ADVAYA' ? '#fbbf24' : '#0f172a'}; word-wrap: break-word; overflow-wrap: break-word; word-break: normal; letter-spacing: -0.2px;">
                                                        ${reg.fullName}
                                                    </h3>
                                                ` : ''}
                                                ${selectedFields.includes('playerType') ? `
                                                    <div style="font-size: ${isSingle ? '18pt' : isDense ? '6.5pt' : '8.5pt'}; font-weight: 800; color: ${pdfTheme === 'ADVAYA' ? '#e2e8f0' : '#2563eb'}; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.9; margin-bottom: 2mm;">
                                                        ${reg.playerType}
                                                        ${exportCategorizedPDF ? `<span style="font-size: 0.85em; opacity: 0.7; margin-left: 2mm; font-weight: 600;">(${currentCat})</span>` : ''}
                                                    </div>
                                                ` : ''}
                                                
                                                <div style="display: flex; flex-wrap: wrap; gap: ${isSingle ? '5mm 8mm' : '2mm 3mm'}; margin-top: ${isSingle ? '6mm' : '1.5mm'}; width: 100%; box-sizing: border-box;">
                                                    ${selectedFields.includes('mobile') ? `
                                                        <div style="width: calc(50% - ${isSingle ? '4mm' : '1.5mm'}); min-width: 0; box-sizing: border-box; position: relative; z-index: 10;">
                                                            <p style="margin: 0; font-size: ${isSingle ? '10pt' : '6.5pt'}; font-weight: 800; color: ${pdfTheme === 'ADVAYA' ? 'rgba(255,255,255,0.45)' : '#64748b'}; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.2;">Mobile</p>
                                                            <p style="margin: 1mm 0 0 0; font-size: ${isSingle ? '18pt' : isDense ? '7.5pt' : '9.5pt'}; font-weight: 700; color: ${pdfTheme === 'ADVAYA' ? '#ffffff' : '#334155'}; line-height: 1.3; overflow: visible; display: block; word-wrap: break-word;">${reg.mobile || '-'}</p>
                                                        </div>
                                                    ` : ''}
                                                    ${selectedFields.includes('dob') ? `
                                                        <div style="width: calc(50% - ${isSingle ? '4mm' : '1.5mm'}); min-width: 0; box-sizing: border-box; position: relative; z-index: 10;">
                                                            <p style="margin: 0; font-size: ${isSingle ? '10pt' : '6.5pt'}; font-weight: 800; color: ${pdfTheme === 'ADVAYA' ? 'rgba(255,255,255,0.45)' : '#64748b'}; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.2;">DOB</p>
                                                            <p style="margin: 1mm 0 0 0; font-size: ${isSingle ? '18pt' : isDense ? '7.5pt' : '9.5pt'}; font-weight: 700; color: ${pdfTheme === 'ADVAYA' ? '#ffffff' : '#334155'}; line-height: 1.3; overflow: visible; display: block; word-wrap: break-word;">${reg.dob || '-'}</p>
                                                        </div>
                                                    ` : ''}
                                                    ${selectedFields.includes('gender') ? `
                                                        <div style="width: calc(50% - ${isSingle ? '4mm' : '1.5mm'}); min-width: 0; box-sizing: border-box; position: relative; z-index: 10;">
                                                            <p style="margin: 0; font-size: ${isSingle ? '10pt' : '6.5pt'}; font-weight: 800; color: ${pdfTheme === 'ADVAYA' ? 'rgba(255,255,255,0.45)' : '#64748b'}; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.2;">Gender</p>
                                                            <p style="margin: 1mm 0 0 0; font-size: ${isSingle ? '18pt' : isDense ? '7.5pt' : '9.5pt'}; font-weight: 700; color: ${pdfTheme === 'ADVAYA' ? '#ffffff' : '#334155'}; line-height: 1.3; overflow: visible; display: block; word-wrap: break-word;">${reg.gender || '-'}</p>
                                                        </div>
                                                    ` : ''}
                                                    ${selectedFields.includes('status') ? `
                                                        <div style="width: calc(50% - ${isSingle ? '4mm' : '1.5mm'}); min-width: 0; box-sizing: border-box; position: relative; z-index: 10;">
                                                            <p style="margin: 0; font-size: ${isSingle ? '10pt' : '6.5pt'}; font-weight: 800; color: ${pdfTheme === 'ADVAYA' ? 'rgba(255,255,255,0.45)' : '#64748b'}; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.2;">Status</p>
                                                            <p style="margin: 1mm 0 0 0; font-size: ${isSingle ? '18pt' : isDense ? '7.5pt' : '9.5pt'}; font-weight: 900; color: ${reg.status === 'APPROVED' ? '#10b981' : '#f59e0b'}; line-height: 1.3; overflow: visible; display: block; word-wrap: break-word;">${reg.status || '-'}</p>
                                                        </div>
                                                    ` : ''}
                                                </div>
                                            </div>
                                        </div>

                                        <div style="display: flex; flex-wrap: wrap; gap: ${isSingle ? '6mm 8mm' : '3mm 4mm'}; padding-top: ${isSingle ? '8mm' : '3mm'}; border-top: 1.5px dashed ${pdfTheme === 'ADVAYA' ? 'rgba(251,191,36,0.2)' : '#cbd5e1'}; margin-top: auto; width: 100%; box-sizing: border-box;">
                                            ${extraFieldsToDisplay.slice(0, 8).map(field => `
                                                <div style="width: calc(33.333% - ${isSingle ? '6mm' : '3mm'}); min-width: 0; box-sizing: border-box; position: relative; z-index: 10; display: flex; flex-direction: column;">
                                                    <p style="margin: 0; font-size: ${isSingle ? '10pt' : '6.5pt'}; font-weight: 800; color: ${pdfTheme === 'ADVAYA' ? 'rgba(255,255,255,0.45)' : '#64748b'}; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.2;">${field.label}</p>
                                                    <p style="margin: 1mm 0 0 0; font-size: ${isSingle ? '16pt' : isDense ? '7.5pt' : '9pt'}; font-weight: 700; color: ${pdfTheme === 'ADVAYA' ? '#fbbf24' : '#1e293b'}; line-height: 1.3; overflow: visible; display: block; word-wrap: break-word;">${field.value || '-'}</p>
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                    `;
                                }

                                return `
                                    ${showHeader ? `
                                        <div style="grid-column: 1 / -1; padding: 2mm 4mm; background: ${pdfTheme === 'ADVAYA' ? '#fbbf24' : '#3b82f6'}; color: ${pdfTheme === 'ADVAYA' ? '#000000' : '#ffffff'}; border-radius: 1.5mm; font-size: 9pt; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; margin-top: 1mm; margin-bottom: 2mm; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                            Category: ${currentCat}
                                        </div>
                                    ` : ''}
                                    ${itemHtml}
                                `;
                            }).join('')}
                        </div>

                        <!-- Footer -->
                        <div style="margin-top: 4mm; padding-top: 3mm; border-top: 1px solid ${pdfTheme === 'ADVAYA' ? 'rgba(251,191,36,0.1)' : '#f1f5f9'}; display: flex; justify-content: space-between; align-items: center; opacity: 0.6; position: relative; z-index: 10;">
                            <div>
                                <p style="font-size: 8pt; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">Generated by SM Sports Registry</p>
                                <p style="font-size: 7pt; font-weight: 700; margin-top: 0.5mm;">Official Tournament Document • ${new Date().toLocaleDateString()}</p>
                            </div>
                            <div style="text-align: right;">
                                <p style="font-size: 9pt; font-weight: 900; color: ${pdfTheme === 'ADVAYA' ? '#fbbf24' : '#3b82f6'};">PAGE ${pageIndex + 1} OF ${totalPages}</p>
                            </div>
                        </div>
                    </div>
                `;

                const canvas = await html2canvas(pdfContainer.querySelector('#pdf-page') as HTMLElement, {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: pdfTheme === 'ADVAYA' ? '#0a0a0a' : '#ffffff'
                });

                const imgData = canvas.toDataURL('image/jpeg', 0.95);
                if (pageIndex > 0) doc.addPage();
                doc.addImage(imgData, 'JPEG', 0, 0, 210, 297);
            }

            doc.save(`${auction?.title || 'Tournament'}_Registry.pdf`);
            showNotification("PDF generated successfully", "success");
        } catch (error: any) {
            if (error.message === "PDF_CANCELLED") {
                showNotification("PDF Export Cancelled", "success");
            } else {
                console.error("PDF Generation Error:", error);
                showNotification("Failed to generate PDF. Check console for details.");
            }
        } finally {
            document.body.removeChild(pdfContainer);
            setIsGeneratingPDF(false);
            isPdfCancelled.current = false;
        }
    };

    const exportPlayersToCSV = () => {
        if (players.length === 0) {
            showNotification("No players to export.");
            return;
        }
        const headers = ["ID", "Name", "Category", "Role", "Base Price", "Nationality", "Status", "Sold To", "Sold Price", "Jersey Name", "Jersey Number", "Jersey Size"];
        const rows = players.map(p => {
            const reg = registrations.find(r => r.fullName === p.name);
            return [
                p.id, 
                p.name, 
                p.category, 
                p.role, 
                p.basePrice, 
                p.nationality, 
                p.status || 'POOL', 
                p.soldTo || '-', 
                p.soldPrice || 0,
                reg?.jerseyName || '-',
                reg?.jerseyNumber || '-',
                reg?.jerseySize || '-'
            ];
        });

        const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `PLAYERS_${auction?.title?.replace(/\s+/g, '_')}.csv`);
        link.click();
    };

    const exportRegistrationsToCSV = () => {
        // Use players pool as primary source to reflect edited roles/categories
        // Otherwise fallback to approved registrations if players pool is empty
        const activePlayers = players.length > 0 
            ? players.map(p => {
                const reg = registrations.find(r => r.fullName === p.name);
                return {
                    ...(reg || {}),
                    id: String(p.id),
                    fullName: p.name,
                    playerType: p.role || p.speciality,
                    category: p.category,
                    playerNumber: reg?.playerNumber,
                    submittedAt: reg?.submittedAt || 0,
                    status: 'APPROVED'
                };
            }) 
            : registrations.filter(r => r.status === 'APPROVED');

        if (activePlayers.length === 0) {
            showNotification("No approved players to export.");
            return;
        }
        
        // Use selected fields for CSV export as well
        const allPossibleFields = [
            { id: 'playerNumber', label: 'Player #' },
            { id: 'fullName', label: 'Full Name' },
            { id: 'mobile', label: 'Mobile' },
            { id: 'dob', label: 'DOB' },
            { id: 'gender', label: 'Gender' },
            { id: 'playerType', label: 'Role' },
            { id: 'category', label: 'Category' },
            { id: 'jerseyName', label: 'Jersey Name' },
            { id: 'jerseyNumber', label: 'Jersey Number' },
            { id: 'jerseySize', label: 'Jersey Size' },
            ...regConfig.customFields.map(f => ({ id: `cf_${f.id}`, label: f.label })),
            { id: 'status', label: 'Status' }
        ];

        const selectedFieldConfigs = allPossibleFields.filter(f => selectedFields.includes(f.id));
        const headers = selectedFieldConfigs.map(f => f.label);
        headers.push("Submitted At");
        
        const rows = activePlayers.map(reg => {
            const dataRow = selectedFieldConfigs.map(config => {
                let val = '-';
                if (config.id === 'playerNumber') val = reg.playerNumber?.toString() || '-';
                else if (config.id.startsWith('cf_')) {
                    const fieldIdClean = config.id.replace('cf_', '');
                    val = (reg as any)[fieldIdClean] || '-';
                }
                else val = (reg as any)[config.id] || '-';
                return `"${val}"`;
            });
            dataRow.push(`"${reg.submittedAt ? new Date(reg.submittedAt).toLocaleString() : '-'}"`);
            return dataRow.join(",");
        });

        const csvContent = [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `REGISTRATIONS_${auction?.title?.replace(/\s+/g, '_')}.csv`);
        link.click();
    };

    const addSlab = () => {
        if (!newSlab.from || !newSlab.increment) return;
        setSlabs([...slabs, { from: Number(newSlab.from), increment: Number(newSlab.increment) }]);
        setNewSlab({ from: '', increment: '' });
    };

    const removeSlab = (index: number) => {
        setSlabs(slabs.filter((_, i) => i !== index));
    };

    const addCustomField = () => {
        if (!newField.label) return;
        const field: FormField = {
            id: 'custom_' + Date.now(),
            label: newField.label,
            type: newField.type as any,
            required: !!newField.required,
            options: newField.options || []
        };
        setRegConfig({ ...regConfig, customFields: [...(regConfig.customFields || []), field] });
        setNewField({ label: '', type: 'text', required: true, options: [] });
    };

    const removeCustomField = (fid: string) => {
        setRegConfig({ ...regConfig, customFields: regConfig.customFields.filter(f => f.id !== fid) });
    };

    const addOptionToField = () => {
        if (!optionInput.trim()) return;
        setNewField({ ...newField, options: [...(newField.options || []), optionInput.trim()] });
        setOptionInput('');
    };

    const copyRegLink = () => {
        let baseUrl = window.location.origin;
        if (baseUrl.includes('-dev-')) {
            baseUrl = baseUrl.replace('-dev-', '-pre-');
        }
        const url = `${baseUrl}/#/auction/${id}/register`;
        
        const tryCopy = async () => {
            try {
                await navigator.clipboard.writeText(url);
                setCopySuccess(true);
                showNotification("✅ Link copied! Share this with players.", "success");
                setTimeout(() => setCopySuccess(false), 2000);
            } catch (err) {
                console.error("Copy failed:", err);
            }
        };

        if (navigator.share) {
            navigator.share({
                title: `${auction?.title} - Player Registration`,
                text: 'Register now for the upcoming auction!',
                url: url
            }).catch(() => {
                // if share fails or cancelled, try copy
                tryCopy();
            });
        } else {
            tryCopy();
        }
    };

    const handleSaveCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id) return;
        try {
            const codeData = {
                ...editCode,
                code: editCode.code?.toUpperCase(),
                teamCodes: editCode.teamCodes?.map(tc => ({ ...tc, code: tc.code.toUpperCase() })),
                updatedAt: Date.now()
            };
            if (editCode.id) {
                await db.collection('auctions').doc(id).collection('captainCodes').doc(editCode.id).update(codeData);
            } else {
                await db.collection('auctions').doc(id).collection('captainCodes').add({
                    ...codeData,
                    currentUsage: 0,
                    teamUsedCount: 0,
                    createdAt: Date.now()
                });
            }
            setShowCodeModal(false);
            setEditCode({ code: '', assignedTo: '', teamName: '', usageLimit: 1, isActive: true, teamCodes: [], teamMaxPlayers: 11, teamUsedCount: 0 });
        } catch (err: any) { showNotification("Save failed: " + err.message); }
    };

    const handleDeleteCode = async (codeId: string) => {
        setConfirmAction({
            title: "Delete Code",
            message: "Delete this captain code?",
            onConfirm: async () => {
                await db.collection('auctions').doc(id!).collection('captainCodes').doc(codeId).delete();
                setConfirmAction(null);
            }
        });
    };

    const handleResetCodeUsage = async (codeId: string) => {
        setConfirmAction({
            title: "Reset Usage",
            message: "Reset usage for this code?",
            onConfirm: async () => {
                const code = captainCodes.find(c => c.id === codeId);
                const resetTeamCodes = code?.teamCodes?.map(tc => ({ ...tc, isUsed: false, usedBy: undefined })) || [];
                await db.collection('auctions').doc(id!).collection('captainCodes').doc(codeId).update({ 
                    currentUsage: 0, 
                    teamUsedCount: 0,
                    teamCodes: resetTeamCodes
                });
                setConfirmAction(null);
            }
        });
    };

    const handleSaveRegCode = async () => {
        if (!id || !editRegCode?.code) return;
        try {
            const codeData = {
                code: editRegCode.code.toUpperCase().trim(),
                assignedTo: 'General Code',
                usageLimit: Number(editRegCode.usageLimit) || 1,
                isActive: editRegCode.isActive ?? true,
                updatedAt: Date.now()
            };
            if (editRegCode.id) {
                await db.collection('auctions').doc(id).collection('registrationCodes').doc(editRegCode.id).update(codeData);
                showNotification("Registration Code updated successfully!", "success");
            } else {
                const existing = registrationCodes.find(c => c.code === codeData.code);
                if (existing) {
                    showNotification("A code with this name already exists!", "error");
                    return;
                }
                await db.collection('auctions').doc(id).collection('registrationCodes').add({
                    ...codeData,
                    currentUsage: 0,
                    redemptions: [],
                    createdAt: Date.now()
                });
                showNotification("Registration Code created successfully!", "success");
            }
            setShowRegCodeModal(false);
            setEditRegCode({ code: '', assignedTo: 'General Code', usageLimit: 1, isActive: true });
        } catch (err: any) { showNotification("Save failed: " + err.message); }
    };

    const handleDeleteRegCode = async (codeId: string) => {
        setConfirmAction({
            title: "Delete Registration Code",
            message: "Are you sure you want to delete this organizer registration code?",
            onConfirm: async () => {
                await db.collection('auctions').doc(id!).collection('registrationCodes').doc(codeId).delete();
                setConfirmAction(null);
                showNotification("Registration Code deleted successfully!", "success");
            }
        });
    };

    const handleResetRegCodeUsage = async (codeId: string) => {
        setConfirmAction({
            title: "Reset Registration Code",
            message: "Are you sure you want to reset usage tracking for this registration code?",
            onConfirm: async () => {
                await db.collection('auctions').doc(id!).collection('registrationCodes').doc(codeId).update({ 
                    currentUsage: 0, 
                    redemptions: []
                });
                setConfirmAction(null);
                showNotification("Registration Code usage wiped!", "success");
            }
        });
    };

    if (loading) return <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-zinc-950' : 'bg-gray-50'}`}><Loader2 className={`animate-spin ${isDark ? 'text-accent' : 'text-blue-600'}`}/></div>;

    return (
        <div className={`min-h-screen font-sans pb-20 selection:bg-accent/30 selection:text-accent ${isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-gray-50 text-gray-900'}`}>
            <header className={`border-b sticky top-0 z-30 shadow-sm backdrop-blur-xl ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-gray-200'}`}>
                <div className="w-full max-w-7xl 2xl:max-w-[1700px] mx-auto px-3 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/admin')} className={`transition-colors p-2 rounded-lg ${isDark ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-gray-400 hover:text-gray-800 hover:bg-gray-50'}`}><ArrowLeft className="w-5 h-5"/></button>
                        
                        {/* Auction Switcher - In-place dropdown without popups */}
                        <div className="relative">
                            <select 
                                value={id || ''}
                                onChange={(e) => {
                                    if (e.target.value) navigate(`/manage/${e.target.value}`);
                                }}
                                className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all outline-none cursor-pointer ${isDark ? 'bg-zinc-900 border-zinc-800 text-accent focus:border-accent' : 'bg-white border-gray-200 text-blue-600 focus:border-blue-400 shadow-sm'}`}
                            >
                                {allAuctions.map(a => (
                                    <option key={a.id} value={a.id} className="text-gray-900 bg-white">
                                        {a.title?.toUpperCase() || 'UNTITLED AUCTION'}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="flex flex-col md:flex-row items-center gap-3">
                        {/* Mobile Tab Selector - In-place dropdown without popups */}
                        <div className="md:hidden w-full relative">
                            <select
                                value={activeTab}
                                onChange={(e) => setActiveTab(e.target.value as any)}
                                className={`w-full px-4 py-3 rounded-2xl border-2 text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer transition-all ${
                                    isDark 
                                    ? 'bg-zinc-900 border-zinc-700 text-accent focus:border-accent' 
                                    : 'bg-white border-blue-200 text-blue-700 shadow-sm focus:border-blue-500'
                                }`}
                            >
                                <option value="SETTINGS">SETTINGS</option>
                                <option value="TEAMS">TEAMS ({teams.length})</option>
                                <option value="PLAYERS">PLAYERS ({players.length})</option>
                                <option value="REQUESTS">REQUESTS ({registrations.length})</option>
                                <option value="CATEGORIES">CATEGORIES ({categories.length})</option>
                                <option value="ROLES">ROLES ({roles.length})</option>
                                <option value="SPONSORS">SPONSORS ({sponsors.length})</option>
                                <option value="REGISTRATION">REG CONFIG</option>
                                <option value="WAITLIST">WAITLIST ({waitlist.length})</option>
                                <option value="CAPTAIN_CODES">CAPTAIN CODES</option>
                                <option value="REG_CODES">REG CODES</option>
                                <option value="RECOLLECTION">RECOLLECTION</option>
                                <option value="EXPORT">EXPORT</option>
                            </select>
                        </div>

                        <div className={`hidden md:flex p-0.5 rounded-xl border overflow-x-auto no-scrollbar ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-gray-100 border-gray-200'}`}>
                            {['SETTINGS', 'TEAMS', 'PLAYERS', 'REQUESTS', 'CATEGORIES', 'ROLES', 'SPONSORS', 'REGISTRATION', 'WAITLIST', 'CAPTAIN_CODES', 'REG_CODES', 'RECOLLECTION', 'EXPORT'].map(tab => (
                                <button key={tab} onClick={() => setActiveTab(tab as any)}
                                    className={`px-4 py-2 text-[10px] font-black uppercase transition-all rounded-lg whitespace-nowrap ${
                                        activeTab === tab 
                                        ? 'btn-golden' 
                                        : (isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-gray-400 hover:text-gray-600')
                                    }`}>
                                    {tab === 'REGISTRATION' ? 'REG CONFIG' : tab === 'REQUESTS' ? `Requests (${registrations.length})` : tab === 'WAITLIST' ? `Waitlist (${waitlist.length})` : tab === 'CAPTAIN_CODES' ? 'CAPTAIN CODES' : tab === 'REG_CODES' ? 'REG CODES' : tab}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </header>

            <main className="w-full max-w-7xl 2xl:max-w-[1700px] mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
                {activeTab === 'SETTINGS' && (
                    <div className="space-y-8 animate-fade-in">
                        {/* Database Document Optimizer Card */}
                        <div className={`p-6 rounded-[2rem] border transition-all ${
                            docSizeInfo?.isBloated 
                            ? (isDark ? 'bg-amber-950/30 border-amber-800 text-amber-200' : 'bg-amber-50 border-amber-300 text-amber-900') 
                            : (isDark ? 'bg-zinc-900/60 border-zinc-800 text-zinc-300' : 'bg-blue-50/60 border-blue-200 text-blue-900')
                        }`}>
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-2xl ${
                                        docSizeInfo?.isBloated ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                    }`}>
                                        <Zap className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-black uppercase text-sm tracking-tight">Database Document Health</h3>
                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
                                                docSizeInfo?.isBloated 
                                                ? 'bg-amber-500 text-white' 
                                                : 'bg-green-600 text-white'
                                            }`}>
                                                {docSizeInfo?.isBloated ? 'Oversized Warning' : 'Optimal & Safe'}
                                            </span>
                                        </div>
                                        <p className="text-[10px] opacity-80 mt-0.5">
                                            Current Size: <span className="font-black">{docSizeInfo?.size ? (docSizeInfo.size / 1024).toFixed(1) : '8.5'} KB</span> (Firestore Max Limit: 1,024 KB).
                                            {docSizeInfo?.isBloated ? ' Redundant subcollection arrays detected in document. Purging them prevents write failures.' : ' Subcollections (players, teams, logs) are safely decoupled.'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleManualRepairDocument}
                                    disabled={isRepairingDoc}
                                    className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50 whitespace-nowrap"
                                >
                                    {isRepairingDoc ? <Loader2 className="w-4 h-4 animate-spin"/> : <RefreshCw className="w-4 h-4" />}
                                    {isRepairingDoc ? 'Optimizing...' : '⚡ Optimize & Purge Document'}
                                </button>
                            </div>
                        </div>

                        <div className={`rounded-[2rem] border shadow-sm overflow-hidden ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'}`}>
                            <div className={`p-8 border-b flex justify-between items-center ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-gradient-to-r from-blue-50/50 to-transparent border-gray-100'}`}>
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-2xl shadow-lg bg-accent text-primary shadow-accent/20`}><Settings className="w-6 h-6"/></div>
                                    <div>
                                        <h2 className={`text-2xl font-black uppercase tracking-tight ${isDark ? 'text-white' : 'text-gray-800'}`}>Auction Identity</h2>
                                        <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Configure core tournament logic</p>
                                    </div>
                                </div>
                                <button onClick={handleSaveSettings} className="btn-golden py-3 px-8 rounded-xl">
                                    <Save className="w-4 h-4"/> Sync Identity
                                </button>
                            </div>

                            <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="md:col-span-1 space-y-6">
                                    <div>
                                        <label className={`block text-[10px] font-black uppercase tracking-widest mb-3 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Tournament Logo</label>
                                        <div onClick={() => logoInputRef.current?.click()} className={`w-full aspect-square border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative group ${isDark ? 'bg-zinc-950 border-zinc-800 hover:bg-zinc-900 hover:border-accent/50' : 'bg-gray-50 border-gray-200 hover:bg-white hover:border-blue-400'}`}>
                                            {settingsForm.logoUrl ? (
                                                <img src={settingsForm.logoUrl} className="w-full h-full object-contain p-4" referrerPolicy="no-referrer" />
                                            ) : (
                                                <div className="text-center">
                                                    <ImageIcon className={`w-8 h-8 mx-auto mb-2 ${isDark ? 'text-zinc-700' : 'text-gray-300'}`} />
                                                    <p className={`text-[9px] font-black uppercase ${isDark ? 'text-zinc-600' : 'text-gray-400'}`}>Select Source</p>
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                <Upload className="text-white w-6 h-6" />
                                            </div>
                                            <input ref={logoInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'LOGO')} />
                                        </div>
                                    </div>
                                </div>

                                <div className="md:col-span-2 space-y-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Event Name (Short)</label>
                                            <input type="text" className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold text-gray-700 focus:bg-white focus:border-blue-400 outline-none transition-all" value={settingsForm.title} onChange={e => setSettingsForm({...settingsForm, title: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Full Tournament Name (Optional)</label>
                                            <input type="text" className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold text-gray-700 focus:bg-white focus:border-blue-400 outline-none transition-all" value={settingsForm.fullTournamentName || ''} onChange={e => setSettingsForm({...settingsForm, fullTournamentName: e.target.value})} placeholder="e.g. Bangalore Bigbash League" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Season Number</label>
                                            <input type="text" className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold text-gray-700 focus:bg-white focus:border-blue-400 outline-none transition-all" value={settingsForm.season || ''} onChange={e => setSettingsForm({...settingsForm, season: e.target.value})} placeholder="e.g. 4" />
                                        </div>
                                        <div>
                                            <div className="flex justify-between items-center mb-2 ml-1">
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Event Date</label>
                                                <label className="flex items-center gap-2 cursor-pointer group">
                                                    <input 
                                                        type="checkbox" 
                                                        className="w-3 h-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                                                        checked={settingsForm.dateTBD}
                                                        onChange={e => setSettingsForm({...settingsForm, dateTBD: e.target.checked})}
                                                    />
                                                    <span className="text-[9px] font-bold text-gray-400 uppercase group-hover:text-blue-500 transition-colors">Date not decided yet</span>
                                                </label>
                                            </div>
                                            <input 
                                                type="date" 
                                                className={`w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold text-gray-700 focus:bg-white focus:border-blue-400 outline-none transition-all ${settingsForm.dateTBD ? 'opacity-50 grayscale cursor-not-allowed' : ''}`} 
                                                value={settingsForm.date} 
                                                onChange={e => setSettingsForm({...settingsForm, date: e.target.value})} 
                                                disabled={settingsForm.dateTBD}
                                                required={!settingsForm.dateTBD}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Tournament Matches Dates</label>
                                            <input type="text" className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold text-gray-700 focus:bg-white focus:border-blue-400 outline-none transition-all" value={settingsForm.matchesDate} onChange={e => setSettingsForm({...settingsForm, matchesDate: e.target.value})} placeholder="e.g. 10th - 15th April" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Select Sport</label>
                                            <div className="relative">
                                                <select
                                                    value={settingsForm.sport || 'CRICKET'}
                                                    onChange={e => setSettingsForm({...settingsForm, sport: e.target.value})}
                                                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold text-gray-700 focus:bg-white focus:border-blue-400 outline-none transition-all cursor-pointer uppercase text-xs"
                                                >
                                                    {['CRICKET', 'FOOTBALL', 'KABADDI', 'BADMINTON', 'VOLLEYBALL', 'BASKETBALL', 'TENNIS', 'TABLE TENNIS', 'OTHER'].map(s => (
                                                        <option key={s} value={s}>{s}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Tournament Venue</label>
                                            <input type="text" className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold text-gray-700 focus:bg-white focus:border-blue-400 outline-none transition-all" value={settingsForm.venue || ''} onChange={e => setSettingsForm({...settingsForm, venue: e.target.value})} placeholder="e.g. Chinnaswamy Stadium" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Total Teams</label>
                                            <input type="number" className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold text-gray-700 focus:bg-white focus:border-blue-400 outline-none transition-all" value={settingsForm.totalTeams} onChange={e => setSettingsForm({...settingsForm, totalTeams: Number(e.target.value)})} />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Squad Size (Max)</label>
                                            <input type="number" className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold text-gray-700 focus:bg-white focus:border-blue-400 outline-none transition-all" value={settingsForm.playersPerTeam} onChange={e => setSettingsForm({...settingsForm, playersPerTeam: Number(e.target.value)})} />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Event Venue</label>
                                            <input type="text" className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold text-gray-700 focus:bg-white focus:border-blue-400 outline-none transition-all" value={settingsForm.eventVenue || ''} onChange={e => setSettingsForm({...settingsForm, eventVenue: e.target.value})} placeholder="Stadium, City" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Purse Budget (₹)</label>
                                            <input type="number" className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold text-gray-700 focus:bg-white focus:border-blue-400 outline-none transition-all" value={settingsForm.purseValue} onChange={e => setSettingsForm({...settingsForm, purseValue: Number(e.target.value)})} />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Standard Min Bid (₹)</label>
                                            <input type="number" className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold text-gray-700 focus:bg-white focus:border-blue-400 outline-none transition-all" value={settingsForm.bidIncrement} onChange={e => setSettingsForm({...settingsForm, bidIncrement: Number(e.target.value)})} />
                                        </div>
                                        <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                                <div>
                                                    <p className="text-[10px] font-black text-gray-800 uppercase tracking-widest">Unlimited Purse</p>
                                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Disable all budget restrictions</p>
                                                </div>
                                                <button 
                                                    onClick={() => setSettingsForm({...settingsForm, unlimitedPurse: !settingsForm.unlimitedPurse})}
                                                    className={`w-12 h-6 rounded-full transition-all relative ${settingsForm.unlimitedPurse ? 'bg-blue-600' : 'bg-gray-200'}`}
                                                >
                                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settingsForm.unlimitedPurse ? 'left-7' : 'left-1'}`} />
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                                <div>
                                                    <p className="text-[10px] font-black text-gray-800 uppercase tracking-widest">Auto Reserve Funds</p>
                                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Reserve funds for remaining squad</p>
                                                </div>
                                                <button 
                                                    onClick={() => setSettingsForm({...settingsForm, autoReserveFunds: !settingsForm.autoReserveFunds})}
                                                    className={`w-12 h-6 rounded-full transition-all relative ${settingsForm.autoReserveFunds ? 'bg-blue-600' : 'bg-gray-200'}`}
                                                >
                                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settingsForm.autoReserveFunds ? 'left-7' : 'left-1'}`} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                                        <div className="flex justify-between items-center mb-4">
                                            <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Global Bidding Slabs</label>
                                            <div className="flex gap-2">
                                                <input placeholder="From ₹" type="number" className="w-24 bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none" value={newSlab.from} onChange={e => setNewSlab({...newSlab, from: e.target.value})} />
                                                <input placeholder="+ ₹" type="number" className="w-20 bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none" value={newSlab.increment} onChange={e => setNewSlab({...newSlab, increment: e.target.value})} />
                                                <button onClick={addSlab} className="bg-blue-600 text-white p-1.5 rounded-lg hover:bg-blue-700 transition-colors"><Plus className="w-4 h-4"/></button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {slabs.map((slab, i) => (
                                                <div key={i} className="bg-white px-4 py-2.5 rounded-xl border border-gray-200 flex justify-between items-center shadow-sm">
                                                    <span className="text-[10px] font-black text-gray-600 uppercase">Above {slab.from} : +{slab.increment}</span>
                                                    <button onClick={() => removeSlab(i)} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 className="w-3.5 h-3.5"/></button>
                                                </div>
                                            ))}
                                            {slabs.length === 0 && <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest italic py-2">No custom slabs established</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'TEAMS' && (
                    !teamsLoaded ? (
                        <TabLoader message="Loading Franchise Teams from database..." isDark={isDark} />
                    ) : (
                        <div className="space-y-6 animate-fade-in">
                            {/* Plan Message Banner */}
                            {(!auction?.isPaid && userProfile?.role !== UserRole.SUPER_ADMIN && teams.length > 2) ? (
                                <div className={`p-4 rounded-2xl border-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-pulse ${
                                    isDark ? 'bg-red-950/40 border-red-500/50 text-red-200' : 'bg-red-50 border-red-300 text-red-900'
                                }`}>
                                    <div className="flex items-center gap-3">
                                        <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                                        <div>
                                            <p className="font-black text-xs uppercase tracking-wider text-red-500">
                                                The auction cannot be started until a plan is purchased
                                            </p>
                                            <p className={`text-[10px] font-bold mt-0.5 ${isDark ? 'text-red-300/80' : 'text-red-700'}`}>
                                                Free plan allows up to 2 teams only. You currently have {teams.length} teams.
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => navigate(`/admin?upgrade=${id}`)}
                                        className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-lg active:scale-95 whitespace-nowrap"
                                    >
                                        <CreditCard className="w-3.5 h-3.5" /> Purchase Plan
                                    </button>
                                </div>
                            ) : (auction?.isPaid || userProfile?.role === UserRole.SUPER_ADMIN) ? (
                                <div className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                                    isDark ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                }`}>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                                        <span className="text-[10px] font-black uppercase tracking-wider">
                                            Current Plan: {auction?.planId ? auction.planId.replace(/_/g, ' ').toUpperCase() : 'Active Paid Plan'} • All Limits Removed
                                        </span>
                                    </div>
                                    <span className="text-[8px] font-black bg-emerald-500/20 px-2.5 py-0.5 rounded-full text-emerald-400 uppercase tracking-widest">
                                        ACTIVE
                                    </span>
                                </div>
                            ) : null}

                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h2 className={`text-xl font-black uppercase tracking-tighter ${isDark ? 'text-white' : 'text-gray-800'}`}>Franchise Registry ({teams.length})</h2>
                                    {!auction?.isPaid && userProfile?.role !== UserRole.SUPER_ADMIN && (
                                        <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mt-0.5">
                                            Free Plan: Limited to 2 teams for free ({teams.length}/2 created)
                                        </p>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <label className={`border px-4 py-2 rounded-xl text-[10px] font-black uppercase cursor-pointer transition-all flex items-center gap-2 shadow-sm ${isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                        <FileUp className="w-4 h-4"/> Import XLSX
                                        <input type="file" className="hidden" accept=".xlsx, .xls" onChange={(e) => {
                                            if (!auction?.isPaid && userProfile?.role !== UserRole.SUPER_ADMIN && teams.length >= 2) {
                                                showNotification("Free plan is limited to only 2 teams. Please purchase a plan to import more teams.", "error");
                                                return;
                                            }
                                            handleExcelImport(e, 'TEAM');
                                        }}/>
                                    </label>
                                    <button 
                                        onClick={() => { 
                                            if (!auction?.isPaid && userProfile?.role !== UserRole.SUPER_ADMIN && teams.length >= 2) {
                                                showNotification("Free plan is limited to only 2 teams. Please purchase a plan to add more teams.", "error");
                                                return;
                                            }
                                            setModalType('TEAM'); 
                                            setEditItem({ name: '', owner: '', budget: settingsForm.purseValue }); 
                                            setShowModal(true); 
                                        }} 
                                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 border shadow-sm transition-all ${isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                    >
                                        <Plus className="w-4 h-4"/> Add Team
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {teams.map(team => (
                                    <div key={team.id} className={`p-5 rounded-[1.5rem] border shadow-sm flex items-center justify-between group transition-all ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'}`}>
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden border p-1 ${isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-gray-50 border-gray-100'}`}>
                                                {team.logoUrl ? <img src={team.logoUrl} className="w-full h-full object-contain" referrerPolicy="no-referrer" /> : <Users className={`w-6 h-6 ${isDark ? 'text-zinc-700' : 'text-gray-300'}`}/>}
                                            </div>
                                            <div>
                                                <p className={`font-black uppercase text-sm leading-none ${isDark ? 'text-white' : 'text-gray-800'}`}>{team.name}</p>
                                                <p className={`text-[10px] font-black uppercase tracking-widest mt-1.5 ${isDark ? 'text-zinc-400' : 'text-gray-600'}`}>Owner: <span className={isDark ? 'text-zinc-100' : 'text-gray-900'}>{team.owner || 'No Owner'}</span></p>
                                                <div className="flex items-center gap-2 mt-2.5">
                                                    <p className={`text-[10px] font-bold uppercase ${isDark ? 'text-accent' : 'text-blue-600'}`}>₹{team.budget}</p>
                                                    <div className={`w-1 h-1 rounded-full ${isDark ? 'bg-zinc-800' : 'bg-gray-300'}`}></div>
                                                    <p className={`text-[10px] font-black uppercase ${isDark ? 'text-accent' : 'text-blue-600'}`}>{team.teamCode || 'NO ID'}</p>
                                                </div>
                                                {team.password && (
                                                    <p className={`text-[9px] font-black uppercase mt-1.5 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Pass: {team.password}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-2 items-center">
                                            <button onClick={() => { setModalType('TEAM'); setEditItem(team); setPreviewImage(team.logoUrl); setShowModal(true); }} className={`p-3 rounded-xl transition-all shadow-sm ${isDark ? 'bg-zinc-800 text-amber-500 hover:bg-zinc-700' : 'bg-gray-50 text-blue-600 hover:bg-white border border-gray-100 hover:shadow-md'}`}><Edit className="w-4 h-4"/></button>
                                            <button onClick={() => handleDelete('TEAM', String(team.id))} className={`p-3 rounded-xl transition-all shadow-sm ${isDark ? 'bg-red-900/10 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-red-50 text-red-500 hover:bg-red-500 hover:text-white border border-red-100'}`}><Trash2 className="w-4 h-4"/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                )}

                {activeTab === 'PLAYERS' && (
                    !playersLoaded ? (
                        <TabLoader message="Loading Registered Players from database..." isDark={isDark} />
                    ) : (
                        <div className="space-y-6 animate-fade-in">
                        {/* Export Hub Section - Moved from Requests to Players for Source of Truth Edits */}
                        <div className={`${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-100 shadow-sm'} p-8 rounded-[3rem] border space-y-8`}>
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <h2 className={`text-2xl font-black uppercase tracking-tighter ${isDark ? 'text-white' : 'text-gray-800'}`}>Export Hub</h2>
                                    <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Download your finalized player data</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={exportRegistrationsToCSV} 
                                        className={`${isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700' : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100'} px-6 py-3 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 transition-all active:scale-95`}
                                    >
                                        <Download className="w-4 h-4"/> Export CSV
                                    </button>
                                    {isGeneratingPDF && (
                                        <button 
                                            onClick={() => isPdfCancelled.current = true}
                                            className="bg-red-50 text-red-500 border border-red-100 px-4 py-3 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-red-500 hover:text-white transition-all active:scale-95 animate-pulse"
                                        >
                                            <X className="w-4 h-4"/> Cancel
                                        </button>
                                    )}
                                    <button 
                                        onClick={generatePDF}
                                        disabled={isGeneratingPDF}
                                        className="bg-blue-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95 disabled:opacity-50"
                                    >
                                        {isGeneratingPDF ? <Loader2 className="w-4 h-4 animate-spin"/> : <FileDown className="w-4 h-4"/>}
                                        {isGeneratingPDF ? `Generating ${pdfProgress}%` : 'Generate PDF Registry'}
                                    </button>
                                </div>
                            </div>

                            <div className={`grid grid-cols-1 lg:grid-cols-3 gap-8 pt-6 border-t ${isDark ? 'border-zinc-800' : 'border-gray-50'}`}>
                                {/* Theme Selection */}
                                <div className="space-y-4">
                                    <label className={`block text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
                                        <Palette className="w-3 h-3 text-blue-500"/> Document Theme
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { id: 'NORMAL', label: 'Standard White', desc: 'Clean & Professional' },
                                            { id: 'ADVAYA', label: 'Premium Dark', desc: 'Gold & Black Warrior' }
                                        ].map(theme => (
                                            <button 
                                                key={theme.id}
                                                onClick={() => setPdfTheme(theme.id as any)}
                                                className={`p-3 rounded-xl border-2 text-left transition-all relative overflow-hidden group ${pdfTheme === theme.id ? 'border-blue-600 bg-blue-50/50 shadow-lg shadow-blue-600/10' : isDark ? 'border-zinc-800 bg-zinc-800/50 hover:border-zinc-700' : 'border-gray-100 bg-gray-50/50 hover:border-blue-200'}`}
                                            >
                                                <div className="relative z-10">
                                                    <p className={`text-[10px] font-black uppercase tracking-widest ${pdfTheme === theme.id ? 'text-blue-600' : isDark ? 'text-zinc-200' : 'text-gray-700'}`}>{theme.label}</p>
                                                    <p className={`text-[8px] font-bold uppercase tracking-widest mt-0.5 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>{theme.desc}</p>
                                                </div>
                                                {pdfTheme === theme.id && (
                                                    <div className="absolute top-2 right-2">
                                                        <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                                                            <CheckCircle className="w-2.5 h-2.5 text-white" />
                                                        </div>
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Players Per Page */}
                                <div className="space-y-4">
                                    <label className={`block text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
                                        <LayoutList className="w-3 h-3 text-blue-500"/> Players Per Page
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[1, 2, 4, 6, 9, 'LIST'].map(num => (
                                            <button 
                                                key={num}
                                                onClick={() => setPlayersPerPage(num as any)}
                                                className={`py-3 rounded-xl border-2 text-center transition-all ${playersPerPage === num ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-600/20' : isDark ? 'border-zinc-800 bg-zinc-800 text-zinc-500 hover:border-zinc-700' : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-blue-200'}`}
                                            >
                                                <p className="text-[10px] font-black uppercase tracking-widest">
                                                    {num === 'LIST' ? 'List' : num}
                                                </p>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Field Selection */}
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <label className={`block text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
                                            <Hash className="w-3 h-3 text-blue-500"/> Player Numbering
                                        </label>
                                        <div className="flex items-center gap-4">
                                            <label className="flex items-center gap-2 cursor-pointer group">
                                                <div className="relative">
                                                    <input 
                                                        type="checkbox" 
                                                        className="sr-only" 
                                                        checked={autoAssignFromBoard}
                                                        onChange={(e) => setAutoAssignFromBoard(e.target.checked)}
                                                    />
                                                    <div className={`w-8 h-4 rounded-full transition-all ${autoAssignFromBoard ? 'bg-blue-600' : isDark ? 'bg-zinc-800' : 'bg-gray-200'}`} />
                                                    <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-all ${autoAssignFromBoard ? 'translate-x-4' : ''}`} />
                                                </div>
                                                <span className={`text-[9px] font-black uppercase tracking-widest transition-colors ${isDark ? 'text-zinc-500 group-hover:text-blue-500' : 'text-gray-500 group-hover:text-blue-600'}`}>Assign from Board</span>
                                            </label>
                                            <button 
                                                onClick={autoAssignPlayerNumbers}
                                                className={`text-[9px] font-black uppercase tracking-widest hover:underline flex items-center gap-1.5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
                                            >
                                                <ListChecks className="w-3 h-3" /> Auto-Assign
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <label className={`flex items-center gap-2 cursor-pointer group px-3 py-2 rounded-xl border transition-all ${isDark ? 'bg-zinc-800 border-zinc-700 hover:border-blue-500' : 'bg-gray-50 border-gray-100 hover:border-blue-200'}`}>
                                            <div className="relative">
                                                <input 
                                                    type="checkbox" 
                                                    className="sr-only" 
                                                    checked={exportCategorizedPDF}
                                                    onChange={(e) => setExportCategorizedPDF(e.target.checked)}
                                                />
                                                <div className={`w-8 h-4 rounded-full transition-all ${exportCategorizedPDF ? 'bg-blue-600' : isDark ? 'bg-zinc-700' : 'bg-gray-200'}`} />
                                                <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-all ${exportCategorizedPDF ? 'translate-x-4' : ''}`} />
                                            </div>
                                            <span className={`text-[9px] font-black uppercase tracking-widest transition-colors ${isDark ? 'text-zinc-500 group-hover:text-blue-500' : 'text-gray-500 group-hover:text-blue-600'}`}>Group by Category</span>
                                        </label>
                                        <div className={`h-4 w-[1px] mx-1 ${isDark ? 'bg-zinc-800' : 'bg-gray-200'}`}></div>
                                        {[
                                            { id: 'playerNumber', label: 'Player #' },
                                            { id: 'fullName', label: 'Full Name' },
                                            { id: 'mobile', label: 'Mobile' },
                                            { id: 'dob', label: 'DOB' },
                                            { id: 'gender', label: 'Gender' },
                                            { id: 'playerType', label: 'Role' },
                                            { id: 'status', label: 'Status' },
                                            { id: 'profilePic', label: 'Photo' },
                                            { id: 'jerseyName', label: 'Jersey Name' },
                                            { id: 'jerseyNumber', label: 'Jersey Number' },
                                            { id: 'jerseySize', label: 'Jersey Size' },
                                            ...regConfig.customFields.map(f => ({ id: `cf_${f.id}`, label: f.label }))
                                        ].map(field => (
                                            <button 
                                                key={field.id}
                                                onClick={() => {
                                                    if (selectedFields.includes(field.id)) {
                                                        setSelectedFields(selectedFields.filter(f => f !== field.id));
                                                    } else {
                                                        setSelectedFields([...selectedFields, field.id]);
                                                    }
                                                }}
                                                className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 ${selectedFields.includes(field.id) ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/10' : isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-blue-500' : 'bg-gray-50 border-gray-100 text-gray-400 hover:border-blue-200'}`}
                                            >
                                                {field.label}
                                                {selectedFields.includes(field.id) ? <Check className="w-2 h-2"/> : <Plus className="w-2 h-2 opacity-30"/>}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full md:w-auto flex-1">
                                <h2 className={`text-xl font-black uppercase tracking-tighter whitespace-nowrap ${isDark ? 'text-white' : 'text-gray-800'}`}>Player Pool ({players.length})</h2>
                                <div className="relative w-full md:max-w-xs group">
                                    <div className={`absolute inset-0 bg-gradient-to-r from-accent/20 to-blue-500/20 rounded-xl blur-sm opacity-0 group-focus-within:opacity-100 transition-opacity`}></div>
                                    <div className="relative">
                                        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}/>
                                        <input 
                                            type="text" 
                                            placeholder="Search by Name, Category, or Role..." 
                                            className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-[10px] font-black uppercase outline-none transition-all border ${
                                                isDark 
                                                ? 'bg-zinc-950 border-zinc-800 text-white focus:border-accent' 
                                                : 'bg-white border-gray-200 text-gray-800 focus:border-blue-500'
                                            }`}
                                            value={playerSearchQuery}
                                            onChange={(e) => setPlayerSearchQuery(e.target.value)}
                                        />
                                        {playerSearchQuery && (
                                            <button 
                                                onClick={() => setPlayerSearchQuery('')}
                                                className={`absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors`}
                                            >
                                                <X className={`w-3 h-3 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button onClick={exportPlayersToCSV} className={`border px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 transition-all shadow-sm ${isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                    <Download className="w-4 h-4"/> Export CSV
                                </button>
                                <label className={`border px-4 py-2 rounded-xl text-[10px] font-black uppercase cursor-pointer transition-all flex items-center gap-2 shadow-sm ${isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                    <FileUp className="w-4 h-4"/> Import XLSX
                                    <input type="file" className="hidden" accept=".xlsx, .xls" onChange={(e) => handleExcelImport(e, 'PLAYER')}/>
                                </label>
                                <button 
                                    onClick={() => { setModalType('PLAYER'); setEditItem({ name: '', category: 'Standard', role: 'All Rounder', basePrice: settingsForm.basePrice, nationality: 'India' }); setShowModal(true); }} 
                                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 border shadow-sm transition-all ${isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                >
                                    <Plus className="w-4 h-4"/> Add Player
                                </button>
                            </div>
                        </div>
                        <div className={`rounded-[2rem] border shadow-sm overflow-hidden ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'}`}>
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full text-left">
                                    <thead className={`border-b ${isDark ? 'bg-zinc-950/50 border-zinc-800' : 'bg-gray-50 border-gray-100'}`}>
                                        <tr>
                                            <th className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Identity</th>
                                            <th className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Set/Category</th>
                                            <th className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Role</th>
                                            <th className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Value (₹)</th>
                                            <th className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Status</th>
                                            <th className="px-6 py-4 text-right"></th>
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${isDark ? 'divide-zinc-800' : 'divide-gray-100'}`}>
                                        {filteredPlayers.length > 0 ? (
                                            filteredPlayers.map(p => (
                                                <tr key={p.id} className={`transition-colors group ${isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-gray-50'}`}>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div 
                                                                className={`w-10 h-10 rounded-xl overflow-hidden shadow-sm cursor-pointer transition-all border ${isDark ? 'bg-zinc-950 border-zinc-800 hover:border-accent' : 'bg-gray-100 border-gray-200 hover:border-blue-400'}`}
                                                                onClick={() => p.photoUrl && setOverlayImage({ url: p.photoUrl, title: p.name, type: 'PLAYER', id: String(p.id), field: 'photoUrl' })}
                                                            >
                                                                {p.photoUrl ? <img src={p.photoUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <User className={`w-5 h-5 m-2.5 ${isDark ? 'text-zinc-700' : 'text-gray-300'}`}/>}
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md border ${isDark ? 'bg-zinc-800 border-zinc-700 text-accent' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
                                                                        #{(p as any).playerNumber || '-'}
                                                                    </span>
                                                                    <span className={`font-black text-sm uppercase leading-none ${isDark ? 'text-white' : 'text-gray-800'}`}>{p.name}</span>
                                                                </div>
                                                                <p className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>{p.nationality}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {/* In-place Category Dropdown without popups */}
                                                        <select
                                                            value={p.category || 'Standard'}
                                                            onChange={async (e) => {
                                                                const newCat = e.target.value;
                                                                try {
                                                                    await db.collection('auctions').doc(id!).collection('players').doc(String(p.id)).update({
                                                                        category: newCat,
                                                                        updatedAt: Date.now()
                                                                    });
                                                                    showNotification(`Category updated to ${newCat} for ${p.name}`, "success");
                                                                } catch (err: any) {
                                                                    showNotification("Failed to update: " + err.message, "error");
                                                                }
                                                            }}
                                                            className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tight border outline-none cursor-pointer transition-all ${
                                                                (p.category || 'Standard') === 'Standard'
                                                                ? (isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-600' : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:border-zinc-300')
                                                                : (isDark ? 'bg-amber-950/40 border-amber-800 text-amber-300 hover:border-amber-700' : 'bg-amber-50 border-amber-200 text-amber-800 hover:border-amber-300')
                                                            }`}
                                                        >
                                                            {['Standard', ...categories.map(c => c.name)].map(catName => (
                                                                <option key={catName} value={catName} className="text-gray-900 bg-white">{catName}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {/* In-place Role Dropdown without popups */}
                                                        <select
                                                            value={p.role || 'All Rounder'}
                                                            onChange={async (e) => {
                                                                const newRole = e.target.value;
                                                                try {
                                                                    await db.collection('auctions').doc(id!).collection('players').doc(String(p.id)).update({
                                                                        role: newRole,
                                                                        updatedAt: Date.now()
                                                                    });
                                                                    showNotification(`Role updated to ${newRole} for ${p.name}`, "success");
                                                                } catch (err: any) {
                                                                    showNotification("Failed to update: " + err.message, "error");
                                                                }
                                                            }}
                                                            className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tight border outline-none cursor-pointer transition-all ${
                                                                isDark ? 'bg-zinc-800 border-zinc-700 text-accent hover:border-accent/50' : 'bg-blue-50 border-blue-200 text-blue-700 hover:border-blue-300'
                                                            }`}
                                                        >
                                                            {roles.length > 0 ? (
                                                                roles.map(r => (
                                                                    <option key={r.id || r.name} value={r.name} className="text-gray-900 bg-white">{r.name}</option>
                                                                ))
                                                            ) : (
                                                                ['Batsman', 'Bowler', 'All Rounder', 'Wicketkeeper'].map(r => (
                                                                    <option key={r} value={r} className="text-gray-900 bg-white">{r}</option>
                                                                ))
                                                            )}
                                                        </select>
                                                    </td>
                                                    <td className={`px-6 py-4 font-mono font-black text-sm ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>₹{getEffectiveBasePrice(p, categories).toLocaleString()}</td>
                                                    <td className="px-6 py-4">
                                                        {/* In-place Status Dropdown & Team Assignment without popups */}
                                                        <div className="flex flex-col gap-1.5">
                                                            <select
                                                                value={p.status || 'POOL'}
                                                                onChange={(e) => handleUpdatePlayerStatus(p.id, e.target.value)}
                                                                className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border outline-none cursor-pointer transition-all ${
                                                                    (p.status || 'POOL') === 'SOLD' 
                                                                    ? 'bg-green-600 border-green-700 text-white' 
                                                                    : (p.status || 'POOL') === 'UNSOLD' 
                                                                    ? 'bg-red-600 border-red-700 text-white' 
                                                                    : (isDark ? 'bg-zinc-800 border-zinc-700 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-600')
                                                                }`}
                                                            >
                                                                <option value="POOL" className="text-gray-900 bg-white">POOL</option>
                                                                <option value="SOLD" className="text-gray-900 bg-white">SOLD</option>
                                                                <option value="UNSOLD" className="text-gray-900 bg-white">UNSOLD</option>
                                                            </select>
                                                            {p.status === 'SOLD' && (
                                                                <select
                                                                    value={teams.find(t => t.name === p.soldTo)?.id || ''}
                                                                    onChange={async (e) => {
                                                                        const team = teams.find(t => String(t.id) === e.target.value);
                                                                        if (team) {
                                                                            await db.collection('auctions').doc(id!).collection('players').doc(String(p.id)).update({
                                                                                soldTo: team.name,
                                                                                updatedAt: Date.now()
                                                                            });
                                                                            showNotification(`Assigned to ${team.name}`, "success");
                                                                        }
                                                                    }}
                                                                    className={`text-[8px] font-black uppercase tracking-tight rounded px-1.5 py-1 border outline-none cursor-pointer ${
                                                                        isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-300' : 'bg-white border-gray-200 text-gray-700'
                                                                    }`}
                                                                >
                                                                    <option value="">{p.soldTo ? `${p.soldTo} (₹${p.soldPrice || 0})` : 'Assign Team...'}</option>
                                                                    {teams.map(t => (
                                                                        <option key={t.id} value={t.id} className="text-gray-900 bg-white">{t.name}</option>
                                                                    ))}
                                                                </select>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => { setModalType('PLAYER'); setEditItem(p); setPreviewImage(p.photoUrl); setShowModal(true); }} className={`p-2 rounded-lg transition-colors ${isDark ? 'text-accent hover:bg-accent/10' : 'text-blue-500 hover:bg-blue-50'}`}><Edit className="w-4 h-4"/></button>
                                                            <button onClick={() => handleDelete('PLAYER', String(p.id))} className={`p-2 rounded-lg transition-colors ${isDark ? 'text-red-400 hover:bg-red-400/10' : 'text-red-400 hover:bg-red-50'}`}><Trash2 className="w-4 h-4"/></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center">
                                                    <div className="flex flex-col items-center gap-2 opacity-40">
                                                        <Search className="w-10 h-10 mb-2" />
                                                        <p className="text-[11px] font-black uppercase tracking-widest">No players found matching your search</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    )
                )}

                {activeTab === 'REGISTRATION' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-white rounded-[2rem] border border-gray-200 shadow-sm overflow-hidden">
                            <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-gradient-to-r from-blue-50/50 to-transparent">
                                <div className="flex items-center gap-4">
                                    <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-600/20"><UserCheck className="w-6 h-6 text-white"/></div>
                                    <div>
                                        <h2 className="text-2xl font-black text-gray-800 tracking-tight uppercase">Registration Terminal</h2>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Configure player signup protocols</p>
                                    </div>
                                </div>
                                <div className="flex flex-col md:flex-row items-center gap-4">
                                    <div className="flex flex-col items-end">
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Public Registration Link</p>
                                        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm">
                                            <p className="text-[10px] font-mono text-gray-500 truncate max-w-[200px]">{`${window.location.origin.replace('-dev-', '-pre-')}/#/auction/${id}/register`}</p>
                                            <button 
                                                onClick={copyRegLink}
                                                className={`p-1.5 rounded-lg transition-all ${copySuccess ? 'text-green-500' : 'text-gray-400 hover:text-blue-600'}`}
                                            >
                                                {copySuccess ? <CheckIcon className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                            </button>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={copyRegLink}
                                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 ${
                                            copySuccess ? 'bg-green-600 shadow-green-600/20 text-white' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20 text-white'
                                        }`}
                                    >
                                        <Share2 className="w-4 h-4" /> {copySuccess ? 'Link Copied!' : 'Share Form Link'}
                                    </button>
                                    <div className="flex items-center gap-4 bg-white border border-gray-200 rounded-2xl px-6 py-3 shadow-sm">
                                        <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Form URL Enabled</label>
                                        <button onClick={() => setRegConfig({...regConfig, isEnabled: !regConfig.isEnabled})} className={`transition-all active:scale-90 ${regConfig.isEnabled ? 'text-blue-600' : 'text-gray-300'}`}>{regConfig.isEnabled ? <ToggleRight className="w-10 h-10"/> : <ToggleLeft className="w-10 h-10"/>}</button>
                                    </div>
                                    <div className="flex items-center gap-4 bg-white border border-gray-200 rounded-2xl px-6 py-3 shadow-sm">
                                        <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Accepting Players</label>
                                        <div className="flex gap-1.5">
                                            {[
                                                { value: 'OPEN', label: 'Accept' },
                                                { value: 'CLOSED', label: 'Close' }
                                            ].map(opt => {
                                                const isActive = (regConfig.registrationStatus || 'OPEN') === opt.value;
                                                return (
                                                    <button
                                                        key={opt.value}
                                                        type="button"
                                                        onClick={async () => {
                                                            const val = opt.value as 'OPEN' | 'CLOSED';
                                                            const updatedConfig = { ...regConfig, registrationStatus: val };
                                                            setRegConfig(updatedConfig);
                                                            if (id) {
                                                                try {
                                                                    await safeSaveAuctionDocument(id, { registrationConfig: updatedConfig }, db);
                                                                    showNotification(val === 'OPEN' ? "Registrations Accepted/Open!" : "Registrations Manually Closed!", "success");
                                                                } catch (err: any) {
                                                                    showNotification("Failed to update status: " + err.message, "error");
                                                                }
                                                            }
                                                        }}
                                                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                                                            isActive
                                                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                            : 'bg-gray-50 text-gray-400 border-gray-100 hover:bg-gray-100'
                                                        }`}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-12">
                                <div className="space-y-8">
                                    {/* Visibility & Access */}
                                    <div className="bg-white p-6 rounded-[1.5rem] border border-gray-200 shadow-sm space-y-6">
                                        <h3 className="text-[11px] font-black text-indigo-500 uppercase tracking-[0.25em] mb-2 flex items-center gap-2">
                                            <Eye className="w-4 h-4"/> Visibility & Access
                                        </h3>
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                                <div>
                                                    <span className="text-[11px] font-black text-gray-700 block uppercase tracking-wide">Show on SM Sports Website</span>
                                                    <span className="text-[9px] text-gray-400 font-bold uppercase mt-1 block">Make this tournament visible in the public directory</span>
                                                </div>
                                                <button onClick={() => setRegConfig({...regConfig, isPublic: !regConfig.isPublic})} className={`transition-all active:scale-90 ${regConfig.isPublic ? 'text-indigo-600' : 'text-gray-300'}`}>
                                                    {regConfig.isPublic ? <ToggleRight className="w-8 h-8"/> : <ToggleLeft className="w-8 h-8"/>}
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                                <div>
                                                    <span className="text-[11px] font-black text-gray-700 block uppercase tracking-wide">Hide Landing Page</span>
                                                    <span className="text-[9px] text-gray-400 font-bold uppercase mt-1 block">Skip "Join the Battle" and show form directly</span>
                                                </div>
                                                <button onClick={() => setRegConfig({...regConfig, hideLandingPage: !regConfig.hideLandingPage})} className={`transition-all active:scale-90 ${regConfig.hideLandingPage ? 'text-indigo-600' : 'text-gray-300'}`}>
                                                    {regConfig.hideLandingPage ? <ToggleRight className="w-8 h-8"/> : <ToggleLeft className="w-8 h-8"/>}
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                                <div>
                                                    <span className="text-[11px] font-black text-gray-700 block uppercase tracking-wide">Auto Approve Players</span>
                                                    <span className="text-[9px] text-gray-400 font-bold uppercase mt-1 block">Automatically approve and add registered players to pool</span>
                                                </div>
                                                <button onClick={() => setRegConfig({...regConfig, autoApprove: !regConfig.autoApprove})} className={`transition-all active:scale-90 ${regConfig.autoApprove ? 'text-indigo-600' : 'text-gray-300'}`}>
                                                    {regConfig.autoApprove ? <ToggleRight className="w-8 h-8"/> : <ToggleLeft className="w-8 h-8"/>}
                                                </button>
                                            </div>

                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <span className="text-[11px] font-black text-gray-700 block uppercase tracking-wide">Welcome Poster</span>
                                                        <span className="text-[9px] text-gray-400 font-bold uppercase mt-1 block">Show a custom poster instead of text briefing</span>
                                                    </div>
                                                    {regConfig.welcomePosterUrl && (
                                                        <button onClick={() => setRegConfig({...regConfig, welcomePosterUrl: ''})} className="text-red-500 hover:text-red-600">
                                                            <Trash2 className="w-4 h-4"/>
                                                        </button>
                                                    )}
                                                </div>
                                                <div onClick={() => welcomePosterInputRef.current?.click()} className="w-full h-32 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-all overflow-hidden relative group">
                                                    {regConfig.welcomePosterUrl ? (
                                                        <img src={regConfig.welcomePosterUrl} className="h-full w-full object-contain" referrerPolicy="no-referrer" />
                                                    ) : (
                                                        <div className="text-center">
                                                            <ImageIcon className="w-6 h-6 mx-auto mb-2 text-gray-300" />
                                                            <p className="text-[9px] font-black text-gray-400 uppercase">Upload Poster</p>
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold">CHANGE</div>
                                                    <input ref={welcomePosterInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'REG_WELCOME_POSTER')} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Default Fields Display */}
                                    <div className="bg-gray-50 p-6 rounded-[1.5rem] border border-gray-100">
                                        <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.25em] mb-4 flex items-center gap-2">
                                            <ListChecks className="w-4 h-4"/> Standard Form Fields
                                        </h3>
                                        <div className="space-y-2">
                                            {['Full Legal Name', 'Mobile Primary', 'Date of Birth', 'Skill Identity (Role)', 'Profile Asset (Photo)', 'Proof of Payment (Conditional)'].map(f => (
                                                <div key={f} className="flex items-center gap-2 text-[10px] font-bold text-gray-600 uppercase">
                                                    <CheckCircle className="w-3 h-3 text-green-500" /> {f}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-[11px] font-black text-blue-500 uppercase tracking-[0.25em] mb-6 flex items-center gap-2">
                                            <CreditCard className="w-4 h-4"/> Payment Configuration
                                        </h3>
                                        <div className="flex items-center justify-between p-6 bg-gray-50 border-2 rounded-[1.5rem] group cursor-pointer hover:border-blue-400 transition-all shadow-inner" onClick={() => setRegConfig({...regConfig, includePayment: !regConfig.includePayment})}>
                                            <div>
                                                <span className="text-sm font-black text-gray-700 block uppercase tracking-wide">Collect Registration Fee</span>
                                                <span className="text-[10px] text-gray-400 font-bold uppercase mt-1 block">Require proof of payment to sign up</span>
                                            </div>
                                            {regConfig.includePayment ? <CheckCircle className="w-8 h-8 text-blue-600"/> : <div className="w-8 h-8 border-2 border-gray-200 rounded-full"/>}
                                        </div>
                                    </div>
                                    
                                    {regConfig.includePayment && (
                                        <div className="p-6 bg-blue-50 border-2 border-blue-100 rounded-[2rem] space-y-6 animate-slide-up">
                                            <div>
                                                <label className="block text-[10px] font-black text-blue-500 uppercase tracking-widest mb-4">Select Gateway Logic</label>
                                                <div className="flex gap-3">
                                                    <button 
                                                        onClick={() => setRegConfig({...regConfig, paymentMethod: 'MANUAL'})}
                                                        className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 flex items-center justify-center gap-2 ${regConfig.paymentMethod === 'MANUAL' ? 'bg-white border-blue-400 text-blue-600 shadow-lg' : 'bg-transparent border-gray-200 text-gray-400 opacity-60'}`}
                                                    >
                                                        <QrCode className="w-4 h-4"/> Manual (UPI)
                                                    </button>
                                                    <button 
                                                        onClick={() => setRegConfig({...regConfig, paymentMethod: 'RAZORPAY'})}
                                                        className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 flex items-center justify-center gap-2 ${regConfig.paymentMethod === 'RAZORPAY' ? 'bg-white border-blue-400 text-blue-600 shadow-lg' : 'bg-transparent border-gray-200 text-gray-400 opacity-60'}`}
                                                    >
                                                        <Zap className="w-4 h-4"/> Razorpay
                                                    </button>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-2 ml-1">Fee Amount (₹)</label>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black">₹</span>
                                                    <input type="number" className="w-full bg-white border-2 border-gray-100 rounded-xl px-8 py-3 text-sm font-black text-gray-700 focus:border-blue-400 outline-none" value={regConfig.fee} onChange={e => setRegConfig({...regConfig, fee: Number(e.target.value)})} />
                                                </div>
                                            </div>

                                            {regConfig.paymentMethod === 'RAZORPAY' && (
                                                <div className="bg-indigo-600 p-6 rounded-2xl shadow-xl animate-fade-in">
                                                    <div className="flex items-center gap-3 mb-4">
                                                        <Key className="w-5 h-5 text-indigo-200" />
                                                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Razorpay Key ID</span>
                                                    </div>
                                                    <input 
                                                        type="text" 
                                                        className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-xs font-bold text-white placeholder:text-white/40 outline-none focus:bg-white/20 transition-all" 
                                                        value={regConfig.razorpayKey || ''} 
                                                        onChange={e => setRegConfig({...regConfig, razorpayKey: e.target.value})} 
                                                        placeholder="rzp_live_xxxxxxxxxxxx" 
                                                    />
                                                    <p className="text-[8px] text-indigo-200 font-bold uppercase mt-3 tracking-widest leading-relaxed text-center">Fetch this from your Razorpay Dashboard &gt; Settings &gt; API Keys</p>
                                                </div>
                                            )}

                                            {regConfig.paymentMethod === 'MANUAL' && (
                                                <div className="space-y-6 animate-fade-in">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">UPI ID</label>
                                                            <input className="w-full border rounded-xl p-2.5 text-xs font-bold" value={regConfig.upiId} onChange={e => setRegConfig({...regConfig, upiId: e.target.value})} placeholder="someone@upi" />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Account Name</label>
                                                            <input className="w-full border rounded-xl p-2.5 text-xs font-bold" value={regConfig.upiName} onChange={e => setRegConfig({...regConfig, upiName: e.target.value})} placeholder="Official Name" />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-black text-gray-500 uppercase mb-3">UPI QR Code Deployment</label>
                                                        <div onClick={() => qrInputRef.current?.click()} className="w-full h-48 bg-white border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-all overflow-hidden relative group">
                                                            {regConfig.qrCodeUrl ? (
                                                                <img src={regConfig.qrCodeUrl} className="h-full w-full object-contain p-4" referrerPolicy="no-referrer" />
                                                            ) : (
                                                                <div className="text-center">
                                                                    <QrCode className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Push QR Source</p>
                                                                </div>
                                                            )}
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                                <Upload className="text-white w-6 h-6" />
                                                            </div>
                                                            <input ref={qrInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'QR')} />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-8">
                                    {/* Basic Fields Management */}
                                    <div className="bg-white p-6 rounded-[1.5rem] border border-gray-200 shadow-sm">
                                        <h3 className="text-[11px] font-black text-blue-500 uppercase tracking-[0.25em] mb-6 flex items-center gap-2">
                                            <User className="w-4 h-4"/> Basic Form Fields
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {[
                                                { id: 'name', label: 'Player Name' },
                                                { id: 'dob', label: 'Date of Birth' },
                                                { id: 'photo', label: 'Player Photo' },
                                                { id: 'mobile', label: 'Mobile Number' },
                                                { id: 'gender', label: 'Gender' },
                                                { id: 'role', label: 'Player Role' }
                                            ].map(field => (
                                                <div key={field.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                                                    <div>
                                                        <p className="text-xs font-black uppercase text-gray-800">{field.label}</p>
                                                        <div className="flex items-center gap-4 mt-2">
                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                <input 
                                                                    type="checkbox" 
                                                                    className="w-3 h-3 rounded text-blue-600"
                                                                    checked={regConfig.basicFields?.[field.id as keyof typeof regConfig.basicFields]?.show ?? true}
                                                                    onChange={e => {
                                                                        const basicFields = { ...regConfig.basicFields };
                                                                        // @ts-ignore
                                                                        basicFields[field.id] = { ...basicFields[field.id], show: e.target.checked };
                                                                        setRegConfig({ ...regConfig, basicFields: basicFields as any });
                                                                    }}
                                                                />
                                                                <span className="text-[9px] font-bold uppercase text-gray-500">Show</span>
                                                            </label>
                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                <input 
                                                                    type="checkbox" 
                                                                    className="w-3 h-3 rounded text-blue-600"
                                                                    checked={regConfig.basicFields?.[field.id as keyof typeof regConfig.basicFields]?.required ?? true}
                                                                    onChange={e => {
                                                                        const basicFields = { ...regConfig.basicFields };
                                                                        // @ts-ignore
                                                                        basicFields[field.id] = { ...basicFields[field.id], required: e.target.checked };
                                                                        setRegConfig({ ...regConfig, basicFields: basicFields as any });
                                                                    }}
                                                                />
                                                                <span className="text-[9px] font-bold uppercase text-gray-500">Required</span>
                                                            </label>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Custom Fields Management */}
                                    <div className="bg-white p-6 rounded-[1.5rem] border border-gray-200 shadow-sm">
                                        <h3 className="text-[11px] font-black text-indigo-500 uppercase tracking-[0.25em] mb-6 flex items-center gap-2">
                                            <ListPlus className="w-4 h-4"/> Custom Form Fields
                                        </h3>
                                        <div className="space-y-4 mb-8">
                                            {(regConfig.customFields || []).map((field, idx) => (
                                                <div key={field.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 group">
                                                    <div className="flex items-center gap-3">
                                                        <div className="bg-white p-2 rounded-lg text-indigo-600 shadow-sm">
                                                            {field.type === 'text' ? <Type className="w-4 h-4"/> : field.type === 'number' ? <Hash className="w-4 h-4"/> : <ChevronDownCircle className="w-4 h-4"/>}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-black uppercase text-gray-800">{field.label}</p>
                                                            <p className="text-[8px] font-bold text-gray-400 uppercase">{field.type} • {field.required ? 'Required' : 'Optional'}</p>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => removeCustomField(field.id)} className="text-red-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4"/></button>
                                                </div>
                                            ))}
                                            {(!regConfig.customFields || regConfig.customFields.length === 0) && (
                                                <p className="text-[10px] text-gray-400 italic text-center py-4">No custom fields defined</p>
                                            )}
                                        </div>

                                        <div className="p-5 bg-indigo-50/50 rounded-2xl border-2 border-dashed border-indigo-100 space-y-4">
                                            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest text-center">Establish New Field Node</p>
                                            <input 
                                                className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-xs font-bold outline-none" 
                                                placeholder="Label (e.g. Father's Name)" 
                                                value={newField.label}
                                                onChange={e => setNewField({...newField, label: e.target.value})}
                                            />
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="grid grid-cols-3 gap-2">
                                                    {[
                                                        { id: 'text', label: 'Text Input', icon: <Type className="w-4 h-4"/> },
                                                        { id: 'number', label: 'Number Input', icon: <Hash className="w-4 h-4"/> },
                                                        { id: 'select', label: 'Dropdown', icon: <ChevronDownCircle className="w-4 h-4"/> }
                                                    ].map(t => (
                                                        <button 
                                                            key={t.id}
                                                            type="button"
                                                            onClick={() => setNewField({...newField, type: t.id as any})}
                                                            className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase border transition-all flex flex-col items-center gap-1 ${newField.type === t.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'}`}
                                                        >
                                                            {t.icon}
                                                            {t.label}
                                                        </button>
                                                    ))}
                                                </div>
                                                <button 
                                                    onClick={() => setNewField({...newField, required: !newField.required})}
                                                    className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase border transition-all ${newField.required ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-gray-200 text-gray-400'}`}
                                                >
                                                    {newField.required ? 'Required' : 'Optional'}
                                                </button>
                                            </div>

                                            {newField.type === 'select' && (
                                                <div className="space-y-2">
                                                    <div className="flex gap-2">
                                                        <input className="flex-1 border rounded-lg px-3 py-2 text-[10px] font-bold" placeholder="Add Option" value={optionInput} onChange={e => setOptionInput(e.target.value)} />
                                                        <button onClick={addOptionToField} className="bg-indigo-600 text-white px-3 rounded-lg"><Plus className="w-4 h-4"/></button>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {newField.options?.map((o, i) => (
                                                            <span key={i} className="bg-white px-2 py-1 rounded text-[8px] font-black text-indigo-600 border border-indigo-100 flex items-center gap-1">{o} <X className="w-2 h-2 cursor-pointer" onClick={() => setNewField({...newField, options: newField.options?.filter((_, idx) => idx !== i)})} /></span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <button 
                                                onClick={addCustomField}
                                                disabled={!newField.label}
                                                className="w-full bg-white hover:bg-indigo-600 hover:text-white text-indigo-600 border border-indigo-200 font-black py-2.5 rounded-xl text-[10px] uppercase tracking-widest transition-all disabled:opacity-50"
                                            >
                                                <Plus className="w-3 h-3 inline mr-1" /> Add Field Node
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-[11px] font-black text-blue-500 uppercase tracking-[0.25em] mb-6 flex items-center gap-2">
                                            <AlignLeft className="w-4 h-4"/> Terms & Legal Identity
                                        </h3>
                                        <textarea 
                                            className="w-full border-2 border-gray-100 rounded-[1.5rem] p-6 text-xs font-bold text-gray-600 h-48 focus:border-blue-400 outline-none transition-all shadow-inner bg-gray-50/50"
                                            placeholder="Enter your tournament terms and conditions..."
                                            value={regConfig.terms}
                                            onChange={e => setRegConfig({...regConfig, terms: e.target.value})}
                                        />
                                    </div>

                                    <div>
                                        <h3 className="text-[11px] font-black text-red-500 uppercase tracking-[0.25em] mb-6 flex items-center gap-2">
                                            <ShieldCheck className="w-4 h-4"/> Rules & Regulations
                                        </h3>
                                        <textarea 
                                            className="w-full border-2 border-gray-100 rounded-[1.5rem] p-6 text-xs font-bold text-gray-600 h-48 focus:border-red-400 outline-none transition-all shadow-inner bg-gray-50/50"
                                            placeholder="Enter detailed rules and regulations for players..."
                                            value={regConfig.rules || ''}
                                            onChange={e => setRegConfig({...regConfig, rules: e.target.value})}
                                        />
                                    </div>

                                    <div>
                                        <h3 className="text-[11px] font-black text-green-500 uppercase tracking-[0.25em] mb-6 flex items-center gap-2">
                                            <CheckCircle className="w-4 h-4"/> Success Message
                                        </h3>
                                        <textarea 
                                            className="w-full border-2 border-gray-100 rounded-[1.5rem] p-6 text-xs font-bold text-gray-600 h-24 focus:border-green-400 outline-none transition-all shadow-inner bg-gray-50/50"
                                            placeholder="Custom message to show after successful registration (optional)..."
                                            value={regConfig.customSuccessMessage || ''}
                                            onChange={e => setRegConfig({...regConfig, customSuccessMessage: e.target.value})}
                                        />
                                        <p className="text-[9px] font-bold text-gray-400 uppercase mt-2 ml-2 tracking-widest">This message appears in the popup after a player submits the form.</p>
                                    </div>

                                    <div className="bg-white p-6 rounded-[1.5rem] border border-gray-200 shadow-sm space-y-6">
                                        <h3 className="text-[11px] font-black text-orange-500 uppercase tracking-[0.25em] mb-2 flex items-center gap-2">
                                            <Users className="w-4 h-4"/> Capacity & Limits
                                        </h3>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-2">Maximum Player Registrations</label>
                                            <input 
                                                type="number"
                                                className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 text-xs font-bold text-gray-700 focus:border-orange-400 outline-none transition-all"
                                                placeholder="e.g. 100 (0 for unlimited)"
                                                value={regConfig.maxRegistrations || ''}
                                                onChange={e => setRegConfig({...regConfig, maxRegistrations: parseInt(e.target.value) || 0})}
                                            />
                                            <p className="text-[9px] font-bold text-gray-400 uppercase mt-2 ml-2 tracking-widest">Registration will auto-close once this limit of APPROVED players is reached.</p>
                                        </div>

                                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-500 uppercase">Reserve Slots for Late Registration</label>
                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Hold a portion of your total slots for specific friends.</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    className="sr-only peer"
                                                    checked={regConfig.reserveSlotsEnabled || false}
                                                    onChange={e => setRegConfig({...regConfig, reserveSlotsEnabled: e.target.checked})}
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                                            </label>
                                        </div>

                                        {regConfig.reserveSlotsEnabled && (
                                            <div className="pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-300">
                                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-2">Slots to Hold (Reserve Count)</label>
                                                <input 
                                                    type="number"
                                                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 text-xs font-bold text-gray-700 focus:border-orange-400 outline-none transition-all"
                                                    placeholder="e.g. 15"
                                                    value={regConfig.reserveSlotsCount || ''}
                                                    onChange={e => setRegConfig({...regConfig, reserveSlotsCount: parseInt(e.target.value) || 0})}
                                                />
                                                <p className="text-[9px] font-bold text-gray-400 uppercase mt-2 ml-2 tracking-widest">
                                                    Registration form will close for public after reaching {Math.max(0, (regConfig.maxRegistrations || 0) - (regConfig.reserveSlotsCount || 0))} slots.
                                                </p>
                                            </div>
                                        )}
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-2">Closed Form Message</label>
                                            <textarea 
                                                className="w-full border-2 border-gray-100 rounded-xl p-4 text-xs font-bold text-gray-600 h-24 focus:border-orange-400 outline-none transition-all bg-gray-50/50"
                                                placeholder="Message to show when registration is closed or limit reached..."
                                                value={regConfig.closedMessage || ''}
                                                onChange={e => setRegConfig({...regConfig, closedMessage: e.target.value})}
                                            />
                                        </div>
                                        <div className="pt-4 border-t border-gray-100">
                                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-2">Slots Filling Progress Bar Display</label>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setRegConfig({...regConfig, hideProgressBar: false})}
                                                    className={`flex-1 py-3 px-4 rounded-xl border-2 text-xs font-black uppercase tracking-wider transition-all text-center ${
                                                        !regConfig.hideProgressBar 
                                                            ? 'bg-orange-500/10 border-orange-500 text-orange-600' 
                                                            : 'bg-gray-50 border-gray-100 text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                                                    }`}
                                                >
                                                    Show Progress Bar
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setRegConfig({...regConfig, hideProgressBar: true})}
                                                    className={`flex-1 py-3 px-4 rounded-xl border-2 text-xs font-black uppercase tracking-wider transition-all text-center ${
                                                        regConfig.hideProgressBar 
                                                            ? 'bg-orange-500/10 border-orange-500 text-orange-600' 
                                                            : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                                                    }`}
                                                >
                                                    Hide Progress Bar
                                                </button>
                                            </div>
                                            {/*
                                                className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 text-xs font-bold text-gray-700 focus:border-orange-400 outline-none transition-all"
                                                value={regConfig.hideProgressBar ? "hide" : "show"}
                                                onChange={e => setRegConfig({...regConfig, hideProgressBar: e.target.value === "hide"})}
                                            >
                                                <option value="show">Show Progress Bar</option>
                                                <option value="hide">Hide Progress Bar</option>
                                            */}<div className="hidden pointer-events-none select-none opacity-0" style={{display: 'none'}}>
                                            </div>
                                            <p className="text-[9px] font-bold text-gray-400 uppercase mt-2 ml-2 tracking-widest">
                                                Control whether players can see the real-time slot filling progress bar on the registration form.
                                            </p>
                                        </div>
                                        <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-500 uppercase">Enable Waitlist</label>
                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Collect names/numbers after slots are full.</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    className="sr-only peer"
                                                    checked={regConfig.enableWaitlist || false}
                                                    onChange={e => setRegConfig({...regConfig, enableWaitlist: e.target.checked})}
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                                            </label>
                                        </div>
                                        {regConfig.enableWaitlist && (
                                            <div className="pt-4 border-t border-gray-50 animate-in fade-in slide-in-from-top-2 duration-300">
                                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-2">Waitlist Section Message</label>
                                                <textarea 
                                                    className="w-full border-2 border-gray-100 rounded-xl p-4 text-xs font-bold text-gray-600 h-20 focus:border-orange-400 outline-none transition-all bg-gray-50/50"
                                                    placeholder="Custom message to show in the waitlist section..."
                                                    value={regConfig.waitlistMessage || ''}
                                                    onChange={e => setRegConfig({...regConfig, waitlistMessage: e.target.value})}
                                                />
                                                <p className="text-[9px] font-bold text-gray-400 uppercase mt-2 ml-2 tracking-widest">This message appears above the waitlist form when registration is closed.</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-white p-6 rounded-[1.5rem] border border-gray-200 shadow-sm space-y-6">
                                        <h3 className="text-[11px] font-black text-blue-600 uppercase tracking-[0.25em] mb-2 flex items-center gap-2">
                                            <ShieldCheck className="w-4 h-4"/> Registration Access
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs font-black uppercase text-gray-800">Captain Codes</p>
                                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Enable captain-only registration codes</p>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input 
                                                        type="checkbox" 
                                                        className="sr-only peer"
                                                        checked={regConfig.enableCaptainCodes ?? true}
                                                        onChange={e => setRegConfig({...regConfig, enableCaptainCodes: e.target.checked})}
                                                    />
                                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                                </label>
                                            </div>
                                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs font-black uppercase text-gray-800">Player Codes</p>
                                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Enable team-specific player codes</p>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input 
                                                        type="checkbox" 
                                                        className="sr-only peer"
                                                        checked={regConfig.enablePlayerCodes ?? true}
                                                        onChange={e => setRegConfig({...regConfig, enablePlayerCodes: e.target.checked})}
                                                    />
                                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white p-6 rounded-[1.5rem] border border-gray-200 shadow-sm space-y-6">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.25em] flex items-center gap-2">
                                                <Tag className="w-4 h-4"/> Jersey Details
                                            </h3>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    className="sr-only peer"
                                                    checked={regConfig.jerseyDetailsEnabled || false}
                                                    onChange={e => setRegConfig({...regConfig, jerseyDetailsEnabled: e.target.checked})}
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                            </label>
                                        </div>
                                        {regConfig.jerseyDetailsEnabled && (
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                                {[
                                                    { id: 'name', label: 'Name on Jersey' },
                                                    { id: 'number', label: 'Number on Jersey' },
                                                    { id: 'size', label: 'Jersey Size' }
                                                ].map(field => (
                                                    <div key={field.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                                        <p className="text-[10px] font-black uppercase text-gray-800 mb-2">{field.label}</p>
                                                        <div className="flex items-center gap-4">
                                                            <label className="flex items-center gap-1.5 cursor-pointer">
                                                                <input 
                                                                    type="checkbox" 
                                                                    className="w-3 h-3 rounded text-indigo-600"
                                                                    checked={(regConfig.jerseyFields?.[field.id as keyof typeof regConfig.jerseyFields] as any)?.show ?? true}
                                                                    onChange={e => {
                                                                        const fields = { ...regConfig.jerseyFields };
                                                                        // @ts-ignore
                                                                        fields[field.id] = { ...(fields[field.id] || {}), show: e.target.checked };
                                                                        setRegConfig({ ...regConfig, jerseyFields: fields as any });
                                                                    }}
                                                                />
                                                                <span className="text-[8px] font-bold uppercase text-gray-500">Show</span>
                                                            </label>
                                                            <label className="flex items-center gap-1.5 cursor-pointer">
                                                                <input 
                                                                    type="checkbox" 
                                                                    className="w-3 h-3 rounded text-indigo-600"
                                                                    checked={(regConfig.jerseyFields?.[field.id as keyof typeof regConfig.jerseyFields] as any)?.required ?? true}
                                                                    onChange={e => {
                                                                        const fields = { ...regConfig.jerseyFields };
                                                                        // @ts-ignore
                                                                        fields[field.id] = { ...(fields[field.id] || {}), required: e.target.checked };
                                                                        setRegConfig({ ...regConfig, jerseyFields: fields as any });
                                                                    }}
                                                                />
                                                                <span className="text-[8px] font-bold uppercase text-gray-500">Required</span>
                                                            </label>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-white p-6 rounded-[1.5rem] border border-gray-200 shadow-sm space-y-6">
                                        <h3 className="text-[11px] font-black text-blue-500 uppercase tracking-[0.25em] mb-2 flex items-center gap-2">
                                            <Phone className="w-4 h-4"/> Organizer Contacts
                                        </h3>
                                        <div className="space-y-4">
                                            {(regConfig.organizerContacts || []).map((contact, idx) => (
                                                <div key={idx} className="flex gap-4 items-end bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                                    <div className="flex-1">
                                                        <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Name</label>
                                                        <input 
                                                            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold"
                                                            value={contact.name}
                                                            onChange={e => {
                                                                const newContacts = [...(regConfig.organizerContacts || [])];
                                                                newContacts[idx].name = e.target.value;
                                                                setRegConfig({...regConfig, organizerContacts: newContacts});
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Phone</label>
                                                        <input 
                                                            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold"
                                                            value={contact.phone}
                                                            onChange={e => {
                                                                const newContacts = [...(regConfig.organizerContacts || [])];
                                                                newContacts[idx].phone = e.target.value;
                                                                setRegConfig({...regConfig, organizerContacts: newContacts});
                                                            }}
                                                        />
                                                    </div>
                                                    <button 
                                                        onClick={() => {
                                                            const newContacts = (regConfig.organizerContacts || []).filter((_, i) => i !== idx);
                                                            setRegConfig({...regConfig, organizerContacts: newContacts});
                                                        }}
                                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                            <button 
                                                onClick={() => {
                                                    const newContacts = [...(regConfig.organizerContacts || []), { name: '', phone: '' }];
                                                    setRegConfig({...regConfig, organizerContacts: newContacts});
                                                }}
                                                className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-[10px] font-black text-gray-400 uppercase hover:border-blue-400 hover:text-blue-500 transition-all"
                                            >
                                                <Plus className="w-3 h-3 inline mr-1" /> Add Contact
                                            </button>
                                        </div>
                                    </div>

                                    <div className="bg-white p-6 rounded-[1.5rem] border border-gray-200 shadow-sm space-y-6">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-[11px] font-black text-amber-500 uppercase tracking-[0.25em] flex items-center gap-2">
                                                <ImageIcon className="w-4 h-4"/> Registration Poster (Welcome)
                                            </h3>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl p-8 hover:border-amber-400 transition-all cursor-pointer relative group overflow-hidden" onClick={() => document.getElementById('regPosterInput')?.click()}>
                                                {regConfig.welcomePosterUrl ? (
                                                    <img src={regConfig.welcomePosterUrl} className="max-h-48 rounded-xl object-contain" />
                                                ) : (
                                                    <div className="text-center">
                                                        <ImageIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Click to upload poster</p>
                                                    </div>
                                                )}
                                                <input id="regPosterInput" type="file" className="hidden" accept="image/*" onChange={async e => {
                                                    if (e.target.files?.[0]) {
                                                        const url = await compressImage(e.target.files[0], 'REG_WELCOME_POSTER');
                                                        setRegConfig({...regConfig, welcomePosterUrl: url});
                                                    }
                                                }} />
                                            </div>
                                            <p className="text-[9px] font-bold text-gray-400 uppercase mt-2 ml-2 tracking-widest">This poster will show as a welcome screen before the registration form.</p>
                                        </div>
                                    </div>

                                    <div className="bg-white p-6 rounded-[1.5rem] border border-gray-200 shadow-sm space-y-6">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-[11px] font-black text-amber-500 uppercase tracking-[0.25em] flex items-center gap-2">
                                                <Megaphone className="w-4 h-4"/> Welcome Popup
                                            </h3>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    className="sr-only peer"
                                                    checked={regConfig.welcomePopup?.isEnabled || false}
                                                    onChange={e => setRegConfig({
                                                        ...regConfig, 
                                                        welcomePopup: {
                                                            ...(regConfig.welcomePopup || { message: '', autoCloseTimer: 5, isEnabled: false }),
                                                            isEnabled: e.target.checked
                                                        }
                                                    })}
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                                            </label>
                                        </div>

                                        {regConfig.welcomePopup?.isEnabled && (
                                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                                <div>
                                                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-2">Welcome Message</label>
                                                    <textarea 
                                                        className="w-full border-2 border-gray-100 rounded-xl p-4 text-xs font-bold text-gray-600 h-24 focus:border-amber-400 outline-none transition-all bg-gray-50/50"
                                                        placeholder="Enter welcome message for players..."
                                                        value={regConfig.welcomePopup?.message || ''}
                                                        onChange={e => setRegConfig({
                                                            ...regConfig,
                                                            welcomePopup: {
                                                                ...(regConfig.welcomePopup || { isEnabled: true, autoCloseTimer: 5, message: '' }),
                                                                message: e.target.value
                                                            }
                                                        })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-2">Auto-Close Timer (Seconds)</label>
                                                    <input 
                                                        type="number"
                                                        min="1"
                                                        max="60"
                                                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 text-xs font-bold text-gray-700 focus:border-amber-400 outline-none transition-all"
                                                        value={regConfig.welcomePopup?.autoCloseTimer || 5}
                                                        onChange={e => setRegConfig({
                                                            ...regConfig,
                                                            welcomePopup: {
                                                                ...(regConfig.welcomePopup || { isEnabled: true, message: '', autoCloseTimer: 5 }),
                                                                autoCloseTimer: parseInt(e.target.value) || 5
                                                            }
                                                        })}
                                                    />
                                                    <p className="text-[9px] font-bold text-gray-400 uppercase mt-2 ml-2 tracking-widest">Popup will automatically close after this time.</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-white p-6 rounded-[1.5rem] border border-gray-200 shadow-sm space-y-6">
                                        <h3 className="text-[11px] font-black text-purple-500 uppercase tracking-[0.25em] mb-2 flex items-center gap-2">
                                            <Palette className="w-4 h-4"/> Visual Identity & Theme
                                        </h3>
                                        
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-500 uppercase mb-2">Form Theme Style</label>
                                            <div className="flex flex-wrap gap-3">
                                                {[
                                                    { id: 'DEFAULT', label: 'Standard (Clean)' },
                                                    { id: 'ADVAYA', label: 'ADVAYA (Kingdom Battle)' },
                                                    { id: 'NAVY_GOLDEN', label: 'Green & White (Classic)' },
                                                    { id: 'CLASSIC_NEON', label: 'Neon Green & Black' }
                                                ].map(t => (
                                                    <button 
                                                        key={t.id}
                                                        type="button"
                                                        onClick={() => setRegConfig({...regConfig, theme: t.id as any})}
                                                        className={`flex-1 min-w-[150px] py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${regConfig.theme === t.id ? 'bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-600/20' : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'}`}
                                                    >
                                                        {t.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-2">Auction Logo</label>
                                                <div onClick={() => regLogoInputRef.current?.click()} className="w-full aspect-square bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-purple-50 transition-all overflow-hidden relative group">
                                                    {regConfig.logoUrl ? (
                                                        <img src={regConfig.logoUrl} className="h-full w-full object-contain p-2" referrerPolicy="no-referrer" />
                                                    ) : (
                                                        <div className="text-center">
                                                            <ImageIcon className="w-6 h-6 mx-auto mb-1 text-gray-300" />
                                                            <p className="text-[8px] font-black text-gray-400 uppercase">Logo</p>
                                                        </div>
                                                    )}
                                                    <input ref={regLogoInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'REG_LOGO')} />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-500 uppercase mb-2">Form Banner</label>
                                                <div onClick={() => regBannerInputRef.current?.click()} className="w-full aspect-square bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-purple-50 transition-all overflow-hidden relative group">
                                                    {regConfig.bannerUrl ? (
                                                        <img src={regConfig.bannerUrl} className="h-full w-full object-contain p-2" referrerPolicy="no-referrer" />
                                                    ) : (
                                                        <div className="text-center">
                                                            <ImageIcon className="w-6 h-6 mx-auto mb-1 text-gray-300" />
                                                            <p className="text-[8px] font-black text-gray-400 uppercase">Banner</p>
                                                        </div>
                                                    )}
                                                    <input ref={regBannerInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'REG_BANNER')} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Image Showcase Section */}
                                    <div className="bg-white p-6 rounded-[1.5rem] border border-gray-200 shadow-sm space-y-6">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-[11px] font-black text-blue-500 uppercase tracking-[0.25em] flex items-center gap-2">
                                                <ImageIcon className="w-4 h-4"/> Image Showcase Gallery
                                            </h3>
                                            <button 
                                                onClick={() => {
                                                    const currentShowcase = regConfig.showcaseImages || [];
                                                    setRegConfig({
                                                        ...regConfig,
                                                        showcaseImages: [...currentShowcase, { imageUrl: '', caption: '' }]
                                                    });
                                                }}
                                                className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all flex items-center gap-2"
                                            >
                                                <Plus className="w-3 h-3" /> Add Image
                                            </button>
                                        </div>

                                        <div className="space-y-4">
                                            {(regConfig.showcaseImages || []).map((img, idx) => (
                                                <div key={`showcase-img-${idx}`} className="p-4 bg-gray-50 border border-gray-100 rounded-2xl flex gap-4 items-start relative group">
                                                    <div className="w-24 h-24 flex-shrink-0 bg-white border-2 border-dashed border-gray-200 rounded-xl overflow-hidden relative hover:bg-blue-50 transition-all cursor-pointer">
                                                        {img.imageUrl ? (
                                                            <img src={img.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                        ) : (
                                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                                <Upload className="w-4 h-4 text-gray-300 mb-1" />
                                                                <span className="text-[8px] font-black text-gray-400 uppercase">Upload</span>
                                                            </div>
                                                        )}
                                                        <input 
                                                            type="file" 
                                                            className="absolute inset-0 opacity-0 cursor-pointer" 
                                                            accept="image/*"
                                                            onChange={async e => {
                                                                if (e.target.files?.[0]) {
                                                                    const url = await compressImage(e.target.files[0], 'REG_BANNER');
                                                                    const updated = [...(regConfig.showcaseImages || [])];
                                                                    updated[idx].imageUrl = url;
                                                                    setRegConfig({ ...regConfig, showcaseImages: updated });
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="flex-1 space-y-3 pt-1">
                                                        <div>
                                                            <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Image Caption</label>
                                                            <input 
                                                                className="w-full border-2 border-gray-100 rounded-lg px-3 py-2 text-[11px] font-bold text-gray-600 focus:border-blue-400 outline-none transition-all"
                                                                placeholder="Enter caption for this image..."
                                                                value={img.caption}
                                                                onChange={e => {
                                                                    const updated = [...(regConfig.showcaseImages || [])];
                                                                    updated[idx].caption = e.target.value;
                                                                    setRegConfig({ ...regConfig, showcaseImages: updated });
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <button 
                                                        onClick={() => {
                                                            const updated = (regConfig.showcaseImages || []).filter((_, i) => i !== idx);
                                                            setRegConfig({ ...regConfig, showcaseImages: updated });
                                                        }}
                                                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-200"
                                                    >
                                                        <XCircle className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                            {(regConfig.showcaseImages || []).length === 0 && (
                                                <div className="text-center py-8 bg-gray-50/50 border-2 border-dashed border-gray-100 rounded-[1.5rem]">
                                                    <ImageIcon className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed">
                                                        No showcase images added yet.<br/>Add images to display a gallery on the registration page.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="bg-slate-900 p-6 rounded-[2rem] text-white">
                                        <div className="flex items-center gap-3 mb-4">
                                            <Info className="w-5 h-5 text-blue-400"/>
                                            <span className="text-[10px] font-black uppercase tracking-widest">Quick Tip</span>
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-400 leading-relaxed uppercase tracking-wide">
                                            Standard form fields are mandatory. Use custom fields for tournament-specific data like T-Shirt size or Father's Name.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-10 bg-gray-50 border-t border-gray-100 flex justify-center">
                                <button onClick={handleSaveRegistration} className="bg-blue-600 hover:bg-blue-700 text-white font-black py-5 px-16 rounded-[1.5rem] shadow-2xl shadow-blue-600/30 text-sm uppercase tracking-widest flex items-center gap-3 transition-all active:scale-95 group">
                                    <Save className="w-5 h-5 group-hover:rotate-12 transition-transform" /> Save Settings
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                
                {activeTab === 'REQUESTS' && (
                    !registrationsLoaded ? (
                        <TabLoader message="Loading Player Registrations from database..." isDark={isDark} />
                    ) : (
                        <div className="space-y-6 animate-fade-in">
                        <div className="flex flex-col lg:flex-row gap-4 mb-8 px-2">
                             <div className="relative flex-1 group">
                                 <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-all" />
                                 <input 
                                     placeholder="Search by name or mobile..." 
                                     className="w-full bg-white border-2 border-gray-100 rounded-[2rem] py-5 pl-16 pr-6 text-sm font-bold outline-none focus:border-blue-400 transition-all shadow-sm" 
                                     value={regSearchQuery} 
                                     onChange={e => setRegSearchQuery(e.target.value)} 
                                 />
                             </div>
                             <div className="p-1.5 bg-gray-50 rounded-[2rem] border-2 border-gray-100 flex gap-1 overflow-x-auto no-scrollbar">
                                 {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(status => (
                                     <button
                                         key={status}
                                         onClick={() => setRegStatusFilter(status as any)}
                                         className={`px-8 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                                             regStatusFilter === status 
                                             ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                                             : 'text-gray-400 hover:text-gray-600 hover:bg-white'
                                         }`}
                                     >
                                         {status}
                                     </button>
                                 ))}
                             </div>
                        </div>

                        {/* Auto Approval Control Card */}
                        <div className="bg-white p-5 rounded-[2rem] border-2 border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 px-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                                    <Zap className="w-5 h-5 animate-pulse text-blue-600" />
                                </div>
                                <div className="text-center sm:text-left">
                                    <h3 className="text-xs font-black uppercase text-gray-800 tracking-wider">Auto Approve New Registrations</h3>
                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1 leading-normal">
                                        If enabled, future players will automatically approve and immediately move to the player pool upon signing up.
                                    </p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer select-none">
                                <input 
                                    type="checkbox" 
                                    className="sr-only peer"
                                    checked={regConfig?.autoApprove || false}
                                    onChange={e => handleToggleAutoApprove(e.target.checked)}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>

                        <div className="flex justify-between items-center mb-4 px-2">
                             <h2 className="text-xl font-black text-gray-800 uppercase tracking-tighter">Registration Queue ({filteredRegistrations.length})</h2>
                        </div>
                        {filteredRegistrations.length === 0 ? (
                            <div className="p-32 text-center text-gray-400 bg-white rounded-[3rem] border-2 border-dashed border-gray-200 flex flex-col items-center">
                                <UserX className="w-12 h-12 mb-4 opacity-20"/>
                                <p className="font-black uppercase tracking-[0.2em] text-xs">No registrations found</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {filteredRegistrations.map(reg => {
                                    const approvedPlayer = reg.status === 'APPROVED' ? players.find(p => p.name === reg.fullName) : null;
                                    const roleToDisplay = approvedPlayer?.role || approvedPlayer?.speciality || reg.playerType;
                                    const categoryToDisplay = approvedPlayer?.category || 'Standard';

                                    return (
                                        <div key={reg.id} className="bg-white p-6 rounded-[1.5rem] border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 hover:shadow-md transition-shadow">
                                        <div className="flex items-center gap-6">
                                            <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg border-2 border-gray-50 flex items-center justify-center bg-gray-50 cursor-pointer group/pic relative"
                                                 onClick={() => setOverlayImage({ url: reg.profilePic, title: reg.fullName, type: 'REGISTRATION', id: reg.id, field: 'profilePic' })}
                                            >
                                                {reg.profilePic ? (
                                                    <img src={reg.profilePic} className="w-full h-full object-cover" alt={reg.fullName} referrerPolicy="no-referrer" />
                                                ) : (
                                                    <User className="w-8 h-8 text-gray-300" />
                                                )}
                                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/pic:opacity-100 transition-opacity flex items-center justify-center">
                                                    <Maximize2 className="w-4 h-4 text-white" />
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                                    <div className="flex items-center gap-1.5 bg-gray-100/50 rounded-lg px-2 py-1">
                                                        <Hash className="w-3 h-3 text-gray-400" />
                                                        <input 
                                                            type="number" 
                                                            className="w-10 bg-transparent border-none outline-none text-xs font-black text-blue-600 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                            value={reg.playerNumber || ''}
                                                            placeholder="#"
                                                            onBlur={(e) => handleUpdatePlayerNumber(reg.id, e.target.value)}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setRegistrations(prev => prev.map(r => r.id === reg.id ? { ...r, playerNumber: parseInt(val) || undefined } : r));
                                                            }}
                                                        />
                                                    </div>
                                                    <p className="text-lg font-black text-gray-800 uppercase leading-none">{reg.fullName}</p>
                                                    {reg.isCaptain && (
                                                        <span className="bg-amber-100 text-amber-600 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border border-amber-200 flex items-center gap-1">
                                                            <ShieldCheck className="w-3 h-3" /> Captain 🧑‍✈️
                                                        </span>
                                                    )}
                                                    {reg.teamCode && (
                                                        <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border border-blue-100 flex items-center gap-1">
                                                            <Users className="w-3 h-3" /> Team Player 🏏
                                                        </span>
                                                    )}
                                                    {reg.status === 'APPROVED' && (
                                                        <span className="bg-purple-50 text-purple-600 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border border-purple-100">
                                                            {categoryToDisplay}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{roleToDisplay} • {reg.mobile}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border-2 ${reg.status === 'PENDING' ? 'bg-yellow-50 text-yellow-600 border-yellow-200' : reg.status === 'APPROVED' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>{reg.status}</div>
                                            <button 
                                                onClick={() => {
                                                    setSelectedReg(reg);
                                                    setShowRegModal(true);
                                                }}
                                                className="p-2.5 bg-gray-100 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded-xl transition-all"
                                                title="View Info"
                                            >
                                                <Info className="w-4 h-4"/>
                                            </button>
                                            <button 
                                                onClick={() => setExpandedRegId(expandedRegId === reg.id ? null : reg.id)}
                                                className={`p-2.5 rounded-xl transition-all ${expandedRegId === reg.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-gray-100 hover:bg-blue-50 text-gray-400 hover:text-blue-600'}`}
                                                title="View Details"
                                            >
                                                <Eye className="w-4 h-4"/>
                                            </button>
                                            <button onClick={() => handleDelete('REGISTRATION', reg.id)} className="p-2.5 bg-gray-100 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-xl transition-all"><Trash2 className="w-4 h-4"/></button>
                                            
                                            {reg.status === 'PENDING' ? (
                                                <button 
                                                    onClick={() => handleApproveAndAdd(reg)} 
                                                    className="bg-blue-600 hover:bg-blue-700 text-white font-black px-6 py-2.5 rounded-xl text-[10px] uppercase tracking-widest shadow-lg"
                                                >
                                                    Approve & Add
                                                </button>
                                            ) : (
                                                <button 
                                                    onClick={() => handleRevertToPending(reg.id)} 
                                                    className="bg-gray-100 hover:bg-gray-200 text-gray-600 font-black px-6 py-2.5 rounded-xl text-[10px] uppercase tracking-widest border border-gray-200"
                                                >
                                                    Revert
                                                </button>
                                            )}
                                        </div>

                                        {expandedRegId === reg.id && (
                                            <div className="mt-6 pt-6 border-t border-gray-100 animate-fade-in">
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                                    <div>
                                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Mobile</p>
                                                        <p className="text-xs font-bold text-gray-700">{reg.mobile}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">DOB</p>
                                                        <p className="text-xs font-bold text-gray-700">{reg.dob}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Gender</p>
                                                        <p className="text-xs font-bold text-gray-700">{reg.gender}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Role</p>
                                                        <p className="text-xs font-bold text-gray-700">{roleToDisplay}</p>
                                                    </div>
                                                    {regConfig.customFields.map(f => (
                                                        <div key={f.id}>
                                                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">{f.label}</p>
                                                            <p className="text-xs font-bold text-gray-700">{reg[f.id] || 'N/A'}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                                {reg.paymentScreenshot && (
                                                    <div className="mt-6">
                                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-3">Payment Proof Document</p>
                                                        <div className="relative group/img inline-block cursor-pointer"
                                                             onClick={() => setOverlayImage({ url: reg.paymentScreenshot, title: reg.fullName, type: 'REGISTRATION', id: reg.id, field: 'paymentScreenshot' })}
                                                        >
                                                            <img src={reg.paymentScreenshot} className="max-w-md rounded-2xl border-4 border-white shadow-xl" referrerPolicy="no-referrer" />
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
                                                                <Eye className="text-white w-8 h-8" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    );
                                })}
                            </div>
                        )}
                </div>
                )
            )}

                {(activeTab === 'CATEGORIES' || activeTab === 'ROLES' || activeTab === 'SPONSORS') && (
                    !(activeTab === 'CATEGORIES' ? categoriesLoaded : activeTab === 'ROLES' ? rolesLoaded : sponsorsLoaded) ? (
                        <TabLoader message={`Loading ${activeTab.toLowerCase()} list...`} isDark={isDark} />
                    ) : (
                        <div className="space-y-6 animate-fade-in">
                        <div className="flex justify-between items-center">
                            <label className={`font-black uppercase text-sm ${isDark ? 'text-white' : 'text-gray-800'}`}>Manage {activeTab}</label>
                            <div className="flex gap-2">
                                {activeTab === 'CATEGORIES' && (
                                    <button 
                                        onClick={() => navigate(`/admin/auction/${id}/arrangement`)} 
                                        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase flex items-center gap-2 border shadow-sm transition-all ${isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                    >
                                        <LayoutGrid className="w-3.5 h-3.5"/> Board
                                    </button>
                                )}
                                <button onClick={() => {
                                    setModalType(activeTab === 'CATEGORIES' ? 'CATEGORY' : activeTab === 'ROLES' ? 'ROLE' : 'SPONSOR');
                                    setEditItem({});
                                    setShowModal(true);
                                }} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase flex items-center gap-2 border shadow-sm transition-all ${isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                    <Plus className="w-3.5 h-3.5"/> Add
                                </button>
                            </div>
                        </div>

                        {/* Mobile-First Card View (Hidden on MD+) */}
                        <div className="md:hidden space-y-4 px-1">
                            {(activeTab === 'CATEGORIES' ? categories : activeTab === 'ROLES' ? roles : sponsors).map((item: any) => (
                                <div key={`mob-item-${item.id}`} className={`p-4 rounded-2xl border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border overflow-hidden ${isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-gray-100 border-gray-100'}`}>
                                            {item.imageUrl || item.photoUrl || item.logoUrl ? (
                                                <img src={item.imageUrl || item.photoUrl || item.logoUrl} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                                            ) : (
                                                <Layers className={`w-6 h-6 ${isDark ? 'text-zinc-700' : 'text-gray-300'}`}/>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className={`font-black uppercase text-base ${isDark ? 'text-white' : 'text-gray-800'}`}>{item.name}</h4>
                                            {activeTab === 'CATEGORIES' && (
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                                                    ₹{item.basePrice || 0} • {item.minPerTeam || 0}-{item.maxPerTeam || 0} Per Team
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-between pt-4 border-t border-gray-100/10">
                                        <div className="flex gap-2">
                                            {activeTab === 'CATEGORIES' && (
                                                <button 
                                                    onClick={() => setExpandedCategory(expandedCategory === item.id ? null : item.id)}
                                                    className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-2 ${isDark ? 'bg-zinc-800 text-blue-400' : 'bg-blue-50 text-blue-600'}`}
                                                >
                                                    {expandedCategory === item.id ? 'Hide' : 'Assign'}
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex gap-1">
                                            <button onClick={() => {
                                                setModalType(activeTab === 'CATEGORIES' ? 'CATEGORY' : activeTab === 'ROLES' ? 'ROLE' : 'SPONSOR');
                                                setEditItem(item);
                                                setPreviewImage(item.imageUrl || item.photoUrl || item.logoUrl || '');
                                                setShowModal(true);
                                            }} className={`p-3 rounded-xl border ${isDark ? 'bg-zinc-800 border-zinc-700 text-accent' : 'bg-gray-50 border-gray-100 text-blue-500'}`}><Edit className="w-4 h-4"/></button>
                                            <button onClick={() => handleDelete(activeTab === 'CATEGORIES' ? 'CATEGORIE' : activeTab.slice(0, -1), item.id)} className={`p-3 rounded-xl border ${isDark ? 'bg-zinc-900 border-red-900/30 text-red-500' : 'bg-red-50 border-red-100 text-red-400'}`}><Trash2 className="w-4 h-4"/></button>
                                        </div>
                                    </div>

                                    {activeTab === 'CATEGORIES' && expandedCategory === item.id && (
                                        <div className="mt-4 pt-4 border-t border-gray-100/10 space-y-4">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <input 
                                                    type="text"
                                                    placeholder="Search to assign..."
                                                    value={assignSearch}
                                                    onChange={(e) => setAssignSearch(e.target.value)}
                                                    className={`w-full pl-10 pr-4 py-3 rounded-xl border text-xs font-bold outline-none ${isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-gray-50 border-gray-100'}`}
                                                />
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-2">
                                                {players.filter(p => p.category === item.name).map(player => (
                                                    <div key={`mob-player-${player.id}`} className={`flex items-center gap-2 p-2 rounded-lg border ${isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-gray-50 border-gray-100'}`}>
                                                        <div className="w-6 h-6 rounded-md overflow-hidden bg-gray-200">
                                                            {player.photoUrl && <img src={player.photoUrl} className="w-full h-full object-cover" />}
                                                        </div>
                                                        <p className="text-[9px] font-black uppercase truncate flex-1">{player.name}</p>
                                                        <button onClick={() => handleRemovePlayerFromCategory(player.id)} className="text-red-500"><Trash2 className="w-3 h-3"/></button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Desktop Table View (MD+) */}
                        <div className={`hidden md:block rounded-[2rem] border shadow-sm overflow-hidden ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'}`}>
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full text-left">
                                    <thead className={`border-b ${isDark ? 'bg-zinc-950/50 border-zinc-800' : 'bg-gray-50 border-gray-100'}`}>
                                        <tr>
                                            <th className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Category Name</th>
                                            <th className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Base Price</th>
                                            <th className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Per Team</th>
                                            <th className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Assigned</th>
                                            <th className="px-6 py-4 text-right"></th>
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${isDark ? 'divide-zinc-800' : 'divide-gray-100'}`}>
                                        {(activeTab === 'CATEGORIES' ? categories : activeTab === 'ROLES' ? roles : sponsors).map((item: any) => (
                                            <React.Fragment key={`desk-item-${item.id}`}>
                                                <tr 
                                                    onClick={() => {
                                                        if (activeTab === 'CATEGORIES') {
                                                            setExpandedCategory(expandedCategory === item.id ? null : item.id);
                                                        }
                                                    }}
                                                    className={`transition-colors group cursor-pointer ${isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-gray-50'} ${expandedCategory === item.id ? (isDark ? 'bg-zinc-800/30' : 'bg-gray-50') : ''}`}
                                                >
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border overflow-hidden ${isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-gray-100 border-gray-100'}`}>
                                                                {item.imageUrl || item.photoUrl || item.logoUrl ? (
                                                                    <img src={item.imageUrl || item.photoUrl || item.logoUrl} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                                                                ) : (
                                                                    <Layers className={`w-5 h-5 ${isDark ? 'text-zinc-700' : 'text-gray-300'}`}/>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className={`font-black uppercase text-sm ${isDark ? 'text-white' : 'text-gray-800'}`}>{item.name}</span>
                                                                {activeTab === 'CATEGORIES' && (
                                                                    <ChevronDown className={`w-4 h-4 transition-transform ${isDark ? 'text-zinc-600' : 'text-gray-400'} ${expandedCategory === item.id ? 'rotate-180' : ''}`} />
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className={`px-6 py-4 font-mono font-black text-sm ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
                                                        {activeTab === 'CATEGORIES' ? `₹${item.basePrice || 0}` : '-'}
                                                    </td>
                                                    <td className={`px-6 py-4 text-xs font-bold ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                                                        {activeTab === 'CATEGORIES' ? `${item.minPerTeam || 0}-${item.maxPerTeam || 0}` : '-'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${isDark ? 'bg-accent/10 text-accent' : 'bg-blue-50 text-blue-600'}`}>
                                                            {activeTab === 'CATEGORIES' ? players.filter(p => p.category === item.name).length : '-'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                                            {activeTab === 'CATEGORIES' && (
                                                                <button 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setExpandedCategory(expandedCategory === item.id ? null : item.id);
                                                                    }}
                                                                    className={`p-2 rounded-lg transition-colors flex items-center gap-1.5 ${isDark ? 'bg-zinc-800 text-blue-400 hover:bg-blue-400/10' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                                                                >
                                                                    <UserPlus className="w-4 h-4"/>
                                                                    <span className="text-[9px] font-black uppercase">Assign</span>
                                                                </button>
                                                            )}
                                                            <button onClick={() => {
                                                                setModalType(activeTab === 'CATEGORIES' ? 'CATEGORY' : activeTab === 'ROLES' ? 'ROLE' : 'SPONSOR');
                                                                setEditItem(item);
                                                                setPreviewImage(item.imageUrl || item.photoUrl || item.logoUrl || '');
                                                                setShowModal(true);
                                                            }} className={`p-2 rounded-lg transition-colors ${isDark ? 'text-accent hover:bg-accent/10' : 'text-blue-500 hover:bg-blue-50'}`}><Edit className="w-4 h-4"/></button>
                                                            <button onClick={() => handleDelete(activeTab === 'CATEGORIES' ? 'CATEGORIE' : activeTab.slice(0, -1), item.id)} className={`p-2 rounded-lg transition-colors ${isDark ? 'text-red-400 hover:bg-red-400/10' : 'text-red-400 hover:bg-red-50'}`}><Trash2 className="w-4 h-4"/></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {activeTab === 'CATEGORIES' && expandedCategory === item.id && (
                                                    <tr>
                                                        <td colSpan={6} className={`px-6 py-4 ${isDark ? 'bg-zinc-950/50' : 'bg-gray-50/50'}`}>
                                                            {/* Assign Player Inline Search */}
                                                            <div className="mb-6 max-w-md">
                                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                                    <UserPlus className="w-3 h-3 text-blue-500" /> Assign New Player to {item.name}
                                                                </p>
                                                                <div className="relative">
                                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                                    <input 
                                                                        type="text"
                                                                        placeholder="Search by name to assign..."
                                                                        value={assignSearch}
                                                                        onChange={(e) => setAssignSearch(e.target.value)}
                                                                        className={`w-full pl-10 pr-4 py-3 rounded-2xl border text-xs font-bold transition-all outline-none ${isDark ? 'bg-zinc-900 border-zinc-800 text-white focus:border-blue-500/50 shadow-inner' : 'bg-white border-gray-100 text-gray-800 focus:border-blue-500/50 shadow-sm'}`}
                                                                    />
                                                                    {assignSearch && (
                                                                        <div className={`mt-2 rounded-2xl border ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-gray-50 border-gray-100 shadow-inner'} max-h-60 overflow-y-auto custom-scrollbar`}>
                                                                            {players.filter(p => !p.category || p.category === 'Standard').filter(p => p.name.toLowerCase().includes(assignSearch.toLowerCase())).length > 0 ? (
                                                                                players.filter(p => !p.category || p.category === 'Standard').filter(p => p.name.toLowerCase().includes(assignSearch.toLowerCase())).map(p => (
                                                                                    <div 
                                                                                        key={`desk-assign-player-${p.id}`}
                                                                                        onClick={() => handleAssignPlayerToCategory(p.id, item.name)}
                                                                                        className={`flex items-center gap-3 p-3 cursor-pointer transition-colors border-b last:border-0 ${isDark ? 'hover:bg-zinc-800/50 border-zinc-800' : 'hover:bg-white border-gray-100'}`}
                                                                                    >
                                                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden border ${isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-gray-100 border-gray-200'}`}>
                                                                                             {p.photoUrl ? <img src={p.photoUrl} className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-gray-400" />}
                                                                                        </div>
                                                                                        <div className="flex-1">
                                                                                            <p className={`text-[11px] font-black uppercase ${isDark ? 'text-zinc-100' : 'text-gray-800'}`}>{p.name}</p>
                                                                                            <p className={`text-[9px] font-bold text-gray-500`}>{p.role} • {p.category || 'Standard'}</p>
                                                                                        </div>
                                                                                        <Plus className="w-4 h-4 text-blue-500" />
                                                                                    </div>
                                                                                ))
                                                                            ) : (
                                                                                <div className="p-4 text-center text-[10px] text-gray-500 font-bold uppercase">No unassigned players found</div>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                                                {players.filter(p => p.category === item.name).length > 0 ? (
                                                                    players.filter(p => p.category === item.name).map(player => (
                                                                        <div key={`desk-assigned-player-${player.id}`} className={`flex items-center gap-3 p-3 rounded-xl border relative group/card ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden border ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-gray-50 border-gray-200'}`}>
                                                                                {player.photoUrl ? (
                                                                                    <img src={player.photoUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                                                ) : (
                                                                                    <User className={`w-4 h-4 ${isDark ? 'text-zinc-600' : 'text-gray-400'}`} />
                                                                                )}
                                                                            </div>
                                                                            <div className="min-w-0 flex-1">
                                                                                <p className={`text-[11px] font-black uppercase truncate ${isDark ? 'text-zinc-100' : 'text-gray-800'}`}>{player.name}</p>
                                                                                <p className={`text-[9px] font-bold uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>{player.role}</p>
                                                                            </div>
                                                                            <button 
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleRemovePlayerFromCategory(player.id);
                                                                                }}
                                                                                className="opacity-0 group-hover/card:opacity-100 p-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-all active:scale-95"
                                                                                title="Remove from category"
                                                                            >
                                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                            </button>
                                                                        </div>
                                                                    ))
                                                                ) : (
                                                                    <div className="col-span-full py-4 text-center">
                                                                        <p className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-600' : 'text-gray-400'}`}>No players assigned to this category</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    )
                )}
                {activeTab === 'CAPTAIN_CODES' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-black text-gray-800 uppercase tracking-tighter">Captain Code Management ({captainCodes.length})</h2>
                            <button onClick={() => { setEditCode({ code: '', assignedTo: '', teamName: '', usageLimit: 1, isActive: true }); setShowCodeModal(true); }} className="bg-blue-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all">
                                <Plus className="w-4 h-4"/> Create Code
                            </button>
                        </div>
                        <div className={`rounded-[2rem] border shadow-sm overflow-hidden ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full text-left">
                                    <thead className={`border-b ${isDark ? 'bg-zinc-950/50 border-zinc-800' : 'bg-gray-50 border-gray-100'}`}>
                                        <tr>
                                            <th className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Code</th>
                                            <th className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Team Codes</th>
                                            <th className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Assigned To</th>
                                            <th className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Team Name</th>
                                            <th className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Usage</th>
                                            <th className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Team Usage</th>
                                            <th className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Status</th>
                                            <th className="px-6 py-4 text-right"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {captainCodes.map(code => (
                                            <tr key={code.id} className={`transition-colors group ${isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-gray-50'}`}>
                                                <td className="px-6 py-4">
                                                    <span className={`font-mono font-black text-sm ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{code.code}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-wrap gap-1 max-w-[150px]">
                                                        {code.teamCodes && code.teamCodes.length > 0 ? (
                                                            code.teamCodes.slice(0, 3).map((tc, i) => (
                                                                <span key={i} className={`px-2 py-0.5 rounded text-[8px] font-mono font-black border ${tc.isUsed ? (isDark ? 'bg-zinc-800 text-zinc-500 border-zinc-700' : 'bg-gray-100 text-gray-400 border-gray-200') : (isDark ? 'bg-amber-900/20 text-accent border-accent/20' : 'bg-amber-50 text-amber-600 border-amber-100')}`}>
                                                                    {tc.code}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-gray-400 text-[10px]">-</span>
                                                        )}
                                                        {code.teamCodes && code.teamCodes.length > 3 && (
                                                            <span className="text-[8px] font-black text-gray-400">+{code.teamCodes.length - 3} more</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`font-black text-sm uppercase ${isDark ? 'text-white' : 'text-gray-800'}`}>{code.assignedTo}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>{code.teamName || '-'}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1">
                                                        <span className={`text-[10px] font-black uppercase ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>{code.currentUsage} / {code.usageLimit}</span>
                                                        <div className={`w-20 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-zinc-800' : 'bg-gray-100'}`}>
                                                            <div 
                                                                className={`h-full transition-all ${code.currentUsage >= code.usageLimit ? 'bg-red-500' : 'bg-green-500'}`} 
                                                                style={{ width: `${Math.min(100, (code.currentUsage / code.usageLimit) * 100)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1">
                                                        <span className={`text-[10px] font-black uppercase ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>{code.teamUsedCount || 0} / {code.teamMaxPlayers || 11}</span>
                                                        <div className={`w-20 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-zinc-800' : 'bg-gray-100'}`}>
                                                            <div 
                                                                className={`h-full transition-all ${(code.teamUsedCount || 0) >= (code.teamMaxPlayers || 11) ? 'bg-red-500' : 'bg-amber-500'}`} 
                                                                style={{ width: `${Math.min(100, ((code.teamUsedCount || 0) / (code.teamMaxPlayers || 11)) * 100)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                                                        !code.isActive ? (isDark ? 'bg-zinc-800 text-zinc-500 border-zinc-700' : 'bg-gray-100 text-gray-400 border-gray-200') :
                                                        code.currentUsage >= code.usageLimit ? (isDark ? 'bg-red-900/20 text-red-500 border-red-900/40' : 'bg-red-50 text-red-500 border-red-100') :
                                                        (isDark ? 'bg-green-900/20 text-green-500 border-green-900/40' : 'bg-green-50 text-green-600 border-green-100')
                                                    }`}>
                                                        {!code.isActive ? 'INACTIVE' : code.currentUsage >= code.usageLimit ? 'USED' : 'ACTIVE'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => handleResetCodeUsage(code.id!)} className={`p-2 rounded-lg transition-colors ${isDark ? 'text-amber-500 hover:bg-zinc-800' : 'text-amber-500 hover:bg-amber-50'}`} title="Reset Usage"><RefreshCw className="w-4 h-4"/></button>
                                                        <button onClick={() => { setEditCode(code); setShowCodeModal(true); }} className={`p-2 rounded-lg transition-colors ${isDark ? 'text-blue-500 hover:bg-zinc-800' : 'text-blue-500 hover:bg-blue-50'}`}><Edit className="w-4 h-4"/></button>
                                                        <button onClick={() => handleDeleteCode(code.id!)} className={`p-2 rounded-lg transition-colors ${isDark ? 'text-red-400 hover:bg-zinc-800' : 'text-red-400 hover:bg-red-50'}`}><Trash2 className="w-4 h-4"/></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {captainCodes.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center">
                                                    <div className="max-w-xs mx-auto">
                                                        <Key className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                                                        <p className="text-sm font-black text-gray-400 uppercase tracking-widest">No Captain Codes Established</p>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">Create custom codes to authorize team captains</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'REG_CODES' && (
                    !registrationCodesLoaded ? (
                        <TabLoader message="Loading Organizer Registration Codes from database..." isDark={isDark} />
                    ) : (
                        <div className="space-y-6 animate-fade-in">
                        <div className={`p-6 rounded-3xl border shadow-sm ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'}`}>
                            <div className="mb-6">
                                <h2 className={`text-xl font-black uppercase tracking-tight ${isDark ? 'text-white' : 'text-gray-800'}`}>Organizer Registration Codes</h2>
                                <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Provide custom organizer codes to bypass slot limits or waitlist rules for friends.</p>
                            </div>

                            <div className={`p-6 rounded-2xl border ${isDark ? 'bg-zinc-950/40 border-zinc-850' : 'bg-gray-50/50 border-gray-100'}`}>
                                <h3 className="text-xs font-black uppercase tracking-widest text-amber-500 mb-4">
                                    {editRegCode.id ? 'Edit Registration Code' : 'Create New Registration Code'}
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Registration Code</label>
                                        <input 
                                            required 
                                            type="text" 
                                            className={`w-full rounded-xl px-4 py-3 font-black outline-none transition-all uppercase font-mono text-xs ${
                                                isDark 
                                                ? 'bg-zinc-855 border border-zinc-800 text-amber-400 focus:bg-zinc-900 focus:border-amber-500' 
                                                : 'bg-white border-2 border-gray-100 text-amber-600 focus:bg-white focus:border-amber-400'
                                            }`} 
                                            value={editRegCode.code || ''} 
                                            onChange={e => setEditRegCode({...editRegCode, code: e.target.value.toUpperCase()})} 
                                            placeholder="e.g. FRIENDVIP15" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Usage Limit</label>
                                        <input 
                                            required 
                                            type="number" 
                                            min="1" 
                                            className={`w-full rounded-xl px-4 py-3 font-bold outline-none transition-all text-xs ${
                                                isDark 
                                                ? 'bg-zinc-855 border border-zinc-800 text-white focus:bg-zinc-900' 
                                                : 'bg-white border-2 border-gray-100 text-gray-700 focus:bg-white'
                                            }`} 
                                            value={editRegCode.usageLimit || 1} 
                                            onChange={e => setEditRegCode({...editRegCode, usageLimit: Number(e.target.value)})} 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Status</label>
                                        <div className="flex gap-2">
                                            {[
                                                { value: 'true', label: 'Active' },
                                                { value: 'false', label: 'Muted' }
                                            ].map(opt => {
                                                const isActive = (editRegCode.isActive === false ? 'false' : 'true') === opt.value;
                                                return (
                                                    <button
                                                        key={opt.value}
                                                        type="button"
                                                        onClick={() => setEditRegCode({...editRegCode, isActive: opt.value === 'true'})}
                                                        className={`flex-1 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${
                                                            isActive
                                                            ? isDark
                                                                ? 'bg-amber-500 border-amber-500 text-black shadow-lg shadow-amber-500/25'
                                                                : 'bg-amber-500 text-white border-amber-500 shadow-lg'
                                                            : isDark
                                                                ? 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-750'
                                                                : 'bg-white border-2 border-gray-100 text-gray-400 hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4 flex gap-2 justify-end">
                                    {editRegCode.id && (
                                        <button 
                                            type="button"
                                            onClick={() => setEditRegCode({ code: '', assignedTo: 'General Code', usageLimit: 1, isActive: true })}
                                            className={`px-4 py-2 text-[10px] uppercase font-black tracking-widest rounded-xl transition-all ${
                                                isDark ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                            }`}
                                        >
                                            Cancel Edit
                                        </button>
                                    )}
                                    <button 
                                        onClick={handleSaveRegCode}
                                        className="btn-golden px-6 py-2.5 text-[10px] uppercase font-black tracking-widest rounded-xl flex items-center gap-2"
                                    >
                                        {editRegCode.id ? 'Save Changes' : 'Create Code'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className={`rounded-3xl border shadow-sm overflow-hidden ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'}`}>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className={`${isDark ? 'bg-zinc-800/50 border-b border-zinc-800' : 'bg-gray-50 border-b border-gray-100'}`}>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Code Key</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Usages (Used / Limit)</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${isDark ? 'divide-zinc-800' : 'divide-gray-50'}`}>
                                        {registrationCodes.map(code => (
                                            <tr key={code.id} className={`group hover:${isDark ? 'bg-zinc-850' : 'bg-gray-50/50'} transition-all`}>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-3 py-1.5 rounded-lg border-2 font-mono text-xs font-black uppercase tracking-wider ${
                                                            isDark ? 'bg-black/40 border-accent/25 text-accent' : 'bg-blue-50 border-blue-100 text-blue-600'
                                                        }`}>
                                                            {code.code}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1">
                                                        <span className={`text-[10px] font-black uppercase ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>{code.currentUsage || 0} / {code.usageLimit}</span>
                                                        <div className={`w-28 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-zinc-800' : 'bg-gray-100'}`}>
                                                            <div 
                                                                className={`h-full transition-all ${(code.currentUsage || 0) >= code.usageLimit ? 'bg-red-500' : 'bg-green-500'}`} 
                                                                style={{ width: `${Math.min(100, (((code.currentUsage || 0) / code.usageLimit) * 100))}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                                                        !code.isActive ? (isDark ? 'bg-zinc-850 text-zinc-500 border-zinc-800' : 'bg-gray-100 text-gray-400 border-gray-200') :
                                                        (code.currentUsage || 0) >= code.usageLimit ? (isDark ? 'bg-red-900/20 text-red-500 border-red-900/40' : 'bg-red-50 text-red-500 border-red-100') :
                                                        (isDark ? 'bg-green-900/20 text-green-500 border-green-900/40' : 'bg-green-50 text-green-600 border-green-100')
                                                    }`}>
                                                        {!code.isActive ? 'INACTIVE' : (code.currentUsage || 0) >= code.usageLimit ? 'EXHAUSTED' : 'ACTIVE'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => handleResetRegCodeUsage(code.id!)} className={`p-2 rounded-lg transition-colors ${isDark ? 'text-amber-500 hover:bg-zinc-800' : 'text-amber-500 hover:bg-amber-50'}`} title="Reset Usage"><RefreshCw className="w-4 h-4"/></button>
                                                        <button onClick={() => { setEditRegCode(code); setShowRegCodeModal(true); }} className={`p-2 rounded-lg transition-colors ${isDark ? 'text-blue-500 hover:bg-zinc-800' : 'text-blue-500 hover:bg-blue-50'}`}><Edit className="w-4 h-4"/></button>
                                                        <button onClick={() => handleDeleteRegCode(code.id!)} className={`p-2 rounded-lg transition-colors ${isDark ? 'text-red-400 hover:bg-zinc-800' : 'text-red-400 hover:bg-red-50'}`}><Trash2 className="w-4 h-4"/></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {registrationCodes.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-12 text-center">
                                                    <div className="max-w-xs mx-auto">
                                                        <Key className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                                                        <p className="text-sm font-black text-gray-400 uppercase tracking-widest">No Organizer Codes Established</p>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">Generate codes to give late slot allocation to select players.</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* REDEMPTIONS VIEW */}
                        <div className={`p-6 rounded-3xl border shadow-sm ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'}`}>
                            <h3 className={`text-md font-black uppercase tracking-tight mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>Code Redemptions Log</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className={`${isDark ? 'bg-zinc-800 border-b border-zinc-700' : 'bg-gray-50 border-b border-gray-100'}`}>
                                            <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Code Key</th>
                                            <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Player Name</th>
                                            <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Redeemed At</th>
                                            <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Reg ID</th>
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${isDark ? 'divide-zinc-800' : 'divide-gray-50'}`}>
                                        {registrationCodes.flatMap(code => 
                                            (code.redemptions || []).map((red, rIdx) => ({
                                                id: `${code.id}-${rIdx}`,
                                                code: code.code,
                                                playerName: red.playerName,
                                                registeredAt: red.registeredAt,
                                                registrationID: red.registrationID
                                            }))
                                        ).sort((a,b) => b.registeredAt - a.registeredAt).map(red => (
                                            <tr key={red.id} className={`hover:${isDark ? 'bg-zinc-850' : 'bg-gray-50/50'}`}>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-1 rounded font-mono text-[10px] font-black border uppercase ${
                                                        isDark ? 'bg-black/30 border-accent/20 text-accent' : 'bg-blue-50 border-blue-100 text-blue-600'
                                                    }`}>
                                                        {red.code}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`font-black text-xs uppercase ${isDark ? 'text-white' : 'text-gray-800'}`}>{red.playerName}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-[10px] font-bold text-gray-500 uppercase`}>{new Date(red.registeredAt).toLocaleString()}</span>
                                                </td>
                                                <td className="px-4 py-3 font-mono text-[9px] text-gray-400 lowercase">{red.registrationID || '-'}</td>
                                            </tr>
                                        ))}
                                        {registrationCodes.every(code => !code.redemptions || code.redemptions.length === 0) && (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-6 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                    No redemptions logged yet.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    )
                )}
                {activeTab === 'WAITLIST' && (
                    !waitlistLoaded ? (
                        <TabLoader message="Loading Player Waitlist from database..." isDark={isDark} />
                    ) : (
                        <div className="space-y-6 animate-fade-in">
                        <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
                            <div>
                                <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Waitlist Registry</h2>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Players interested after slots filled</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="bg-amber-50 px-4 py-2 rounded-xl border border-amber-100">
                                    <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Total Waitlist</p>
                                    <p className="text-xl font-black text-amber-700">{waitlist.length}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-100">
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Player Name</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Mobile Number</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Joined At</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {waitlist.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-12 text-center">
                                                    <Users className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                                                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">No warriors on waitlist yet</p>
                                                </td>
                                            </tr>
                                        ) : (
                                            waitlist.map((player) => (
                                                <tr key={player.id} className="hover:bg-gray-50/50 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <p className="font-black text-gray-800 uppercase text-xs">{player.fullName}</p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <Phone className="w-3 h-3 text-gray-400" />
                                                            <p className="font-bold text-gray-600 text-xs">{player.mobile}</p>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-xs font-bold text-gray-400">
                                                        {new Date(player.createdAt).toLocaleString()}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button 
                                                            onClick={async () => {
                                                                setConfirmAction({
                                                                    title: "Remove from Waitlist",
                                                                    message: "Remove from waitlist?",
                                                                    onConfirm: async () => {
                                                                        await db.collection('auctions').doc(id).collection('waitlist').doc(player.id).delete();
                                                                        setConfirmAction(null);
                                                                    }
                                                                });
                                                            }}
                                                            className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    )
                )}
                {activeTab === 'RECOLLECTION' && (
                    <div className="space-y-6 animate-fade-in">
                        <RecollectionManager embedded={true} />
                    </div>
                )}
                {activeTab === 'EXPORT' && (
                    <div className="space-y-8 animate-fade-in">
                        <div className={`rounded-[2rem] border shadow-sm p-8 ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'}`}>
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-green-100 text-green-600 rounded-2xl">
                                        <FileSpreadsheet className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h2 className={`text-2xl font-black uppercase tracking-tight ${isDark ? 'text-white' : 'text-gray-800'}`}>Auction Summary & Export</h2>
                                        <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Export team lists and player data to Excel</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="bg-blue-50 px-4 py-2 rounded-xl border border-blue-100">
                                        <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Total Teams</p>
                                        <p className="text-xl font-black text-blue-700">{teams.length}</p>
                                    </div>
                                    <div className="bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100">
                                        <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Sold Players</p>
                                        <p className="text-xl font-black text-indigo-700">{players.filter(p => p.status === 'SOLD').length}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 space-y-6">
                                    <div className={`p-6 rounded-3xl border ${isDark ? 'bg-zinc-950/50 border-zinc-800' : 'bg-gray-50/50 border-gray-100'}`}>
                                        <h3 className={`text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2 ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                                            <ListChecks className="w-4 h-4" /> Select Fields to Include
                                        </h3>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            {[
                                                { id: 'name', label: 'Player Name' },
                                                { id: 'mobile', label: 'Mobile Number' },
                                                { id: 'category', label: 'Category' },
                                                { id: 'role', label: 'Role' },
                                                { id: 'soldPrice', label: 'Sold Price' },
                                                { id: 'soldTo', label: 'Sold To (Team)' },
                                                { id: 'isTraded', label: 'Trade Info' },
                                                ...regConfig.customFields.map(f => ({ id: `cf_${f.id}`, label: f.label })),
                                                { id: 'jerseyName', label: 'Jersey Name' },
                                                { id: 'jerseyNumber', label: 'Jersey Number' },
                                                { id: 'jerseySize', label: 'Jersey Size' }
                                            ].map(field => (
                                                <button
                                                    key={field.id}
                                                    onClick={() => {
                                                        const current = [...(selectedFields || [])];
                                                        if (current.includes(field.id)) {
                                                            setSelectedFields(current.filter(f => f !== field.id));
                                                        } else {
                                                            setSelectedFields([...current, field.id]);
                                                        }
                                                    }}
                                                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                                                        selectedFields.includes(field.id)
                                                        ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20'
                                                        : (isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700' : 'bg-white border-gray-200 text-gray-400 hover:border-blue-200')
                                                    }`}
                                                >
                                                    {selectedFields.includes(field.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                                    <span className="text-[10px] font-black uppercase tracking-tight truncate">{field.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-4">
                                        <button
                                            onClick={() => {
                                                const allFields = [
                                                    'name', 'mobile', 'category', 'role', 'soldPrice', 'soldTo', 'isTraded',
                                                    ...regConfig.customFields.map(f => `cf_${f.id}`),
                                                    'jerseyName', 'jerseyNumber', 'jerseySize'
                                                ];
                                                setSelectedFields(allFields);
                                            }}
                                            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700' : 'bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-200'}`}
                                        >
                                            Select All
                                        </button>
                                        <button
                                            onClick={() => setSelectedFields(['name', 'soldPrice', 'soldTo'])}
                                            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700' : 'bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-200'}`}
                                        >
                                            Reset Defaults
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className={`p-8 rounded-3xl border text-center space-y-4 ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-green-50/50 border-green-100'}`}>
                                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-green-600/10">
                                            <FileSpreadsheet className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <h4 className={`text-lg font-black uppercase tracking-tight ${isDark ? 'text-white' : 'text-gray-800'}`}>Export Master File</h4>
                                            <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>One file with all team tabs</p>
                                        </div>
                                        <p className="text-xs text-gray-500 leading-relaxed italic">
                                            Generates a professional Excel workbook where each team gets its own sheet containing their purchased players.
                                        </p>
                                        <button 
                                            onClick={() => handleExportExcel('MASTER')}
                                            className="w-full btn-golden py-4 rounded-2xl flex items-center justify-center gap-3"
                                        >
                                            <Download className="w-5 h-5" />
                                            Download Master Excel
                                        </button>
                                    </div>

                                    <div className={`p-8 rounded-3xl border text-center space-y-4 ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-indigo-50/50 border-indigo-100'}`}>
                                        <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-indigo-600/10">
                                            <Printer className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <h4 className={`text-lg font-black uppercase tracking-tight ${isDark ? 'text-white' : 'text-gray-800'}`}>Auction Summary</h4>
                                            <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>View final squad standings</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => setViewSummary(true)}
                                                className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border transition-all ${isDark ? 'bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700' : 'bg-white border-indigo-200 text-indigo-600 hover:bg-indigo-50'}`}
                                            >
                                                <Eye className="w-4 h-4" /> View Summary
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Summary View Overlay */}
                        {viewSummary && (
                            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex flex-col items-center justify-center p-4">
                                <div className={`w-full max-w-6xl h-full max-h-[90vh] rounded-[2.5rem] flex flex-col shadow-2xl overflow-hidden ${isDark ? 'bg-zinc-950 border border-zinc-800' : 'bg-white'}`}>
                                    <div className={`p-8 border-b flex justify-between items-center ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-gray-50/50'}`}>
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-xl shadow-blue-600/20">
                                                <Trophy className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className={`text-2xl font-black uppercase tracking-tight ${isDark ? 'text-white' : 'text-gray-800'}`}>Final Squad Standings</h3>
                                                <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Real-time auction results overview</p>
                                            </div>
                                        </div>
                                        <button onClick={() => setViewSummary(false)} className={`p-4 rounded-2xl transition-all ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-gray-100 text-gray-400'}`}><X className="w-8 h-8" /></button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                            {teams.map(team => {
                                                const teamPlayers = players.filter(p => p.soldTo === team.name);
                                                const spent = teamPlayers.reduce((acc, p) => acc + (p.soldPrice || 0), 0);
                                                return (
                                                    <div key={team.id} className={`rounded-3xl border transition-all ${isDark ? 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700' : 'bg-white border-gray-100 shadow-sm hover:shadow-md'}`}>
                                                        <div className={`p-6 border-b flex items-center gap-4 ${isDark ? 'border-zinc-800' : 'border-gray-50'}`}>
                                                            {team.logoUrl ? (
                                                                <img src={team.logoUrl} className="w-12 h-12 object-contain bg-white rounded-xl p-1 border border-gray-100" />
                                                            ) : (
                                                                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black text-xl">{team.name[0].toUpperCase()}</div>
                                                            )}
                                                            <div className="flex-1 min-w-0">
                                                                <h4 className={`text-sm font-black uppercase truncate ${isDark ? 'text-white' : 'text-gray-800'}`}>{team.name}</h4>
                                                                <div className="flex items-center justify-between mt-1">
                                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Players: {teamPlayers.length}</p>
                                                                    <p className="text-xs font-black text-blue-500 uppercase tracking-tight">Spent: {spent.toLocaleString()}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="p-4 space-y-2">
                                                            {teamPlayers.length === 0 ? (
                                                                <div className="py-8 text-center opacity-30">
                                                                    <Users className="w-8 h-8 mx-auto mb-2" />
                                                                    <span className="text-[9px] font-black uppercase tracking-widest">No players acquired</span>
                                                                </div>
                                                            ) : (
                                                                teamPlayers.map(p => (
                                                                    <div key={p.id} className={`flex items-center justify-between p-2 rounded-xl text-[10px] ${isDark ? 'bg-zinc-950/30 hover:bg-zinc-950/60' : 'bg-gray-50/50 hover:bg-gray-50 transition-colors'}`}>
                                                                        <div className="min-w-0">
                                                                            <p className={`font-black uppercase truncate ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>{p.name}</p>
                                                                            <p className="text-[8px] font-bold text-gray-400 flex items-center gap-1 uppercase tracking-tighter">
                                                                                <Tag className="w-2 h-2" /> {p.category} • {p.role}
                                                                            </p>
                                                                        </div>
                                                                        <div className="text-right ml-2 shrink-0">
                                                                            <p className="font-black text-blue-600">₹{p.soldPrice?.toLocaleString()}</p>
                                                                            {p.isTraded && <span className="text-[7px] font-black bg-amber-100 text-amber-700 px-1 rounded uppercase">Traded</span>}
                                                                        </div>
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div className={`p-8 border-t flex justify-end gap-4 ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-gray-50/50 order-gray-50'}`}>
                                        <button onClick={() => setViewSummary(false)} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${isDark ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-white border text-gray-400 hover:bg-gray-50'}`}>Close Preview</button>
                                        <button onClick={() => handleExportExcel('MASTER')} className="btn-golden px-10 py-3 rounded-2xl flex items-center gap-2">
                                            <FileSpreadsheet className="w-4 h-4" /> Download Complete Summary
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* MODALS */}
            {showCodeModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl border border-white/20 animate-scale-in">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-600/20">
                                    <Key className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-black text-gray-800 uppercase tracking-tighter">{editCode.id ? 'Edit Code' : 'New Captain Code'}</h3>
                            </div>
                            <button onClick={() => setShowCodeModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-400"><X className="w-6 h-6" /></button>
                        </div>
                        <form onSubmit={handleSaveCode} className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Captain Code</label>
                                        <input required type="text" className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-black text-blue-600 focus:bg-white focus:border-blue-400 outline-none transition-all uppercase font-mono" value={editCode.code} onChange={e => setEditCode({...editCode, code: e.target.value.toUpperCase()})} placeholder="e.g. CAPTAIN01" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Team Player Codes</label>
                                        <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar p-2 bg-gray-50 rounded-xl border border-gray-100">
                                            {editCode.teamCodes?.map((tc, idx) => (
                                                <div key={idx} className="flex items-center gap-2">
                                                    <input 
                                                        type="text" 
                                                        className={`flex-1 bg-white border rounded-lg px-3 py-1.5 text-xs font-mono font-black uppercase ${tc.isUsed ? 'text-gray-400 border-gray-100' : 'text-amber-600 border-gray-200'}`}
                                                        value={tc.code}
                                                        disabled={tc.isUsed}
                                                        onChange={e => {
                                                            const newCodes = [...(editCode.teamCodes || [])];
                                                            newCodes[idx].code = e.target.value.toUpperCase();
                                                            setEditCode({...editCode, teamCodes: newCodes});
                                                        }}
                                                        placeholder="CODE"
                                                    />
                                                    {!tc.isUsed && (
                                                        <button 
                                                            type="button"
                                                            onClick={() => {
                                                                const newCodes = editCode.teamCodes?.filter((_, i) => i !== idx);
                                                                setEditCode({...editCode, teamCodes: newCodes});
                                                            }}
                                                            className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                            <button 
                                                type="button"
                                                onClick={() => setEditCode({...editCode, teamCodes: [...(editCode.teamCodes || []), { code: '', isUsed: false }]})}
                                                className="w-full py-2 border-2 border-dashed border-gray-200 rounded-xl text-[10px] font-black text-gray-400 uppercase hover:border-amber-400 hover:text-amber-500 transition-all"
                                            >
                                                + Add Code
                                            </button>
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => {
                                                const prefix = editCode.teamName?.substring(0, 3).toUpperCase() || 'T1';
                                                const count = editCode.teamMaxPlayers || 11;
                                                const generated = Array.from({ length: count }, (_, i) => ({
                                                    code: `${prefix}P${(i + 1).toString().padStart(2, '0')}`,
                                                    isUsed: false
                                                }));
                                                setEditCode({...editCode, teamCodes: generated});
                                            }}
                                            className="mt-2 text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-1"
                                        >
                                            <RefreshCw className="w-3 h-3" /> Auto-Generate {editCode.teamMaxPlayers || 11} Codes
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Assigned Captain Name</label>
                                    <input required type="text" className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold text-gray-700 focus:bg-white focus:border-blue-400 outline-none transition-all" value={editCode.assignedTo} onChange={e => setEditCode({...editCode, assignedTo: e.target.value})} placeholder="Enter captain's name" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Team Name (Optional)</label>
                                    <input type="text" className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold text-gray-700 focus:bg-white focus:border-blue-400 outline-none transition-all" value={editCode.teamName} onChange={e => setEditCode({...editCode, teamName: e.target.value})} placeholder="Enter team name" />
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Usage Limit</label>
                                        <input required type="number" min="1" className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold text-gray-700 focus:bg-white focus:border-blue-400 outline-none transition-all" value={editCode.usageLimit} onChange={e => setEditCode({...editCode, usageLimit: Number(e.target.value)})} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Team Max</label>
                                        <input required type="number" min="1" className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold text-gray-700 focus:bg-white focus:border-blue-400 outline-none transition-all" value={editCode.teamMaxPlayers} onChange={e => setEditCode({...editCode, teamMaxPlayers: Number(e.target.value)})} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Status</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button 
                                                type="button" 
                                                onClick={() => setEditCode({...editCode, isActive: true})} 
                                                className={`py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all border-2 ${editCode.isActive ? 'bg-green-50 border-green-500 text-green-600 shadow-lg shadow-green-500/10' : 'bg-gray-50 border-gray-100 text-gray-400 hover:border-gray-200'}`}
                                            >
                                                Active
                                            </button>
                                            <button 
                                                type="button" 
                                                onClick={() => setEditCode({...editCode, isActive: false})} 
                                                className={`py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all border-2 ${!editCode.isActive ? 'bg-red-50 border-red-500 text-red-600 shadow-lg shadow-red-500/10' : 'bg-gray-50 border-gray-100 text-gray-400 hover:border-gray-200'}`}
                                            >
                                                Inactive
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-xl transition-all uppercase text-xs tracking-widest active:scale-95">Create Code</button>
                        </form>
                    </div>
                </div>
            )}



            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-[2rem] shadow-2xl max-w-sm w-full overflow-hidden border border-gray-200 animate-slide-up">
                        <div className="bg-blue-600 p-6 text-white flex justify-between items-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                            <h3 className="text-lg font-black uppercase tracking-tight relative z-10">{editItem?.id ? 'Modify' : 'Initialize'} {modalType}</h3>
                            <button onClick={closeModal} className="relative z-10 hover:rotate-90 transition-transform"><X className="w-6 h-6"/></button>
                        </div>
                        <form onSubmit={handleCrudSave} className="p-8 space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Identity Name</label>
                                <input required className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold text-gray-700 focus:bg-white focus:border-blue-400 outline-none transition-all" value={editItem?.name || ''} onChange={e => setEditItem({...editItem, name: e.target.value})} />
                            </div>
                            
                            {(modalType === 'TEAM' || modalType === 'PLAYER' || modalType === 'SPONSOR') && (
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Visual Asset</label>
                                    <div onClick={() => fileInputRef.current?.click()} className="w-full aspect-video bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-white hover:border-blue-400 transition-all overflow-hidden relative group">
                                        {previewImage ? (
                                            <img src={previewImage} className="w-full h-full object-contain p-4" referrerPolicy="no-referrer" />
                                        ) : (
                                            <div className="text-center">
                                                <Upload className="w-6 h-6 mx-auto mb-2 text-gray-300" />
                                                <p className="text-[9px] font-black text-gray-400 uppercase">Select Source</p>
                                            </div>
                                        )}
                                        <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'MODAL')} />
                                    </div>
                                </div>
                            )}

                            {modalType === 'TEAM' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Assigned Purse (₹)</label>
                                        <input type="number" className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold text-gray-700 focus:bg-white focus:border-blue-400 outline-none transition-all" value={editItem?.budget} onChange={e => setEditItem({...editItem, budget: Number(e.target.value)})} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Team Password</label>
                                        <input type="text" className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold text-gray-700 focus:bg-white focus:border-blue-400 outline-none transition-all" value={editItem?.password || ''} onChange={e => setEditItem({...editItem, password: e.target.value.trim()})} placeholder="Set team access password" />
                                    </div>
                                    {editItem?.teamCode && (
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Team Registration ID</label>
                                            <input disabled className="w-full bg-gray-100 border-2 border-gray-200 rounded-xl px-4 py-3 font-black text-blue-600 opacity-60 cursor-not-allowed" value={editItem.teamCode} />
                                        </div>
                                    )}
                                </div>
                            )}

                            {modalType === 'CATEGORY' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Base Price (₹)</label>
                                            <input type="number" className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-2.5 font-bold text-gray-700 focus:bg-white focus:border-blue-400 outline-none transition-all" value={editItem?.basePrice || 0} onChange={e => setEditItem({...editItem, basePrice: Number(e.target.value)})} />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Bid Increment (₹)</label>
                                            <input type="number" className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-2.5 font-bold text-gray-700 focus:bg-white focus:border-blue-400 outline-none transition-all" value={editItem?.bidIncrement || 0} onChange={e => setEditItem({...editItem, bidIncrement: Number(e.target.value)})} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Min Per Team</label>
                                            <input type="number" className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-2.5 font-bold text-gray-700 focus:bg-white focus:border-blue-400 outline-none transition-all" value={editItem?.minPerTeam || 0} onChange={e => setEditItem({...editItem, minPerTeam: Number(e.target.value)})} />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Max Per Team</label>
                                            <input type="number" className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-2.5 font-bold text-gray-700 focus:bg-white focus:border-blue-400 outline-none transition-all" value={editItem?.maxPerTeam || 0} onChange={e => setEditItem({...editItem, maxPerTeam: Number(e.target.value)})} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Bid Increment Slabs</label>
                                        <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar p-2 bg-gray-50 rounded-xl border border-gray-100">
                                            {(editItem?.slabs || []).map((slab: any, idx: number) => (
                                                <div key={idx} className="flex gap-2 items-center">
                                                    <input type="number" placeholder="From" className="w-20 bg-white border border-gray-200 rounded-lg px-2 py-1 text-[10px] font-bold" value={slab.from} onChange={e => {
                                                        const newSlabs = [...(editItem.slabs || [])];
                                                        newSlabs[idx].from = Number(e.target.value);
                                                        setEditItem({...editItem, slabs: newSlabs});
                                                    }} />
                                                    <input type="number" placeholder="Incr" className="w-20 bg-white border border-gray-200 rounded-lg px-2 py-1 text-[10px] font-bold" value={slab.increment} onChange={e => {
                                                        const newSlabs = [...(editItem.slabs || [])];
                                                        newSlabs[idx].increment = Number(e.target.value);
                                                        setEditItem({...editItem, slabs: newSlabs});
                                                    }} />
                                                    <button type="button" onClick={() => {
                                                        const newSlabs = (editItem.slabs || []).filter((_: any, i: number) => i !== idx);
                                                        setEditItem({...editItem, slabs: newSlabs});
                                                    }} className="text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3"/></button>
                                                </div>
                                            ))}
                                            <button type="button" onClick={() => {
                                                const newSlabs = [...(editItem.slabs || []), { from: 0, increment: 0 }];
                                                setEditItem({...editItem, slabs: newSlabs});
                                            }} className="w-full py-1 border border-dashed border-gray-300 rounded-lg text-[9px] font-black text-gray-400 uppercase hover:border-blue-400 hover:text-blue-500 transition-all">+ Add Slab</button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {modalType === 'PLAYER' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Current Status</label>
                                            <select
                                                value={editItem?.status || 'POOL'}
                                                onChange={e => setEditItem({...editItem, status: e.target.value})}
                                                className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-2.5 font-bold text-gray-700 focus:bg-white focus:border-blue-400 outline-none transition-all cursor-pointer text-xs uppercase"
                                            >
                                                <option value="POOL">POOL</option>
                                                <option value="SOLD">SOLD</option>
                                                <option value="UNSOLD">UNSOLD</option>
                                            </select>
                                        </div>
                                        
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Base Price (₹)</label>
                                            <input type="number" className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-2.5 font-bold text-gray-700 focus:bg-white focus:border-blue-400 outline-none transition-all" value={editItem?.basePrice} onChange={e => setEditItem({...editItem, basePrice: Number(e.target.value)})} />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Nationality</label>
                                            <input type="text" className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-2.5 font-bold text-gray-700 focus:bg-white focus:border-blue-400 outline-none transition-all" value={editItem?.nationality} onChange={e => setEditItem({...editItem, nationality: e.target.value})} />
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Category Assignment</label>
                                            <select
                                                value={editItem?.category || 'Standard'}
                                                onChange={e => setEditItem({...editItem, category: e.target.value})}
                                                className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-2.5 font-bold text-gray-700 focus:bg-white focus:border-blue-400 outline-none transition-all cursor-pointer text-xs uppercase"
                                            >
                                                {['Standard', ...categories.map(c => c.name)].map(catName => (
                                                    <option key={catName} value={catName}>{catName}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Role / Speciality</label>
                                            <select
                                                value={editItem?.role || 'All Rounder'}
                                                onChange={e => setEditItem({...editItem, role: e.target.value})}
                                                className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-2.5 font-bold text-gray-700 focus:bg-white focus:border-blue-400 outline-none transition-all cursor-pointer text-xs uppercase"
                                            >
                                                {roles.length > 0 ? (
                                                    roles.map(role => (
                                                        <option key={role.id || role.name} value={role.name}>{role.name}</option>
                                                    ))
                                                ) : (
                                                    ['Batsman', 'Bowler', 'All Rounder', 'Wicketkeeper'].map(role => (
                                                        <option key={role} value={role}>{role}</option>
                                                    ))
                                                )}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-xl transition-all uppercase text-xs tracking-widest active:scale-95">Save Code</button>
                        </form>
                    </div>
                </div>
            )}
            {showRegModal && selectedReg && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-[3rem] w-full max-w-4xl overflow-hidden shadow-2xl border border-white/20 animate-fade-in my-8">
                        {/* Header */}
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-600/20">
                                    <User className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">Registration Details</h3>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Review and manage player enrollment</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => {
                                    setShowRegModal(false);
                                    setIsEditingReg(false);
                                }} 
                                className="p-4 hover:bg-gray-100 rounded-2xl transition-all text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {/* Left Column: Profile & Basic Info */}
                            <div className="space-y-6">
                                <div className="relative group">
                                    <div className="aspect-square rounded-[2.5rem] overflow-hidden border-4 border-gray-50 shadow-xl cursor-pointer group bg-gray-50 flex items-center justify-center"
                                         onClick={() => setOverlayImage({ url: selectedReg.profilePic, title: selectedReg.fullName, type: 'REGISTRATION', id: selectedReg.id, field: 'profilePic' })}
                                    >
                                        {selectedReg.profilePic ? (
                                            <img src={selectedReg.profilePic} className="w-full h-full object-cover" alt="Profile" referrerPolicy="no-referrer" />
                                        ) : (
                                            <User className="w-20 h-20 text-gray-300" />
                                        )}
                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                            <Eye className="w-10 h-10 text-white drop-shadow-lg" />
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setOverlayImage({ url: selectedReg.profilePic, title: selectedReg.fullName, type: 'REGISTRATION', id: selectedReg.id, field: 'profilePic' })}
                                        className="absolute bottom-4 right-4 p-3 bg-white/90 backdrop-blur shadow-lg rounded-xl text-gray-600 hover:text-blue-600 transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <Eye className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Basic Information</p>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Full Name</label>
                                                <div className="flex items-center gap-3">
                                                    {isEditingReg ? (
                                                        <input 
                                                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold"
                                                            value={selectedReg.fullName}
                                                            onChange={e => setSelectedReg({...selectedReg, fullName: e.target.value})}
                                                        />
                                                    ) : (
                                                        <div className="flex items-center gap-3">
                                                            <p className="text-sm font-black text-gray-800 uppercase">{selectedReg.fullName}</p>
                                                            {selectedReg.isCaptain && (
                                                                <span className="bg-amber-100 text-amber-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-amber-200 flex items-center gap-1">
                                                                    <ShieldCheck className="w-3 h-3" /> Captain
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Mobile Number</label>
                                                {isEditingReg ? (
                                                    <input 
                                                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold"
                                                        value={selectedReg.mobile}
                                                        onChange={e => setSelectedReg({...selectedReg, mobile: e.target.value})}
                                                    />
                                                ) : (
                                                    <p className="text-sm font-black text-gray-800">{selectedReg.mobile}</p>
                                                )}
                                            </div>
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Player Type</label>
                                                    {isEditingReg ? (
                                                        <div className="flex flex-wrap gap-2">
                                                            {roles.map(r => (
                                                                <button
                                                                    key={r.id}
                                                                    type="button"
                                                                    onClick={() => setSelectedReg({...selectedReg, playerType: r.name})}
                                                                    className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${selectedReg.playerType === r.name ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-gray-50 border-gray-100 text-gray-400 hover:border-blue-200'}`}
                                                                >
                                                                    {r.name}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm font-black text-gray-800 uppercase">{selectedReg.playerType}</p>
                                                    )}
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Gender</label>
                                                    {isEditingReg ? (
                                                        <div className="flex gap-2">
                                                            {['Male', 'Female', 'Other'].map(g => (
                                                                <button
                                                                    key={g}
                                                                    type="button"
                                                                    onClick={() => setSelectedReg({...selectedReg, gender: g})}
                                                                    className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${selectedReg.gender === g ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-gray-50 border-gray-100 text-gray-400 hover:border-blue-200'}`}
                                                                >
                                                                    {g}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm font-black text-gray-800 uppercase">{selectedReg.gender}</p>
                                                    )}
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Category</label>
                                                    {isEditingReg ? (
                                                        <div className="flex flex-wrap gap-2">
                                                            {['Standard', ...categories.map(c => c.name)].map(cat => (
                                                                <button
                                                                    key={cat}
                                                                    type="button"
                                                                    onClick={() => setSelectedReg({...selectedReg, category: cat})}
                                                                    className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${selectedReg.category === cat || (!selectedReg.category && cat === 'Standard') ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-gray-50 border-gray-100 text-gray-400 hover:border-blue-200'}`}
                                                                >
                                                                    {cat}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm font-black text-gray-800 uppercase">{selectedReg.category || 'Standard'}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Payment & Custom Fields */}
                            <div className="space-y-6">
                                {selectedReg.paymentScreenshot && (
                                    <div className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Payment Verification</p>
                                        <div 
                                            className="relative group aspect-video rounded-2xl overflow-hidden border-2 border-gray-200 shadow-sm cursor-pointer"
                                            onClick={() => setOverlayImage({ url: selectedReg.paymentScreenshot, title: selectedReg.fullName, type: 'REGISTRATION', id: selectedReg.id, field: 'paymentScreenshot' })}
                                        >
                                            <img src={selectedReg.paymentScreenshot} className="w-full h-full object-cover" alt="Payment" referrerPolicy="no-referrer" />
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                                <Eye className="w-8 h-8 text-white" />
                                            </div>
                                        </div>
                                        {selectedReg.razorpayPaymentId && (
                                            <p className="mt-2 text-[10px] font-black text-blue-600 uppercase tracking-widest">ID: {selectedReg.razorpayPaymentId}</p>
                                        )}
                                    </div>
                                )}

                                <div className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Attributes & Custom Fields</p>
                                    <div className="space-y-4">
                                        {regConfig.customFields.map(field => (
                                            <div key={field.id}>
                                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">{field.label}</label>
                                                {isEditingReg ? (
                                                    <input 
                                                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold"
                                                        value={selectedReg[field.id] || ''}
                                                        onChange={e => setSelectedReg({...selectedReg, [field.id]: e.target.value})}
                                                    />
                                                ) : (
                                                    <p className="text-sm font-black text-gray-800 uppercase">{selectedReg[field.id] || 'N/A'}</p>
                                                )}
                                            </div>
                                        ))}
                                        {(regConfig.customFields || []).length === 0 && (
                                            <p className="text-[10px] font-bold text-gray-400 uppercase italic">No custom fields defined</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-8 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-4 justify-between items-center">
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => {
                                        const data = JSON.stringify(selectedReg, null, 2);
                                        const blob = new Blob([data], { type: 'application/json' });
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `registration_${selectedReg.fullName.replace(/\s+/g, '_')}.json`;
                                        a.click();
                                    }}
                                    className="px-6 py-3 bg-white border border-gray-200 text-gray-600 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-gray-50 transition-all"
                                >
                                    <Download className="w-4 h-4" /> Download Info
                                </button>
                            </div>
                            
                            <div className="flex gap-3">
                                {isEditingReg ? (
                                    <>
                                        <button 
                                            onClick={() => setIsEditingReg(false)}
                                            className="px-8 py-3 bg-gray-200 text-gray-600 rounded-2xl text-[10px] font-black uppercase tracking-widest"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            onClick={() => handleUpdateRegistration(selectedReg)}
                                            className="px-8 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20"
                                        >
                                            Save Changes
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button 
                                            onClick={() => setIsEditingReg(true)}
                                            className="px-8 py-3 bg-white border border-gray-200 text-gray-600 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-gray-50 transition-all"
                                        >
                                            <Edit className="w-4 h-4" /> Edit Fields
                                        </button>
                                        {selectedReg.status === 'PENDING' ? (
                                            <button 
                                                onClick={() => {
                                                    handleApproveAndAdd(selectedReg);
                                                    setShowRegModal(false);
                                                }}
                                                className="px-8 py-3 bg-green-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-green-600/20"
                                            >
                                                Approve & Add to Pool
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={() => {
                                                    handleRevertToPending(selectedReg.id);
                                                    setShowRegModal(false);
                                                }}
                                                className="px-8 py-3 bg-yellow-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-yellow-600/20"
                                            >
                                                Revert to Pending
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Image Overlay Popup */}
            {overlayImage && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[200] flex flex-col items-center justify-center p-4 md:p-12 animate-fade-in">
                    {/* Controls Header */}
                    <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent">
                        <div className="flex flex-col">
                            <h3 className="text-white font-black uppercase tracking-widest text-sm">{overlayImage.title}</h3>
                            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Full Screen Preview</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = overlayImage.url;
                                    link.download = `${overlayImage.title.replace(/\s+/g, '_')}_${overlayImage.field}.jpg`;
                                    link.click();
                                }}
                                className="p-3 bg-white text-gray-900 rounded-xl transition-all shadow-lg flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:bg-gray-100"
                            >
                                <Download className="w-4 h-4" /> <span className="hidden sm:inline">Download</span>
                            </button>
                            <button 
                                onClick={() => overlayInputRef.current?.click()}
                                className="p-3 bg-white text-blue-600 rounded-xl transition-all shadow-lg flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:bg-gray-100"
                            >
                                <RefreshCw className="w-4 h-4" /> <span className="hidden sm:inline">Update</span>
                            </button>
                            <button 
                                onClick={() => setOverlayImage(null)}
                                className="p-3 bg-white text-red-600 rounded-xl transition-all shadow-lg hover:bg-red-50"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    {/* Image Container */}
                    <div className="w-full h-full flex items-center justify-center overflow-hidden">
                        {overlayImage.url ? (
                            <img 
                                src={overlayImage.url} 
                                className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
                                alt="Preview"
                                referrerPolicy="no-referrer"
                            />
                        ) : (
                            <div className="flex flex-col items-center gap-4 text-white/20">
                                <UserX className="w-24 h-24" />
                                <p className="font-black uppercase tracking-widest">No Image Available</p>
                            </div>
                        )}
                    </div>

                    <input 
                        type="file" 
                        ref={overlayInputRef} 
                        className="hidden" 
                        accept="image/*" 
                        onChange={(e) => handleFileUpload(e, 'OVERLAY')}
                    />
                </div>
            )}
            {/* PDF Generation Overlay */}
            {isGeneratingPDF && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[3rem] p-12 max-w-md w-full text-center space-y-8 shadow-2xl">
                        <div className="relative inline-block">
                            <div className="w-32 h-32 rounded-full border-4 border-gray-100 flex items-center justify-center">
                                <FileDown className="w-12 h-12 text-blue-600 animate-bounce" />
                            </div>
                            <svg className="absolute inset-0 w-32 h-32 -rotate-90">
                                <circle
                                    cx="64"
                                    cy="64"
                                    r="60"
                                    fill="none"
                                    stroke="#3b82f6"
                                    strokeWidth="8"
                                    strokeDasharray={2 * Math.PI * 60}
                                    strokeDashoffset={2 * Math.PI * 60 * (1 - pdfProgress / 100)}
                                    className="transition-all duration-300"
                                />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">Forging PDF Registry</h3>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">Processing {registrations.length} Warriors...</p>
                        </div>
                        <div className="bg-gray-50 rounded-2xl p-4">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-blue-600 mb-2">
                                <span>Progress</span>
                                <span>{pdfProgress}%</span>
                            </div>
                            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-blue-600 transition-all duration-300"
                                    style={{ width: `${pdfProgress}%` }}
                                />
                            </div>
                        </div>
                        <button 
                            onClick={() => {
                                isPdfCancelled.current = true;
                            }}
                            className="w-full py-4 rounded-2xl bg-gray-100 text-gray-400 text-xs font-black uppercase tracking-[0.2em] hover:bg-red-50 hover:text-red-500 transition-all active:scale-95"
                        >
                            Cancel Export
                        </button>
                    </div>
                </div>
            )}

            {/* NOTIFICATION BANNER */}
            {notification && (
                <div className={`fixed top-4 right-4 z-[300] p-4 rounded-lg shadow-2xl border flex items-center gap-3 max-w-md animate-in fade-in slide-in-from-top-4 duration-300 ${notification.type === 'error' ? 'bg-red-900 border-red-500 text-white' : 'bg-green-900 border-green-500 text-white'}`}>
                    {notification.type === 'error' ? <XCircle className="w-5 h-5 text-red-400" /> : <CheckCircle className="w-5 h-5 text-green-400" />}
                    <span className="text-sm font-bold">{notification.message}</span>
                    <button onClick={() => setNotification(null)} className="ml-auto hover:text-gray-300"><X className="w-4 h-4"/></button>
                </div>
            )}

            {/* CUSTOM CONFIRMATION MODAL */}
            {confirmAction && (
                <div className="fixed inset-0 z-[310] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className={`rounded-3xl p-8 max-w-sm w-full shadow-2xl border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-100'}`}>
                        <div className={`flex items-center gap-4 mb-6 ${isDark ? 'text-accent' : 'text-amber-500'}`}>
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDark ? 'bg-accent/10' : 'bg-amber-50'}`}>
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <h3 className={`text-xl font-black uppercase tracking-tighter ${isDark ? 'text-white' : 'text-gray-800'}`}>{confirmAction.title}</h3>
                        </div>
                        <p className={`text-sm font-bold mb-8 leading-relaxed ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>{confirmAction.message}</p>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setConfirmAction(null)}
                                className={`flex-1 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-500' : 'bg-gray-100 hover:bg-gray-200 text-gray-400'}`}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmAction.onConfirm}
                                className={`flex-1 py-4 rounded-2xl text-white text-xs font-black uppercase tracking-widest transition-all shadow-lg bg-accent text-primary shadow-accent/20 hover:bg-white`}
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuctionManage;