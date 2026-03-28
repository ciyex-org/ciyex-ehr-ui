"use client";

import React from "react";
import { useDisplaySettings, type FontSize } from "@/context/DisplaySettingsContext";
import { Monitor, Type, Check } from "lucide-react";

const FONT_OPTIONS: { value: FontSize; label: string; desc: string; sample: string }[] = [
    { value: "small", label: "Small", desc: "14px base", sample: "text-sm" },
    { value: "default", label: "Default", desc: "16px base", sample: "text-base" },
    { value: "large", label: "Large", desc: "18px base", sample: "text-lg" },
    { value: "x-large", label: "Extra Large", desc: "20px base", sample: "text-xl" },
];

export default function DisplaySettings() {
    const { fontSize, setFontSize } = useDisplaySettings();

    return (
        <div className="p-6 max-w-2xl">
            <div className="flex items-center gap-2 mb-6">
                <Monitor className="w-5 h-5 text-gray-500" />
                <h2 className="text-lg font-semibold text-gray-900">Display Settings</h2>
            </div>

            {/* Font Size */}
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                    <Type className="w-4 h-4 text-gray-400" />
                    <h3 className="text-sm font-semibold text-gray-700">Font Size</h3>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                    Adjust the base font size across the entire application. This affects all text, buttons, and form elements.
                </p>
                <div className="grid grid-cols-4 gap-3">
                    {FONT_OPTIONS.map((opt) => {
                        const isActive = fontSize === opt.value;
                        return (
                            <button
                                key={opt.value}
                                onClick={() => setFontSize(opt.value)}
                                className={`relative flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                                    isActive
                                        ? "border-blue-500 bg-blue-50"
                                        : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                                }`}
                            >
                                {isActive && (
                                    <span className="absolute top-2 right-2">
                                        <Check className="w-4 h-4 text-blue-600" />
                                    </span>
                                )}
                                <span
                                    className="font-medium text-gray-900"
                                    style={{ fontSize: opt.value === "small" ? "14px" : opt.value === "default" ? "16px" : opt.value === "large" ? "18px" : "20px" }}
                                >
                                    Aa
                                </span>
                                <span className={`text-sm font-medium ${isActive ? "text-blue-700" : "text-gray-700"}`}>
                                    {opt.label}
                                </span>
                                <span className="text-xs text-gray-400">{opt.desc}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Preview */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Preview</h4>
                <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-gray-900">Patient: Karen Mitchell</h3>
                    <p className="text-sm text-gray-600">Date of Birth: 12/16/1960 (65y) &middot; Female &middot; MRN: 1148</p>
                    <div className="flex items-center gap-2 mt-3">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Allergy: Peanut</span>
                    </div>
                    <table className="w-full mt-3 text-sm">
                        <thead>
                            <tr className="border-b border-gray-200">
                                <th className="text-left py-2 text-gray-500 font-medium">Field</th>
                                <th className="text-left py-2 text-gray-500 font-medium">Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-gray-100">
                                <td className="py-2 text-gray-600">Phone</td>
                                <td className="py-2 text-gray-900">(543) 476-5375</td>
                            </tr>
                            <tr className="border-b border-gray-100">
                                <td className="py-2 text-gray-600">Email</td>
                                <td className="py-2 text-gray-900">karen.mitchell@email.com</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <p className="text-xs text-gray-400 mt-4">
                This setting is saved to your browser. Each user can set their own preferred font size.
            </p>
        </div>
    );
}
