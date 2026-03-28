"use client";

import { useReducer, useCallback, useEffect, useState, useMemo } from "react";
import AdminLayout from "@/app/(admin)/layout";
import ChannelSidebar from "@/components/messaging/ChannelSidebar";
import MessagePanel from "@/components/messaging/MessagePanel";
import ThreadPanel from "@/components/messaging/ThreadPanel";
import ChannelDetailPanel from "@/components/messaging/ChannelDetailPanel";
import ChannelCreateModal from "@/components/messaging/ChannelCreateModal";
import MessageSearch from "@/components/messaging/MessageSearch";
import { messagingReducer, initialState } from "@/components/messaging/messagingReducer";
import * as api from "@/components/messaging/messagingApi";
import type { MessageItem, ChannelMember } from "@/components/messaging/types";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import { usePermissions } from "@/context/PermissionContext";

const API_URL = () => getEnv("NEXT_PUBLIC_API_URL") || "";

export default function MessagingPage() {
  const { hasCategoryWrite } = usePermissions();
  const canSendMessages = hasCategoryWrite("messaging");
  const [state, dispatch] = useReducer(messagingReducer, initialState);
  const [replyingTo, setReplyingTo] = useState<MessageItem | null>(null);
  const [channelMembers, setChannelMembers] = useState<ChannelMember[]>([]);
  const [availableUsers, setAvailableUsers] = useState<{ id: string; name: string; type?: "patient" | "provider"; dob?: string; subtitle?: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Derive current user from token
  const currentUser = useMemo(() => {
    if (typeof window === "undefined") return { id: "", displayName: "", avatar: { initials: "", color: "" }, presence: "online" as const };
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("authToken") || "";
      if (!token) return state.currentUser;
      const payload = JSON.parse(atob(token.split(".")[1]));
      const name = payload.name || payload.preferred_username || "User";
      const initials = name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
      return {
        id: payload.sub || payload.userId || "",
        displayName: name,
        avatar: { initials, color: "bg-gradient-to-br from-blue-500 to-blue-600" },
        presence: "online" as const,
      };
    } catch {
      return state.currentUser;
    }
  }, []);

  // Load channels
  const loadChannels = useCallback(async () => {
    try {
      const channels = await api.getChannels();
      dispatch({ type: "SET_CHANNELS", channels: Array.isArray(channels) ? channels : [] });
    } catch (err) {
      console.error("Failed to load channels:", err);
    }
  }, []);

  // Sanitize reactions: keep only one reaction per user (the last one)
  const sanitizeReactions = useCallback((messages: MessageItem[], userId: string): MessageItem[] => {
    return messages.map((m) => {
      if (!m.reactions || m.reactions.length === 0) return m;
      // Find which reaction the current user has (keep only the last one)
      const userReactions = m.reactions.filter((r) => r.users?.includes(userId) || r.hasReacted);
      if (userReactions.length <= 1) return m; // Already fine
      // User has multiple reactions — keep only the last one, remove from others
      const keepEmoji = userReactions[userReactions.length - 1].emoji;
      const cleaned = m.reactions
        .map((r) => {
          if (r.emoji === keepEmoji) return r;
          if (!(r.users?.includes(userId) || r.hasReacted)) return r;
          // Remove user from this reaction
          return {
            ...r,
            count: r.count - 1,
            hasReacted: false,
            users: (r.users || []).filter((u) => u !== userId),
          };
        })
        .filter((r) => r.count > 0);
      return { ...m, reactions: cleaned };
    });
  }, []);

  // Load messages for active channel
  const loadMessages = useCallback(async (channelId: string) => {
    try {
      const messages = await api.getMessages(channelId);
      const raw = Array.isArray(messages) ? messages : [];
      dispatch({ type: "SET_MESSAGES", messages: sanitizeReactions(raw, currentUser.id) });
      api.markChannelRead(channelId).catch(() => {});
      dispatch({ type: "MARK_CHANNEL_READ", channelId });
    } catch (err) {
      console.error("Failed to load messages:", err);
      dispatch({ type: "SET_MESSAGES", messages: [] });
    }
  }, [sanitizeReactions, currentUser.id]);

  // Load channel members
  const loadMembers = useCallback(async (channelId: string) => {
    try {
      const members = await api.getChannelMembers(channelId);
      setChannelMembers(Array.isArray(members) ? members : []);
    } catch {
      setChannelMembers([]);
    }
  }, []);

  // Load thread replies
  const loadThread = useCallback(async (messageId: string) => {
    try {
      const replies = await api.getThreadReplies(messageId);
      dispatch({ type: "SET_THREAD_MESSAGES", messages: Array.isArray(replies) ? replies : [] });
    } catch {
      dispatch({ type: "SET_THREAD_MESSAGES", messages: [] });
    }
  }, []);

  // Load pinned messages
  const loadPinned = useCallback(async (channelId: string) => {
    try {
      const pinned = await api.getPinnedMessages(channelId);
      dispatch({ type: "SET_PINNED_MESSAGES", messages: Array.isArray(pinned) ? pinned : [] });
    } catch {
      dispatch({ type: "SET_PINNED_MESSAGES", messages: [] });
    }
  }, []);

  // Load available users (for DM user picker + channel creation)
  // Fetches ALL org members: providers, staff, AND patients
  const loadUsers = useCallback(async () => {
    try {
      type UserEntry = { id: string; name: string; type?: "patient" | "provider"; dob?: string; subtitle?: string };
      const allUsers: UserEntry[] = [];
      const seenIds = new Set<string>();

      const extractUser = (p: Record<string, unknown>, userType?: "patient" | "provider"): UserEntry | null => {
        const systemAccess = p.systemAccess as Record<string, unknown> | undefined;
        const keycloakId = systemAccess?.keycloakUserId
          ? String(systemAccess.keycloakUserId)
          : (p["systemAccess.keycloakUserId"] ? String(p["systemAccess.keycloakUserId"]) : "");
        const identification = p.identification as Record<string, string> | undefined;
        // Email — portal uses email as targetUserId for DMs; check all possible field locations
        const email = identification?.email
          || (p.email ? String(p.email) : "")
          || (p.emailAddress ? String(p.emailAddress) : "")
          || (p.contactEmail ? String(p.contactEmail) : "")
          || (systemAccess?.email ? String(systemAccess.email) : "");
        // Prefer: keycloakId → email → fhirId → id
        const userId = keycloakId || email || (p.fhirId ? String(p.fhirId) : (p.id ? String(p.id) : ""));
        // Name: handle both /api/patients flat fields and /api/fhir-resource/demographics nested identification
        const name = identification
          ? `${identification.firstName || ""} ${identification.lastName || ""}`.trim()
          : (p.firstName || p.lastName)
            ? `${p.firstName || ""} ${p.lastName || ""}`.trim()
            : String(p.name || p.displayName || p.fullName || "Unknown");
        if (!userId || !name || name === "Unknown") return null;
        // Extract DOB for patients
        const dob = identification?.dateOfBirth
          || (p.dateOfBirth ? String(p.dateOfBirth) : undefined)
          || (p.dob ? String(p.dob) : undefined);
        // Extract specialty/title for providers
        const profDetails = p.professionalDetails as Record<string, string> | undefined;
        const subtitle = profDetails?.specialty || (p.specialty ? String(p.specialty) : undefined);
        return { id: userId, name, type: userType, dob, subtitle };
      };

      const extractList = (json: Record<string, unknown>) => {
        const payload = json.data || json;
        return Array.isArray(payload)
          ? payload
          : Array.isArray((payload as Record<string, unknown>)?.content)
            ? (payload as Record<string, unknown[]>).content
            : [];
      };

      // Fetch providers AND patients in parallel
      // Use /api/patients (not demographics) — it returns a flat email field used as targetUserId
      const [providersRes, patientsRes] = await Promise.allSettled([
        fetchWithAuth(`${API_URL()}/api/providers?status=ACTIVE&size=200`),
        fetchWithAuth(`${API_URL()}/api/patients?size=500`),
      ]);

      // Process providers
      if (providersRes.status === "fulfilled" && providersRes.value.ok) {
        const json = await providersRes.value.json();
        for (const p of extractList(json)) {
          const user = extractUser(p as Record<string, unknown>, "provider");
          if (user && !seenIds.has(user.id)) {
            seenIds.add(user.id);
            allUsers.push(user);
          }
        }
      }

      // Process patients — email from /api/patients is used as targetUserId for DM channels
      if (patientsRes.status === "fulfilled" && patientsRes.value.ok) {
        const json = await patientsRes.value.json();
        for (const p of extractList(json)) {
          const user = extractUser(p as Record<string, unknown>, "patient");
          if (user && !seenIds.has(user.id)) {
            seenIds.add(user.id);
            allUsers.push(user);
          }
        }
      }

      setAvailableUsers(allUsers);
    } catch {
      setAvailableUsers([]);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadChannels();
    loadUsers();
  }, [loadChannels, loadUsers]);

  // Load messages when active channel changes
  useEffect(() => {
    if (state.activeChannelId) {
      loadMessages(state.activeChannelId);
      loadMembers(state.activeChannelId);
      loadPinned(state.activeChannelId);
    }
  }, [state.activeChannelId, loadMessages, loadMembers, loadPinned]);

  // Load thread when opened
  useEffect(() => {
    if (state.activeThreadId) {
      loadThread(state.activeThreadId);
    }
  }, [state.activeThreadId, loadThread]);

  // Handlers
  const handleSelectChannel = useCallback((channelId: string) => {
    dispatch({ type: "SET_ACTIVE_CHANNEL", channelId });
    setReplyingTo(null);
  }, []);

  const showError = useCallback((msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 5000);
  }, []);

  const handleStartDm = useCallback(async (targetUserId: string, targetUserName: string) => {
    try {
      const channel = await api.startDm(targetUserId, targetUserName);
      if (channel?.id) {
        // Reload channels to include the new/existing DM
        await loadChannels();
        dispatch({ type: "SET_ACTIVE_CHANNEL", channelId: channel.id });
      } else {
        showError("Failed to start conversation. Please try again.");
      }
    } catch (err) {
      console.error("Failed to start DM:", err);
      showError("Failed to start conversation. Please try again.");
    }
  }, [loadChannels, showError]);

  const handleSendMessage = useCallback(async (content: string, files?: File[]) => {
    if (!state.activeChannelId) return;
    try {
      const msg = await api.sendMessage(state.activeChannelId, {
        content: content || (files?.length ? files.map((f) => f.name).join(", ") : ""),
        parentId: replyingTo?.id || undefined,
        mentions: extractMentions(content),
      });
      if (msg?.id) {
        // Ensure senderName is populated — API may return null for the current user
        const enrichedMsg = {
          ...msg,
          senderName: msg.senderName || currentUser.displayName || "You",
          senderId: msg.senderId || currentUser.id,
          senderAvatar: msg.senderAvatar || currentUser.avatar,
        };
        dispatch({ type: "ADD_MESSAGE", message: enrichedMsg });
        if (files?.length) {
          for (const file of files) {
            try {
              await api.uploadAttachment(msg.id, file);
            } catch (err) {
              console.error(`Failed to upload ${file.name}:`, err);
            }
          }
          loadMessages(state.activeChannelId);
        }
      } else {
        loadMessages(state.activeChannelId);
      }
      setReplyingTo(null);
    } catch (err) {
      console.error("Failed to send message:", err);
      showError("Failed to send message. Please try again.");
    }
  }, [state.activeChannelId, replyingTo, loadMessages, showError]);

  const handleSendThreadReply = useCallback(async (content: string) => {
    if (!state.activeChannelId || !state.activeThreadId) return;
    try {
      const msg = await api.sendMessage(state.activeChannelId, {
        content,
        parentId: state.activeThreadId,
      });
      if (msg?.id) {
        dispatch({ type: "SET_THREAD_MESSAGES", messages: [...state.threadMessages, msg] });
        const parent = state.messages.find((m) => m.id === state.activeThreadId);
        if (parent) {
          dispatch({
            type: "UPDATE_MESSAGE",
            message: {
              ...parent,
              threadReplyCount: (parent.threadReplyCount || 0) + 1,
              threadLastReplyAt: msg.createdAt,
            },
          });
        }
      } else {
        loadThread(state.activeThreadId);
      }
    } catch {
      console.error("Failed to send reply");
    }
  }, [state.activeChannelId, state.activeThreadId, state.threadMessages, state.messages, loadThread]);

  const handleReact = useCallback(async (messageId: string, emoji: string) => {
    // Find ALL existing reactions by this user on this message
    const msg = [...state.messages, ...state.threadMessages].find((m) => m.id === messageId);
    const userReactions = (msg?.reactions || []).filter((r) => r.hasReacted);

    // If clicking the same emoji the user already has, toggle it off
    const hasSameEmoji = userReactions.some((r) => r.emoji === emoji);
    if (hasSameEmoji) {
      dispatch({ type: "REMOVE_REACTION", messageId, emoji });
      try { await api.removeReaction(messageId, emoji); } catch {
        dispatch({ type: "ADD_REACTION", messageId, emoji });
      }
      return;
    }

    // Remove ALL existing reactions by this user first (enforce one-at-a-time)
    for (const r of userReactions) {
      dispatch({ type: "REMOVE_REACTION", messageId, emoji: r.emoji });
      try { await api.removeReaction(messageId, r.emoji); } catch { /* best effort */ }
    }

    // Add the new reaction
    dispatch({ type: "ADD_REACTION", messageId, emoji });
    try {
      await api.addReaction(messageId, emoji);
    } catch {
      dispatch({ type: "REMOVE_REACTION", messageId, emoji });
    }
  }, [state.messages, state.threadMessages]);

  const handleRemoveReaction = useCallback(async (messageId: string, emoji: string) => {
    dispatch({ type: "REMOVE_REACTION", messageId, emoji });
    try {
      await api.removeReaction(messageId, emoji);
    } catch {
      dispatch({ type: "ADD_REACTION", messageId, emoji });
    }
  }, []);

  const handlePin = useCallback(async (messageId: string) => {
    const msg = state.messages.find((m) => m.id === messageId);
    if (!msg) return;
    try {
      if (msg.isPinned) {
        await api.unpinMessage(messageId);
        dispatch({ type: "UNPIN_MESSAGE", messageId });
      } else {
        await api.pinMessage(messageId);
        dispatch({ type: "PIN_MESSAGE", messageId });
      }
    } catch {
      console.error("Failed to update pin");
    }
  }, [state.messages]);

  const handleDelete = useCallback(async (messageId: string) => {
    try {
      await api.deleteMessage(messageId);
      dispatch({ type: "DELETE_MESSAGE", messageId });
    } catch {
      console.error("Failed to delete message");
    }
  }, []);

  const handleCreateChannel = useCallback(async (data: Parameters<typeof api.createChannel>[0]) => {
    try {
      const channel = await api.createChannel(data);
      if (channel?.id) {
        dispatch({ type: "ADD_CHANNEL", channel });
        dispatch({ type: "SET_ACTIVE_CHANNEL", channelId: channel.id });
      }
      loadChannels();
    } catch (err) {
      console.error("Failed to create channel:", err);
      showError("Failed to create channel. Please try again.");
    }
  }, [loadChannels, showError]);


  const handleOpenThread = useCallback((messageId: string) => {
    dispatch({ type: "OPEN_THREAD", messageId });
  }, []);

  const handleGoToMessage = useCallback((channelId: string, _messageId: string) => {
    dispatch({ type: "SET_ACTIVE_CHANNEL", channelId });
    dispatch({ type: "TOGGLE_SEARCH", isOpen: false });
  }, []);

  // Derived state
  const activeChannel = useMemo(
    () => state.channels.find((c) => c.id === state.activeChannelId) || null,
    [state.channels, state.activeChannelId]
  );

  const parentMessage = useMemo(
    () => state.messages.find((m) => m.id === state.activeThreadId) || null,
    [state.messages, state.activeThreadId]
  );

  const typingUsers = state.activeChannelId
    ? state.typingUsers[state.activeChannelId] || []
    : [];

  return (
    <AdminLayout>
      {/* Negative margins cancel AdminLayout's p-4/p-6 padding; calc height fills remaining viewport */}
      <div className="-m-4 md:-m-6 flex overflow-hidden bg-white dark:bg-gray-900" style={{ height: 'calc(100vh - 64px)' }}>
        {/* Error banner */}
        {error && (
          <div className="absolute top-2 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700 shadow-md">
            {error}
            <button onClick={() => setError(null)} className="ml-3 font-medium hover:text-red-900">&times;</button>
          </div>
        )}
        {/* Channel Sidebar — DMs first */}
        <ChannelSidebar
          channels={state.channels}
          activeChannelId={state.activeChannelId}
          onSelectChannel={handleSelectChannel}
          onCreateChannel={() => dispatch({ type: "SET_CREATING_CHANNEL", isCreating: true })}
          onStartDm={handleStartDm}
          currentUserId={currentUser.id}
          availableUsers={availableUsers}
        />

        {/* Main message area */}
        <div className="relative flex flex-1 overflow-hidden">
          <MessagePanel
            channel={activeChannel}
            messages={state.messages}
            currentUserId={currentUser.id}
            typingUsers={typingUsers}
            onSendMessage={handleSendMessage}
            onOpenThread={handleOpenThread}
            onReact={handleReact}
            onRemoveReaction={handleRemoveReaction}
            onPin={handlePin}
            onDelete={handleDelete}
            onReply={(msg) => setReplyingTo(msg)}
            onToggleSearch={() => dispatch({ type: "TOGGLE_SEARCH" })}
            onToggleDetail={() => dispatch({ type: "TOGGLE_DETAIL_PANEL" })}
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
            mentionUsers={availableUsers}
            readOnly={!canSendMessages}
          />

          {/* Search overlay */}
          <MessageSearch
            isOpen={state.isSearchOpen}
            onClose={() => dispatch({ type: "TOGGLE_SEARCH", isOpen: false })}
            currentChannelId={state.activeChannelId || undefined}
            onGoToMessage={handleGoToMessage}
          />
        </div>

        {/* Thread panel */}
        {state.isThreadPanelOpen && (
          <ThreadPanel
            parentMessage={parentMessage}
            replies={state.threadMessages}
            currentUserId={currentUser.id}
            onClose={() => dispatch({ type: "CLOSE_THREAD" })}
            onSendReply={handleSendThreadReply}
            onReact={handleReact}
            onRemoveReaction={handleRemoveReaction}
            onPin={handlePin}
            onDelete={handleDelete}
          />
        )}

        {/* Detail panel */}
        {state.isDetailPanelOpen && activeChannel && (
          <ChannelDetailPanel
            channel={activeChannel}
            members={channelMembers}
            pinnedMessages={state.pinnedMessages}
            onClose={() => dispatch({ type: "TOGGLE_DETAIL_PANEL" })}
            onGoToMessage={(id) => handleGoToMessage(activeChannel.id, id)}
            onAddMember={async (userId, displayName) => {
              await api.addChannelMember(activeChannel.id, userId, displayName);
              const updated = await api.getChannelMembers(activeChannel.id);
              setChannelMembers(updated);
            }}
          />
        )}

        {/* Create channel modal */}
        <ChannelCreateModal
          isOpen={state.isCreatingChannel}
          onClose={() => dispatch({ type: "SET_CREATING_CHANNEL", isCreating: false })}
          onCreate={handleCreateChannel}
          availableUsers={availableUsers}
        />
      </div>
    </AdminLayout>
  );
}

function extractMentions(content: string): string[] {
  const matches = content.match(/@(\w+)/g);
  return matches ? matches.map((m) => m.slice(1)) : [];
}
