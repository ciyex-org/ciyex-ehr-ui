export interface Channel {
  id: string;
  name: string;
  type: "public" | "private" | "dm" | "group_dm";
  topic?: string;
  description?: string;
  createdBy: string;
  createdAt: string;
  memberCount: number;
  unreadCount: number;
  lastMessage?: MessageItem;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  members?: ChannelMember[];
  isMuted?: boolean;
}

export interface ChannelMember {
  userId: string;
  displayName: string;
  role: "owner" | "admin" | "member";
  joinedAt: string;
  lastReadAt?: string;
  avatar?: AvatarInfo;
  presence?: PresenceStatus;
}

export interface MessageItem {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: AvatarInfo;
  content: string;
  contentHtml?: string;
  createdAt: string;
  updatedAt?: string;
  parentId?: string;
  threadReplyCount?: number;
  threadLastReplyAt?: string;
  isPinned?: boolean;
  isEdited?: boolean;
  isDeleted?: boolean;
  reactions?: Reaction[];
  attachments?: MessageAttachment[];
  mentions?: string[];
  replyTo?: { id: string; senderName: string; content: string };
  isSystem?: boolean;
  systemType?: "join" | "leave" | "pin" | "channel_created" | "topic_change";
}

export interface Reaction {
  emoji: string;
  count: number;
  users: string[];
  hasReacted: boolean;
}

export interface MessageAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  thumbnailUrl?: string;
}

export interface AvatarInfo {
  initials: string;
  color: string;
  imageUrl?: string;
}

export type PresenceStatus = "online" | "away" | "dnd" | "offline";

export interface Template {
  id: number;
  templateName: string;
  subject: string;
  body: string;
  archived?: boolean;
}

export interface MessagingState {
  channels: Channel[];
  activeChannelId: string | null;
  messages: MessageItem[];
  threadMessages: MessageItem[];
  activeThreadId: string | null;
  searchQuery: string;
  searchResults: MessageItem[];
  isSearchOpen: boolean;
  isDetailPanelOpen: boolean;
  isThreadPanelOpen: boolean;
  isCreatingChannel: boolean;
  currentUser: CurrentUser;
  typingUsers: Record<string, string[]>;
  pinnedMessages: MessageItem[];
}

export interface CurrentUser {
  id: string;
  displayName: string;
  avatar: AvatarInfo;
  presence: PresenceStatus;
}

export type MessagingAction =
  | { type: "SET_CHANNELS"; channels: Channel[] }
  | { type: "SET_ACTIVE_CHANNEL"; channelId: string }
  | { type: "SET_MESSAGES"; messages: MessageItem[] }
  | { type: "ADD_MESSAGE"; message: MessageItem }
  | { type: "UPDATE_MESSAGE"; message: MessageItem }
  | { type: "DELETE_MESSAGE"; messageId: string }
  | { type: "SET_THREAD_MESSAGES"; messages: MessageItem[] }
  | { type: "OPEN_THREAD"; messageId: string }
  | { type: "CLOSE_THREAD" }
  | { type: "TOGGLE_SEARCH"; isOpen?: boolean }
  | { type: "SET_SEARCH_RESULTS"; results: MessageItem[] }
  | { type: "TOGGLE_DETAIL_PANEL" }
  | { type: "SET_CREATING_CHANNEL"; isCreating: boolean }
  | { type: "ADD_REACTION"; messageId: string; emoji: string }
  | { type: "REMOVE_REACTION"; messageId: string; emoji: string }
  | { type: "PIN_MESSAGE"; messageId: string }
  | { type: "UNPIN_MESSAGE"; messageId: string }
  | { type: "SET_PINNED_MESSAGES"; messages: MessageItem[] }
  | { type: "SET_TYPING"; channelId: string; users: string[] }
  | { type: "UPDATE_CHANNEL"; channel: Channel }
  | { type: "ADD_CHANNEL"; channel: Channel }
  | { type: "MARK_CHANNEL_READ"; channelId: string };
