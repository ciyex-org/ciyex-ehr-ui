"use client";

import React, { useState } from "react";
import AdminLayout from "@/app/(admin)/layout";
import {
  Bell,
  Settings,
  FileText,
  Calendar,
  Send,
  Users,
} from "lucide-react";

import NotificationConfigPanel from "@/components/notifications/NotificationConfig";
import NotificationTemplates from "@/components/notifications/NotificationTemplates";
import EventPreferences from "@/components/notifications/EventPreferences";
import MessageLog from "@/components/notifications/MessageLog";
import Campaigns from "@/components/notifications/Campaigns";

/* ---------- Tab definitions ---------- */
const TABS = [
  { key: "log", label: "Message Log", icon: Send },
  { key: "campaigns", label: "Campaigns", icon: Users },
  { key: "templates", label: "Templates", icon: FileText },
  { key: "preferences", label: "Event Preferences", icon: Calendar },
  { key: "config", label: "Configuration", icon: Settings },
] as const;

type TabKey = (typeof TABS)[number]["key"];

/* ===================================================================
 * Notifications Management Page
 * =================================================================== */
export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("log");

  return (
    <AdminLayout>
      <div className="flex flex-col h-full overflow-hidden">
        {/* ---- Page header ---- */}
        <div className="flex items-center gap-3 shrink-0 mb-4">
          <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-blue-100 dark:bg-blue-900/40">
            <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight">
              Notifications
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Email &amp; SMS configuration, templates, and delivery log
            </p>
          </div>
        </div>

        {/* ---- Tab bar ---- */}
        <div className="shrink-0 border-b border-slate-200 dark:border-slate-700 mb-4">
          <nav className="flex gap-1 -mb-px overflow-x-auto">
            {TABS.map(({ key, label, icon: Icon }) => {
              const active = activeTab === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    active
                      ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                      : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:border-slate-300"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* ---- Tab content ---- */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {activeTab === "config" && <NotificationConfigPanel />}
          {activeTab === "templates" && <NotificationTemplates />}
          {activeTab === "preferences" && <EventPreferences />}
          {activeTab === "log" && <MessageLog />}
          {activeTab === "campaigns" && <Campaigns />}
        </div>
      </div>
    </AdminLayout>
  );
}
