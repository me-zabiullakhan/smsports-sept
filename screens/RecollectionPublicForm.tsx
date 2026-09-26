
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../firebase';
import { RecollectionForm, RecollectionResponse, RecollectionFormField } from '../types';
import { 
    CheckCircle, 
    AlertTriangle, 
    Upload, 
    Calendar, 
    ChevronDown, 
    Loader2, 
    Info,
    Check
} from 'lucide-react';
import { compressImage } from '../utils';

const RecollectionPublicForm: React.FC = () => {
    const { auctionId, formId } = useParams<{ auctionId: string, formId: string }>();
    const [form, setForm] = useState<RecollectionForm | null>(null);
    const [loading, setLoading] = useState(true);
    const [responses, setResponses] = useState<{ [fieldId: string]: any }>({});
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [uploadingField, setUploadingField] = useState<string | null>(null);

    useEffect(() => {
        if (!auctionId || !formId) return;

        const fetchForm = async () => {
            try {
                const doc = await db.collection('auctions').doc(auctionId).collection('recollectionForms').doc(formId).get();
                if (doc.exists) {
                    const formData = doc.data() as RecollectionForm;
                    if (!formData.isEnabled) {
                        setError("This form is currently disabled by the organizer.");
                    } else {
                        setForm(formData);
                    }
                } else {
                    setError("Form not found.");
                }
            } catch (err: any) {
                setError("Error loading form: " + err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchForm();
    }, [auctionId, formId]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldId: string) => {
        if (e.target.files && e.target.files[0]) {
            setUploadingField(fieldId);
            try {
                const base64 = await compressImage(e.target.files[0]);
                setResponses(prev => ({ ...prev, [fieldId]: base64 }));
            } catch (err) {
                alert("Failed to process image");
            } finally {
                setUploadingField(null);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form) return;

        // Basic validation
        for (const field of form.fields) {
            if (field.required && !responses[field.id]) {
                alert(`${field.label} is required`);
                return;
            }
        }

        setSubmitting(true);
        try {
            await db.collection('recollectionResponses').add({
                formId,
                auctionId,
                playerName: responses['player_name'] || 'Unknown Player',
                playerMobile: responses['player_mobile'] || '',
                responses,
                submittedAt: Date.now()
            });
            setSubmitted(true);
        } catch (err: any) {
            alert("Submission failed: " + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">Loading Form...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center shadow-xl border border-red-100">
                    <div className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle className="w-10 h-10 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 mb-2">Notice</h2>
                    <p className="text-gray-600 mb-8 font-medium">{error}</p>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 text-slate-900">
                <div className="max-w-md w-full bg-white rounded-[2.5rem] p-10 text-center shadow-2xl border border-green-100 animate-fade-in">
                    <div className="w-24 h-24 bg-green-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 animate-bounce">
                        <CheckCircle className="w-12 h-12 text-green-500" />
                    </div>
                    <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter mb-4">Submission Successful</h2>
                    <p className="text-gray-500 font-medium leading-relaxed">
                        Thank you for providing the missing information. The data has been sent to the organizer.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-6 font-sans text-slate-900">
            <div className="max-w-xl mx-auto">
                {/* Branding or Header */}
                <div className="flex flex-col items-center mb-10 text-center">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl mb-4 flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <div className="text-white font-black text-2xl">SM</div>
                    </div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">{form?.title || 'Data Collection'}</h1>
                    {form?.note && (
                        <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-2xl flex gap-3 text-left">
                            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                            <p className="text-blue-900 text-sm font-semibold italic">{form.note}</p>
                        </div>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100">
                    {form?.fields.map((field) => (
                        <div key={field.id} className="space-y-2">
                            <label className="block text-sm font-black text-gray-700 uppercase tracking-widest ml-1">
                                {field.label} {field.required && <span className="text-red-500">*</span>}
                            </label>

                            {field.type === 'text' && (
                                <input 
                                    type="text"
                                    required={field.required}
                                    className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl p-4 outline-none transition-all font-bold text-gray-900 placeholder:text-gray-400 shadow-sm"
                                    placeholder={`Enter ${field.label.toLowerCase()}...`}
                                    value={responses[field.id] || ''}
                                    onChange={(e) => setResponses(prev => ({ ...prev, [field.id]: e.target.value }))}
                                />
                            )}

                            {field.type === 'textarea' && (
                                <textarea 
                                    required={field.required}
                                    className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl p-4 outline-none transition-all font-bold text-gray-900 placeholder:text-gray-400 shadow-sm min-h-[120px]"
                                    placeholder={`Enter ${field.label.toLowerCase()}...`}
                                    value={responses[field.id] || ''}
                                    onChange={(e) => setResponses(prev => ({ ...prev, [field.id]: e.target.value }))}
                                />
                            )}

                            {field.type === 'dropdown' && (
                                <div className="flex flex-wrap gap-3 pt-2">
                                    {field.options?.map(opt => (
                                        <button
                                            key={opt}
                                            type="button"
                                            onClick={() => setResponses(prev => ({ ...prev, [field.id]: opt }))}
                                            className={`px-5 py-3 rounded-xl border-2 font-bold transition-all flex items-center gap-2 ${
                                                responses[field.id] === opt
                                                ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20'
                                                : 'bg-white border-gray-100 text-gray-500 hover:border-blue-200'
                                            }`}
                                        >
                                            {responses[field.id] === opt && <Check className="w-4 h-4" />}
                                            {opt}
                                        </button>
                                    ))}
                                    {(!field.options || field.options.length === 0) && (
                                        <p className="text-[10px] font-black uppercase opacity-30 tracking-widest p-4 bg-gray-50 rounded-2xl w-full text-center border-2 border-dashed">No options available</p>
                                    )}
                                </div>
                            )}

                            {field.type === 'checkbox' && (
                                <div className="flex flex-wrap gap-4 pt-2">
                                    {field.options?.map(opt => (
                                        <button
                                            key={opt}
                                            type="button"
                                            onClick={() => {
                                                const currentOptions = Array.isArray(responses[field.id]) ? responses[field.id] : [];
                                                if (currentOptions.includes(opt)) {
                                                    setResponses(prev => ({ ...prev, [field.id]: currentOptions.filter((o: string) => o !== opt) }));
                                                } else {
                                                    setResponses(prev => ({ ...prev, [field.id]: [...currentOptions, opt] }));
                                                }
                                            }}
                                            className={`px-5 py-3 rounded-xl border-2 font-bold transition-all flex items-center gap-2 ${
                                                (responses[field.id] || []).includes(opt)
                                                ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20'
                                                : 'bg-white border-gray-100 text-gray-500 hover:border-blue-200'
                                            }`}
                                        >
                                            {(responses[field.id] || []).includes(opt) && <Check className="w-4 h-4" />}
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {field.type === 'date' && (
                                <div className="relative">
                                    <input 
                                        type="date"
                                        required={field.required}
                                        className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl p-4 outline-none transition-all font-bold text-gray-900 placeholder:text-gray-400 shadow-sm"
                                        value={responses[field.id] || ''}
                                        onChange={(e) => setResponses(prev => ({ ...prev, [field.id]: e.target.value }))}
                                    />
                                    <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                                </div>
                            )}

                            {field.type === 'photo' && (
                                <div className="space-y-4">
                                    {responses[field.id] ? (
                                        <div className="relative w-full aspect-video rounded-2xl overflow-hidden border-2 border-blue-500 shadow-lg group">
                                            <img src={responses[field.id]} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <button 
                                                    type="button"
                                                    onClick={() => setResponses(prev => ({ ...prev, [field.id]: null }))}
                                                    className="bg-white text-gray-900 px-6 py-3 rounded-xl font-black uppercase text-xs hover:bg-red-500 hover:text-white transition-all shadow-xl"
                                                >
                                                    Change Photo
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <label className={`w-full h-40 border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-gray-50 hover:border-blue-200 group ${uploadingField === field.id ? 'opacity-50 pointer-events-none' : ''}`}>
                                            {uploadingField === field.id ? (
                                                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                                            ) : (
                                                <div className="flex flex-col items-center">
                                                    <div className="w-14 h-14 bg-gray-50 group-hover:bg-blue-50 rounded-2xl flex items-center justify-center mb-3 transition-colors">
                                                        <Upload className="w-6 h-6 text-gray-400 group-hover:text-blue-500" />
                                                    </div>
                                                    <p className="text-sm font-black text-gray-400 group-hover:text-blue-500 uppercase tracking-widest">Select Photo</p>
                                                </div>
                                            )}
                                            <input 
                                                type="file" 
                                                accept="image/*" 
                                                className="hidden" 
                                                onChange={(e) => handleFileUpload(e, field.id)} 
                                            />
                                        </label>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}

                    <button 
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-black uppercase tracking-[0.2em] py-5 rounded-2xl shadow-xl shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-3 mt-8"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Submitting Details...
                            </>
                        ) : (
                            <>
                                Submit Details
                                <CheckCircle className="w-5 h-5" />
                            </>
                        )}
                    </button>
                </form>

                <p className="mt-8 text-center text-gray-400 text-[10px] font-black uppercase tracking-[0.3em]">
                    Powered by SM Sports Management System
                </p>
            </div>
        </div>
    );
};

export default RecollectionPublicForm;
