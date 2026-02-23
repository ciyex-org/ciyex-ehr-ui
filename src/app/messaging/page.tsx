"use client";

import React, { useReducer, useCallback, useEffect, useState, useMemo } from "react";
import AdminLayout from "@/app/(admin)/layout";
import ChannelSidebar from "@/components/messaging/ChannelSidebar";
import MessagePanel from "@/components/messaging/MessagePanel";
import ThreadPanel from "@/components/messaging/ThreadPanel";
import ChannelDetailPanel from "@/components/messaging/ChannelDetailPanel";
import ChannelCreateModal from "@/components/messaging/ChannelCreateModal";
import MessageSearch from "@/components/messaging/MessageSearch";
import { messagingReducer, initialState } from "@/components/messaging/messagingReducer";
import * as api from "@/components/messaging/messagingApi";
import type { Channel, MessageItem, ChannelMember } from "@/components/messaging/types";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";

const API_URL = () => getEnv("NEXT_PUBLIC_API_URL") || "";

export default function MessagingPage() {
  const [state, dispatch] = useReducer(messagingReducer, initialState);
  const [replyingTo, setReplyingTo] = useState<MessageItem | null>(null);
  const [channelMembers, setChannelMembers] = useState<ChannelMember[]>([]);
  const [availableUsers, setAvailableUsers] = useState<{ id: string; name: string }[]>([]);

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

  // Load messages for active channel
  const loadMessages = useCallback(async (channelId: string) => {
    try {
      const messages = await api.getMessages(channelId);
      dispatch({ type: "SET_MESSAGES", messages: Array.isArray(messages) ? messages : [] });
      api.markChannelRead(channelId).catch(() => {});
      dispatch({ type: "MARK_CHANNEL_READ", channelId });
    } catch (err) {
      console.error("Failed to load messages:", err);
      dispatch({ type: "SET_MESSAGES", messages: [] });
    }
  }, []);

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
  const loadUsers = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`${API_URL()}/api/providers?status=ACTIVE`);
      if (res.ok) {
        const json = await res.json();
        const providers = json.data || json.content || json || [];
        const users = (Array.isArray(providers) ? providers : []).map((p: Record<string, unknown>) => ({
          id: String(p.id || p.fhirId || ""),
          name: p.identification
            ? `${(p.identification as Record<string, string>).firstName || ""} ${(p.identification as Record<string, string>).lastName || ""}`.trim()
            : String(p.name || p.displayName || "Unknown"),
        }));
        setAvailableUsers(users);
      }
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

  const handleStartDm = useCallback(async (targetUserId: string, targetUserName: string) => {
    try {
      const channel = await api.startDm(targetUserId, targetUserName);
      if (channel?.id) {
        // Reload channels to include the new/existing DM
        await loadChannels();
        dispatch({ type: "SET_ACTIVE_CHANNEL", channelId: channel.id });
      }
    } catch (err) {
      console.error("Failed to start DM:", err);
    }
  }, [loadChannels]);

  const handleSendMessage = useCallback(async (content: string) => {
    if (!state.activeChannelId) return;
    try {
      const msg = await api.sendMessage(state.activeChannelId, {
        content,
        parentId: replyingTo?.id,
        mentions: extractMentions(content),
      });
      if (msg?.id) {
        dispatch({ type: "ADD_MESSAGE", message: msg });
      } else {
        loadMessages(state.activeChannelId);
      }
      setReplyingTo(null);
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  }, [state.activeChannelId, replyingTo, loadMessages]);

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
    dispatch({ type: "ADD_REACTION", messageId, emoji });
    try {
      await api.addReaction(messageId, emoji);
    } catch {
      dispatch({ type: "REMOVE_REACTION", messageId, emoji });
    }
  }, []);

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
    } catch {
      console.error("Failed to create channel");
    }
  }, [loadChannels]);

  const handleAttachFile = useCallback(async (files: File[]) => {
    if (!state.activeChannelId || files.length === 0) return;
    try {
      // Send a message first, then attach files to it
      const msg = await api.sendMessage(state.activeChannelId, {
        content: files.map(f => f.name).join(", "),
      });
      if (msg?.id) {
        dispatch({ type: "ADD_MESSAGE", message: msg });
        for (const file of files) {
          try {
            await api.uploadAttachment(msg.id, file);
          } catch (err) {
            console.error(`Failed to upload ${file.name}:`, err);
          }
        }
        loadMessages(state.activeChannelId);
      }
    } catch (err) {
      console.error("Failed to upload attachment:", err);
    }
  }, [state.activeChannelId, loadMessages]);

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
      <div className="flex h-full overflow-hidden bg-white dark:bg-gray-900">
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
            onAttachFile={handleAttachFile}
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
