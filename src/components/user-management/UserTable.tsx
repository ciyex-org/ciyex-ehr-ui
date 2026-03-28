"use client";

import React from "react";
import ReactDOM from "react-dom";
import { UserResponse, ROLE_BADGE_COLORS } from "./types";
import { Edit3, KeyRound, UserX, MoreVertical, Mail, Link2, LinkIcon } from "lucide-react";

interface Props {
  users: UserResponse[];
  onEdit: (user: UserResponse) => void;
  onResetPassword: (user: UserResponse) => void;
  onSendResetEmail: (user: UserResponse) => void;
  onDeactivate: (user: UserResponse) => void;
  onLinkPractitioner?: (user: UserResponse) => void;
}

export default function UserTable({ users, onEdit, onResetPassword, onSendResetEmail, onDeactivate, onLinkPractitioner }: Props) {
  const [openMenu, setOpenMenu] = React.useState<string | null>(null);
  const [menuPos, setMenuPos] = React.useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const primaryRole = (u: UserResponse) => {
    const filtered = u.roles.filter(
      (r) => !["default-roles-ciyex", "offline_access", "uma_authorization"].includes(r)
    );
    return filtered[0] || "—";
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-800/60">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Name</th>
            <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Email</th>
            <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Role</th>
            <th className="text-center px-4 py-3 font-medium text-slate-500 dark:text-slate-400">FHIR</th>
            <th className="text-center px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Status</th>
            <th className="text-right px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {users.map((u) => {
            const role = primaryRole(u);
            const badgeClass = ROLE_BADGE_COLORS[role] || ROLE_BADGE_COLORS.PATIENT;
            return (
              <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-800 dark:text-slate-100">
                    {u.firstName} {u.lastName}
                  </div>
                  {u.phone && <div className="text-xs text-slate-500">{u.phone}</div>}
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}>
                    {role}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  {u.practitionerFhirId ? (
                    <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400" title={`FHIR: ${u.practitionerFhirId}${u.npi ? ` | NPI: ${u.npi}` : ""}`}>
                      <Link2 className="w-3.5 h-3.5" />
                      Linked
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {u.enabled ? (
                    <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      Disabled
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right relative">
                  <button
                    onClick={(e) => {
                      if (openMenu === u.id) { setOpenMenu(null); return; }
                      const rect = e.currentTarget.getBoundingClientRect();
                      setMenuPos({ top: rect.bottom + 4, left: rect.right - 192 });
                      setOpenMenu(u.id);
                    }}
                    className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {openMenu === u.id && ReactDOM.createPortal(
                    <>
                      <div className="fixed inset-0 z-[9998]" onClick={() => setOpenMenu(null)} />
                      <div className="fixed z-[9999] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 w-48" style={{ top: menuPos.top, left: menuPos.left }}>
                        <button
                          onClick={() => { onEdit(u); setOpenMenu(null); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Edit User
                        </button>
                        {onLinkPractitioner && (
                          <button
                            onClick={() => { onLinkPractitioner(u); setOpenMenu(null); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                          >
                            <LinkIcon className="w-3.5 h-3.5" /> {u.practitionerFhirId ? "Update Link" : `Link ${role === "PATIENT" ? "Patient" : "Provider"}`}
                          </button>
                        )}
                        <button
                          onClick={() => { onResetPassword(u); setOpenMenu(null); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                        >
                          <KeyRound className="w-3.5 h-3.5" /> Reset Password
                        </button>
                        <button
                          onClick={() => { onSendResetEmail(u); setOpenMenu(null); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                        >
                          <Mail className="w-3.5 h-3.5" /> Send Reset Email
                        </button>
                        {u.enabled && (
                          <button
                            onClick={() => { onDeactivate(u); setOpenMenu(null); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <UserX className="w-3.5 h-3.5" /> Deactivate
                          </button>
                        )}
                      </div>
                    </>,
                    document.body
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
