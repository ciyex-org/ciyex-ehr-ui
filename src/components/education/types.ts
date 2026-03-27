/* ------------------------------------------------------------------ */
/*  Education Module — Shared Types                                    */
/* ------------------------------------------------------------------ */
import { formatDisplayDate } from "@/utils/dateUtils";

export type MaterialCategory =
  | "diabetes"
  | "hypertension"
  | "post_surgical"
  | "prenatal"
  | "medication"
  | "nutrition"
  | "exercise"
  | "mental_health"
  | "preventive"
  | "pediatric"
  | "other";

export type ContentType =
  | "article"
  | "video"
  | "pdf"
  | "link"
  | "handout"
  | "infographic";

export type Audience = "patient" | "caregiver" | "both";

export type AssignmentStatus = "assigned" | "viewed" | "completed" | "dismissed";

export interface EducationMaterial {
  id?: number;
  title: string;
  category: MaterialCategory;
  contentType: ContentType;
  content: string;
  externalUrl: string;
  language: string;
  audience: Audience;
  tags: string; // JSON array string e.g. '["tag1","tag2"]'
  author: string;
  source: string;
  isActive: boolean;
  viewCount: number;
}

export interface PatientEducationAssignment {
  id?: number;
  patientId: string;
  patientName: string;
  materialId: number;
  materialTitle: string;
  assignedBy: string;
  assignedDate: string;
  dueDate: string;
  status: AssignmentStatus;
  viewedAt: string | null;
  completedAt: string | null;
  encounterId: string;
  notes: string;
  patientFeedback: string;
}

export interface AssignmentStats {
  assigned: number;
  viewed: number;
  completed: number;
  dismissed: number;
}

export const CATEGORY_OPTIONS: { value: MaterialCategory; label: string }[] = [
  { value: "diabetes", label: "Diabetes" },
  { value: "hypertension", label: "Hypertension" },
  { value: "post_surgical", label: "Post-Surgical" },
  { value: "prenatal", label: "Prenatal" },
  { value: "medication", label: "Medication" },
  { value: "nutrition", label: "Nutrition" },
  { value: "exercise", label: "Exercise" },
  { value: "mental_health", label: "Mental Health" },
  { value: "preventive", label: "Preventive" },
  { value: "pediatric", label: "Pediatric" },
  { value: "other", label: "Other" },
];

export const CONTENT_TYPE_OPTIONS: { value: ContentType; label: string }[] = [
  { value: "article", label: "Article" },
  { value: "video", label: "Video" },
  { value: "pdf", label: "PDF" },
  { value: "link", label: "Link" },
  { value: "handout", label: "Handout" },
  { value: "infographic", label: "Infographic" },
];

export const AUDIENCE_OPTIONS: { value: Audience; label: string }[] = [
  { value: "patient", label: "Patient" },
  { value: "caregiver", label: "Caregiver" },
  { value: "both", label: "Both" },
];

export const CATEGORY_COLORS: Record<MaterialCategory, string> = {
  diabetes: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  hypertension: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  post_surgical: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  prenatal: "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300",
  medication: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  nutrition: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  exercise: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
  mental_health: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  preventive: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300",
  pediatric: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  other: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
};

export const STATUS_COLORS: Record<AssignmentStatus, string> = {
  assigned: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  viewed: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  dismissed: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
};

export function parseTags(tags: string): string[] {
  if (!tags) return [];
  try {
    const parsed = JSON.parse(tags);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }
}

export function formatDate(d?: string | null): string {
  if (!d) return "--";
  return formatDisplayDate(d) || "--";
}

export function categoryLabel(cat: MaterialCategory): string {
  return CATEGORY_OPTIONS.find((o) => o.value === cat)?.label || cat;
}
