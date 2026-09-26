
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    DndContext, 
    useDraggable, 
    useDroppable, 
    DragOverlay, 
    DragEndEvent, 
    DragStartEvent,
    PointerSensor,
    useSensor,
    useSensors,
    defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import { 
    arrayMove, 
    SortableContext, 
    verticalListSortingStrategy, 
    horizontalListSortingStrategy, 
    useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
    ArrowLeft, 
    Search, 
    Filter, 
    Download, 
    Save, 
    RotateCcw, 
    Undo, 
    Loader2, 
    ChevronDown,
    User,
    Trash2,
    Move,
    Shuffle,
    Plus,
    AlertTriangle,
    CheckCircle,
    XCircle,
    X,
    Pencil,
    Check,
    Trophy,
    Layers,
    LayoutGrid,
    PlusCircle,
    Palette,
    GripVertical,
    GripHorizontal,
    LayoutDashboard
} from 'lucide-react';
import { db } from '../firebase';
import { Player, AuctionCategory, CategoryArrangementDraft, CategoryArrangementSlot } from '../types';
import html2canvas from 'html2canvas';
import { useTheme } from '../contexts/ThemeContext';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Components ---

interface DraggablePlayerProps {
    player: Player;
    disabled?: boolean;
    isPlaced?: boolean;
}

