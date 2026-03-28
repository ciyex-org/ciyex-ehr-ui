"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-json";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import { Save, X, Loader2, AlertTriangle, Code } from "lucide-react";
import { confirmDialog } from "@/utils/toast";

const API_BASE = () => (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/$/, "");

/* ---------- Controlled (live-edit) mode ---------- */
interface ControlledProps {
    /** The current fieldConfig object */
    value: any;
    /** Called on every valid JSON change — updates parent state live */
    onChange: (parsed: any) => void;
    /** tabKey for saving to the database */
    tabKey: string;
    /** FHIR resources to include in the save payload */
    fhirResources?: any[];
}

/* ---------- Standalone (multi-tab) mode ---------- */
interface StandaloneProps {
    value?: undefined;
    onChange?: undefined;
    tabKey?: string;
    fhirResources?: undefined;
    /** Optional filter by category */
    category?: string;
}

type JsonCodeViewProps = ControlledProps | StandaloneProps;

const highlightJson = (code: string) => {
    return Prism.highlight(code, Prism.languages.json, "json");
};

export default function JsonCodeView(props: JsonCodeViewProps) {
    const isControlled = props.value !== undefined;

    // Standalone state
    const [configs, setConfigs] = useState<any[]>([]);
    const [selectedTab, setSelectedTabState] = useState(props.tabKey || "");
    const [loaded, setLoaded] = useState(false);

    // Editor state
    const [editorValue, setEditorValue] = useState("");
    const [dirty, setDirty] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // Track external value changes (controlled mode)
    const lastExternalJson = useRef("");

    // Sync editor with controlled value when value changes externally
    useEffect(() => {
        if (isControlled && props.value) {
            const json = JSON.stringify(props.value, null, 2);
            if (json !== lastExternalJson.current && !dirty) {
                setEditorValue(json);
                lastExternalJson.current = json;
            }
        }
    }, [isControlled, props.value, dirty]);

    // Standalone: load configs from API
    const loadConfigs = useCallback(async () => {
        if (isControlled) return;
        try {
            if (props.tabKey) {
                const res = await fetchWithAuth(`${API_BASE()}/api/tab-field-config/${props.tabKey}`);
                if (res.ok) {
                    const data = await res.json();
                    setConfigs([data]);
                    selectTab(props.tabKey, [data]);
                }
            } else {
                const res = await fetchWithAuth(`${API_BASE()}/api/tab-field-config/all`);
                if (res.ok) {
                    let data: any[] = await res.json();
                    if ((props as StandaloneProps).category) {
                        data = data.filter((c: any) => c.category === (props as StandaloneProps).category);
                    }
                    setConfigs(data);
                    if (data.length > 0 && !selectedTab) {
                        selectTab(data[0].tabKey, data);
                    }
                }
            }
        } catch (err) {
            console.error("Failed to load JSON configs:", err);
        }
    }, [isControlled, props.tabKey]);

    const selectTab = async (key: string, allConfigs?: any[]) => {
        if (dirty && !(await confirmDialog("Discard unsaved JSON changes?"))) return;
        const items = allConfigs || configs;
        const config = items.find((c: any) => c.tabKey === key);
        setSelectedTabState(key);
        setEditorValue(config ? JSON.stringify(config.fieldConfig, null, 2) : "{}");
        setDirty(false);
        setError(null);
    };

    useEffect(() => {
        if (!isControlled && !loaded) {
            loadConfigs();
            setLoaded(true);
        }
    }, [loaded, isControlled, loadConfigs]);

    // Validate JSON structure
    const validateJson = (text: string): { parsed: any; error: string | null } => {
        try {
            const parsed = JSON.parse(text);

            // Schema validation: fieldConfig should have sections array
            if (parsed && typeof parsed === "object") {
                if ("sections" in parsed && !Array.isArray(parsed.sections)) {
                    return { parsed, error: "\"sections\" must be an array" };
                }
                if (parsed.sections) {
                    for (let i = 0; i < parsed.sections.length; i++) {
                        const s = parsed.sections[i];
                        if (!s.key) return { parsed, error: `sections[${i}] missing required "key"` };
                        if (!s.title) return { parsed, error: `sections[${i}] missing required "title"` };
                        if (s.fields && !Array.isArray(s.fields)) {
                            return { parsed, error: `sections[${i}].fields must be an array` };
                        }
                    }
                }
            }
            return { parsed, error: null };
        } catch (e: any) {
            // Extract line/position from JSON parse error
            const msg = e.message || "Invalid JSON";
            return { parsed: null, error: msg };
        }
    };

    // Handle text change in editor
    const handleEditorChange = (text: string) => {
        setEditorValue(text);
        setDirty(true);

        const { parsed, error: validationError } = validateJson(text);
        setError(validationError);

        // In controlled mode, push valid changes live
        if (isControlled && props.onChange && parsed && !validationError) {
            lastExternalJson.current = text;
            props.onChange(parsed);
        }
    };

    // Save to database
    const handleSave = async () => {
        const { parsed, error: validationError } = validateJson(editorValue);
        if (validationError || !parsed) {
            setError(validationError || "Invalid JSON");
            return;
        }
        try {

            const saveTabKey = isControlled ? props.tabKey : selectedTab;
            if (!saveTabKey) return;

            let fhirRes: any[] = [];
            if (isControlled) {
                fhirRes = props.fhirResources || [];
            } else {
                const config = configs.find((c) => c.tabKey === saveTabKey);
                fhirRes = config?.fhirResources || [];
            }

            setSaving(true);
            const res = await fetchWithAuth(`${API_BASE()}/api/tab-field-config/${saveTabKey}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fieldConfig: parsed,
                    fhirResources: fhirRes,
                }),
            });
            if (res.ok) {
                setDirty(false);
                if (!isControlled) {
                    await loadConfigs();
                }
            }
        } catch (e: any) {
            setError(e.message || "Invalid JSON");
        } finally {
            setSaving(false);
        }
    };

    const handleDiscard = () => {
        if (isControlled && props.value) {
            const json = JSON.stringify(props.value, null, 2);
            setEditorValue(json);
            lastExternalJson.current = json;
        } else {
            selectTab(selectedTab);
        }
        setDirty(false);
        setError(null);
    };

    return (
        <div className="flex flex-col h-full json-code-editor">
            {/* Prism.js JSON theme */}
            <style jsx global>{`
                .json-code-editor .token.property { color: #9876aa; }
                .json-code-editor .token.string { color: #6a8759; }
                .json-code-editor .token.number { color: #6897bb; }
                .json-code-editor .token.boolean { color: #cc7832; }
                .json-code-editor .token.null { color: #cc7832; }
                .json-code-editor .token.punctuation { color: #a9b7c6; }
                .json-code-editor .token.operator { color: #a9b7c6; }
                .json-code-editor textarea {
                    outline: none !important;
                }
                .json-code-editor pre {
                    min-height: 100%;
                }
            `}</style>

            {/* Toolbar */}
            <div className="flex items-center justify-between px-3 py-2 bg-[#2b2b2b] border-b border-[#3c3c3c] shrink-0">
                <div className="flex items-center gap-2">
                    <Code className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-mono text-gray-400">
                        {(isControlled ? props.tabKey : selectedTab) || "field_config"}
                    </span>
                    {dirty && <span className="w-2 h-2 rounded-full bg-amber-400" title="Unsaved changes" />}
                </div>
                <div className="flex items-center gap-1.5">
                    {dirty && (
                        <>
                            <button
                                onClick={handleDiscard}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-300 border border-gray-600 rounded hover:bg-[#3c3c3c]"
                            >
                                <X className="w-3 h-3" /> Discard
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving || !!error}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                Save
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Tab selector for standalone multi-tab mode */}
            {!isControlled && configs.length > 1 && (
                <div className="flex items-center gap-1 px-2 py-1.5 bg-[#2b2b2b] border-b border-[#3c3c3c] overflow-x-auto shrink-0">
                    {configs.map((c) => (
                        <button
                            key={c.tabKey}
                            onClick={() => selectTab(c.tabKey)}
                            className={`px-2 py-1 text-xs rounded whitespace-nowrap transition-colors ${
                                selectedTab === c.tabKey
                                    ? "bg-[#3c3c3c] text-blue-400 font-medium"
                                    : "text-gray-500 hover:bg-[#3c3c3c] hover:text-gray-300"
                            }`}
                        >
                            {c.label || c.tabKey}
                        </button>
                    ))}
                </div>
            )}

            {/* Error bar */}
            {error && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-900/30 border-b border-red-800 text-xs text-red-400 shrink-0">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    <span>Invalid JSON: {error}</span>
                </div>
            )}

            {/* Editor */}
            <div className="relative flex-1 overflow-auto bg-[#1e1e1e]">
                <Editor
                    value={editorValue}
                    onValueChange={handleEditorChange}
                    highlight={highlightJson}
                    padding={12}
                    textareaId="json-editor"
                    className="json-editor-root"
                    style={{
                        fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace",
                        fontSize: 13,
                        lineHeight: "20px",
                        minHeight: "100%",
                        color: "#a9b7c6",
                        backgroundColor: "#1e1e1e",
                    }}
                />
            </div>
        </div>
    );
}
