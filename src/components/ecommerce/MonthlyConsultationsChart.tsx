"use client";

import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import { useState } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { MoreDotIcon } from "@/icons";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
    ssr: false,
});

export default function MonthlyConsultationsChart() {
    const [isOpen, setIsOpen] = useState(false);

    const toggleDropdown = () => setIsOpen(!isOpen);
    const closeDropdown = () => setIsOpen(false);

    const consultationsData = [150, 375, 210, 290, 180, 190, 275, 95, 205, 360, 275, 110];

    const options: ApexOptions = {
        chart: {
            fontFamily: "Outfit, sans-serif",
            type: "bar",
            height: 350,
            toolbar: { show: false },
        },
        colors: ["#465FFF"],
        plotOptions: {
            bar: {
                borderRadius: 6,
                columnWidth: "40%",
            },
        },
        dataLabels: { enabled: false },
        stroke: {
            show: true,
            width: 4,
            colors: ["transparent"],
        },
        xaxis: {
            categories: [
                "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
            ],
            title: { text: "Month" },
        },
        yaxis: {
            title: { text: "Consultations" },
        },
        fill: {
            opacity: 1,
        },
        tooltip: {
            y: {
                formatter: (val) => `${val} consultations`,
            },
        },
    };

    const series = [
        {
            name: "Consultations",
            data: consultationsData,
        },
    ];

    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                        Monthly Consultations
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Track number of consultations month over month
                    </p>
                </div>
                <div className="relative">
                    <button onClick={toggleDropdown}>
                        <MoreDotIcon className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300" />
                    </button>
                    <Dropdown isOpen={isOpen} onClose={closeDropdown}>
                        <DropdownItem onItemClick={closeDropdown}>View Details</DropdownItem>
                        <DropdownItem onItemClick={closeDropdown}>Export</DropdownItem>
                    </Dropdown>
                </div>
            </div>

            <ReactApexChart
                options={options}
                series={series}
                type="bar"
                height={350}
            />
        </div>
    );
}
