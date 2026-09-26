
import React, { createContext, useState, useEffect, useContext, useMemo } from 'react';
import { AuctionContextType, AuctionState, UserProfile, Team, Player, RegisteredPlayer, AuctionStatus, BiddingStatus, AdminViewOverride, BidIncrementSlab, UserRole, SponsorConfig, AuctionLog, TradeRecord } from '../types';
import { db, auth } from '../firebase';
import firebase from 'firebase/compat/app';
import { calculateMaxBid, getEffectiveBasePrice, safeSaveAuctionDocument } from '../utils';

// Initial State
const initialState: AuctionState = {
    players: [],
    teams: [],
    unsoldPlayers: [],
    categories: [],
    roles: [],
    status: AuctionStatus.NotStarted,
    currentPlayerId: null,
    currentPlayerIndex: null,
    currentBid: null,
    highestBidder: null,
    highestBidderId: null,
    timer: 0,
    bidIncrement: 0,
    bidSlabs: [],
    auctionLog: [],
    registrations: [],
    biddingStatus: 'PAUSED',
    playerSelectionMode: 'MANUAL',
    auctionLogoUrl: '',
    tournamentName: '',
    sponsors: [],
    sponsorConfig: { showOnOBS: false, showOnProjector: false, loopInterval: 5 },
    projectorLayout: 'STANDARD',
    obsLayout: 'STANDARD',
    adminViewOverride: null,
    maxPlayersPerTeam: 25,
    systemLogoUrl: '',
    systemTagline: 'Your streaming partner',
    successAdPosterUrl: '',
    isAdPosterEnabled: true,
    isPaid: false,
    basePrice: 0,
    globalJerseyUrl: '',
    globalJerseyOverlayUrl: '',
    defaultRetentionDays: 30
};

export const AuctionContext = createContext<AuctionContextType | null>(null);

