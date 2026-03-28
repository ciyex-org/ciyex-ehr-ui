'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Practice {
    orgId: number;
    orgName: string;
}

const PracticeSwitch: React.FC = () => {
    const [practices, setPractices] = useState<Practice[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        try {
            // Get login data from localStorage
            const userData = JSON.parse(localStorage.getItem("user") || "{}");

            // Extract orgs (array with orgId + orgName)
            const orgs: Practice[] = Array.isArray(userData.orgs) ? userData.orgs : [];

            setPractices(orgs);

            // Auto-select if only one org
            if (orgs.length === 1) {
                handlePracticeSelect(orgs[0].orgId);
            }
        } catch (err) {
            console.error("Error loading practices:", err);
            setPractices([]);
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handlePracticeSelect = (orgId: number) => {
        localStorage.setItem("orgId", String(orgId));
        router.push(`/dashboard?orgId=${orgId}`);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-100">
                <p>Loading practices...</p>
            </div>
        );
    }

    return (
        <div className="flex justify-center items-center min-h-screen bg-gray-100">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
                <h2 className="text-xl font-bold mb-4">Select a Practice</h2>
                <div className="space-y-3">
                    {practices.length > 0 ? (
                        practices.map((practice) => (
                            <button
                                key={practice.orgId}
                                onClick={() => handlePracticeSelect(practice.orgId)}
                                className="w-full p-3 text-left bg-gray-100 hover:bg-gray-200 rounded-md transition"
                            >
                                {practice.orgName || `Org #${practice.orgId}`}
                            </button>
                        ))
                    ) : (
                        <p>No available practices found for your account.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PracticeSwitch;
