
import { AuctionState, Team, Player } from './types';
import heic2any from 'heic2any';
import { storage } from './firebase';

export type ImageUploadType = 
    | 'BANNER' 
    | 'POSTER' 
    | 'LOGO' 
    | 'QR' 
    | 'PROFILE' 
    | 'PAYMENT' 
    | 'REG_BANNER' 
    | 'REG_WELCOME_POSTER' 
    | 'REG_LOGO' 
    | 'MODAL' 
    | 'OVERLAY' 
    | 'GENERAL';

export interface CompressImageOptions {
    type?: ImageUploadType;
    isBanner?: boolean;
    maxWidth?: number;
    maxHeight?: number;
    maxDataUrlLength?: number;
}

/**
 * Converts a base64 Data URL to a native Blob object.
 */
export const dataUrlToBlob = (dataUrl: string): Blob => {
    try {
        const parts = dataUrl.split(',');
        const mimeMatch = parts[0]?.match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        const byteString = atob(parts[1] || '');
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        return new Blob([ab], { type: mime });
    } catch (e) {
        console.warn("dataUrlToBlob fallback:", e);
        return new Blob([], { type: 'image/jpeg' });
    }
};

export const ONE_MB_LIMIT_BYTES = 1024 * 1024; // 1 MB (1,048,576 bytes)

// Cache storage availability check so we don't repeatedly wait on a non-existent or failing bucket
let storageAvailabilityChecked = false;
let isStorageWorking = false;

/**
 * Converts a File or Blob directly to a Base64 Data URL without any modification or re-encoding.
 */
export const fileToDataUrl = (file: File | Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string) || '');
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
    });
};

/**
 * Calculates approximate binary byte size from a base64 Data URL.
 */
export const getDataUrlByteSize = (dataUrl: string): number => {
    if (!dataUrl) return 0;
    const commaIndex = dataUrl.indexOf(',');
    const base64Len = commaIndex === -1 ? dataUrl.length : dataUrl.length - (commaIndex + 1);
    return Math.floor(base64Len * 0.75);
};

/**
 * Fast check: If storage bucket isn't working or configured, skip long timeouts.
 */
const checkStorageUpload = async (fileToUpload: Blob | File, path: string): Promise<string | null> => {
    if (!storage || (storageAvailabilityChecked && !isStorageWorking)) {
        return null;
    }

    try {
        const fileRef = storage.ref(path);
        const uploadTask = fileRef.put(fileToUpload, {
            contentType: fileToUpload.type || 'image/jpeg',
            cacheControl: 'public,max-age=31536000'
        });

        // 1200ms strict timeout to avoid delaying registration forms
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => {
                try { uploadTask.cancel(); } catch (_) {}
                reject(new Error('STORAGE_TIMEOUT'));
            }, 1200);
        });

        const snapshot = await Promise.race([uploadTask, timeoutPromise]);
        const downloadUrl = await snapshot.ref.getDownloadURL();
        if (downloadUrl) {
            storageAvailabilityChecked = true;
            isStorageWorking = true;
            return downloadUrl;
        }
    } catch (err: any) {
        // Storage is not working (e.g. 404 bucket, unauthorized, timeout)
        storageAvailabilityChecked = true;
        isStorageWorking = false;
        console.warn("Storage upload bypassed/fallback to instant client data:", err?.message || err);
    }
    return null;
};

/**
 * Uploads an image/file quickly.
 * Uses client-side compression rules:
 * - If file is <= 1MB: do NOT compress.
 * - If file is > 1MB: compress to 1MB (not less).
 * If Firebase Storage is available and working, stores there. Otherwise falls back immediately to Data URL.
 */
export const uploadImageOrFallback = async (
    file: File | Blob | string,
    auctionId: string = 'general',
    category: string = 'player_photo',
    compressType: ImageUploadType = 'PROFILE'
): Promise<string> => {
    if (!file) return '';

    // If it's already an external HTTP/HTTPS URL, return as-is
    if (typeof file === 'string' && (file.startsWith('http://') || file.startsWith('https://'))) {
        return file;
    }

    // Step 1: Process file according to exact user rules:
    // If <= 1MB: do NOT compress.
    // If > 1MB: compress to 1MB (not less).
    const processedDataUrl = await compressImage(file, compressType);
    if (!processedDataUrl) return '';

    // Step 2: Try Firebase Storage if available (with strict 1.2s timeout)
    const ext = typeof file !== 'string' && (file as any).name 
        ? (file as any).name.split('.').pop()?.toLowerCase() || 'jpg' 
        : 'jpg';
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const path = `auctions/${auctionId}/registrations/${category}_${timestamp}_${random}.${ext}`;

    const uploadBlob = dataUrlToBlob(processedDataUrl);
    const storageUrl = await checkStorageUpload(uploadBlob, path);
    if (storageUrl) {
        return storageUrl;
    }

    // Step 3: Fast return of the processed Data URL
    return processedDataUrl;
};

