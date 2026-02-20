"use client";

import React, { useEffect, useState, useRef } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import { Upload, Trash2, Loader2, ImageIcon } from "lucide-react";

const API_BASE = () => (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/$/, "");

export default function PracticeLogoUpload() {
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetchWithAuth(`${API_BASE()}/api/practice-logo`);
                if (res.ok) {
                    const json = await res.json();
                    if (json.success && json.data?.logoData) {
                        setLogoUrl(json.data.logoData);
                    }
                }
            } catch {
                // no logo yet
            }
            setLoading(false);
        })();
    }, []);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            setError("Please select an image file (PNG, JPG, SVG)");
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            setError("Image must be under 2MB");
            return;
        }

        setError(null);
        setUploading(true);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetchWithAuth(`${API_BASE()}/api/practice-logo`, {
                method: "POST",
                body: formData,
            });
            const json = await res.json();
            if (json.success && json.data?.logoData) {
                setLogoUrl(json.data.logoData);
            } else {
                setError(json.message || "Upload failed");
            }
        } catch (err) {
            setError("Failed to upload logo");
        }
        setUploading(false);
        if (fileRef.current) fileRef.current.value = "";
    };

    const handleDelete = async () => {
        try {
            await fetchWithAuth(`${API_BASE()}/api/practice-logo`, { method: "DELETE" });
            setLogoUrl(null);
        } catch {
            setError("Failed to remove logo");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center gap-2 p-4 text-sm text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading logo...
            </div>
        );
    }

    return (
        <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-start gap-5">
                {/* Logo preview */}
                <div className="w-28 h-28 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                    {logoUrl ? (
                        <img src={logoUrl} alt="Practice logo" className="w-full h-full object-contain p-1" />
                    ) : (
                        <ImageIcon className="w-8 h-8 text-gray-300" />
                    )}
                </div>

                {/* Controls */}
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-700 mb-1">Practice Logo</h3>
                    <p className="text-xs text-gray-500 mb-3">
                        Upload your practice logo. It will appear on printed documents and reports. Max 2MB, PNG/JPG/SVG.
                    </p>

                    <div className="flex items-center gap-2">
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
                            {uploading ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Upload className="w-3.5 h-3.5" />
                            )}
                            {uploading ? "Uploading..." : logoUrl ? "Change" : "Upload"}
                            <input
                                ref={fileRef}
                                type="file"
                                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                                className="hidden"
                                onChange={handleUpload}
                                disabled={uploading}
                            />
                        </label>

                        {logoUrl && (
                            <button
                                onClick={handleDelete}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-red-200 text-sm text-red-600 hover:bg-red-50"
                            >
                                <Trash2 className="w-3.5 h-3.5" /> Remove
                            </button>
                        )}
                    </div>

                    {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
                </div>
            </div>
        </div>
    );
}
