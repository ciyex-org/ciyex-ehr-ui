"use client";

import { useState } from "react";
import { X, Hash, Lock } from "lucide-react";
import type { Channel } from "./types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: { name: string; type: Channel["type"]; topic?: string; memberIds?: string[] }) => void;
  availableUsers: { id: string; name: string }[];
}

export default function ChannelCreateModal({ isOpen, onClose, onCreate, availableUsers }: Props) {
  const [name, setName] = useState("");
  const [type, setType] = useState<Channel["type"]>("public");
  const [topic, setTopic] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const filteredUsers = availableUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(memberSearch.toLowerCase()) &&
      !selectedMembers.includes(u.id)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      await onCreate({
        name: name.trim().toLowerCase().replace(/\s+/g, "-"),
        type,
        topic: topic.trim() || undefined,
        memberIds: selectedMembers.length > 0 ? selectedMembers : undefined,
      });
      setName("");
      setType("public");
      setTopic("");
      setSelectedMembers([]);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMember = (id: string) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200/80 px-6 py-5 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create a channel</h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Channel type */}
          <div className="mb-5">
            <label className="mb-2.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Channel type
            </label>
            <div className="flex gap-2">
              {([
                { value: "public", icon: Hash, label: "Public" },
                { value: "private", icon: Lock, label: "Private" },
              ] as const).map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setType(value)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                    type === value
                      ? "border-brand-500 bg-brand-50 text-brand-700 shadow-sm dark:bg-brand-900/20 dark:text-brand-300"
                      : "border-gray-200/80 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Channel name */}
          <div className="mb-5">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Name
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                {type === "public" ? "#" : type === "private" ? "" : ""}
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.replace(/[^a-zA-Z0-9\s-]/g, ""))}
                placeholder="e.g. lab-results"
                className="w-full rounded-xl border border-gray-200/80 py-2.5 pl-7 pr-3 text-sm text-gray-900 outline-none transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                required
                autoFocus
              />
            </div>
            <p className="mt-1.5 text-xs text-gray-400">
              Lowercase letters, numbers, and hyphens only
            </p>
          </div>

          {/* Topic */}
          <div className="mb-5">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Topic <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="What is this channel about?"
              className="w-full rounded-xl border border-gray-200/80 py-2.5 px-3.5 text-sm text-gray-900 outline-none transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>

          {/* Members */}
          {type !== "public" && (
            <div className="mb-5">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Members
              </label>
              {selectedMembers.length > 0 && (
                <div className="mb-2.5 flex flex-wrap gap-1.5">
                  {selectedMembers.map((id) => {
                    const user = availableUsers.find((u) => u.id === id);
                    return (
                      <span
                        key={id}
                        className="flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-900/20 dark:text-brand-300"
                      >
                        {user?.name || id}
                        <button
                          type="button"
                          onClick={() => toggleMember(id)}
                          className="ml-0.5 text-brand-400 hover:text-brand-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search people..."
                className="w-full rounded-xl border border-gray-200/80 py-2.5 px-3.5 text-sm text-gray-900 outline-none transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
              {memberSearch && filteredUsers.length > 0 && (
                <div className="mt-1.5 max-h-32 overflow-y-auto rounded-xl border border-gray-200/80 bg-white dark:border-gray-600 dark:bg-gray-700">
                  {filteredUsers.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => { toggleMember(u.id); setMemberSearch(""); }}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-600"
                    >
                      {u.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200/80 px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-brand-600 hover:shadow-md disabled:opacity-50 active:scale-[0.98]"
            >
              {isSubmitting ? "Creating..." : "Create Channel"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