/**
 * Image compression rules:
 * - If the image is <= 1MB (size limit): DO NOT COMPRESS IT! Return original data.
 * - If the image is > 1MB: compress it to 1MB (not less!) preserving maximum quality.
 */
export const compressImage = async (
    file: File | Blob | string, 
    typeOrOptions: ImageUploadType | CompressImageOptions | boolean = 'GENERAL'
): Promise<string> => {
    // If empty or falsy
    if (!file) return '';

    // If string that is not a data URL or blob URL (e.g. external http link)
    if (typeof file === 'string' && (file.startsWith('http://') || file.startsWith('https://'))) {
        return file;
    }

    let customMaxLen: number | undefined;
    if (typeof typeOrOptions === 'object') {
        customMaxLen = typeOrOptions.maxDataUrlLength;
    }

    const TARGET_LIMIT_BYTES = customMaxLen ? Math.floor(customMaxLen * 0.75) : ONE_MB_LIMIT_BYTES;

    // RULE 1: If string (Data URL), check size
    if (typeof file === 'string') {
        const byteSize = getDataUrlByteSize(file);
        // If already <= 1MB (or custom limit), DO NOT COMPRESS IT!
        if (byteSize <= TARGET_LIMIT_BYTES) {
            return file;
        }
    }

    // RULE 1: If File or Blob, check size
    if (typeof file !== 'string' && file && 'size' in file) {
        const fileSize = file.size;
        // If already <= 1MB, DO NOT COMPRESS IT! Keep 100% original bytes & clarity!
        if (fileSize <= TARGET_LIMIT_BYTES) {
            // Check if HEIC - only convert if browser can't render it natively
            const fileType = (file as any).type?.toLowerCase() || '';
            const fileName = (file as any).name?.toLowerCase() || '';
            if (fileType.includes('heic') || fileType.includes('heif') || fileName.endsWith('.heic') || fileName.endsWith('.heif')) {
                try {
                    const converted = await heic2any({
                        blob: file,
                        toType: 'image/jpeg',
                        quality: 0.95
                    });
                    const convertedBlob = Array.isArray(converted) ? converted[0] : converted;
                    if (convertedBlob.size <= TARGET_LIMIT_BYTES) {
                        return await fileToDataUrl(convertedBlob);
                    }
                } catch (e) {
                    console.warn("HEIC conversion fallback:", e);
                }
            } else {
                return await fileToDataUrl(file);
            }
        }
    }

    // RULE 2: If image > 1MB, compress it to 1MB (not less!)
    let processedFile: File | Blob | string = file;

    // Handle HEIC/HEIF (iOS) if present
    if (typeof file !== 'string') {
        const fileType = (file as any).type?.toLowerCase() || '';
        const fileName = (file as any).name?.toLowerCase() || '';
        if (fileType.includes('heic') || fileType.includes('heif') || fileName.endsWith('.heic') || fileName.endsWith('.heif')) {
            try {
                const converted = await heic2any({
                    blob: file,
                    toType: 'image/jpeg',
                    quality: 0.92
                });
                processedFile = Array.isArray(converted) ? converted[0] : converted;
            } catch (e) {
                console.warn("HEIC conversion fallback:", e);
            }
        }
    }

    // Load image to get natural dimensions
    const getImageDimensionsAndSource = async (src: File | Blob | string): Promise<{ source: CanvasImageSource; width: number; height: number; cleanup?: () => void } | null> => {
        // Fast path: createImageBitmap (browser off-thread hardware decoding)
        if (typeof src !== 'string' && typeof window !== 'undefined' && 'createImageBitmap' in window) {
            try {
                const bmp = await createImageBitmap(src);
                return { source: bmp, width: bmp.width, height: bmp.height, cleanup: () => bmp.close?.() };
            } catch (_) {}
        }

        return new Promise((resolve) => {
            const img = new Image();
            let objectUrl: string | null = null;
            const timeout = setTimeout(() => resolve(null), 8000);

            img.onload = () => {
                clearTimeout(timeout);
                resolve({
                    source: img,
                    width: img.naturalWidth || img.width,
                    height: img.naturalHeight || img.height,
                    cleanup: () => {
                        if (objectUrl) {
                            try { URL.revokeObjectURL(objectUrl); } catch (_) {}
                        }
                    }
                });
            };

            img.onerror = () => {
                clearTimeout(timeout);
                if (objectUrl) {
                    try { URL.revokeObjectURL(objectUrl); } catch (_) {}
                }
                resolve(null);
            };

            if (typeof src === 'string') {
                if (src.startsWith('http://') || src.startsWith('https://')) {
                    img.crossOrigin = "anonymous";
                }
                img.src = src;
            } else {
                try {
                    objectUrl = URL.createObjectURL(src);
                    img.src = objectUrl;
                } catch (e) {
                    fileToDataUrl(src).then(d => { img.src = d; }).catch(() => resolve(null));
                }
            }
        });
    };

    const loaded = await getImageDimensionsAndSource(processedFile);
    if (!loaded || loaded.width <= 0 || loaded.height <= 0) {
        if (typeof processedFile !== 'string') {
            return await fileToDataUrl(processedFile as Blob);
        }
        return typeof file === 'string' ? file : '';
    }

    const { source, width: origWidth, height: origHeight, cleanup } = loaded;

    try {
        // Preserve crystal clear resolution!
        // Allow up to 2560px (2.5K QHD), only scale down if larger.
        let width = origWidth;
        let height = origHeight;
        const MAX_DIMENSION = 2560;

        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
            if (width > height) {
                height = Math.round(height * (MAX_DIMENSION / width));
                width = MAX_DIMENSION;
            } else {
                width = Math.round(width * (MAX_DIMENSION / height));
                height = MAX_DIMENSION;
            }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(width));
        canvas.height = Math.max(1, Math.round(height));
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return typeof processedFile !== 'string' ? await fileToDataUrl(processedFile as Blob) : (file as string);
        }

        // Paint white background to prevent transparent PNG from turning black in JPEG
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

        // Compress to 1MB (not less!):
        // Target: as close to TARGET_LIMIT_BYTES (1,048,576 bytes) as possible without exceeding it!
        // Start with high quality 0.94
        let dataUrl = canvas.toDataURL('image/jpeg', 0.94);
        let byteSize = getDataUrlByteSize(dataUrl);

        if (byteSize <= TARGET_LIMIT_BYTES) {
            // Already fits at near maximum quality (not less!)
            return dataUrl;
        }

        // Binary search for highest quality that stays <= TARGET_LIMIT_BYTES (target ~1MB)
        let minQ = 0.35;
        let maxQ = 0.94;
        let bestUrl = '';
        let bestSize = 0;

        for (let iter = 0; iter < 4; iter++) {
            const midQ = (minQ + maxQ) / 2;
            const currentUrl = canvas.toDataURL('image/jpeg', midQ);
            const currentBytes = getDataUrlByteSize(currentUrl);

            if (currentBytes <= TARGET_LIMIT_BYTES) {
                if (currentBytes > bestSize) {
                    bestUrl = currentUrl;
                    bestSize = currentBytes;
                }
                // Try higher quality to get even closer to 1MB (not less!)
                minQ = midQ + 0.02;
            } else {
                maxQ = midQ - 0.02;
            }
        }

        if (bestUrl) {
            return bestUrl;
        }

        // If even at 0.35 quality it's still slightly over 1MB (very rare, huge noisy photo),
        // scale canvas slightly down (e.g. 80%) and encode at high quality 0.85 to stay right near 1MB
        const c2 = document.createElement('canvas');
        c2.width = Math.max(100, Math.round(canvas.width * 0.80));
        c2.height = Math.max(100, Math.round(canvas.height * 0.80));
        const ctx2 = c2.getContext('2d');
        if (ctx2) {
            ctx2.fillStyle = '#ffffff';
            ctx2.fillRect(0, 0, c2.width, c2.height);
            ctx2.imageSmoothingEnabled = true;
            ctx2.imageSmoothingQuality = 'high';
            ctx2.drawImage(canvas, 0, 0, c2.width, c2.height);
            const res2 = c2.toDataURL('image/jpeg', 0.85);
            if (getDataUrlByteSize(res2) <= TARGET_LIMIT_BYTES) {
                return res2;
            }
            return c2.toDataURL('image/jpeg', 0.75);
        }

        return dataUrl;
    } finally {
        cleanup?.();
    }
};



