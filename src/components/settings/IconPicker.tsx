"use client";

import React, { useState } from "react";
import {
    LayoutDashboard, Stethoscope, HeartPulse, ShieldAlert, Pill,
    Activity, FlaskConical, Syringe, Clock, UserRound, CalendarDays,
    FileText, MessageSquare, Users, Building2, Receipt, ShieldCheck,
    ArrowLeftRight, CreditCard, FileBarChart, CircleAlert,
    Eye, Ear, Bone, Brain, Smile, Scissors, Scan, Gauge, Microscope,
    Baby, Heart, Home, Droplets, Droplet, Wind, Dna, Radiation,
    Layers, Fingerprint, Bug, Zap, Moon, Leaf, Sparkles, Footprints,
    Hand, Apple, GitBranch, Siren, ClipboardList, ClipboardCheck,
    TrendingUp, Target, Dumbbell, Forward, FileCheck, RotateCcw,
    BarChart3, AlertTriangle, Shield, Cpu, Glasses, Bandage,
    MessageCircle, Search, Plane, Calendar, Send, XCircle, DollarSign,
    GraduationCap, Share2, User, TestTube,
    type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
    LayoutDashboard, Stethoscope, HeartPulse, ShieldAlert, Pill,
    Activity, FlaskConical, Syringe, Clock, UserRound, CalendarDays,
    FileText, MessageSquare, Users, Building2, Receipt, ShieldCheck,
    ArrowLeftRight, CreditCard, FileBarChart, CircleAlert,
    Eye, Ear, Bone, Brain, Smile, Scissors, Scan, Gauge, Microscope,
    Baby, Heart, Home, Droplets, Droplet, Wind, Dna, Radiation,
    Layers, Fingerprint, Bug, Zap, Moon, Leaf, Sparkles, Footprints,
    Hand, Apple, GitBranch, Siren, ClipboardList, ClipboardCheck,
    TrendingUp, Target, Dumbbell, Forward, FileCheck, RotateCcw,
    BarChart3, AlertTriangle, Shield, Cpu, Glasses, Bandage,
    MessageCircle, Search, Plane, Calendar, Send, XCircle, DollarSign,
    GraduationCap, Share2, User, TestTube,
};

interface IconPickerProps {
    value: string;
    onChange: (iconName: string) => void;
}

export default function IconPicker({ value, onChange }: IconPickerProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");

    const filteredIcons = Object.entries(ICONS).filter(([name]) =>
        name.toLowerCase().includes(search.toLowerCase())
    );

    const SelectedIcon = ICONS[value] || FileText;

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
            >
                <SelectedIcon className="w-4 h-4" />
                <span className="text-gray-700">{value || "Select icon"}</span>
            </button>

            {open && (
                <div className="absolute z-50 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg">
                    <div className="p-2 border-b border-gray-100">
                        <input
                            type="text"
                            placeholder="Search icons..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded"
                            autoFocus
                        />
                    </div>
                    <div className="max-h-48 overflow-y-auto p-2 grid grid-cols-8 gap-1">
                        {filteredIcons.map(([name, Icon]) => (
                            <button
                                key={name}
                                type="button"
                                onClick={() => {
                                    onChange(name);
                                    setOpen(false);
                                    setSearch("");
                                }}
                                className={`p-1.5 rounded hover:bg-blue-50 ${
                                    value === name ? "bg-blue-100 ring-1 ring-blue-400" : ""
                                }`}
                                title={name}
                            >
                                <Icon className="w-4 h-4 text-gray-600" />
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export { ICONS };
