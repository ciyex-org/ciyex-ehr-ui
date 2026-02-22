"use client";

import React from "react";
import {
  Users,
  Calendar,
  Stethoscope,
  FlaskConical,
  Pill,
} from "lucide-react";

export type ReportType =
  | "demographics"
  | "appointments"
  | "encounters"
  | "labOrders"
  | "prescriptions";

interface ReportTypeOption {
  key: ReportType;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
}

const REPORT_TYPES: ReportTypeOption[] = [
  {
    key: "demographics",
    label: "Patient Demographics",
    description: "Gender, age groups, status breakdown",
    icon: <Users className="w-6 h-6" />,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-500",
  },
  {
    key: "appointments",
    label: "Appointments",
    description: "Counts by status and provider",
    icon: <Calendar className="w-6 h-6" />,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-500",
  },
  {
    key: "encounters",
    label: "Encounters",
    description: "Counts by status and type",
    icon: <Stethoscope className="w-6 h-6" />,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-500",
  },
  {
    key: "labOrders",
    label: "Lab Orders",
    description: "Counts by status and priority",
    icon: <FlaskConical className="w-6 h-6" />,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-500",
  },
  {
    key: "prescriptions",
    label: "Prescriptions",
    description: "Prescription statistics",
    icon: <Pill className="w-6 h-6" />,
    color: "text-rose-600",
    bgColor: "bg-rose-50",
    borderColor: "border-rose-500",
  },
];

interface ReportTypeSelectorProps {
  selected: ReportType;
  onChange: (type: ReportType) => void;
}

export default function ReportTypeSelector({
  selected,
  onChange,
}: ReportTypeSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {REPORT_TYPES.map((rt) => {
        const isActive = selected === rt.key;
        return (
          <button
            key={rt.key}
            onClick={() => onChange(rt.key)}
            className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all text-center
              ${
                isActive
                  ? `${rt.borderColor} ${rt.bgColor} shadow-sm`
                  : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
              }`}
          >
            <div
              className={`rounded-full p-2 ${isActive ? rt.bgColor : "bg-gray-100"} ${isActive ? rt.color : "text-gray-500"}`}
            >
              {rt.icon}
            </div>
            <span
              className={`text-sm font-semibold ${isActive ? rt.color : "text-gray-700"}`}
            >
              {rt.label}
            </span>
            <span className="text-xs text-gray-500 leading-tight">
              {rt.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
