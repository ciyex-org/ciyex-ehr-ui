"use client";

import React, { useEffect, useState } from "react";
import { getInitials } from "@/utils/getInitials";

type User = {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    profileImage?: string;
    dateOfBirth?: string;
    street?: string;
    street2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
};

export default function UserMetaCard() {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const stored = localStorage.getItem("user");
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                let isoDate = "";
                const dob = parsed.dateOfBirth;

                if (Array.isArray(dob) && dob.length === 3) {
                    isoDate = `${dob[0]}-${String(dob[1]).padStart(2, "0")}-${String(dob[2]).padStart(2, "0")}`;
                } else if (typeof dob === "string") {
                    const parts = dob.split("-");
                    if (parts.length === 3 && parts[0].length === 2) {
                        isoDate = `${parts[2]}-${parts[1]}-${parts[0]}`; // dd-MM-yyyy → yyyy-MM-dd
                    } else {
                        isoDate = dob; // assume already in yyyy-MM-dd
                    }
                }
                setUser({
                    firstName: parsed.firstName || "",
                    lastName: parsed.lastName || parsed.LastName || "",
                    email: parsed.email || "",
                    phoneNumber: parsed.phoneNumber || parsed.phone || "",
                    profileImage: parsed.profileImage || "/images/user/owner.jpg",
                    dateOfBirth: isoDate,
                    street: parsed.street || "",
                    street2: parsed.street2 || "",
                    city: parsed.city || "",
                    state: parsed.state || "",
                    postalCode: parsed.postalCode || "",
                    country: parsed.country || "",
                });
            } catch (err) {
                console.error("Failed to parse user", err);
            }
        }
    }, []);

    if (!user) return null;

    return (
        <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-col items-center w-full gap-6 xl:flex-row">
                    <div className="w-20 h-20 flex items-center justify-center rounded-full bg-blue-600 text-white text-xl font-bold">
                        {getInitials(user.firstName, user.lastName)}
                    </div>

                    <div className="order-3 xl:order-2">
                        <h4 className="mb-2 text-lg font-semibold text-center text-gray-800 dark:text-white/90 xl:text-left">
                            {user.firstName} {user.lastName}
                        </h4>
                        <div className="flex flex-col items-center gap-1 text-center xl:flex-row xl:gap-3 xl:text-left">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                DOB: {user.dateOfBirth || "-"}
                            </p>
                            <div className="hidden h-3.5 w-px bg-gray-300 dark:bg-gray-700 xl:block"></div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {user.city || "-"}, {user.state || "-"}, {user.country || "-"}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
