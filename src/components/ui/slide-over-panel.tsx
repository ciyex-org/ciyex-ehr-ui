"use client";
import * as React from "react";
import { useEffect, useCallback } from "react";
import { X } from "lucide-react";

interface SlideOverPanelProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Width class: e.g. "w-[50vw]", "w-[65vw]" */
  widthClass?: string;
  children: React.ReactNode;
}

export function SlideOverPanel({
  open,
  onClose,
  title,
  widthClass = "w-[50vw]",
  children,
}: SlideOverPanelProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9998]">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40"
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full ${widthClass} bg-white dark:bg-gray-900 shadow-xl
          flex flex-col animate-slideInFromRight`}
      >
        {/* Header */}
        {title && (
          <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200 truncate">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
