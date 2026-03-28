"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/context/PermissionContext";

const API_URL = () => getEnv("NEXT_PUBLIC_API_URL") || "";

interface MessageNotification {
    id: string;
    channelId: string;
    channelName: string;
    senderName: string;
    content: string;
    createdAt: string;
    type: "message";
}

interface AppNotification {
    id: number;
    message: string;
    time: string;
    type: "app";
}

type NotificationItem = MessageNotification | AppNotification;

export default function NotificationDropdown() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifying, setNotifying] = useState(false);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const router = useRouter();
    const { canReadResource } = usePermissions();
    const canReadMessages = canReadResource("Communication");

    function toggleDropdown() {
        setIsOpen(!isOpen);
    }

    function closeDropdown() {
        setIsOpen(false);
    }

    const handleClick = () => {
        toggleDropdown();
        setNotifying(false);
    };

    // Listen for custom app notifications (e.g., low stock)
    useEffect(() => {
        const handler = (e: Event) => {
            const custom = e as CustomEvent<{ message: string }>;
            const id = Date.now() + Math.random();
            const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            setNotifications((prev) => [
                { id, message: custom.detail.message, time, type: "app" as const },
                ...prev,
            ]);
            setNotifying(true);
        };

        window.addEventListener("app-notification", handler);
        return () => window.removeEventListener("app-notification", handler);
    }, []);

    // Poll for unread messages from messaging channels (only if user has Communication scope)
    const checkUnreadMessages = useCallback(async () => {
        if (!canReadMessages) return;
        try {
            const res = await fetchWithAuth(`${API_URL()}/api/channels`);
            if (!res.ok) return;
            const data = await res.json();
            const channels = data?.data || data || [];
            if (!Array.isArray(channels)) return;

            let totalUnread = 0;
            const newMsgNotifications: MessageNotification[] = [];

            for (const ch of channels) {
                const unread = ch.unreadCount || 0;
                if (unread > 0) {
                    totalUnread += unread;
                    const lastMsg = ch.lastMessage;
                    newMsgNotifications.push({
                        id: `msg-${ch.id}`,
                        channelId: ch.id,
                        channelName: ch.name || "Unknown",
                        senderName: lastMsg?.senderName || ch.name || "Unknown",
                        content: lastMsg?.content
                            ? lastMsg.content.length > 80
                                ? lastMsg.content.substring(0, 80) + "..."
                                : lastMsg.content
                            : `${unread} unread message${unread > 1 ? "s" : ""}`,
                        createdAt: lastMsg?.createdAt || ch.createdAt || new Date().toISOString(),
                        type: "message",
                    });
                }
            }

            if (totalUnread > 0) {
                setNotifying(true);
            }
            setUnreadCount(totalUnread);

            // Merge message notifications with existing app notifications
            setNotifications((prev) => {
                const appNotifs = prev.filter((n) => n.type === "app");
                return [...newMsgNotifications, ...appNotifs];
            });
        } catch {
            // silently fail
        }
    }, [canReadMessages]);

    useEffect(() => {
        checkUnreadMessages();
        const interval = setInterval(checkUnreadMessages, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, [checkUnreadMessages]);

    const handleNotificationClick = (n: NotificationItem) => {
        if (n.type === "message") {
            router.push("/messaging");
        }
        closeDropdown();
    };

    const formatTime = (item: NotificationItem) => {
        if (item.type === "app") return item.time;
        try {
            const d = new Date(item.createdAt);
            const now = Date.now();
            const diff = now - d.getTime();
            if (diff < 60000) return "now";
            if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
            if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
            return d.toLocaleDateString([], { month: "short", day: "numeric" });
        } catch {
            return "";
        }
    };

    return (
        <div className="relative">
            <button
                className="relative dropdown-toggle flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full hover:text-gray-700 h-11 w-11 hover:bg-gray-100"
                onClick={handleClick}
            >
                {/* Notification badge */}
                {notifying && (
                    <span className="absolute -right-0.5 -top-0.5 z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm">
                        {unreadCount > 0 ? (unreadCount > 99 ? "99+" : unreadCount) : ""}
                        <span className="absolute inline-flex w-full h-full bg-red-400 rounded-full opacity-75 animate-ping" />
                    </span>
                )}
                <svg
                    className="fill-current"
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
                        fill="currentColor"
                    />
                </svg>
            </button>

            <Dropdown
                isOpen={isOpen}
                onClose={closeDropdown}
                className="absolute -right-[240px] mt-[17px] flex h-[480px] w-[380px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-lg"
            >
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
                    <h5 className="text-lg font-semibold text-gray-800">
                        Notifications
                        {unreadCount > 0 && (
                            <span className="ml-2 inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                                {unreadCount} unread
                            </span>
                        )}
                    </h5>
                    <button
                        onClick={toggleDropdown}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        ✕
                    </button>
                </div>
                <ul className="flex flex-col h-auto overflow-y-auto custom-scrollbar">
                    {notifications.length === 0 ? (
                        <li className="flex flex-col items-center py-12 text-center">
                            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                            </div>
                            <p className="text-sm text-gray-500">No new notifications</p>
                        </li>
                    ) : (
                        notifications.map((n) => (
                            <li key={n.type === "app" ? n.id : n.id}>
                                <DropdownItem
                                    onItemClick={() => handleNotificationClick(n)}
                                    className="flex flex-col gap-1 rounded-lg border-b border-gray-100 p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                                >
                                    <div className="flex items-start gap-3">
                                        {n.type === "message" ? (
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 shrink-0">
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                                                    <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                                                </svg>
                                            </div>
                                        ) : (
                                            <div
                                                className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0
                                                    ${n.message.startsWith("Critical") ? "bg-red-100 text-red-600" :
                                                    n.message.startsWith("Out of Stock") ? "bg-orange-100 text-orange-600" :
                                                    "bg-yellow-100 text-yellow-600"}`}
                                            >
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.72-1.36 3.485 0l6.518 11.602c.75 1.336-.213 2.999-1.742 2.999H3.481c-1.529 0-2.492-1.663-1.742-2.999L8.257 3.1zM11 14a1 1 0 11-2 0 1 1 0 012 0zm-1-2a.75.75 0 01-.75-.75V8a.75.75 0 011.5 0v3.25A.75.75 0 0110 12z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        )}

                                        <div className="flex flex-col flex-1 min-w-0">
                                            {n.type === "message" ? (
                                                <>
                                                    <span className="text-sm font-medium text-gray-900 truncate">
                                                        {n.senderName}
                                                    </span>
                                                    <span className="text-xs text-gray-600 truncate mt-0.5">
                                                        {n.content}
                                                    </span>
                                                </>
                                            ) : (
                                                <span className="text-sm font-medium text-gray-800">{n.message}</span>
                                            )}
                                            <span className="text-[11px] text-gray-400 mt-1">{formatTime(n)}</span>
                                        </div>

                                        {n.type === "message" && (
                                            <span className="shrink-0 h-2 w-2 rounded-full bg-blue-500 mt-2" />
                                        )}
                                    </div>
                                </DropdownItem>
                            </li>
                        ))
                    )}
                </ul>
                {canReadMessages && notifications.some((n) => n.type === "message") && (
                    <div className="border-t border-gray-100 pt-2 mt-auto">
                        <button
                            onClick={() => { router.push("/messaging"); closeDropdown(); }}
                            className="w-full rounded-lg py-2 text-center text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                            View all messages
                        </button>
                    </div>
                )}
            </Dropdown>
        </div>
    );
}
