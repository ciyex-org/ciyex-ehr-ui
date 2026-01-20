"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import AdminLayout from "@/app/(admin)/layout";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { createPortal } from "react-dom";

/* ---------- Config ---------- */
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

/* ---------- Types ---------- */
type Row = {
    id?: string | number; // DB primary key -> used in PUT path
    option_id: string; // business/visible option id (payload: optionId)
    title: string;
    order: number; // payload: seq
    def: boolean; // payload: isDefault
    active: boolean; // payload: activity (1/0)
    notes: string;
    codes: string; // payload: codes; if numeric, also used as optionValue
    _cid?: string; // stable client-only id for React keys (prevents remount on edits)
};

type UnknownRecord = Record<string, unknown>;

/* ---------- Helpers ---------- */
function uniqueCaseInsensitive(values: string[]): string[] {
    const map = new Map<string, string>();
    for (const raw of values) {
        const v = (raw ?? "").trim();
        if (!v) continue;
        const key = v.toLowerCase();
        if (!map.has(key)) map.set(key, v);
    }
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
}

const asString = (v: unknown): string => String(v ?? "");
const asNumber = (v: unknown): number => {
    const n = Number(v as number | string);
    return Number.isFinite(n) ? n : 0;
};
const asBool = (v: unknown): boolean => {
    if (typeof v === "boolean") return v;
    if (typeof v === "number") return v !== 0;
    const s = String(v ?? "").trim().toLowerCase();
    return s === "true" || s === "1" || s === "y" || s === "yes";
};



function extractListIdsFromResponseText(text: string): string[] {
    try {
        const data = JSON.parse(text) as unknown;

        if (Array.isArray(data)) {
            const listIds = (data as UnknownRecord[])
                .map((x) => asString(x["listId"] ?? x["list_id"] ?? ""))
                .filter(Boolean);
            return Array.from(new Set(listIds)).sort();
        }

        if (data && typeof data === "object") {
            const obj = data as UnknownRecord;
            // Check for data, items, or results array
            const arr = Array.isArray(obj.data) 
                ? (obj.data as UnknownRecord[])
                : Array.isArray(obj.items) 
                ? (obj.items as UnknownRecord[]) 
                : Array.isArray(obj.results)
                ? (obj.results as UnknownRecord[])
                : [];
            
            if (arr.length) {
                const listIds = arr
                    .map((x) => asString(x["listId"] ?? x["list_id"] ?? ""))
                    .filter(Boolean);
                return Array.from(new Set(listIds)).sort();
            }
        }
    } catch {
        return [];
    }
    return [];
}

function parseListOptionsFlexible(text: string): Row[] {
    try {
        const data = JSON.parse(text) as unknown;

        const mapItem = (x: UnknownRecord): Row => {
            const idRaw = x["id"] ?? x["ID"];
            let id: string | number | undefined;
            if (typeof idRaw === "number" || typeof idRaw === "string") id = idRaw;
            else if (idRaw != null) id = String(idRaw);

            const optionIdRaw = x["optionId"] ?? x["option_id"] ?? x["optionid"] ?? x["code"] ?? x["value"] ?? x["id"] ?? "";
            const seqRaw = x["seq"] ?? x["order"] ?? x["sort"] ?? x["sequence"] ?? x["position"] ?? x["index"];
            const isDefaultRaw = x["isDefault"] ?? x["def"] ?? x["default"];

            return {
                id,
                option_id: asString(optionIdRaw),
                title: asString(x["title"] ?? x["name"] ?? x["label"] ?? x["tile"]),
                order: asNumber(seqRaw),
                notes: asString(x["notes"] ?? x["note"] ?? x["description"]),
                codes: asString(x["codes"] ?? x["code"] ?? x["value"] ?? x["optionValue"]),
                def: asBool(isDefaultRaw),
                active: x["activity"] !== undefined ? (x["activity"] === 1 || x["activity"] === true) : true,
            };
        };

        if (Array.isArray(data)) return (data as UnknownRecord[]).map(mapItem);

        if (data && typeof data === "object") {
            const obj = data as UnknownRecord;
            // Check for data, items, or results array
            const arr = Array.isArray(obj.data)
                ? (obj.data as UnknownRecord[])
                : Array.isArray(obj.items)
                ? (obj.items as UnknownRecord[])
                : Array.isArray(obj.results)
                ? (obj.results as UnknownRecord[])
                : [];
            if (arr.length) return arr.map(mapItem);
        }
    } catch {
        return [];
    }
    return [];
}

// sort by seq/order asc, then title as a tiebreaker
const bySeqThenTitle = (a: Row, b: Row) =>
    (a.order ?? 0) - (b.order ?? 0) ||
    String(a.title ?? "").localeCompare(String(b.title ?? ""), undefined, {
        numeric: true,
        sensitivity: "base",
    });

/* ---------- Inputs ---------- */
function CellInput(props: {
    value: string | number;
    type?: "text" | "number";
    ariaLabel: string;
    onChange: (v: string) => void;
}) {
    const { value, type = "text", ariaLabel, onChange } = props;
    return (
        <input
            type={type}
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            aria-label={ariaLabel}
            className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-[7px] text-[12px] leading-4 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-blue-500 hover:border-gray-400 transition dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder:text-gray-400"
        />
    );
}

