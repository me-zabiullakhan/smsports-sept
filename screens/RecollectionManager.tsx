
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { RecollectionForm, RecollectionResponse, RecollectionFormField } from '../types';
import { 
    Plus, 
    Trash2, 
    Save, 
    X, 
    Upload, 
    Settings, 
    ChevronDown, 
    Search, 
    CheckCircle, 
    Loader2, 
    ArrowLeft,
    Copy,
    ExternalLink,
    FileSpreadsheet,
    FileText,
    Download,
    Eye,
    Phone,
    PlusCircle,
    Info,
    Calendar,
    AlignLeft,
    ListChecks,
    Type,
    ToggleRight,
    ToggleLeft,
    ImageIcon,
    User,
    LayoutGrid
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useTheme } from '../contexts/ThemeContext';

const RecollectionManager: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const { id: auctionIdFromParams } = useParams<{ id: string }>();
    const id = auctionIdFromParams;
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [forms, setForms] = useState<RecollectionForm[]>([]);
    const [responses, setResponses] = useState<RecollectionResponse[]>([]);
    const [activeFormId, setActiveFormId] = useState<string | null>(null);
    const [editingForm, setEditingForm] = useState<Partial<RecollectionForm> | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'RESPONSES' | 'BUILDER'>('RESPONSES');

    useEffect(() => {
        if (!id) return;

        const unsubForms = db.collection('auctions').doc(id).collection('recollectionForms')
            .onSnapshot(snap => {
                const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as RecollectionForm));
                setForms(data);
                if (!activeFormId && data.length > 0) setActiveFormId(data[0].id);
                setLoading(false);
            });

        return () => unsubForms();
    }, [id, activeFormId]);

    useEffect(() => {
        if (!id || !activeFormId) return;

        const unsubResponses = db.collection('recollectionResponses')
            .where('formId', '==', activeFormId)
            .onSnapshot(snap => {
                const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as RecollectionResponse));
                setResponses(data);
            });

        return () => unsubResponses();
    }, [id, activeFormId]);

    const handleCreateNewForm = () => {
        const newForm: Partial<RecollectionForm> = {
            title: 'New Collection Form',
            note: 'Please provide the missing details requested below.',
            fields: [
                { id: 'player_name', label: 'Full Name', type: 'text', required: true },
                { id: 'player_mobile', label: 'Mobile Number', type: 'text', required: true }
            ],
            isEnabled: true,
            auctionId: id
        };
        setEditingForm(newForm);
        setViewMode('BUILDER');
    };

    const handleSaveForm = async () => {
        if (!id || !editingForm) return;
        setIsSaving(true);
        try {
            const formData = {
                ...editingForm,
                updatedAt: Date.now()
            };

            if (editingForm.id) {
                await db.collection('auctions').doc(id).collection('recollectionForms').doc(editingForm.id).update(formData);
            } else {
                const newDoc = db.collection('auctions').doc(id).collection('recollectionForms').doc();
                await newDoc.set({
                    ...formData,
                    id: newDoc.id,
                    createdAt: Date.now()
                });
                setActiveFormId(newDoc.id);
            }
            setViewMode('RESPONSES');
            setEditingForm(null);
        } catch (err: any) {
            alert("Save failed: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddField = () => {
        if (!editingForm) return;
        const newField: RecollectionFormField = {
            id: `field_${Date.now()}`,
            label: 'New Field',
            type: 'text',
            required: false,
            options: []
        };
        setEditingForm({
            ...editingForm,
            fields: [...(editingForm.fields || []), newField]
        });
    };

    const handleRemoveField = (fieldId: string) => {
        if (!editingForm) return;
        setEditingForm({
            ...editingForm,
            fields: (editingForm.fields || []).filter(f => f.id !== fieldId)
        });
    };

    const handleUpdateField = (fieldId: string, updates: Partial<RecollectionFormField>) => {
        if (!editingForm) return;
        setEditingForm({
            ...editingForm,
            fields: (editingForm.fields || []).map(f => f.id === fieldId ? { ...f, ...updates } : f)
        });
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert("Link copied to clipboard!");
    };

    const exportToExcel = () => {
        if (responses.length === 0) return;
        const activeForm = forms.find(f => f.id === activeFormId);
        if (!activeForm) return;

        const data = responses.map(res => {
            const row: any = {
                'Player Name': res.playerName || '-',
                'Mobile': res.playerMobile || '-',
                'Submitted At': new Date(res.submittedAt).toLocaleString()
            };
            activeForm.fields.forEach(field => {
                let val = res.responses[field.id];
                if (Array.isArray(val)) val = val.join(', ');
                if (field.type === 'photo') val = val ? 'PHOTO_UPLOADED' : 'NO_PHOTO';
                row[field.label] = val || '-';
            });
            return row;
        });

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Responses");
        XLSX.writeFile(wb, `${activeForm.title}_Responses.xlsx`);
    };

    const toggleFormStatus = async (form: RecollectionForm) => {
        try {
            await db.collection('auctions').doc(id!).collection('recollectionForms').doc(form.id).update({
                isEnabled: !form.isEnabled
            });
        } catch (err) {
            alert("Toggle failed");
        }
    };

    const handleDeleteForm = async (formId: string) => {
        if (!window.confirm("Are you sure you want to delete this form and all its responses?")) return;
        try {
            await db.collection('auctions').doc(id!).collection('recollectionForms').doc(formId).delete();
            // Responses are global, we might need a separate cleanup if needed.
        } catch (err) {
            alert("Delete failed");
        }
    };

    if (loading) {
        return (
            <div className={`min-h-screen ${isDark ? 'bg-zinc-950 text-white' : 'bg-gray-50 text-gray-900'} flex items-center justify-center p-6`}>
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                    <p className="font-black uppercase tracking-widest text-sm opacity-50">Loading Management...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`${embedded ? '' : 'min-h-screen'} ${isDark ? 'bg-zinc-950 text-white' : 'bg-gray-50 text-gray-900'} font-sans`}>
            {/* Top Navigation */}
            {!embedded && (
                <div className={`sticky top-0 z-40 backdrop-blur-md border-b flex items-center justify-between px-6 h-20 ${isDark ? 'bg-black/40 border-zinc-800' : 'bg-white/80 border-gray-100'}`}>
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => navigate(`/admin/auction/${id}/manage`)}
                            className={`p-3 rounded-2xl transition-all ${isDark ? 'hover:bg-zinc-900' : 'hover:bg-gray-100'}`}
                        >
                            <ArrowLeft className="w-5 h-5 text-blue-500" />
                        </button>
                        <div>
                            <h1 className="text-xl font-black uppercase tracking-tight">Recollection Forms</h1>
                            <p className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>Collect Missing Player Data</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button 
                            onClick={handleCreateNewForm}
                            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-lg shadow-blue-500/20"
                        >
                            <PlusCircle className="w-4 h-4" /> Create Form
                        </button>
                    </div>
                </div>
            )}

            <main className={`${embedded ? 'p-0' : 'p-8'} max-w-[1400px] mx-auto`}>
                {embedded && forms.length === 0 && (
                    <div className="flex items-center justify-between mb-8">
                        <div>
                             <h2 className="text-xl font-black uppercase">Recollection Systems</h2>
                             <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Create forms to gather missing player information</p>
                        </div>
                        <button 
                            onClick={handleCreateNewForm}
                            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-lg shadow-blue-500/20"
                        >
                            <PlusCircle className="w-4 h-4" /> Create First Form
                        </button>
                    </div>
                )}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Sidebar: Form List */}
                    <div className="col-span-1 space-y-4">
                        <div className={`p-4 rounded-[2rem] border min-h-[400px] ${isDark ? 'bg-zinc-900/50 border-zinc-800/50' : 'bg-white border-gray-100 shadow-sm'}`}>
                            <div className="flex items-center justify-between mb-6 px-2">
                                <h2 className="text-xs font-black uppercase tracking-widest opacity-50">Available Forms</h2>
                                <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black">{forms.length}</span>
                            </div>

                            <div className="space-y-3">
                                {forms.length === 0 ? (
                                    <div className="text-center py-12 opacity-30">
                                        <FileText className="w-10 h-10 mx-auto mb-2" />
                                        <p className="text-[10px] font-black uppercase">No forms created yet</p>
                                    </div>
                                ) : (
                                    forms.map((form) => (
                                        <button 
                                            key={form.id}
                                            onClick={() => {
                                                setActiveFormId(form.id);
                                                setViewMode('RESPONSES');
                                            }}
                                            className={`w-full text-left p-4 rounded-3xl transition-all group relative border ${
                                                activeFormId === form.id 
                                                ? (isDark ? 'bg-blue-600/10 border-blue-500/50 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-600')
                                                : (isDark ? 'bg-transparent border-transparent hover:bg-zinc-800' : 'bg-transparent border-transparent hover:bg-gray-50')
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <h3 className="text-sm font-black truncate pr-6">{form.title}</h3>
                                                {activeFormId === form.id && <ChevronDown className="w-4 h-4 flex-shrink-0" />}
                                            </div>
                                            <div className="flex items-center gap-2 opacity-50">
                                                <span className={`w-1.5 h-1.5 rounded-full ${form.isEnabled ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                                <span className="text-[9px] font-black uppercase tracking-widest">
                                                    {form.isEnabled ? 'Active' : 'Disabled'} • {form.fields.length} Fields
                                                </span>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="col-span-1 lg:col-span-3">
                        {activeFormId ? (
                            <div className="space-y-6">
                                {/* Form Top Actions */}
                                <div className={`p-6 rounded-[2.5rem] border flex flex-wrap items-center justify-between gap-6 ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                                    <div className="flex items-center gap-6">
                                        <div className="flex flex-col">
                                            <h2 className="text-xl font-black text-blue-600 uppercase tracking-tight">
                                                {forms.find(f => f.id === activeFormId)?.title}
                                            </h2>
                                            <div className="flex items-center gap-4 mt-1">
                                                <button 
                                                    onClick={() => copyToClipboard(`${window.location.origin}/recollect/${id}/${activeFormId}`)}
                                                    className="text-[10px] font-black flex items-center gap-1.5 uppercase tracking-widest text-blue-500 hover:text-blue-400 transition-colors"
                                                >
                                                    <Copy className="w-3 h-3" /> Copy Link
                                                </button>
                                                <a 
                                                    href={`/recollect/${id}/${activeFormId}`}
                                                    target="_blank"
                                                    className="text-[10px] font-black flex items-center gap-1.5 uppercase tracking-widest text-gray-400 hover:text-blue-500 transition-colors"
                                                >
                                                    <ExternalLink className="w-3 h-3" /> Preview
                                                </a>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <button 
                                            onClick={() => setViewMode(viewMode === 'RESPONSES' ? 'BUILDER' : 'RESPONSES')}
                                            className={`px-5 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] border transition-all ${
                                                viewMode === 'BUILDER' 
                                                ? (isDark ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20')
                                                : (isDark ? 'border-zinc-800 hover:bg-zinc-800 text-zinc-400' : 'border-gray-200 hover:bg-gray-50 text-gray-500')
                                            }`}
                                        >
                                            {viewMode === 'BUILDER' ? 'View Responses' : 'Form Settings'}
                                        </button>
                                        
                                        <div className="flex items-center gap-2 ml-4">
                                            {forms.find(f => f.id === activeFormId)?.isEnabled ? (
                                                <button 
                                                    onClick={() => toggleFormStatus(forms.find(f => f.id === activeFormId)!)}
                                                    className="p-3 bg-green-500/10 text-green-500 rounded-2xl hover:bg-green-500 hover:text-white transition-all"
                                                    title="Active"
                                                >
                                                    <ToggleRight className="w-5 h-5" />
                                                </button>
                                            ) : (
                                                <button 
                                                    onClick={() => toggleFormStatus(forms.find(f => f.id === activeFormId)!)}
                                                    className="p-3 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all"
                                                    title="Disabled"
                                                >
                                                    <ToggleLeft className="w-5 h-5" />
                                                </button>
                                            )}
                                            <div className="flex gap-3">
                                                {activeFormId && (
                                                    <>
                                                        <button 
                                                            onClick={() => {
                                                                const f = forms.find(f => f.id === activeFormId);
                                                                if (f) {
                                                                    setEditingForm(f);
                                                                    setViewMode(viewMode === 'BUILDER' ? 'RESPONSES' : 'BUILDER');
                                                                }
                                                            }}
                                                            className={`px-5 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 flex items-center gap-2 ${viewMode === 'BUILDER' ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' : (isDark ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-white border border-gray-100 text-gray-500 hover:bg-gray-50 shadow-sm')}`}
                                                        >
                                                            {viewMode === 'BUILDER' ? <FileSpreadsheet className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
                                                            {viewMode === 'BUILDER' ? 'View Responses' : 'Form Configuration'}
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteForm(activeFormId)}
                                                            className="p-3 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                                            title="Delete Form"
                                                        >
                                                            <Trash2 className="w-5 h-5" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Main Interaction Area */}
                                {viewMode === 'RESPONSES' ? (
                                    <div className="space-y-6 animate-fade-in">
                                        {/* Filters & Export */}
                                        <div className="flex items-center justify-between">
                                            <div className="relative flex-1 max-w-md">
                                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50" />
                                                <input 
                                                    className={`w-full pl-12 pr-4 py-4 rounded-3xl border text-sm font-bold outline-none transition-all shadow-inner ${isDark ? 'bg-zinc-900 border-zinc-800 focus:border-blue-500' : 'bg-white border-gray-100 focus:border-blue-500'}`}
                                                    placeholder="Search responses..."
                                                    value={searchQuery}
                                                    onChange={e => setSearchQuery(e.target.value)}
                                                />
                                            </div>
                                            <div className="flex gap-3">
                                                <button 
                                                    onClick={exportToExcel}
                                                    className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 shadow-lg ${isDark ? 'bg-green-600/20 text-green-500 hover:bg-green-600 hover:text-white border border-green-500/20' : 'bg-green-600 text-white hover:bg-green-700 shadow-green-500/20'}`}
                                                >
                                                    <FileSpreadsheet className="w-4 h-4" /> Export To Excel
                                                </button>
                                            </div>
                                        </div>

                                        {/* Response List */}
                                        <div className={`rounded-[3rem] border overflow-hidden ${isDark ? 'bg-zinc-900/40 border-zinc-800/80 shadow-2xl' : 'bg-white border-gray-100 shadow-xl'}`}>
                                            <div className="overflow-x-auto custom-scrollbar">
                                                <table className="w-full text-left border-collapse min-w-[800px]">
                                                    <thead>
                                                        <tr className={`border-b ${isDark ? 'border-zinc-800 bg-zinc-900/50' : 'border-gray-50 bg-gray-50/30'}`}>
                                                            <th className="p-8 text-[11px] font-black uppercase tracking-[0.2em] opacity-40">Participant Identity</th>
                                                            {forms.find(f => f.id === activeFormId)?.fields.map(field => (
                                                                <th key={field.id} className="p-8 text-[11px] font-black uppercase tracking-[0.2em] opacity-40 whitespace-nowrap">{field.label}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody className={`divide-y ${isDark ? 'divide-zinc-800/50' : 'divide-gray-50'}`}>
                                                        {responses.filter(res => 
                                                            res.playerName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                                            res.playerMobile?.toLowerCase().includes(searchQuery.toLowerCase())
                                                        ).length > 0 ? (
                                                            responses.filter(res => 
                                                                res.playerName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                                                res.playerMobile?.toLowerCase().includes(searchQuery.toLowerCase())
                                                            ).map((res) => (
                                                                <tr key={res.id} className={`transition-all ${isDark ? 'hover:bg-zinc-800/30' : 'hover:bg-blue-50/30'}`}>
                                                                    <td className="p-8">
                                                                        <div className="flex items-center gap-4">
                                                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm uppercase shadow-inner ${isDark ? 'bg-zinc-800 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                                                                                <User className="w-6 h-6 opacity-60" />
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-sm font-black uppercase tracking-tight mb-1">{res.playerName || 'P. Name'}</p>
                                                                                <div className="flex items-center gap-2">
                                                                                    <Phone className="w-3 h-3 opacity-30" />
                                                                                    <p className={`text-[10px] font-bold opacity-40 tracking-widest`}>{res.playerMobile || '000-000-0000'}</p>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    {forms.find(f => f.id === activeFormId)?.fields.map(field => (
                                                                        <td key={field.id} className="p-8 text-xs font-bold whitespace-pre-wrap">
                                                                            {field.type === 'photo' ? (
                                                                                res.responses[field.id] ? (
                                                                                    <div className="flex items-center gap-4">
                                                                                        <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-blue-500/20 shadow-lg cursor-pointer transition-transform hover:scale-110 active:scale-95">
                                                                                            <img src={res.responses[field.id]} className="w-full h-full object-cover" />
                                                                                        </div>
                                                                                        <a 
                                                                                            href={res.responses[field.id]} 
                                                                                            download={`${res.playerName}_${field.label}.jpg`}
                                                                                            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all shadow-md active:scale-90 ${isDark ? 'bg-zinc-800 text-blue-400 hover:bg-blue-500 hover:text-white' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20'}`}
                                                                                            title="Download Image"
                                                                                        >
                                                                                            <Download className="w-4 h-4" />
                                                                                        </a>
                                                                                    </div>
                                                                                ) : (
                                                                                    <span className="text-[10px] font-black uppercase opacity-20 tracking-widest">N/A</span>
                                                                                )
                                                                            ) : field.type === 'checkbox' ? (
                                                                                <div className="flex flex-wrap gap-1.5">
                                                                                    {(res.responses[field.id] || []).map((opt: string) => (
                                                                                        <span key={opt} className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm ${isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-400' : 'bg-white border-gray-100 text-gray-500'}`}>{opt}</span>
                                                                                    ))}
                                                                                    {(!res.responses[field.id] || res.responses[field.id].length === 0) && <span className="text-[10px] font-black uppercase opacity-20 tracking-widest">NONE</span>}
                                                                                </div>
                                                                            ) : (
                                                                                <p className="max-w-[200px] break-words uppercase tracking-wide opacity-80">{res.responses[field.id] || '-'}</p>
                                                                            )}
                                                                        </td>
                                                                    ))}
                                                                </tr>
                                                            ))
                                                        ) : (
                                                            <tr>
                                                                <td colSpan={100} className="p-20 text-center">
                                                                    <div className="flex flex-col items-center gap-4 opacity-20">
                                                                        <Search className="w-16 h-16" />
                                                                        <p className="text-xs font-black uppercase tracking-[0.3em]">No matching submissions found</p>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="animate-fade-in">
                                        {editingForm && (
                                            <div className={`p-8 rounded-[3rem] border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-100 shadow-xl'}`}>
                                                <div className="flex items-center justify-between mb-10">
                                                    <div className="flex items-center gap-4">
                                                        <div className="p-3 rounded-2xl bg-blue-600/10 text-blue-500">
                                                            <AlignLeft className="w-6 h-6" />
                                                        </div>
                                                        <div>
                                                            <h2 className="text-2xl font-black uppercase tracking-tight">Form Configuration</h2>
                                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mt-1">Design your player collection logic</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <button 
                                                            onClick={handleSaveForm}
                                                            disabled={isSaving}
                                                            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-3 px-10 py-5 rounded-3xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 shadow-xl shadow-blue-500/30"
                                                        >
                                                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                            {isSaving ? 'Processing...' : 'Deploy Updates'}
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="space-y-10">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                        <div className="space-y-3">
                                                            <label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-1">Form Title</label>
                                                            <input 
                                                                className={`w-full p-5 rounded-[1.5rem] border-2 font-bold outline-none transition-all ${isDark ? 'bg-black/20 border-zinc-800 focus:border-blue-500' : 'bg-gray-50 border-gray-100 focus:border-blue-500'}`}
                                                                value={editingForm.title || ''}
                                                                onChange={e => setEditingForm({ ...editingForm, title: e.target.value })}
                                                                placeholder="e.g. Missing Player Info"
                                                            />
                                                        </div>
                                                        <div className="space-y-3">
                                                            <label className="text-[10px] font-black uppercase tracking-widest opacity-50 ml-1">Header Note (Instructions)</label>
                                                            <textarea 
                                                                className={`w-full p-5 rounded-[1.5rem] border-2 font-bold outline-none transition-all min-h-[5.5rem] ${isDark ? 'bg-black/20 border-zinc-800 focus:border-blue-500' : 'bg-gray-50 border-gray-100 focus:border-blue-500'}`}
                                                                value={editingForm.note || ''}
                                                                onChange={e => setEditingForm({ ...editingForm, note: e.target.value })}
                                                                placeholder="Add instructions for players..."
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-6">
                                                        <div className="flex items-center justify-between">
                                                            <h3 className="text-xs font-black uppercase tracking-widest opacity-50">Form Fields</h3>
                                                            <button 
                                                                onClick={handleAddField}
                                                                className="text-xs font-black uppercase tracking-widest text-blue-500 flex items-center gap-2 hover:bg-blue-500/10 px-6 py-3 rounded-2xl transition-all"
                                                            >
                                                                <Plus className="w-4 h-4" /> Add Custom Field
                                                            </button>
                                                        </div>

                                                        <div className="space-y-4">
                                                            {editingForm.fields?.map((field, idx) => (
                                                                <div key={field.id} className={`p-8 rounded-[2.5rem] border animate-scale-up ${isDark ? 'bg-black/30 border-zinc-800/50' : 'bg-gray-50/50 border-gray-100 shadow-sm'}`}>
                                                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                                                                        <div className="md:col-span-1 text-center font-black text-xs opacity-20">#{idx + 1}</div>
                                                                        <div className="md:col-span-3">
                                                                            <input 
                                                                                className={`w-full bg-transparent p-2 border-b-2 font-black outline-none transition-all text-sm uppercase tracking-wide ${isDark ? 'border-zinc-800 focus:border-blue-500' : 'border-gray-200 focus:border-blue-500'}`}
                                                                                value={field.label}
                                                                                onChange={e => handleUpdateField(field.id, { label: e.target.value })}
                                                                                placeholder="Field Label"
                                                                            />
                                                                        </div>
                                                                        <div className="md:col-span-5">
                                                                            <div className={`flex flex-wrap gap-1 p-1 rounded-xl border ${isDark ? 'bg-black/40 border-zinc-800' : 'bg-white border-gray-100 shadow-inner'}`}>
                                                                                {[
                                                                                    { id: 'text', label: 'Short', icon: <Type className="w-3 h-3" /> },
                                                                                    { id: 'textarea', label: 'Long', icon: <AlignLeft className="w-3 h-3" /> },
                                                                                    { id: 'dropdown', label: 'Drop', icon: <ChevronDown className="w-3 h-3" /> },
                                                                                    { id: 'checkbox', label: 'Multi', icon: <ListChecks className="w-3 h-3" /> },
                                                                                    { id: 'date', label: 'Date', icon: <Calendar className="w-3 h-3" /> },
                                                                                    { id: 'photo', label: 'Photo', icon: <ImageIcon className="w-3 h-3" /> }
                                                                                ].map(type => (
                                                                                    <button
                                                                                        key={type.id}
                                                                                        type="button"
                                                                                        onClick={() => handleUpdateField(field.id, { type: type.id as any })}
                                                                                        className={`flex-1 flex flex-col items-center justify-center gap-1 p-1.5 rounded-lg text-[7px] font-black uppercase tracking-tight transition-all ${
                                                                                            field.type === type.id
                                                                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                                                                            : (isDark ? 'text-zinc-500 hover:text-white' : 'text-gray-400 hover:text-blue-600')
                                                                                        }`}
                                                                                    >
                                                                                        {type.icon}
                                                                                        {type.label}
                                                                                    </button>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                        <div className="md:col-span-2 flex items-center gap-2 justify-center">
                                                                            <label className="flex items-center gap-2 cursor-pointer group">
                                                                                <input 
                                                                                    type="checkbox" 
                                                                                    className="hidden"
                                                                                    checked={field.required}
                                                                                    onChange={e => handleUpdateField(field.id, { required: e.target.checked })}
                                                                                />
                                                                                <div className={`w-8 h-5 rounded-full transition-all relative ${field.required ? 'bg-red-500' : 'bg-gray-300'}`}>
                                                                                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${field.required ? 'left-4' : 'left-1'}`} />
                                                                                </div>
                                                                                <span className={`text-[8px] font-black uppercase tracking-widest ${field.required ? 'text-red-500' : 'opacity-30'}`}>Req</span>
                                                                            </label>
                                                                        </div>
                                                                        <div className="md:col-span-1 flex justify-end">
                                                                            <button 
                                                                                onClick={() => handleRemoveField(field.id)}
                                                                                className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                                                                            >
                                                                                <Trash2 className="w-4 h-4" />
                                                                            </button>
                                                                        </div>
                                                                    </div>

                                                                    {(field.type === 'dropdown' || field.type === 'checkbox') && (
                                                                        <div className="mt-8 pt-8 border-t border-zinc-800/10">
                                                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 block mb-4">Field Options (Enter one per line)</label>
                                                                            <textarea 
                                                                                className={`w-full p-6 rounded-[1.5rem] border-2 font-bold outline-none transition-all min-h-[120px] text-xs leading-relaxed ${isDark ? 'bg-black/20 border-zinc-800/50 focus:border-blue-500' : 'bg-white border-gray-100 focus:border-blue-500'}`}
                                                                                value={field.options?.join('\n') || ''}
                                                                                onChange={e => handleUpdateField(field.id, { options: e.target.value.split('\n').filter(o => o.trim()) })}
                                                                                placeholder="Option 1&#10;Option 2&#10;Option 3..."
                                                                            />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="h-[60vh] flex flex-col items-center justify-center opacity-20">
                                <LayoutGrid className="w-20 h-20 mb-6" />
                                <h2 className="text-3xl font-black uppercase tracking-tighter">Select a form to manage</h2>
                                <p className="text-sm font-bold mt-2">Create various collection forms for your participants</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default RecollectionManager;
