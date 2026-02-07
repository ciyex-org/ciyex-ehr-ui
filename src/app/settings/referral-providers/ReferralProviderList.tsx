"use client";

import { getEnv } from "@/utils/env";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import AdminLayout from "@/app/(admin)/layout";
import Button from "@/components/ui/button/Button";

type Status = "ALL" | "ACTIVE" | "ARCHIVED";

interface ReferralProvider {
    id: number;
    name: string;
    email: string | null;
    phoneNumber: string | null;
    specialty: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    country: string | null;
    fhirId: string | null;
    npiId: string | null;
    taxId: string | null;
    practiceId: number;
    practiceName?: string;
    createdDate: string;
    lastModifiedDate: string;
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

const ReferralProviderList = () => {
    const apiUrl = getEnv("NEXT_PUBLIC_API_URL");
    const router = useRouter();

    const [providers, setProviders] = useState<ReferralProvider[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const [search, setSearch] = useState<string>("");
    const [filter, setFilter] = useState<Status>("ALL");

    const counts = useMemo(() => {
        const active = providers.filter((p) => p.status === "ACTIVE").length;
        const archived = providers.filter((p) => p.status === "ARCHIVED").length;
        return { all: providers.length, active, archived };
    }, [providers]);

    useEffect(() => {
        fetchReferralProviders();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchReferralProviders = async () => {
        try {
            setLoading(true);
            const response = await fetchWithAuth(
                `${apiUrl}/api/referral-providers`,
                {
                    method: "GET",
                    headers: { Accept: "application/json" },
                }
            );

            if (response.ok) {
                const data = await response.json();
                console.log("📦 API Response:", data);
                
                // Handle different response structures
                let providersData = [];
                
                if (Array.isArray(data)) {
                    // Direct array response
                    providersData = data;
                } else if (data?.data && Array.isArray(data.data)) {
                    // Wrapped in data property
                    providersData = data.data;
                } else if (data?.success && data?.data && Array.isArray(data.data)) {
                    // Success wrapper
                    providersData = data.data;
                }
                
                console.log("✅ Processed providers:", providersData.length);
                setProviders(providersData);
                
                if (providersData.length === 0) {
                    setError(null); // Clear error if it's just empty
                }
            } else {
                setError("Failed to fetch referral providers. Please try again.");
            }
        } catch (err) {
            console.error("Error fetching referral providers:", err);
            setError("Error fetching referral providers. Please check your network.");
        } finally {
            setLoading(false);
        }
    };

    const toggleArchiveStatus = async (provider: ReferralProvider) => {
        try {
            const currentStatus = provider.status || "ACTIVE";
            const newStatus = currentStatus === "ACTIVE" ? "ARCHIVED" : "ACTIVE";
            
            const response = await fetchWithAuth(
                `${apiUrl}/api/referral-providers/${provider.id}/status`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: newStatus }),
                }
            );

            if (response.ok) {
                setProviders((prev) =>
                    prev.map((p) =>
                        p.id === provider.id ? { ...p, status: newStatus } : p
                    )
                );
            } else {
                console.error("Failed to update status");
            }
        } catch (err) {
            console.error("Error updating status:", err);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this referral provider?")) return;

        try {
            const response = await fetchWithAuth(
                `${apiUrl}/api/referral-providers/${id}`,
                { method: "DELETE" }
            );

            if (response.ok) {
                setProviders((prev) => prev.filter((p) => p.id !== id));
            } else {
                alert("Failed to delete referral provider");
            }
        } catch (err) {
            console.error("Error deleting referral provider:", err);
            alert("Error deleting referral provider");
        }
    };

    const filteredProviders = useMemo(() => {
        const q = search.trim().toLowerCase();

        const matchesSearch = (p: ReferralProvider) => {
            const name = (p.name ?? "").toLowerCase();
            const email = (p.email ?? "").toLowerCase();
            const phone = (p.phoneNumber ?? "").toLowerCase();
            const specialty = (p.specialty ?? "").toLowerCase();
            const practice = (p.practiceName ?? "").toLowerCase();

            if (!q) return true;
            return (
                name.includes(q) ||
                email.includes(q) ||
                phone.includes(q) ||
                specialty.includes(q) ||
                practice.includes(q)
            );
        };

        const matchesFilter = (p: ReferralProvider) => {
            if (filter === "ALL") return true;
            const currentStatus = p.status || "ACTIVE";
            return currentStatus === filter;
        };

        return providers.filter((p) => matchesSearch(p) && matchesFilter(p));
    }, [providers, search, filter]);

    if (loading) {
        return (
            <AdminLayout>
                <div className="flex justify-center items-center h-full">
                    <div className="spinner-border animate-spin inline-block w-8 h-8 border-4 border-solid border-gray-200 rounded-full text-gray-800"></div>
                </div>
            </AdminLayout>
        );
    }

    if (error) {
        return (
            <AdminLayout>
                <div className="text-center text-red-500 p-6">
                    <p>{error}</p>
                    <button
                        onClick={() => fetchReferralProviders()}
                        className="text-blue-500 mt-2"
                    >
                        Retry
                    </button>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="container mx-auto p-6 overflow-x-hidden">
                {/* Heading */}
                <div className="flex items-center justify-between mb-4">
                    <div className="text-3xl font-semibold text-gray-800">Referral Providers</div>
                    <Button
                        size="md"
                        variant="primary"
                        onClick={() => router.push("/settings/referral-providers/add")}
                    >
                        Add Referral Provider
                    </Button>
                </div>

                {/* Controls */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                    <div className="relative w-full md:max-w-md">
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by name, email, phone, specialty, or practice..."
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        {search && (
                            <button
                                onClick={() => setSearch("")}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs hover:underline"
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {([
                            { key: "ALL", label: "All", count: counts.all },
                            { key: "ACTIVE", label: "Active", count: counts.active },
                            { key: "ARCHIVED", label: "Archived", count: counts.archived },
                        ] as const).map(({ key, label, count }) => {
                            const selected = filter === (key as Status);
                            return (
                                <button
                                    key={key}
                                    onClick={() => setFilter(key as Status)}
                                    className={[
                                        "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm",
                                        selected
                                            ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                                            : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
                                    ].join(" ")}
                                    aria-pressed={selected}
                                >
                                    <span>{label}</span>
                                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md">
                    <table className="w-full table-fixed">
                        <colgroup>
                            <col style={{ width: "25%" }} />
                            <col style={{ width: "20%" }} />
                            <col style={{ width: "15%" }} />
                            <col style={{ width: "15%" }} />
                            <col style={{ width: "15%" }} />
                            <col style={{ width: "160px" }} />
                        </colgroup>
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="py-3 px-6 text-left text-sm font-medium text-gray-600">
                                    Name
                                </th>
                                <th className="py-3 px-6 text-left text-sm font-medium text-gray-600">
                                    Practice
                                </th>
                                <th className="py-3 px-6 text-left text-sm font-medium text-gray-600">
                                    Specialty
                                </th>
                                <th className="py-3 px-6 text-left text-sm font-medium text-gray-600">
                                    Phone
                                </th>
                                <th className="py-3 px-6 text-left text-sm font-medium text-gray-600">
                                    Status
                                </th>
                                <th className="py-3 px-6 text-left text-sm font-medium text-gray-600">
                                    Actions
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredProviders.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-10 text-center text-sm text-gray-500">
                                        No referral providers match your filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredProviders.map((provider) => {
                                    const fullName = provider.name || "N/A";
                                    const seed = provider.name || "N";
                                    const subtitle =
                                        provider.practiceName ||
                                        provider.specialty ||
                                        provider.email ||
                                        "—";

                                    return (
                                        <tr key={provider.id} className="hover:bg-gray-50 border-b">
                                            {/* Name with avatar */}
                                            <td className="py-3 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className={[
                                                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                                                            getAvatarTone(seed),
                                                        ].join(" ")}
                                                        aria-hidden="true"
                                                    >
                                                        {getInitials(fullName)}
                                                    </div>
                                                    <div className="leading-tight">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {fullName}
                                                        </div>
                                                        <div className="text-xs text-gray-500">{subtitle}</div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="py-3 px-6 text-sm text-gray-700">
                                                {provider.practiceName || "N/A"}
                                            </td>
                                            <td className="py-3 px-6 text-sm text-gray-700">
                                                {provider.specialty || "N/A"}
                                            </td>
                                            <td className="py-3 px-6 text-sm text-gray-700">
                                                {provider.phoneNumber || "N/A"}
                                            </td>
                                            <td className="py-3 px-6 text-sm">
                                                <span
                                                    className={[
                                                        "inline-flex items-center rounded-full text-[11px] font-semibold",
                                                        "px-2 py-0.5 whitespace-nowrap",
                                                        provider.status === "ACTIVE"
                                                            ? "bg-green-100 text-green-800"
                                                            : provider.status === "ARCHIVED"
                                                            ? "bg-gray-200 text-gray-800"
                                                            : "bg-yellow-100 text-yellow-800",
                                                    ].join(" ")}
                                                >
                                                    {provider.status || "ACTIVE"}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-sm">
                                                <div className="flex items-center gap-2 justify-end flex-nowrap">
                                                    {/* Edit */}
                                                    <button
                                                        onClick={() =>
                                                            router.push(
                                                                `/settings/referral-providers/edit/${provider.id}`
                                                            )
                                                        }
                                                        className="group flex items-center justify-center w-9 h-9 rounded-full border border-blue-500 text-blue-500 shadow hover:bg-blue-50"
                                                        title="Edit"
                                                    >
                                                        <svg
                                                            className="fill-current"
                                                            width="16"
                                                            height="16"
                                                            viewBox="0 0 18 18"
                                                        >
                                                            <path d="M15.091 2.782a2 2 0 0 0-2.828 0l-7.334 7.334a2 2 0 0 0-.59 1.127l-.652 3.093a.667.667 0 0 0 .788.788l3.093-.652a2 2 0 0 0 1.127-.59l7.334-7.334a2 2 0 0 0 0-2.828z" />
                                                        </svg>
                                                    </button>

                                                    {/* Archive / Unarchive */}
                                                    <button
                                                        onClick={() => toggleArchiveStatus(provider)}
                                                        className={`group flex items-center justify-center w-9 h-9 rounded-full border shadow ${
                                                            (provider.status || "ACTIVE") === "ACTIVE"
                                                                ? "border-green-500 text-green-500 hover:bg-green-50"
                                                                : "border-red-500 text-red-500 hover:bg-red-50"
                                                        }`}
                                                        title={
                                                            (provider.status || "ACTIVE") === "ACTIVE"
                                                                ? "Archive"
                                                                : "Unarchive"
                                                        }
                                                    >
                                                        <svg
                                                            className="fill-current"
                                                            width="16"
                                                            height="16"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            {(provider.status || "ACTIVE") === "ACTIVE" ? (
                                                                <path d="M20.54 5.23l-1.39-1.39C18.9 3.34 18.45 3 18 3H6c-.45 0-.9.34-1.15.84L3.46 5.23A1 1 0 0 0 3 6v2c0 .55.45 1 1 1v9c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V9c.55 0 1-.45 1-1V6c0-.27-.11-.52-.29-.71zM12 17l-5-5h3V9h4v3h3l-5 5z" />
                                                            ) : (
                                                                <path d="M20.54 5.23l-1.39-1.39C18.9 3.34 18.45 3 18 3H6c-.45 0-.9.34-1.15.84L3.46 5.23A1 1 0 0 0 3 6v2c0 .55.45 1 1 1v9c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V9c.55 0 1-.45 1-1V6c0-.27-.11-.52-.29-.71zM12 8l5 5h-3v3h-4v-3H7l5-5z" />
                                                            )}
                                                        </svg>
                                                    </button>

                                                    {/* Delete */}
                                                    <button
                                                        onClick={() => handleDelete(provider.id)}
                                                        className="group flex items-center justify-center w-9 h-9 rounded-full border border-red-500 text-red-500 shadow hover:bg-red-50"
                                                        title="Delete"
                                                    >
                                                        <svg
                                                            className="fill-current"
                                                            width="16"
                                                            height="16"
                                                            viewBox="0 0 18 18"
                                                        >
                                                            <path d="M13.5 3h-3v-.75A1.5 1.5 0 0 0 9 .75h-1.5A1.5 1.5 0 0 0 6 2.25V3H3a.75.75 0 0 0 0 1.5h.75v9.75A1.5 1.5 0 0 0 5.25 15h6a1.5 1.5 0 0 0 1.5-1.5V4.5h.75a.75.75 0 0 0 0-1.5zM7.5 2.25a.75.75 0 0 1 .75-.75h.75a.75.75 0 0 1 .75.75V3h-2.25v-.75zM11.25 13.5h-6V4.5h6v9z" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AdminLayout>
    );
};

export default ReferralProviderList;
