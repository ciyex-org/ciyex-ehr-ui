import React from "react";

/** Render simple markdown-like text: **bold**, bullet lists, line breaks. */
export function renderMarkdown(text: string) {
    return text.split("\n").map((line, i) => {
        const parts = line.split(/(\*\*[^*]+\*\*)/g).map((seg, j) => {
            if (seg.startsWith("**") && seg.endsWith("**")) {
                return (
                    <strong key={j} className="font-semibold">
                        {seg.slice(2, -2)}
                    </strong>
                );
            }
            return seg;
        });

        if (line.startsWith("- ")) {
            return (
                <li key={i} className="ml-4 list-disc">
                    {parts.map((p) => (typeof p === "string" ? p.replace(/^- /, "") : p))}
                </li>
            );
        }
        if (line.trim() === "") return <br key={i} />;
        return (
            <p key={i} className="leading-relaxed">
                {parts}
            </p>
        );
    });
}

export interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
}

/** Generate a mock AI response based on keywords in the query (global context). */
export function getMockResponse(query: string): string {
    const q = query.toLowerCase();

    if (q.includes("interaction") || q.includes("drug")) {
        return (
            "**Drug Interaction Check**\n\n" +
            "Based on common clinical databases:\n\n" +
            "- **Warfarin + NSAIDs**: Increased bleeding risk. Monitor INR closely.\n" +
            "- **ACE inhibitors + Potassium-sparing diuretics**: Risk of hyperkalemia.\n" +
            "- **SSRIs + Triptans**: Serotonin syndrome risk.\n\n" +
            "Please specify the exact medications for a detailed interaction analysis."
        );
    }

    if (q.includes("icd") || q.includes("diagnosis") || q.includes("code")) {
        return (
            "**ICD-10 Code Suggestions**\n\n" +
            "Here are some commonly referenced codes:\n\n" +
            "- **E11.9** - Type 2 diabetes mellitus without complications\n" +
            "- **I10** - Essential (primary) hypertension\n" +
            "- **J06.9** - Acute upper respiratory infection, unspecified\n" +
            "- **M54.5** - Low back pain\n\n" +
            "Provide a specific condition for more targeted suggestions."
        );
    }

    if (q.includes("guideline") || q.includes("protocol") || q.includes("standard")) {
        return (
            "**Clinical Guideline Summary**\n\n" +
            "Key screening recommendations (USPSTF):\n\n" +
            "- **Hypertension**: Screen adults 18+ annually\n" +
            "- **Diabetes (Type 2)**: Screen adults 35-70 with BMI >= 25\n" +
            "- **Colorectal Cancer**: Screen adults 45-75 (colonoscopy q10y or FIT annually)\n" +
            "- **Depression**: Screen all adults, including pregnant/postpartum\n\n" +
            "Specify a condition for detailed guideline information."
        );
    }

    if (q.includes("document") || q.includes("note") || q.includes("template")) {
        return (
            "**Documentation Assistance**\n\n" +
            "I can help with:\n\n" +
            "- **SOAP Note Templates**: Structured subjective, objective, assessment, plan\n" +
            "- **HPI Expansion**: Ensure all OLDCARTS elements are captured\n" +
            "- **MDM Leveling**: Support for E/M code selection based on complexity\n" +
            "- **Discharge Summaries**: Key components checklist\n\n" +
            "What type of documentation do you need help with?"
        );
    }

    if (q.includes("hello") || q.includes("hi") || q.includes("hey")) {
        return (
            "Hello! I'm **Dr. Ciya**, your AI clinical assistant. I can help with:\n\n" +
            "- Drug interaction checks\n" +
            "- ICD-10 code lookup\n" +
            "- Clinical guideline summaries\n" +
            "- Documentation assistance\n\n" +
            "What would you like to know?"
        );
    }

    return (
        "I can help with **drug interactions**, **ICD-10 codes**, " +
        "**clinical guidelines**, and **documentation**. " +
        "What would you like to know?"
    );
}

