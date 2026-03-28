"use client";

import React, { useEffect, useState } from "react";
import { getEnv } from "@/utils/env";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import AdminLayout from "@/app/(admin)/layout";
import { formatDisplayDate } from "@/utils/dateUtils";
import Link from "next/link";
import {
    Users,
    ArrowLeft,
    Plus,
    Loader2,
    Trash2,
    UserPlus,
    Shield,
    Clock,
    CheckCircle2,
} from "lucide-react";
import { toast, confirmDialog } from "@/utils/toast";

const MARKETPLACE_BASE = () =>
    (getEnv("NEXT_PUBLIC_MARKETPLACE_URL") || "").replace(/\/$/, "");

interface TeamMember {
    id: string;
    email: string;
    role: string;
    status: string;
    invitedBy?: string;
    invitedAt: string;
    acceptedAt?: string;
}

const ROLE_COLORS: Record<string, string> = {
    owner: "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400",
    admin: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400",
    developer: "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400",
    viewer: "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400",
};

export default function TeamPage() {
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [showInvite, setShowInvite] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState("developer");
    const [inviting, setInviting] = useState(false);
    const [removingId, setRemovingId] = useState<string | null>(null);

    const loadMembers = async () => {
        try {
            const res = await fetchWithAuth(`${MARKETPLACE_BASE()}/api/v1/vendors/me/team`);
            if (res.ok) {
                const data = await res.json();
                setMembers(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error("Failed to load team:", err);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadMembers();
    }, []);

    const handleInvite = async () => {
        if (!inviteEmail.trim()) return;
        setInviting(true);
        try {
            const res = await fetchWithAuth(`${MARKETPLACE_BASE()}/api/v1/vendors/me/team/invite`, {
                method: "POST",
                body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
            });
            if (res.ok) {
                setInviteEmail("");
                setShowInvite(false);
                await loadMembers();
            }
        } catch (err) {
            console.error("Failed to invite member:", err);
        }
        setInviting(false);
    };

    const handleUpdateRole = async (memberId: string, newRole: string) => {
        try {
            const res = await fetchWithAuth(`${MARKETPLACE_BASE()}/api/v1/vendors/me/team/${memberId}/role`, {
                method: "PUT",
                body: JSON.stringify({ role: newRole }),
            });
            if (res.ok) {
                await loadMembers();
            }
        } catch (err) {
            console.error("Failed to update role:", err);
        }
    };

    const handleRemove = async (memberId: string) => {
        if (!(await confirmDialog("Remove this team member?"))) return;
        setRemovingId(memberId);
        try {
            const res = await fetchWithAuth(`${MARKETPLACE_BASE()}/api/v1/vendors/me/team/${memberId}`, {
                method: "DELETE",
            });
            if (res.ok) {
                setMembers((prev) => prev.filter((m) => m.id !== memberId));
            }
        } catch (err) {
            console.error("Failed to remove member:", err);
        }
        setRemovingId(null);
    };

    if (loading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/developer"
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-500" />
                        </Link>
                        <Users className="w-7 h-7 text-purple-600" />
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                Team Members
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {members.length} member{members.length !== 1 ? "s" : ""}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowInvite(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
                    >
                        <UserPlus className="w-4 h-4" />
                        Invite Member
                    </button>
                </div>

                {/* Invite form */}
                {showInvite && (
                    <div className="p-5 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
                            Invite Team Member
                        </h3>
                        <div className="flex items-end gap-3">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    placeholder="colleague@company.com"
                                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Role
                                </label>
                                <select
                                    value={inviteRole}
                                    onChange={(e) => setInviteRole(e.target.value)}
                                    className="px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                                >
                                    <option value="admin">Admin</option>
                                    <option value="developer">Developer</option>
                                    <option value="viewer">Viewer</option>
                                </select>
                            </div>
                            <button
                                onClick={handleInvite}
                                disabled={inviting || !inviteEmail.trim()}
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                            >
                                {inviting && <Loader2 className="w-4 h-4 animate-spin" />}
                                Send Invite
                            </button>
                            <button
                                onClick={() => setShowInvite(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Members list */}
                <div className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-slate-800/50">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Email</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Role</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Status</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Joined</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
                            {members.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                                        No team members yet. Invite someone to collaborate.
                                    </td>
                                </tr>
                            ) : (
                                members.map((member) => (
                                    <tr key={member.id}>
                                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                                            {member.email}
                                        </td>
                                        <td className="px-4 py-3">
                                            {member.role === "owner" ? (
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${ROLE_COLORS[member.role]}`}>
                                                    <Shield className="w-3 h-3" />
                                                    Owner
                                                </span>
                                            ) : (
                                                <select
                                                    value={member.role}
                                                    onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                                                    className="px-2 py-0.5 text-xs border border-gray-200 dark:border-slate-600 rounded bg-transparent text-gray-700 dark:text-gray-300"
                                                >
                                                    <option value="admin">Admin</option>
                                                    <option value="developer">Developer</option>
                                                    <option value="viewer">Viewer</option>
                                                </select>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center gap-1 text-xs">
                                                {member.status === "active" ? (
                                                    <>
                                                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                                        <span className="text-green-600 dark:text-green-400">Active</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                                                        <span className="text-amber-600 dark:text-amber-400">Pending</span>
                                                    </>
                                                )}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                                            {member.acceptedAt
                                                ? formatDisplayDate(member.acceptedAt)
                                                : formatDisplayDate(member.invitedAt) + " (invited)"}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {member.role !== "owner" && (
                                                <button
                                                    onClick={() => handleRemove(member.id)}
                                                    disabled={removingId === member.id}
                                                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                                                    title="Remove member"
                                                >
                                                    {removingId === member.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-4 h-4" />
                                                    )}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AdminLayout>
    );
}
