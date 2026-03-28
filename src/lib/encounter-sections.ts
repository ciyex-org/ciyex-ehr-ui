// lib/encounter-sections.ts
export type SectionKey =
    | 'cc' | 'hpi' | 'ros' | 'pmh' | 'fh' | 'sh' | 'pe'
    | 'assessment' | 'plan' | 'providerNote' | 'procedure'
    | 'billing' | 'signoff' | 'signature' | 'finalizedAt'
    | 'assignedProviders' | 'feeSchedule';

export type SectionDef = { id: SectionKey; name: string };

export const SECTIONS: SectionDef[] = [
    { id: 'cc', name: 'Chief Complaint (CC)' },
    { id: 'hpi', name: 'History of Present Illness (HPI)' },
    { id: 'ros', name: 'Review of Systems (ROS)' },
    { id: 'pmh', name: 'Past Medical History (PMH)' },
    { id: 'fh', name: 'Family History (FH)' },
    { id: 'sh', name: 'Social History (SH)' },
    { id: 'pe', name: 'Physical Examination' },
    { id: 'assessment', name: 'Assessment' },
    { id: 'plan', name: 'Plan' },
    { id: 'providerNote', name: 'Provider Note' },
    { id: 'procedure', name: 'Procedure / Orders' },
    { id: 'billing', name: 'Billing & Coding' },
    { id: 'signoff', name: 'Sign-off / Finalization' },
    { id: 'signature', name: 'Provider Signature' },
    { id: 'finalizedAt', name: 'Date/Time Finalized' },
    { id: 'assignedProviders', name: 'Assigned Provider(s)' },
    { id: 'feeSchedule', name: 'Fee Schedule' },
];

export const STORAGE_KEY = 'encounter-sections-enabled@v1';
export type EnabledMap = Partial<Record<SectionKey, boolean>>;

// Read the map; if missing, return empty (empty = all enabled by default)
export function readEnabledMap(): EnabledMap {
    if (typeof window === 'undefined') return {};
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as EnabledMap) : {};
    } catch {
        return {};
    }
}

export function writeEnabledMap(map: EnabledMap) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}