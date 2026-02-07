"use client";
import { getEnv } from "@/utils/env";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import Badge from "../ui/badge/Badge";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

export const SummaryCards = () => {
    const [patientCount, setPatientCount] = useState<number | null>(null);
    const [appointmentCount, setAppointmentCount] = useState<number | null>(null);


    useEffect(() => {
        const getPatientCount = async () => {
            try {
                const res = await fetchWithAuth(
                    `${getEnv("NEXT_PUBLIC_API_URL")}/api/patients/count`
                );

                if (!res.ok) {
                    throw new Error("Failed to fetch data");
                }

                const result = await res.json();
                console.log("📊 Patient count response:", result);

                if (result.success) {
                    setPatientCount(result.data);
                } else {
                    console.error("❌ Failed to fetch patient count:", result.message);
                }
            } catch (err) {
                console.error("❌ Error fetching patient count:", err);
            }
        };

        getPatientCount();
    }, []);

    // fetch appointment count
    useEffect(() => {
        const getAppointmentCount = async () => {
            try {
                const res = await fetchWithAuth(
                    `${getEnv("NEXT_PUBLIC_API_URL")}/api/appointments/count`
                );
                if (!res.ok) throw new Error("Failed to fetch appointment count");

                const result = await res.json();
                console.log("📊 Appointment count response:", result);

                if (result.success) setAppointmentCount(result.data);
                else console.error("❌ Appointment count error:", result.message);
            } catch (err) {
                console.error("❌ Error fetching appointment count:", err);
            }
        };
        getAppointmentCount();
    }, []);

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Patients */}
            <MetricCard
                icon={
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-6 h-6 text-blue-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5.121 17.804A9 9 0 1118.364 4.56M15 11a3 3 0 11-6 0 3 3 0 016 0zM12 14c-4.418 0-8 2.239-8 5v1h16v-1c0-2.761-3.582-5-8-5z"
                        />
                    </svg>
                }
                label="Patients"
                value={patientCount !== null ? String(patientCount) : "Loading..."}
                badgeColor="success"
                badgeText="11.01%"
                badgeIcon={<div className="w-3 h-3 bg-green-400 rounded-full" />}
                href="/patients"
            />

            {/* Appointments */}
            <MetricCard
                icon={
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-6 h-6 text-purple-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M8 7V3m8 4V3m-9 8h10m-11 6h12a2 2 0 002-2V7a2 2 0 00-2-2h-1V3h-2v2H9V3H7v2H6a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                    </svg>
                }
                label="Appointments"
                value={appointmentCount !== null ? String(appointmentCount) : "Loading..."}
                badgeColor="error"
                badgeText="9.05%"
                badgeIcon={<div className="w-3 h-3 bg-red-400 rounded-full" />}
                href="/appointments"
            />

            {/* Consultations */}
            <MetricCard
                icon={
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-6 h-6 text-green-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 20h9m-9 0a9 9 0 110-18 9 9 0 010 18zm0 0v-6m0 0h6m-6 0H6"
                        />
                    </svg>
                }
                label="Consultations"
                value="0"
                badgeColor="success"
                badgeText="2.3%"
                badgeIcon={<div className="w-3 h-3 bg-green-400 rounded-full" />}
                href="/consultations"
            />

            {/* Revenue */}
            <MetricCard
                icon={
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-6 h-6 text-yellow-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 8c-1.657 0-3 1.343-3 3h3m0-3c1.657 0 3 1.343 3 3h-3m0 0v4m0 4h.01"
                        />
                    </svg>
                }
                label="Revenue"
                value="0"
                badgeColor="success"
                badgeText="6.75%"
                badgeIcon={<div className="w-3 h-3 bg-green-400 rounded-full" />}
                href="/revenue"
            />
        </div>
    );
};

interface MetricCardProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    badgeColor: "success" | "error";
    badgeText: string;
    badgeIcon: React.ReactNode;
    href: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
                                                   icon,
                                                   label,
                                                   value,
                                                   badgeColor,
                                                   badgeText,
                                                   badgeIcon,
                                                   href,
                                               }) => {
    return (
        <Link href={href}>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 transition hover:shadow-md dark:border-gray-800 dark:bg-white/[0.03] md:p-6 cursor-pointer">
                <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
                    {icon}
                </div>

                <div className="flex items-end justify-between mt-5">
                    <div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            {label}
                        </span>
                        <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                            {value}
                        </h4>
                    </div>
                    <Badge color={badgeColor}>
                        {badgeIcon}
                        {badgeText}
                    </Badge>
                </div>
            </div>
        </Link>
    );
};
