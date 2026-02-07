"use client";

import { getEnv } from "@/utils/env";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import AdminLayout from "@/app/(admin)/layout";
import Button from "@/components/ui/button/Button";
import {getInitials} from "@/utils/getInitials";

type Status = "ALL" | "ACTIVE" | "ARCHIVED";

interface Provider {
    id: number;
    npi: string | null;
    identification:
        | {
        firstName: string | null;
        lastName: string | null;
        gender: string | null;
        dateOfBirth: string | null;
    }
        | null;
    contact:
        | {
        email: string | null;
        phoneNumber: string | null;
    }
        | null;
    professionalDetails:
        | {
        specialty: string | null;
        providerType: string | null;
        licenseNumber: string | null;
        licenseState: string | null;
        licenseExpiry: string | null;
    }
        | null;
    systemAccess?: {
        status?: "ACTIVE" | "ARCHIVED";
    };
}

/* ---------- local helper for avatar color (deterministic, soft tones) ---------- */
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

const ProviderList = () => {
    const apiUrl = getEnv("NEXT_PUBLIC_API_URL");
    const router = useRouter();

    const [providers, setProviders] = useState<Provider[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const [search, setSearch] = useState<string>("");
    const [filter, setFilter] = useState<Status>("ALL");

    const counts = useMemo(() => {
        const active = providers.filter((p) => p.systemAccess?.status === "ACTIVE").length;
        const archived = providers.filter((p) => p.systemAccess?.status === "ARCHIVED").length;
        return { all: providers.length, active, archived };
    }, [providers]);

    useEffect(() => {
        const fetchProviders = async () => {
            try {
                const orgIds = JSON.parse(localStorage.getItem("orgIds") || "[]");
                const response = await fetchWithAuth(
                    `${apiUrl}/api/providers?orgIds=${orgIds.join(",")}`,
                    {
                        method: "GET",
                        headers: { Accept: "application/json" }   // 👈 added
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    if (data?.data) setProviders(data.data);
                    else setError("No data found.");
                } else {
                    setError("Failed to fetch provider list. Please try again.");
                }
            } catch (err) {
                console.error("Error fetching provider data:", err);
                setError("Error fetching provider data. Please check your network.");
            } finally {
                setLoading(false);
            }
        };

        fetchProviders();
    }, [apiUrl]);


    const toggleArchiveStatus = async (provider: Provider) => {
        try {
            const newStatus = provider.systemAccess?.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE";
            const response = await fetchWithAuth(
                `${apiUrl}/api/providers/${provider.id}/status`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: newStatus }),
                }
            );

            if (response.ok) {
                setProviders((prev) =>
                    prev.map((p) =>
                        p.id === provider.id
                            ? { ...p, systemAccess: { ...p.systemAccess, status: newStatus } }
                            : p
                    )
                );
            } else {
                console.error("Failed to update status");
            }
        } catch (err) {
            console.error("Error updating status:", err);
        }
    };

    const filteredProviders = useMemo(() => {
        const q = search.trim().toLowerCase();

        const matchesSearch = (p: Provider) => {
            const name = `${p.identification?.firstName ?? ""} ${
                p.identification?.lastName ?? ""
            }`.toLowerCase();
            const email = (p.contact?.email ?? "").toLowerCase();
            const phone = (p.contact?.phoneNumber ?? "").toLowerCase();
            const specialty = (p.professionalDetails?.specialty ?? "").toLowerCase();
            const type = (p.professionalDetails?.providerType ?? "").toLowerCase();
            const npi = (p.npi ?? "").toLowerCase();

            if (!q) return true;
            return (
                name.includes(q) ||
                email.includes(q) ||
                phone.includes(q) ||
                specialty.includes(q) ||
                type.includes(q) ||
                npi.includes(q)
            );
        };

        const matchesFilter = (p: Provider) => {
            if (filter === "ALL") return true;
            return p.systemAccess?.status === filter;
        };

        return providers.filter((p) => matchesSearch(p) && matchesFilter(p));
    }, [providers, search, filter]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full">
                <div className="spinner-border animate-spin inline-block w-8 h-8 border-4 border-solid border-gray-200 rounded-full text-gray-800"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center text-red-500">
                <p>{error}</p>
                <button onClick={() => window.location.reload()} className="text-blue-500">
                    Retry
                </button>
            </div>
        );
    }

    return (
        <AdminLayout>
            <div className="container mx-auto p-6 overflow-x-hidden">
                {/* Heading */}
                <div className="flex items-center justify-between mb-4">
                    <div className="text-3xl font-semibold text-gray-800"></div>
                    <Button size="md" variant="primary" onClick={() => router.push("/settings")}>
                        Add Provider
                    </Button>
                </div>

                {/* Controls */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                    <div className="relative w-full md:max-w-md">
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by name, email, phone, specialty, type, or NPI…"
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
                                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">{count}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md">
                    <table className="w-full table-fixed">
                        <colgroup>
                            <col style={{width:"16%"}}/><col style={{width:"10%"}}/><col style={{width:"10%"}}/><col style={{width:"12%"}}/><col style={{width:"30%"}}/><col style={{width:"11%"}}/><col style={{width:"9%"}}/><col style={{width:"160px"}}/>
                        </colgroup>
                        <thead className="bg-gray-100">
                        <tr>
                            <th className="py-3 px-6 text-left text-sm font-medium text-gray-600">Full Name</th>
                            <th className="py-3 px-6 text-left text-sm font-medium text-gray-600">Provider Type</th>
                            <th className="py-3 px-6 text-left text-sm font-medium text-gray-600">Specialty</th>
                            <th className="py-3 px-6 text-left text-sm font-medium text-gray-600">Phone</th>
                            <th className="py-3 px-6 text-left text-sm font-medium text-gray-600">Email</th>
                            <th className="py-3 px-6 text-left text-sm font-medium text-gray-600">NPI Number</th>
                            <th className="py-3 px-6 text-left text-sm font-medium text-gray-600">Status</th>
                            <th className="py-3 px-6 text-left text-sm font-medium text-gray-600">Actions</th>
                        </tr>
                        </thead>

                        <tbody>
                        {filteredProviders.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="py-10 text-center text-sm text-gray-500">
                                    No providers match your filters.
                                </td>
                            </tr>
                        ) : (
                            filteredProviders.map((provider) => {
                                const first = provider.identification?.firstName || "N/A";
                                const last = provider.identification?.lastName || "N/A";
                                const fullName = `${first} ${last}`.trim();
                                const seed = `${first} ${last}`;
                                const subtitle =
                                    provider.professionalDetails?.specialty ||
                                    provider.professionalDetails?.providerType ||
                                    provider.contact?.email ||
                                    "—";

                                return (
                                    <tr key={provider.id} className="hover:bg-gray-50 border-b">
                                        {/* Full Name with avatar + subtitle */}
                                        <td className="py-3 px-6">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={[
                                                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                                                        getAvatarTone(seed),
                                                    ].join(" ")}
                                                    aria-hidden="true"
                                                >
                                                    {getInitials(
                                                        provider.identification?.firstName ?? undefined,
                                                        provider.identification?.lastName ?? undefined
                                                    )}
                                                </div>
                                                <div className="leading-tight">
                                                    <div className="text-sm font-medium text-gray-900">{fullName}</div>
                                                    <div className="text-xs text-gray-500">{subtitle}</div>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="py-3 px-6 text-sm text-gray-700">
                                            {provider.professionalDetails?.providerType || "N/A"}
                                        </td>
                                        <td className="py-3 px-6 text-sm text-gray-700">
                                            {provider.professionalDetails?.specialty || "N/A"}
                                        </td>
                                        <td className="py-3 px-6 text-sm text-gray-700">
                                            {provider.contact?.phoneNumber || "N/A"}
                                        </td>
                                        <td className="py-3 px-6 text-sm text-gray-700">
                                            {provider.contact?.email || "N/A"}
                                        </td>
                                        <td className="py-3 px-6 text-sm text-gray-700">
                                            {provider.npi || "N/A"}
                                        </td>
                                        <td className="py-3 px-6 text-sm">
                        <span
                            className={[
                                "inline-flex items-center rounded-full text-[11px] font-semibold",
                                "px-2 py-0.5 whitespace-nowrap", // ⬅ keeps badge compact
                                provider.systemAccess?.status === "ACTIVE"
                                    ? "bg-green-100 text-green-800"
                                    : provider.systemAccess?.status === "ARCHIVED"
                                        ? "bg-gray-200 text-gray-800"
                                        : "bg-yellow-100 text-yellow-800",
                            ].join(" ")}
                        >
                          {provider.systemAccess?.status || "N/A"}
                        </span>
                                        </td>
                                        <td className="py-3 px-4 text-sm">
                                            <div className="flex items-center gap-2 justify-end flex-nowrap">                                            {/* Edit */}
                                                <button
                                                    onClick={() => router.push(`/settings/providers/edit/${provider.id}`)}
                                                    className="group flex items-center justify-center w-9 h-9 rounded-full border border-blue-500 text-blue-500 shadow hover:bg-blue-50"
                                                    title="Edit"
                                                >
                                                    <svg className="fill-current" width="16" height="16" viewBox="0 0 18 18">
                                                        <path d="M15.091 2.782a2 2 0 0 0-2.828 0l-7.334 7.334a2 2 0 0 0-.59 1.127l-.652 3.093a.667.667 0 0 0 .788.788l3.093-.652a2 2 0 0 0 1.127-.59l7.334-7.334a2 2 0 0 0 0-2.828z" />
                                                    </svg>
                                                </button>

                                                {/* Schedule */}
                                                <button
                                                    onClick={() => router.push(`/settings/providers/schedule/${provider.id}`)}
                                                    className="group flex items-center justify-center w-9 h-9 rounded-full border border-purple-500 text-purple-500 shadow hover:bg-purple-50"
                                                    title="Schedule"
                                                >
                                                    <svg className="fill-current" width="16" height="16" viewBox="0 0 24 24">
                                                        <path d="M7 2v2H5a2 2 0 0 0-2 2v1h18V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7zm-4 7v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9H3zm4 3h2v2H7v-2z" />
                                                    </svg>
                                                </button>

                                                {/* Archive / Unarchive */}
                                                <button
                                                    onClick={() => toggleArchiveStatus(provider)}
                                                    className={`group flex items-center justify-center w-9 h-9 rounded-full border shadow ${
                                                        provider.systemAccess?.status === "ACTIVE"
                                                            ? "border-green-500 text-green-500 hover:bg-green-50"
                                                            : "border-red-500 text-red-500 hover:bg-red-50"
                                                    }`}
                                                    title={provider.systemAccess?.status === "ACTIVE" ? "Archive" : "Unarchive"}
                                                >
                                                    <svg className="fill-current" width="16" height="16" viewBox="0 0 24 24">
                                                        {provider.systemAccess?.status === "ACTIVE" ? (
                                                            <path d="M20.54 5.23l-1.39-1.39C18.9 3.34 18.45 3 18 3H6c-.45 0-.9.34-1.15.84L3.46 5.23A1 1 0 0 0 3 6v2c0 .55.45 1 1 1v9c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V9c.55 0 1-.45 1-1V6c0-.27-.11-.52-.29-.71zM12 17l-5-5h3V9h4v3h3l-5 5z" />
                                                        ) : (
                                                            <path d="M20.54 5.23l-1.39-1.39C18.9 3.34 18.45 3 18 3H6c-.45 0-.9.34-1.15.84L3.46 5.23A1 1 0 0 0 3 6v2c0 .55.45 1 1 1v9c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V9c.55 0 1-.45 1-1V6c0-.27-.11-.52-.29-.71zM12 8l5 5h-3v3h-4v-3H7l5-5z" />
                                                        )}
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

export default ProviderList;
