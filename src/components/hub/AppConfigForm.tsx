"use client";

import React, { useState } from "react";
import { Save, Loader2 } from "lucide-react";

interface ConfigField {
    type: string;
    title: string;
    description?: string;
    default?: any;
    enum?: string[];
}

interface ConfigSchema {
    type?: string;
    properties?: Record<string, ConfigField>;
    required?: string[];
}

interface AppConfigFormProps {
    schema: ConfigSchema;
    currentConfig: Record<string, any>;
    onSave: (config: Record<string, any>) => Promise<void>;
}

export default function AppConfigForm({ schema, currentConfig, onSave }: AppConfigFormProps) {
    const [config, setConfig] = useState<Record<string, any>>(currentConfig || {});
    const [saving, setSaving] = useState(false);

    const properties = schema?.properties || {};
    const required = schema?.required || [];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await onSave(config);
        } finally {
            setSaving(false);
        }
    };

    const updateField = (key: string, value: any) => {
        setConfig((prev) => ({ ...prev, [key]: value }));
    };

    if (Object.keys(properties).length === 0) {
        return (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-4">
                This app has no configurable settings.
            </p>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {Object.entries(properties).map(([key, field]) => (
                <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {field.title || key}
                        {required.includes(key) && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {field.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{field.description}</p>
                    )}

                    {field.type === "boolean" ? (
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={config[key] ?? field.default ?? false}
                                onChange={(e) => updateField(key, e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                        </label>
                    ) : field.enum ? (
                        <select
                            value={config[key] ?? field.default ?? ""}
                            onChange={(e) => updateField(key, e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            {field.enum.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    ) : field.type === "integer" || field.type === "number" ? (
                        <input
                            type="number"
                            value={config[key] ?? field.default ?? ""}
                            onChange={(e) => updateField(key, Number(e.target.value))}
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    ) : (
                        <input
                            type="text"
                            value={config[key] ?? field.default ?? ""}
                            onChange={(e) => updateField(key, e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    )}
                </div>
            ))}

            <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Configuration
            </button>
        </form>
    );
}
