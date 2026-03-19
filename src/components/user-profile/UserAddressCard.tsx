"use client";

import { getEnv } from "@/utils/env";
import React, { useEffect, useState } from "react";
import { useModal } from "../../hooks/useModal";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import {fetchWithAuth} from "@/utils/fetchWithAuth";
import { toast } from "@/utils/toast";

type Address = {
    street?: string;
    street2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
};

export default function UserAddressCard() {
    const { isOpen, openModal, closeModal } = useModal();
    const [address, setAddress] = useState<Address>({
        street: "",
        street2: "",
        city: "",
        state: "",
        postalCode: "",
        country: "",
    });

    const [userEmail, setUserEmail] = useState<string>("");


    useEffect(() => {
        const stored = localStorage.getItem("user");
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setUserEmail(parsed.email || "");
                setAddress({
                    street: parsed.street || "",
                    street2: parsed.street2 || "",
                    city: parsed.city || "",
                    state: parsed.state || "",
                    postalCode: parsed.postalCode || "",
                    country: parsed.country || "",
                });
            } catch (err) {
                console.error("Failed to parse user from localStorage", err);
            }
        }
    }, []);

    const handleChange = (field: keyof Address, value: string) => {
        setAddress((prev) => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        if (!userEmail) {
            toast.error("Missing user email");
            return;
        }

        try {
            const res = await fetchWithAuth(
                `${getEnv("NEXT_PUBLIC_API_URL")}/api/users/user/address`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: userEmail,
                        ...address,
                    }),
                }
            );

            if (!res.ok) throw new Error("Update failed");

            const existing = localStorage.getItem("user");
            let mergedUser = { ...address };

            if (existing) {
                const parsed = JSON.parse(existing);
                mergedUser = { ...parsed, ...address };
            }

            localStorage.setItem("user", JSON.stringify(mergedUser));
            setAddress(mergedUser);
            closeModal();
            toast.success("Address updated successfully");
        } catch (err) {
            console.error("Failed to save address:", err);
            toast.error("Failed to update address");
        }
    };

    return (
        <>
            <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-6">
                            Address
                        </h4>

                        {!address.street && !address.street2 && !address.city && !address.state && !address.postalCode && !address.country ? (
                            <p className="text-sm text-gray-400 dark:text-gray-500 py-4">
                                No address data available. Click Edit to add your address.
                            </p>
                        ) : (
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
                            <div>
                                <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">Street</p>
                                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                                    {address.street || "-"}
                                </p>
                            </div>

                            <div>
                                <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">Street 2</p>
                                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                                    {address.street2 || "-"}
                                </p>
                            </div>

                            <div>
                                <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">City / State</p>
                                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                                    {address.city || "-"}, {address.state || "-"}
                                </p>
                            </div>

                            <div>
                                <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">Postal Code</p>
                                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                                    {address.postalCode || "-"}
                                </p>
                            </div>

                            <div>
                                <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">Country</p>
                                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                                    {address.country || "-"}
                                </p>
                            </div>
                        </div>
                        )}
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
            </div>

            <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
                <div className="relative w-full p-4 overflow-y-auto bg-white no-scrollbar rounded-3xl dark:bg-gray-900 lg:p-11">
                    <div className="px-2 pr-14">
                        <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
                            Edit Address
                        </h4>
                        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
                            Update your details to keep your profile up-to-date.
                        </p>
                    </div>
                    <form className="flex flex-col">
                        <div className="px-2 overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                                <div>
                                    <Label>Street</Label>
                                    <Input
                                        type="text"
                                        value={address.street}
                                        onChange={(e) => handleChange("street", e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label>Street 2</Label>
                                    <Input
                                        type="text"
                                        value={address.street2}
                                        onChange={(e) => handleChange("street2", e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label>City</Label>
                                    <Input
                                        type="text"
                                        value={address.city}
                                        onChange={(e) => handleChange("city", e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label>State</Label>
                                    <Input
                                        type="text"
                                        value={address.state}
                                        onChange={(e) => handleChange("state", e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label>Postal Code</Label>
                                    <Input
                                        type="text"
                                        value={address.postalCode}
                                        onChange={(e) => handleChange("postalCode", e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label>Country</Label>
                                    <Input
                                        type="text"
                                        value={address.country}
                                        onChange={(e) => handleChange("country", e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
                            <Button size="sm" variant="outline" onClick={closeModal}>
                                Close
                            </Button>
                            <Button size="sm" onClick={handleSave}>
                                Save Changes
                            </Button>
                        </div>
                    </form>
                </div>
            </Modal>
        </>
    );
}
