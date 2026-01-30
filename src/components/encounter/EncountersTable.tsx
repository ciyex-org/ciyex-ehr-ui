// "use client";



// import { useEffect, useMemo, useState, MouseEvent } from "react";
// import { useRouter } from "next/navigation";
// import { fetchWithOrg } from "@/utils/fetchWithOrg";

// type EncounterStatus = "SIGNED" | "INCOMPLETE" | "UNSIGNED";

// type Encounter = {
//   id: number;
//   patientId: number;
//   encounterDate?: string | number[] | number | null;
//   visitCategory?: string | null;
//   status?: EncounterStatus | null;
// };

// type ApiResponse<T> = { success: boolean; message?: string; data?: T };

// // ---- helpers ----
// function toDate(value: Encounter["encounterDate"]): Date | null {
//   if (value == null) return null;
//   if (Array.isArray(value)) {
//     const [y, m, d, hh = 0, mm = 0, ss = 0] = value;
//     return new Date(y, (m || 1) - 1, d || 1, hh, mm, ss);
//   }
//   if (typeof value === "number") {
//     const ms = value < 1e12 ? value * 1000 : value;
//     return new Date(ms);
//   }
//   if (typeof value === "string") {
//     const norm = value.includes("T") ? value : value.replace(" ", "T");
//     const d = new Date(norm);
//     return isNaN(d.getTime()) ? null : d;
//   }
//   return null;
// }

// const asRecord = (v: unknown): Record<string, unknown> =>
//   typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {};

// function normalizeData(data: unknown): Encounter[] {
//   if (!data) return [];
//   if (Array.isArray(data)) return data as Encounter[];
//   const rec = asRecord(data);
//   if (Array.isArray(rec.content)) return rec.content as Encounter[];
//   return [rec as unknown as Encounter];
// }

// export default function EncountersTable() { 
//   const router = useRouter();

//   const [rows, setRows] = useState<Encounter[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   type Tab = "ALL" | EncounterStatus;
//   const [tab, setTab] = useState<Tab>("ALL");
//   const [recentOnly, setRecentOnly] = useState(false);

//   const base = "/api/encounters";

//   // orgId header (your controllers expect "orgId")
//   const orgId =
//     (typeof window !== "undefined" &&
//       (localStorage.getItem("orgId") || sessionStorage.getItem("orgId"))) ||
//     undefined;

//   const withOrg = (h?: HeadersInit): HeadersInit => {
//     const baseHeaders: Record<string, string> = {};
//     if (orgId) baseHeaders["orgId"] = String(orgId);
//     return { ...baseHeaders, ...(h as Record<string, string>) };
//     // (If fetchWithOrg already injects orgId, you can drop this and just call fetchWithOrg)
//   };

//   async function load() {
//     setLoading(true);
//     setError(null);
//     try {
//       // We’ll fetch ALL then filter client-side (tabs + recent 10), to match your screenshot UX
//       const res = await fetchWithOrg(`${base}?page=0&size=1000&sort=id,desc`, {
//         method: "GET",
//         headers: withOrg(),
//       });
//       const body: ApiResponse<unknown> = await res.json();
//       if (!res.ok || body?.success === false) {
//         throw new Error((asRecord(body).message as string) || `HTTP ${res.status}`);
//       }
//       const list = normalizeData(body.data)
//         .map((e) => ({ ...e, status: (e.status ?? "UNSIGNED") as EncounterStatus }))
//         .sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
//       setRows(list);
//     } catch (err: unknown) {
//       setRows([]);
//       setError(err instanceof Error ? err.message : "Failed to load encounters.");
//     } finally {
//       setLoading(false);
//     }
//   }

//   useEffect(() => {
//     load();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   // Filters
//   const byTab = useMemo(() => {
//     if (tab === "ALL") return rows;
//     return rows.filter((r) => (r.status ?? "UNSIGNED") === tab);
//   }, [rows, tab]);

//   const filtered = useMemo(() => {
//     if (!recentOnly) return byTab;
//     return byTab.slice(0, 10);
//   }, [byTab, recentOnly]);

