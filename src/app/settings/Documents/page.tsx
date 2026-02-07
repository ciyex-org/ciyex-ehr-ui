'use client';

import { getEnv } from "@/utils/env";
import { useEffect, useState, KeyboardEvent } from 'react';
import AdminLayout from '@/app/(admin)/layout';
import { fetchWithAuth } from '@/utils/fetchWithAuth';

const API_BASE = getEnv("NEXT_PUBLIC_API_URL") ?? 'http://localhost:8080';

const ALL_FILE_TYPES = ['JPG', 'PNG', 'PDF', 'DOCX', 'XLS', 'XLSX', 'TXT', 'CSV', 'ZIP', 'RAR'];
const FILE_TYPES = Array.from(new Set(ALL_FILE_TYPES));

// --- Default categories ---
const DEFAULT_CATEGORY_NAMES = [
    'Advance Directive',
    'CCD',
    'CCDA',
    'CCR',
    'Communication - Eye',
    'Encounters - Eye',
    'FHIR Export Document',
    'Imaging - Eye',
    'Invoices',
    'Lab Report',
    'Medical Record',
    'Onsite Portal',
    'Patient Information',
];

type Section = 'categories' | 'filetypes' | 'uploads';

interface CategoryRow {
    id: number;
    name: string;
    enabled: boolean;
}

interface ToggleProps {
    checked: boolean;
    onChange: () => void;
    id: string;
    disabled?: boolean;
}

type ApiResponse<T> = {
    success: boolean;
    message?: string | null;
    data?: T;
};

type BackendCategory = { name: string; active: boolean };

type SettingsDto = {
    orgId?: number;
    maxUploadSizeMB: number;
    enableAudio: boolean;
    encryptionEnabled?: boolean;
    allowedFileTypes: string[];
    categories: BackendCategory[];
};

// ---------- helpers ----------
const parseMb = (s: string) => {
    const n = parseInt(String(s).replace(/[^\d]/g, ''), 10);
    return Number.isFinite(n) && n > 0 ? n : 50;
};
const formatMb = (n: number) => `${n} MB`;

const safeParseJSON = <T,>(str: string | null, fallback: T): T => {
    if (!str) return fallback;
    try {
        return JSON.parse(str) as T;
    } catch {
        return fallback;
    }
};

// Merge backend categories with defaults
const mergeWithDefaultCategories = (incoming: BackendCategory[] | undefined | null): CategoryRow[] => {
    const byKey = new Map<string, BackendCategory>();
    (incoming || []).forEach((c) => {
        if (!c?.name) return;
        byKey.set(c.name.trim().toLowerCase(), c);
    });

    const defaultSet = new Set(DEFAULT_CATEGORY_NAMES.map((n) => n.toLowerCase()));
    const rows: CategoryRow[] = [];

    DEFAULT_CATEGORY_NAMES.forEach((name) => {
        const found = byKey.get(name.toLowerCase());
        rows.push({
            id: rows.length + 1,
            name,
            enabled: !!found?.active,
        });
    });

    (incoming || []).forEach((c) => {
        const key = c.name.trim().toLowerCase();
        if (!defaultSet.has(key)) {
            rows.push({
                id: rows.length + 1,
                name: c.name,
                enabled: !!c.active,
            });
        }
    });

    return rows;
};

/** ToggleSwitch */
const ToggleSwitch = ({ checked, onChange, id, disabled }: ToggleProps) => (
    <label
        htmlFor={id}
        className={`relative inline-flex items-center ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
        <input
            id={id}
            type="checkbox"
            className="sr-only"
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            role="switch"
            aria-checked={checked}
        />
        <div
            className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                checked ? 'bg-green-500 dark:bg-green-500' : 'bg-slate-300 dark:bg-slate-600'
            }`}
        >
            <span
                className={`absolute top-[2px] left-[2px] h-5 w-5 rounded-full bg-white border border-slate-300 dark:border-slate-500 shadow transform transition-transform duration-200 ${
                    checked ? 'translate-x-5' : ''
                }`}
            />
        </div>
    </label>
);

