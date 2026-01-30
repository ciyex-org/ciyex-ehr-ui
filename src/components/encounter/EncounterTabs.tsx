"use client";
import Link from "next/link";

export default function EncounterTabs({
                                          patientId,
                                          encounterId,
                                      }: {
    patientId: number;
    encounterId: number;
}) {
    const base = `/patients/${patientId}/encounters/${encounterId}`;

    const items: { label: string; href: string }[] = [
        { label: "Chief Complaint", href: `${base}/chief-complaint` },
        { label: "HPI",              href: `${base}/hpi` },
        { label: "ROS",              href: `${base}/ros` },
        { label: "PMH",              href: `${base}/pmh` },
        { label: "FH",               href: `${base}/family-history` },
        { label: "SH",               href: `${base}/social-history` },
        { label: "PE",               href: `${base}/physical-exam` },
        { label: "Assessment",       href: `${base}/assessment` },
        { label: "Plan",             href: `${base}/plan` },
        { label: "Procedures",       href: `${base}/procedures` },
        { label: "Billing/Coding",   href: `${base}/billing-coding` },
        { label: "Assigned Providers", href: `${base}/assigned-providers` },
        { label: "Fee",              href: `${base}/fee-schedule` },
        { label: "Signature",        href: `${base}/provider-signature` },
        { label: "Sign-off",         href: `${base}/signoff` },
        { label: "Finalized",        href: `${base}/datetime-finalized` },
        { label: "provider notes",        href: `${base}/provider-notes` },
        { label: "social",        href: `${base}/social-history` },


    ];

    return (
        <nav className="flex gap-2 overflow-x-auto border-b bg-white p-2 rounded-md">
            {items.map((it) => (
                <Link
                    key={it.href}
                    href={it.href}
                    className="px-3 py-1.5 text-sm rounded-md hover:bg-neutral-100 border"
                >
                    {it.label}
                </Link>
            ))}
        </nav>
    );
}