function CellTextarea(props: { value: string; ariaLabel: string; onChange: (v: string) => void }) {
    const { value, ariaLabel, onChange } = props;
    return (
        <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label={ariaLabel}
            rows={1}
            className="w-full h-[34px] rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-[12px] leading-4 placeholder:text-gray-400 resize-none overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-blue-500 hover:border-gray-400 transition dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder:text-gray-400"
        />
    );
}

/* ---------- Toasts (no external lib) ---------- */
type ToastType = "success" | "error" | "warning" | "info";
type Toast = { id: number; title: string; message: string; type: ToastType; duration: number };

const TYPE_COLORS: Record<ToastType, string> = {
    success: "#10b981", // emerald-500
    error: "#ef4444", // red-500
    warning: "#f59e0b", // amber-500
    info: "#3b82f6", // blue-500
};
const TYPE_ICON: Record<ToastType, string> = { success: "✓", error: "!", warning: "!", info: "i" };

function ToastItem({ t, onClose }: { t: Toast; onClose: (id: number) => void }) {
    const color = TYPE_COLORS[t.type];
    useEffect(() => {
        const tm = window.setTimeout(() => onClose(t.id), t.duration);
        return () => window.clearTimeout(tm);
    }, [t.id, t.duration, onClose]);

    return (
        <div
            className="relative pointer-events-auto w-80 rounded-lg border shadow-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
            style={{ borderLeft: `6px solid ${color}` }}
        >
            <div className="flex items-start gap-2 p-3">
        <span
            className="inline-flex items-center justify-center h-5 w-5 rounded-full text-white text-[11px] mt-0.5 select-none"
            style={{ backgroundColor: color }}
            aria-hidden
        >
          {TYPE_ICON[t.type]}
        </span>
                <div className="min-w-0">
                    <div className="text-[12px] font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {t.title}
                    </div>
                    <div className="text-[12px] text-slate-600 dark:text-slate-300 break-words">{t.message}</div>
                </div>
                <button
                    aria-label="Close toast"
                    onClick={() => onClose(t.id)}
                    className="absolute right-1.5 top-1.5 rounded px-1 text-slate-500 hover:bg-black/5 dark:text-slate-300 dark:hover:bg-white/10"
                >
                    ✕
                </button>
            </div>
            <div className="h-1 w-full bg-transparent">
                <div
                    className="h-1"
                    style={{ backgroundColor: color, animation: `toastProgress ${t.duration}ms linear forwards` }}
                />
            </div>
        </div>
    );
}

function ToastPortal({ children }: { children: React.ReactNode }) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted) return null;
    return createPortal(children, document.body);
}

