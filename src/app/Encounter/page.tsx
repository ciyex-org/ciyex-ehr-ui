"use client";

import { useEffect, useState } from "react";
import EncounterList from "@/components/encounter/EncounterList";

export default function EncounterClient() {
    const [pid, setPid] = useState<number | null>(null);

    useEffect(() => {
        const v = localStorage.getItem("patientId");
        setPid(v ? Number(v) : null);
    }, []);

    if (pid == null) {
        return (
            <div className="rounded-2xl border p-4">
                <p className="mb-2">No patient selected.</p>
                <p className="text-sm text-gray-600">Set one in localStorage for dev:</p>
                <code className="text-xs bg-gray-100 p-2 rounded block mt-2">
                    {`localStorage.setItem("patientId","1")`}
                </code>
            </div>
        );
    }

    return <EncounterList patientId={pid} />;
}