export default function DocumentSettingsPage() {
    const [activeSection, setActiveSection] = useState<Section>('categories');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [savedFlash, setSavedFlash] = useState(false);

    const [categories, setCategories] = useState<CategoryRow[]>(
        DEFAULT_CATEGORY_NAMES.map((name, idx) => ({ id: idx + 1, name, enabled: false })),
    );
    const [newCategory, setNewCategory] = useState('');
    const [addError, setAddError] = useState<string | null>(null);

    const [fileTypes, setFileTypes] = useState<Record<string, boolean>>(
        Object.fromEntries(FILE_TYPES.map((t) => [t, false])),
    );

    const [uploadSettings, setUploadSettings] = useState({ maxSize: '50 MB', audio: false, encrypt: false });
    const [editing, setEditing] = useState({ categories: false, filetypes: false, uploads: false });

    // Auto-hide success banner
    useEffect(() => {
        if (!message) return;
        const t = setTimeout(() => setMessage(null), 2000);
        return () => clearTimeout(t);
    }, [message]);

    // Load settings
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetchWithAuth(`${API_BASE}/api/document-settings`, {
                    method: 'GET',
                    cache: 'no-store',
                });
                const payload: ApiResponse<SettingsDto> = await res.json();
                if (!payload.success || !payload.data) throw new Error(payload.message || 'Failed to load settings');

                const data = payload.data;
                setCategories(mergeWithDefaultCategories(data.categories));

                const enabled = new Set((data.allowedFileTypes || []).map((s) => s.toUpperCase()));
                setFileTypes(Object.fromEntries(FILE_TYPES.map((t) => [t, enabled.has(t)])));

                const audioFromApi = !!data.enableAudio || enabled.has('MP3');
                setUploadSettings({
                    maxSize: formatMb(Math.max(1, data.maxUploadSizeMB || 50)),
                    audio: audioFromApi,
                    encrypt: !!data.encryptionEnabled,
                });
            } catch (e: unknown) {
                const err = e as Error;
                setError(err.message || 'Error loading settings');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    // Save settings
    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        setError(null);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        try {
            const body: SettingsDto = {
                maxUploadSizeMB: parseMb(uploadSettings.maxSize),
                enableAudio: uploadSettings.audio,
                encryptionEnabled: uploadSettings.encrypt,
                allowedFileTypes: Object.entries(fileTypes)
                    .filter(([, enabled]) => enabled)
                    .map(([type]) => type),
                categories: categories.map((c) => ({ name: c.name.trim(), active: !!c.enabled })),
            };

            const res = await fetchWithAuth(`${API_BASE}/api/document-settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: controller.signal,
            });
            const payload: ApiResponse<SettingsDto> = await res.json();
            if (!payload.success || !payload.data) throw new Error(payload.message || 'Failed to save');

            const data = payload.data;
            setCategories(mergeWithDefaultCategories(data.categories));

            const enabled = new Set((data.allowedFileTypes || []).map((s) => s.toUpperCase()));
            setFileTypes(Object.fromEntries(FILE_TYPES.map((t) => [t, enabled.has(t)])));

            const audio = !!data.enableAudio || enabled.has('MP3');
            setUploadSettings({
                maxSize: formatMb(Math.max(1, data.maxUploadSizeMB || 50)),
                audio,
                encrypt: !!data.encryptionEnabled,
            });

            setMessage('Settings saved');
            setSavedFlash(true);
            setTimeout(() => setSavedFlash(false), 1400);

            setEditing({ categories: false, filetypes: false, uploads: false });
        } catch (e: unknown) {
            if (e instanceof DOMException && e.name === "AbortError") {
                setError("Save timed out — please try again.");
            } else if (e instanceof Error) {
                setError(e.message || "Failed to save");
            } else {
                setError("Failed to save");
            }
        }
        finally {
            clearTimeout(timeout);
            setSaving(false);
        }
    };

    // Add category
    const addCategory = async () => {
        if (!editing.categories) return;
        const name = newCategory.trim();
        if (!name) {
            setAddError('Please enter a category name');
            setTimeout(() => setAddError(null), 1400);
            return;
        }
        const exists = categories.some((c) => c.name.toLowerCase() === name.toLowerCase());
        if (exists) {
            setAddError('Category already exists');
            setTimeout(() => setAddError(null), 1400);
            return;
        }

        try {
            const res = await fetchWithAuth(
                `${API_BASE}/api/document-settings/categories/${encodeURIComponent(name)}/true`,
                { method: 'POST' },
            );
            const payload: ApiResponse<BackendCategory[]> = await res.json();
            if (!payload.success || !payload.data) throw new Error(payload.message || 'Failed to add category');

            setCategories(mergeWithDefaultCategories(payload.data));
            setNewCategory('');
            setAddError(null);
        } catch (e: unknown) {
            const err = e as Error;
            setAddError(err.message || 'Failed to add category');
            setTimeout(() => setAddError(null), 2000);
        }
    };

    const onAddKey = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') addCategory();
    };

    const toggleCategory = (id: number) => {
        setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c)));
    };
    const renameCategory = (id: number, name: string) => {
        setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
    };

    // ------------------- Render -------------------
    return (
        <AdminLayout>
            <div
                           className={`min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 to-slate-100 text-slate-900
                               dark:from-slate-900 dark:to-slate-950 dark:text-slate-100`}
                       >
                           <div className="max-w-6xl mx-auto">
                               {/* Top bar: Tabs + Save */}
                               <div className="flex items-center justify-between gap-3 flex-nowrap mb-6 overflow-x-auto scrollbar-hide">
                                   <div className="flex bg-white dark:bg-slate-800/70 rounded-xl shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 p-1 whitespace-nowrap">
                                       {(['categories', 'filetypes', 'uploads'] as Section[]).map((section) => (
                                           <button
                                               key={section}
                                               onClick={() => setActiveSection(section)}
                                               className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                                                   activeSection === section
                                                       ? 'bg-sky-200 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200'
                                                       : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                                               }`}
                                           >
                                               {section.charAt(0).toUpperCase() + section.slice(1)}
                                           </button>
                                       ))}
                                   </div>

                                   <button
                                       onClick={handleSave}
                                       disabled={saving || loading}
                                       className={`save-btn px-5 py-2 rounded-lg font-medium shadow transition-colors
                                     bg-sky-600 hover:bg-sky-500 text-white
                                     dark:bg-sky-500 dark:hover:bg-sky-400 disabled:opacity-60`}
                                   >
                                       {saving ? 'Saving…' : savedFlash ? 'Saved!' : 'Save Changes'}
                                   </button>
                               </div>

                               {error && (
                                   <div className="mb-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-3 rounded-lg ring-1 ring-red-200 dark:ring-red-900">
                                       {error}
                                   </div>
                               )}
                               {message && (
                                   <div className="mb-4 text-sm text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/30 p-3 rounded-lg ring-1 ring-green-200 dark:ring-green-800">
                                       {message}
                                   </div>
                               )}

                               {/* Content */}
                               <div className="space-y-6">
                                   {/* Categories Card */}
                                   {activeSection === 'categories' && (
                                       <div className="rounded-2xl p-6 shadow-lg bg-white/95 ring-1 ring-slate-200 dark:bg-slate-800/80 dark:ring-slate-700">
                                           <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
                                               <div>
                                                   <h3 className="font-semibold text-slate-900 dark:text-slate-100">Categories</h3>
                                                   <p className="text-sm text-slate-500 dark:text-slate-400">Create and manage document categories</p>
                                               </div>

                                               <div className="flex items-center gap-2">
                                                   <input
                                                       type="text"
                                                       value={newCategory}
                                                       onChange={(e) => setNewCategory(e.target.value)}
                                                       onKeyDown={onAddKey}
                                                       placeholder="Category name"
                                                       disabled={!editing.categories || loading}
                                                       className={`w-56 px-3 py-2 rounded-lg border text-slate-900 dark:text-slate-100 placeholder-slate-400 ${
                                                           editing.categories
                                                               ? 'bg-slate-50 border-slate-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 dark:bg-slate-900 dark:border-slate-600 dark:focus:ring-sky-400 dark:focus:border-sky-400'
                                                               : 'bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
                                                       } disabled:opacity-60`}
                                                   />
                                                   <button
                                                       type="button"
                                                       onClick={addCategory}
                                                       disabled={!editing.categories || loading}
                                                       className="px-4 py-2 rounded-lg shadow text-white transition-colors bg-green-600 hover:bg-green-500 disabled:bg-slate-300 dark:disabled:bg-slate-700"
                                                   >
                                                       + Add
                                                   </button>
                                                   <button
                                                       type="button"
                                                       onClick={() => setEditing((prev) => ({ ...prev, categories: !prev.categories }))}
                                                       className="px-3 py-2 rounded-lg text-sm transition-colors ring-1 ring-slate-300 hover:bg-slate-50 dark:ring-slate-600 dark:hover:bg-slate-700/60"
                                                   >
                                                       {editing.categories ? 'Done' : 'Edit'}
                                                   </button>
                                               </div>
                                           </div>

                                           {addError && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{addError}</p>}

                                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                               {categories.map((cat) => (
                                                   <div
                                                       key={`${cat.id}-${cat.name}`}
                                                       className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4 rounded-xl ring-1 ring-slate-200 hover:ring-sky-300 dark:ring-slate-700 dark:hover:ring-sky-500/60 transition-colors"
                                                   >
                                                       {editing.categories ? (
                                                           <input
                                                               value={cat.name}
                                                               onChange={(e) => renameCategory(cat.id, e.target.value)}
                                                               className="min-w-0 w-full max-w-[44ch] px-3 py-2 text-sm rounded-md bg-slate-50 border border-slate-300 text-slate-900 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100 dark:focus:ring-sky-400 dark:focus:border-sky-400 truncate"
                                                           />
                                                       ) : (
                                                           <span className="min-w-0 max-w-[60ch] truncate font-medium text-slate-900 dark:text-slate-100">
                                     {cat.name}
                                   </span>
                                                       )}

                                                       <ToggleSwitch
                                                           checked={cat.enabled}
                                                           onChange={() => toggleCategory(cat.id)}
                                                           id={`category-${cat.id}`}
                                                           disabled={!editing.categories || loading}
                                                       />
                                                   </div>
                                               ))}
                                           </div>
                                       </div>
                                   )}

                                   {/* File Types Card */}
                                   {activeSection === 'filetypes' && (
                                       <div className="rounded-2xl p-6 shadow-lg bg-white/95 ring-1 ring-slate-200 dark:bg-slate-800/80 dark:ring-slate-700">
                                           <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
                                               <div>
                                                   <h3 className="font-semibold text-slate-900 dark:text-slate-100">Allowed File Types</h3>
                                                   <p className="text-sm text-slate-500 dark:text-slate-400">Toggle which file types users can upload</p>
                                               </div>
                                               <button
                                                   type="button"
                                                   onClick={() => setEditing((prev) => ({ ...prev, filetypes: !prev.filetypes }))}
                                                   className="px-3 py-2 rounded-lg text-sm transition-colors ring-1 ring-slate-300 hover:bg-slate-50 dark:ring-slate-600 dark:hover:bg-slate-700/60"
                                               >
                                                   {editing.filetypes ? 'Done' : 'Edit'}
                                               </button>
                                           </div>

                                           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                               {FILE_TYPES.map((type) => (
                                                   <div
                                                       key={type}
                                                       className="flex flex-col items-center p-3 rounded-lg text-center ring-1 ring-slate-200 hover:ring-sky-300 dark:ring-slate-700 dark:hover:ring-sky-500/60 transition-colors"
                                                   >
                                                       <div className="w-[45px] h-[45px] rounded-md flex items-center justify-center mb-2 bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200">
                                                           <span className="text-[12px] font-extrabold">{type}</span>
                                                       </div>
                                                       <ToggleSwitch
                                                           checked={!!fileTypes[type]}
                                                           onChange={() => setFileTypes((prev) => ({ ...prev, [type]: !prev[type] }))}
                                                           id={`filetype-${type}`}
                                                           disabled={!editing.filetypes || loading}
                                                       />
                                                   </div>
                                               ))}
                                           </div>

                                           <p className="text-xs text-slate-500 mt-4">
                                               Note: <strong>MP3</strong> is controlled by <strong>Enable Audio Uploads</strong> in Upload Settings.
                                           </p>
                                       </div>
                                   )}

                                   {/* Uploads Card */}
                                   {activeSection === 'uploads' && (
                                       <div className="rounded-2xl p-6 shadow-lg bg-white/95 ring-1 ring-slate-200 dark:bg-slate-800/80 dark:ring-slate-700">
                                           <div className="flex items-center justify-between mb-5">
                                               <div>
                                                   <h3 className="font-semibold text-slate-900 dark:text-slate-100">Upload Settings</h3>
                                                   <p className="text-sm text-slate-500 dark:text-slate-400">Configure file upload preferences</p>
                                               </div>
                                               <button
                                                   type="button"
                                                   onClick={() => setEditing((prev) => ({ ...prev, uploads: !prev.uploads }))}
                                                   className="px-3 py-2 rounded-lg text-sm transition-colors ring-1 ring-slate-300 hover:bg-slate-50 dark:ring-slate-600 dark:hover:bg-slate-700/60"
                                               >
                                                   {editing.uploads ? 'Done' : 'Edit'}
                                               </button>
                                           </div>

                                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                               <div className="p-5 rounded-xl ring-1 ring-slate-200 dark:ring-slate-700">
                                                   <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-3">Maximum File Size</h4>
                                                   <select
                                                       value={uploadSettings.maxSize}
                                                       onChange={(e) => setUploadSettings({ ...uploadSettings, maxSize: e.target.value })}
                                                       className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-600 dark:focus:ring-sky-400 dark:focus:border-sky-400 disabled:opacity-60 disabled:cursor-not-allowed"
                                                       disabled={!editing.uploads || loading}
                                                   >
                                                       {['25 MB', '50 MB', '100 MB', '150 MB', '250 MB'].map((size) => (
                                                           <option key={size} value={size}>
                                                               {size}
                                                           </option>
                                                       ))}
                                                   </select>
                                               </div>

                                               <div className="p-5 rounded-xl ring-1 ring-slate-200 dark:ring-slate-700 flex items-center justify-between">
                                                   <div>
                                                       <h4 className="font-medium text-slate-900 dark:text-slate-100">Enable Audio Uploads</h4>
                                                       <p className="text-sm text-slate-500 dark:text-slate-400">Allow users to upload audio files (MP3)</p>
                                                   </div>
                                                   <ToggleSwitch
                                                       checked={uploadSettings.audio}
                                                       onChange={() => setUploadSettings({ ...uploadSettings, audio: !uploadSettings.audio })}
                                                       id="audio-uploads"
                                                       disabled={!editing.uploads || loading}
                                                   />
                                               </div>

                                               {/* NEW: Encryption toggle */}
                                               <div className="p-5 rounded-xl ring-1 ring-slate-200 dark:ring-slate-700 flex items-center justify-between">
                                                   <div>
                                                       <h4 className="font-medium text-slate-900 dark:text-slate-100">Encrypt Stored Files</h4>
                                                       <p className="text-sm text-slate-500 dark:text-slate-400">
                                                           Enable server-side encryption for uploaded documents
                                                       </p>
                                                   </div>
                                                   <ToggleSwitch
                                                       checked={uploadSettings.encrypt}
                                                       onChange={() => setUploadSettings({ ...uploadSettings, encrypt: !uploadSettings.encrypt })}
                                                       id="encrypt-files"
                                                       disabled={!editing.uploads || loading}
                                                   />
                                               </div>
                                           </div>
                                       </div>
                                   )}
                               </div>
                           </div>

                           <style jsx global>{`
                     input:focus,
                     textarea:focus,
                     select:focus {
                       outline: none !important;
                     }
                   `}</style>

                           {/* Global utility styles */}
                           <style jsx global>{`
                     .scrollbar-hide {
                       -ms-overflow-style: none;
                       scrollbar-width: none;
                     }
                     .scrollbar-hide::-webkit-scrollbar {
                       display: none;
                     }
                   `}</style>
                       </div>
        </AdminLayout>
    );
}