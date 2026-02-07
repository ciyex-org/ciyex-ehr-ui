"use client";

import { getEnv } from "@/utils/env";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import AdminLayout from "@/app/(admin)/layout";
import Button from "@/components/ui/button/Button";

type Status = "ALL" | "ACTIVE" | "ARCHIVED";

interface ReferralPractice {
    id: number;
    name: string;
    email: string | null;
    phoneNumber: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    country: string | null;
    fhirId: string | null;
    npiId: string | null;
    taxId: string | null;
    status?: "ACTIVE" | "ARCHIVED";
}

/* Avatar color helper */
const getAvatarTone = (seed: string) => {
    const tones = [
        "bg-indigo-100 text-indigo-700",
        "bg-pink-100 text-pink-700",
        "bg-emerald-100 text-emerald-700",
        "bg-amber-100 text-amber-700",
        "bg-sky-100 text-sky-700",
        "bg-purple-100 text-purple-700",
    ];
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
    return tones[Math.abs(h) % tones.length];
};

/* Get initials from name */
const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};

const ReferralPracticeList = () => {
    const apiUrl = getEnv("NEXT_PUBLIC_API_URL");
    const router = useRouter();

    const [practices, setPractices] = useState<ReferralPractice[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const [search, setSearch] = useState<string>("");
    const [filter, setFilter] = useState<Status>("ALL");

    const counts = useMemo(() => {
        const active = practices.filter((p) => p.status === "ACTIVE").length;
        const archived = practices.filter((p) => p.status === "ARCHIVED").length;
        return { all: practices.length, active, archived };
    }, [practices]);

    useEffect(() => {
        fetchReferralPractices();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchReferralPractices = async () => {
        try {
            setLoading(true);
            const response = await fetchWithAuth(
                `${apiUrl}/api/referral-practices`,
                {
                    method: "GET",
                    headers: { Accept: "application/json" },
                }
            );

            if (response.ok) {
                const data = await response.json();
                let practicesData = [];

                if (Array.isArray(data)) {
                    practicesData = data;
                } else if (data?.data && Array.isArray(data.data)) {
                    practicesData = data.data;
                }

                // Add default ACTIVE status if not present
                practicesData = practicesData.map((p: ReferralPractice) => ({
                    ...p,
                    status: p.status || "ACTIVE",
                }));

                setPractices(practicesData);
            } else {
                setError("Failed to fetch referral practices");
            }
        } catch (err) {
            console.error("Error fetching referral practices:", err);
            setError("Error fetching referral practices");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this practice?")) return;

        try {
            const response = await fetchWithAuth(
                `${apiUrl}/api/referral-practices/${id}`,
                { method: "DELETE" }
            );

            if (response.ok || response.status === 204) {
                setPractices((prev) => prev.filter((p) => p.id !== id));
            } else {
                alert("Failed to delete practice");
            }
        } catch (err) {
            console.error("Error deleting practice:", err);
            alert("Error deleting practice");
        }
    };

    const handleToggleStatus = async (id: number, currentStatus: string) => {
        const newStatus = currentStatus === "ACTIVE" ? "ARCHIVED" : "ACTIVE";
        
        // Optimistic update
        setPractices((prev) =>
            prev.map((p) => (p.id === id ? { ...p, status: newStatus as "ACTIVE" | "ARCHIVED" } : p))
        );
    };

    const filtered = useMemo(() => {
        let result = practices;

        // Filter by status
        if (filter !== "ALL") {
            result = result.filter((p) => p.status === filter);
        }

        // Filter by search
        if (search.trim()) {
            const lower = search.toLowerCase();
            result = result.filter(
                (p) =>
                    p.name?.toLowerCase().includes(lower) ||
                    p.city?.toLowerCase().includes(lower) ||
                    p.state?.toLowerCase().includes(lower) ||
                    p.phoneNumber?.toLowerCase().includes(lower)
            );
        }

        return result;
    }, [practices, filter, search]);

    return (
        <AdminLayout>
            <div className="container mx-auto p-6">
                <div className="bg-white rounded-lg shadow-md">
                    {/* Header */}
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                            <h1 className="text-2xl font-semibold text-gray-800">
                                Referral Practices
                            </h1>
                            <Button
                                size="md"
                                variant="primary"
                                onClick={() => router.push("/settings/referral-practices/add")}
                            >
                                + Add Practice
                            </Button>
                        </div>

                        {/* Search & Filter */}
                        <div className="flex flex-col md:flex-row gap-4">
                            <input
                                type="text"
                                placeholder="Search practices..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setFilter("ALL")}
                                    className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                                        filter === "ALL"
                                            ? "bg-indigo-600 text-white"
                                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                    }`}
                                >
                                    All ({counts.all})
                                </button>
                                <button
                                    onClick={() => setFilter("ACTIVE")}
                                    className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                                        filter === "ACTIVE"
                                            ? "bg-green-600 text-white"
                                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                    }`}
                                >
                                    Active ({counts.active})
                                </button>
                                <button
                                    onClick={() => setFilter("ARCHIVED")}
                                    className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                                        filter === "ARCHIVED"
                                            ? "bg-gray-600 text-white"
                                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                    }`}
                                >
                                    Archived ({counts.archived})
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="p-4 m-6 bg-red-100 text-red-700 rounded text-sm">
                            {error}
                        </div>
                    )}

                    {/* Table */}
                    {loading ? (
                        <div className="flex justify-center items-center py-20">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Practice Name
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Location
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Phone
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filtered.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={5}
                                                className="px-6 py-8 text-center text-gray-500"
                                            >
                                                No practices found
                                            </td>
                                        </tr>
                                    ) : (
                                        filtered.map((practice) => (
                                            <tr
                                                key={practice.id}
                                                className="hover:bg-gray-50 transition-colors"
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div
                                                            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${getAvatarTone(
                                                                practice.name
                                                            )}`}
                                                        >
                                                            {getInitials(practice.name)}
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {practice.name}
                                                            </div>
                                                            {practice.email && (
                                                                <div className="text-xs text-gray-500">
                                                                    {practice.email}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">
                                                        {practice.city && practice.state
                                                            ? `${practice.city}, ${practice.state}`
                                                            : practice.city || practice.state || "-"}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">
                                                        {practice.phoneNumber || "-"}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span
                                                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                            practice.status === "ACTIVE"
                                                                ? "bg-green-100 text-green-800"
                                                                : "bg-gray-100 text-gray-800"
                                                        }`}
                                                    >
                                                        {practice.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="flex items-center gap-2 justify-end flex-nowrap">
                                                        {/* Edit */}
                                                        <button
                                                            onClick={() =>
                                                                router.push(
                                                                    `/settings/referral-practices/edit/${practice.id}`
                                                                )
                                                            }
                                                            className="group flex items-center justify-center w-9 h-9 rounded-full border border-blue-500 text-blue-500 shadow hover:bg-blue-50"
                                                            title="Edit"
                                                        >
                                                            <svg className="fill-current" width="16" height="16" viewBox="0 0 18 18">
                                                                <path d="M15.091 2.782a2 2 0 0 0-2.828 0l-7.334 7.334a2 2 0 0 0-.59 1.127l-.652 3.093a.667.667 0 0 0 .788.788l3.093-.652a2 2 0 0 0 1.127-.59l7.334-7.334a2 2 0 0 0 0-2.828z" />
                                                            </svg>
                                                        </button>

                                                        {/* Archive / Unarchive */}
                                                        <button
                                                            onClick={() =>
                                                                handleToggleStatus(
                                                                    practice.id,
                                                                    practice.status || "ACTIVE"
                                                                )
                                                            }
                                                            className={`group flex items-center justify-center w-9 h-9 rounded-full border shadow ${
                                                                practice.status === "ACTIVE"
                                                                    ? "border-green-500 text-green-500 hover:bg-green-50"
                                                                    : "border-red-500 text-red-500 hover:bg-red-50"
                                                            }`}
                                                            title={practice.status === "ACTIVE" ? "Archive" : "Unarchive"}
                                                        >
                                                            <svg className="fill-current" width="16" height="16" viewBox="0 0 24 24">
                                                                {practice.status === "ACTIVE" ? (
                                                                    <path d="M20.54 5.23l-1.39-1.39C18.9 3.34 18.45 3 18 3H6c-.45 0-.9.34-1.15.84L3.46 5.23A1 1 0 0 0 3 6v2c0 .55.45 1 1 1v9c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V9c.55 0 1-.45 1-1V6c0-.27-.11-.52-.29-.71zM12 17l-5-5h3V9h4v3h3l-5 5z" />
                                                                ) : (
                                                                    <path d="M20.54 5.23l-1.39-1.39C18.9 3.34 18.45 3 18 3H6c-.45 0-.9.34-1.15.84L3.46 5.23A1 1 0 0 0 3 6v2c0 .55.45 1 1 1v9c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V9c.55 0 1-.45 1-1V6c0-.27-.11-.52-.29-.71zM12 8l5 5h-3v3h-4v-3H7l5-5z" />
                                                                )}
                                                            </svg>
                                                        </button>

                                                        {/* Delete */}
                                                        <button
                                                            onClick={() => handleDelete(practice.id)}
                                                            className="group flex items-center justify-center w-9 h-9 rounded-full border border-red-500 text-red-500 shadow hover:bg-red-50"
                                                            title="Delete"
                                                        >
                                                            <svg className="fill-current" width="16" height="16" viewBox="0 0 18 18">
                                                                <path d="M13.5 3h-3l-.707-.707A1 1 0 0 0 9.086 2H8.914a1 1 0 0 0-.707.293L7.5 3h-3a1 1 0 0 0 0 2h9a1 1 0 1 0 0-2zM6 16a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V6H6v10zm3-8a1 1 0 0 1 2 0v6a1 1 0 1 1-2 0V8z" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
};

export default ReferralPracticeList;