/**
 * Calculates the maximum allowed bid for a team, ensuring they have enough 
 * budget left to fill their squad up to the required minimums and total size.
 */
export const calculateMaxBid = (
    team: Team,
    state: AuctionState,
    currentPlayer: Player | null
): { 
    maxBid: number; 
    reservedFunds: number; 
    remainingSlots: number;
    allowBid: boolean;
    reason: string | null;
    categoryStatus: { name: string, current: number, min: number, reserved: number }[];
} => {
    const { 
        maxPlayersPerTeam = 25, 
        categories = [], 
        unlimitedPurse = false,
        autoReserveFunds = false,
        basePrice: globalBasePrice = 100
    } = state;

    const currentSquadCount = (team.players || []).length;
    const remainingSlotsIfBought = Math.max(0, maxPlayersPerTeam - (currentSquadCount + 1));

    if (unlimitedPurse) {
        return { 
            maxBid: Infinity, 
            reservedFunds: 0, 
            remainingSlots: remainingSlotsIfBought, 
            allowBid: true, 
            reason: null,
            categoryStatus: []
        };
    }

    // 1. Calculate Reservation
    let totalReservedFunds = 0;
    let mandatorySlotsAfterCurrent = 0;
    const categoryStatus: { name: string, current: number, min: number, reserved: number }[] = [];

    if (autoReserveFunds) {
        categories.forEach(cat => {
            const playersList = team.players || [];
            // Case-insensitive, robust matching
            const countInTeam = playersList.filter(p => p.category?.toLowerCase().trim() === cat.name?.toLowerCase().trim()).length;
            let neededForMin = Math.max(0, (cat.minPerTeam || 0) - countInTeam);

            // If current player is in this category, they help fulfill the requirement
            if (currentPlayer && currentPlayer.category?.toLowerCase().trim() === cat.name?.toLowerCase().trim()) {
                neededForMin = Math.max(0, neededForMin - 1);
            }

            const catBasePrice = (cat.basePrice !== undefined && cat.basePrice !== null) ? Number(cat.basePrice) : Number(globalBasePrice);
            const reservation = neededForMin * catBasePrice;
            
            totalReservedFunds += reservation;
            mandatorySlotsAfterCurrent += neededForMin;

            categoryStatus.push({
                name: cat.name,
                current: countInTeam + ((currentPlayer && currentPlayer.category?.toLowerCase().trim() === cat.name?.toLowerCase().trim()) ? 1 : 0),
                min: cat.minPerTeam || 0,
                reserved: reservation
            });
        });

        // Flexible slots (any category) to reach max squad size
        const flexibleSlots = Math.max(0, remainingSlotsIfBought - mandatorySlotsAfterCurrent);
        // Find minimum base price among all configured categories for flexible slots, falling back to global base price
        const minCatPrice = categories.length > 0
            ? Math.min(...categories.map(c => (c.basePrice !== undefined && c.basePrice !== null) ? Number(c.basePrice) : Number(globalBasePrice)))
            : Number(globalBasePrice);
        const flexibleBasePrice = Math.max(minCatPrice, Number(globalBasePrice));
        totalReservedFunds += (flexibleSlots * flexibleBasePrice);
    }

    const maxPossibleBid = team.budget - totalReservedFunds;

    // 2. Validation Rules
    let allowBid = true;
    let reason = null;

    // Check Squad Limit
    if (currentSquadCount >= maxPlayersPerTeam) {
        allowBid = false;
        reason = "Squad is full";
    }

    // Check Slot Feasibility (Can we fulfill remaining mandatory requirements?)
    if (allowBid && autoReserveFunds && remainingSlotsIfBought < mandatorySlotsAfterCurrent) {
        allowBid = false;
        reason = "Reserve required for other categories";
    }

    // Check Category Max Limit
    if (allowBid && currentPlayer && currentPlayer.category) {
        const catConfig = categories.find(c => c.name?.toLowerCase().trim() === currentPlayer.category?.toLowerCase().trim());
        if (catConfig && catConfig.maxPerTeam > 0) {
            const playersList = team.players || [];
            const countInCat = playersList.filter(p => p.category?.toLowerCase().trim() === currentPlayer.category?.toLowerCase().trim()).length;
            if (countInCat >= catConfig.maxPerTeam) {
                allowBid = false;
                reason = `Limit for ${catConfig.name} reached`;
            }
        }
    }

    // Check Budget vs Base Price (and reservation)
    if (allowBid && currentPlayer) {
        const effectiveBase = getEffectiveBasePrice(currentPlayer, categories);
        if (team.budget < effectiveBase) {
            allowBid = false;
            reason = "Budget below base price";
        } else if (autoReserveFunds && maxPossibleBid < effectiveBase) {
            allowBid = false;
            reason = "Reserved funds required";
        }
    }

    return {
        maxBid: maxPossibleBid,
        reservedFunds: totalReservedFunds,
        remainingSlots: remainingSlotsIfBought,
        allowBid,
        reason,
        categoryStatus
    };
};

