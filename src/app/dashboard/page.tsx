import type { Metadata } from "next";
import { SummaryCards } from "../../components/ecommerce/Summary Cards";
import React from "react";
import ConsultationTarget from "../../components/ecommerce/Consultation Target";
import MonthlyConsultationsChart from "../../components/ecommerce/MonthlyConsultationsChart";
import StatisticsChart from "../../components/ecommerce/StatisticsChart";
import RecentPatientsAppointments from "../../components/ecommerce/RecentPatientsAppointments";
import PatientsByCountry from "../../components/ecommerce/Patients by Country";
import AdminLayout from "@/app/(admin)/layout";

export const metadata: Metadata = {
    title: "Dashboard", // ✅ This will become "Ciyex | Dashboard"
    description: "Dashboard overview of Ciyex system",
};

export default function Ecommerce() {
    return (
        <AdminLayout>
        <div className="grid grid-cols-12 gap-4 md:gap-6">
            <div className="col-span-12 space-y-6 xl:col-span-7">
                <SummaryCards />

                <MonthlyConsultationsChart />
            </div>

            <div className="col-span-12 xl:col-span-5">
                <ConsultationTarget />
            </div>

            <div className="col-span-12">
                <StatisticsChart />
            </div>

            <div className="col-span-12 xl:col-span-5">
                <PatientsByCountry />
            </div>

            <div className="col-span-12 xl:col-span-7">
                <RecentPatientsAppointments />
            </div>
        </div>
            </AdminLayout>
    );
}

