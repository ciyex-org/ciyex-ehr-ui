import {
    BookOpen, MessageSquare, ShieldCheck, FolderOpen, CreditCard,
    Video, Receipt, LayoutGrid, Bot, HeartPulse, Package,
    Pill, FlaskConical, Printer, Bell, Activity,
    type LucideIcon,
} from "lucide-react";

export const SLUG_ICONS: Record<string, LucideIcon> = {
    "ciyex-codes": BookOpen,
    "ciyex-comm": MessageSquare,
    "ciyex-credentialing": ShieldCheck,
    "ciyex-files": FolderOpen,
    "ciyex-patient-pay": CreditCard,
    "ciyex-telehealth": Video,
    "ciyex-rcm": Receipt,
    "ciyex-metadata": LayoutGrid,
    "ask-ciya": Bot,
    "demo-care-gaps": HeartPulse,
    "payment-gateway": CreditCard,
    "ciyex-eligibility": ShieldCheck,
    "ciyex-erx": Pill,
    "ciyex-lab": FlaskConical,
    "ciyex-fax": Printer,
    "ciyex-notifications": Bell,
    "ciyex-rpm": Activity,
    "vaultik": FolderOpen,
};

export const SLUG_COLORS: Record<string, string> = {
    "ciyex-codes": "from-violet-50 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 text-violet-600 dark:text-violet-400",
    "ciyex-comm": "from-sky-50 to-cyan-100 dark:from-sky-900/30 dark:to-cyan-900/30 text-sky-600 dark:text-sky-400",
    "ciyex-credentialing": "from-emerald-50 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 text-emerald-600 dark:text-emerald-400",
    "ciyex-files": "from-amber-50 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 text-amber-600 dark:text-amber-400",
    "ciyex-patient-pay": "from-green-50 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 text-green-600 dark:text-green-400",
    "ciyex-telehealth": "from-blue-50 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-600 dark:text-blue-400",
    "ciyex-rcm": "from-rose-50 to-pink-100 dark:from-rose-900/30 dark:to-pink-900/30 text-rose-600 dark:text-rose-400",
    "ciyex-metadata": "from-indigo-50 to-blue-100 dark:from-indigo-900/30 dark:to-blue-900/30 text-indigo-600 dark:text-indigo-400",
    "ask-ciya": "from-fuchsia-50 to-pink-100 dark:from-fuchsia-900/30 dark:to-pink-900/30 text-fuchsia-600 dark:text-fuchsia-400",
    "demo-care-gaps": "from-red-50 to-rose-100 dark:from-red-900/30 dark:to-rose-900/30 text-red-600 dark:text-red-400",
    "payment-gateway": "from-green-50 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 text-green-600 dark:text-green-400",
    "ciyex-eligibility": "from-blue-50 to-sky-100 dark:from-blue-900/30 dark:to-sky-900/30 text-blue-600 dark:text-blue-400",
    "ciyex-erx": "from-purple-50 to-violet-100 dark:from-purple-900/30 dark:to-violet-900/30 text-purple-600 dark:text-purple-400",
    "ciyex-lab": "from-teal-50 to-cyan-100 dark:from-teal-900/30 dark:to-cyan-900/30 text-teal-600 dark:text-teal-400",
    "ciyex-fax": "from-orange-50 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 text-orange-600 dark:text-orange-400",
    "ciyex-notifications": "from-indigo-50 to-blue-100 dark:from-indigo-900/30 dark:to-blue-900/30 text-indigo-600 dark:text-indigo-400",
    "ciyex-rpm": "from-rose-50 to-pink-100 dark:from-rose-900/30 dark:to-pink-900/30 text-rose-600 dark:text-rose-400",
    "vaultik": "from-amber-50 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 text-amber-600 dark:text-amber-400",
};

const DEFAULT_COLOR = "from-blue-50 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-600 dark:text-blue-400";

export function getAppIcon(slug: string): LucideIcon {
    return SLUG_ICONS[slug] || Package;
}

export function getAppColorClass(slug: string): string {
    return SLUG_COLORS[slug] || DEFAULT_COLOR;
}