export const AuctionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, setState] = useState<AuctionState>(initialState);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [activeAuctionId, setActiveAuctionId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFirestoreError = (error: any, operationType: string, path: string | null) => {
        const errInfo = {
            error: error instanceof Error ? error.message : String(error),
            authInfo: {
                userId: auth.currentUser?.uid,
                email: auth.currentUser?.email,
                emailVerified: auth.currentUser?.emailVerified,
                isAnonymous: auth.currentUser?.isAnonymous
            },
            operationType,
            path
        };
        console.error('Firestore Error: ', JSON.stringify(errInfo));
    };

    // Global Settings Listener
    useEffect(() => {
        const path = 'appConfig/globalSettings';
        const unsub = db.collection('appConfig').doc('globalSettings').onSnapshot(doc => {
            if (doc.exists) {
                const data = doc.data();
                setState(prev => ({ 
                    ...prev, 
                    systemLogoUrl: data?.systemLogoUrl || '',
                    systemTagline: data?.systemTagline || 'Your streaming partner',
                    successAdPosterUrl: data?.successAdPosterUrl || '',
                    isAdPosterEnabled: data?.isAdPosterEnabled !== undefined ? data.isAdPosterEnabled : true,
                    hideScoringSection: data?.hideScoringSection || false,
                    globalJerseyUrl: data?.globalJerseyUrl || '',
                    globalJerseyOverlayUrl: data?.globalJerseyOverlayUrl || '',
                    defaultRetentionDays: data?.defaultRetentionDays || 30
                }));
            } else {
                // If it doesn't exist, we fallback to defaults but don't error
                console.warn(`SM SPORTS: ${path} document not found. Using defaults.`);
            }
        }, err => {
            handleFirestoreError(err, 'GET', path);
            // Non-fatal warning if global settings fail. We use defaults in state.
            console.warn(`SM SPORTS: Could not load ${path}. Using internal defaults. Check Firestore rules if this is unintended.`);
        });
        return () => unsub();
    }, []);

    // Auth & User Profile Listener
    useEffect(() => {
        let profileUnsub: () => void = () => {};

        const authUnsub = auth.onAuthStateChanged(async (user) => {
            if (user) {
                profileUnsub();
                if (user.isAnonymous) {
                    const teamSession = localStorage.getItem('sm_sports_team_session');
                    const staffSession = localStorage.getItem('sm_sports_staff_session');

                    if (teamSession) {
                        const data = JSON.parse(teamSession);
                        setUserProfile({
                            uid: user.uid,
                            email: 'team@smsports.com',
                            role: UserRole.TEAM_OWNER,
                            teamId: data.teamId
                        });
                        if (data.auctionId) joinAuction(data.auctionId);
                    } else if (staffSession) {
                        const data = JSON.parse(staffSession);
                        // FETCH STAFF PROFILE: Ensure they are treated as STAFF in the OS
                        profileUnsub = db.collection('users').doc(data.uid).onSnapshot(doc => {
                            if (doc.exists) {
                                const s = doc.data();
                                setUserProfile({
                                    uid: data.uid, // Use the actual user registry UID
                                    email: s?.email || data.email,
                                    name: s?.name || 'Support Node',
                                    role: s?.role || UserRole.SUPPORT
                                });
                            } else {
                                // Fallback for quick sessions
                                setUserProfile({
                                    uid: user.uid,
                                    email: data.email,
                                    name: 'Support Agent',
                                    role: UserRole.SUPPORT
                                });
                            }
                        }, err => {
                            handleFirestoreError(err, 'GET', `users/${data.uid}`);
                            console.error("Staff Profile Listener Error:", err);
                        });
                    } else {
                        setUserProfile({ uid: user.uid, email: 'viewer@smsports.com', role: UserRole.VIEWER });
                    }
                } else {
                    const SUPER_ADMIN_EMAILS = ['info.digitalmount@gmail.com', 'mezabiullakhan@gmail.com', 'zabiullakhanofficial@gmail.com'];
                    const isSuperAdminAccount = user.email && SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase());

                    profileUnsub = db.collection('users').doc(user.uid).onSnapshot(doc => {
                        const userData = doc.data();
                        const isGlobalAdmin = isSuperAdminAccount || userData?.role === UserRole.SUPER_ADMIN;
                        
                        const profile: UserProfile = {
                            uid: user.uid,
                            email: user.email || '',
                            name: user.displayName || userData?.name || 'System Operator',
                            role: isGlobalAdmin ? UserRole.SUPER_ADMIN : (userData?.role || UserRole.ADMIN),
                            teamId: userData?.teamId,
                            plan: userData?.plan || { type: 'FREE', maxTeams: 2, maxAuctions: 1 }
                        };
                        setUserProfile(profile);
                    }, err => {
                        handleFirestoreError(err, 'GET', `users/${user.uid}`);
                        console.error("User Profile Listener Error:", err);
                        
                        // GRACEFUL FAIL: If profile fetch fails but they are a hardcoded admin, allow them in.
                        if (isSuperAdminAccount) {
                            console.warn("SM SPORTS: Profile fetch failed, but admin email detected. Granting emergency access.");
                            setUserProfile({
                                uid: user.uid,
                                email: user.email || '',
                                name: user.displayName || 'System Admin',
                                role: UserRole.SUPER_ADMIN,
                                plan: { type: 'ENTERPRISE', maxTeams: 100, maxAuctions: 100 }
                            });
                        } else {
                            // Non-admin fail: provide a basic viewer profile so they aren't stuck on the loader
                            setUserProfile({
                                uid: user.uid,
                                email: user.email || '',
                                name: user.displayName || 'Guest User',
                                role: UserRole.VIEWER
                            });
                        }
                    });
                }
            } else {
                profileUnsub();
                setUserProfile(null);
            }
        });
        return () => { authUnsub(); profileUnsub(); };
    }, []);

    // Auction Listener
    useEffect(() => {
        if (!activeAuctionId) return;

        const unsubscribe = db.collection('auctions').doc(activeAuctionId).onSnapshot((doc) => {
            if (doc.exists) {
                const data = doc.data();
                if (data) {
                    setState(prev => {
                        const highestBidderId = (data.highestBidderId !== undefined) ? data.highestBidderId : (data.highestBidder?.id || null);
                        return {
                            ...prev,
                            ...data,
                            highestBidderId,
                            registrationConfig: data.registrationConfig,
                            bidSlabs: data.slabs || [],
                            tournamentName: data.title || prev.tournamentName,
                            auctionLogoUrl: data.logoUrl || prev.auctionLogoUrl,
                            sponsorConfig: data.sponsorConfig || prev.sponsorConfig || { showOnOBS: false, showOnProjector: false, loopInterval: 5 },
                            maxPlayersPerTeam: data.playersPerTeam || 25,
                            isPaid: data.isPaid || false,
                            createdBy: data.createdBy || ''
                        };
                    });
                }
            } else {
                setError("Auction not found");
            }
        }, (err) => {
            console.error("Auction Listener Error", err);
            setError(err.message);
        });

        const unsubTeams = db.collection('auctions').doc(activeAuctionId).collection('teams').onSnapshot(snap => {
            const teams = snap.docs.map(d => {
                const data = d.data();
                return { id: d.id, ...data, players: data.players || [] } as Team;
            });
            setState(prev => ({ ...prev, teams }));
        }, err => {
            console.error("Teams Listener Error:", err);
        });

        const unsubPlayers = db.collection('auctions').doc(activeAuctionId).collection('players').onSnapshot(snap => {
            const allPlayers = snap.docs.map(d => ({ id: d.id, ...d.data() } as Player));
            setState(prev => ({ ...prev, players: allPlayers }));
        }, err => {
            console.error("Players Listener Error:", err);
        });

        const unsubRegistrations = db.collection('auctions').doc(activeAuctionId).collection('registrations').onSnapshot(snap => {
            const regs = snap.docs.map(d => ({ id: d.id, ...d.data() } as RegisteredPlayer));
            setState(prev => ({ ...prev, registrations: regs }));
        }, err => {
            console.error("Registrations Listener Error:", err);
        });
        
        const unsubCategories = db.collection('auctions').doc(activeAuctionId).collection('categories').onSnapshot(snap => {
             const categories = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
             setState(prev => ({ ...prev, categories }));
        }, err => {
            console.error("Categories Listener Error:", err);
        });

        const unsubSponsors = db.collection('auctions').doc(activeAuctionId).collection('sponsors').onSnapshot(snap => {
             const sponsors = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
             setState(prev => ({ ...prev, sponsors }));
        }, err => {
            console.error("Sponsors Listener Error:", err);
        });

    // 1. ADD SUBCONTENT LISTENER FOR LOGS
    const unsubLogs = db.collection('auctions').doc(activeAuctionId).collection('auctionLogs')
        .orderBy('timestamp', 'desc')
        .limit(30) // Only keep last 30 for performance
        .onSnapshot(snap => {
            const logs = snap.docs.map(d => ({ id: d.id, ...d.data() } as AuctionLog));
            setState(prev => ({ ...prev, auctionLog: logs }));
        }, err => {
            console.error("Logs Listener Error:", err);
        });

    return () => {
        unsubscribe();
        unsubTeams();
        unsubPlayers();
        unsubRegistrations();
        unsubCategories();
        unsubSponsors();
        unsubLogs();
    };
}, [activeAuctionId]);