/** Generate a patient-context-aware mock response. */
export function getPatientMockResponse(query: string, patientId: string): string {
    const q = query.toLowerCase();

    if (q.includes("summarize") || q.includes("history") || q.includes("summary")) {
        return (
            `**Patient #${patientId} - Clinical Summary**\n\n` +
            "**Active Problems:**\n" +
            "- Essential hypertension (I10)\n" +
            "- Type 2 diabetes mellitus (E11.9)\n" +
            "- Chronic low back pain (M54.5)\n\n" +
            "**Current Medications:**\n" +
            "- Metformin 1000mg BID\n" +
            "- Lisinopril 20mg daily\n" +
            "- Ibuprofen 400mg PRN\n\n" +
            "**Recent Labs (last 90 days):**\n" +
            "- HbA1c: 7.2% (goal < 7.0%)\n" +
            "- eGFR: 72 mL/min\n" +
            "- BP trend: 138/88 avg\n\n" +
            "**Action Items:** Consider intensifying diabetes management; renal function declining."
        );
    }

    if (q.includes("interaction") || q.includes("drug")) {
        return (
            `**Drug Interaction Analysis - Patient #${patientId}**\n\n` +
            "Reviewing current medication list:\n\n" +
            "**Metformin + Ibuprofen (Moderate):**\n" +
            "- NSAIDs may reduce renal blood flow, increasing metformin accumulation risk\n" +
            "- Monitor renal function; consider acetaminophen as alternative\n\n" +
            "**Lisinopril + Ibuprofen (Moderate):**\n" +
            "- NSAIDs may blunt antihypertensive effect of ACE inhibitors\n" +
            "- Risk of acute kidney injury with concurrent use\n\n" +
            "**Recommendation:** Consider discontinuing ibuprofen given eGFR of 72 and current medications."
        );
    }

    if (q.includes("icd") || q.includes("diagnosis") || q.includes("suggest")) {
        return (
            `**ICD-10 Suggestions for Patient #${patientId}**\n\n` +
            "Based on the patient's current conditions:\n\n" +
            "- **E11.65** - Type 2 DM with hyperglycemia (if HbA1c remains elevated)\n" +
            "- **E11.22** - Type 2 DM with diabetic chronic kidney disease (eGFR 72)\n" +
            "- **N18.3** - CKD Stage 3a (eGFR 60-89 with kidney damage markers)\n" +
            "- **I10** - Essential hypertension (existing)\n" +
            "- **M54.5** - Low back pain, unspecified (existing)\n\n" +
            "Review for potential reclassification based on latest labs."
        );
    }

    if (q.includes("care plan") || q.includes("plan") || q.includes("care")) {
        return (
            `**Care Plan Suggestions - Patient #${patientId}**\n\n` +
            "**1. Diabetes Management:**\n" +
            "- Consider adding GLP-1 RA (e.g., semaglutide) for HbA1c > 7%\n" +
            "- Refer to diabetes educator for lifestyle counseling\n" +
            "- Recheck HbA1c in 3 months\n\n" +
            "**2. Renal Protection:**\n" +
            "- Discontinue ibuprofen; switch to acetaminophen PRN\n" +
            "- Consider SGLT2 inhibitor for renal protection\n" +
            "- Repeat BMP in 3 months\n\n" +
            "**3. Hypertension:**\n" +
            "- Target BP < 130/80 per AHA/ACC guidelines\n" +
            "- If uncontrolled, add amlodipine 5mg\n\n" +
            "**4. Preventive Care:**\n" +
            "- Due for annual diabetic eye exam\n" +
            "- Diabetic foot exam at next visit"
        );
    }

    if (q.includes("guideline") || q.includes("protocol")) {
        return (
            `**Applicable Clinical Guidelines for Patient #${patientId}**\n\n` +
            "**ADA Standards of Care (Diabetes):**\n" +
            "- HbA1c target < 7.0% for most adults\n" +
            "- Annual comprehensive metabolic panel\n" +
            "- Annual urine albumin-to-creatinine ratio\n\n" +
            "**AHA/ACC (Hypertension):**\n" +
            "- Target < 130/80 mmHg with diabetes comorbidity\n" +
            "- ACE inhibitor preferred (already on lisinopril)\n\n" +
            "**KDIGO (CKD):**\n" +
            "- Monitor eGFR every 6 months at Stage 3\n" +
            "- Avoid nephrotoxic agents (current concern: ibuprofen)"
        );
    }

    return (
        `I can help with clinical queries about **Patient #${patientId}**. Try:\n\n` +
        "- **Summarize History** - Clinical overview\n" +
        "- **Drug Interactions** - Medication safety check\n" +
        "- **Suggest ICD-10** - Diagnosis code recommendations\n" +
        "- **Care Plan Ideas** - Evidence-based treatment suggestions"
    );
}
