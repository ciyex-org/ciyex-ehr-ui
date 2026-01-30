
// // src/components/encounter/providersignature/Providersignatureform.tsx
// "use client";
//
// import { useEffect, useRef, useState } from "react";
// import { fetchWithOrg } from "@/utils/fetchWithOrg";
// import type { ApiResponse, ProviderSignatureDto } from "@/utils/types";
//
// type Props = {
//     patientId: number;
//     encounterId: number;
//     value?: ProviderSignatureDto | null;
//     onSaved: (saved: ProviderSignatureDto) => void;
//     onAfterSubmit?: () => void;
// };
//
// const ROLES = ["MD", "DO", "NP", "PA", "RN", "Other"];
//
// // SHA-256 to hex (no TS BufferSource error)
// async function sha256Hex(input: string): Promise<string> {
//     const bytes = new TextEncoder().encode(input);
//     const digest = await crypto.subtle.digest("SHA-256", bytes.buffer as ArrayBuffer);
//     const arr = new Uint8Array(digest);
//     return Array.from(arr)
//         .map((b) => b.toString(16).padStart(2, "0"))
//         .join("");
// }
//
// // File → base64 (strip data URL prefix)
// function readFileAsBase64(file: File): Promise<{ base64: string; mime: string }> {
//     return new Promise((resolve, reject) => {
//         const r = new FileReader();
//         r.onerror = () => reject(new Error("Failed reading signature image"));
//         r.onload = () => {
//             const dataUrl = String(r.result || "");
//             const [, base64] = dataUrl.split(",", 2);
//             resolve({ base64: base64 || "", mime: file.type || "image/png" });
//         };
//         r.readAsDataURL(file);
//     });
// }
//
// export default function Providersignatureform({
//                                                   patientId,
//                                                   encounterId,
//                                                   value,
//                                                   onSaved,
//                                                   onAfterSubmit,
//                                               }: Props) {
//     const [signedBy, setSignedBy] = useState("");
//     const [signerRole, setSignerRole] = useState(ROLES[0]);
//     const [comments, setComments] = useState("");
//     const [saving, setSaving] = useState(false);
//     const [err, setErr] = useState<string | null>(null);
//     const fileRef = useRef<HTMLInputElement | null>(null);
//
//     const isLocked =
//         (value as any)?.status?.toLowerCase?.() === "signed" ||
//         (value as any)?.status?.toLowerCase?.() === "locked";
//
//     useEffect(() => {
//         setSignedBy((value as any)?.signedBy || "");
//         setSignerRole((value as any)?.signerRole || ROLES[0]);
//         setComments((value as any)?.comments || "");
//     }, [value]);
//
//     async function submit() {
//         if (isLocked) return;
//         setSaving(true);
//         setErr(null);
//
//         try {
//             // optional image
//             let signatureData = (value as any)?.signatureData || "";
//             let signatureFormat = (value as any)?.signatureFormat || "image/png";
//             if (fileRef.current?.files?.[0]) {
//                 const f = fileRef.current.files[0];
//                 const r = await readFileAsBase64(f);
//                 signatureData = r.base64;
//                 signatureFormat = r.mime;
//             }
//
//             const payload: ProviderSignatureDto & Record<string, unknown> = {
//                 id: (value as any)?.id,
//                 patientId,
//                 encounterId,
//                 signedAt: new Date().toISOString(),
//                 signedBy: signedBy.trim(),
//                 signerRole,
//                 signatureType: "ELECTRONIC",
//                 signatureFormat,
//                 signatureData,
//                 signatureHash: signatureData ? await sha256Hex(signatureData) : (value as any)?.signatureHash,
//                 status: "active",
//                 comments: comments.trim(),
//             };
//
//             // ✅ plural endpoints: POST create, PUT update
//             const url = (value as any)?.id
//                 ? `/api/provider-signatures/${patientId}/${encounterId}/${(value as any).id}`
//                 : `/api/provider-signatures/${patientId}/${encounterId}`;
//             const method = (value as any)?.id ? "PUT" : "POST";
//
//             const res = await fetchWithOrg(url, { method, body: JSON.stringify(payload) });
//             const json = (await res.json()) as ApiResponse<ProviderSignatureDto>;
//             if (!res.ok || !json?.success) throw new Error(json?.message || "Save failed");
//
//             onSaved(json.data!);
//             onAfterSubmit?.();
//
//             if (!(value as any)?.id) {
//                 setComments("");
//                 if (fileRef.current) fileRef.current.value = "";
//             }
//         } catch (e: any) {
//             setErr(e?.message ?? "Something went wrong");
//         } finally {
//             setSaving(false);
//         }
//     }
//
//     return (
//         <div className="rounded-2xl border p-4 shadow-sm bg-white space-y-3">
//             <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
//                 <div>
//                     <label className="block text-sm font-medium mb-1">Signed By</label>
//                     <input
//                         className="w-full rounded-lg border px-3 py-2"
//                         placeholder="dr.rajaclinic.test"
//                         value={signedBy}
//                         disabled={isLocked}
//                         onChange={(e) => setSignedBy(e.target.value)}
//                     />
//                 </div>
//                 <div>
//                     <label className="block text-sm font-medium mb-1">Role</label>
//                     <select
//                         className="w-full rounded-lg border px-3 py-2"
//                         value={signerRole}
//                         disabled={isLocked}
//                         onChange={(e) => setSignerRole(e.target.value)}
//                     >
//                         {ROLES.map((r) => (
//                             <option key={r} value={r}>
//                                 {r}
//                             </option>
//                         ))}
//                     </select>
//                 </div>
//                 <div>
//                     <label className="block text-sm font-medium mb-1">Signature Image</label>
//                     <input ref={fileRef} type="file" accept="image/*" disabled={isLocked} className="block w-full text-sm" />
//                 </div>
//             </div>
//
//             <div>
//                 <label className="block text-sm font-medium mb-1">Comments</label>
//                 <textarea
//                     className="w-full rounded-lg border px-3 py-2 min-h-20"
//                     value={comments}
//                     disabled={isLocked}
//                     onChange={(e) => setComments(e.target.value)}
//                     placeholder='e.g., "Signed SOAP note"'
//                 />
//             </div>
//
//             {err && <p className="text-sm text-red-600">{err}</p>}
//
//             <div className="flex gap-2">
//                 {!isLocked && (
//                     <button
//                         onClick={submit}
//                         disabled={saving}
//                         className="rounded-xl bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-60"
//                     >
//                         {saving ? "Saving..." : (value as any)?.id ? "Update Signature" : "Sign"}
//                     </button>
//                 )}
//                 {isLocked && (
//                     <span className="rounded-full bg-green-100 text-green-700 px-3 py-1 text-sm">Signed</span>
//                 )}
//             </div>
//         </div>
//     );
// }







