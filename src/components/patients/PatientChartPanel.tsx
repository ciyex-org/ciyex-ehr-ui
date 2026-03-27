"use client";

import React, { useEffect, useState } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { getEnv } from "@/utils/env";
import { formatDisplayDate } from "@/utils/dateUtils";
import ClinicalSidebar from "@/components/patients/ClinicalSidebar";
import GenericFhirTab from "@/components/patients/GenericFhirTab";
import AllergiesSummary from "@/components/patients/AllergiesSummary";
import MedicalProblemsSummary from "@/components/patients/MedicalProblemsSummary";
import InsuranceSummary from "@/components/patients/InsuranceSummary";
import PatientAccountCard from "@/components/patients/PatientAccountCard";
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
  MessageCircle, Search, Plane, Loader2,
  type LucideIcon,
} from "lucide-react";

const API_BASE = () => (getEnv("NEXT_PUBLIC_API_URL") || "").replace(/\/$/, "");

const ICON_MAP: Record<string, LucideIcon> = {
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
  MessageCircle, Search, Plane,
};

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender?: string;
  phoneNumber?: string;
  status?: string;
  mrn?: string;
  [key: string]: any;
}

interface PatientChartPanelProps {
  patientId: number;
}

const defaultTabCategories = [
  {
    label: "Overview",
    tabs: [{ key: "dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Clinical",
    tabs: [
      { key: "encounters", label: "Encounters", icon: Stethoscope },
      { key: "medicalproblems", label: "Problems", icon: HeartPulse },
      { key: "allergies", label: "Allergies", icon: ShieldAlert },
      { key: "medications", label: "Meds", icon: Pill },
      { key: "vitals", label: "Vitals", icon: Activity },
      { key: "labs", label: "Labs", icon: FlaskConical },
      { key: "immunizations", label: "Immunizations", icon: Syringe },
      { key: "history", label: "History", icon: Clock },
    ],
  },
  {
    label: "General",
    tabs: [
      { key: "demographics", label: "Demographics", icon: UserRound },
      { key: "appointments", label: "Appointments", icon: CalendarDays },
      { key: "documents", label: "Documents", icon: FileText },
      { key: "messages", label: "Messages", icon: MessageSquare },
      { key: "relationships", label: "Relationships", icon: Users },
      { key: "healthcareservices", label: "Services", icon: Building2 },
    ],
  },
  {
    label: "Financial",
    tabs: [
      { key: "billing", label: "Billing", icon: Receipt },
      { key: "insurance", label: "Insurance", icon: ShieldCheck },
      { key: "transactions", label: "Transactions", icon: ArrowLeftRight },
      { key: "payment", label: "Payment", icon: CreditCard },
    ],
  },
];

export default function PatientChartPanel({ patientId }: PatientChartPanelProps) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState("dashboard");
  const [highlightedTab, setHighlightedTab] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [tabCategories, setTabCategories] = useState(defaultTabCategories);

  // Fetch tab layout
  useEffect(() => {
    fetchWithAuth(`${API_BASE()}/api/tab-field-config/layout`)
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        if (data.tabConfig && Array.isArray(data.tabConfig)) {
          const mapped = data.tabConfig
            .map((cat: any) => ({
              label: cat.label,
              tabs: (cat.tabs || [])
                .filter((t: any) => t.visible !== false)
                .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
                .map((t: any) => ({
                  key: t.key,
                  label: t.label,
                  icon: ICON_MAP[t.icon] || FileText,
                })),
            }))
            .filter((cat: any) => cat.tabs.length > 0);
          if (mapped.length > 0) {
            // Deduplicate categories by label (case-insensitive), merging tabs from duplicates
            const deduped = mapped.reduce((acc: any[], cat: any) => {
                const existing = acc.find((c: any) => c.label.toLowerCase().trim() === cat.label.toLowerCase().trim());
                if (existing) {
                    const existingKeys = new Set(existing.tabs.map((t: any) => t.key));
                    existing.tabs.push(...cat.tabs.filter((t: any) => !existingKeys.has(t.key)));
                } else {
                    acc.push({ ...cat });
                }
                return acc;
            }, []);
            setTabCategories(deduped);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Fetch patient data
  useEffect(() => {
    if (!patientId) return;
    setLoading(true);
    setError(null);
    fetchWithAuth(`${API_BASE()}/api/patients/${patientId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        const data = text.startsWith("<")
          ? { success: false }
          : JSON.parse(text);
        if (data.success) {
          setPatient(data.data as Patient);
        } else {
          throw new Error(data.message || "Failed to fetch patient");
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [patientId]);

  const onTabClick = (key: string) => {
    setViewMode(key);
    setHighlightedTab(key);
  };

  const fmt = (d?: string) => formatDisplayDate(d) || "—";
  const age = (dob?: string) => {
    if (!dob) return "—";
    const birth = new Date(dob.includes("T") ? dob : dob + "T00:00:00");
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    let days = now.getDate() - birth.getDate();
    if (days < 0) { months--; days += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
    if (months < 0) { years--; months += 12; }
    const parts: string[] = [];
    if (years > 0) parts.push(`${years}Y`);
    if (months > 0) parts.push(`${months}M`);
    if (days > 0 || parts.length === 0) parts.push(`${days}D`);
    return parts.join(" ");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="p-6 text-center text-red-600">
        {error || "Patient not found"}
      </div>
    );
  }

  const renderContent = () => {
    if (viewMode === "dashboard") {
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <AllergiesSummary patientId={patientId} onNavigate={onTabClick} />
            <MedicalProblemsSummary patientId={patientId} onNavigate={onTabClick} />
            <InsuranceSummary patientId={patientId} onNavigate={onTabClick} />
            <PatientAccountCard patientId={patientId} />
          </div>
        </div>
      );
    }
    return <GenericFhirTab tabKey={viewMode} patientId={patientId} />;
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Patient header */}
      <div className="shrink-0 bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-2.5">
        {/* Patient photo */}
        {(patient.photoUrl || patient.photo || patient.profilePhoto || patient.imageUrl || patient.avatarUrl || patient.photo_url || patient.profile_photo) ? (
          <img
            src={patient.photoUrl || patient.photo || patient.profilePhoto || patient.imageUrl || patient.avatarUrl || patient.photo_url || patient.profile_photo}
            alt={`${patient.firstName} ${patient.lastName}`}
            className="w-8 h-8 rounded-full object-cover border border-gray-200 shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-semibold shrink-0">
            {(patient.firstName?.[0] || "").toUpperCase()}{(patient.lastName?.[0] || "").toUpperCase()}
          </div>
        )}
        <h3 className="text-sm font-semibold text-gray-900 truncate">
          {patient.firstName} {patient.lastName}
        </h3>
        {patient.mrn && <span className="text-xs text-gray-400">MRN: {patient.mrn}</span>}
        <span className="text-gray-300">|</span>
        <span className="text-xs text-gray-500">
          {fmt(patient.dateOfBirth)} ({age(patient.dateOfBirth)})
        </span>
        {patient.gender && (
          <>
            <span className="text-gray-300">|</span>
            <span className="text-xs text-gray-500">{patient.gender}</span>
          </>
        )}
        {patient.phoneNumber && (
          <>
            <span className="text-gray-300">|</span>
            <span className="text-xs text-gray-500">{patient.phoneNumber}</span>
          </>
        )}
        {patient.status && (
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
              patient.status === "Active"
                ? "bg-green-50 text-green-700"
                : patient.status === "Inactive"
                ? "bg-red-50 text-red-700"
                : "bg-yellow-50 text-yellow-700"
            }`}
          >
            {patient.status}
          </span>
        )}
      </div>

      {/* Body: sidebar + content */}
      <div className="flex flex-1 min-h-0">
        <ClinicalSidebar
          patientId={patientId}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          activeTab={highlightedTab}
          onNavigate={onTabClick}
          tabCategories={tabCategories}
        />
        <main className="flex-1 min-w-0 p-4 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
