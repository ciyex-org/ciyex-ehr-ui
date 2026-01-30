"use client";

import AdminLayout from "@/app/(admin)/layout";
import React, { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

/* ------------ Types ------------ */
type ApiResponse<T> = { success: boolean; message: string; data: T };

type Message = {
    id: number;
    sender: string;
    recipient: string;
    time: string;
    createdAt: number;
    subject: string;
    body: string;
    folder: string;
    avatar?: { initials: string; color: string };
    isRead?: boolean;
    thread?: MessageThread[];
    type?: 'patient' | 'provider';
    who?: string;
    preview?: string;
    when?: string;
    unread?: boolean;
    lastActive?: string;
    username?: string;
    status?: 'sent' | 'delivered' | 'read';
    replyTo?: { id: number; sender: string; message: string };
    isArchived?: boolean;
    conversationPatientId?: number;
    conversationPatientName?: string;
    conversationProviderId?: number;
};

type MessageThread = {
    id: string;
    sender: string;
    content: string;
    timestamp: string;
    isUser: boolean;
    avatar?: string;
    attachments?: Attachment[];
    status?: 'sent' | 'delivered' | 'read';
    replyTo?: { id: number; sender: string; message: string };
};

type Patient = {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
};

type Provider = {
    id: number;
    identification?: { firstName?: string; lastName?: string };
};

type Template = {
    id: number;
    templateName: string;
    subject: string;
    body: string;
    archived?: boolean;
};

type CommunicationDto = {
    id: number;
    subject: string;
    payload: string;
    status: string;
    fromName?: string;
    toNames?: string[];
    createdDate?: string;
    inResponseTo?: number;
    fromType?: 'provider' | 'patient';
};

type Attachment = {
    id: string;
    name: string;
    url: string;
    type: 'image' | 'pdf' | 'document' | 'other';
    size: string;
};

// Define proper types for conversation items
type ConversationItem = {
    id: string;
    participant: string;
    participantType: 'patient' | 'provider';
    time: string;
    preview?: string;
    unread: boolean;
    avatar?: { initials: string; color: string };
    lastActive?: string;
    username?: string;
    isArchived?: boolean;
};

type Conversation = {
    id: string;
    participant: string;
    participantType: 'patient' | 'provider';
    lastMessage: string;
    lastMessageTime: number;
    unread: boolean;
    avatar: { initials: string; color: string };
    messages: Message[];
    username?: string;
    isArchived?: boolean;
};

const avatarColors = [
    "bg-gradient-to-br from-blue-500 to-blue-600",
    "bg-gradient-to-br from-pink-500 to-pink-600",
    "bg-gradient-to-br from-green-500 to-green-600",
    "bg-gradient-to-br from-red-500 to-red-600",
    "bg-gradient-to-br from-orange-500 to-orange-600",
    "bg-gradient-to-br from-purple-500 to-purple-600",
    "bg-gradient-to-br from-indigo-500 to-indigo-600",
];

/* ------------ Helpers ------------ */
function formatTime(ts: number): string {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatMessageTime(ts: number): string {
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();

    if (isToday) {
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else {
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
}

function formatRelativeTime(ts: number): string {
    const now = new Date().getTime();
    const diff = now - ts;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
}

function initials(name: string) {
    const parts = name.split(/\s+/).filter(Boolean);
    let initials = '';

    if (parts.length > 0) {
        initials += parts[0][0].toUpperCase();
    }

    if (parts.length > 1) {
        initials += parts[parts.length - 1][0].toUpperCase();
    }

    return initials;
}

function generateUsername(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '_') + '_' + Math.random().toString(36).substr(2, 5);
}

/* ------------ WhatsApp-style Components ------------ */

// Attachment Menu Component - WhatsApp Style
const AttachmentMenu: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    position: { top: number; left: number };
    onSelect: (type: 'image' | 'document' | 'camera' | 'contact' | 'location') => void;
}> = ({ isOpen, onClose, position, onSelect }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const menuItems = [
        { type: 'image' as const, icon: '🖼️', label: 'Photos & Videos', color: 'text-purple-500' },
        { type: 'document' as const, icon: '📄', label: 'Document', color: 'text-blue-500' },
        { type: 'camera' as const, icon: '📷', label: 'Camera', color: 'text-gray-500' },
        { type: 'contact' as const, icon: '👤', label: 'Contact', color: 'text-green-500' },
        { type: 'location' as const, icon: '📍', label: 'Location', color: 'text-red-500' },
    ];

    return (
        <div
            ref={menuRef}
            className="fixed bg-white rounded-2xl shadow-2xl border border-gray-200 py-3 z-50 min-w-48"
            style={{
                top: Math.max(10, position.top - 220), // Ensure it doesn't go off-screen
                left: Math.max(10, position.left - 180),
                maxHeight: '300px',
                overflow: 'auto'
            }}
        >
            {menuItems.map((item) => (
                <button
                    key={item.type}
                    onClick={() => onSelect(item.type)}
                    className="flex items-center gap-4 w-full px-4 py-3 hover:bg-gray-50 transition-colors first:rounded-t-2xl last:rounded-b-2xl"
                >
                    <span className={`text-2xl ${item.color}`}>{item.icon}</span>
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                </button>
            ))}
        </div>
    );
};

// Reply Preview Component - UPDATED: Show "yourself" when replying to own messages
const ReplyPreview: React.FC<{
    replyTo: { id: string; sender: string; content: string };
    onCancel?: () => void;
    isReplyingToSelf?: boolean;
}> = ({ replyTo, onCancel, isReplyingToSelf = false }) => (
    <div className="flex items-start gap-3 p-3 bg-gray-50 border-l-4 border-green-500 rounded-lg mb-3">
        <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-green-600">
                    {isReplyingToSelf ? "Replying to yourself" : `Replying to ${replyTo.sender}`}
                </span>
            </div>
            <p className="text-sm text-gray-600 truncate">{replyTo.content}</p>
        </div>
        {onCancel && (
            <button
                onClick={onCancel}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        )}
    </div>
);

// Message Bubble Component - WhatsApp Style with Reply and Archive Buttons
const MessageBubble: React.FC<{
    message: MessageThread;
    isCurrentUser: boolean;
    onReply?: (message: MessageThread) => void;
    onArchive?: (message: MessageThread) => void;
    currentUserName?: string;
    attachments?: Attachment[];
    downloadAttachment?: (messageId: number, attachmentId: string, fileName: string) => void;
}> = ({ message, isCurrentUser, onReply, onArchive, currentUserName, attachments = [], downloadAttachment }) => {
    const [showOptions, setShowOptions] = useState(false);

    // Check if the reply is to the current user's own message
    const isReplyingToSelf = message.replyTo && currentUserName &&
        message.replyTo.sender === currentUserName;

    return (
        <div
            className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-3 group relative`}
            onMouseEnter={() => setShowOptions(true)}
            onMouseLeave={() => setShowOptions(false)}
        >
            {/* Action buttons that appear on hover - POSITIONED ON THE RIGHT SIDE */}
            {showOptions && isCurrentUser && (
                <div className="absolute right-0 -translate-x-14 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1 z-10">
                    {/* Reply Button */}
                    {onReply && (
                        <button
                            onClick={() => onReply(message)}
                            className="bg-white shadow-lg rounded-full p-2 border border-gray-200 hover:bg-gray-50 transition-colors"
                            title="Reply to this message"
                        >
                            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                            </svg>
                        </button>
                    )}

                    {/* Archive Button - REPLACED DELETE WITH ARCHIVE */}
                    {onArchive && (
                        <button
                            onClick={() => onArchive(message)}
                            className="bg-white shadow-lg rounded-full p-2 border border-gray-200 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            title="Archive this message"
                        >
                            <svg className="w-4 h-4 text-gray-600 hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                            </svg>
                        </button>
                    )}
                </div>
            )}

            {/* Action buttons for received messages (on the left side) */}
            {showOptions && !isCurrentUser && (
                <div className="absolute left-0 translate-x-14 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1 z-10">
                    {/* Reply Button for received messages */}
                    {onReply && (
                        <button
                            onClick={() => onReply(message)}
                            className="bg-white shadow-lg rounded-full p-2 border border-gray-200 hover:bg-gray-50 transition-colors"
                            title="Reply to this message"
                        >
                            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                            </svg>
                        </button>
                    )}
                </div>
            )}

            <div className={`flex flex-col max-w-[70%] ${isCurrentUser ? 'items-end' : 'items-start'}`}>

                {/* Reply-to message preview */}
                {message.replyTo && (
                    <div className={`w-full mb-1 px-3 pt-2 border-l-2 ${
                        isCurrentUser ? 'border-green-400' : 'border-gray-400'
                    }`}>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-gray-600">
                                {isReplyingToSelf ? "You" : message.replyTo.sender}
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                            {message.replyTo.message}
                        </p>
                    </div>
                )}

                {/* Message bubble */}
                <div className={`relative px-4 py-2 rounded-2xl ${
                    isCurrentUser
                        ? 'bg-green-500 text-white rounded-br-md'
                        : 'bg-gray-100 text-gray-800 rounded-bl-md'
                }`}>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>

                {/* Attachments */}
                {attachments && attachments.length > 0 && (
                    <div className={`mt-2 space-y-2 ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                        {attachments.map((attachment) => (
                            <div
                                key={attachment.id}
                                className={`flex items-center gap-2 p-2 rounded-lg max-w-xs ${
                                    isCurrentUser
                                        ? 'bg-green-600 text-white'
                                        : 'bg-gray-100 text-gray-800'
                                }`}
                            >
                                {/* File Icon */}
                                <div className="flex-shrink-0">
                                    {attachment.type === 'image' && (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    )}
                                    {attachment.type === 'pdf' && (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    )}
                                    {attachment.type === 'document' && (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    )}
                                    {attachment.type === 'other' && (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    )}
                                </div>

                                {/* File Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{attachment.name}</p>
                                    <p className="text-xs opacity-75">{attachment.size}</p>
                                </div>

                                {/* Download Button */}
                                {downloadAttachment && (
                                    <button
                                        onClick={() => downloadAttachment(parseInt(message.id), attachment.id, attachment.name)}
                                        className={`p-1 rounded hover:bg-black hover:bg-opacity-20 transition-colors ${
                                            isCurrentUser ? 'hover:bg-white hover:bg-opacity-20' : ''
                                        }`}
                                        title="Download attachment"
                                    >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Timestamp and status */}
                <div className="flex items-center gap-2 mt-1 px-2">
                    <span className="text-xs text-gray-500">
                        {formatMessageTime(new Date(message.timestamp).getTime())}
                    </span>
                    {isCurrentUser && message.status && (
                        <div className="flex items-center">
                            {message.status === 'read' ? (
                                <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/>
                                </svg>
                            ) : message.status === 'delivered' ? (
                                <svg className="w-3 h-3 text-gray-500" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/>
                                </svg>
                            ) : (
                                <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5V2zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1H4z"/>
                                </svg>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Message List Item Component - FIXED: Handle boolean type properly
const MessageListItem: React.FC<{
    item: ConversationItem;
    isActive: boolean;
    onSelect: (id: string) => void
}> = ({ item, isActive, onSelect }) => {
    return (
        <div
            className={`flex items-start p-4 cursor-pointer border-b border-gray-100 ${
                isActive ? 'bg-blue-50' : 'hover:bg-gray-50'
            }`}
            onClick={() => onSelect(item.id)}
        >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3 ${
                item.avatar?.color || 'bg-green-500'
            }`}>
                {initials(item.participant) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                    <span className={`font-semibold text-sm ${isActive ? 'text-black' : 'text-gray-900'}`}>
                        {item.participant}
                    </span>
                    <span className="text-xs text-gray-500">{item.time}</span>
                </div>
                <p className={`text-sm truncate ${isActive ? 'text-gray-700' : 'text-gray-600'} ${item.unread ? 'font-semibold' : ''}`}>
                    {item.preview || 'No preview available'}
                </p>
            </div>
            {item.unread && (
                <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full ml-2"></div>
            )}
        </div>
    );
};

// Profile Sidebar Component - UPDATED: Removed email section
const ProfileSidebar: React.FC<{ selectedConversation: Conversation | null }> = ({ selectedConversation }) => {
    if (!selectedConversation) return null;

    const actualTime = formatRelativeTime(selectedConversation.lastMessageTime);
    const isProvider = selectedConversation.participantType === 'provider';

    const userProfile = {
        role: isProvider ? 'Healthcare Provider' : 'Patient',
        place: isProvider ? 'Medical Center' : 'Patient Home',
        activeHours: isProvider ? '9:00 AM - 6:00 PM' : 'Flexible',
        experience: isProvider ? '8 years' : 'N/A',
        languages: isProvider ? ['English', 'Spanish', 'Medical Terminology'] : ['English', 'Spanish']
    };

    return (
        <div className="w-80 p-6 border-l bg-white flex-shrink-0">
            <div className="text-center mb-6">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3 ${
                    selectedConversation.avatar?.color || 'bg-green-500'
                }`}>
                    {initials(selectedConversation.participant) || 'U'}
                </div>
                <h3 className="font-bold text-lg mb-1">{selectedConversation.participant}</h3>
                {/* Email section removed as requested */}
                <p className="text-gray-500 text-xs mt-2">{actualTime}</p>
            </div>

            <div className="mb-6">
                <h4 className="font-bold text-sm mb-3">About {selectedConversation.participant}</h4>
                <div className="space-y-3 text-sm">
                    <div>
                        <span className="text-gray-500 block text-xs mb-1">Role</span>
                        <p className="font-medium">{userProfile.role}</p>
                    </div>
                    <div>
                        <span className="text-gray-500 block text-xs mb-1">Place</span>
                        <p className="font-medium">{userProfile.place}</p>
                    </div>
                    <div>
                        <span className="text-gray-500 block text-xs mb-1">Active Hours</span>
                        <p className="font-medium">{userProfile.activeHours}</p>
                    </div>
                    <div>
                        <span className="text-gray-500 block text-xs mb-1">Experience</span>
                        <p className="font-medium">{userProfile.experience}</p>
                    </div>
                    <div>
                        <span className="text-gray-500 block text-xs mb-1">Languages Known</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                            {userProfile.languages.map((lang) => (
                                <span key={lang} className="px-2 py-1 bg-gray-100 rounded text-xs">
                                    {lang}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Attachment Preview Component
const AttachmentPreview: React.FC<{
    files: File[];
    onRemove: (index: number) => void;
}> = ({ files, onRemove }) => {
    if (files.length === 0) return null;

    return (
        <div className="border-t bg-gray-50 p-3">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                    {files.length} attachment{files.length > 1 ? 's' : ''}
                </span>
            </div>
            <div className="space-y-2">
                {files.map((file, index) => (
                    <div key={index} className="flex items-center gap-3 bg-white p-2 rounded-lg border">
                        <div className="flex-shrink-0">
                            {file.type.startsWith('image/') ? (
                                <span className="text-2xl">🖼️</span>
                            ) : file.type.includes('pdf') ? (
                                <span className="text-2xl">📄</span>
                            ) : (
                                <span className="text-2xl">📎</span>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                            <p className="text-xs text-gray-500">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                        </div>
                        <button
                            onClick={() => onRemove(index)}
                            className="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

// WhatsApp-style Reply Section - UPDATED: robust drag & drop
const ReplySection: React.FC<{
    replyBody: string;
    setReplyBody: (body: string) => void;
    onSendReply: () => void;
    isTyping: boolean;
    replyInputRef: React.RefObject<HTMLTextAreaElement>;
    replyTo?: MessageThread | null;
    onCancelReply?: () => void;
    currentUserName?: string;
    showAttachmentMenu: boolean;
    attachmentMenuPosition: { top: number; left: number };
    onAttachmentSelect: (type: 'image' | 'document' | 'camera' | 'contact' | 'location') => void;
    onCloseAttachmentMenu: () => void;
    pendingAttachments: File[];
    onRemoveAttachment: (index: number) => void;
    onFilesSelected: (files: File[]) => void;
}> = ({
          replyBody,
          setReplyBody,
          onSendReply,
          isTyping,
          replyInputRef,
          replyTo,
          onCancelReply,
          currentUserName,
          showAttachmentMenu,
          attachmentMenuPosition,
          onAttachmentSelect,
          onCloseAttachmentMenu,
          pendingAttachments,
          onRemoveAttachment,
          onFilesSelected
      }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragActive, setDragActive] = useState(false);
    // Use a ref counter to avoid flicker when entering/leaving nested elements
    const dragCounter = useRef(0);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSendReply();
        }
    };

    // Check if replying to own message
    const isReplyingToSelf = replyTo && currentUserName && replyTo.sender === currentUserName;

    // Format the replyTo object for the ReplyPreview component
    const formattedReplyTo = replyTo ? {
        id: replyTo.id,
        sender: replyTo.sender,
        content: replyTo.content
    } : undefined;

    // Window-level drag handlers so users can drag from outside the window
    useEffect(() => {
        const onWindowDragEnter = (e: DragEvent) => {
            e.preventDefault();
            dragCounter.current += 1;
            setDragActive(true);
        };

        const onWindowDragOver = (e: DragEvent) => {
            e.preventDefault();
            setDragActive(true);
        };

        const onWindowDragLeave = (e: DragEvent) => {
            e.preventDefault();
            dragCounter.current -= 1;
            if (dragCounter.current <= 0) {
                dragCounter.current = 0;
                setDragActive(false);
            }
        };

        const onWindowDrop = (e: DragEvent) => {
            e.preventDefault();
            dragCounter.current = 0;
            setDragActive(false);
            const files = e.dataTransfer?.files;
            if (files && files.length > 0) {
                onFilesSelected(Array.from(files));
            }
        };

        window.addEventListener('dragenter', onWindowDragEnter);
        window.addEventListener('dragover', onWindowDragOver);
        window.addEventListener('dragleave', onWindowDragLeave);
        window.addEventListener('drop', onWindowDrop);

        return () => {
            window.removeEventListener('dragenter', onWindowDragEnter);
            window.removeEventListener('dragover', onWindowDragOver);
            window.removeEventListener('dragleave', onWindowDragLeave);
            window.removeEventListener('drop', onWindowDrop);
        };
    }, [onFilesSelected]);

    // Local handlers for the reply area (keeps existing behavior)
    const handleLocalDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current = 0;
        setDragActive(false);
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            onFilesSelected(Array.from(files));
        }
    };

    const handleLocalDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current += 1;
        setDragActive(true);
    };

    const handleLocalDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current -= 1;
        if (dragCounter.current <= 0) {
            dragCounter.current = 0;
            setDragActive(false);
        }
    };

    return (
        <div className="relative">
            {/* Full-window drop overlay when dragging files */}
            {dragActive && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
                    onDragOver={(e) => { e.preventDefault(); }}
                    onDrop={(e) => { /* handled by window drop listener */ e.preventDefault(); }}
                >
                    <div className="w-80 p-6 bg-white rounded-lg border-2 border-dashed border-green-300 text-center">
                        <div className="text-3xl mb-3">📎</div>
                        <div className="font-semibold">Drop files to attach</div>
                        <div className="text-sm text-gray-500 mt-2">You can drop multiple files</div>
                    </div>
                </div>
            )}

            <div
                className="border-t bg-white relative"
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
                onDragEnter={handleLocalDragEnter}
                onDragLeave={handleLocalDragLeave}
                onDrop={handleLocalDrop}
            >
                {/* Attachment Menu */}
                <AttachmentMenu
                    isOpen={showAttachmentMenu}
                    onClose={onCloseAttachmentMenu}
                    position={attachmentMenuPosition}
                    onSelect={onAttachmentSelect}
                />

                {/* Attachment Preview */}
                <AttachmentPreview
                    files={pendingAttachments}
                    onRemove={onRemoveAttachment}
                />

                {/* Reply Preview */}
                {formattedReplyTo && (
                    <ReplyPreview
                        replyTo={formattedReplyTo}
                        onCancel={onCancelReply}
                        isReplyingToSelf={isReplyingToSelf || false}
                    />
                )}

                <div className="p-3">
                    <div className={`flex gap-2 items-end ${dragActive ? 'ring-2 ring-green-300 rounded-lg bg-green-50' : ''}`}>
                        {/* Emoji Button */}
                        <button className="flex-shrink-0 p-2 text-gray-500 hover:text-gray-700 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </button>

                        {/* Attachment Button (opens file picker) */}
                        <input ref={fileInputRef} type="file" className="hidden" multiple onChange={(e) => {
                            const files = e.target.files;
                            if (files && files.length > 0) {
                                onFilesSelected(Array.from(files));
                                // reset so same file can be chosen again
                                e.currentTarget.value = '';
                            }
                        }} />

                        <button
                            onClick={() => fileInputRef.current?.click()}
                            type="button"
                            className="flex-shrink-0 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors relative"
                            title="Add attachment"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                        </button>


                        {/* Message Input */}
                        <div className="flex-1 relative">
                            <textarea
                                ref={replyInputRef}
                                className="w-full p-3 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 resize-none bg-gray-50"
                                placeholder="Type a message..."
                                value={replyBody}
                                onChange={(e) => {
                                    const el = e.target as HTMLTextAreaElement;
                                    const caret = el.selectionStart ?? el.value.length;
                                    const newVal = el.value;

                                    // update height immediately for smooth UX
                                    el.style.height = 'auto';
                                    el.style.height = Math.min(el.scrollHeight, 120) + 'px';

                                    // update state
                                    setReplyBody(newVal);

                                    // restore focus and caret on next tick to avoid losing caret
                                    setTimeout(() => {
                                        const node = replyInputRef.current;
                                        if (node) {
                                            node.focus();
                                            try {
                                                node.selectionStart = node.selectionEnd = caret;
                                            } catch {
                                                // ignore if not supported
                                            }
                                        }
                                    }, 0);
                                }}
                                onKeyDown={handleKeyDown}
                                disabled={isTyping}
                                rows={1}
                                style={{ minHeight: '44px', maxHeight: '120px' }}
                            />
                        </div>

                        {/* Voice Message / Send Button */}
                        {replyBody.trim() || pendingAttachments.length > 0 ? (
                            <button
                                onClick={onSendReply}
                                disabled={isTyping}
                                className="flex-shrink-0 p-3 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors disabled:opacity-50"
                            >
                                {isTyping ? (
                                    <div className="flex gap-1">
                                        <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                                        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                    </div>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                )}
                            </button>
                        ) : (
                            <button className="flex-shrink-0 p-3 text-gray-500 hover:text-gray-700 transition-colors">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2c-4.97 0-9 4.03-9 9 0 4.97 4.03 9 9 9 4.97 0 9-4.03 9-9 0-4.97-4.03-9-9-9zm0 16c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
                                    <path d="M12 7c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z"/>
                                </svg>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ------------ Main Component ------------ */
export default function MessagingPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const hydratedOnce = useRef(false);

    // Conversation state
    const [conversationView, setConversationView] = useState<'list' | 'thread'>('list');
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [conversationSearch, setConversationSearch] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [selectedFolder, setSelectedFolder] = useState<'all' | 'unread' | 'starred' | 'archived'>('all');

    // Message input state
    const [replyBody, setReplyBody] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [replyingTo, setReplyingTo] = useState<MessageThread | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const replyInputRef = useRef<HTMLTextAreaElement>(null);

    // Attachment state
    const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
    const [attachmentMenuPosition] = useState({ top: 0, left: 0 });
    const [pendingAttachments, setPendingAttachments] = useState<File[]>([]);

    // Compose state
    const [isCreating, setIsCreating] = useState(false);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [providers, setProviders] = useState<Provider[]>([]);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [selectedPatientId, setSelectedPatientId] = useState<string>("");
    const [selectedProviderId, setSelectedProviderId] = useState<string>("");
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [selectedTemplateId, setSelectedTemplateId] = useState<number | "">("");

    // Notification state
    const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

    // Attachment state
    const [messageAttachments, setMessageAttachments] = useState<Record<number, Attachment[]>>({});
    const [loadingAttachments, setLoadingAttachments] = useState(false);

    // Dropdown options - REMOVED TRASH, CHANGED TO ARCHIVE
    const dropdownOptions = [
        { id: 'all', label: 'All messages', icon: '📨' },
        { id: 'unread', label: 'Unread', icon: '🔔' },
        { id: 'starred', label: 'Starred', icon: '⭐' },
        { id: 'archived', label: 'Archived', icon: '📁' }
    ];

    // Get current user name (assuming admin is the provider)
    const currentUserName = useMemo(() => {
        if (providers.length > 0) {
            const provider = providers[0];
            return `${provider.identification?.firstName} ${provider.identification?.lastName}`.trim() || 'Healthcare Provider';
        }
        return 'Healthcare Provider';
    }, [providers]);

    /* ---- Derived Data ---- */
    const composeTemplateOptions: Template[] = useMemo(
        () => templates.filter((t: Template) => !t.archived),
        [templates]
    );

    // Track archived conversations
    const [archivedConversations, setArchivedConversations] = useState<Set<string>>(new Set());

    // Group messages by conversation (participant) - WhatsApp style
    const conversationsByParticipant = useMemo(() => {
        const conversationMap = new Map<string, Conversation>();

        messages.forEach(msg => {
            // For admin view, we want to group by the other participant
            // Since admin is always the provider, group by patient
            let conversationParticipant: string;
            let participantType: 'patient' | 'provider';

            if (msg.type === 'provider') {
                // If message is from provider, conversation is with the recipient (patient)
                conversationParticipant = msg.recipient;
                participantType = 'patient';
            } else {
                // If message is from patient, conversation is with the sender (patient)
                conversationParticipant = msg.sender;
                participantType = 'patient';
            }

            // Create a consistent conversation ID based on participant
            // Better conversation ID that includes both patient and provider when available
            let conversationId: string;
            if (msg.conversationPatientId && msg.conversationProviderId) {
                conversationId = `conversation_p${msg.conversationPatientId}_pr${msg.conversationProviderId}`;
            } else {
                conversationId = `conversation_${conversationParticipant.toLowerCase().replace(/\s+/g, '_')}`;
            }

            // Check if this conversation is archived
            const isArchived = archivedConversations.has(conversationId);

            // Ensure unread is always a boolean
            const unread = Boolean(msg.unread);

            if (!conversationMap.has(conversationId)) {
                conversationMap.set(conversationId, {
                    id: conversationId,
                    participant: conversationParticipant,
                    participantType,
                    lastMessage: msg.body,
                    lastMessageTime: msg.createdAt,
                    unread: unread,
                    avatar: msg.avatar || {
                        initials: initials(conversationParticipant),
                        color: avatarColors[Math.abs(conversationId.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % avatarColors.length]
                    },
                    messages: [msg],
                    username: msg.username || generateUsername(conversationParticipant),
                    isArchived
                });
            } else {
                const existing = conversationMap.get(conversationId)!;
                // Update with latest message
                if (msg.createdAt > existing.lastMessageTime) {
                    existing.lastMessage = msg.body;
                    existing.lastMessageTime = msg.createdAt;
                }
                if (unread) {
                    existing.unread = true;
                }
                existing.messages.push(msg);
                // Sort messages by time when adding new ones
                existing.messages.sort((a, b) => a.createdAt - b.createdAt);
                existing.isArchived = isArchived;
            }
        });

        return Array.from(conversationMap.values()).sort((a, b) => b.lastMessageTime - a.lastMessageTime);
    }, [messages, archivedConversations]);

    // Filter conversations based on selected folder
    const filteredConversations = useMemo(() => {
        let filtered = conversationsByParticipant;

        switch (selectedFolder) {
            case 'unread':
                filtered = filtered.filter(conv => conv.unread && !conv.isArchived);
                break;
            case 'starred':
                // Implement starred logic if needed
                filtered = filtered.filter(conv => !conv.isArchived);
                break;
            case 'archived':
                filtered = filtered.filter(conv => Boolean(conv.isArchived));
                break;
            case 'all':
            default:
                filtered = filtered.filter(conv => !conv.isArchived);
                break;
        }

        return filtered;
    }, [conversationsByParticipant, selectedFolder]);

    // Convert backend messages to conversation items - FIXED: Ensure proper boolean handling
    const conversationItems: ConversationItem[] = useMemo(() => {
        return filteredConversations.map(conv => ({
            id: conv.id,
            participant: conv.participant,
            participantType: conv.participantType,
            time: formatRelativeTime(conv.lastMessageTime),
            preview: conv.lastMessage.slice(0, 50) + (conv.lastMessage.length > 50 ? '...' : ''),
            unread: Boolean(conv.unread), // Explicitly ensure boolean
            avatar: conv.avatar,
            lastActive: formatRelativeTime(conv.lastMessageTime),
            username: conv.username,
            isArchived: Boolean(conv.isArchived) // Ensure boolean
        }));
    }, [filteredConversations]);

    /* ---- Notification ---- */
    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 4000);
    };

    /* ---- Helper Functions ---- */
    const getFileType = (contentType: string | undefined, fileName?: string): 'image' | 'pdf' | 'document' | 'other' => {
        if (!contentType && fileName) {
            const ext = fileName.split('.').pop()?.toLowerCase();
            switch (ext) {
                case 'jpg':
                case 'jpeg':
                case 'png':
                case 'gif':
                case 'bmp':
                case 'webp':
                    return 'image';
                case 'pdf':
                    return 'pdf';
                case 'doc':
                case 'docx':
                case 'txt':
                case 'rtf':
                    return 'document';
                default:
                    return 'other';
            }
        }

        if (contentType?.startsWith('image/')) return 'image';
        if (contentType === 'application/pdf') return 'pdf';
        if (contentType?.includes('document') || contentType?.includes('text')) return 'document';
        return 'other';
    };

    /* ---- Load Message Attachments ---- */
    const loadMessageAttachments = useCallback(async (messageId: number): Promise<Attachment[]> => {
        try {
            const res = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_URL}/api/messages/${messageId}/attachments`
            );

            if (!res.ok) {
                console.warn(`Failed to load attachments for message ${messageId}:`, res.status);
                return [];
            }

            const json: ApiResponse<any[]> = await res.json();
            if (json.success && json.data) {
                return json.data.map(attachment => ({
                    id: String(attachment.id),
                    name: attachment.fileName,
                    url: `${process.env.NEXT_PUBLIC_API_URL}/api/messages/${messageId}/attachments/${attachment.id}/download`,
                    type: getFileType(attachment.contentType, attachment.fileName),
                    size: attachment.fileSize || '0 KB'
                }));
            }
            return [];
        } catch (error) {
            console.error('Failed to load message attachments:', error);
            return [];
        }
    }, []);

    /* ---- Upload Message Attachment ---- */
    const uploadMessageAttachment = async (messageId: number, file: File): Promise<void> => {
        const formData = new FormData();
        
        // Create the dto object with only the fields that match the backend DTO
        const dto = {
            fileName: file.name,
            contentType: file.type,
            description: '', // Optional description
            category: 'attachment', // Default category
            type: getFileType(file.type, file.name) // Use our getFileType helper
        };

        // Append the dto as JSON string
        formData.append('dto', JSON.stringify(dto));
        // Append the actual file
        formData.append('file', file);

        const res = await fetchWithAuth(
            `${process.env.NEXT_PUBLIC_API_URL}/api/messages/${messageId}/attachments`,
            {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            }
        );

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`HTTP ${res.status}: ${errorText}`);
        }

        const json: ApiResponse<{ id: string }> = await res.json();
        if (!json.success) {
            throw new Error(json.message || 'Failed to upload attachment');
        }
    };

    /* ---- Upload Multiple Attachments ---- */
    const uploadMultipleAttachments = async (messageId: number, files: File[]): Promise<void> => {
        const uploadPromises = files.map(file => uploadMessageAttachment(messageId, file));
        await Promise.all(uploadPromises);
    };

    /* ---- Download Attachment ---- */
    const downloadAttachment = async (messageId: number, attachmentId: string, fileName: string) => {
        try {
            const res = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_URL}/api/messages/${messageId}/attachments/${attachmentId}/download`
            );

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Failed to download attachment:', error);
            showNotification('Failed to download attachment', 'error');
        }
    };

    /* ---- Load Data ---- */
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                // Load providers on component mount
                const providersRes = await fetchWithAuth(
                    `${process.env.NEXT_PUBLIC_API_URL}/api/providers?status=ACTIVE`
                );
                const providersJson: ApiResponse<Provider[]> = await providersRes.json();
                if (providersJson.success && Array.isArray(providersJson.data)) {
                    setProviders(providersJson.data);
                } else {
                    // If no providers found, create a default admin provider
                    console.warn('No providers found, creating default admin provider');
                    setProviders([{
                        id: 1,
                        identification: {
                            firstName: 'Admin',
                            lastName: 'Provider'
                        }
                    }]);
                }

                // Load patients
                const patientsRes = await fetchWithAuth(
                    `${process.env.NEXT_PUBLIC_API_URL}/api/patients?page=0&size=50`
                );
                const patientsJson: ApiResponse<{ content: Patient[] }> = await patientsRes.json();
                if (patientsJson.success && Array.isArray(patientsJson.data?.content)) {
                    setPatients(patientsJson.data.content);
                }

                // Load templates
                const templatesRes = await fetchWithAuth(
                    `${process.env.NEXT_PUBLIC_API_URL}/api/templates`
                );
                const templatesJson: ApiResponse<Template[]> = await templatesRes.json();
                if (templatesJson.success && Array.isArray(templatesJson.data)) {
                    setTemplates(templatesJson.data);
                }
            } catch (error) {
                console.error('Failed to load initial data:', error);
                // Set default provider even if API fails
                setProviders([{
                    id: 1,
                    identification: {
                        firstName: 'Admin',
                        lastName: 'Provider'
                    }
                }]);
            }
        };

        if (!hydratedOnce.current) {
            hydratedOnce.current = true;
            void loadInitialData();
            void loadCommunications();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* ---- Load Communications ---- */
    const loadCommunications = async () => {
        try {
            const res = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_URL}/api/communications`
            );

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const json: ApiResponse<CommunicationDto[]> = await res.json();
            if (json.success && Array.isArray(json.data)) {
                const mapped: Message[] = json.data.map((comm) => {
                    const ts = comm.createdDate
                        ? new Date(comm.createdDate).getTime()
                        : Date.now();

                    let folder = "sent";
                    if (comm.status === "RECEIVED") folder = "inbox";
                    else if (comm.status === "ARCHIVED") folder = "archive";

                    const colorIndex = comm.id % avatarColors.length;
                    const senderName = comm.fromName || "Unknown User";
                    const recipientName = comm.toNames?.[0] || "Unknown Recipient";

                    // Better type detection
                    let messageType: 'patient' | 'provider' = 'patient'; // default to patient
                    if (comm.fromType) {
                        messageType = comm.fromType;
                    } else if (senderName.toLowerCase().includes('provider') ||
                        senderName.toLowerCase().includes('dr.') ||
                        senderName.toLowerCase().includes('doctor') ||
                        senderName.toLowerCase().includes('nurse')) {
                        messageType = 'provider';
                    }

                    // Ensure unread is always a boolean
                    const unread = folder === 'inbox';

                    return {
                        id: comm.id,
                        sender: senderName,
                        recipient: recipientName,
                        subject: comm.subject,
                        body: comm.payload,
                        createdAt: ts,
                        time: formatTime(ts),
                        folder,
                        avatar: {
                            initials: initials(senderName),
                            color: avatarColors[colorIndex],
                        },
                        isRead: folder !== "inbox",
                        type: messageType,
                        who: comm.fromName,
                        preview: comm.payload.slice(0, 100) + (comm.payload.length > 100 ? '...' : ''),
                        when: formatTime(ts),
                        unread: unread,
                        lastActive: formatRelativeTime(ts),
                        username: generateUsername(senderName),
                        status: 'read' // Default status for existing messages
                    };
                });

                setMessages(mapped);
            }
        } catch (error) {
            console.error('Failed to load communications:', error);
            showNotification('Failed to load messages', 'error');
        }
    };

    // Load attachments for thread messages when conversation is selected
    useEffect(() => {
        if (selectedConversation && selectedConversation.messages.length > 0) {
            const loadThreadAttachments = async () => {
                setLoadingAttachments(true);
                try {
                    const attachmentsMap: Record<number, Attachment[]> = {};

                    for (const msg of selectedConversation.messages) {
                        const messageId = msg.id;
                        const attachments = await loadMessageAttachments(messageId);
                        if (attachments.length > 0) {
                            attachmentsMap[messageId] = attachments;
                            console.log(`Loaded ${attachments.length} attachments for message ${messageId}:`, attachments);
                        }
                    }

                    setMessageAttachments(attachmentsMap);
                } catch (error) {
                    console.error('Failed to load thread attachments:', error);
                } finally {
                    setLoadingAttachments(false);
                }
            };

            loadThreadAttachments();
        } else {
            setMessageAttachments({});
        }
    }, [selectedConversation, loadMessageAttachments]);

    // Focus on input when conversation is selected
    useEffect(() => {
        if (selectedConversation && replyInputRef.current) {
            setTimeout(() => {
                replyInputRef.current?.focus();
            }, 100);
        }
    }, [selectedConversation]);

    /* ---- Attachment Handlers ---- */
    const handleAttachmentSelect = (type: 'image' | 'document' | 'camera' | 'contact' | 'location') => {
        console.log('Attachment type selected:', type);
        setShowAttachmentMenu(false);

        // Create file input based on selection
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = type === 'image' ? 'image/*' : type === 'document' ? '.pdf,.doc,.docx,.txt' : '*/*';
        input.multiple = type === 'image';

        input.onchange = (e) => {
            const files = (e.target as HTMLInputElement).files;
            if (files && files.length > 0) {
                const selectedFiles = Array.from(files);

                // Add to pending attachments
                setPendingAttachments(prev => [...prev, ...selectedFiles]);

                const fileNames = selectedFiles.map(f => f.name).join(', ');
                showNotification(`Added ${selectedFiles.length} ${type}(s): ${fileNames}`, 'success');
                console.log(`Selected ${type} files:`, selectedFiles);
            }
        };

        input.click();
    };

    const handleCloseAttachmentMenu = () => {
        setShowAttachmentMenu(false);
    };

    // Remove attachment from pending list
    const removeAttachment = (index: number) => {
        setPendingAttachments(prev => prev.filter((_, i) => i !== index));
    };

    // Handle files selected via picker or drag-drop
    const handleFilesSelected = (files: File[]) => {
        if (!files || files.length === 0) return;
        setPendingAttachments(prev => [...prev, ...files]);
        const names = files.map(f => f.name).join(', ');
        showNotification(`Added ${files.length} attachment(s): ${names}`, 'success');
        console.log('Files added via picker/drag-drop:', files);
    };

    // Clear all attachments
    // const clearAttachments = () => {
    //     setPendingAttachments([]);
    // };

    // Simple fallback for direct file upload
    // const handleSimpleAttachment = () => {
    //     const input = document.createElement('input');
    //     input.type = 'file';
    //     input.accept = '*/*';
    //     input.multiple = true;
    //
    //     input.onchange = (e) => {
    //         const files = (e.target as HTMLInputElement).files;
    //         if (files && files.length > 0) {
    //             const fileNames = Array.from(files).map(f => f.name).join(', ');
    //             showNotification(`Added ${files.length} file(s): ${fileNames}`, 'success');
    //             console.log('Selected files:', files);
    //         }
    //     };
    //
    //     input.click();
    // };

    /* ---- Actions ---- */
    const markAsRead = async (id: number) => {
        try {
            setMessages((prev) =>
                prev.map((m) => (m.id === id ? { ...m, isRead: true, unread: false } : m))
            );
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    const applySelectedTemplate = () => {
        const t = composeTemplateOptions.find((t) => t.id === selectedTemplateId);
        if (t) {
            setSubject(t.subject);
            setBody(t.body);
        }
    };

    /* ---- Reply to Message ---- */
    const handleReplyToMessage = (message: MessageThread) => {
        setReplyingTo(message);
        replyInputRef.current?.focus();
    };

    const cancelReply = () => {
        setReplyingTo(null);
    };

    /* ---- Archive Message ---- */
    const handleArchiveMessage = async (message: MessageThread) => {
        if (!confirm('Are you sure you want to archive this message?')) return;

        try {
            const res = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_URL}/api/communications/${message.id}/archive`,
                { method: 'PUT' }
            );

            if (res.ok) {
                await loadCommunications();
                showNotification('Message archived successfully', 'success');
            } else {
                throw new Error('Failed to archive message');
            }
        } catch (error) {
            console.error('Failed to archive message:', error);
            showNotification('Failed to archive message', 'error');
        }
    };

    /* ---- Archive Conversation ---- */
    const handleArchiveConversation = async (conversationId: string) => {
        try {
            // Mark conversation as archived in local state
            setArchivedConversations(prev => new Set(prev).add(conversationId));

            // If the currently selected conversation is being archived, clear it
            if (selectedConversation?.id === conversationId) {
                setSelectedConversation(null);
                setConversationView('list');
            }

            showNotification('Conversation archived', 'success');
        } catch (error) {
            console.error('Failed to archive conversation:', error);
            showNotification('Failed to archive conversation', 'error');
        }
    };

    /* ---- Unarchive Conversation ---- */
    const handleUnarchiveConversation = async (conversationId: string) => {
        try {
            // Remove conversation from archived set
            setArchivedConversations(prev => {
                const newSet = new Set(prev);
                newSet.delete(conversationId);
                return newSet;
            });

            showNotification('Conversation moved to inbox', 'success');
        } catch (error) {
            console.error('Failed to unarchive conversation:', error);
            showNotification('Failed to unarchive conversation', 'error');
        }
    };

    /* ---- Send Reply ---- */
    const sendConversationReply = async () => {
        if (!selectedConversation || (!replyBody.trim() && pendingAttachments.length === 0)) return;

        // Add conversation debugging
        console.log('Conversation context:', {
            id: selectedConversation.id,
            participant: selectedConversation.participant,
            patientId: selectedConversation.messages[0]?.conversationPatientId,
            providerId: selectedConversation.messages[0]?.conversationProviderId
        });

        setIsTyping(true);
        try {
            // Use the conversation context from the selected conversation
            // This ensures replies stay in the correct thread
            const conversationData = selectedConversation.messages[0]; // Get conversation context from first message
            
            let provider = providers[0];
            if (!provider) {
                provider = {
                    id: 1,
                    identification: { firstName: 'Admin', lastName: 'Provider' }
                };
            }

            const providerId = provider.id;
            const senderName = `${provider.identification?.firstName} ${provider.identification?.lastName}`.trim() || 'Healthcare Provider';

            // CRITICAL FIX: Use the actual conversation patient ID instead of name matching
            let patientId;
            let recipientName;

            if (conversationData?.conversationPatientId) {
                // Use the conversation context from backend (PREFERRED)
                patientId = conversationData.conversationPatientId;
                recipientName = conversationData.conversationPatientName || selectedConversation.participant;
            } else {
                // Fallback: try to find patient by exact name match
                const patient = patients.find(p => {
                    const fullName = `${p.firstName} ${p.lastName}`;
                    return fullName === selectedConversation.participant ||
                           selectedConversation.participant.includes(p.firstName) ||
                           selectedConversation.participant.includes(p.lastName);
                });
                
                if (patient) {
                    patientId = patient.id;
                    recipientName = `${patient.firstName} ${patient.lastName}`;
                } else {
                    // Last resort: extract patient ID from conversation ID if it follows pattern
                    const conversationIdMatch = selectedConversation.id.match(/conversation_.*_(\d+)$/);
                    if (conversationIdMatch) {
                        patientId = parseInt(conversationIdMatch[1]);
                        recipientName = selectedConversation.participant;
                    } else {
                        throw new Error(`Cannot determine patient ID for conversation: ${selectedConversation.participant}`);
                    }
                }
            }

            // Build reply payload
            let replyPayload = replyBody.trim();

            // Add attachment info to message if there are attachments
            if (pendingAttachments.length > 0) {
                const attachmentInfo = pendingAttachments.map(f => `📎 ${f.name} (${(f.size / 1024 / 1024).toFixed(2)} MB)`).join('\n');
                replyPayload = replyPayload ? `${replyPayload}\n\n${attachmentInfo}` : attachmentInfo;
            }

            // Add reply context
            let replyToId = null;
            if (replyingTo) {
                replyPayload = `Replying to: "${replyingTo.content.substring(0, 100)}"\n\n${replyPayload}`;
                replyToId = parseInt(replyingTo.id);
            }

            const payloadObj = {
                sender: `Provider/${providerId}`,
                recipients: [`Patient/${patientId}`],
                providerId: providerId,
                patientId: patientId, // CRITICAL: Use the correct patient ID
                subject: `Re: ${selectedConversation.messages[0]?.subject || 'Conversation'}`,
                payload: replyPayload,
                status: "SENT",
                category: "reply",
                sentDate: new Date().toISOString(),
                inResponseTo: replyToId || selectedConversation.messages[0]?.id,
                fromName: senderName,
                toNames: [recipientName],
                fromType: 'provider'
            };

            console.log('Sending reply to conversation:', {
                conversationId: selectedConversation.id,
                patientId: patientId,
                providerId: providerId,
                recipientName: recipientName
            });

            const res = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_URL}/api/communications`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payloadObj),
                }
            );

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`HTTP ${res.status}: ${errorText}`);
            }

            const json = await res.json();
            if (json.success && json.data) {
                // Handle attachments if any
                if (pendingAttachments.length > 0) {
                    try {
                        await uploadMultipleAttachments(json.data.id, pendingAttachments);
                        showNotification(`Reply sent with ${pendingAttachments.length} attachment(s)! ✨`, 'success');
                    } catch (error) {
                        console.error('Failed to upload attachments:', error);
                        showNotification(`Reply sent but some attachments failed to upload`, 'error');
                    }
                } else {
                    showNotification('Reply sent successfully! ✨', 'success');
                }

                await loadCommunications();
                setReplyBody("");
                setReplyingTo(null);
                setPendingAttachments([]);

                if (replyInputRef.current) {
                    replyInputRef.current.style.height = 'auto';
                }

                setTimeout(() => {
                    replyInputRef.current?.focus();
                }, 100);
            } else {
                throw new Error(json.message || 'Failed to send reply');
            }
        } catch (error) {
            console.error('Error sending reply:', error);
            showNotification(`Failed to send reply: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        } finally {
            setIsTyping(false);
        }
    };

    useEffect(() => {
        if (messagesEndRef.current && selectedConversation) {
            // Scroll when the selected conversation changes or new messages arrive,
            // but NOT on replyBody changes (typing) to avoid janky scrolling.
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [selectedConversation, messages.length]);

    // Get thread messages for selected conversation with WhatsApp-style formatting
    const getThreadMessages = useMemo(() => {
        if (!selectedConversation) return [];

        // Sort messages by time and convert to thread format
        return selectedConversation.messages
            .sort((a, b) => a.createdAt - b.createdAt)
            .map(msg => ({
                id: msg.id.toString(),
                sender: msg.sender,
                content: msg.body,
                timestamp: new Date(msg.createdAt).toISOString(),
                isUser: msg.type === 'provider', // Assuming current user is always provider
                status: msg.status || 'sent',
                replyTo: msg.replyTo
            }));
    }, [selectedConversation]);

    /* ---- Create Message ---- */
    const createMessage = async () => {
        if (!subject || !body || !selectedProviderId || !selectedPatientId) return;

        try {
            const provider = providers.find((p) => String(p.id) === selectedProviderId);
            const patient = patients.find((p) => String(p.id) === selectedPatientId);

            if (!provider || !patient) {
                showNotification('Please select both provider and patient', 'error');
                return;
            }

            const providerName = `${provider.identification?.firstName} ${provider.identification?.lastName}`.trim() || `Provider ${provider.id}`;
            const patientName = `${patient.firstName} ${patient.lastName}`.trim();

            const payloadObj = {
                sender: `Provider/${provider.id}`,
                recipients: [`Patient/${patient.id}`],
                providerId: provider.id,
                patientId: patient.id,
                subject: subject.trim(),
                payload: body.trim(),
                status: "SENT",
                category: "general",
                sentDate: new Date().toISOString(),
                fromName: providerName,
                toNames: [patientName],
                fromType: 'provider' as const
            };

            const res = await fetchWithAuth(
                `${process.env.NEXT_PUBLIC_API_URL}/api/communications`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payloadObj),
                }
            );

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`HTTP ${res.status}: ${errorText}`);
            }

            const json: ApiResponse<CommunicationDto> = await res.json();

            if (json.success && json.data) {
                // Handle attachments if any (for new messages)
                // Note: EHR compose modal doesn't have attachment state yet, but this is ready for future implementation
                
                await loadCommunications();
                showNotification('Message sent successfully! 📨', 'success');

                setIsCreating(false);
                setSubject("");
                setBody("");
                setSelectedPatientId("");
                setSelectedProviderId("");
                setSelectedTemplateId("");
            } else {
                throw new Error(json.message || 'Failed to send message');
            }
        } catch (error) {
            console.error('Failed to send message:', error);
            showNotification('Failed to send message', 'error');
        }
    };

    /* ---- Fiverr-style Conversation View ---- */
    const ConversationView = () => (
        <div className="flex-1 flex h-[calc(100vh-140px)] bg-white rounded-lg overflow-hidden border border-gray-200">
            {/* Left Sidebar - Conversations List */}
            <div className={`w-80 border-r bg-white flex-shrink-0 ${
                conversationView === 'thread' ? 'hidden md:flex' : 'flex'
            }`}>
                <div className="flex flex-col h-full w-full">
                    {/* Header with Dropdown Arrow */}
                    <div className="p-4 border-b">
                        <div className="relative">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg font-bold">
                                        {selectedFolder === 'archived' ? 'Archived' :
                                            selectedFolder === 'unread' ? 'Unread' :
                                                selectedFolder === 'starred' ? 'Starred' : 'All messages'}
                                    </h2>
                                    <button
                                        className="text-gray-500 hover:text-gray-700 transition-colors"
                                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    >
                                        <svg
                                            className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* Dropdown Menu */}
                            {isDropdownOpen && (
                                <div className="absolute top-10 left-0 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                                    <div className="p-2">
                                        {dropdownOptions.map((option) => (
                                            <button
                                                key={option.id}
                                                onClick={() => {
                                                    setSelectedFolder(option.id as 'all' | 'unread' | 'starred' | 'archived');
                                                    setIsDropdownOpen(false);
                                                    setSelectedConversation(null);
                                                    setConversationView('list');
                                                }}
                                                className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-gray-50 transition-colors ${
                                                    selectedFolder === option.id ? 'bg-blue-50 text-blue-600' : ''
                                                }`}
                                            >
                                                <span className="text-lg">{option.icon}</span>
                                                <span className="font-medium text-sm">{option.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Search */}
                            <div className="mt-3">
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Search conversations..."
                                        className="w-full pl-3 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                                        value={conversationSearch}
                                        onChange={(e) => setConversationSearch(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Messages List */}
                    <div className="flex-1 overflow-y-auto">
                        {conversationItems.length > 0 ? (
                            conversationItems
                                .filter(item =>
                                    item.participant.toLowerCase().includes(conversationSearch.toLowerCase()) ||
                                    item.preview?.toLowerCase().includes(conversationSearch.toLowerCase())
                                )
                                .map((item) => (
                                    <MessageListItem
                                        key={item.id}
                                        item={item}
                                        isActive={selectedConversation?.id === item.id}
                                        onSelect={(id) => {
                                            const conversation = conversationsByParticipant.find(conv => conv.id === id);
                                            if (conversation) {
                                                setSelectedConversation(conversation);
                                                setConversationView('thread');
                                                if (conversation.unread && !conversation.isArchived) {
                                                    // Mark all messages in conversation as read
                                                    conversation.messages.forEach(msg => {
                                                        if (msg.unread) {
                                                            markAsRead(msg.id);
                                                        }
                                                    });
                                                }
                                            }
                                        }}
                                    />
                                ))
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <p>
                                    {selectedFolder === 'archived' ? 'No archived conversations' : 'No conversations found'}
                                </p>
                                {selectedFolder !== 'archived' && (
                                    <button
                                        onClick={() => setIsCreating(true)}
                                        className="mt-2 px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
                                    >
                                        Start New Conversation
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Side - Chat Area */}
            <div className={`flex-1 flex flex-col ${
                conversationView === 'thread' ? 'flex' : 'hidden md:flex'
            }`}>
                {selectedConversation ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-4 border-b">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setConversationView('list')}
                                        className="md:hidden flex-shrink-0 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </button>
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                                        selectedConversation.avatar?.color || 'bg-green-500'
                                    }`}>
                                        {initials(selectedConversation.participant) || 'U'}
                                    </div>
                                    <div>
                                        <h2 className="font-semibold">{selectedConversation.participant}</h2>
                                        <p className="text-sm text-gray-500">
                                            {selectedConversation.participantType === 'provider' ? 'Healthcare Provider' : 'Patient'}
                                        </p>
                                    </div>
                                </div>

                                {/* Timestamp */}
                                <div className="text-sm text-gray-500">
                                    {formatRelativeTime(selectedConversation.lastMessageTime)}
                                </div>
                            </div>

                            {/* Action Buttons - Different actions for archived vs normal conversations */}
                            <div className="mt-3 pt-3 border-t">
                                <div className="flex items-center justify-end">
                                    <div className="flex items-center gap-4">
                                        {selectedConversation.isArchived ? (
                                            // Actions for archived conversations
                                            <>
                                                <button
                                                    onClick={() => handleUnarchiveConversation(selectedConversation.id)}
                                                    className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800 transition-colors"
                                                >
                                                    <span>↩️</span>
                                                    <span>Move to Inbox</span>
                                                </button>
                                            </>
                                        ) : (
                                            // Actions for normal conversations
                                            <>
                                                <button
                                                    onClick={() => {
                                                        // Mark conversation as unread
                                                        setSelectedConversation(prev =>
                                                            prev ? { ...prev, unread: true } : null
                                                        );
                                                        showNotification('Marked as unread', 'success');
                                                    }}
                                                    className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 transition-colors"
                                                >
                                                    <span>📨</span>
                                                    <span>Mark as unread</span>
                                                </button>

                                                <button
                                                    onClick={() => handleArchiveConversation(selectedConversation.id)}
                                                    className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 transition-colors"
                                                >
                                                    <span>📁</span>
                                                    <span>Archive</span>
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                            <div className="max-w-3xl mx-auto">
                                {/* Thread messages */}
                                {getThreadMessages.map((threadMsg) => (
                                    <MessageBubble
                                        key={threadMsg.id}
                                        message={threadMsg}
                                        isCurrentUser={threadMsg.isUser}
                                        onReply={handleReplyToMessage}
                                        onArchive={handleArchiveMessage}
                                        currentUserName={currentUserName}
                                        attachments={messageAttachments[parseInt(threadMsg.id)] || []}
                                        downloadAttachment={downloadAttachment}
                                    />
                                ))}

                                {/* Typing Indicator */}
                                {isTyping && (
                                    <div className="flex justify-start">
                                        <div className="bg-gray-100 rounded-2xl rounded-bl-none p-4">
                                            <div className="flex gap-1">
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div ref={messagesEndRef} />
                            </div>
                        </div>

                        {/* WhatsApp-style Reply Section - Show for all conversations */}
                        <ReplySection
                            replyBody={replyBody}
                            setReplyBody={setReplyBody}
                            onSendReply={sendConversationReply}
                            isTyping={isTyping}
                            replyInputRef={replyInputRef}
                            replyTo={replyingTo}
                            onCancelReply={cancelReply}
                            currentUserName={currentUserName}
                            showAttachmentMenu={showAttachmentMenu}
                            onFilesSelected={handleFilesSelected}
                            attachmentMenuPosition={attachmentMenuPosition}
                            onAttachmentSelect={handleAttachmentSelect}
                            onCloseAttachmentMenu={handleCloseAttachmentMenu}
                            pendingAttachments={pendingAttachments}
                            onRemoveAttachment={removeAttachment}
                        />
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-center p-8">
                        <div>
                            <div className="text-6xl mb-4 opacity-20">💬</div>
                            <h3 className="text-xl font-semibold mb-2">
                                {selectedFolder === 'archived' ? 'Select an archived conversation' : 'Select a conversation'}
                            </h3>
                            <p className="text-gray-500 mb-4">
                                {selectedFolder === 'archived'
                                    ? 'Choose an archived conversation to view or move to inbox'
                                    : 'Choose a message to start chatting'
                                }
                            </p>
                            {selectedFolder !== 'archived' && (
                                <button
                                    onClick={() => setIsCreating(true)}
                                    className="px-6 py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-colors"
                                >
                                    Start New Conversation
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Profile Sidebar */}
            {selectedConversation && (
                <ProfileSidebar selectedConversation={selectedConversation} />
            )}
        </div>
    );

    return (
        <AdminLayout>
            <div className="px-6 pt-6 pb-4 h-screen bg-white">
                {/* Notification */}
                {notification && (
                    <div className={`fixed top-6 right-6 px-6 py-3 rounded-lg text-white font-semibold z-50 ${
                        notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
                    }`}>
                        {notification.message}
                    </div>
                )}

                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        Messaging
                    </h1>
                </div>

                {/* Content Area */}
                <ConversationView />

                {/* Compose Modal */}
                {isCreating && (
                    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
                        <div className="w-full max-w-2xl bg-white rounded-2xl p-6 shadow-xl">
                            <h2 className="text-lg font-semibold mb-4">New Message</h2>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium">From (Provider)</label>
                                        <select
                                            value={selectedProviderId}
                                            onChange={(e) => setSelectedProviderId(e.target.value)}
                                            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                        >
                                            <option value="">-- Choose Provider --</option>
                                            {providers.map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    {p.identification?.firstName} {p.identification?.lastName}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Recipient (Patient)</label>
                                        <select
                                            value={selectedPatientId}
                                            onChange={(e) => setSelectedPatientId(e.target.value)}
                                            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                        >
                                            <option value="">-- Choose Patient --</option>
                                            {patients.map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    {p.firstName} {p.lastName}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <select
                                        value={selectedTemplateId === "" ? "" : String(selectedTemplateId)}
                                        onChange={(e) =>
                                            setSelectedTemplateId(
                                                e.target.value === "" ? "" : Number(e.target.value)
                                            )
                                        }
                                        className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                    >
                                        <option value="">Choose a template</option>
                                        {composeTemplateOptions.map((t) => (
                                            <option key={t.id} value={t.id}>
                                                {t.templateName}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={applySelectedTemplate}
                                        className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                        Use
                                    </button>
                                </div>
                                {/* ATTACHMENT BUTTON ADDED HERE */}
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => document.getElementById('compose-file-input')?.click()}
                                        className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        <span>📎</span>
                                        <span className="text-sm">Add Attachment</span>
                                    </button>
                                    <input
                                        type="file"
                                        id="compose-file-input"
                                        className="hidden"
                                        multiple
                                        onChange={(e) => {
                                            const files = e.target.files;
                                            if (files && files.length > 0) {
                                                showNotification(`Added ${files.length} attachment(s) to message`, 'success');
                                                console.log('Selected files for new message:', files);
                                            }
                                        }}
                                    />
                                </div>

                                <input
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    placeholder="Subject"
                                    className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                />

                                <textarea
                                    value={body}
                                    onChange={(e) => setBody(e.target.value)}
                                    rows={6}
                                    placeholder="Message..."
                                    className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                />

                                <div className="flex justify-between items-center gap-2">
                                    <button
                                        onClick={() => setIsCreating(false)}
                                        className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                        Discard
                                    </button>
                                    <button
                                        onClick={createMessage}
                                        disabled={!subject || !body || !selectedProviderId || !selectedPatientId}
                                        className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                                            (!subject || !body || !selectedProviderId || !selectedPatientId)
                                                ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                                                : "bg-green-500 text-white hover:bg-green-600"
                                        }`}
                                    >
                                        Send Message
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}