//   function StatusPill({ value }: { value?: EncounterStatus | null }) {
//     const v = (value ?? "UNSIGNED") as EncounterStatus;
//     const styles =
//       v === "SIGNED"
//         ? "bg-emerald-50 text-emerald-700 border-emerald-200"
//         : v === "INCOMPLETE"
//         ? "bg-amber-50 text-amber-700 border-amber-200"
//         : "bg-rose-50 text-rose-700 border-rose-200";
//     return (
//       <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs border ${styles}`}>{v}</span>
//     );
//   }

//   function stop(e: MouseEvent) {
//     e.stopPropagation();
//   }

//   return (
//     <div className="bg-white border rounded-xl shadow-sm">
//       <div className="flex items-center justify-between px-4 py-3 border-b">
//         <h3 className="text-sm font-semibold text-neutral-800">All Encounters</h3>
//       </div>

//       {/* Tabs + recent toggle exactly like patient page */}
//       <div className="px-3 pt-3 flex items-center gap-2 flex-wrap">
//         {(["ALL", "SIGNED", "INCOMPLETE", "UNSIGNED"] as Tab[]).map((t) => (
//           <button
//             key={t}
//             onClick={() => setTab(t)}
//             className={`px-3 py-1.5 rounded-md border text-xs transition-colors ${
//               tab === t
//                 ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
//                 : "bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50"
//             }`}
//           >
//             {t === "ALL" ? "All" : t}
//           </button>
//         ))}

//         <div className="ml-auto flex items-center gap-3 text-xs">
//           <label className="inline-flex items-center gap-2">
//             <input
//               type="checkbox"
//               className="accent-blue-600"
//               checked={recentOnly}
//               onChange={(e) => setRecentOnly(e.target.checked)}
//             />
//             Show only recent (10)
//           </label>
//           <span className="text-neutral-500">
//             Showing <strong>{filtered.length}</strong> of <strong>{byTab.length}</strong>
//           </span>
//         </div>
//       </div>

//       {error && (
//         <div className="px-4 py-2 text-sm text-red-700 bg-red-50 border-b border-red-200">{error}</div>
//       )}

//       <div className="overflow-x-auto">
//         <table className="w-full text-sm">
//           <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
//             <tr>
//               <th className="px-3 py-2 text-left">S.NO</th>
//               <th className="px-3 py-2 text-left">ID</th>
//               <th className="px-3 py-2 text-left">Date</th>
//               <th className="px-3 py-2 text-left">Visit Category</th>
//               <th className="px-3 py-2 text-left">Status</th>
//               <th className="px-3 py-2 text-left w-44">Action</th>
//             </tr>
//           </thead>

//           <tbody className="divide-y">
//             {loading && (
//               <tr>
//                 <td colSpan={6} className="px-3 py-6 text-center text-neutral-500">
//                   Loading…
//                 </td>
//               </tr>
//             )}

//             {!loading &&
//               filtered.map((row, idx) => {
//                 const d = toDate(row.encounterDate);
//                 return (
//                   <tr key={row.id} className="hover:bg-neutral-50">
//                     <td className="px-3 py-2">{idx + 1}</td>
//                     <td className="px-3 py-2">{row.id}</td>
//                     <td className="px-3 py-2">{d ? d.toLocaleDateString() : "-"}</td>
//                     <td className="px-3 py-2">{row.visitCategory || "-"}</td>
//                     <td className="px-3 py-2">
//                       <StatusPill value={row.status} />
//                     </td>
//                     <td className="px-3 py-2" onClick={stop}>
//                       <div className="flex items-center gap-2">
//                         {/* (+) takes user to the encounter detail page (needs patientId) */}
//                         <button
//                           onClick={() =>
//                             router.push(`/patients/${row.patientId}/encounters/${row.id}`)
//                           }
//                           title="Open encounter"
//                           className="h-7 w-7 grid place-items-center rounded-full border hover:bg-neutral-100"
//                         >
//                           +
//                         </button>
//                       </div>
//                     </td>
//                   </tr>
//                 );
//               })}

//             {!loading && filtered.length === 0 && (
//               <tr>
//                 <td colSpan={6} className="px-3 py-6 text-center text-neutral-500">
//                   No encounters.
//                 </td>
//               </tr>
//             )}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// }



// components/encounter/EncountersTable.tsx

"use client";

import { useEffect, useMemo, useState, MouseEvent } from "react";
import AdminLayout from '@/app/(admin)/layout'
import { useRouter } from "next/navigation";
import { fetchWithOrg } from "@/utils/fetchWithOrg";

