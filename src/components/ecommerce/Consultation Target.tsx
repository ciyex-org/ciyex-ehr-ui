"use client";
import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { MoreDotIcon } from "@/icons";
import { useState } from "react";
import { DropdownItem } from "../ui/dropdown/DropdownItem";

// Load chart dynamically
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
    ssr: false,
});

export default function ConsultationTarget() {
    // Mock data (you can replace with dynamic fetch)
    const completed = 12;
    const target = 20;
    const percentage = Math.round((completed / target) * 100);
    const remaining = target - completed;

    const [isOpen, setIsOpen] = useState(false);

    const series = [percentage];
    const options: ApexOptions = {
        colors: ["#465FFF"],
        chart: {
            fontFamily: "Outfit, sans-serif",
            type: "radialBar",
            height: 330,
            sparkline: { enabled: true },
        },
        plotOptions: {
            radialBar: {
                startAngle: -85,
                endAngle: 85,
                hollow: { size: "80%" },
                track: {
                    background: "#E4E7EC",
                    strokeWidth: "100%",
                    margin: 5,
                },
                dataLabels: {
                    name: { show: false },
                    value: {
                        fontSize: "36px",
                        fontWeight: "600",
                        offsetY: -40,
                        color: "#1D2939",
                        formatter: (val) => val + "%",
                    },
                },
            },
        },
        fill: { type: "solid", colors: ["#465FFF"] },
        stroke: { lineCap: "round" },
        labels: ["Progress"],
    };

    return (
        <div className="rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="px-5 pt-5 bg-white shadow-default rounded-2xl pb-11 dark:bg-gray-900 sm:px-6 sm:pt-6">
                <div className="flex justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                            Monthly Consultation Target
                        </h3>
                        <p className="mt-1 font-normal text-gray-500 text-theme-sm dark:text-gray-400">
                            Progress you’ve set for this month
                        </p>
                    </div>
                    <div className="relative inline-block">
                        <button onClick={() => setIsOpen(!isOpen)} className="dropdown-toggle">
                            <MoreDotIcon className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300" />
                        </button>
                        <Dropdown isOpen={isOpen} onClose={() => setIsOpen(false)} className="w-40 p-2">
                            <DropdownItem onItemClick={() => setIsOpen(false)}>View Details</DropdownItem>
                            <DropdownItem onItemClick={() => setIsOpen(false)}>Edit Target</DropdownItem>
                        </Dropdown>
                    </div>
                </div>

                <div className="relative mt-6">
                    <div className="max-h-[330px]">
                        <ReactApexChart
                            options={options}
                            series={series}
                            type="radialBar"
                            height={330}
                        />
                    </div>

                    <span className="absolute left-1/2 top-full -translate-x-1/2 -translate-y-[95%] rounded-full bg-success-50 px-3 py-1 text-xs font-medium text-success-600 dark:bg-success-500/15 dark:text-success-500">
            +{completed} this month
          </span>
                </div>

                <p className="mx-auto mt-10 w-full max-w-[380px] text-center text-sm text-gray-500 sm:text-base">
                    You’ve completed {completed} of {target} consultations this month. Keep going!
                </p>
            </div>

            {/* Bottom stats row */}
            <div className="flex items-center justify-center gap-5 px-6 py-3.5 sm:gap-8 sm:py-5">
                <Stat label="Target" value={target.toString()} />
                <Separator />
                <Stat label="Completed" value={completed.toString()} />
                <Separator />
                <Stat label="Remaining" value={remaining.toString()} />
            </div>
        </div>
    );
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="text-center">
            <p className="mb-1 text-sm text-gray-500">{label}</p>
            <p className="text-lg font-semibold text-gray-800 dark:text-white">{value}</p>
        </div>
    );
}

function Separator() {
    return <div className="w-px h-7 bg-gray-200 dark:bg-gray-800" />;
}
