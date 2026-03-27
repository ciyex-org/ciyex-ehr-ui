"use client";

import React, { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import { Loader2, Copy, Calendar, User, Tag } from "lucide-react";
import { formatDisplayDate } from "@/utils/dateUtils";

const API_BASE = () => (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/$/, "");

interface EncounterRow {
    id: number;
    encounterDate?: string;
    visitCategory?: string;
    encounterProvider?: string;
    status?: string;
    reasonForVisit?: string;
}

interface CloneEncounterModalProps {
    patientId: number;
    currentEncounterId: number;
    tabKey: string;
    open: boolean;
    onClose: () => void;
    onCloned: (data: Record<string, any>) => void;
}

export default function CloneEncounterModal({
    patientId,
    currentEncounterId,
    tabKey,
    open,
    onClose,
    onCloned,
}: CloneEncounterModalProps) {
    const [encounters, setEncounters] = useState<EncounterRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [cloning, setCloning] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setLoading(true);
        setError(null);

        (async () => {
            try {
                const res = await fetchWithAuth(`${API_BASE()}/api/${patientId}/encounters`);
                if (res.ok) {
                    const json = await res.json();
                    const list: EncounterRow[] = (json.data || [])
                        .filter((e: any) => e.id !== currentEncounterId)
                        .sort((a: any, b: any) => {
                            const da = a.encounterDate || "";
                            const db = b.encounterDate || "";
                            return db.localeCompare(da);
                        });
                    setEncounters(list);
                } else {
                    setError("Failed to load encounters");
                }
            } catch {
                setError("Failed to load encounters");
            }
            setLoading(false);
        })();
    }, [open, patientId, currentEncounterId]);

    const handleClone = async (sourceId: number) => {
        setCloning(sourceId);
        setError(null);
        try {
            const res = await fetchWithAuth(
                `${API_BASE()}/api/fhir-resource/${tabKey}/patient/${patientId}?encounterRef=${sourceId}`
            );
            if (!res.ok) {
                setError("Failed to fetch source encounter data");
                setCloning(null);
                return;
            }
            const json = await res.json();
            const pageData = json.data || {};
            const content = pageData.content || [];

            if (content.length === 0) {
                setError("Source encounter has no form data to clone");
                setCloning(null);
                return;
            }

            const source = { ...content[0] };
            // Strip IDs and metadata so a new Composition is created
            delete source.id;
            delete source.fhirId;
            delete source._lastUpdated;
            delete source.lastUpdated;

            onCloned(source);
        } catch {
            setError("Failed to clone encounter data");
        }
        setCloning(null);
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return "—";
        return formatDisplayDate(dateStr) || "—";
    };

    const statusColor = (s?: string) => {
        switch (s?.toUpperCase()) {
            case "SIGNED": return "bg-green-50 text-green-700";
            case "INCOMPLETE": return "bg-amber-50 text-amber-700";
            default: return "bg-gray-100 text-gray-600";
        }
    };

    return (
        <Modal isOpen={open} onClose={onClose} className="max-w-2xl p-6">
            <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Copy className="w-5 h-5 text-blue-600" />
                    Clone from Previous Encounter
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                    Select an encounter to copy its form data into the current encounter.
                </p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
            ) : encounters.length === 0 ? (
                <div className="text-center py-12 text-sm text-gray-400">
                    No previous encounters found for this patient.
                </div>
            ) : (
                <div className="max-h-[400px] overflow-y-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr className="text-left text-xs text-gray-500 uppercase">
                                <th className="px-4 py-2">ID</th>
                                <th className="px-4 py-2">Date</th>
                                <th className="px-4 py-2">Category</th>
                                <th className="px-4 py-2">Provider</th>
                                <th className="px-4 py-2">Status</th>
                                <th className="px-4 py-2"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {encounters.map((enc) => (
                                <tr
                                    key={enc.id}
                                    className="hover:bg-blue-50 cursor-pointer transition-colors"
                                    onClick={() => !cloning && handleClone(enc.id)}
                                >
                                    <td className="px-4 py-2.5 whitespace-nowrap">
                                        <span className="text-xs text-gray-500 font-mono">#{enc.id}</span>
                                    </td>
                                    <td className="px-4 py-2.5 whitespace-nowrap">
                                        <span className="flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                            {formatDate(enc.encounterDate)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <span className="flex items-center gap-1.5">
                                            <Tag className="w-3.5 h-3.5 text-gray-400" />
                                            {enc.visitCategory || "—"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <span className="flex items-center gap-1.5">
                                            <User className="w-3.5 h-3.5 text-gray-400" />
                                            {enc.encounterProvider || "—"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(enc.status)}`}>
                                            {enc.status || "—"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2.5 text-right">
                                        {cloning === enc.id ? (
                                            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                                        ) : (
                                            <span className="text-xs text-blue-600 font-medium">Clone</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {error && (
                <p className="text-xs text-red-600 mt-3">{error}</p>
            )}
        </Modal>
    );
}
