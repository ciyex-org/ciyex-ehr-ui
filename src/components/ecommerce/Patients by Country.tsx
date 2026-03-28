"use client";
import Image from "next/image";
import CountryMap from "./CountryMap";
import { useState } from "react";
import { MoreDotIcon } from "@/icons";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";

export default function PatientsByCountry() {
    const [isOpen, setIsOpen] = useState(false);

    function toggleDropdown() {
        setIsOpen(!isOpen);
    }

    function closeDropdown() {
        setIsOpen(false);
    }

    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
            <div className="flex justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                        Patients by Country
                    </h3>
                    <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
                        Total number of patients categorized by region
                    </p>
                </div>

                <div className="relative inline-block">
                    <button onClick={toggleDropdown} className="dropdown-toggle">
                        <MoreDotIcon className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300" />
                    </button>
                    <Dropdown isOpen={isOpen} onClose={closeDropdown} className="w-40 p-2">
                        <DropdownItem onItemClick={closeDropdown}>Export</DropdownItem>
                        <DropdownItem onItemClick={closeDropdown}>Edit</DropdownItem>
                    </Dropdown>
                </div>
            </div>

            {/* MAP */}
            <div className="px-4 py-6 my-6 overflow-hidden border border-gray-200 rounded-2xl bg-gray-50 dark:border-gray-800 dark:bg-gray-900 sm:px-6">
                <div className="mapOne h-[212px] w-full">
                    <CountryMap />
                </div>
            </div>

            {/* COUNTRY STATS */}
            <div className="space-y-5">
                <CountryStat
                    country="India"
                    flag="/images/country/india.svg"
                    patients={1850}
                    percent={65}
                />
                <CountryStat
                    country="USA"
                    flag="/images/country/usa.svg"
                    patients={970}
                    percent={35}
                />
            </div>
        </div>
    );
}

function CountryStat({
                         country,
                         flag,
                         patients,
                         percent,
                     }: {
    country: string;
    flag: string;
    patients: number;
    percent: number;
}) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full overflow-hidden">
                    <Image src={flag} width={32} height={32} alt={country} />
                </div>
                <div>
                    <p className="font-semibold text-gray-800 text-sm dark:text-white/90">
                        {country}
                    </p>
                    <span className="block text-xs text-gray-500 dark:text-gray-400">
            {patients.toLocaleString()} Patients
          </span>
                </div>
            </div>

            <div className="flex items-center gap-3 w-[140px]">
                <div className="relative w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-sm">
                    <div
                        className="absolute top-0 left-0 h-full bg-brand-500 rounded-sm"
                        style={{ width: `${percent}%` }}
                    />
                </div>
                <span className="font-medium text-sm text-gray-800 dark:text-white/90">
          {percent}%
        </span>
            </div>
        </div>
    );
}