/* ---------- Page ---------- */
export default function ListsPage(): JSX.Element {
    const [mounted, setMounted] = useState(false);
    
    const INITIAL_ROWS: Row[] = useMemo(
        () => [
            { id: 1, option_id: "1", title: "0", order: 0, def: false, active: true, notes: "", codes: "" },
            { id: 2, option_id: "2", title: "1", order: 10, def: false, active: true, notes: "", codes: "" },
            { id: 3, option_id: "3", title: "2", order: 20, def: false, active: true, notes: "", codes: "" },
            { id: 4, option_id: "4", title: "3", order: 30, def: false, active: true, notes: "", codes: "" },
        ],
        []
    );

    const [rows, setRows] = useState<Row[]>(INITIAL_ROWS);
    const [dark] = useState(false); // theme toggle (setter removed to avoid unused var)

    // Toast state
    const [toasts, setToasts] = useState<Toast[]>([]);
    const removeToast = useCallback((id: number) => setToasts((p) => p.filter((x) => x.id !== id)), []);
    const pushToast = useCallback(
        (title: string, message: string, type: ToastType = "info", duration = 4000) => {
            const id = Date.now() + Math.floor(Math.random() * 1000);
            setToasts((p) => [...p, { id, title, message, type, duration }]);
            window.setTimeout(() => removeToast(id), duration + 800); // cleanup safety
        },
        [removeToast]
    );

    // Handle mounting for hydration safety
    useEffect(() => {
        setMounted(true);
    }, []);

    // Convert any stray window.alert calls into toasts (safety net)
    useEffect(() => {
        const original = window.alert;
        const patched = (msg?: unknown) => {
            pushToast("Notice", String(msg ?? ""), "info");
        };
        (window as Window & typeof globalThis).alert = patched as typeof window.alert;
        return () => {
            (window as Window & typeof globalThis).alert = original;
        };
    }, [pushToast]);

    // stable client id generator for keys
    const cidCounter = useRef(0);
    const makeCid = useCallback(() => {
        cidCounter.current += 1;
        return `cid_${Date.now()}_${cidCounter.current}`;
    }, []);

    // Dropdown / list selection
    const [listIds, setListIds] = useState<string[]>([]);
    const [selectedListId, setSelectedListId] = useState<string>("");

    // Search-in-dropdown (combobox)
    const [listQuery, setListQuery] = useState<string>("");
    const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
    const [highlighted, setHighlighted] = useState<number>(-1);
    const comboRef = useRef<HTMLDivElement | null>(null);

    // Status
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState<boolean>(false);

    // Track DB ids we loaded (existing rows)
    const existingIdsRef = useRef<Set<string>>(new Set());
    // Track newly-added rows by object identity
    const newRowsRef = useRef<WeakSet<Row>>(new WeakSet());
    // Snapshot of original server data (keyed by DB id string)
    const originalByIdRef = useRef<Map<string, Row>>(new Map());
    // Track listIds created in UI so we skip one-time fetch (show empty table)
    const newlyCreatedLists = useRef<Set<string>>(new Set());

    const filteredListIds = useMemo(() => {
        const q = listQuery.trim().toLowerCase();
        if (!q) return listIds;
        return listIds.filter((id) => id.toLowerCase().includes(q));
    }, [listIds, listQuery]);

    // attach _cid for all rows when they first enter state
    const attachCids = useCallback(
        (arr: Row[]) => {
            return arr.map((r) => (r._cid ? r : { ...r, _cid: makeCid() }));
        },
        [makeCid]
    );

    // Ensure the canonical `rows` state always contains stable `_cid` values.
    // This prevents changing React keys between renders (which can cause inputs
    // to remount and lose their edited values). We run this on mount and
    // whenever `rows` changes to fill in missing `_cid`s.
    useEffect(() => {
        setRows((prev) => {
            // If every row already has a _cid, keep as-is (avoid extra renders)
            if (prev.every((r) => r._cid)) return prev;
            return attachCids(prev);
        });
        // Only run when component mounts or when attachCids changes
    }, [attachCids]);

    /* Fetch available lists */
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                setError(null);
                console.log("Fetching list IDs from:", `${API_BASE}/api/list-options`);
                const res = await fetchWithAuth(`${API_BASE}/api/list-options`, {
                    method: "GET",
                    headers: { Accept: "application/json" },
                });
                
                if (!res.ok) throw new Error("Failed to load list IDs");
                const bodyText = await res.text();
                console.log("List IDs response:", bodyText);

                const rawIds = extractListIdsFromResponseText(bodyText);
                console.log("Extracted list IDs:", rawIds);
                const uniq = uniqueCaseInsensitive(rawIds);
                console.log("Unique list IDs:", uniq);

                if (mounted) {
                    setListIds(uniq);
                    if (uniq.length && !selectedListId) {
                        setSelectedListId(uniq[0]);
                        setListQuery(uniq[0]);
                    }
                }
            } catch (e: unknown) {
                console.error("Failed to fetch listIds:", e instanceof Error ? e.message : String(e));
                if (mounted) setError(e instanceof Error ? e.message : "Failed to load list IDs");
            }
        })();
        return () => {
            mounted = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [API_BASE]);

    /* Helper: fetch rows for a list */
    const fetchRowsForList = useCallback(
        async (listId: string) => {
            setLoading(true);
            setError(null);
            try {
                console.log("Fetching rows for list:", listId);
                const res = await fetchWithAuth(
                    `${API_BASE}/api/list-options/list/${encodeURIComponent(listId)}?_t=${Date.now()}`,
                    {
                        method: "GET",
                        headers: {
                            Accept: "application/json",
                            "Cache-Control": "no-cache",
                        },
                    }
                );

                if (res.status === 404) {
                    console.log("List not found (404), treating as empty");
                    setRows([]);
                    existingIdsRef.current = new Set();
                    originalByIdRef.current = new Map();
                    newRowsRef.current = new WeakSet();
                    setLoading(false);
                    return;
                }

                if (!res.ok) {
                    throw new Error(`Failed to load list data: ${res.status} ${res.statusText}`);
                }

                const payload = await res.text();
                console.log("List rows response:", payload);
                const parsed = parseListOptionsFlexible(payload);
                console.log("Parsed rows:", parsed);
                const withCid = attachCids(parsed);
                withCid.sort(bySeqThenTitle);
                setRows(withCid);

                // Capture existing DB ids
                const ids = new Set(
                    withCid
                        .map((r) => (r.id !== undefined && r.id !== null ? String(r.id) : ""))
                        .filter(Boolean)
                );
                existingIdsRef.current = ids;

                // Snapshot originals by DB id
                const snap = new Map<string, Row>();
                for (const r of withCid) {
                    const key = r.id !== undefined && r.id !== null ? String(r.id) : "";
                    if (key) snap.set(key, { ...r });
                }
                originalByIdRef.current = snap;

                // Reset "new rows" tracker after load
                newRowsRef.current = new WeakSet();
            } catch (e: unknown) {
                console.error("Failed to fetch rows:", e);
                setError(e instanceof Error ? e.message : "Failed to load list data");
            } finally {
                setLoading(false);
            }
        },
        [attachCids]
    );

    /* Fetch rows when selection changes — skip ONCE for brand-new lists so table is empty */
    useEffect(() => {
        if (!selectedListId) return;

        if (newlyCreatedLists.current.has(selectedListId)) {
            newlyCreatedLists.current.delete(selectedListId);
            return; // keep empty
        }

        fetchRowsForList(selectedListId);
    }, [selectedListId, fetchRowsForList]);

    /* Combobox behavior */
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
                setHighlighted(-1);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const chooseList = (id: string) => {
        setSelectedListId(id);
        setListQuery(id);
        setShowSuggestions(false);
        setHighlighted(-1);
    };

    const onComboKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const max = filteredListIds.length - 1;
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setShowSuggestions(true);
            setHighlighted((h) => (h < max ? h + 1 : max));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlighted((h) => (h > 0 ? h - 1 : 0));
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (highlighted >= 0 && filteredListIds[highlighted]) {
                chooseList(filteredListIds[highlighted]);
            } else if (filteredListIds[0]) {
                chooseList(filteredListIds[0]);
            }
        } else if (e.key === "Escape") {
            setShowSuggestions(false);
            setHighlighted(-1);
        }
    };
    const [showNewListDialog, setShowNewListDialog] = useState(false);

    // REPLACE the old createNewList(...) with this helper:
    const commitCreateNewList = (trimmed: string) => {
        setListIds((prev) => {
            if (prev.some((x) => x.toLowerCase() === trimmed.toLowerCase())) return prev;
            return [trimmed, ...prev];
        });

        newlyCreatedLists.current.add(trimmed);

        setSelectedListId(trimmed);
        setListQuery(trimmed);

        setRows([]);
        newRowsRef.current = new WeakSet();
        existingIdsRef.current = new Set();
        originalByIdRef.current = new Map();

        pushToast("List created", `Created list "${trimmed}".`, "success");
    };
    function NewListDialog(props: {
        open: boolean;
        onClose: () => void;
        onCreate: (name: string) => void;
        existingIds: string[];
    }) {
        const { open, onClose, onCreate, existingIds } = props;
        const [value, setValue] = useState("");
        const [error, setError] = useState<string | null>(null);
        const inputRef = useRef<HTMLInputElement | null>(null);

        useEffect(() => {
            if (open) {
                setValue("");
                setError(null);
                setTimeout(() => inputRef.current?.focus(), 0);
            }
        }, [open]);

        useEffect(() => {
            function onEsc(e: KeyboardEvent) {
                if (!open) return;
                if (e.key === "Escape") onClose();
            }
            window.addEventListener("keydown", onEsc);
            return () => window.removeEventListener("keydown", onEsc);
        }, [open, onClose]);

        const lowerSet = useMemo(() => new Set(existingIds.map((x) => x.toLowerCase())), [existingIds]);

        const validate = (name: string): string | null => {
            const trimmed = name.trim();
            if (!trimmed) return "List name can’t be empty.";
            if (/\s/.test(name)) return "No spaces allowed. Use _ or - instead.";
            if (!/^[A-Za-z0-9._-]+$/.test(name)) return "Use only letters, numbers, dot, underscore, or hyphen.";
            if (trimmed.length > 64) return "Keep it under 64 characters.";
            if (lowerSet.has(trimmed.toLowerCase())) return "That list already exists.";
            return null;
        };

        const handleCreate = () => {
            const err = validate(value);
            if (err) {
                setError(err);
                inputRef.current?.focus();
                return;
            }
            onCreate(value.trim());
            onClose();
        };

        if (!open) return null;

        return createPortal(
            <div aria-modal="true" role="dialog" aria-labelledby="new-list-title"
                 className="fixed inset-0 z-[2147483000] flex items-center justify-center">
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" onClick={onClose} />
                <div className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white p-4 shadow-xl dark:bg-gray-800 dark:border-gray-700"
                     onClick={(e) => e.stopPropagation()}>
                    <h2 id="new-list-title" className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Create New List
                    </h2>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Enter a name (no spaces). Example: <code>1_10</code>
                    </p>

                    <label htmlFor="new-list-input" className="sr-only">List name</label>
                    <input
                        id="new-list-input"
                        ref={inputRef}
                        value={value}
                        onChange={(e) => { setValue(e.target.value); if (error) setError(null); }}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCreate(); } }}
                        placeholder="e.g., 1_10"
                        className={`mt-3 w-full rounded-lg border px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/70 ${
                            error
                                ? "border-red-400 dark:border-red-500"
                                : "border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                        }`}
                    />
                    {error && <div className="mt-1 text-[11px] text-red-600 dark:text-red-400" role="alert">{error}</div>}

                    <div className="mt-4 flex items-center justify-end gap-2">
                        <button onClick={onClose}
                                className="rounded-lg border border-gray-300 px-3 py-1.5 text-[12px] text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700/50">
                            Cancel
                        </button>
                        <button onClick={handleCreate}
                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[12px] font-medium text-white shadow-sm hover:bg-emerald-500 active:bg-emerald-600/90">
                            Create
                        </button>
                    </div>
                </div>
            </div>,
            document.body
        );
    }

    /* Row editing */
    const updateRow = useCallback(
        (idx: number, key: keyof Row, value: string | number | boolean) => {
            setRows((prev) => {
                const next = [...prev];
                const r = next[idx];
                switch (key) {
                    case "order":
                        r.order = typeof value === "number" ? value : asNumber(value);
                        break;
                    case "def":
                        r.def = Boolean(value);
                        break;
                    case "active":
                        r.active = Boolean(value);
                        break;
                    case "id": {
                        if (typeof value === "number" || typeof value === "string") r.id = value;
                        else r.id = asString(value);
                        break;
                    }
                    case "option_id":
                        r.option_id = asString(value);
                        break;
                    case "title":
                        r.title = asString(value);
                        break;
                    case "notes":
                        r.notes = asString(value);
                        break;
                    case "codes":
                        r.codes = asString(value);
                        break;
                }
                return next;
            });
        },
        []
    );

    /* Add a new blank row (local only). Save will POST it. */
    const addRow = () => {
        if (!selectedListId) {
            pushToast("Action required", "Please select or create a list first.", "warning");
            return;
        }
        setRows((prev) => {
            const max = prev.length ? Math.max(...prev.map((r) => r.order || 0)) : -10;
            const newRow: Row = {
                _cid: makeCid(),
                option_id: "",
                title: "",
                order: max + 10,
                def: false,
                active: true,
                notes: "",
                codes: "",
            };
            newRowsRef.current.add(newRow);
            return [...prev, newRow];
        });
        pushToast("Row added", "A new row was added.", "success");
    };

    const deleteEmptyTitles = () => {
        setRows((prev) => prev.filter((r) => r.title.trim() !== ""));
        pushToast("Cleanup complete", "Removed rows with empty titles.", "info");
    };

    /* Save */
    const save = async () => {
        try {
            setSaving(true);

            if (!selectedListId) {
                pushToast("Action required", "Select (or create) a list first.", "warning");
                return;
            }

            const existingIds = existingIdsRef.current;
            const originals = originalByIdRef.current;

            // CREATE candidates
            let createCandidates = rows.filter((r) => newRowsRef.current.has(r));
            if (createCandidates.length === 0) {
                createCandidates = rows.filter(
                    (r) => r.id === undefined || r.id === null || String(r.id) === ""
                );
            }

            // Validate creates
            const invalidCreate = createCandidates.filter(
                (r) => !r.option_id.trim() || !Number.isFinite(Number(r.order))
            );
            if (invalidCreate.length) {
                pushToast("Fix required", "Fill Option ID and numeric Order for all new rows.", "warning");
                return;
            }

            // UPDATE candidates
            const updateCandidates: Array<{ prev: Row; curr: Row; pathId: string }> = [];
            for (const curr of rows) {
                const pathId = curr.id !== undefined && curr.id !== null ? String(curr.id) : "";
                if (!pathId || !existingIds.has(pathId)) continue;
                const prev = originals.get(pathId);
                if (!prev) continue;
                const changed =
                    prev.option_id !== curr.option_id ||
                    prev.title !== curr.title ||
                    prev.order !== curr.order ||
                    prev.def !== curr.def ||
                    prev.active !== curr.active ||
                    prev.notes !== curr.notes ||
                    prev.codes !== curr.codes;
                if (changed) updateCandidates.push({ prev, curr, pathId });
            }

            if (createCandidates.length === 0 && updateCandidates.length === 0) {
                pushToast("Nothing to save", "No changes detected.", "info");
                return;
            }

            // ---- PERFORM REQUESTS ----
            const createErrors: string[] = [];
            const createResults = await Promise.allSettled(
                createCandidates.map(async (r, idx) => {
                    const body = {
                        listId: String(selectedListId),
                        optionId: String(r.option_id).trim(),
                        title: String(r.title ?? ""),
                        seq: Number(r.order ?? 0),
                        isDefault: Boolean(r.def),
                        optionValue: Number.isFinite(Number(r.codes)) ? Number(r.codes) : 0,
                        notes: String(r.notes ?? ""),
                        codes: String(r.codes ?? ""),
                        activity: r.active ? 1 : 0,
                        editOptions: false,
                    };

                    const res = await fetchWithAuth(`${API_BASE}/api/list-options`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Accept: "application/json",
                        },
                        body: JSON.stringify(body),
                    });

                    if (!res.ok) {
                        const text = await res.text().catch(() => "");
                        const error = `Row ${idx + 1} (${r.option_id}): ${res.status} ${text || res.statusText}`;
                        createErrors.push(error);
                        throw new Error(error);
                    }
                    return res;
                })
            );

            const updateErrors: string[] = [];
            const updateResults = await Promise.allSettled(
                updateCandidates.map(async ({ curr, pathId }, idx) => {
                    const body = {
                        listId: String(selectedListId),
                        optionId: String(curr.option_id).trim(),
                        title: String(curr.title ?? ""),
                        seq: Number(curr.order ?? 0),
                        isDefault: Boolean(curr.def),
                        optionValue: Number.isFinite(Number(curr.codes)) ? Number(curr.codes) : 0,
                        notes: String(curr.notes ?? ""),
                        codes: String(curr.codes ?? ""),
                        activity: curr.active ? 1 : 0,
                        editOptions: false,
                    };

                    const res = await fetchWithAuth(
                        `${API_BASE}/api/list-options/${encodeURIComponent(pathId)}`,
                        {
                            method: "PUT",
                            headers: {
                                "Content-Type": "application/json",
                                Accept: "application/json",
                            },
                            body: JSON.stringify(body),
                        }
                    );

                    if (!res.ok) {
                        const text = await res.text().catch(() => "");
                        const error = `ID ${pathId} (${curr.option_id}): ${res.status} ${text || res.statusText}`;
                        updateErrors.push(error);
                        throw new Error(error);
                    }
                    return res;
                })
            );

            const createdFailed = createResults.filter((r) => r.status === "rejected").length;
            const updatedFailed = updateResults.filter((r) => r.status === "rejected").length;
            const createdOk = createCandidates.length - createdFailed;
            const updatedOk = updateCandidates.length - updatedFailed;

            // Always refresh list IDs and data
            console.log("Refreshing after save...");
            const listRes = await fetchWithAuth(`${API_BASE}/api/list-options`, {
                method: "GET",
                headers: { Accept: "application/json" },
            });
            if (listRes.ok) {
                const bodyText = await listRes.text();
                console.log("Refresh list IDs response:", bodyText);
                const rawIds = extractListIdsFromResponseText(bodyText);
                const uniq = uniqueCaseInsensitive(rawIds);
                console.log("Refreshed list IDs:", uniq);
                
                // Ensure current list is in the dropdown even if API returns empty
                if (!uniq.includes(selectedListId)) {
                    uniq.push(selectedListId);
                    uniq.sort();
                }
                setListIds(uniq);
            }

            // Small delay to ensure backend has committed the data
            await new Promise(resolve => setTimeout(resolve, 300));
            await fetchRowsForList(selectedListId);

            // Show results
            if (createErrors.length > 0) {
                console.error("Create errors:", createErrors);
                pushToast("Create failed", createErrors.join("; "), "error", 6000);
            }
            if (updateErrors.length > 0) {
                console.error("Update errors:", updateErrors);
                pushToast("Update failed", updateErrors.join("; "), "error", 6000);
            }

            if (createdOk > 0 || updatedOk > 0) {
                const parts: string[] = [];
                if (createdOk > 0) parts.push(`${createdOk} created`);
                if (updatedOk > 0) parts.push(`${updatedOk} updated`);
                pushToast("Save successful", parts.join(", "), "success");
            } else if (createdFailed > 0 || updatedFailed > 0) {
                pushToast("Save failed", "All operations failed. Check errors above.", "error");
            }
        } catch (e: unknown) {
            console.error("Save failed:", e instanceof Error ? e.message : e);
            pushToast("Save failed", e instanceof Error ? e.message : "Unknown error occurred", "error");
        } finally {
            setSaving(false);
        }
    };

    // Always render a sorted copy so UI is ordered by seq/order
    const displayRows = useMemo(() => {
        return attachCids([...rows]).sort(bySeqThenTitle);
    }, [rows, attachCids]);

    // Helper function to find the original index in rows array from display index
    const findOriginalIndex = useCallback((displayIndex: number): number => {
        const displayRow = displayRows[displayIndex];
        if (!displayRow) return -1;
        
        // Find by _cid first (most reliable)
        if (displayRow._cid) {
            const idx = rows.findIndex(r => r._cid === displayRow._cid);
            if (idx !== -1) return idx;
        }
        
        // Fallback: find by id if it exists
        if (displayRow.id !== undefined && displayRow.id !== null) {
            const idx = rows.findIndex(r => r.id === displayRow.id);
            if (idx !== -1) return idx;
        }
        
        // Last resort: find by multiple field match
        return rows.findIndex(r => 
            r.option_id === displayRow.option_id &&
            r.title === displayRow.title &&
            r.order === displayRow.order
        );
    }, [displayRows, rows]);

    // Prevent hydration mismatch by not rendering until mounted
    if (!mounted) {
        return <div className="min-h-screen bg-gray-50 dark:bg-gray-900"></div>;
    }

    return (
        <div className={dark ? "dark" : ""}>
            <AdminLayout>
                <div className="p-4 md:p-6 text-gray-900 dark:text-gray-100 dark:bg-gray-900 min-h-screen">
                    {/* Toasts */}
                    <ToastPortal>
                        <div className="fixed top-4 right-4 z-[2147483647] flex flex-col gap-2 pointer-events-none">
                            {toasts.map((t) => (
                                <div key={t.id} className="pointer-events-auto">
                                    <ToastItem t={t} onClose={removeToast} />
                                </div>
                            ))}
                        </div>
                    </ToastPortal>

                    {/* Error / Loading banners */}
                    {loading && (
                        <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:border-blue-900 dark:bg-blue-900/30 dark:text-blue-200">
                            Loading…
                        </div>
                    )}
                    {error && (
                        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900 dark:bg-red-900/30 dark:text-red-200">
                            {error}
                        </div>
                    )}

                    {/* Header Card */}
                    <div className="mb-4 rounded-2xl border border-gray-200 bg-white/90 shadow-sm dark:bg-gray-800 dark:border-gray-700">
                        <div className="flex flex-col gap-3 p-3 md:p-4">
                            <div className="flex items-center justify-between gap-2">
                                <div>
                                    <nav
                                        aria-label="Breadcrumb"
                                        className="mb-1.5 text-[11px] text-gray-500 flex items-center gap-1.5 dark:text-gray-400"
                                    >
                    <span className="px-1.5 py-0.5 rounded border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700">
                      Settings
                    </span>
                                        <span>/</span>
                                        <span className="px-1.5 py-0.5 rounded border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700">
                      Forms
                    </span>
                                        <span>/</span>
                                        <span className="px-1.5 py-0.5 rounded border border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:border-blue-900 dark:text-blue-300">
                      Lists
                    </span>
                                    </nav>
                                    <h1 className="text-sm font-semibold tracking-tight">Manage Lists</h1>
                                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                                        Select or create a list, then edit order, defaults, and codes.
                                    </p>
                                </div>
                            </div>

                            {/* Search + Buttons (same row) */}
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                {/* Search */}
                                <div className="flex items-center gap-2 min-w-0">
                                    <div ref={comboRef} className="relative w-[28rem] max-w-full">
                                        <label htmlFor="list-combobox" className="sr-only">
                                            Select List
                                        </label>
                                        <input
                                            id="list-combobox"
                                            role="combobox"
                                            aria-expanded={showSuggestions}
                                            aria-autocomplete="list"
                                            aria-controls="listbox-suggestions"
                                            placeholder="Select list… (type to search)"
                                            className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-8 py-2 text-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-blue-500 placeholder:text-gray-400 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder:text-gray-400"
                                            value={listQuery}
                                            onChange={(e) => {
                                                setListQuery(e.target.value);
                                                setShowSuggestions(true);
                                                setHighlighted(-1);
                                            }}
                                            onFocus={() => setShowSuggestions(true)}
                                            onKeyDown={onComboKeyDown}
                                        />
                                        {/* Magnifier */}
                                        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                      🔎
                    </span>
                                        {/* Caret */}
                                        <button
                                            type="button"
                                            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded px-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                                            aria-label="Toggle list suggestions"
                                            onClick={() => setShowSuggestions((v) => !v)}
                                        >
                                            ▾
                                        </button>

                                        {/* Suggestions */}
                                        {showSuggestions && (
                                            <ul
                                                id="listbox-suggestions"
                                                role="listbox"
                                                className="themed-scrollbar absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:bg-gray-800 dark:border-gray-700"
                                            >
                                                {filteredListIds.length === 0 && (
                                                    <li className="px-3 py-2 text-[12px] text-gray-500 dark:text-gray-400">
                                                        No matches
                                                    </li>
                                                )}
                                                {filteredListIds.map((id, idx) => (
                                                    <li
                                                        key={id}
                                                        role="option"
                                                        aria-selected={idx === highlighted}
                                                        className={`px-3 py-2 text-[12px] cursor-pointer ${
                                                            idx === highlighted
                                                                ? "bg-blue-50 dark:bg-blue-900/30"
                                                                : "hover:bg-gray-50 dark:hover:bg-gray-700/60"
                                                        }`}
                                                        onMouseEnter={() => setHighlighted(idx)}
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            chooseList(id);
                                                        }}
                                                    >
                                                        {id}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                    <span className="text-[11px] text-gray-500 dark:text-gray-400">
                    Current: <span className="font-medium">{selectedListId || "—"}</span>
                  </span>
                                </div>

                                {/* Buttons (same row) */}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setShowNewListDialog(true)}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[12px] font-medium text-white shadow-sm hover:bg-emerald-500 active:bg-emerald-600/90 transition"
                                    >
                                        📃 New List
                                    </button>
                                    <button
                                        onClick={addRow}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[12px] font-medium text-white shadow-sm hover:bg-blue-500 active:bg-blue-600/90 transition"
                                    >
                                        ＋ New Row
                                    </button>
                                    <button
                                        onClick={deleteEmptyTitles}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-red-500 active:bg-red-600/90 transition"
                                    >
                                        🗑️ Delete Empty Titles
                                    </button>
                                    <button
                                        onClick={save}
                                        disabled={saving}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-[12px] font-medium text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed active:bg-indigo-600/90 transition"
                                    >
                                        {saving ? "Saving…" : "💾 Save"}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent dark:via-gray-700" />
                        <div className="px-3 md:px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
                            Showing items: {displayRows.length}
                        </div>
                    </div>

                    {/* Table Card with vertical scroll */}
                    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden dark:border-gray-700 dark:bg-gray-800">
                        <div className="themed-scrollbar overflow-auto max-h-[calc(100vh-280px)]">
                            <table className="w-full text-[12px] leading-5 table-fixed">
                                <colgroup>
                                    <col style={{ width: "150px" }} />
                                    <col style={{ width: "150px" }} />
                                    <col style={{ width: "150px" }} />
                                    <col />
                                    <col />
                                    <col style={{ width: "100px" }} />
                                    <col style={{ width: "100px" }} />
                                </colgroup>

                                <thead className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-200 dark:bg-gray-800/95 dark:border-gray-700">
                                <tr className="[&>th]:px-3 [&>th]:py-2 text-gray-600 dark:text-gray-300">
                                    <th className="text-left">Option ID</th>
                                    <th className="text-left">Title</th>
                                    <th className="text-left">Order</th>
                                    <th className="text-left">Notes</th>
                                    <th className="text-left">Code(s)</th>
                                    <th className="text-center">Default</th>
                                    <th className="text-center">Active</th>
                                </tr>
                                </thead>

                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {displayRows.map((row, i) => (
                                    <tr
                                        key={`row-${row._cid}`}
                                        className={`transition-colors ${
                                            i % 2 === 0 ? "bg-white" : "bg-gray-50"
                                        } dark:bg-gray-800 hover:bg-blue-50/50 dark:hover:bg-gray-700`}
                                    >
                                        <td className="px-3 py-2 align-top">
                                            <CellInput
                                                value={row.option_id}
                                                onChange={(v) => {
                                                    const originalIdx = findOriginalIndex(i);
                                                    if (originalIdx !== -1) updateRow(originalIdx, "option_id", v);
                                                }}
                                                ariaLabel={`Option ID ${i + 1}`}
                                            />
                                        </td>
                                        <td className="px-3 py-2 align-top">
                                            <CellInput
                                                value={row.title}
                                                onChange={(v) => {
                                                    const originalIdx = findOriginalIndex(i);
                                                    if (originalIdx !== -1) updateRow(originalIdx, "title", v);
                                                }}
                                                ariaLabel={`Title ${(row.id ?? row.option_id) || "new"}`}
                                            />
                                        </td>
                                        <td className="px-3 py-2 align-top">
                                            <CellInput
                                                type="number"
                                                value={row.order}
                                                onChange={(v) => {
                                                    const originalIdx = findOriginalIndex(i);
                                                    if (originalIdx !== -1) updateRow(originalIdx, "order", v);
                                                }}
                                                ariaLabel={`Order ${(row.id ?? row.option_id) || "new"}`}
                                            />
                                        </td>
                                        <td className="px-3 py-2 align-top">
                                            <CellTextarea
                                                value={row.notes}
                                                onChange={(v) => {
                                                    const originalIdx = findOriginalIndex(i);
                                                    if (originalIdx !== -1) updateRow(originalIdx, "notes", v);
                                                }}
                                                ariaLabel={`Notes ${(row.id ?? row.option_id) || "new"}`}
                                            />
                                        </td>
                                        <td className="px-3 py-2 align-top">
                                            <CellTextarea
                                                value={row.codes}
                                                onChange={(v) => {
                                                    const originalIdx = findOriginalIndex(i);
                                                    if (originalIdx !== -1) updateRow(originalIdx, "codes", v);
                                                }}
                                                ariaLabel={`Codes ${(row.id ?? row.option_id) || "new"}`}
                                            />
                                        </td>
                                        <td className="px-3 py-2 text-center align-top">
                                            <input
                                                type="checkbox"
                                                checked={row.def}
                                                onChange={(e) => {
                                                    const originalIdx = findOriginalIndex(i);
                                                    if (originalIdx !== -1) updateRow(originalIdx, "def", e.target.checked);
                                                }}
                                                className="h-4 w-4 accent-blue-600 align-middle"
                                                aria-label={`Default ${(row.id ?? row.option_id) || "new"}`}
                                            />
                                        </td>
                                        <td className="px-3 py-2 text-center align-top">
                                            <input
                                                type="checkbox"
                                                checked={row.active}
                                                onChange={(e) => {
                                                    const originalIdx = findOriginalIndex(i);
                                                    if (originalIdx !== -1) updateRow(originalIdx, "active", e.target.checked);
                                                }}
                                                className="h-4 w-4 accent-blue-600 align-middle"
                                                aria-label={`Active ${(row.id ?? row.option_id) || "new"}`}
                                            />
                                        </td>
                                    </tr>
                                ))}
                                {displayRows.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-3 py-6 text-center text-gray-500 dark:text-gray-400">
                                            No rows for this list yet.
                                        </td>
                                    </tr>
                                )}
                                </tbody>
                            </table>
                        </div>

                        {/* Bottom tip only; Save is in the header */}
                        <div className="flex items-center justify-between gap-2 px-3 md:px-4 py-2 border-t border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/40">
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                Tip: Use consistent codes for reporting.
              </span>
                        </div>
                    </div>
                </div>
            </AdminLayout>
            <NewListDialog
                open={showNewListDialog}
                onClose={() => setShowNewListDialog(false)}
                onCreate={commitCreateNewList}
                existingIds={listIds}
            />


            {/* Themed scrollbar + toast keyframes */}
            <style jsx global>{`
        /* Firefox */
        .themed-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 #f1f5f9;
        }
        .dark .themed-scrollbar {
          scrollbar-color: #334155 #0b1220;
        }
        /* WebKit */
        .themed-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .themed-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
        }
        .themed-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 9999px;
        }
        .themed-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #94a3b8;
        }
        .dark .themed-scrollbar::-webkit-scrollbar-track {
          background: #0b1220;
        }
        .dark .themed-scrollbar::-webkit-scrollbar-thumb {
          background-color: #334155;
        }
        .dark .themed-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #475569;
        }

        /* Toast progress animation */
        @keyframes toastProgress {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
        </div>
    );
}
