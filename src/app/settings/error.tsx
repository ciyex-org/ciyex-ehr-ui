"use client";

import React from "react";

export default function SettingsError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    React.useEffect(() => {
        console.error("Settings page error:", error);
    }, [error]);

    return (
        <div className="max-w-2xl mx-auto p-8">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-red-800 mb-2">Something went wrong</h2>
                <pre className="text-sm text-red-700 bg-red-100 rounded p-3 overflow-x-auto whitespace-pre-wrap mb-4">
                    {error.message}
                </pre>
                <button
                    onClick={reset}
                    className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
                >
                    Try again
                </button>
            </div>
        </div>
    );
}