// 1.5. Auto-Completion Check
useEffect(() => {
    if (!activeAuctionId || state.status === AuctionStatus.Finished || state.status === AuctionStatus.NotStarted) return;
    
    // Check if any players are still available in the pool (neither SOLD nor UNSOLD)
    const available = state.players.filter(p => !p.status || (p.status !== 'SOLD' && p.status !== 'UNSOLD'));
    
    // If no players left in pool AND no player currently active on the bidding floor
    if (available.length === 0 && state.players.length > 0 && !state.currentPlayerId) {
        console.log("🏁 SM SPORTS: All players processed. Auto-completing auction...");
        db.collection('auctions').doc(activeAuctionId).update({ status: AuctionStatus.Finished })
            .catch(e => console.error("Auto end error:", e));
    }
}, [state.players, state.status, activeAuctionId, state.currentPlayerId]);

// 2. Bulky Field Cleanup (AGGRESSIVE PRUNING)
useEffect(() => {
    if (!activeAuctionId || !userProfile || (userProfile.role !== UserRole.ADMIN && userProfile.role !== UserRole.SUPER_ADMIN)) return;

    const performAggressiveCleanup = async () => {
        try {
            const auctionRef = db.collection('auctions').doc(activeAuctionId);
            const doc = await auctionRef.get();
            if (!doc.exists) return;
            const data = doc.data();
            if (!data) return;

            const bulkyFields = ['players', 'teams', 'auctionLog', 'unsoldPlayers', 'registrations'];
            let needsCleanup = false;
            bulkyFields.forEach(f => { if (data[f] !== undefined) needsCleanup = true; });

            // If we find any bulky field, use a transaction to REWRITE the entire document with only safe fields.
            // This is necessary because if a document is already over the 1MB limit, standard updates might fail.
            // A transaction.set() replaces the whole document, reducing its size immediately.
            if (needsCleanup) {
                console.log("🚀 SM SPORTS: Bulky data detected in main document. Initiating emergency size reduction...");
                await db.runTransaction(async (transaction) => {
                    const freshDoc = await transaction.get(auctionRef);
                    const freshData = freshDoc.data() || {};
                    
                    // Whitelist only safe, non-bulky fields
                    const cleanData: any = {};
                    const safeFields = [
                        'title', 'status', 'currentPlayerId', 'currentBid', 'highestBidderId', 
                        'timer', 'bidIncrement', 'slabs', 'registrationConfig', 'logoUrl',
                        'tournamentName', 'fullTournamentName', 'season', 'date', 'matchesDate',
                        'sport', 'venue', 'eventVenue', 'purseValue', 'basePrice', 'playersPerTeam',
                        'totalTeams', 'dateTBD', 'unlimitedPurse', 'autoReserveFunds', 'isPaid',
                        'planId', 'autoDeleteAt', 'isLifetime', 'hideScoringSection', 'createdBy',
                        'sponsorConfig', 'projectorLayout', 'obsLayout', 'adminViewOverride',
                        'biddingStatus', 'playerSelectionMode', 'auctionLogoUrl'
                    ];

                    safeFields.forEach(field => {
                        if (freshData[field] !== undefined) {
                            cleanData[field] = freshData[field];
                        }
                    });

                    // Ensure highestBidder object is gone
                    if (cleanData.highestBidder) delete cleanData.highestBidder;

                    transaction.set(auctionRef, cleanData);
                    console.log("✅ SM SPORTS: Auction document size reduced successfully.");
                });
            }
        } catch (e) {
            console.error("Critical Cleanup Error:", e);
        }
    };
    
    const timer = setTimeout(performAggressiveCleanup, 2000);
    return () => clearTimeout(timer);
}, [activeAuctionId, userProfile]);