/**
 * Returns the effective base price of a player, considering their category.
 */
export const getEffectiveBasePrice = (player: Player, categories: any[]): number => {
    let basePrice = Number(player.basePrice) || 0;
    if (player.category) {
        const cat = categories.find(c => c.name === player.category);
        if (cat && cat.basePrice !== undefined && cat.basePrice !== null && cat.basePrice > 0) {
            // Priority given to category base price if it's set
            return Number(cat.basePrice);
        }
    }
    return basePrice;
};

/**
 * Allowed fields for the root auction document (/auctions/{auctionId}).
 * Subcollections (players, teams, registrations, auctionLogs, etc.) MUST NEVER be written
 * into the root document to prevent exceeding Firestore's 1,048,576 bytes (1 MiB) limit.
 */
export const ALLOWED_AUCTION_FIELDS = [
    'title', 'fullTournamentName', 'season', 'sport', 'date', 'dateTBD', 'matchesDate',
    'venue', 'eventVenue', 'purseValue', 'basePrice', 'bidIncrement', 'playersPerTeam',
    'totalTeams', 'unlimitedPurse', 'autoReserveFunds', 'slabs', 'status', 'isPaid',
    'plan', 'planId', 'createdAt', 'createdBy', 'updatedAt', 'autoDeleteAt', 'isLifetime',
    'hideScoringSection', 'sponsorConfig', 'projectorLayout', 'obsLayout', 'adminViewOverride',
    'biddingStatus', 'playerSelectionMode', 'logoUrl', 'auctionLogoUrl', 'registrationConfig',
    'successAdPosterUrl', 'isAdPosterEnabled', 'globalJerseyUrl', 'globalJerseyOverlayUrl',
    'currentPlayerId', 'currentBid', 'highestBidderId', 'timer'
];