type EncounterStatus = "SIGNED" | "INCOMPLETE" | "UNSIGNED";

type Encounter = {
  id: number;
  patientId: number;
  encounterDate?: string | number[] | number | null;
  visitCategory?: string | null;
  status?: EncounterStatus | null;
};

type ApiResponse<T> = { success: boolean; message?: string; data?: T };

function toDate(value: Encounter["encounterDate"]): Date | null {
  if (value == null) return null;
  if (Array.isArray(value)) {
    const [y, m, d, hh = 0, mm = 0, ss = 0] = value;
    return new Date(y, (m || 1) - 1, d || 1, hh, mm, ss);
  }
  if (typeof value === "number") {
    const ms = value < 1e12 ? value * 1000 : value;
    return new Date(ms);
  }
  if (typeof value === "string") {
    const norm = value.includes("T") ? value : value.replace(" ", "T");
    const d = new Date(norm);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

const asRecord = (v: unknown): Record<string, unknown> =>
  typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {};

function normalizeData(data: unknown): Encounter[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as Encounter[];
  const rec = asRecord(data);
  if (Array.isArray(rec.content)) return rec.content as Encounter[];
  return [rec as unknown as Encounter];
}

export default function EncountersTable() {
  const router = useRouter();

  const [rows, setRows] = useState<Encounter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  type Tab = "ALL" | EncounterStatus;
  const [tab, setTab] = useState<Tab>("ALL");
  const [recentOnly, setRecentOnly] = useState(false);

  const [page, setPage] = useState(0); // 0-based
  const [pageSize, setPageSize] = useState(10);

  const base = "/api/encounters";

  const orgId =
    (typeof window !== "undefined" &&
      (localStorage.getItem("orgId") || sessionStorage.getItem("orgId"))) ||
    undefined;

  const withOrg = (h?: HeadersInit): HeadersInit => {
    const baseHeaders: Record<string, string> = {};
    if (orgId) baseHeaders["orgId"] = String(orgId);
    return { ...baseHeaders, ...(h as Record<string, string>) };
  };

  // async function load() {
  //   setLoading(true);
  //   setError(null);
  //   try {
  //     const res = await fetchWithOrg(`${base}?page=0&size=1000&sort=id,desc`, {
  //       method: "GET",
  //       headers: withOrg(),
  //     });
  //     const body: ApiResponse<unknown> = await res.json();
  //     if (!res.ok || body?.success === false) {
  //       throw new Error((asRecord(body).message as string) || `HTTP ${res.status}`);
  //     }
  //     const list = normalizeData(body.data)
  //       .map((e) => ({ ...e, status: (e.status ?? "UNSIGNED") as EncounterStatus }))
  //       .sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
  //     setRows(list);
  //     setPage(0);
  //   } catch (err: unknown) {
  //     setRows([]);
  //     setError(err instanceof Error ? err.message : "Failed to load encounters.");
  //   } finally {
  //     setLoading(false);
  //   }
  // }


  

  // useEffect(() => {
  //   load();
  // }, []);


  async function load() {
  setLoading(true);
  setError(null);
  try {
    const res = await fetchWithOrg(`${base}?page=0&size=1000&sort=id,desc`, {
      method: "GET",
      headers: withOrg(),
    });
    const body: ApiResponse<unknown> = await res.json();
    if (!res.ok || body?.success === false) {
      throw new Error((asRecord(body).message as string) || `HTTP ${res.status}`);
    }
    const list = normalizeData(body.data)
      .map((e) => ({ ...e, status: (e.status ?? "UNSIGNED") as EncounterStatus }))
      .sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
    setRows(list);
    setPage(0);
  } catch (err: unknown) {
    setRows([]);
    setError(err instanceof Error ? err.message : "Failed to load encounters.");
  } finally {
    setLoading(false);
  }
}

// ⬇ disable only this warning for this effect
useEffect(() => {
  load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);


  const byTab = useMemo(() => {
    if (tab === "ALL") return rows;
    return rows.filter((r) => (r.status ?? "UNSIGNED") === tab);
  }, [rows, tab]);

  const filtered = useMemo(() => {
    if (!recentOnly) return byTab;
    return byTab.slice(0, 10);
  }, [byTab, recentOnly]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const clampedPage = Math.min(page, pageCount - 1);
  const start = clampedPage * pageSize;
  const end = start + pageSize;
  const paged = filtered.slice(start, end);

  function StatusPill({ value }: { value?: EncounterStatus | null }) {
    const v = (value ?? "UNSIGNED") as EncounterStatus;
    const styles =
      v === "SIGNED"
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : v === "INCOMPLETE"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-rose-50 text-rose-700 border-rose-200";
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs border ${styles}`}>{v}</span>
    );
  }

  function stop(e: MouseEvent) {
    e.stopPropagation();
  }

  return (
      <AdminLayout> 
    <div className="bg-white border rounded-2xl shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="text-sm font-semibold text-neutral-800">Encounters</h3>
      </div>

      <div className="px-3 pt-3 flex items-center gap-2 flex-wrap">
         {/* {(["ALL", "SIGNED", "INCOMPLETE", "UNSIGNED"] as Tab[]).map((t) => ( */}
        {(["ALL", "SIGNED", "UNSIGNED"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setPage(0);
            }}
            className={`px-3 py-1.5 rounded-md border text-xs transition-colors ${
              tab === t
                ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                : "bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50"
            }`}
          >
            {t === "ALL" ? "All" : t}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-3 text-xs">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              className="accent-blue-600"
              checked={recentOnly}
              onChange={(e) => {
                setRecentOnly(e.target.checked);
                setPage(0);
              }}
            />
            Show only recent (10)
          </label>
          <span className="text-neutral-500">
            Showing <strong>{paged.length}</strong> of <strong>{filtered.length}</strong>
          </span>
        </div>
      </div>

      {error && (
        <div className="px-4 py-2 text-sm text-red-700 bg-red-50 border-b border-red-200 relative z-[9999]">{error}</div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-3 py-2 text-left">S.NO</th>
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-left">Visit Category</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left w-44">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {loading && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-neutral-500">
                  Loading…
                </td>
              </tr>
            )}

            {!loading &&
              paged.map((row, idx) => {
                const d = toDate(row.encounterDate);
                const serial = start + idx + 1;
                return (
                  <tr key={row.id} className="hover:bg-neutral-50">
                    <td className="px-3 py-2">{serial}</td>
                    <td className="px-3 py-2">{row.id}</td>
                    <td className="px-3 py-2">{d ? d.toLocaleDateString() : "-"}</td>
                    <td className="px-3 py-2">{row.visitCategory || "-"}</td>
                    <td className="px-3 py-2">
                      <StatusPill value={row.status} />
                    </td>
                    <td className="px-3 py-2" onClick={stop}>
                      <div className="flex items-center gap-2">
                        <button
  onClick={() => router.push(`/patients/${row.patientId}/encounters/${row.id}`)}
  title="Open encounter"
  className="inline-flex items-center h-7 px-3 rounded-full border border-blue-600 text-blue-600 text-xs font-medium hover:bg-blue-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
>
  Preview
</button>

                      </div>
                    </td>
                  </tr>
                );
              })}

            {!loading && paged.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-neutral-500">
                  No encounters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-4 py-3 border-t text-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={clampedPage === 0}
            className={`px-3 py-1.5 rounded-md border ${
              clampedPage === 0
                ? "text-neutral-400 border-neutral-200 bg-neutral-50 cursor-not-allowed"
                : "text-neutral-700 border-neutral-300 hover:bg-neutral-50"
            }`}
          >
            Prev
          </button>
          <span className="px-2">Page {clampedPage + 1} of {pageCount}</span>
          <button
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={clampedPage >= pageCount - 1}
            className={`px-3 py-1.5 rounded-md border ${
              clampedPage >= pageCount - 1
                ? "text-neutral-400 border-neutral-200 bg-neutral-50 cursor-not-allowed"
                : "text-neutral-700 border-neutral-300 hover:bg-neutral-50"
            }`}
          >
            Next
          </button>
        </div>

        <div className="flex items-center gap-3 text-neutral-600">
          <span>
            Showing <strong>{paged.length}</strong> of <strong>{filtered.length}</strong>
          </span>
          <select
            className="border rounded-md px-2 py-1 text-sm"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(0);
            }}
          >
            {[10, 20, 50].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
    </AdminLayout>
  );
}
