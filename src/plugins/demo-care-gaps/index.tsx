"use client";

import React from "react";
import type { PluginAPI } from "@/components/plugins/NativePluginLoader";
import { formatDisplayDate } from "@/utils/dateUtils";

/**
 * Demo "Care Gaps" plugin.
 *
 * Demonstrates the native plugin system by contributing:
 * 1. A banner alert on the patient chart (care gap reminders)
 * 2. A tab in the patient chart (detailed care gap list)
 *
 * In production, this would fetch real care gap data from a backend API.
 * For now, it renders static demo content to validate the plugin pipeline.
 */
export function register(api: PluginAPI) {
    api.contribute({
        slotName: "patient-chart:banner-alert",
        component: CareGapBanner,
        priority: 10,
    });

    api.contribute({
        slotName: "patient-chart:tab",
        component: CareGapTab,
        label: "Care Gaps",
        icon: "Target",
        priority: 50,
    });

    api.contribute({
        slotName: "patient-chart:summary-card",
        component: CareGapSummaryCard,
        priority: 20,
    });

    // Subscribe to patient change events via event bus
    api.events.on("patient:changed", (patientId: string) => {
        console.log(`[demo-care-gaps] Patient changed to ${patientId}, would refresh care gaps`);
    });
}

/**
 * Banner alert component shown at top of patient chart.
 */
function CareGapBanner({ patientId }: { patientId: string }) {
    return (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="shrink-0 w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                    2 open care gaps detected
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400">
                    Annual wellness visit overdue, HbA1c screening needed
                </p>
            </div>
            <span className="text-xs text-amber-500 dark:text-amber-400 shrink-0">
                Demo Plugin
            </span>
        </div>
    );
}

/**
 * Full tab component for the patient chart sidebar.
 */
function CareGapTab({ patientId }: { patientId: string }) {
    const gaps = [
        {
            id: "1",
            measure: "Annual Wellness Visit",
            status: "open",
            dueDate: "2026-01-15",
            description: "Patient has not had an annual wellness visit in the past 12 months.",
            priority: "high",
        },
        {
            id: "2",
            measure: "HbA1c Screening",
            status: "open",
            dueDate: "2026-02-01",
            description: "Diabetic patient requires HbA1c screening per HEDIS guidelines.",
            priority: "high",
        },
        {
            id: "3",
            measure: "Colorectal Cancer Screening",
            status: "closed",
            dueDate: "2025-11-20",
            description: "Colonoscopy completed on 11/20/2025.",
            priority: "medium",
        },
    ];

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Care Gaps</h3>
                    <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full font-medium">
                        {gaps.filter((g) => g.status === "open").length} Open
                    </span>
                </div>

                <div className="space-y-3">
                    {gaps.map((gap) => (
                        <div
                            key={gap.id}
                            className={`p-4 rounded-lg border ${
                                gap.status === "open"
                                    ? "border-amber-200 bg-amber-50/50"
                                    : "border-gray-200 bg-gray-50"
                            }`}
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-sm font-medium text-gray-900">
                                            {gap.measure}
                                        </h4>
                                        <span
                                            className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                                                gap.status === "open"
                                                    ? "bg-amber-100 text-amber-700"
                                                    : "bg-green-100 text-green-700"
                                            }`}
                                        >
                                            {gap.status}
                                        </span>
                                        {gap.priority === "high" && (
                                            <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full">
                                                High Priority
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {gap.description}
                                    </p>
                                </div>
                                <span className="text-xs text-gray-400 shrink-0 ml-4">
                                    Due: {formatDisplayDate(gap.dueDate)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                <p className="text-xs text-gray-400 mt-4 text-center">
                    Powered by Care Gaps Demo Plugin
                </p>
            </div>
        </div>
    );
}

/**
 * Summary card for the patient dashboard grid.
 * Shows a compact overview of open care gaps.
 */
function CareGapSummaryCard({ patientId }: { patientId: string }) {
    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-800">Care Gaps</h4>
                <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">
                    2 Open
                </span>
            </div>
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                    <span className="text-gray-700">Annual Wellness Visit — overdue</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                    <span className="text-gray-700">HbA1c Screening — due Feb 2026</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                    <span className="text-gray-400">Colorectal Screening — closed</span>
                </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-3">Demo Plugin</p>
        </div>
    );
}