export const FORBIDDEN_BLOATED_AUCTION_FIELDS = [
    'players', 'teams', 'registrations', 'auctionLogs', 'auctionLog', 'logs', 
    'trades', 'waitlist', 'categories', 'sponsors', 'branding', 'registeredPlayers', 
    'teamList', 'captainCodes', 'registrationCodes', 'allPlayers', 'allTeams', 'members'
];

/**
 * Safely writes/updates an auction document by:
 * 1. Stripping duplicate subcollection arrays (players, teams, registrations, logs) which cause the 1 MiB limit error.
 * 2. Compressing any overgrown Base64 images in settings or registrationConfig.
 * 3. Overwriting with .set(cleanData) (WITHOUT merge: true) to permanently purge trapped bloated fields from Firestore.
 */
export const safeSaveAuctionDocument = async (
    id: string, 
    updates: Record<string, any> = {}, 
    dbInstance: any
): Promise<{ success: boolean; prunedBytes: number; cleanSize: number; originalSize: number }> => {
    if (!id || !dbInstance) return { success: false, prunedBytes: 0, cleanSize: 0, originalSize: 0 };
    
    const docRef = dbInstance.collection('auctions').doc(id);
    let currentData: Record<string, any> = {};
    try {
        const snap = await docRef.get();
        if (snap.exists) {
            currentData = snap.data() || {};
        }
    } catch (e) {
        console.warn("[SM SPORTS] Could not fetch current doc before safe save:", e);
    }

    const originalJson = JSON.stringify(currentData);
    const originalSize = originalJson.length;

    // Build pristine cleanData retaining only ALLOWED top-level fields
    const cleanData: Record<string, any> = {};
    ALLOWED_AUCTION_FIELDS.forEach(field => {
        if (currentData[field] !== undefined) {
            cleanData[field] = currentData[field];
        }
    });

    // Apply updates
    Object.keys(updates).forEach(key => {
        if (ALLOWED_AUCTION_FIELDS.includes(key)) {
            cleanData[key] = updates[key];
        }
    });

    // Ensure timestamp
    cleanData.updatedAt = Date.now();

    // Sanitize any oversize base64 images in cleanData
    if (cleanData.logoUrl && typeof cleanData.logoUrl === 'string' && cleanData.logoUrl.startsWith('data:') && cleanData.logoUrl.length > 35000) {
        try {
            cleanData.logoUrl = await compressImage(cleanData.logoUrl, 'LOGO');
        } catch (e) {
            console.warn("Logo compression error:", e);
        }
    }
    if (cleanData.auctionLogoUrl && typeof cleanData.auctionLogoUrl === 'string' && cleanData.auctionLogoUrl.startsWith('data:') && cleanData.auctionLogoUrl.length > 35000) {
        try {
            cleanData.auctionLogoUrl = await compressImage(cleanData.auctionLogoUrl, 'LOGO');
        } catch (e) {
            console.warn("Auction logo compression error:", e);
        }
    }

    // Sanitize registrationConfig if present
    if (cleanData.registrationConfig && typeof cleanData.registrationConfig === 'object') {
        const rc = { ...cleanData.registrationConfig };
        if (rc.bannerUrl && typeof rc.bannerUrl === 'string' && rc.bannerUrl.startsWith('data:') && rc.bannerUrl.length > 45000) {
            try { rc.bannerUrl = await compressImage(rc.bannerUrl, 'REG_BANNER'); } catch {}
        }
        if (rc.welcomePosterUrl && typeof rc.welcomePosterUrl === 'string' && rc.welcomePosterUrl.startsWith('data:') && rc.welcomePosterUrl.length > 45000) {
            try { rc.welcomePosterUrl = await compressImage(rc.welcomePosterUrl, 'REG_WELCOME_POSTER'); } catch {}
        }
        if (rc.logoUrl && typeof rc.logoUrl === 'string' && rc.logoUrl.startsWith('data:') && rc.logoUrl.length > 30000) {
            try { rc.logoUrl = await compressImage(rc.logoUrl, 'REG_LOGO'); } catch {}
        }
        if (rc.qrCodeUrl && typeof rc.qrCodeUrl === 'string' && rc.qrCodeUrl.startsWith('data:') && rc.qrCodeUrl.length > 30000) {
            try { rc.qrCodeUrl = await compressImage(rc.qrCodeUrl, 'QR'); } catch {}
        }
        if (rc.showcaseImages && Array.isArray(rc.showcaseImages)) {
            rc.showcaseImages = rc.showcaseImages.slice(0, 10); // Bound array size
        }
        cleanData.registrationConfig = rc;
    }

    // Remove any undefined or non-serializable values
    const finalPayload = JSON.parse(JSON.stringify(cleanData));
    const cleanSize = JSON.stringify(finalPayload).length;

    // Use .set() WITHOUT merge: true to completely replace the document.
    // This permanently purges bloated duplicate arrays (players, teams, etc.)
    // leaving subcollections untouched.
    await docRef.set(finalPayload);
    const prunedBytes = Math.max(0, originalSize - cleanSize);
    console.log(`[SM SPORTS] Safe save succeeded for auction ${id}. Clean size: ${(cleanSize / 1024).toFixed(1)} KB (Pruned: ${(prunedBytes / 1024).toFixed(1)} KB)`);

    return { success: true, prunedBytes, cleanSize, originalSize };
};

/**
 * Prunes and repairs an oversized auction document.
 */
export const pruneAndRepairAuctionDocument = async (
    id: string, 
    dbInstance: any
): Promise<{ success: boolean; prunedBytes: number; cleanSize: number; originalSize: number }> => {
    return safeSaveAuctionDocument(id, {}, dbInstance);
};