const addLog = async (log: Omit<AuctionLog, 'id'>) => {
        if (!activeAuctionId) return;
        try {
            await db.collection('auctions').doc(activeAuctionId).collection('auctionLogs').add(log);
        } catch (err) {
            console.error("Error adding log:", err);
        }
    };

    const joinAuction = (id: string) => {
        setActiveAuctionId(id);
    };

    const logout = async () => {
        await auth.signOut();
        localStorage.removeItem('sm_sports_team_session');
        localStorage.removeItem('sm_sports_staff_session');
        setUserProfile(null);
        setActiveAuctionId(null);
        setState(initialState);
    };

    const derivedUnsoldPlayers = useMemo(() => {
        return state.players.filter(p => p.status !== 'SOLD' && p.status !== 'UNSOLD');
    }, [state.players]);

    const derivedCurrentPlayerIndex = useMemo(() => {
        if (!state.currentPlayerId || derivedUnsoldPlayers.length === 0) return null;
        const idx = derivedUnsoldPlayers.findIndex(p => String(p.id) === String(state.currentPlayerId));
        return idx !== -1 ? idx : null;
    }, [state.currentPlayerId, derivedUnsoldPlayers]);

    const derivedHighestBidder = useMemo(() => {
        if (!state.highestBidderId) return null;
        return state.teams.find(t => String(t.id) === String(state.highestBidderId)) || null;
    }, [state.highestBidderId, state.teams]);

    const activeState = useMemo(() => ({
        ...state,
        unsoldPlayers: derivedUnsoldPlayers,
        currentPlayerIndex: derivedCurrentPlayerIndex,
        highestBidder: derivedHighestBidder
    }), [state, derivedUnsoldPlayers, derivedCurrentPlayerIndex, derivedHighestBidder]);

    const nextBid = useMemo(() => {
        const { currentPlayerId, players, currentBid, bidIncrement, bidSlabs, categories } = state;
        const currentPlayer = players.find(p => String(p.id) === String(currentPlayerId));
        if (!currentPlayer) return 0;

        const basePrice = getEffectiveBasePrice(currentPlayer, categories);
        const currentPrice = Number(currentBid) || 0;

        // 1. Initial Bid (No bids yet)
        if (currentPrice === 0) {
            // If basePrice is 0, use bidIncrement or default to 100
            return basePrice > 0 ? basePrice : (Number(bidIncrement) || 100);
        }

        // 2. Subsequent Bids
        // Priority 1: Category Specific Slabs
        if (currentPlayer.category) {
            const cat = categories.find(c => c.name === currentPlayer.category);
            if (cat && cat.slabs && cat.slabs.length > 0) {
                 const sortedSlabs = [...cat.slabs].sort((a, b) => Number(b.from) - Number(a.from));
                 const activeSlab = sortedSlabs.find(s => currentPrice >= Number(s.from));
                 if (activeSlab) return currentPrice + Number(activeSlab.increment);
            }
        }

        // Priority 2: Global Slabs
        if (bidSlabs && bidSlabs.length > 0) {
            const sortedSlabs = [...bidSlabs].sort((a, b) => Number(b.from) - Number(a.from));
            const activeSlab = sortedSlabs.find(s => currentPrice >= Number(s.from));
            if (activeSlab) return currentPrice + Number(activeSlab.increment);
        }

        // Priority 3: Default Increment
        const increment = Number(bidIncrement) || 100;
        return currentPrice + increment;
    }, [state.currentBid, state.currentPlayerId, state.players, state.bidIncrement, state.bidSlabs, state.categories]);

    const placeBid = async (teamId: string | number, amount: number) => {
        if (!activeAuctionId) return;
        const team = state.teams.find(t => String(t.id) === String(teamId));
        if (!team) throw new Error("Team not found");
        
        const currentPlayer = state.players.find(p => String(p.id) === String(state.currentPlayerId));
        if (currentPlayer) {
            if (!state.unlimitedPurse) {
                const result = calculateMaxBid(team, state, currentPlayer);

                if (!result.allowBid || amount > result.maxBid) {
                    throw new Error(
                        result.reason || `Insufficient purse to complete squad. You must reserve ₹${Math.floor(result.reservedFunds)} for the remaining ${result.remainingSlots} players.`
                    );
                }
            }
        }

        const log = { message: `${team.name} bid ${amount}`, timestamp: Date.now(), type: 'BID' as const };
        // Don't await log write to keep UI responsive
        db.collection('auctions').doc(activeAuctionId).collection('auctionLogs').add(log).catch(e => console.error("Log error", e));

        await db.collection('auctions').doc(activeAuctionId).update({
            currentBid: amount, 
            highestBidderId: team.id, 
            timer: 10
        });
    };

    const sellPlayer = async (teamId?: string | number, customPrice?: number) => {
        if (!activeAuctionId || !state.currentPlayerId) return;
        const finalTeam = teamId ? state.teams.find(t => String(t.id) === String(teamId)) : state.highestBidder;
        const finalPrice = customPrice !== undefined ? customPrice : (state.currentBid || 0);
        if (!finalTeam) throw new Error("No team selected to sell to");
        const player = state.players.find(p => String(p.id) === String(state.currentPlayerId));
        if (!player) return;

        // Reserve Check for Admin Sale
        if (!state.unlimitedPurse) {
            const result = calculateMaxBid(finalTeam, state, player);
            if (!result.allowBid || finalPrice > result.maxBid) {
                throw new Error(result.reason || `Cannot sell: Team needs ₹${Math.floor(result.reservedFunds)} in reserve to buy remaining ${result.remainingSlots} players.`);
            }
        }

        await db.runTransaction(async (transaction) => {
            const auctionRef = db.collection('auctions').doc(activeAuctionId);
            const playerRef = auctionRef.collection('players').doc(String(player.id));
            const teamRef = auctionRef.collection('teams').doc(String(finalTeam.id));
            const teamDoc = await transaction.get(teamRef);
            if (!teamDoc.exists) throw new Error("Target team document does not exist");
            const teamData = teamDoc.data() as Team;
            const currentPlayers = teamData.players || [];
            const currentBudget = teamData.budget || 0;
            transaction.update(playerRef, { status: 'SOLD', soldPrice: finalPrice, soldTo: finalTeam.name });
            
            // OPTIMIZATION: Store only essential data in the team's player list to save space
            const minimalPlayerData = { 
                id: player.id, 
                name: player.name, 
                role: player.role,
                category: player.category,
                soldPrice: finalPrice, 
                soldTo: finalTeam.name,
                status: 'SOLD'
            };
            const updatedPlayers = [...currentPlayers, minimalPlayerData];
            const newBudget = currentBudget - finalPrice;
            transaction.update(teamRef, { budget: newBudget, players: updatedPlayers });
            const log = { message: `${player.name} SOLD to ${finalTeam.name} for ${finalPrice}`, timestamp: Date.now(), type: 'SOLD' as const };
            const logRef = auctionRef.collection('auctionLogs').doc();
            transaction.set(logRef, log);
            transaction.update(auctionRef, { 
                status: AuctionStatus.Sold, 
                currentBid: finalPrice, 
                highestBidderId: finalTeam.id 
            });
        });
    };

    const passPlayer = async () => {
        if (!activeAuctionId || !state.currentPlayerId) return;
        const player = state.players.find(p => String(p.id) === String(state.currentPlayerId));
        if (!player) return;
        await db.collection('auctions').doc(activeAuctionId).collection('players').doc(String(player.id)).update({ status: 'UNSOLD' });
        const log = { message: `${player.name} UNSOLD`, timestamp: Date.now(), type: 'UNSOLD' as const };
        await db.collection('auctions').doc(activeAuctionId).update({ status: AuctionStatus.Unsold });
        await addLog(log);
    };

    const startAuction = async (specificPlayerId?: string | number) => {
        if (!activeAuctionId) return false;

        // Block start if free tier and more than 2 teams exist without paid plan
        const hasPaidPlan = state.isPaid === true || userProfile?.role === UserRole.SUPER_ADMIN || (userProfile?.plan && userProfile.plan.type !== 'FREE');
        if (!hasPaidPlan && state.teams.length > 2) {
            console.warn("Auction cannot be started: Free plan is limited to 2 teams. You currently have " + state.teams.length + " teams. Please purchase a plan.");
            return false;
        }

        let nextPlayerId = specificPlayerId;
        if (!nextPlayerId) {
            const available = state.players.filter(p => p.status !== 'SOLD' && p.status !== 'UNSOLD');
            if (available.length === 0) return false;
            const next = available[Math.floor(Math.random() * available.length)];
            nextPlayerId = next.id;
        }
        if (!nextPlayerId) return false;
        const player = state.players.find(p => String(p.id) === String(nextPlayerId));
        const startLog = { message: `Bidding started for ${player?.name}`, timestamp: Date.now(), type: 'SYSTEM' as const };
        await db.collection('auctions').doc(activeAuctionId).update({
            currentPlayerId: nextPlayerId, currentBid: 0, highestBidderId: null, status: AuctionStatus.InProgress, timer: 10
        });
        await addLog(startLog);
        return true;
    };

    const undoPlayerSelection = async () => {
        if (!activeAuctionId) return;
        await db.collection('auctions').doc(activeAuctionId).update({ currentPlayerId: null, currentBid: 0, highestBidderId: null, status: AuctionStatus.NotStarted });
    };

    const resetCurrentPlayer = async () => {
        if (!activeAuctionId || !state.currentPlayerId) return;
        await db.collection('auctions').doc(activeAuctionId).update({ 
            currentBid: 0, 
            highestBidderId: null, 
            timer: 10, 
            status: AuctionStatus.InProgress 
        });
    };

    const endAuction = async () => {
        if (!activeAuctionId) return;
        await db.collection('auctions').doc(activeAuctionId).update({ status: AuctionStatus.Finished, currentPlayerId: null });
    };

    const resetAuction = async () => {
        if (!activeAuctionId) return;
        const auctionRef = db.collection('auctions').doc(activeAuctionId);
        const auctionSnap = await auctionRef.get();
        if (!auctionSnap.exists) return;
        const defaultPurse = auctionSnap.data()?.purseValue || 10000;
        const playersSnap = await auctionRef.collection('players').get();
        const teamsSnap = await auctionRef.collection('teams').get();
        const modifiedPlayers = playersSnap.docs.filter(d => { const data = d.data(); return data.status !== undefined || data.soldPrice !== undefined || data.soldTo !== undefined; });
        const batchSize = 300;
        const allDocs = [ ...modifiedPlayers.map(d => ({ type: 'PLAYER', ref: d.ref })), ...teamsSnap.docs.map(d => ({ type: 'TEAM', ref: d.ref })) ];
        for (let i = 0; i < allDocs.length; i += batchSize) {
            const batch = db.batch();
            const chunk = allDocs.slice(i, i + batchSize);
            chunk.forEach(item => {
                if (item.type === 'PLAYER') { batch.update(item.ref, { status: firebase.firestore.FieldValue.delete(), soldPrice: firebase.firestore.FieldValue.delete(), soldTo: firebase.firestore.FieldValue.delete() }); }
                else { batch.update(item.ref, { budget: defaultPurse, players: [] }); }
            });
            if (i === 0) { 
                batch.update(auctionRef, { 
                    status: AuctionStatus.NotStarted, 
                    currentPlayerId: null, 
                    currentBid: 0, 
                    highestBidderId: null, 
                    timer: 0 
                }); 
            }
            await batch.commit();
            
            // Delete logs in chunks
            const logsSnap = await auctionRef.collection('auctionLogs').get();
            for (let j = 0; j < logsSnap.docs.length; j += batchSize) {
                const logBatch = db.batch();
                logsSnap.docs.slice(j, j + batchSize).forEach(doc => logBatch.delete(doc.ref));
                await logBatch.commit();
            }

            await new Promise(resolve => setTimeout(resolve, 200));
        }
    };

    const resetUnsoldPlayers = async () => {
        if (!activeAuctionId) return;
        const unsold = state.players.filter(p => p.status === 'UNSOLD');
        const batchSize = 300;
        for (let i = 0; i < unsold.length; i += batchSize) {
             const batch = db.batch();
             const chunk = unsold.slice(i, i + batchSize);
             chunk.forEach(p => {
                 const ref = db.collection('auctions').doc(activeAuctionId).collection('players').doc(String(p.id));
                 batch.update(ref, { status: firebase.firestore.FieldValue.delete() });
             });
             await batch.commit();
        }
    };

    const updateBiddingStatus = async (status: BiddingStatus) => {
        if (!activeAuctionId) return;
        await db.collection('auctions').doc(activeAuctionId).update({ biddingStatus: status });
    };

    const updateSponsorConfig = async (config: SponsorConfig) => {
        if (!activeAuctionId) return;
        await db.collection('auctions').doc(activeAuctionId).update({ sponsorConfig: config });
    };

    const toggleSelectionMode = async () => {
        if (!activeAuctionId) return;
        const newMode = state.playerSelectionMode === 'MANUAL' ? 'AUTO' : 'MANUAL';
        await db.collection('auctions').doc(activeAuctionId).update({ playerSelectionMode: newMode });
    };

    const updateTheme = async (type: 'PROJECTOR' | 'OBS', layout: string) => {
        if (!activeAuctionId) return;
        const field = type === 'PROJECTOR' ? 'projectorLayout' : 'obsLayout';
        await db.collection('auctions').doc(activeAuctionId).update({ [field]: layout });
    };

    const setAdminView = async (view: AdminViewOverride | null) => {
        if (!activeAuctionId) return;
        await db.collection('auctions').doc(activeAuctionId).update({ adminViewOverride: view });
    };

    const initiateTrade = async (trade: Omit<TradeRecord, 'processedAt' | 'processedBy'>) => {
        if (!activeAuctionId) return;
        const tradeId = db.collection('auctions').doc(activeAuctionId).collection('trades').doc().id;
        
        const tradeLog: TradeRecord = {
            ...trade,
            id: tradeId,
            createdAt: Date.now()
        };

        await db.collection('auctions').doc(activeAuctionId).collection('trades').doc(tradeId).set(tradeLog);
        
        if (trade.status === 'APPROVED') {
            // Direct Execution
            await processTrade(tradeId, 'APPROVE');
        } else {
            await addLog({
                message: `TRADE PROPOSED: Between Teams`,
                timestamp: Date.now(),
                type: 'TRADE'
            });
        }
    };

    const processTrade = async (tradeId: string, action: 'APPROVE' | 'REJECT') => {
        if (!activeAuctionId) return;
        const auctionRef = db.collection('auctions').doc(activeAuctionId);
        const tradeRef = auctionRef.collection('trades').doc(tradeId);

        if (action === 'REJECT') {
            await tradeRef.update({
                status: 'REJECTED',
                processedAt: Date.now(),
                processedBy: userProfile?.uid || 'system'
            });
            return;
        }

        await db.runTransaction(async (t) => {
            const tradeDoc = await t.get(tradeRef);
            if (!tradeDoc.exists) throw new Error("Trade record not found.");
            const trade = tradeDoc.data() as TradeRecord;
            if (trade.status !== 'PENDING' && trade.status !== 'APPROVED') throw new Error("Trade already processed.");

            const team1Ref = auctionRef.collection('teams').doc(trade.team1Id);
            const team2Ref = auctionRef.collection('teams').doc(trade.team2Id);
            
            const [t1Doc, t2Doc] = await Promise.all([t.get(team1Ref), t.get(team2Ref)]);
            if (!t1Doc.exists || !t2Doc.exists) throw new Error("One or both teams not found.");

            const t1Data = t1Doc.data() as Team;
            const t2Data = t2Doc.data() as Team;

            if (trade.cashAmount > 0 && t1Data.budget < trade.cashAmount && !state.unlimitedPurse) {
                throw new Error(`Insufficient budget for ${t1Data.name}.`);
            }
            if (trade.cashAmount < 0 && t2Data.budget < Math.abs(trade.cashAmount) && !state.unlimitedPurse) {
                throw new Error(`Insufficient budget for ${t2Data.name}.`);
            }

            const t1ToT2Players = (t1Data.players || []).filter(p => trade.team1PlayerIds.includes(String(p.id)));
            const t2ToT1Players = (t2Data.players || []).filter(p => trade.team2PlayerIds.includes(String(p.id)));

            t1ToT2Players.forEach(p => {
                const pRef = auctionRef.collection('players').doc(String(p.id));
                t.update(pRef, { 
                    soldTo: t2Data.name,
                    isTraded: true,
                    status: 'TRADED'
                });
            });
            t2ToT1Players.forEach(p => {
                const pRef = auctionRef.collection('players').doc(String(p.id));
                t.update(pRef, { 
                    soldTo: t1Data.name,
                    isTraded: true,
                    status: 'TRADED'
                });
            });

            const newT1Players = (t1Data.players || []).filter(p => !trade.team1PlayerIds.includes(String(p.id)));
            t2ToT1Players.forEach(p => {
                newT1Players.push({
                    ...p,
                    soldTo: t1Data.name,
                    status: 'TRADED',
                    isTraded: true
                });
            });
            const newT1Budget = t1Data.budget - trade.cashAmount;

            const newT2Players = (t2Data.players || []).filter(p => !trade.team2PlayerIds.includes(String(p.id)));
            t1ToT2Players.forEach(p => {
                newT2Players.push({
                    ...p,
                    soldTo: t2Data.name,
                    status: 'TRADED',
                    isTraded: true
                });
            });
            const newT2Budget = t2Data.budget + trade.cashAmount;

            t.update(team1Ref, { players: newT1Players, budget: newT1Budget });
            t.update(team2Ref, { players: newT2Players, budget: newT2Budget });

            t.update(tradeRef, {
                status: 'APPROVED',
                processedAt: Date.now(),
                processedBy: userProfile?.uid || 'system'
            });

            const systemLog: Omit<AuctionLog, 'id'> = {
                message: `TRADE APPROVED: ${t1Data.name} <-> ${t2Data.name}`,
                timestamp: Date.now(),
                type: 'TRADE'
            };
            t.set(auctionRef.collection('auctionLogs').doc(), systemLog);
        });
    };

    const correctPlayerSale = async (playerId: string, newTeamId: string | null, newPrice: number) => {
        if (!activeAuctionId) return;
        const auctionRef = db.collection('auctions').doc(activeAuctionId);
        await db.runTransaction(async (t) => {
            const playerRef = auctionRef.collection('players').doc(playerId);
            const playerDoc = await t.get(playerRef);
            const playerData = playerDoc.data() as Player;
            if (playerData.status === 'SOLD' && playerData.soldTo) {
                const prevTeam = state.teams.find(tm => tm.name === playerData.soldTo);
                if (prevTeam) {
                    const prevTeamRef = auctionRef.collection('teams').doc(String(prevTeam.id));
                    const prevTeamDoc = await t.get(prevTeamRef);
                    if (prevTeamDoc.exists) {
                        const ptData = prevTeamDoc.data() as Team;
                        const refund = playerData.soldPrice || 0;
                        t.update(prevTeamRef, { budget: (ptData.budget || 0) + refund, players: (ptData.players || []).filter(p => String(p.id) !== playerId) });
                    }
                }
            }
            if (newTeamId) {
                const newTeamRef = auctionRef.collection('teams').doc(newTeamId);
                const newTeamDoc = await t.get(newTeamRef);
                const newTeamData = newTeamDoc.data() as Team;
                
                // OPTIMIZATION: Store only essential data
                const minimalPlayerData = { 
                    id: playerData.id, 
                    name: playerData.name, 
                    role: playerData.role,
                    category: playerData.category,
                    soldPrice: newPrice, 
                    soldTo: newTeamData.name,
                    status: 'SOLD'
                };
                
                t.update(newTeamRef, { budget: (newTeamData.budget || 0) - newPrice, players: [...(newTeamData.players || []), minimalPlayerData] });
                t.update(playerRef, { status: 'SOLD', soldPrice: newPrice, soldTo: newTeamData.name });
            } else {
                t.update(playerRef, { status: firebase.firestore.FieldValue.delete(), soldPrice: firebase.firestore.FieldValue.delete(), soldTo: firebase.firestore.FieldValue.delete() });
            }
        });
    };

    const repairAuctionDocument = async () => {
        if (!activeAuctionId) return;
        try {
            const res = await safeSaveAuctionDocument(activeAuctionId, {}, db);
            console.log(`✅ SM SPORTS: Manual Repair Successful. Clean Size: ${(res.cleanSize / 1024).toFixed(1)} KB (Pruned: ${(res.prunedBytes / 1024).toFixed(1)} KB)`);
            return true;
        } catch (e) {
            console.error("Manual Repair Error:", e);
            throw e;
        }
    };

    return (
        <AuctionContext.Provider value={{
            state: activeState, userProfile, setUserProfile, placeBid, sellPlayer, passPlayer, correctPlayerSale, initiateTrade, processTrade, startAuction, undoPlayerSelection, endAuction, resetAuction, resetCurrentPlayer, resetUnsoldPlayers, updateBiddingStatus, updateSponsorConfig, toggleSelectionMode, updateTheme, setAdminView, logout, error, joinAuction, activeAuctionId, nextBid, repairAuctionDocument
        }}>
            {children}
        </AuctionContext.Provider>
    );
};