const DraggablePlayer: React.FC<DraggablePlayerProps> = ({ player, disabled, isPlaced }) => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `player-${player.id}`,
        data: player,
        disabled: disabled
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            {...listeners} 
            {...attributes}
            className={`relative flex items-center gap-1.5 p-1.5 rounded-lg border transition-all cursor-grab active:cursor-grabbing group ${
                disabled 
                ? (isDark ? 'bg-zinc-900/50 border-zinc-800/50 opacity-40 grayscale pointer-events-none' : 'bg-gray-100 border-gray-200 opacity-40 grayscale pointer-events-none')
                : (isDark 
                    ? `bg-zinc-900 border-zinc-800 hover:border-accent/50 hover:bg-zinc-800 shadow-sm ${isPlaced ? 'border-green-500/30' : ''}` 
                    : `bg-white border-gray-200 hover:border-blue-500/50 hover:bg-gray-50 shadow-sm ${isPlaced ? 'border-green-500/30' : ''}`)
            }`}
        >
            <div className={`w-7 h-7 rounded-md flex items-center justify-center overflow-hidden flex-shrink-0 border ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-gray-100 border-gray-200'}`}>
                {player.photoUrl ? (
                    <img src={player.photoUrl} alt={player.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                    <User className={`w-3.5 h-3.5 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`} />
                )}
            </div>
            <div className="min-w-0 flex-1">
                <p className={`text-[10px] font-bold truncate transition-colors ${isDark ? 'text-zinc-100 group-hover:text-accent' : 'text-gray-900 group-hover:text-blue-600'}`}>{player.name}</p>
                <div className="flex items-center gap-1">
                    <p className={`text-[8px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>{player.category || 'Unassigned'}</p>
                    {isPlaced && <CheckCircle className="w-2.5 h-2.5 text-green-500 shrink-0" />}
                </div>
            </div>
            {isPlaced && (
                <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full p-0.5 shadow-sm">
                    <Check className="w-2 h-2" />
                </div>
            )}
        </div>
    );
};

interface DroppableSlotProps {
    id: string;
    player?: Player | null; 
    onAction: (action: 'REMOVE' | 'MOVE' | 'COLOR', slotId: string, value?: any) => void;
    index: number;
    bgColor?: string;
}

const ColorToolbar: React.FC<{
    colors: string[];
    onSelect: (color: string) => void;
    activeColor?: string;
    isDark: boolean;
}> = ({ colors, onSelect, activeColor, isDark }) => (
    <div className="flex gap-1 p-1 rounded-lg bg-black/40 backdrop-blur-sm border border-white/5 pointer-events-auto">
        {colors.map(c => (
            <button
                key={c}
                type="button"
                onClick={(e) => { 
                    e.preventDefault();
                    e.stopPropagation(); 
                    onSelect(c); 
                }}
                className={`w-3 h-3 rounded-full border border-white/20 transition-all hover:scale-125 ${activeColor === c ? 'ring-1 ring-white scale-110' : ''}`}
                style={{ backgroundColor: c === 'transparent' ? 'transparent' : c, borderStyle: c === 'transparent' ? 'dashed' : 'solid' }}
            />
        ))}
    </div>
);

const DroppableSlot: React.FC<DroppableSlotProps> = ({ id, player, onAction, index, bgColor }) => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const PRESET_COLORS = [
        'transparent',
        '#ef4444', // Red
        '#f59e0b', // Amber
        '#10b981', // Emerald
        '#3b82f6', // Blue
        '#8b5cf6', // Violet
        '#ec4899', // Pink
        '#71717a', // Zinc
        '#fcd34d', // Yellow
    ];

    const { setNodeRef: setDropRef, isOver } = useDroppable({
        id: id,
    });

    const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
        id: `slot-player-${id}`,
        data: player ? { ...player, fromSlot: id } : undefined,
        disabled: !player
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        <div 
            ref={setDropRef}
            className={`relative min-h-[2rem] h-auto w-full border transition-all flex items-center justify-center group ${
                isOver 
                ? (isDark ? 'bg-accent/30 border-accent shadow-[0_0_15px_rgba(245,158,11,0.3)] z-10 scale-[1.02]' : 'bg-blue-500/30 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)] z-10 scale-[1.02]')
                : (isDark ? 'bg-zinc-900/40 border-zinc-800/50' : 'bg-gray-50 border-gray-200')
            } ${player ? (isDark ? 'border-accent/40 bg-zinc-900/60' : 'border-blue-500/40 bg-white') : 'border-dashed'}`}
            style={{ backgroundColor: bgColor !== 'transparent' ? bgColor : undefined }}
        >
            {/* Slot Number */}
            <div className={`absolute top-0.5 left-1 text-[8px] font-black uppercase tracking-widest pointer-events-none z-0 ${true ? 'text-yellow-500' : 'text-yellow-500'}`}>
                #{index + 1}
            </div>

            {/* Color Shortcut */}
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                <ColorToolbar 
                    colors={PRESET_COLORS} 
                    onSelect={(c) => onAction('COLOR', id, c)} 
                    activeColor={bgColor}
                    isDark={isDark} 
                />
            </div>

            {player ? (
                <div 
                    ref={setDragRef}
                    style={style}
                    {...listeners}
                    {...attributes}
                    className="w-full h-full p-1.5 flex items-center gap-2 relative z-10 cursor-grab active:cursor-grabbing"
                >
                    <div className={`w-7 h-7 rounded-sm border flex-shrink-0 overflow-hidden flex items-center justify-center ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-gray-100 border-gray-200'}`}>
                        {player.photoUrl ? (
                            <img src={player.photoUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                            <span className={`text-[8px] font-black ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>{index + 1}</span>
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className={`text-[9px] font-black leading-tight uppercase tracking-tight whitespace-normal break-words ${isDark ? 'text-accent' : 'text-blue-600'}`}>{player.name}</p>
                        <p className={`text-[7px] font-bold uppercase tracking-widest truncate ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>{player.category}</p>
                    </div>
                    
                    {/* Hover Actions */}
                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col items-center justify-center gap-1 backdrop-blur-md pointer-events-none group-hover:pointer-events-auto ${isDark ? 'bg-zinc-950/95' : 'bg-white/95'} z-30`}>
                        <div className="flex gap-2 mb-2">
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAction('REMOVE', id);
                                }}
                                className="p-2 bg-red-500/10 hover:bg-red-50 text-red-500 rounded-xl transition-all active:scale-90"
                                title="Remove Player"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAction('MOVE', id);
                                }}
                                className="p-2 bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-white rounded-xl transition-all active:scale-90"
                                title="Move Player"
                            >
                                <Move className="w-4 h-4" />
                            </button>
                        </div>
                        
                        <div className="flex flex-col items-center gap-1 w-full px-2">
                            <p className="text-[7px] font-black text-gray-500 uppercase tracking-widest mb-1">Update Status</p>
                            <div className="flex gap-1 justify-center w-full">
                                {['POOL', 'SOLD', 'UNSOLD'].map(s => (
                                    <button 
                                        key={s}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onAction(`CORRECT_STATUS:${s}` as any, id);
                                        }}
                                        className={`flex-1 py-1 rounded-lg text-[7px] font-black uppercase tracking-tight transition-all border ${
                                            player.status === s 
                                            ? (s === 'SOLD' ? 'bg-green-600 border-green-600 text-white' : s === 'UNSOLD' ? 'bg-red-600 border-red-600 text-white' : 'bg-blue-600 border-blue-600 text-white')
                                            : (isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700' : 'bg-gray-50 border-gray-200 text-gray-400 hover:border-gray-300')
                                        }`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                    <span className={`text-[18px] font-black text-yellow-500/50`}>{index + 1}</span>
                </div>
            )}
        </div>
    );
};

interface SortableRowLabelProps {
    cat: AuctionCategory;
    rowLabel: string;
    isDark: boolean;
    isSelected?: boolean;
    onToggleSelect?: (id: string) => void;
    className?: string;
}

const SortableRowLabel: React.FC<SortableRowLabelProps> = ({ cat, rowLabel, isDark, isSelected, onToggleSelect, className }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: `row-${cat?.id}`,
        data: { type: 'ROW', id: cat?.id }
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 1,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <td 
            ref={setNodeRef}
            style={style}
            className={`p-1 border border-zinc-800 text-[9px] font-black text-amber-200 uppercase tracking-widest bg-zinc-900 group relative whitespace-nowrap sticky left-0 z-20 ${className}`}
        >
            <div className="flex items-center gap-1.5 justify-start">
                <GripVertical className="w-3 h-3 text-zinc-600 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity" {...listeners} {...attributes} />
                {onToggleSelect && cat?.id && (
                    <input 
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect(cat.id!)}
                        className={`w-3 h-3 rounded border-zinc-700 bg-zinc-800 text-amber-500 focus:ring-amber-500/20 active:scale-90 transition-all cursor-pointer`}
                        onClick={(e) => e.stopPropagation()}
                    />
                )}
                <span className="truncate max-w-[80px]">{rowLabel}</span>
            </div>
        </td>
    );
};

interface SortableColumnHeaderProps {
    index: number;
    name: string;
    isDark: boolean;
    onRename: (index: number) => void;
    onColor: (index: number, color: string) => void;
    bgColor?: string;
}

const SortableColumnHeader: React.FC<SortableColumnHeaderProps> = ({ index, name, isDark, onRename, onColor, bgColor }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: `col-${index}`,
        data: { type: 'COLUMN', index }
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 1,
        opacity: isDragging ? 0.5 : 1,
        backgroundColor: bgColor !== 'transparent' ? bgColor : undefined
    };

    const PRESET_COLORS = [
        'transparent', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#71717a', '#fcd34d'
    ];

    return (
        <th 
            ref={setNodeRef}
            style={style}
            className={`p-1 border border-zinc-800 text-[10px] font-black text-amber-500 uppercase tracking-widest bg-zinc-900 group relative`}
        >
            <div className="flex flex-col items-center gap-1">
                 <div className="flex items-center gap-1.5 w-full justify-center">
                    <GripHorizontal className="w-3 h-3 text-zinc-500 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity" {...listeners} {...attributes} />
                    <span 
                        className="cursor-pointer hover:underline truncate"
                        onClick={() => onRename(index)}
                    >
                        {name}
                    </span>
                 </div>
                 
                 <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <ColorToolbar colors={PRESET_COLORS} onSelect={(c) => onColor(index, c)} activeColor={bgColor} isDark={isDark} />
                 </div>
            </div>
        </th>
    );
};

// --- Main Screen ---

const CategoryArrangement: React.FC = () => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [auctionName, setAuctionName] = useState<string>('');
    const [auctionLogo, setAuctionLogo] = useState<string>('');
    const [players, setPlayers] = useState<Player[]>([]);
    const [categories, setCategories] = useState<AuctionCategory[]>([]);
    const [activeCategory, setActiveCategory] = useState<string>('');
    const [slots, setSlots] = useState<{ [key: string]: CategoryArrangementSlot }>({});
    const [allSlots, setAllSlots] = useState<{ [categoryId: string]: { [slotId: string]: CategoryArrangementSlot } }>({});
    const [customConfig, setCustomConfig] = useState<{ [categoryId: string]: { rows: number, cols: number } }>({});
    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState('ALL');
    const [history, setHistory] = useState<{ [key: string]: CategoryArrangementSlot }[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [showAddCategoryPopup, setShowAddCategoryPopup] = useState(false);
    const [showDeleteCategoryPopup, setShowDeleteCategoryPopup] = useState(false);
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [isDeletingCategory, setIsDeletingCategory] = useState(false);
    const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
    const [activeDragId, setActiveDragId] = useState<string | null>(null);
    const [pendingSwap, setPendingSwap] = useState<{ slotId: string, newPlayer: Player } | null>(null);
    const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
    const [isEditingName, setIsEditingName] = useState(false);
    const [tempCategoryName, setTempCategoryName] = useState('');
    const [showAutoFillModal, setShowAutoFillModal] = useState(false);
    const [autoFillSourceCategory, setAutoFillSourceCategory] = useState<string>('CURRENT');
    const [notification, setNotification] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
    const [continuousNumbering, setContinuousNumbering] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState<any>({});
    const [rowCountExtra, setRowCountExtra] = useState(0);
    const [colCountExtra, setColCountExtra] = useState(0);
    const [markedRowIndex, setMarkedRowIndex] = useState<number | null>(null);
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set());
    const [showDownloadMenu, setShowDownloadMenu] = useState(false);
    const [columnNames, setColumnNames] = useState<{ [key: number]: string }>({});
    const [editingColumnIndex, setEditingColumnIndex] = useState<number | null>(null);
    const [tempColumnName, setTempColumnName] = useState('');
    const [cellStyles, setCellStyles] = useState<{ [key: string]: string }>({});
    const [columnStyles, setColumnStyles] = useState<{ [key: number]: string }>({});
    const [columnOrder, setColumnOrder] = useState<number[]>([]);
    const [showColorPicker, setShowColorPicker] = useState<{ type: 'CELL' | 'COLUMN', id: string | number } | null>(null);

    const boardRef = useRef<HTMLDivElement>(null);
    const exportRef = useRef<HTMLDivElement>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const showNotification = (message: string, type: 'error' | 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    const PRESET_COLORS = [
        'transparent',
        '#ef4444', // Red
        '#f59e0b', // Amber
        '#10b981', // Emerald
        '#3b82f6', // Blue
        '#8b5cf6', // Violet
        '#ec4899', // Pink
        '#71717a', // Zinc
        '#fcd34d', // Yellow
    ];

    const sortedCategories = useMemo(() => {
        return [...categories].sort((a, b) => {
            const orderA = a.order ?? 0;
            const orderB = b.order ?? 0;
            if (orderA !== orderB) return orderA - orderB;
            return (a.id || '').localeCompare(b.id || '');
        });
    }, [categories]);

    const saveArrangementSettings = async (extraRows: number, extraCols: number, colNames?: { [key: number]: string }, cStyles?: any, colStyles?: any, colOrder?: number[]) => {
        if (!id) return;
        try {
            await db.collection('auctions').doc(id).collection('arrangementDrafts').doc('SETTINGS').set({
                rowCountExtra: extraRows,
                colCountExtra: extraCols,
                columnNames: colNames || columnNames,
                cellStyles: cStyles || cellStyles,
                columnStyles: colStyles || columnStyles,
                columnOrder: colOrder || columnOrder,
                updatedAt: Date.now()
            }, { merge: true });
        } catch (err) {
            console.error("Error saving settings:", err);
        }
    };

    // --- Removed syncUnplacedPlayers automatic execution to prevent unwanted player shuffling ---
    // Users want to manually drag and drop players and keep slots empty if they choose.
    
    useEffect(() => {
        if (!id) return;

        const unsubAuction = db.collection('auctions').doc(id).onSnapshot(snap => {
            if (snap.exists) {
                const data = snap.data();
                setAuctionName(data?.name || data?.title || 'Auction Board');
                setAuctionLogo(data?.logoUrl || '');
            }
        });

        const unsubCategories = db.collection('auctions').doc(id).collection('categories').onSnapshot(snap => {
            const cList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuctionCategory));
            setCategories(cList);
            
            // Always use ALL_CATEGORIES view as requested
            setActiveCategory('ALL_CATEGORIES');
        });

        const unsubPlayers = db.collection('auctions').doc(id).collection('players').onSnapshot(snap => {
            const pList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Player));
            setPlayers(pList);
        });

        const unsubDrafts = db.collection('auctions').doc(id).collection('arrangementDrafts').onSnapshot(snap => {
            const draftsMap: { [key: string]: any } = {};
            const configMap: { [key: string]: any } = {};
            snap.docs.forEach(doc => {
                if (doc.id === 'SETTINGS') {
                    const data = doc.data();
                    setRowCountExtra(data.rowCountExtra || 0);
                    setColCountExtra(data.colCountExtra || 0);
                    setColumnNames(data.columnNames || {});
                    setCellStyles(data.cellStyles || {});
                    setColumnStyles(data.columnStyles || {});
                    setColumnOrder(data.columnOrder || []);
                } else {
                    draftsMap[doc.id] = doc.data().slots || {};
                    configMap[doc.id] = doc.data().config || { rows: 0, cols: 0 };
                }
            });
            setAllSlots(draftsMap);
            setCustomConfig(configMap);
            setLoading(false);
        });

        return () => {
            unsubAuction();
            unsubCategories();
            unsubPlayers();
            unsubDrafts();
        };
    }, [id]);

    useEffect(() => {
        if (!id || !activeCategory) return;
        const currentDraft = allSlots[activeCategory] || {};
        setSlots(currentDraft);
        setHistory([]);
    }, [activeCategory, id, allSlots]);

    // Helper: Find and remove player from any existing slots across ALL categories
    const removePlayerFromWhereverHeIs = async (pid: string | number) => {
        const tempAllSlots = { ...allSlots };
        let foundCatId = null;
        let foundSlotId = null;

        Object.entries(tempAllSlots).forEach(([catId, catSlots]) => {
            const sId = Object.entries(catSlots).find(([_, s]) => String(s.playerId) === String(pid))?.[0];
            if (sId) {
                foundCatId = catId;
                foundSlotId = sId;
            }
        });

        if (foundCatId && foundSlotId) {
            const updatedCatSlots = { ...tempAllSlots[foundCatId] };
            delete updatedCatSlots[foundSlotId];
            
            // Persistent update for removal
            await db.collection('auctions').doc(id!).collection('arrangementDrafts').doc(foundCatId).update({
                slots: updatedCatSlots,
                updatedAt: Date.now()
            });

            // Update local state
            setAllSlots(prev => ({
                ...prev,
                [foundCatId!]: updatedCatSlots
            }));

            return { catId: foundCatId, slotId: foundSlotId };
        }
        return null;
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveDragId(event.active.id as string);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDragId(null);
        if (!over) return;

        const activeData = active.data.current as any;
        const overId = over.id as string;

        // 1. Handle Row Reorder
        if (activeData?.type === 'ROW') {
            const oldIndex = sortedCategories.findIndex(c => `row-${c.id}` === active.id);
            const newIndex = sortedCategories.findIndex(c => `row-${c.id}` === overId);
            
            if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
                const newOrderedCategories = arrayMove(sortedCategories, oldIndex, newIndex);
                
                // Update Firestore orders in batch
                const batch = db.batch();
                newOrderedCategories.forEach((cat, idx) => {
                    batch.update(db.collection('auctions').doc(id!).collection('categories').doc(cat.id!), {
                        order: idx * 10
                    });
                });
                await batch.commit();
                showNotification("Categories reordered", "success");
            }
            return;
        }

        // 2. Handle Column Reorder
        if (activeData?.type === 'COLUMN') {
            const oldIndexStr = String(active.id).replace('col-', '');
            const newIndexStr = String(overId).replace('col-', '');
            const oldIndex = parseInt(oldIndexStr);
            const newIndex = parseInt(newIndexStr);

            if (!isNaN(oldIndex) && !isNaN(newIndex) && oldIndex !== newIndex) {
                const newOrder = arrayMove(sortedColumnIndices, sortedColumnIndices.indexOf(oldIndex), sortedColumnIndices.indexOf(newIndex));
                setColumnOrder(newOrder);
                await saveArrangementSettings(rowCountExtra, colCountExtra, columnNames, cellStyles, columnStyles, newOrder);
                showNotification("Columns reordered", "success");
            }
            return;
        }

        const slotId = over.id as string;
        const player = activeData?.player || activeData as Player;

        if (!player || !player.id) return;

        // Handle All Categories view drop (format catId:slotId)
        if (slotId.includes(':')) {
            const [targetCatId, targetSId] = slotId.split(':');
            const targetCat = categories.find(c => c.id === targetCatId);
            if (!targetCat) return;

            const existingOccupant = allSlots[targetCatId]?.[targetSId];
            if (existingOccupant && String(existingOccupant.playerId) !== String(player.id)) {
                setPendingSwap({ slotId, newPlayer: player });
                return;
            }

            // Move or assign
            setIsSaving(true);
            try {
                const targetCategoryName = targetCat.name;

                // 1. Remove from old position if any
                await removePlayerFromWhereverHeIs(player.id);

                // 2. Assign to new position
                const newCatSlots = { 
                    ...(allSlots[targetCatId] || {}), 
                    [targetSId]: {
                        playerId: player.id,
                        playerName: player.name,
                        category: targetCategoryName
                    }
                };

                await db.collection('auctions').doc(id!).collection('players').doc(String(player.id)).update({
                    category: targetCategoryName
                });

                await db.collection('auctions').doc(id!).collection('arrangementDrafts').doc(targetCatId).set({
                    auctionId: id,
                    categoryId: targetCatId,
                    slots: newCatSlots,
                    config: customConfig[targetCatId] || { rows: 0, cols: 0 },
                    updatedAt: Date.now()
                }, { merge: true });
                
                setAllSlots(prev => ({
                    ...prev,
                    [targetCatId]: newCatSlots
                }));
                
                showNotification(`Assigned ${player.name} to ${targetCat.name}`, "success");
            } catch (err) {
                console.error(err);
            } finally {
                setIsSaving(false);
            }
            return;
        }

        // --- Traditional Single Category View Logic ---
        if (activeData?.fromSlot) {
            const fromSlotId = activeData.fromSlot;
            if (fromSlotId === slotId) return;

            const newSlots = { ...slots };
            const playerInFromSlot = newSlots[fromSlotId];
            const playerInToSlot = newSlots[slotId];

            setHistory([...history, slots]);

            if (playerInToSlot) {
                newSlots[slotId] = playerInFromSlot;
                newSlots[fromSlotId] = playerInToSlot;
            } else {
                newSlots[slotId] = playerInFromSlot;
                delete newSlots[fromSlotId];
            }

            setSlots(newSlots);
            setAllSlots(prev => ({ ...prev, [activeCategory]: newSlots }));
            
            // Save traditional view move
            db.collection('auctions').doc(id!).collection('arrangementDrafts').doc(activeCategory).update({
                slots: newSlots,
                updatedAt: Date.now()
            }).catch(console.error);

            return;
        }

        // From List to Slot
        if (slots[slotId]) {
            setPendingSwap({ slotId, newPlayer: player });
            return;
        }

        executeAssign(slotId, player);
    };

    const executeAssign = async (slotId: string, player: Player) => {
        setIsSaving(true);
        try {
            // Find target category name
            const targetCat = categories.find(c => c.id === activeCategory);
            const targetCategoryName = targetCat?.name || player.category;

            // 1. Globally remove player from any other slots they might be in
            await removePlayerFromWhereverHeIs(player.id);

            // 2. Assign to new slot in CURRENT category
            // We use the freshest 'slots' possible or update allSlots
            const newCatSlots = { 
                ...(allSlots[activeCategory] || {}), 
                [slotId]: {
                    playerId: player.id,
                    playerName: player.name,
                    category: targetCategoryName
                }
            };

            // Update Firestore Player Category
            await db.collection('auctions').doc(id!).collection('players').doc(String(player.id)).update({
                category: targetCategoryName
            });

            // Update Firestore Draft
            await db.collection('auctions').doc(id!).collection('arrangementDrafts').doc(activeCategory).set({
                auctionId: id!,
                categoryId: activeCategory,
                slots: newCatSlots,
                config: customConfig[activeCategory] || { rows: 0, cols: 0 },
                updatedAt: Date.now()
            }, { merge: true });

            // Update local states
            setSlots(newCatSlots);
            setAllSlots(prev => ({ ...prev, [activeCategory]: newCatSlots }));
            
            showNotification(`Assigned ${player.name} to ${targetCategoryName}`, "success");
        } catch (err) {
            console.error(err);
            showNotification("Failed to assign player", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSwap = async () => {
        if (!pendingSwap || !id) return;
        const { slotId, newPlayer } = pendingSwap;

        setIsSaving(true);
        try {
            // All-categories vs single view handling
            const targetCatId = slotId.includes(':') ? slotId.split(':')[0] : activeCategory;
            const targetSId = slotId.includes(':') ? slotId.split(':')[1] : slotId;
            const targetCat = categories.find(c => c.id === targetCatId);
            const targetCatName = targetCat?.name || newPlayer.category;

            const currentOccupant = allSlots[targetCatId]?.[targetSId];
            if (!currentOccupant) throw new Error("Slot empty for swap");

            // 1. Remove new player from wherever they were
            const oldPos = await removePlayerFromWhereverHeIs(newPlayer.id);

            // 2. Put Current Occupant into New Player's old position (actual swap)
            if (oldPos) {
                const oldCatSlots = { ...(allSlots[oldPos.catId] || {}) };
                const oldCat = categories.find(c => c.id === oldPos.catId);
                
                oldCatSlots[oldPos.slotId] = {
                    ...currentOccupant,
                    category: oldCat?.name || currentOccupant.category
                };

                await db.collection('auctions').doc(id).collection('arrangementDrafts').doc(oldPos.catId).update({
                    slots: oldCatSlots,
                    updatedAt: Date.now()
                });

                setAllSlots(prev => ({ ...prev, [oldPos.catId]: oldCatSlots }));
            }

            // 3. Put New Player into target slot
            const finalTargetCatSlots = { ...(allSlots[targetCatId] || {}) };
            finalTargetCatSlots[targetSId] = {
                playerId: newPlayer.id,
                playerName: newPlayer.name,
                category: targetCatName
            };

            await db.collection('auctions').doc(id).collection('players').doc(String(newPlayer.id)).update({
                category: targetCatName
            });

            await db.collection('auctions').doc(id).collection('arrangementDrafts').doc(targetCatId).update({
                slots: finalTargetCatSlots,
                updatedAt: Date.now()
            });

            setAllSlots(prev => ({ ...prev, [targetCatId]: finalTargetCatSlots }));
            if (activeCategory === targetCatId) setSlots(finalTargetCatSlots);
            
            showNotification("Players swapped successfully", "success");
        } catch (err) {
            console.error(err);
            showNotification("Swap failed", "error");
        } finally {
            setIsSaving(false);
            setPendingSwap(null);
        }
    };

    const handleReplace = async () => {
        if (!pendingSwap || !id) return;
        const { slotId, newPlayer } = pendingSwap;

        setIsSaving(true);
        try {
            const targetCatId = slotId.includes(':') ? slotId.split(':')[0] : activeCategory;
            const targetSId = slotId.includes(':') ? slotId.split(':')[1] : slotId;
            const targetCat = categories.find(c => c.id === targetCatId);
            const targetCatName = targetCat?.name || newPlayer.category;

            // 1. Remove from old pos
            await removePlayerFromWhereverHeIs(newPlayer.id);

            // 2. Assign to new pos
            const finalTargetCatSlots = { ...(allSlots[targetCatId] || {}) };
            finalTargetCatSlots[targetSId] = {
                playerId: newPlayer.id,
                playerName: newPlayer.name,
                category: targetCatName
            };

            await db.collection('auctions').doc(id).collection('players').doc(String(newPlayer.id)).update({
                category: targetCatName
            });

            await db.collection('auctions').doc(id).collection('arrangementDrafts').doc(targetCatId).update({
                slots: finalTargetCatSlots,
                updatedAt: Date.now()
            });

            setAllSlots(prev => ({ ...prev, [targetCatId]: finalTargetCatSlots }));
            if (activeCategory === targetCatId) setSlots(finalTargetCatSlots);
            
            showNotification("Player replaced successfully", "success");
        } catch (err) {
            console.error(err);
            showNotification("Replace failed", "error");
        } finally {
            setIsSaving(false);
            setPendingSwap(null);
        }
    };

    const handleAction = async (action: string, slotId: string, value?: any) => {
        if (action === 'COLOR') {
            const newStyles = { ...cellStyles, [slotId]: value };
            setCellStyles(newStyles);
            await saveArrangementSettings(rowCountExtra, colCountExtra, columnNames, newStyles, columnStyles);
            return;
        }

        if (action === 'REMOVE') {
            let playerToRemove;
            let targetCatId = activeCategory;
            let actualSlotId = slotId;

            // Handle All Categories view (format catId:slotId)
            if (slotId.includes(':')) {
                const [catId, sId] = slotId.split(':');
                targetCatId = catId;
                actualSlotId = sId;
                playerToRemove = allSlots[catId]?.[sId];
            } else {
                playerToRemove = slots[slotId];
            }

            if (!playerToRemove) return;

            setHistory([...history, slots]);
            
            if (slotId.includes(':')) {
                // Remove from allSlots
                const newCatSlots = { ...(allSlots[targetCatId] || {}) };
                delete newCatSlots[actualSlotId];
                
                setAllSlots(prev => ({
                    ...prev,
                    [targetCatId]: newCatSlots
                }));

                // If activeCategory is ALL_CATEGORIES, we don't necessarily update 'slots' state 
                // but let the useEffect on line 271 handle it if needed. 
                // Actually, if we are in ALL_CATEGORIES view, slots is empty anyway.
                
                // Directly update Firestore for All Categories view as it's a global change
                try {
                    await db.collection('auctions').doc(id!).collection('arrangementDrafts').doc(targetCatId).update({
                        slots: newCatSlots,
                        updatedAt: Date.now()
                    });
                } catch (err) {
                    console.error("Error updating draft in All Categories view:", err);
                }
            } else {
                // Traditional view
                const newSlots = { ...slots };
                delete newSlots[slotId];
                setSlots(newSlots);
                setAllSlots(prev => ({ ...prev, [activeCategory]: newSlots }));

                // Directly update Firestore for Traditional view to ensure it gets deleted
                try {
                    await db.collection('auctions').doc(id!).collection('arrangementDrafts').doc(activeCategory).update({
                        slots: newSlots,
                        updatedAt: Date.now()
                    });
                } catch (err) {
                    console.error("Error updating draft in Traditional view:", err);
                }
            }

            // Update player category in Firestore to Standard
            if (playerToRemove && id) {
                try {
                    await db.collection('auctions').doc(id).collection('players').doc(String(playerToRemove.playerId)).update({
                        category: 'Standard'
                    });
                } catch (err) {
                    console.error("Error resetting player category:", err);
                }
            }
        } else if (action.startsWith('CORRECT_STATUS:')) {
            const newStatus = action.split(':')[1];
            let playerPos;
            
            if (slotId.includes(':')) {
                const [catId, sId] = slotId.split(':');
                playerPos = allSlots[catId]?.[sId];
            } else {
                playerPos = slots[slotId];
            }

            if (!playerPos?.playerId) return;

            try {
                await db.collection('auctions').doc(id!).collection('players').doc(String(playerPos.playerId)).update({
                    status: newStatus,
                    updatedAt: Date.now()
                });
                showNotification(`Status corrected to ${newStatus}`, "success");
            } catch (err) {
                console.error(err);
                showNotification("Failed to correct status", "error");
            }
        }
    };

    const handleUndo = () => {
        if (history.length === 0) return;
        const prev = history[history.length - 1];
        setSlots(prev);
        setAllSlots(all => ({ ...all, [activeCategory]: prev }));
        setHistory(history.slice(0, -1));
    };

    const handleReset = () => {
        setConfirmAction({
            title: "Clear Assignments",
            message: "Are you sure you want to clear all assignments for this category? This cannot be undone.",
            onConfirm: () => {
                setHistory([...history, slots]);
                setSlots({});
                setAllSlots(all => ({ ...all, [activeCategory]: {} }));
                setConfirmAction(null);
                showNotification("Assignments cleared for current category.", "success");
            }
        });
    };

    const handleSave = async () => {
        if (!id || !activeCategory) return;
        setIsSaving(true);
        try {
            await db.collection('auctions').doc(id).collection('arrangementDrafts').doc(activeCategory).set({
                auctionId: id,
                categoryId: activeCategory,
                slots: slots,
                config: customConfig[activeCategory] || { rows: 0, cols: 0 },
                updatedAt: Date.now()
            });

            // Update local allSlots state
            setAllSlots(prev => ({
                ...prev,
                [activeCategory]: slots
            }));

            // Use a non-blocking notification instead of alert
            const notification = document.createElement('div');
            notification.className = 'fixed bottom-8 right-8 bg-zinc-900 border border-amber-500/50 text-amber-500 px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl animate-fade-in z-[200]';
            notification.innerText = 'Draft Saved Successfully';
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 3000);
        } catch (err) {
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleExport = async () => {
        if (!exportRef.current) return;
        setIsExporting(true);
        
        // Ensure all images are loaded
        const images = exportRef.current.querySelectorAll('img');
        await Promise.all(Array.from(images).map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise(resolve => {
                img.onload = resolve;
                img.onerror = resolve;
            });
        }));

        try {
            const el = exportRef.current;
            // Temporarily make it visible for capture
            el.style.opacity = '1';
            el.style.pointerEvents = 'auto';
            el.style.position = 'static';
            el.style.left = '0';

            // Small delay to ensure DOM has updated and layout is correct
            await new Promise(resolve => setTimeout(resolve, 800));

            const canvas = await html2canvas(el, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#0a0a0a',
                logging: false,
                width: el.scrollWidth,
                height: el.scrollHeight,
                windowWidth: el.scrollWidth,
                windowHeight: el.scrollHeight
            });

            el.style.opacity = '0';
            el.style.pointerEvents = 'none';

            const link = document.createElement('a');
            link.download = `SM_Sports_Auction_Categories_${new Date().getTime()}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
            showNotification("PNG Exported", "success");
        } catch (err) {
            console.error(err);
            showNotification("PNG Export failed", "error");
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportExcel = () => {
        setIsExporting(true);
        try {
            const categoriesToExport = selectedCategoryIds.size > 0 
                ? sortedCategories.filter(c => selectedCategoryIds.has(c.id!))
                : sortedCategories;

            const data: any[] = [];
            
            categoriesToExport.forEach((cat, rIdx) => {
                const catSlots = allSlots[cat.id!] || {};
                const catCols = (customConfig[cat.id!]?.cols) || 6;
                const catOffset = continuousNumbering ? (sortedCategories.indexOf(cat) * colCount) : 0;

                let catHasPlayers = false;

                // Iterate through all slots in UI order to get matching numbers
                for(let cIdx = 0; cIdx < colCount; cIdx++) {
                    const slotNum = cIdx + 1;
                    const r = Math.ceil(slotNum / catCols);
                    const c = ((slotNum - 1) % catCols) + 1;
                    const catPrefix = cat.name.substring(0, 3).toUpperCase();
                    const slotId = `${catPrefix}${r}_${c}`;
                    const slotData = catSlots[slotId];
                    const player = slotData ? players.find(p => String(p.id) === String(slotData.playerId)) : null;

                    if (player) {
                        catHasPlayers = true;
                        data.push({
                            "Sl No.": catOffset + cIdx + 1,
                            "Name": player.name,
                            "Category": cat.name
                        });
                    }
                }

                if (!catHasPlayers) {
                    data.push({
                        "Sl No.": "-",
                        "Name": `Category: ${cat.name}`,
                        "Category": "No Players Assigned"
                    });
                }
                // Add empty row for spacing
                data.push({});
            });

            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Categories");
            XLSX.writeFile(wb, `${auctionName}_Categories_${new Date().getTime()}.xlsx`);
            showNotification("Excel Exported", "success");
        } catch (err) {
            console.error(err);
            showNotification("Excel Export failed", "error");
        } finally {
            setIsExporting(false);
            setShowDownloadMenu(false);
        }
    };

    const handleExportPDF = () => {
        setIsExporting(true);
        try {
            const categoriesToExport = selectedCategoryIds.size > 0 
                ? sortedCategories.filter(c => selectedCategoryIds.has(c.id!))
                : sortedCategories;

            const doc = new jsPDF();
            doc.setFontSize(22);
            doc.setTextColor(37, 99, 235); // Blue
            doc.text(auctionName, 14, 22);
            doc.setFontSize(12);
            doc.setTextColor(100);
            doc.text("Category Arrangement Summary", 14, 30);
            doc.setFontSize(10);
            doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 36);

            let currentY = 45;

            categoriesToExport.forEach((cat) => {
                const catSlots = allSlots[cat.id!] || {};
                const catCols = (customConfig[cat.id!]?.cols) || 6;
                const catOffset = continuousNumbering ? (sortedCategories.indexOf(cat) * colCount) : 0;

                const tableData: any[] = [];
                
                for(let cIdx = 0; cIdx < colCount; cIdx++) {
                    const slotNum = cIdx + 1;
                    const r = Math.ceil(slotNum / catCols);
                    const c = ((slotNum - 1) % catCols) + 1;
                    const catPrefix = cat.name.substring(0, 3).toUpperCase();
                    const slotId = `${catPrefix}${r}_${c}`;
                    const slotData = catSlots[slotId];
                    const player = slotData ? players.find(p => String(p.id) === String(slotData.playerId)) : null;

                    if (player) {
                        tableData.push([
                            catOffset + cIdx + 1,
                            player.name,
                            cat.name
                        ]);
                    }
                }

                if (currentY > 250) {
                    doc.addPage();
                    currentY = 20;
                }

                doc.setFontSize(14);
                doc.setTextColor(30);
                doc.setFont("helvetica", "bold");
                doc.text(`${cat.name}`, 14, currentY);
                currentY += 5;

                autoTable(doc, {
                    startY: currentY,
                    head: [['Sl No.', 'Name', 'Category']],
                    body: tableData.length > 0 ? tableData : [['-', 'No Players Assigned', cat.name]],
                    theme: 'grid',
                    headStyles: { fillColor: [37, 99, 235], fontStyle: 'bold' },
                    styles: { fontSize: 10, cellPadding: 3 },
                    margin: { left: 14 },
                });

                currentY = (doc as any).lastAutoTable.finalY + 15;
            });

            doc.save(`${auctionName}_Categories_${new Date().getTime()}.pdf`);
            showNotification("PDF Exported", "success");
        } catch (err) {
            console.error(err);
            showNotification("PDF Export failed", "error");
        } finally {
            setIsExporting(false);
            setShowDownloadMenu(false);
        }
    };

    const isAllCategories = activeCategory === 'ALL_CATEGORIES';
    const currentCategory = categories.find(c => c.id === activeCategory);
    const isAllrounderTable = currentCategory?.name?.toLowerCase() === 'allrounder';
    
    const config = customConfig[activeCategory] || { rows: 0, cols: 0 };
    const totalInCategory = players.filter(p => p.category === currentCategory?.name).length;
    const totalRequired = totalInCategory || 6;

    // Transpose logic for All Categories
    const rowCount = (isAllCategories 
        ? sortedCategories.length 
        : (config.rows || (isAllrounderTable ? sortedCategories.length : Math.ceil(totalRequired / 6)))) + rowCountExtra;
        
    const colCount = (isAllCategories 
        ? 6 
        : (config.cols || 6)) + colCountExtra;
    const prefix = isAllCategories ? 'ALL' : (currentCategory?.name?.substring(0, 3).toUpperCase() || 'CAT');

    const toggleCategorySelection = (cid: string) => {
        const newSelection = new Set(selectedCategoryIds);
        if (newSelection.has(cid)) {
            newSelection.delete(cid);
        } else {
            newSelection.add(cid);
        }
        setSelectedCategoryIds(newSelection);
    };

    const getSlotIndex = (rIdx: number, cIdx: number) => {
        if (continuousNumbering) {
            const catIdx = isAllCategories ? rIdx : sortedCategories.findIndex(c => c.id === activeCategory);
            // We'll use a fixed colCount for the numbering system to keep it predictable
            // Master board always uses 'colCount' which is 6 + colCountExtra
            if (catIdx !== -1) {
                // Number of slots per category row (if multiple rows per cat they would be numbered rIdx too)
                const rowsPerCat = isAllCategories ? 1 : rowCount; // this is just a best effort guess if not in All Cats
                // However, in All categories view, each category is exactly 1 row.
                if (isAllCategories) {
                   return (rIdx * colCount) + cIdx;
                } else {
                   // Offset by category index * columns per category
                   return (catIdx * colCount) + (rIdx * colCount) + cIdx;
                }
            }
        }
        return cIdx;
    };

    useEffect(() => {
        if (activeCategory && activeCategory !== 'ALL_CATEGORIES') {
            const cat = categories.find(c => c.id === activeCategory);
            if (cat) {
                setFilterCategory(cat.name);
            }
        }
    }, [activeCategory, categories]);

    const handleAutoFill = (sourceCatId?: string) => {
        if (isAllCategories) {
            showNotification("Auto-fill is not available for All Categories view.", "error");
            return;
        }
        const targetCat = categories.find(c => c.id === activeCategory);
        if (!targetCat) return;

        let sourceCatName: string | null = targetCat.name;
        if (sourceCatId === 'UNASSIGNED') {
            sourceCatName = null; // Looking for unassigned
        } else if (sourceCatId && sourceCatId !== 'CURRENT') {
            const sc = categories.find(c => c.id === sourceCatId);
            if (sc) sourceCatName = sc.name;
        }

        const availablePlayers = players.filter(p => {
            const isMatch = sourceCatName === null 
                ? (!p.category || p.category.trim() === '')
                : (p.category === sourceCatName);
            
            return isMatch && !Object.values(allSlots).some(catSlots => 
                Object.values(catSlots).some(slot => String(slot.playerId) === String(p.id))
            );
        });

        if (availablePlayers.length === 0) {
            showNotification(`No unassigned players found in ${sourceCatName || 'Unassigned'} pool`, "error");
            return;
        }

        const newSlots = { ...slots };
        const totalRequired = players.filter(p => p.category === targetCat.name).length || 6;
        const rows = Math.ceil(totalRequired / 6);
        const cols = 6;

        let playerIdx = 0;
        const batch = db.batch();

        for (let r = 1; r <= rows; r++) {
            for (let c = 1; c <= cols; c++) {
                const slotId = `${targetCat.name.substring(0, 3).toUpperCase()}${r}_${c}`;
                if (!newSlots[slotId] && playerIdx < availablePlayers.length) {
                    const p = availablePlayers[playerIdx++];
                    newSlots[slotId] = {
                        playerId: p.id,
                        playerName: p.name,
                        category: targetCat.name // Update slot to target category
                    };
                    
                    // Also update player's actual category in DB for consistency
                    const pRef = db.collection('auctions').doc(id!).collection('players').doc(String(p.id));
                    batch.update(pRef, { 
                        category: targetCat.name,
                        updatedAt: Date.now() 
                    });
                }
            }
        }

        if (playerIdx > 0) {
            batch.commit().catch(err => console.error("Auto Fill DB Update Error:", err));
        }

        setHistory([...history, slots]);
        setSlots(newSlots);
        setAllSlots(prev => ({ ...prev, [activeCategory]: newSlots }));
        showNotification(`Auto-filled ${playerIdx} players from ${sourceCatName || 'Unassigned pool'}`, "success");
        setShowAutoFillModal(false);
    };

    const filteredPlayers = players.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
        
        // If we are in a specific category board, we want to see players assigned to THIS category
        // AND players with NO category (unassigned), even if they are placed.
        
        const isPlacedInCurrentBoard = Object.values(slots).some(slot => String(slot.playerId) === String(p.id));
        const isPlacedElsewhere = Object.entries(allSlots).some(([cid, catSlots]) => 
            cid !== activeCategory && Object.values(catSlots).some(slot => String(slot.playerId) === String(p.id))
        );

        const isUnassigned = !p.category || p.category.trim() === '';

        if (filterCategory === 'ALL') {
            // Show everyone not placed anywhere
            return matchesSearch && !isPlacedElsewhere && !isPlacedInCurrentBoard;
        }
        
        const matchesFilter = p.category === filterCategory;

        if (!isAllCategories) {
            // When viewing a specific board:
            // Show players of this category (placed or not) + Unassigned players
            // But hide them if they are placed on A DIFFERENT board.
            return matchesSearch && (matchesFilter || isUnassigned) && !isPlacedElsewhere;
        }

        // General sidebar behavior
        return matchesSearch && matchesFilter && !isPlacedElsewhere && !isPlacedInCurrentBoard;
    });

    const maxCols = Math.max(6, ...categories.map(cat => {
        const config = customConfig[cat.id || ''] || { rows: 0, cols: 0 };
        return config.cols || 6;
    }));

    const sortedColumnIndices = useMemo(() => {
        const indices = Array.from({ length: colCount }, (_, i) => i);
        if (columnOrder.length === 0) return indices;
        
        // Ensure consistency with colCount
        const validOrder = columnOrder.filter(idx => idx < colCount);
        const missing = indices.filter(idx => !validOrder.includes(idx));
        return [...validOrder, ...missing];
    }, [colCount, columnOrder]);

    const addCol = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setColCountExtra(prev => {
            const newVal = prev + 1;
            saveArrangementSettings(rowCountExtra, newVal);
            return newVal;
        });
    };

    const removeCol = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setColCountExtra(prev => {
            if (colCount <= 1 && prev <= 0) return prev;
            const newVal = prev - 1;
            saveArrangementSettings(rowCountExtra, newVal);
            return newVal;
        });
    };

    const handleUpdateColumnName = async (index: number) => {
        const nameToSave = tempColumnName.trim() || `Slot ${index + 1}`;
        const newNames = { ...columnNames, [index]: nameToSave };
        setColumnNames(newNames);
        await saveArrangementSettings(rowCountExtra, colCountExtra, newNames, cellStyles, columnStyles);
        setEditingColumnIndex(null);
        setTempColumnName('');
        showNotification("Column renamed", "success");
    };

    const handleColumnColor = async (index: number, color: string) => {
        const newStyles = { ...columnStyles, [index]: color };
        setColumnStyles(newStyles);
        await saveArrangementSettings(rowCountExtra, colCountExtra, columnNames, cellStyles, newStyles);
    };

    const addRow = async (atIndex?: number) => {
        if (!id) return;
        setIsSaving(true);
        try {
            const targetOrder = atIndex !== undefined 
                ? (sortedCategories[atIndex]?.order || atIndex)
                : (sortedCategories.length > 0 ? (sortedCategories[sortedCategories.length - 1].order || 0) + 10 : 10);

            // Shift orders if inserting
            if (atIndex !== undefined) {
                const batch = db.batch();
                sortedCategories.forEach((cat, idx) => {
                    if (idx >= atIndex) {
                        batch.update(db.collection('auctions').doc(id).collection('categories').doc(cat.id!), {
                            order: (cat.order || idx * 10) + 10
                        });
                    }
                });
                await batch.commit();
            }

            const name = `New Category ${categories.length + 1}`;
            const ref = await db.collection('auctions').doc(id).collection('categories').add({
                name,
                basePrice: 3000,
                requiredPlayers: 6,
                minPerTeam: 1,
                maxPerTeam: 2,
                bidIncrement: 100,
                slabs: [],
                order: targetOrder,
                createdAt: Date.now()
            });
            
            // Set for editing immediately
            setEditingCategoryId(ref.id);
            setTempCategoryName(name);
            setIsEditingName(true);
            
            showNotification("Category added. You can rename it now.", "success");
        } catch (err) {
            console.error(err);
            showNotification("Failed to add category", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const removeRow = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (markedRowIndex !== null && sortedCategories[markedRowIndex]) {
            handleDeleteCategory(sortedCategories[markedRowIndex].id || '');
            setMarkedRowIndex(null);
        } else {
            setIsDeletingCategory(prev => !prev);
            setIsAddingCategory(false);
        }
    };

    const [modalType, setModalType] = useState<'CATEGORY'>('CATEGORY');

    const handleCrudSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id) return;
        setIsSaving(true);
        try {
            const batch = db.batch();
            const col = 'categories';
            const catRef = editItem.id 
                ? db.collection('auctions').doc(id).collection(col).doc(editItem.id)
                : db.collection('auctions').doc(id).collection(col).doc();

            if (editItem.id) {
                // Propagation logic for renaming
                const oldCategory = categories.find(c => c.id === editItem.id);
                if (oldCategory && oldCategory.name !== editItem.name) {
                    const oldName = oldCategory.name;
                    const newName = editItem.name;
                    const oldPrefix = oldName.substring(0, 3).toUpperCase();
                    const newPrefix = newName.substring(0, 3).toUpperCase();

                    // 1. Update players
                    players.filter(p => p.category === oldName).forEach(p => {
                        batch.update(db.collection('auctions').doc(id).collection('players').doc(String(p.id)), {
                            category: newName,
                            updatedAt: Date.now()
                        });
                    });

                    // 2. Update arrangement drafts
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
                batch.set(catRef, editItem);
                await batch.commit();
                showNotification("Category updated successfully", "success");
            } else {
                await db.collection('auctions').doc(id).collection('categories').add({
                    ...editItem,
                    createdAt: Date.now()
                });
                showNotification("Category added successfully", "success");
            }
            setShowModal(false);
        } catch (err) {
            console.error(err);
            showNotification("Failed to save category", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteCategory = async (catId: string) => {
        const targetId = catId || categoryToDelete;
        if (!id || !targetId) {
            showNotification("Please select a category to delete", "error");
            return;
        }

        const category = categories.find(c => c.id === targetId);
        const categoryName = category?.name;
        
        // Removed window.confirm as the selection UI is the confirmation step
        // and browser dialogs can be blocked in iframes.

        setIsSaving(true);
        try {
            // 1. Reset all players assigned to this category (using a default empty value)
            if (categoryName) {
                const playersToReset = players.filter(p => p.category === categoryName);
                if (playersToReset.length > 0) {
                    const batch = db.batch();
                    playersToReset.forEach(p => {
                        const pRef = db.collection('auctions').doc(id).collection('players').doc(String(p.id));
                        batch.update(pRef, { category: '' }); // Reset to empty/unassigned
                    });
                    await batch.commit();
                }
            }

            // 2. Delete category and draft documents
            // We use a Promise.all to ensure both are tried or handled
            await Promise.all([
                db.collection('auctions').doc(id).collection('categories').doc(targetId).delete(),
                db.collection('auctions').doc(id).collection('arrangementDrafts').doc(targetId).delete()
            ]);
            
            setIsDeletingCategory(false);
            setCategoryToDelete(null);
            showNotification(`Category ${categoryName || ''} deleted permanently`, "success");
        } catch (err) {
            console.error("Delete Category Error:", err);
            showNotification("Failed to delete category permanently. Check permissions.", "error");
        } finally {
            setIsSaving(false);
            setConfirmAction(null);
        }
    };

    const handleUpdateCategoryNameById = async (catId: string, newName: string) => {
        if (!id || !newName.trim()) return;
        const category = categories.find(c => c.id === catId);
        if (!category) return;
        const oldName = category.name;
        if (newName === oldName) {
            setEditingCategoryId(null);
            setIsEditingName(false);
            return;
        }

        setIsSaving(true);
        try {
            const oldPrefix = oldName.substring(0, 3).toUpperCase();
            const newPrefix = newName.substring(0, 3).toUpperCase();

            const batch = db.batch();

            // 1. Update category name in Firestore
            const catRef = db.collection('auctions').doc(id).collection('categories').doc(catId);
            batch.update(catRef, { name: newName });

            // 2. Update all players belonging to this category in the main players collection
            const playersToUpdate = players.filter(p => p.category === oldName);
            playersToUpdate.forEach(p => {
                const pRef = db.collection('auctions').doc(id).collection('players').doc(String(p.id));
                batch.update(pRef, { category: newName });
            });

            // 3. Update all arrangement drafts to reflect the new category name in slots
            const draftsSnap = await db.collection('auctions').doc(id).collection('arrangementDrafts').get();
            
            draftsSnap.docs.forEach(draftDoc => {
                const draftData = draftDoc.data();
                const draftSlots = draftData.slots || {};
                const draftCategory = categories.find(c => c.id === draftDoc.id);
                const isThisDraftAllRounder = draftCategory?.name.toLowerCase() === 'allrounder';
                
                let changed = false;
                const updatedDraftSlots: { [key: string]: CategoryArrangementSlot } = {};

                Object.entries(draftSlots).forEach(([slotId, slot]: [string, any]) => {
                    let newSlotId = slotId;
                    const newSlot = { ...slot };

                    if (slot.category === oldName) {
                        newSlot.category = newName;
                        changed = true;
                    }

                    if (draftDoc.id === catId && oldPrefix !== newPrefix && !isThisDraftAllRounder) {
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

            await batch.commit();

            // Update local state
            setPlayers(prev => prev.map(p => p.category === oldName ? { ...p, category: newName } : p));
            setCategories(prev => prev.map(c => c.id === catId ? { ...c, name: newName } : c));
            
            // Update allSlots local state
            const newAllSlots = { ...allSlots };
            Object.keys(newAllSlots).forEach(cid => {
                const slots = newAllSlots[cid];
                const updatedSlots: { [key: string]: CategoryArrangementSlot } = {};
                Object.entries(slots).forEach(([sid, s]) => {
                    let newSid = sid;
                    const newS = { ...s };
                    if (s.category === oldName) newS.category = newName;
                    if (cid === catId && oldPrefix !== newPrefix) {
                        if (sid.startsWith(oldPrefix)) newSid = sid.replace(oldPrefix, newPrefix);
                    }
                    updatedSlots[newSid] = newS;
                });
                newAllSlots[cid] = updatedSlots;
            });
            setAllSlots(newAllSlots);
            if (activeCategory === catId) setSlots(newAllSlots[catId]);

            setEditingCategoryId(null);
            setIsEditingName(false);
            showNotification("Category renamed successfully", "success");
        } catch (err) {
            console.error(err);
            showNotification("Failed to rename category", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateCategoryName = async () => {
        if (!editingCategoryId || !tempCategoryName.trim()) {
            setEditingCategoryId(null);
            setIsEditingName(false);
            return;
        }
        await handleUpdateCategoryNameById(editingCategoryId, tempCategoryName);
        setEditingCategoryId(null);
        setIsEditingName(false);
        setTempCategoryName("");
    };

    if (loading) return (
        <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-zinc-950' : 'bg-gray-50'}`}>
            <Loader2 className={`w-10 h-10 animate-spin ${isDark ? 'text-accent' : 'text-blue-600'}`} />
        </div>
    );

    return (
        <div className={`h-screen flex flex-col font-sans selection:bg-accent/30 selection:text-accent overflow-hidden ${isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-gray-50 text-gray-900'}`}>
            {/* Header */}
            <header className={`border-b z-50 backdrop-blur-xl shrink-0 ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white/80 border-gray-200'}`}>
                <div className="container mx-auto px-4 h-14 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => navigate(`/admin/auction/${id}/manage`)}
                            className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all active:scale-95 ${isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-700' : 'bg-white border-gray-200 text-gray-400 hover:text-gray-900 hover:bg-gray-50'}`}
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                        <div>
                            <h1 className={`text-base font-black uppercase tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Category Arrangement</h1>
                            <p className={`text-[8px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-accent' : 'text-blue-600'}`}>Visual Player Board Builder</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleUndo}
                            disabled={history.length === 0}
                            className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest disabled:opacity-30 transition-all ${isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white' : 'bg-white border-gray-200 text-gray-400 hover:text-gray-900'}`}
                        >
                            <Undo className="w-3.5 h-3.5" /> Undo
                        </button>
                        <button 
                            onClick={handleReset}
                            className="btn-golden px-3 py-1.5 rounded-lg text-[10px]"
                        >
                            <RotateCcw className="w-3.5 h-3.5" /> Reset
                        </button>
                        <button 
                            onClick={handleSave}
                            disabled={isSaving}
                            className="btn-golden px-4 py-1.5 rounded-lg text-[10px]"
                        >
                            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save Draft
                        </button>
                        
                        <div className="relative">
                            <button 
                                onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                                disabled={isExporting}
                                className="btn-golden px-4 py-1.5 rounded-lg text-[10px] flex items-center gap-2"
                            >
                                {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} 
                                Export {selectedCategoryIds.size > 0 ? `(${selectedCategoryIds.size})` : ''}
                                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDownloadMenu ? 'rotate-180' : ''}`} />
                            </button>

                            {showDownloadMenu && (
                                <div className={`absolute right-0 mt-2 w-72 rounded-3xl shadow-2xl border backdrop-blur-2xl z-[200] animate-in fade-in zoom-in-95 duration-200 overflow-hidden ${isDark ? 'bg-zinc-900/98 border-white/10' : 'bg-white/98 border-gray-100'}`}>
                                    <div className="p-4 border-b border-white/10 flex items-center justify-between">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-500">Pick Categories</h4>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => setSelectedCategoryIds(new Set(categories.map(c => c.id!)))}
                                                className="text-[9px] font-bold uppercase text-zinc-500 hover:text-white transition-colors"
                                            >
                                                All
                                            </button>
                                            <button 
                                                onClick={() => setSelectedCategoryIds(new Set())}
                                                className="text-[9px] font-bold uppercase text-zinc-500 hover:text-white transition-colors"
                                            >
                                                None
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="max-h-60 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                                        {sortedCategories.map(cat => (
                                            <button 
                                                key={cat.id}
                                                onClick={() => toggleCategorySelection(cat.id!)}
                                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${
                                                    selectedCategoryIds.has(cat.id!)
                                                    ? (isDark ? 'bg-accent/20 text-accent border border-accent/30' : 'bg-blue-50 text-blue-600 border border-blue-200')
                                                    : (isDark ? 'text-zinc-500 hover:bg-zinc-800' : 'text-gray-500 hover:bg-gray-50')
                                                }`}
                                            >
                                                <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                                                    selectedCategoryIds.has(cat.id!)
                                                    ? (isDark ? 'bg-accent border-accent' : 'bg-blue-600 border-blue-600')
                                                    : (isDark ? 'bg-zinc-950 border-zinc-700' : 'bg-white border-gray-200')
                                                }`}>
                                                    {selectedCategoryIds.has(cat.id!) && <Check className={`w-3 h-3 ${isDark ? 'text-zinc-950' : 'text-white'}`} />}
                                                </div>
                                                <span className="truncate">{cat.name}</span>
                                            </button>
                                        ))}
                                    </div>

                                    <div className={`p-4 border-t border-white/10 space-y-2 ${isDark ? 'bg-zinc-950/50' : 'bg-gray-50/50'}`}>
                                        <p className="text-[9px] font-black uppercase text-zinc-500 tracking-widest mb-3">Choose Format</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button 
                                                onClick={handleExportExcel}
                                                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all bg-green-600/10 text-green-500 border border-green-500/20 hover:bg-green-600 hover:text-white`}
                                            >
                                                <LayoutGrid className="w-3.5 h-3.5" /> Excel
                                            </button>
                                            <button 
                                                onClick={handleExportPDF}
                                                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all bg-red-600/10 text-red-500 border border-red-500/20 hover:bg-red-600 hover:text-white`}
                                            >
                                                <Trophy className="w-3.5 h-3.5" /> PDF
                                            </button>
                                        </div>
                                        <button 
                                            onClick={handleExport}
                                            className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isDark ? 'bg-zinc-800 text-zinc-400 hover:text-white' : 'bg-white border text-gray-500 hover:text-blue-600'}`}
                                        >
                                            <Palette className="w-3.5 h-3.5" /> Save as Image
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>
            
            <DndContext 
                sensors={sensors}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="flex-1 overflow-hidden">
                    <div className="w-full h-full p-4 flex flex-col lg:flex-row gap-4">
                        {/* Left Panel: Player Pool */}
                        <aside className="w-full lg:w-48 flex-shrink-0 flex flex-col h-full overflow-hidden">
                            <div className={`flex-1 flex flex-col border rounded-2xl p-2 gap-2 overflow-hidden ${isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-gray-200 shadow-xl'}`}>
                                <div className="flex items-center justify-between shrink-0">
                                    <h2 className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>Player Pool</h2>
                                    <span className={`px-1 py-0.5 rounded text-[8px] font-black ${isDark ? 'bg-zinc-800 text-zinc-500' : 'bg-gray-100 text-gray-400'}`}>{filteredPlayers.length}</span>
                                </div>
    
                                <div className="space-y-2 shrink-0">
                                    <div className="relative">
                                        <Search className={`absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`} />
                                        <input 
                                            type="text" 
                                            placeholder="Search..."
                                            value={search}
                                            onChange={e => setSearch(e.target.value)}
                                            className={`w-full border rounded-lg pl-8 pr-2 py-1.5 text-[10px] font-bold outline-none transition-all ${isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-accent/50' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500/50'}`}
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                        <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Filter Category</label>
                                        <div className="flex flex-wrap gap-2 overflow-y-auto max-h-32 custom-scrollbar p-1">
                                            <button 
                                                onClick={() => setFilterCategory('ALL')}
                                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${
                                                    filterCategory === 'ALL' 
                                                    ? 'bg-blue-600 text-white border-2 border-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.4)] scale-105 z-10' 
                                                    : (isDark ? 'bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white' : 'bg-white border border-gray-200 text-gray-500 hover:text-blue-600')
                                                }`}
                                            >
                                                All
                                            </button>
                                            {categories.map(c => (
                                                <button 
                                                    key={c.id}
                                                    onClick={() => setFilterCategory(c.name)}
                                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${
                                                        filterCategory === c.name 
                                                        ? 'bg-amber-500 text-black border-2 border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.4)] scale-105 z-10' 
                                                        : (isDark ? 'bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white' : 'bg-white border border-gray-200 text-gray-500 hover:text-amber-600')
                                                    }`}
                                                >
                                                    {c.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
    
                                <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar min-h-0">
                                    {filteredPlayers.map(player => (
                                        <DraggablePlayer 
                                            key={player.id} 
                                            player={player} 
                                            isPlaced={Object.values(slots).some(s => s.playerId === player.id)}
                                        />
                                    ))}
                                    {filteredPlayers.length === 0 && (
                                        <div className="py-12 text-center">
                                            <p className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-zinc-600' : 'text-gray-400'}`}>No players found</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </aside>
    
                        {/* Right Panel: Table */}
                        <main className="flex-1 flex flex-col gap-1.5 overflow-hidden">
                            {/* Category Selection Title */}
                            <div className="flex items-center justify-between shrink-0">
                                <h2 className={`text-xl font-black uppercase tracking-tighter italic ${isDark ? 'text-white' : 'text-blue-600'}`}>
                                    All Categories Master Board
                                </h2>
                            </div>
    
                            {/* Controls */}
                            <div className="flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-2">
                                    <h3 className={`text-sm font-black uppercase tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>{isAllCategories ? 'All Categories' : currentCategory?.name} Board</h3>
                                    <div className={`h-3 w-[1px] ${isDark ? 'bg-zinc-800' : 'bg-gray-200'}`}></div>
                                    <p className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
                                        {Object.keys(slots).length} / {rowCount * colCount} Slots
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {isDeletingCategory && isAllCategories && (
                                        <div className={`flex flex-col gap-2 p-3 rounded-2xl border-2 animate-in slide-in-from-right-4 duration-500 overflow-hidden max-w-xl ${isDark ? 'bg-zinc-900 border-zinc-700/50' : 'bg-white border-blue-100'}`}>
                                            <div className="flex items-center justify-between px-1">
                                                <p className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Choose Category to Delete</p>
                                                <button 
                                                    onClick={() => setIsDeletingCategory(false)}
                                                    className={`p-1 rounded-md transition-all ${isDark ? 'hover:bg-zinc-800 text-zinc-500 hover:text-white' : 'hover:bg-gray-100 text-gray-400 hover:text-gray-900'}`}
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {sortedCategories.map(cat => (
                                                    <button 
                                                        key={cat.id}
                                                        onClick={() => {
                                                            handleDeleteCategory(cat.id || '');
                                                            setIsDeletingCategory(false);
                                                        }}
                                                        className={`group relative px-4 py-2 rounded-xl border-2 flex items-center gap-2 transition-all ${isDark ? 'bg-zinc-800/50 border-zinc-800 hover:border-red-500/50 hover:bg-red-500/10' : 'bg-gray-50 border-gray-100 hover:border-red-500/50 hover:bg-red-50'}`}
                                                    >
                                                        <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${isDark ? 'text-zinc-400 group-hover:text-red-400' : 'text-gray-600 group-hover:text-red-600'}`}>{cat.name}</span>
                                                        <Trash2 className={`w-3 h-3 transition-colors ${isDark ? 'text-zinc-600 group-hover:text-red-500' : 'text-gray-300 group-hover:text-red-500'}`} />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <div className={`flex border rounded-xl overflow-hidden ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'}`}>
                                        <div className={`flex items-center gap-2 px-3 py-2 border-r ${isDark ? 'border-zinc-800' : 'border-gray-200'}`}>
                                            <input 
                                                type="checkbox"
                                                id="continuous-numbering"
                                                checked={continuousNumbering}
                                                onChange={(e) => setContinuousNumbering(e.target.checked)}
                                                className={`w-3.5 h-3.5 rounded border transition-all cursor-pointer ${isDark ? 'bg-zinc-950 border-zinc-700 text-amber-500 focus:ring-amber-500/20' : 'bg-gray-50 border-gray-300 text-blue-600 focus:ring-blue-500/20'}`}
                                            />
                                            <label htmlFor="continuous-numbering" className={`text-[10px] font-black uppercase tracking-widest cursor-pointer ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
                                                Cont #
                                            </label>
                                        </div>
                                        <button 
                                            onClick={() => addRow()}
                                            className={`px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all border-r flex items-center gap-2 ${isDark ? 'text-zinc-400 hover:text-accent hover:bg-zinc-800 border-zinc-800' : 'text-gray-500 hover:text-blue-600 hover:bg-gray-50 border-gray-200'}`}
                                            title="Add New Row (Category)"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            <span>Add Row</span>
                                        </button>
                                        <div className="relative">
                                            {!isDeletingCategory ? (
                                                <button 
                                                    onClick={(e) => removeRow(e)}
                                                    className={`px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${isDark ? 'text-zinc-400 hover:text-red-500 hover:bg-zinc-800' : 'text-gray-500 hover:text-red-600 hover:bg-gray-50'}`}
                                                    title={markedRowIndex !== null ? `Delete ${sortedCategories[markedRowIndex]?.name}` : "Delete Row"}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                    <span>Delete Row</span>
                                                </button>
                                            ) : (
                                                <div className="flex items-center gap-2 p-1 bg-red-600/5 rounded-r-xl border-l border-red-100 flex-wrap max-w-xs md:max-w-md animate-in slide-in-from-right-2 duration-300">
                                                    <div className="flex flex-wrap gap-1 px-2">
                                                        {sortedCategories.map(cat => (
                                                            <button
                                                                key={cat.id}
                                                                onClick={() => {
                                                                    handleDeleteCategory(cat.id || '');
                                                                    setIsDeletingCategory(false);
                                                                }}
                                                                className="px-2 py-1 rounded-md text-[8px] font-black uppercase bg-red-600 text-white hover:bg-red-700 transition-all shadow-sm"
                                                            >
                                                                {cat.name}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setIsDeletingCategory(false);
                                                        }}
                                                        className={`p-1.5 rounded-md hover:bg-red-100 text-red-600 transition-all`}
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        </div>
                                    <div className={`flex border rounded-xl overflow-hidden ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'}`}>
                                        <button 
                                            onClick={(e) => addCol(e)}
                                            className={`px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all border-r flex items-center gap-2 ${isDark ? 'text-zinc-400 hover:text-accent hover:bg-zinc-800 border-zinc-800' : 'text-gray-500 hover:text-blue-600 hover:bg-gray-50 border-gray-200'}`}
                                            title="Add Extra Column"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            <span>Add Column</span>
                                        </button>
                                        <button 
                                            onClick={(e) => removeCol(e)}
                                            className={`px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${isDark ? 'text-zinc-400 hover:text-red-500 hover:bg-zinc-800' : 'text-gray-500 hover:text-red-600 hover:bg-gray-50'}`}
                                            title="Remove Last Column"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            <span>Remove Column</span>
                                        </button>
                                    </div>
                                    <button 
                                        onClick={() => setShowAutoFillModal(true)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-accent hover:border-accent/30' : 'bg-white border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-500/30'}`}
                                    >
                                        <Shuffle className="w-3.5 h-3.5" /> Auto Fill
                                    </button>
                                </div>
                            </div>
    
                            {/* The Board */}
                            <div className="flex-1 overflow-hidden min-h-0 relative">
                                <div 
                                    ref={boardRef}
                                    className={`h-full border-4 rounded-[2.5rem] p-4 md:p-8 shadow-2xl relative flex flex-col overflow-hidden ${isDark ? 'bg-zinc-950 border-accent/20' : 'bg-white border-blue-500/20'}`}
                                    style={{
                                        backgroundImage: isDark 
                                            ? 'radial-gradient(circle at 50% 50%, rgba(245, 158, 11, 0.08) 0%, transparent 70%)'
                                            : 'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.05) 0%, transparent 70%)'
                                    }}
                                >
                                    <div className="text-center mb-1 space-y-0.5 shrink-0">
                                        <h2 className={`text-xl md:text-2xl font-black uppercase tracking-tighter italic drop-shadow-[0_0_15px_rgba(245,158,11,0.3)] ${isDark ? 'text-transparent bg-clip-text bg-gradient-to-b from-accent/50 via-accent to-accent/70' : 'text-blue-600'}`}>
                                            {auctionName}
                                        </h2>
                                        <div className="flex items-center justify-center gap-4">
                                            <div className={`h-[1px] w-20 bg-gradient-to-r from-transparent via-accent/50 to-transparent`}></div>
                                            {isEditingName ? (
                                                <div className="flex items-center gap-2 animate-fade-in">
                                                    <input 
                                                        type="text"
                                                        value={tempCategoryName}
                                                        onChange={(e) => setTempCategoryName(e.target.value)}
                                                        className={`border rounded-lg px-3 py-1 text-sm font-black uppercase tracking-widest outline-none focus:ring-2 ${isDark ? 'bg-zinc-900 border-accent/50 text-accent ring-accent/20' : 'bg-white border-blue-500/50 text-blue-600 ring-blue-500/20'}`}
                                                        autoFocus
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleUpdateCategoryName();
                                                            if (e.key === 'Escape') setIsEditingName(false);
                                                        }}
                                                    />
                                                    <button 
                                                        onClick={handleUpdateCategoryName}
                                                        className={`p-1.5 rounded-lg transition-all ${isDark ? 'bg-accent text-zinc-950 hover:bg-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => setIsEditingName(false)}
                                                        className={`p-1.5 rounded-lg transition-all ${isDark ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button 
                                                    onClick={() => {
                                                        setTempCategoryName(currentCategory?.name || '');
                                                        setIsEditingName(true);
                                                    }}
                                                    className={`group flex items-center gap-3 px-4 py-1 rounded-full transition-all ${isDark ? 'hover:bg-accent/10' : 'hover:bg-blue-50'}`}
                                                >
                                                    <p className={`text-[10px] font-black uppercase tracking-[0.5em] ${isDark ? 'text-accent' : 'text-blue-600'}`}>{isAllCategories ? 'All Categories Master Board' : currentCategory?.name}</p>
                                                    <Pencil className={`w-3 h-3 transition-all ${isDark ? 'text-accent/30 group-hover:text-accent' : 'text-blue-300 group-hover:text-blue-600'}`} />
                                                </button>
                                            )}
                                            <div className={`h-[1px] w-20 bg-gradient-to-r from-transparent via-accent/50 to-transparent`}></div>
                                        </div>
                                    </div>
    
                                    {/* Table Wrapper */}
                                    <div className={`flex-1 overflow-auto rounded-3xl border-2 backdrop-blur-sm shadow-[0_0_50px_rgba(0,0,0,0.5)] relative min-h-0 ${isDark ? 'border-accent/30 bg-zinc-950/50' : 'border-blue-100 bg-white/50'}`}>
                                        <table className="w-full h-full border-collapse text-left table-fixed min-w-[800px]">
                                            <thead className="sticky top-0 z-30">
                                            <tr>
                                                <th className={`w-16 p-1 border text-[10px] font-black uppercase tracking-widest shine-effect sticky left-0 z-40 ${isDark ? 'bg-zinc-900 border-accent/20' : 'bg-gray-50 border-blue-100'}`}>
                                                    <span className="golden-text">{isAllCategories ? 'CATEGORY' : (isAllrounderTable ? 'CATEGORY' : '#')}</span>
                                                </th>
                                                <SortableContext items={sortedColumnIndices.map(i => `col-${i}`)} strategy={horizontalListSortingStrategy}>
                                                    {sortedColumnIndices.map((cIdx) => {
                                                        const name = columnNames[cIdx] || (columnNames as any)[String(cIdx)] || (isAllCategories ? `Slot ${cIdx + 1}` : `${cIdx + 1}`);
                                                        return (
                                                            <SortableColumnHeader 
                                                                key={cIdx} 
                                                                index={cIdx} 
                                                                name={name} 
                                                                isDark={isDark} 
                                                                onRename={(idx) => {
                                                                    setEditingColumnIndex(idx);
                                                                    setTempColumnName(columnNames[idx] || '');
                                                                }}
                                                                onColor={handleColumnColor}
                                                                bgColor={columnStyles[cIdx]}
                                                            />
                                                        );
                                                    })}
                                                </SortableContext>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <SortableContext items={sortedCategories.map(c => `row-${c.id}`)} strategy={verticalListSortingStrategy}>
                                                {Array.from({ length: rowCount }).map((_, rIdx) => {
                                                    const rowNum = rIdx + 1;
                                                    const currentCat = sortedCategories[rIdx];
                                                    const rowLabel = isAllCategories 
                                                        ? (currentCat?.name || `CAT_${rowNum}`) 
                                                        : (isAllrounderTable ? (sortedCategories[rIdx]?.name || `EXTRA_${rowNum}`) : `${prefix}${rowNum}`);
                                                    return (
                                                        <tr key={currentCat?.id || rIdx} className="hover:bg-accent/5 transition-colors group">
                                                            <SortableRowLabel 
                                                                cat={currentCat} 
                                                                rowLabel={rowLabel} 
                                                                isDark={isDark} 
                                                                isSelected={currentCat?.id ? selectedCategoryIds.has(currentCat.id) : false}
                                                                onToggleSelect={isAllCategories ? toggleCategorySelection : undefined}
                                                                className="p-1 text-[10px]"
                                                            />
                                                            
                                                            {isAllCategories ? (
                                                                sortedColumnIndices.map((cIdx) => {
                                                                    const slotNum = cIdx + 1;
                                                                    if (!currentCat) return <td key={cIdx} className="p-0.5" />;
                                                                    
                                                                    const catPrefix = currentCat.name.substring(0, 3).toUpperCase();
                                                                    const catConfig = customConfig[currentCat.id || ''] || { rows: 0, cols: 0 };
                                                                    const catCols = catConfig.cols || 6;
                                                                    
                                                                    const r = Math.ceil(slotNum / catCols);
                                                                    const c = ((slotNum - 1) % catCols) + 1;
                                                                    const slotId = `${catPrefix}${r}_${c}`;
                                                                    const catInstanceId = `${currentCat.id}:${slotId}`;
                                                                    const catSlots = allSlots[currentCat.id || ''] || {};
                                                                    const slotData = catSlots[slotId];
                                                                    const player = slotData ? players.find(p => String(p.id) === String(slotData.playerId)) : null;

                                                                    const calculatedIndex = getSlotIndex(rIdx, cIdx);
                                                                    const colColor = columnStyles[cIdx];
                                                                    const cellColor = cellStyles[catInstanceId];

                                                                    return (
                                                                        <td key={catInstanceId} className="p-0.5">
                                                                            <DroppableSlot 
                                                                                id={catInstanceId} 
                                                                                player={player} 
                                                                                onAction={handleAction} 
                                                                                index={calculatedIndex} 
                                                                                bgColor={cellColor || colColor}
                                                                            />
                                                                        </td>
                                                                    );
                                                                })
                                                            ) : (
                                                                sortedColumnIndices.map((cIdx) => {
                                                                    const col = cIdx + 1;
                                                                    const slotId = `${rowLabel}_${col}`;
                                                                    const isTarget = pendingSwap?.slotId === slotId;
                                                                    const slotData = slots[slotId];
                                                                    const player = slotData ? players.find(p => String(p.id) === String(slotData.playerId)) : null;
                                                                    const globalIndex = (rIdx * colCount) + cIdx;

                                                                    const colColor = columnStyles[cIdx];
                                                                    const cellColor = cellStyles[slotId];
                                                                    const calculatedIndex = getSlotIndex(rIdx, cIdx);

                                                                    return (
                                                                        <td key={slotId} className="p-0.5 relative">
                                                                            <DroppableSlot 
                                                                                id={slotId} 
                                                                                player={player} 
                                                                                onAction={handleAction} 
                                                                                index={calculatedIndex} 
                                                                                bgColor={cellColor || colColor}
                                                                            />
                                                                            {isTarget && (
                                                                                <div className={`absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 p-2 animate-fade-in ${isDark ? 'bg-zinc-950/95' : 'bg-white/95'}`}>
                                                                                    <p className={`text-[8px] font-black uppercase tracking-widest mb-1 ${isDark ? 'text-accent' : 'text-blue-600'}`}>Slot Occupied</p>
                                                                                    <div className="flex gap-2 w-full">
                                                                                        <button 
                                                                                            onClick={handleSwap}
                                                                                            className={`flex-1 text-[8px] font-black uppercase py-1.5 rounded-lg transition-colors ${isDark ? 'bg-accent text-zinc-950 hover:bg-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                                                                                        >
                                                                                            Swap
                                                                                        </button>
                                                                                        <button 
                                                                                            onClick={handleReplace}
                                                                                            className={`flex-1 text-[8px] font-black uppercase py-1.5 rounded-lg transition-colors ${isDark ? 'bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}
                                                                                        >
                                                                                            Replace
                                                                                        </button>
                                                                                    </div>
                                                                                    <button 
                                                                                        onClick={() => setPendingSwap(null)}
                                                                                        className={`text-[7px] font-bold uppercase ${isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-gray-400 hover:text-gray-600'}`}
                                                                                    >
                                                                                        Cancel
                                                                                    </button>
                                                                                </div>
                                                                            )}
                                                                        </td>
                                                                    );
                                                                })
                                                            )}
                                                        </tr>
                                                    );
                                                })}
                                            </SortableContext>
                                        </tbody>
                                    </table>
                                </div>

                                {/* Footer Branding */}
                                <div className="mt-12 flex items-center justify-between px-4">
                                    <div className="flex items-center gap-3">
                                        <div>
                                            <p className={`text-[11px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-accent' : 'text-blue-600'}`}>{auctionName}</p>
                                            <p className={`text-[8px] font-bold uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Official Tournament Board</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-[10px] font-black uppercase tracking-widest italic ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>Official Category Board</p>
                                        <p className={`text-[8px] font-bold uppercase tracking-widest mt-1 ${isDark ? 'text-zinc-600' : 'text-gray-400'}`}>Generated: {new Date().toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
            </div>

            {/* Drag Overlay */}
                <DragOverlay dropAnimation={{
                    sideEffects: defaultDropAnimationSideEffects({
                        styles: {
                            active: {
                                opacity: '0.5',
                            },
                        },
                    }),
                }}>
                    {activeDragId ? (
                        <div className={`flex items-center gap-3 p-3 rounded-xl border shadow-2xl scale-105 rotate-2 ${isDark ? 'bg-accent border-accent/50 text-zinc-950' : 'bg-blue-600 border-blue-500 text-white'}`}>
                             <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-zinc-950/20' : 'bg-white/20'}`}>
                                <User className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-black uppercase tracking-tight truncate">
                                    {players.find(p => `player-${p.id}` === activeDragId)?.name}
                                </p>
                            </div>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            {/* Hidden Export Board */}
            <div 
                ref={exportRef} 
                className="fixed left-[-9999px] top-0 w-max bg-zinc-950 p-20 opacity-0 pointer-events-none z-[-1] overflow-visible"
                style={{
                    backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(245, 158, 11, 0.1) 0%, transparent 80%)',
                    minWidth: 'fit-content'
                }}
            >
                {/* Header Branding */}
                <div className="flex flex-col items-center mb-12 border-b-4 border-amber-500/30 pb-10 w-full">
                    <div className="flex items-center gap-8">
                        {auctionLogo && (
                            <img src={auctionLogo} className="w-32 h-32 rounded-3xl object-contain bg-zinc-900 border-2 border-amber-500/30 p-3 shadow-2xl shadow-amber-500/20" referrerPolicy="no-referrer" />
                        )}
                        <div className="text-center">
                            <h2 className="text-8xl font-black text-white uppercase tracking-tighter leading-[0.8] mb-4">{auctionName}</h2>
                            <p className="text-amber-500 font-black tracking-[0.6em] text-2xl uppercase opacity-80">OFFICIAL CATEGORY BOARD</p>
                        </div>
                        {auctionLogo && (
                            <img src={auctionLogo} className="w-32 h-32 rounded-3xl object-contain bg-zinc-900 border-2 border-amber-500/30 p-3 shadow-2xl shadow-amber-500/20 opacity-0" referrerPolicy="no-referrer" />
                        )}
                    </div>
                </div>

                <div className="w-full space-y-8">
                    <div className="text-center">
                            <h2 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-500 to-amber-700 uppercase tracking-tighter italic drop-shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                                {isAllCategories ? 'ALL CATEGORIES' : currentCategory?.name}
                            </h2>
                        </div>

                        <div className="rounded-[3rem] border-4 border-amber-500/40 bg-zinc-950 shadow-[0_0_100px_rgba(0,0,0,0.9)] relative">
                            {/* Golden Glow Overlay */}
                            <div className="absolute inset-0 pointer-events-none border-[12px] border-amber-500/10 rounded-[3rem]"></div>
                            
                            <table className="w-max border-collapse relative z-10 min-w-full">
                                <thead>
                                    <tr className="bg-zinc-900/90">
                                        <th className="w-48 p-6 border border-amber-500/20 text-xl font-black text-amber-500 uppercase tracking-widest bg-gradient-to-b from-zinc-800 to-zinc-900 text-center">
                                            {isAllCategories ? 'CATEGORY' : (isAllrounderTable ? 'CATEGORY' : '#')}
                                        </th>
                                        {sortedColumnIndices.map((cIdx) => {
                                            const customName = columnNames[cIdx] || (columnNames as any)[String(cIdx)];
                                            const colColor = columnStyles[cIdx];
                                            return (
                                                <th 
                                                    key={cIdx} 
                                                    className="p-6 border border-amber-500/20 text-xl font-black text-amber-500 uppercase tracking-widest bg-gradient-to-b from-zinc-800 to-zinc-900 text-center min-w-[260px]"
                                                    style={{ backgroundColor: colColor ? `${colColor}aa` : undefined }}
                                                >
                                                    {customName || (isAllCategories ? `Slot ${cIdx + 1}` : (cIdx + 1))}
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody>
                                    {Array.from({ length: rowCount }).map((_, rIdx) => {
                                        const rowNum = rIdx + 1;
                                        const cat = sortedCategories[rIdx];
                                        const rowLabel = isAllCategories 
                                            ? (cat?.name || `CAT_${rowNum}`) 
                                            : (isAllrounderTable ? (cat?.name || `EXTRA_${rowNum}`) : `${prefix}${rowNum}`);
                                        return (
                                            <tr key={cat?.id || rIdx} className="hover:bg-amber-500/5 transition-colors">
                                                <td className="p-8 border border-amber-500/20 bg-zinc-900/40 text-center text-lg font-black text-amber-200 uppercase tracking-widest whitespace-nowrap leading-normal overflow-visible min-w-[200px]">
                                                    {rowLabel}
                                                </td>
                                                {isAllCategories ? (
                                                    sortedColumnIndices.map((cIdx) => {
                                                        const slotNum = cIdx + 1;
                                                        if (!cat) return (
                                                            <td key={cIdx} className="p-6 border border-amber-500/20 min-w-[260px]">
                                                                <div className="h-20 border border-dashed border-zinc-800 rounded-xl opacity-10"></div>
                                                            </td>
                                                        );
                                                        
                                                        const catPrefix = cat.name.substring(0, 3).toUpperCase();
                                                        const catConfig = customConfig[cat.id || ''] || { rows: 0, cols: 0 };
                                                        const catCols = catConfig.cols || 6;
                                                        
                                                        const r = Math.ceil(slotNum / catCols);
                                                        const c = ((slotNum - 1) % catCols) + 1;
                                                        const slotId = `${catPrefix}${r}_${c}`;
                                                        const catInstanceId = `${cat.id}:${slotId}`;
                                                        const catSlots = allSlots[cat.id || ''] || {};
                                                        const slotData = catSlots[slotId];
                                                        const player = slotData ? players.find(p => String(p.id) === String(slotData.playerId)) : null;
                                                        const isValid = player;
                                                        
                                                        const colColor = columnStyles[cIdx];
                                                        const cellColor = cellStyles[catInstanceId];

                                                        const calculatedIndex = getSlotIndex(rIdx, cIdx);

                                                        return (
                                                            <td 
                                                                key={`${cat.id}-${slotId}`} 
                                                                className="p-6 border border-amber-500/20 min-w-[260px] relative transition-all duration-300"
                                                                style={{ backgroundColor: cellColor ? cellColor : (colColor ? `${colColor}55` : undefined) }}
                                                            >
                                                                <div className="absolute top-2 left-2 text-[14px] font-black text-yellow-500 z-10 drop-shadow-md">#{calculatedIndex + 1}</div>
                                                                {isValid && player ? (
                                                                    <div className="flex items-center gap-4 p-4 rounded-2xl border-2 border-amber-500/30 bg-zinc-950/80 mt-4 min-h-[90px] overflow-visible">
                                                                        <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-amber-500/20 flex-shrink-0 shadow-lg">
                                                                            {player.photoUrl ? (
                                                                                <img src={player.photoUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                                            ) : (
                                                                                <div className="w-full h-full bg-zinc-800 flex items-center justify-center"><User className="w-6 h-6 text-zinc-600" /></div>
                                                                            )}
                                                                        </div>
                                                                        <div className="min-w-0 flex-1 overflow-visible">
                                                                            <p className="text-[13px] font-black text-white uppercase leading-normal overflow-visible py-1 tracking-tight">{player.name}</p>
                                                                            <p className="text-[10px] font-black text-amber-500/80 uppercase tracking-[0.2em] leading-normal">{player.role}</p>
                                                                        </div>
                                                                        {player.status === 'SOLD' && <CheckCircle className="w-4 h-4 text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]" />}
                                                                    </div>
                                                                ) : (
                                                                    <div className="h-20 border-2 border-dashed border-zinc-800 rounded-2xl flex items-center justify-center bg-zinc-900/20">
                                                                         <span className="text-3xl font-black text-zinc-800 opacity-20">{calculatedIndex + 1}</span>
                                                                    </div>
                                                                )}
                                                            </td>
                                                        );
                                                    })
                                                ) : (
                                                    sortedColumnIndices.map((cIdx) => {
                                                        const col = cIdx + 1;
                                                        const slotId = `${rowLabel}_${col}`;
                                                        const slotData = slots[slotId];
                                                        const player = slotData ? players.find(p => String(p.id) === String(slotData.playerId)) : null;
                                                        const calculatedIndex = getSlotIndex(rIdx, cIdx);
                                                        
                                                        const colColor = columnStyles[cIdx];
                                                        const cellColor = cellStyles[slotId];

                                                        return (
                                                            <td 
                                                                key={slotId} 
                                                                className="p-6 border border-amber-500/20 min-w-[260px] relative transition-all duration-300"
                                                                style={{ backgroundColor: cellColor ? cellColor : (colColor ? `${colColor}55` : undefined) }}
                                                            >
                                                                <div className="absolute top-2 left-2 text-[14px] font-black text-yellow-500 z-10 drop-shadow-md">#{calculatedIndex + 1}</div>
                                                                {player ? (
                                                                    <div className="flex items-center gap-4 p-4 rounded-2xl border-2 border-amber-500/30 bg-zinc-950/80 mt-4 min-h-[90px] overflow-visible">
                                                                        <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-amber-500/20 flex-shrink-0 shadow-lg">
                                                                            {player.photoUrl ? (
                                                                                <img src={player.photoUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                                            ) : (
                                                                                <div className="w-full h-full bg-zinc-800 flex items-center justify-center"><User className="w-6 h-6 text-zinc-600" /></div>
                                                                            )}
                                                                        </div>
                                                                        <div className="min-w-0 flex-1 overflow-visible">
                                                                            <p className="text-[13px] font-black text-white uppercase leading-normal overflow-visible py-1 tracking-tight">{player.name}</p>
                                                                            <p className="text-[10px] font-black text-amber-500/80 uppercase tracking-[0.2em] leading-normal">{player.role}</p>
                                                                        </div>
                                                                        {player.status === 'SOLD' && <CheckCircle className="w-4 h-4 text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]" />}
                                                                    </div>
                                                                ) : (
                                                                    <div className="h-20 border-2 border-dashed border-zinc-800 rounded-2xl flex items-center justify-center bg-zinc-900/20">
                                                                         <span className="text-3xl font-black text-zinc-800 opacity-20">{calculatedIndex + 1}</span>
                                                                    </div>
                                                                )}
                                                            </td>
                                                        );
                                                    })
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                {/* Footer Branding */}
                <div className="mt-20 pt-10 border-t-4 border-amber-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-2xl shadow-amber-500/40 border-4 border-white/20">
                            <Trophy className="w-14 h-14 text-zinc-950" />
                        </div>
                        <div>
                            <p className="text-5xl font-black text-white uppercase tracking-tighter leading-none mb-2">SM SPORTS</p>
                            <p className="text-lg font-black text-amber-500 uppercase tracking-[0.4em] opacity-80">OFFICIAL TOURNAMENT PARTNER</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-4xl font-black text-zinc-400 uppercase tracking-widest italic opacity-50">OFFICIAL CATEGORY BOARD</p>
                        <p className="text-lg font-black text-zinc-600 uppercase tracking-widest mt-2">
                            GENERATED: {new Date().toLocaleDateString()} • {new Date().toLocaleTimeString()}
                        </p>
                    </div>
                </div>
            </div>


            <style>{`
                .custom-scrollbar {
                    scrollbar-width: auto;
                    scrollbar-color: ${isDark ? '#facc15 #18181b' : '#2563eb #f1f5f9'};
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 16px;
                    height: 16px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: ${isDark ? '#18181b' : '#f1f5f9'};
                    border-radius: 12px;
                    border: 1px solid ${isDark ? '#3f3f46' : '#cbd5e1'};
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: ${isDark ? '#facc15' : '#2563eb'};
                    border-radius: 12px;
                    border: 4px solid ${isDark ? '#18181b' : '#f1f5f9'};
                    box-shadow: inset 0 0 10px rgba(0,0,0,0.2);
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: ${isDark ? '#fbbf24' : '#1d4ed8'};
                    border-width: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-corner {
                    background: transparent;
                }
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.3s ease-out forwards;
                }
            `}</style>

            {/* NOTIFICATION BANNER */}
            {notification && (
                <div className={`fixed top-4 right-4 z-[300] p-4 rounded-lg shadow-2xl border flex items-center gap-3 max-w-md animate-in fade-in slide-in-from-top-4 duration-300 ${
                    notification.type === 'error' 
                    ? (isDark ? 'bg-red-900/90 border-red-500 text-white' : 'bg-red-50 border-red-200 text-red-900') 
                    : (isDark ? 'bg-green-900/90 border-green-500 text-white' : 'bg-green-50 border-green-200 text-green-900')
                }`}>
                    {notification.type === 'error' ? <XCircle className="w-5 h-5 text-red-400" /> : <CheckCircle className="w-5 h-5 text-green-400" />}
                    <span className="text-sm font-bold">{notification.message}</span>
                    <button onClick={() => setNotification(null)} className="ml-auto hover:opacity-70"><X className="w-4 h-4"/></button>
                </div>
            )}

            {/* CUSTOM CONFIRMATION MODAL */}
            {confirmAction && (
                <div className="fixed inset-0 z-[310] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className={`rounded-3xl p-8 max-w-sm w-full shadow-2xl border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-100'}`}>
                        <div className={`flex items-center gap-4 mb-6 ${isDark ? 'text-accent' : 'text-blue-600'}`}>
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDark ? 'bg-accent/10' : 'bg-blue-50'}`}>
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <h3 className={`text-xl font-black uppercase tracking-tighter ${isDark ? 'text-zinc-100' : 'text-gray-900'}`}>{confirmAction.title}</h3>
                        </div>
                        <p className={`text-sm font-bold mb-8 leading-relaxed ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>{confirmAction.message}</p>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setConfirmAction(null)}
                                className={`flex-1 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'}`}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmAction.onConfirm}
                                className={`flex-1 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg ${isDark ? 'bg-accent hover:bg-white text-zinc-950 shadow-accent/20' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'}`}
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* SHARED CATEGORY MODAL */}
            {showModal && (
                <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className={`rounded-[2rem] shadow-2xl max-w-sm w-full overflow-hidden border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'}`}>
                        <div className={`p-6 flex justify-between items-center relative overflow-hidden ${isDark ? 'bg-zinc-800 text-accent' : 'bg-blue-600 text-white'}`}>
                            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                            <h3 className="text-lg font-black uppercase tracking-tight relative z-10">{editItem?.id ? 'Modify' : 'Initialize'} Category</h3>
                            <button onClick={() => setShowModal(false)} className="relative z-10 hover:rotate-90 transition-transform"><X className="w-6 h-6"/></button>
                        </div>
                        <form onSubmit={handleCrudSave} className="p-8 space-y-6">
                            <div>
                                <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ml-1 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Identity Name</label>
                                <input required className={`w-full border-2 rounded-xl px-4 py-3 font-bold outline-none transition-all ${isDark ? 'bg-zinc-950 border-zinc-800 text-white focus:border-accent/50' : 'bg-gray-50 border-gray-100 text-gray-700 focus:bg-white focus:border-blue-400'}`} value={editItem?.name || ''} onChange={e => setEditItem({...editItem, name: e.target.value})} />
                            </div>
                            
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ml-1 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Base Price (₹)</label>
                                        <input type="number" className={`w-full border-2 rounded-xl px-4 py-2.5 font-bold outline-none transition-all ${isDark ? 'bg-zinc-950 border-zinc-800 text-white focus:border-accent/50' : 'bg-gray-50 border-gray-100 text-gray-700 focus:bg-white focus:border-blue-400'}`} value={editItem?.basePrice || 0} onChange={e => setEditItem({...editItem, basePrice: Number(e.target.value)})} />
                                    </div>
                                    <div>
                                        <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ml-1 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Bid Increment (₹)</label>
                                        <input type="number" className={`w-full border-2 rounded-xl px-4 py-2.5 font-bold outline-none transition-all ${isDark ? 'bg-zinc-950 border-zinc-800 text-white focus:border-accent/50' : 'bg-gray-50 border-gray-100 text-gray-700 focus:bg-white focus:border-blue-400'}`} value={editItem?.bidIncrement || 0} onChange={e => setEditItem({...editItem, bidIncrement: Number(e.target.value)})} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ml-1 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Min / Team</label>
                                        <input type="number" className={`w-full border-2 rounded-xl px-4 py-2.5 font-bold outline-none transition-all ${isDark ? 'bg-zinc-950 border-zinc-800 text-white focus:border-accent/50' : 'bg-gray-50 border-gray-100 text-gray-700 focus:bg-white focus:border-blue-400'}`} value={editItem?.minPerTeam || 0} onChange={e => setEditItem({...editItem, minPerTeam: Number(e.target.value)})} />
                                    </div>
                                    <div>
                                        <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ml-1 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Max / Team</label>
                                        <input type="number" className={`w-full border-2 rounded-xl px-4 py-2.5 font-bold outline-none transition-all ${isDark ? 'bg-zinc-950 border-zinc-800 text-white focus:border-accent/50' : 'bg-gray-50 border-gray-100 text-gray-700 focus:bg-white focus:border-blue-400'}`} value={editItem?.maxPerTeam || 0} onChange={e => setEditItem({...editItem, maxPerTeam: Number(e.target.value)})} />
                                    </div>
                                </div>
                            </div>
                            <button type="submit" disabled={isSaving} className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2 ${isDark ? 'bg-accent hover:bg-white text-zinc-950' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle className="w-4 h-4"/>}
                                {editItem?.id ? 'Update Category' : 'Create Category'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* AUTO FILL SELECTION MODAL */}
            {showAutoFillModal && (
                <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className={`rounded-[2rem] shadow-2xl max-w-sm w-full overflow-hidden border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'}`}>
                        <div className={`p-6 flex justify-between items-center relative overflow-hidden ${isDark ? 'bg-zinc-800 text-accent' : 'bg-blue-600 text-white'}`}>
                            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                            <h3 className="text-lg font-black uppercase tracking-tight relative z-10">Auto Fill Settings</h3>
                            <button onClick={() => setShowAutoFillModal(false)} className="relative z-10 hover:rotate-90 transition-transform"><X className="w-6 h-6"/></button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="max-h-60 overflow-y-auto custom-scrollbar pr-2">
                                <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ml-1 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Select Source Category</label>
                                <div className="space-y-2">
                                    <button 
                                        onClick={() => setAutoFillSourceCategory('CURRENT')}
                                        className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all text-left ${autoFillSourceCategory === 'CURRENT' ? (isDark ? 'border-accent bg-accent/10 text-accent' : 'border-blue-600 bg-blue-50 text-blue-600') : (isDark ? 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700' : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200')}`}
                                    >
                                        <div className="min-w-0 pr-4">
                                            <p className="font-bold text-xs uppercase truncate">Current Category Players</p>
                                            <p className="text-[10px] opacity-70 italic truncate">({currentCategory?.name})</p>
                                        </div>
                                        {autoFillSourceCategory === 'CURRENT' && <Check className="w-4 h-4 shrink-0" />}
                                    </button>

                                    <button 
                                        onClick={() => setAutoFillSourceCategory('UNASSIGNED')}
                                        className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all text-left ${autoFillSourceCategory === 'UNASSIGNED' ? (isDark ? 'border-amber-500 bg-amber-500/10 text-amber-500' : 'border-amber-600 bg-amber-50 text-amber-600') : (isDark ? 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700' : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200')}`}
                                    >
                                        <div className="min-w-0 pr-4">
                                            <p className="font-bold text-xs uppercase truncate">Unassigned Players</p>
                                            <p className="text-[10px] opacity-70 italic truncate">(Players with no category)</p>
                                        </div>
                                        {autoFillSourceCategory === 'UNASSIGNED' && <Check className="w-4 h-4 shrink-0" />}
                                    </button>
                                    
                                    {categories.filter(c => c.id !== activeCategory).map(cat => (
                                        <button 
                                            key={cat.id}
                                            onClick={() => setAutoFillSourceCategory(cat.id || '')}
                                            className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all text-left ${autoFillSourceCategory === cat.id ? (isDark ? 'border-accent bg-accent/10 text-accent' : 'border-blue-600 bg-blue-50 text-blue-600') : (isDark ? 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700' : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200')}`}
                                        >
                                            <span className="font-bold text-xs uppercase truncate">{cat.name} Category Players</span>
                                            {autoFillSourceCategory === cat.id && <Check className="w-4 h-4 shrink-0" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <div className={`p-4 rounded-xl border flex items-start gap-3 ${isDark ? 'bg-amber-500/10 border-amber-500/20 text-amber-200/70' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                                <p className="text-[10px] font-medium leading-relaxed italic">The system will fetch unassigned players from the selected category and populate the empty slots on the current board.</p>
                            </div>

                            <button 
                                onClick={() => handleAutoFill(autoFillSourceCategory)} 
                                className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2 ${isDark ? 'bg-accent hover:bg-white text-zinc-950' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                            >
                                <Shuffle className="w-4 h-4"/>
                                Start Auto Fill
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CategoryArrangement;
