import type { MessagingState, MessagingAction, CurrentUser } from "./types";

export const initialCurrentUser: CurrentUser = {
  id: "",
  displayName: "",
  avatar: { initials: "", color: "bg-gradient-to-br from-blue-500 to-blue-600" },
  presence: "online",
};

export const initialState: MessagingState = {
  channels: [],
  activeChannelId: null,
  messages: [],
  threadMessages: [],
  activeThreadId: null,
  searchQuery: "",
  searchResults: [],
  isSearchOpen: false,
  isDetailPanelOpen: false,
  isThreadPanelOpen: false,
  isCreatingChannel: false,
  currentUser: initialCurrentUser,
  typingUsers: {},
  pinnedMessages: [],
};

export function messagingReducer(
  state: MessagingState,
  action: MessagingAction
): MessagingState {
  switch (action.type) {
    case "SET_CHANNELS":
      return { ...state, channels: action.channels };

    case "SET_ACTIVE_CHANNEL":
      return {
        ...state,
        activeChannelId: action.channelId,
        messages: [],
        isThreadPanelOpen: false,
        activeThreadId: null,
        threadMessages: [],
      };

    case "SET_MESSAGES":
      return { ...state, messages: action.messages };

    case "ADD_MESSAGE":
      return { ...state, messages: [...state.messages, action.message] };

    case "UPDATE_MESSAGE":
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.message.id ? action.message : m
        ),
      };

    case "DELETE_MESSAGE":
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.messageId ? { ...m, isDeleted: true } : m
        ),
      };

    case "SET_THREAD_MESSAGES":
      return { ...state, threadMessages: action.messages };

    case "OPEN_THREAD":
      return {
        ...state,
        activeThreadId: action.messageId,
        isThreadPanelOpen: true,
        threadMessages: [],
      };

    case "CLOSE_THREAD":
      return {
        ...state,
        isThreadPanelOpen: false,
        activeThreadId: null,
        threadMessages: [],
      };

    case "TOGGLE_SEARCH":
      return {
        ...state,
        isSearchOpen: action.isOpen ?? !state.isSearchOpen,
        searchResults: [],
      };

    case "SET_SEARCH_RESULTS":
      return { ...state, searchResults: action.results };

    case "TOGGLE_DETAIL_PANEL":
      return { ...state, isDetailPanelOpen: !state.isDetailPanelOpen };

    case "SET_CREATING_CHANNEL":
      return { ...state, isCreatingChannel: action.isCreating };

    case "ADD_REACTION": {
      const updateReactions = (messages: typeof state.messages) =>
        messages.map((m) => {
          if (m.id !== action.messageId) return m;
          // First: remove user from any existing reaction (enforce single reaction per user)
          let reactions = (m.reactions || []).map((r) => {
            if (!r.users.includes(state.currentUser.id)) return r;
            return {
              ...r,
              count: r.count - 1,
              hasReacted: false,
              users: r.users.filter((u) => u !== state.currentUser.id),
            };
          }).filter((r) => r.count > 0);

          // Then: add user to the new emoji reaction
          const idx = reactions.findIndex((r) => r.emoji === action.emoji);
          if (idx >= 0) {
            reactions[idx] = {
              ...reactions[idx],
              count: reactions[idx].count + 1,
              hasReacted: true,
              users: [...reactions[idx].users, state.currentUser.id],
            };
          } else {
            reactions.push({
              emoji: action.emoji,
              count: 1,
              hasReacted: true,
              users: [state.currentUser.id],
            });
          }
          return { ...m, reactions };
        });
      return {
        ...state,
        messages: updateReactions(state.messages),
        threadMessages: updateReactions(state.threadMessages),
      };
    }

    case "REMOVE_REACTION": {
      const removeReactions = (messages: typeof state.messages) =>
        messages.map((m) => {
          if (m.id !== action.messageId) return m;
          const reactions = (m.reactions || [])
            .map((r) => {
              if (r.emoji !== action.emoji) return r;
              return {
                ...r,
                count: r.count - 1,
                hasReacted: false,
                users: r.users.filter((u) => u !== state.currentUser.id),
              };
            })
            .filter((r) => r.count > 0);
          return { ...m, reactions };
        });
      return {
        ...state,
        messages: removeReactions(state.messages),
        threadMessages: removeReactions(state.threadMessages),
      };
    }

    case "PIN_MESSAGE":
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.messageId ? { ...m, isPinned: true } : m
        ),
      };

    case "UNPIN_MESSAGE":
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.messageId ? { ...m, isPinned: false } : m
        ),
        pinnedMessages: state.pinnedMessages.filter(
          (m) => m.id !== action.messageId
        ),
      };

    case "SET_PINNED_MESSAGES":
      return { ...state, pinnedMessages: action.messages };

    case "SET_TYPING":
      return {
        ...state,
        typingUsers: {
          ...state.typingUsers,
          [action.channelId]: action.users,
        },
      };

    case "UPDATE_CHANNEL":
      return {
        ...state,
        channels: state.channels.map((c) =>
          c.id === action.channel.id ? action.channel : c
        ),
      };

    case "ADD_CHANNEL":
      return { ...state, channels: [action.channel, ...state.channels] };

    case "MARK_CHANNEL_READ":
      return {
        ...state,
        channels: state.channels.map((c) =>
          c.id === action.channelId ? { ...c, unreadCount: 0 } : c
        ),
      };

    default:
      return state;
  }
}