"use client";

import { useEffect, useRef, useState } from "react";
import { fetchWithOrg } from "@/utils/fetchWithOrg";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import type { ApiResponse, ProviderSignatureDto } from "@/utils/types";
import { getEncounterData, setEncounterSection, removeEncounterSection } from "@/utils/encounterStorage";

type Props = {
    patientId: number;
    encounterId: number;
    value?: ProviderSignatureDto | null;
    onSaved: (saved: ProviderSignatureDto) => void;
    onAfterSubmit?: () => void;
};

type ProviderOption = {
    id: number;
    name: string;
    email?: string;
    npi?: string;
};

const ROLES = ["MD", "DO", "NP", "PA", "RN", "Other"];

// SHA-256 to hex
async function sha256Hex(input: string): Promise<string> {
    const bytes = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest("SHA-256", bytes.buffer as ArrayBuffer);
    const arr = new Uint8Array(digest);
    return Array.from(arr)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

// File → base64 (strip data URL prefix)
function readFileAsBase64(file: File): Promise<{ base64: string; mime: string }> {
    return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onerror = () => reject(new Error("Failed reading signature image"));
        r.onload = () => {
            const dataUrl = String(r.result || "");
            const [, base64] = dataUrl.split(",", 2);
            resolve({ base64: base64 || "", mime: file.type || "image/png" });
        };
        r.readAsDataURL(file);
    });
}

