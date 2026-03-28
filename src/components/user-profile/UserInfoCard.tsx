"use client";

import { getEnv } from "@/utils/env";
import React, { useEffect, useState } from "react";
import { useModal } from "../../hooks/useModal";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import {fetchWithAuth} from "@/utils/fetchWithAuth";
import DateInput from "@/components/ui/DateInput";

type User = {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    dateOfBirth?: string;
    // securityQuestion?: string;
    // securityAnswer?: string;
};

export default function UserInfoCard() {
    const { isOpen, openModal, closeModal } = useModal();
    const [user, setUser] = useState<User | null>(null);
    const [formData, setFormData] = useState<User | null>(null);



    useEffect(() => {
        const stored = localStorage.getItem("user");
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                const dobArray = parsed.dateOfBirth;
                let isoDate = "";

                if (Array.isArray(dobArray) && dobArray.length === 3) {
                    // Format from array [yyyy, mm, dd] to yyyy-MM-dd
                    isoDate = `${dobArray[0]}-${String(dobArray[1]).padStart(2, "0")}-${String(dobArray[2]).padStart(2, "0")}`;
                } else if (typeof parsed.dateOfBirth === "string") {
                    const parts = parsed.dateOfBirth.split("-");
                    // Convert from dd-MM-yyyy to yyyy-MM-dd if needed
                    if (parts.length === 3 && parts[0].length === 2) {
                        isoDate = `${parts[2]}-${parts[1]}-${parts[0]}`; // from dd-MM-yyyy → yyyy-MM-dd
                    } else {
                        isoDate = parsed.dateOfBirth; // assume already yyyy-MM-dd
                    }
                }

                const parsedUser: User = {
                    firstName: parsed.firstName || "",
                    lastName: parsed.LastName || parsed.lastName || "",
                    email: parsed.email || "",
                    phoneNumber: parsed.phoneNumber || parsed.phone || "",
                    dateOfBirth: isoDate,
                };

                setUser(parsedUser);
                setFormData({ ...parsedUser });
            } catch (err) {
                console.error("Failed to parse user", err);
            }
        }
    }, []);

    const [saveError, setSaveError] = useState("");
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaveError("");
        if (!formData || !user?.email) return;

        // Validation
        if (!formData.firstName.trim()) { setSaveError("First name is required"); return; }
        if (!formData.lastName.trim()) { setSaveError("Last name is required"); return; }
        if (!formData.email.trim()) { setSaveError("Email is required"); return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) { setSaveError("Please enter a valid email address"); return; }
        if (formData.phoneNumber && !/^\+?[\d\s\-().]{7,20}$/.test(formData.phoneNumber)) { setSaveError("Please enter a valid phone number"); return; }

        setSaving(true);
        try {
            const res = await fetchWithAuth(
                `${getEnv("NEXT_PUBLIC_API_URL")}/api/users/email/${user.email}/profile`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        firstName: formData.firstName.trim(),
                        lastName: formData.lastName.trim(),
                        email: formData.email.trim(),
                        phoneNumber: formData.phoneNumber,
                        dateOfBirth: formData.dateOfBirth,
                    }),
                }
            );

            if (!res.ok) throw new Error("Update failed");

            // Merge updated fields with existing user object
            const existing = localStorage.getItem("user");
            let mergedUser = { ...formData };

            if (existing) {
                const parsed = JSON.parse(existing);
                mergedUser = { ...parsed, ...formData };
            }

            // Save merged object to localStorage
            localStorage.setItem("user", JSON.stringify(mergedUser));

            setUser(formData);
            closeModal();
            // Force page reload to reflect changes in all components
            window.location.reload();
        } catch (err) {
            console.error("Failed to save:", err);
            setSaveError("Failed to save profile changes. Please try again.");
        } finally {
            setSaving(false);
        }
    };
    if (!user) return null;

    return (
        <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-6">
                        Personal Information
                    </h4>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
                        <div>
                            <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">First Name</p>
                            <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                                {user.firstName}
                            </p>
                        </div>
                        <div>
                            <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">Last Name</p>
                            <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                                {user.lastName}
                            </p>
                        </div>
                        <div>
                            <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">Email</p>
                            <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                                {user.email}
                            </p>
                        </div>
                        <div>
                            <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">Phone</p>
                            <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                                {user.phoneNumber}
                            </p>
                        </div>
                        <div>
                            <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">Date of Birth</p>
                            <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                                {user.dateOfBirth || "-"}
                            </p>
                        </div>
                        {/*<div>*/}
                        {/*    <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">Security Question</p>*/}
                        {/*    <p className="text-sm font-medium text-gray-800 dark:text-white/90">*/}
                        {/*        {user.securityQuestion || "-"}*/}
                        {/*    </p>*/}
                        {/*</div>*/}
                        {/*<div>*/}
                        {/*    <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">Security Answer</p>*/}
                        {/*    <p className="text-sm font-medium text-gray-800 dark:text-white/90">*/}
                        {/*        {user.securityAnswer || "-"}*/}
                        {/*    </p>*/}
                        {/*</div>*/}
                    </div>
                </div>

                <button
                    onClick={openModal}
                    className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 lg:inline-flex lg:w-auto"
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

            <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
                <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
                    <div className="px-2 pr-14">
                        <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
                            Edit Personal Information
                        </h4>
                        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
                            Update your details to keep your profile up-to-date.
                        </p>
                    </div>
                    <form className="flex flex-col" onSubmit={(e) => e.preventDefault()}>
                        {saveError && (
                            <div className="mx-2 mb-4 text-sm text-red-600 bg-red-50 dark:bg-red-900/30 rounded-lg px-3 py-2">
                                {saveError}
                            </div>
                        )}
                        <div className="px-2 pb-3">
                            <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                                <div>
                                    <Label>First Name</Label>
                                    <Input
                                        type="text"
                                        value={formData?.firstName || ""}
                                        onChange={(e) => setFormData((prev) => ({ ...prev!, firstName: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <Label>Last Name</Label>
                                    <Input
                                        type="text"
                                        value={formData?.lastName || ""}
                                        onChange={(e) => setFormData((prev) => ({ ...prev!, lastName: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <Label>Email Address</Label>
                                    <Input
                                        type="email"
                                        value={formData?.email || ""}
                                        onChange={(e) => setFormData((prev) => ({ ...prev!, email: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <Label>Phone</Label>
                                    <Input
                                        type="text"
                                        value={formData?.phoneNumber || ""}
                                        onChange={(e) => setFormData((prev) => ({ ...prev!, phoneNumber: e.target.value }))}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <Label>Date of Birth</Label>
                                    <DateInput
                                        value={formData?.dateOfBirth || ""}
                                        onChange={(e) => setFormData((prev) => ({ ...prev!, dateOfBirth: e.target.value }))}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
                            <Button size="sm" variant="outline" type="button" onClick={closeModal}>
                                Close
                            </Button>
                            <Button size="sm" type="button" onClick={handleSave} disabled={saving}>
                                {saving ? "Saving..." : "Save Changes"}
                            </Button>
                        </div>
                    </form>
                </div>
            </Modal>
        </div>
    );
}
