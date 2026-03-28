import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import type { Channel, MessageItem, ChannelMember, Template, MessageAttachment } from "./types";

const API = () => getEnv("NEXT_PUBLIC_API_URL") || "";

type ApiResponse<T> = { success: boolean; message: string; data: T };

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetchWithAuth(`${API()}${url}`, options);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return json.data ?? json;
}

// DM (find or create 1:1 conversation)
export async function startDm(targetUserId: string, targetUserName: string): Promise<Channel> {
  return api<Channel>("/api/channels/dm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetUserId, targetUserName }),
  });
}

// Channels
export async function getChannels(): Promise<Channel[]> {
  return api<Channel[]>("/api/channels");
}

export async function createChannel(data: {
  name: string;
  type: Channel["type"];
  topic?: string;
  memberIds?: string[];
  memberNames?: Record<string, string>;
}): Promise<Channel> {
  return api<Channel>("/api/channels", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updateChannel(
  channelId: string,
  data: Partial<Pick<Channel, "name" | "topic" | "description">>
): Promise<Channel> {
  return api<Channel>(`/api/channels/${channelId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteChannel(channelId: string): Promise<void> {
  await fetchWithAuth(`${API()}/api/channels/${channelId}`, { method: "DELETE" });
}

// Messages
export async function getMessages(
  channelId: string,
  before?: string,
  limit = 50
): Promise<MessageItem[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (before) params.set("before", before);
  return api<MessageItem[]>(`/api/channels/${channelId}/messages?${params}`);
}

export async function sendMessage(
  channelId: string,
  data: { content: string; parentId?: string; mentions?: string[] }
): Promise<MessageItem> {
  return api<MessageItem>(`/api/channels/${channelId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function editMessage(
  messageId: string,
  content: string
): Promise<MessageItem> {
  return api<MessageItem>(`/api/messages/${messageId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
}

export async function deleteMessage(messageId: string): Promise<void> {
  await fetchWithAuth(`${API()}/api/messages/${messageId}`, { method: "DELETE" });
}

// Threads
export async function getThreadReplies(messageId: string): Promise<MessageItem[]> {
  return api<MessageItem[]>(`/api/messages/${messageId}/thread`);
}

// Reactions
export async function addReaction(
  messageId: string,
  emoji: string
): Promise<void> {
  await fetchWithAuth(`${API()}/api/messages/${messageId}/reactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emoji }),
  });
}

export async function removeReaction(
  messageId: string,
  emoji: string
): Promise<void> {
  await fetchWithAuth(`${API()}/api/messages/${messageId}/reactions`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emoji }),
  });
}

// Pins
export async function pinMessage(messageId: string): Promise<void> {
  await fetchWithAuth(`${API()}/api/messages/${messageId}/pin`, { method: "POST" });
}

export async function unpinMessage(messageId: string): Promise<void> {
  await fetchWithAuth(`${API()}/api/messages/${messageId}/pin`, { method: "DELETE" });
}

export async function getPinnedMessages(channelId: string): Promise<MessageItem[]> {
  return api<MessageItem[]>(`/api/channels/${channelId}/pinned`);
}

// Members
export async function getChannelMembers(channelId: string): Promise<ChannelMember[]> {
  return api<ChannelMember[]>(`/api/channels/${channelId}/members`);
}

export async function addChannelMember(
  channelId: string,
  userId: string,
  displayName?: string
): Promise<void> {
  await fetchWithAuth(`${API()}/api/channels/${channelId}/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, displayName }),
  });
}

export async function removeChannelMember(
  channelId: string,
  userId: string
): Promise<void> {
  await fetchWithAuth(`${API()}/api/channels/${channelId}/members/${userId}`, {
    method: "DELETE",
  });
}

// Search
export async function searchMessages(
  query: string,
  channelId?: string
): Promise<MessageItem[]> {
  const params = new URLSearchParams({ q: query });
  if (channelId) params.set("channelId", channelId);
  return api<MessageItem[]>(`/api/messages/search?${params}`);
}

// Attachments
export async function uploadAttachment(
  messageId: string,
  file: File
): Promise<MessageAttachment> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetchWithAuth(
    `${API()}/api/messages/${messageId}/attachments`,
    { method: "POST", body: formData }
  );
  const json = await res.json();
  return json.data;
}

export async function downloadAttachment(
  messageId: string,
  attachmentId: string
): Promise<Blob> {
  const res = await fetchWithAuth(
    `${API()}/api/messages/${messageId}/attachments/${attachmentId}/download`
  );
  return res.blob();
}

// Templates
export async function getTemplates(): Promise<Template[]> {
  return api<Template[]>("/api/templates");
}

export async function createTemplate(
  data: Omit<Template, "id">
): Promise<Template> {
  return api<Template>("/api/templates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updateTemplate(
  id: number,
  data: Partial<Template>
): Promise<Template> {
  return api<Template>(`/api/templates/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteTemplate(id: number): Promise<void> {
  await fetchWithAuth(`${API()}/api/templates/${id}`, { method: "DELETE" });
}

// Presence
export async function getUserPresence(): Promise<
  Record<string, "online" | "away" | "dnd" | "offline">
> {
  return api<Record<string, string>>("/api/users/presence") as Promise<
    Record<string, "online" | "away" | "dnd" | "offline">
  >;
}

// Mark as read
export async function markChannelRead(channelId: string): Promise<void> {
  await fetchWithAuth(`${API()}/api/channels/${channelId}/read`, {
    method: "POST",
  });
}