export default function Providersignatureform({
                                                  patientId,
                                                  encounterId,
                                                  value,
                                                  onSaved,
                                                  onAfterSubmit,
                                              }: Props) {
    const [providerId, setProviderId] = useState<number | "">("");
    const [signedBy, setSignedBy] = useState("");
    const [signerRole, setSignerRole] = useState(ROLES[0]);
    const [comments, setComments] = useState("");
    const [options, setOptions] = useState<ProviderOption[]>([]);
    const [loadingProviders, setLoadingProviders] = useState(false);
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement | null>(null);

    const isLocked =
        value?.status?.toLowerCase() === "signed" ||
        value?.status?.toLowerCase() === "locked";

    useEffect(() => {
        async function fetchProviders() {
            setLoadingProviders(true);
            try {
                const orgIds = JSON.parse(localStorage.getItem("orgIds") || "[]");
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
                const res = await fetchWithAuth(
                    `${apiUrl}/api/providers?orgIds=${orgIds.join(",")}`,
                    { method: "GET", headers: { Accept: "application/json" } }
                );
                const json = await res.json();
                if (res.ok && json.success) {
                    const list: unknown[] = json?.data || [];
                    const mapped: ProviderOption[] = list.map((item: any) => {
                        const firstName = item.identification?.firstName || "";
                        const lastName = item.identification?.lastName || "";
                        const prefix = item.identification?.prefix || "";
                        const fullName = `${prefix} ${firstName} ${lastName}`.trim();
                        return {
                            id: item.id,
                            name: fullName || "Provider",
                            email: item.contact?.email,
                            npi: item.npi,
                        };
                    }).filter((p) => p.id > 0);
                    setOptions(mapped);
                }
            } catch (e) {
                console.error('Fetch error:', e);
            } finally {
                setLoadingProviders(false);
            }
        }
        fetchProviders();
    }, []);

    useEffect(() => {
        const encounterData = getEncounterData(patientId, encounterId);
        if (encounterData.providerSignature && !value?.id) {
            const data = encounterData.providerSignature;
            setProviderId(data.providerId ? Number(data.providerId) : "");
            setSignedBy(data.signedBy || "");
            setSignerRole(data.signerRole || ROLES[0]);
            setComments(data.comments || "");
        } else {
            setProviderId(value?.providerId || "");
            setSignedBy(value?.signedBy || "");
            setSignerRole(value?.signerRole || ROLES[0]);
            setComments(value?.comments || "");
        }
    }, [value, patientId, encounterId]);

    useEffect(() => {
        if (providerId || signedBy || comments) {
            setEncounterSection(patientId, encounterId, "providerSignature", {
                providerId: String(providerId),
                signedBy,
                signerRole,
                comments
            });
        }
    }, [providerId, signedBy, signerRole, comments, patientId, encounterId]);

    function chooseProvider(p: ProviderOption) {
        setProviderId(p.id);
        setSignedBy(p.email || "");
    }

    async function submit() {
        if (isLocked) return;
        setSaving(true);
        setErr(null);

        try {
            // optional image
            let signatureData = value?.signatureData || "";
            let signatureFormat = value?.signatureFormat || "image/png";
            if (fileRef.current?.files?.[0]) {
                const f = fileRef.current.files[0];
                const r = await readFileAsBase64(f);
                signatureData = r.base64;
                signatureFormat = r.mime;
            }

            const payload: ProviderSignatureDto = {
                id: value?.id,
                patientId,
                encounterId,
                signedAt: new Date().toISOString(),
                signedBy: signedBy.trim(),
                signerRole,
                signatureType: "ELECTRONIC",
                signatureFormat,
                signatureData,
                signatureHash: signatureData
                    ? await sha256Hex(signatureData)
                    : value?.signatureHash,
                status: "active",
                comments: comments.trim(),
            };

            const url = value?.id
                ? `/api/provider-signatures/${patientId}/${encounterId}/${value.id}`
                : `/api/provider-signatures/${patientId}/${encounterId}`;
            const method = value?.id ? "PUT" : "POST";

            const res = await fetchWithOrg(url, { method, body: JSON.stringify(payload) });
            const json = (await res.json()) as ApiResponse<ProviderSignatureDto>;
            if (!res.ok || !json?.success) throw new Error(json?.message || "Save failed");

            onSaved(json.data!);
            removeEncounterSection(patientId, encounterId, "providerSignature");
            onAfterSubmit?.();

            if (!value?.id) {
                setComments("");
                if (fileRef.current) fileRef.current.value = "";
            }
        } catch (e: unknown) {
            setErr(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="rounded-2xl border p-4 shadow-sm bg-white space-y-3">
            <div>
                <label className="block text-sm font-medium mb-1">Provider<span className="text-red-600">*</span></label>
                <select
                    className="w-full rounded-lg border px-3 py-2 focus:ring"
                    value={providerId}
                    disabled={isLocked}
                    onChange={(e) => {
                        const selectedId = Number(e.target.value);
                        const selected = options.find(p => p.id === selectedId);
                        if (selected) chooseProvider(selected);
                    }}
                >
                    <option value="">Select Provider</option>
                    {options.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.name} {p.npi ? `(NPI: ${p.npi})` : ""}
                        </option>
                    ))}
                </select>
                {loadingProviders && <p className="text-xs text-gray-500 mt-1">Loading providers…</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                    <label className="block text-sm font-medium mb-1">Signed By <span className="text-red-600">*</span></label>
                    <input
                        className="w-full rounded-lg border px-3 py-2 bg-gray-50"
                        placeholder="Auto-filled from provider"
                        value={signedBy}
                        disabled={isLocked}
                        onChange={(e) => setSignedBy(e.target.value)}
                        required={!isLocked}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Role <span className="text-red-600">*</span></label>
                    <select
                        className="w-full rounded-lg border px-3 py-2"
                        value={signerRole}
                        disabled={isLocked}
                        onChange={(e) => setSignerRole(e.target.value)}
                        required={!isLocked}
                    >
                        {ROLES.map((r) => (
                            <option key={r} value={r}>
                                {r}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Signature Image <span className="text-red-600">*</span></label>
                    <div className="relative">
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/*,.pdf"
                            disabled={isLocked}
                            className="hidden"
                            id="signature-upload"
                        />
                        <label
                            htmlFor="signature-upload"
                            className={`flex items-center justify-center gap-2 w-full rounded-lg border-2 border-dashed px-4 py-3 text-sm cursor-pointer transition-colors ${
                                isLocked
                                    ? 'bg-gray-100 cursor-not-allowed opacity-60'
                                    : 'hover:border-indigo-500 hover:bg-indigo-50'
                            }`}
                        >
                            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-gray-600">Upload Image or PDF</span>
                        </label>
                    </div>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">Comments </label>
                <textarea
                    className="w-full rounded-lg border px-3 py-2 min-h-20"
                    value={comments}
                    disabled={isLocked}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder='e.g., "Signed SOAP note"'
                    required={!isLocked}
                />
            </div>

            {err && <p className="text-sm text-red-600">{err}</p>}

            <div className="flex gap-2">
                {!isLocked && (
                    <button
                        onClick={submit}
                        disabled={saving}
                        className="rounded-xl bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-60"
                    >
                        {saving ? "Saving..." : value?.id ? "Update Signature" : "Sign"}
                    </button>
                )}
                {isLocked && (
                    <span className="rounded-full bg-green-100 text-green-700 px-3 py-1 text-sm">
            Signed
          </span>
                )}
            </div>
        </div>
    );
}
