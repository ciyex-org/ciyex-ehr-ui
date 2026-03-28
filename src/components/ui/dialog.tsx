"use client";
import * as React from "react";

interface DialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            <div
                className="fixed inset-0 bg-black/50"
                onClick={() => onOpenChange(false)}
            />
            {children}
        </div>
    );
}

export function DialogContent({
                                  className = "",
                                  children,
                                  showCloseButton = true,
                                  onClose,
                              }: {
    className?: string;
    children: React.ReactNode;
    showCloseButton?: boolean;
    onClose: () => void;
}) {
    return (
        <div
            className={`relative z-[9999] w-full max-w-lg rounded-lg border bg-white p-6 shadow-lg dark:bg-gray-800 ${className}`}
        >
            {children}
            {showCloseButton && (
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 opacity-70 hover:opacity-100 transition"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-5 h-5 text-gray-600 dark:text-gray-300"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}
        </div>
    );
}

export function DialogHeader({
                                 className = "",
                                 ...props
                             }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={`mb-4 ${className}`} {...props} />;
}

export function DialogFooter({
                                 className = "",
                                 ...props
                             }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={`mt-4 flex justify-end gap-2 ${className}`} {...props} />;
}

export function DialogTitle({
                                className = "",
                                ...props
                            }: React.HTMLAttributes<HTMLHeadingElement>) {
    return <h2 className={`text-lg font-semibold ${className}`} {...props} />;
}

export function DialogDescription({
                                      className = "",
                                      ...props
                                  }: React.HTMLAttributes<HTMLParagraphElement>) {
    return <p className={`text-sm text-gray-600 dark:text-gray-400 ${className}`} {...props} />;
}
