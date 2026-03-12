"use client";

import { getEnv } from "@/utils/env";
import React, { useEffect, useState } from "react";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button";
import { Modal } from "../ui/modal";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

export default function ResetPasswordCard() {
    const [isOpen, setIsOpen] = useState(false);
    const [email, setEmail] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    useEffect(() => {
        // Try multiple localStorage keys to find email
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                if (user.email) { setEmail(user.email); return; }
            } catch { /* ignore */ }
        }
        const userEmail = localStorage.getItem("userEmail");
        if (userEmail) setEmail(userEmail);
    }, []);

    const handleSave = async () => {
        setFeedback(null);

        if (!currentPassword || !newPassword || !confirmPassword) {
            setFeedback({ type: "error", text: "All fields are required." });
            return;
        }

        if (newPassword !== confirmPassword) {
            setFeedback({ type: "error", text: "New passwords do not match." });
            return;
        }

        if (newPassword.length < 8) {
            setFeedback({ type: "error", text: "New password must be at least 8 characters." });
            return;
        }

        setSaving(true);
        try {
            const response = await fetchWithAuth(
                `${getEnv("NEXT_PUBLIC_API_URL")}/api/users/change-password`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        email,
                        currentPassword,
                        newPassword,
                    }),
                }
            );

            let result: Record<string, unknown> = {};
            try {
                result = await response.json();
            } catch {
                // response may not be JSON
            }

            if (!response.ok) {
                const errorMsg =
                    (result.error as string) ||
                    (result.message as string) ||
                    `Failed to change password (HTTP ${response.status}).`;
                setFeedback({ type: "error", text: errorMsg });
                return;
            }

            // Optionally update local storage
            const stored = localStorage.getItem("user");
            if (stored) {
                try {
                    const user = JSON.parse(stored);
                    const updated = { ...user, email };
                    localStorage.setItem("user", JSON.stringify(updated));
                } catch { /* ignore */ }
            }

            setFeedback({ type: "success", text: "Password updated successfully." });
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            // Auto-close after a short delay
            setTimeout(() => {
                setIsOpen(false);
                setFeedback(null);
            }, 1500);
        } catch (error) {
            console.error("Error updating password:", error);
            setFeedback({ type: "error", text: "An unexpected error occurred. Please try again." });
        } finally {
            setSaving(false);
        }
    };

    const handleClose = () => {
        setIsOpen(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setFeedback(null);
    };

    return (
        <>
            {/* Reset Password Card */}
            <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
                <div className="flex items-center justify-between mb-5">
                    <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                        Reset Password
                    </h4>
                    <button
                        onClick={() => setIsOpen(true)}
                        className="flex items-center gap-1 text-sm font-medium text-primary border border-gray-300 rounded-full px-4 py-2 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-white/[0.03]"
                    >
                        <svg
                            className="fill-current"
                            width="18"
                            height="18"
                            viewBox="0 0 18 18"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                fillRule="evenodd"
                                clipRule="evenodd"
                                d="M15.0911 2.78206C14.2125 1.90338 12.7878 1.90338 11.9092 2.78206L4.57524 10.116C4.26682 10.4244 4.0547 10.8158 3.96468 11.2426L3.31231 14.3352C3.25997 14.5833 3.33653 14.841 3.51583 15.0203C3.69512 15.1996 3.95286 15.2761 4.20096 15.2238L7.29355 14.5714C7.72031 14.4814 8.11172 14.2693 8.42013 13.9609L15.7541 6.62695C16.6327 5.74827 16.6327 4.32365 15.7541 3.44497L15.0911 2.78206Z"
                                fill=""
                            />
                        </svg>
                        Edit
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-y-3 md:grid-cols-2 text-sm text-gray-600 dark:text-gray-400">
                    <div>
                        <p className="text-gray-500 mb-1">Email</p>
                        <p className="font-semibold text-gray-800 dark:text-white">{email}</p>
                    </div>
                    <div>
                        <p className="text-gray-500 mb-1">New Password</p>
                        <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-800 dark:text-white">
                                {showPassword ? "Enter new password" : "********"}
                            </p>
                            <button
                                onClick={() => setShowPassword((prev) => !prev)}
                                className="text-gray-500 hover:text-gray-700"
                                aria-label="Toggle Password Visibility"
                            >
                                {showPassword ? (
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="w-5 h-5"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-6-10-6s1.655-2.345 4.5-4.118m4.8-1.548A9.961 9.961 0 0112 5c5.523 0 10 6 10 6a19.868 19.868 0 01-1.048 1.321M15 12a3 3 0 01-3 3m0 0a3 3 0 01-3-3m3 3l6 6"
                                        />
                                    </svg>
                                ) : (
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="w-5 h-5"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                        />
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                        />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal */}
            <Modal isOpen={isOpen} onClose={handleClose} className="max-w-[700px] m-4">
                <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
                    <div className="px-2 pr-14">
                        <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
                            Edit Password
                        </h4>
                        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
                            Update your credentials to keep your profile secure.
                        </p>
                    </div>

                    {/* Feedback message */}
                    {feedback && (
                        <div className={`mx-2 mb-4 px-4 py-3 rounded-lg text-sm ${
                            feedback.type === "success"
                                ? "bg-green-50 text-green-800 border border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-700"
                                : "bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-700"
                        }`}>
                            {feedback.text}
                        </div>
                    )}

                    <form onSubmit={(e) => e.preventDefault()} className="flex flex-col">
                        <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2 px-2 pb-3">
                            <div>
                                <Label>Email</Label>
                                <Input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>

                            {/* Current Password */}
                            <div>
                                <Label>Current Password</Label>
                                <div className="relative">
                                    <Input
                                        type={showCurrent ? "text" : "password"}
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrent((prev) => !prev)}
                                        className="absolute inset-y-0 right-3 flex items-center text-gray-500"
                                    >
                                        {showCurrent ? (
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="w-5 h-5"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            >
                                                <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-5.05 0-9.29-3.16-10.71-7.5a10.92 10.92 0 0 1 4.18-5.61" />
                                                <path d="M1 1l22 22" />
                                            </svg>
                                        ) : (
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="w-5 h-5"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            >
                                                <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                                                <circle cx="12" cy="12" r="3" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* New Password */}
                            <div>
                                <Label>New Password</Label>
                                <div className="relative">
                                    <Input
                                        type={showNew ? "text" : "password"}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNew((prev) => !prev)}
                                        className="absolute inset-y-0 right-3 flex items-center text-gray-500"
                                    >
                                        {showNew ? (
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="w-5 h-5"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            >
                                                <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-5.05 0-9.29-3.16-10.71-7.5a10.92 10.92 0 0 1 4.18-5.61" />
                                                <path d="M1 1l22 22" />
                                            </svg>
                                        ) : (
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="w-5 h-5"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            >
                                                <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                                                <circle cx="12" cy="12" r="3" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Confirm New Password */}
                            <div>
                                <Label>Confirm New Password</Label>
                                <div className="relative">
                                    <Input
                                        type={showConfirm ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirm((prev) => !prev)}
                                        className="absolute inset-y-0 right-3 flex items-center text-gray-500"
                                    >
                                        {showConfirm ? (
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="w-5 h-5"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            >
                                                <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-5.05 0-9.29-3.16-10.71-7.5a10.92 10.92 0 0 1 4.18-5.61" />
                                                <path d="M1 1l22 22" />
                                            </svg>
                                        ) : (
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="w-5 h-5"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            >
                                                <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                                                <circle cx="12" cy="12" r="3" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                                <div className="col-span-2 flex justify-end">
                                    <a
                                        href="/reset-password"
                                        className="text-sm text-brand-500 hover:underline mt-2"
                                    >
                                        Forgot Password?
                                    </a>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
                            <Button size="sm" variant="outline" type="button" onClick={handleClose}>
                                Close
                            </Button>
                            <Button size="sm" type="button" onClick={handleSave} disabled={saving}>
                                {saving ? "Saving..." : "Save Changes"}
                            </Button>
                        </div>
                    </form>
                </div>
            </Modal>
        </>
    );
}
