"use client";

import React, { useState } from "react";
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from "lucide-react";

const FIELD_TYPES = [
    { value: "text", label: "Text" },
    { value: "textarea", label: "Text Area" },
    { value: "number", label: "Number" },
    { value: "select", label: "Dropdown" },
    { value: "multiselect", label: "Multi-Select" },
    { value: "radio", label: "Radio Buttons" },
    { value: "checkbox", label: "Checkbox" },
    { value: "boolean", label: "Yes/No Toggle" },
    { value: "date", label: "Date" },
    { value: "datetime", label: "Date & Time" },
    { value: "file", label: "File Upload" },
];

interface FormField {
    name: string;
    label: string;
    type: string;
    required?: boolean;
    options?: string[];
    min?: number;
    max?: number;
    step?: number;
    rows?: number;
    accept?: string;
    placeholder?: string;
}

interface FormSection {
    title: string;
    fields: FormField[];
}

interface FormSchema {
    title: string;
    sections: FormSection[];
}

interface FormBuilderProps {
    schema: FormSchema;
    onChange: (schema: FormSchema) => void;
}

export default function FormBuilder({ schema, onChange }: FormBuilderProps) {
    const [expandedSection, setExpandedSection] = useState<number>(0);

    const updateTitle = (title: string) => {
        onChange({ ...schema, title });
    };

    const addSection = () => {
        onChange({
            ...schema,
            sections: [...schema.sections, { title: `Section ${schema.sections.length + 1}`, fields: [] }],
        });
    };

    const removeSection = (idx: number) => {
        onChange({
            ...schema,
            sections: schema.sections.filter((_, i) => i !== idx),
        });
    };

    const updateSectionTitle = (idx: number, title: string) => {
        const sections = [...schema.sections];
        sections[idx] = { ...sections[idx], title };
        onChange({ ...schema, sections });
    };

    const addField = (sectionIdx: number) => {
        const sections = [...schema.sections];
        const fieldCount = sections[sectionIdx].fields.length;
        sections[sectionIdx] = {
            ...sections[sectionIdx],
            fields: [
                ...sections[sectionIdx].fields,
                {
                    name: `field_${fieldCount + 1}`,
                    label: `Field ${fieldCount + 1}`,
                    type: "text",
                    required: false,
                },
            ],
        };
        onChange({ ...schema, sections });
    };

    const updateField = (sectionIdx: number, fieldIdx: number, updates: Partial<FormField>) => {
        const sections = [...schema.sections];
        const fields = [...sections[sectionIdx].fields];
        fields[fieldIdx] = { ...fields[fieldIdx], ...updates };
        sections[sectionIdx] = { ...sections[sectionIdx], fields };
        onChange({ ...schema, sections });
    };

    const removeField = (sectionIdx: number, fieldIdx: number) => {
        const sections = [...schema.sections];
        sections[sectionIdx] = {
            ...sections[sectionIdx],
            fields: sections[sectionIdx].fields.filter((_, i) => i !== fieldIdx),
        };
        onChange({ ...schema, sections });
    };

    const moveField = (sectionIdx: number, fieldIdx: number, direction: "up" | "down") => {
        const sections = [...schema.sections];
        const fields = [...sections[sectionIdx].fields];
        const swapIdx = direction === "up" ? fieldIdx - 1 : fieldIdx + 1;
        if (swapIdx < 0 || swapIdx >= fields.length) return;
        [fields[fieldIdx], fields[swapIdx]] = [fields[swapIdx], fields[fieldIdx]];
        sections[sectionIdx] = { ...sections[sectionIdx], fields };
        onChange({ ...schema, sections });
    };

    const hasOptions = (type: string) => ["select", "multiselect", "radio"].includes(type);

    return (
        <div className="space-y-4">
            {/* Form Title */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Form Title</label>
                <input
                    type="text"
                    value={schema.title}
                    onChange={(e) => updateTitle(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Wound Care Assessment"
                />
            </div>

            {/* Sections */}
            {schema.sections.map((section, sIdx) => (
                <div key={sIdx} className="border border-gray-200 rounded-lg">
                    {/* Section Header */}
                    <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
                        <button
                            onClick={() => setExpandedSection(expandedSection === sIdx ? -1 : sIdx)}
                            className="p-0.5 text-gray-400"
                        >
                            {expandedSection === sIdx ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        <input
                            type="text"
                            value={section.title}
                            onChange={(e) => updateSectionTitle(sIdx, e.target.value)}
                            className="text-sm font-medium text-gray-700 bg-transparent border-none outline-none flex-1"
                            placeholder="Section title"
                        />
                        <span className="text-xs text-gray-400">{section.fields.length} fields</span>
                        {schema.sections.length > 1 && (
                            <button
                                onClick={() => removeSection(sIdx)}
                                className="p-1 text-red-400 hover:text-red-600"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Fields */}
                    {expandedSection === sIdx && (
                        <div className="p-4 space-y-3">
                            {section.fields.map((field, fIdx) => (
                                <div key={fIdx} className="border border-gray-100 rounded-md p-3 bg-white">
                                    <div className="flex items-start gap-2">
                                        <div className="flex flex-col items-center gap-0.5 pt-1">
                                            <button
                                                onClick={() => moveField(sIdx, fIdx, "up")}
                                                disabled={fIdx === 0}
                                                className="p-0.5 text-gray-300 hover:text-gray-500 disabled:opacity-30"
                                            >
                                                <ChevronUp className="w-3 h-3" />
                                            </button>
                                            <GripVertical className="w-3.5 h-3.5 text-gray-300" />
                                            <button
                                                onClick={() => moveField(sIdx, fIdx, "down")}
                                                disabled={fIdx === section.fields.length - 1}
                                                className="p-0.5 text-gray-300 hover:text-gray-500 disabled:opacity-30"
                                            >
                                                <ChevronDown className="w-3 h-3" />
                                            </button>
                                        </div>

                                        <div className="flex-1 grid grid-cols-4 gap-2">
                                            {/* Field Name */}
                                            <div>
                                                <label className="text-xs text-gray-500">Name (key)</label>
                                                <input
                                                    type="text"
                                                    value={field.name}
                                                    onChange={(e) => updateField(sIdx, fIdx, { name: e.target.value.replace(/\s/g, "_").toLowerCase() })}
                                                    className="w-full px-2 py-1 text-xs border border-gray-200 rounded font-mono"
                                                />
                                            </div>

                                            {/* Field Label */}
                                            <div>
                                                <label className="text-xs text-gray-500">Label</label>
                                                <input
                                                    type="text"
                                                    value={field.label}
                                                    onChange={(e) => updateField(sIdx, fIdx, { label: e.target.value })}
                                                    className="w-full px-2 py-1 text-xs border border-gray-200 rounded"
                                                />
                                            </div>

                                            {/* Field Type */}
                                            <div>
                                                <label className="text-xs text-gray-500">Type</label>
                                                <select
                                                    value={field.type}
                                                    onChange={(e) => updateField(sIdx, fIdx, { type: e.target.value })}
                                                    className="w-full px-2 py-1 text-xs border border-gray-200 rounded"
                                                >
                                                    {FIELD_TYPES.map((ft) => (
                                                        <option key={ft.value} value={ft.value}>{ft.label}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Required */}
                                            <div className="flex items-end gap-2">
                                                <label className="flex items-center gap-1 text-xs text-gray-600">
                                                    <input
                                                        type="checkbox"
                                                        checked={field.required || false}
                                                        onChange={(e) => updateField(sIdx, fIdx, { required: e.target.checked })}
                                                        className="rounded border-gray-300"
                                                    />
                                                    Required
                                                </label>
                                                <button
                                                    onClick={() => removeField(sIdx, fIdx)}
                                                    className="p-1 text-red-400 hover:text-red-600 ml-auto"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Options for select/radio/multiselect */}
                                    {hasOptions(field.type) && (
                                        <div className="mt-2 ml-8">
                                            <label className="text-xs text-gray-500">Options (comma-separated)</label>
                                            <input
                                                type="text"
                                                value={(field.options || []).join(", ")}
                                                onChange={(e) =>
                                                    updateField(sIdx, fIdx, {
                                                        options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                                                    })
                                                }
                                                className="w-full px-2 py-1 text-xs border border-gray-200 rounded"
                                                placeholder="Option 1, Option 2, Option 3"
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}

                            <button
                                onClick={() => addField(sIdx)}
                                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium py-1"
                            >
                                <Plus className="w-3.5 h-3.5" /> Add Field
                            </button>
                        </div>
                    )}
                </div>
            ))}

            <button
                onClick={addSection}
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium py-2"
            >
                <Plus className="w-4 h-4" /> Add Section
            </button>
        </div>
    );
}
