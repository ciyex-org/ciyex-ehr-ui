



// "use client";
// import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
// import AdminLayout from "@/app/(admin)/layout";
// import { fetchWithAuth } from "@/utils/fetchWithAuth";
// import { NotebookPen, Scissors, Activity } from "lucide-react";

// // drawer content
// import ProviderNoteList from "@/components/encounter/providernote/Providernotelist";
// import ProcedureList from "@/components/encounter/procedure/Procedurelist";
// import VitalsList from "@/components/encounter/Vitals/Vitalslist";

// export type AppointmentDTO = {
//   id: number;
//   visitType: string;
//   patientId: number; // still used for MRN
//   providerId: number;
//   appointmentStartDate: string;
//   appointmentEndDate: string;
//   appointmentStartTime: string;
//   appointmentEndTime: string;
//   priority: string;
//   locationId: number;
//   status: string;
//   reason: string;
//   orgId: number;
//   patientName?: string; // resolved from patient API
//   audit: {
//     createdDate: string;
//     lastModifiedDate: string;
//   };
// };

// interface Category { title: string; optionName: string; activity?: number; }
// interface Provider { id: number; name: string; }
// interface Location { id: number; name: string; }

// interface FullscreenElement extends HTMLElement {
//   webkitRequestFullscreen?: () => Promise<void>;
//   msRequestFullscreen?: () => Promise<void>;
// }

// type DrawerSection = "notes" | "procedures" | "vitals";

// const pad = (n: number) => n.toString().padStart(2, "0");

// function formatToMMDDYYYY(iso: string): string {
//   if (!iso) return "";
//   const d = new Date(iso + "T00:00:00");
//   if (isNaN(d.getTime())) return iso;
//   return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;
// }
// function parseMMDDYYYY(s: string): string | null {
//   if (!s) return null;
//   const parts = s.split("/");
//   if (parts.length !== 3) return null;
//   const [mmStr, ddStr, yyyyStr] = parts;
//   const mm = parseInt(mmStr, 10);
//   const dd = parseInt(ddStr, 10);
//   const yyyy = parseInt(yyyyStr, 10);
//   if (Number.isNaN(mm) || Number.isNaN(dd) || Number.isNaN(yyyy)) return null;
//   const d = new Date(Date.UTC(yyyy, mm - 1, dd));
//   if (d.getUTCFullYear() !== yyyy || d.getUTCMonth() !== mm - 1 || d.getUTCDate() !== dd) return null;
//   return `${yyyy}-${pad(mm)}-${pad(dd)}`;
// }
// function timeFromMMDDYYYY(s: string, fallback: number): number {
//   const iso = parseMMDDYYYY(s);
//   return iso ? new Date(iso).getTime() : fallback;
// }

// const fetchPatientName = async (id: number): Promise<string> => {
//   try {
//     const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/patients/${id}`);
//     if (!res.ok) return String(id);
//     const data = await res.json();
//     return `${data.data.firstName} ${data.data.lastName}`;
//   } catch {
//     return String(id);
//   }
// };

// /** Right-side drawer (frame only) */
// function Drawer({
//   open,
//   onClose,
//   title,
//   children,
// }: {
//   open: boolean;
//   onClose: () => void;
//   title: React.ReactNode;
//   children: React.ReactNode;
// }) {
//   if (!open) return null;
//   return (
//     <div className="fixed inset-0 z-50 flex">
//       <div className="flex-1 bg-black/40" onClick={onClose} />
//       <div className="w-[800px] max-w-full bg-white dark:bg-slate-900 shadow-xl p-6 overflow-y-auto animate-slideInRight">
//         <button className="mb-4 text-sm text-gray-500 hover:text-gray-700" onClick={onClose}>
//           ✕ Close
//         </button>
//         <h2 className="text-lg font-semibold mb-4">{title}</h2>
//         {children}
//       </div>
//     </div>
//   );
// }

// export default function AppointmentPage() {
//   const [category, setCategory] = useState<string>("All Visit Categories");
//   const [categories, setCategories] = useState<string[]>([]);
//   const [provider, setProvider] = useState<string>("All Providers");
//   const [providers, setProviders] = useState<Provider[]>([]);
//   const [location, setLocation] = useState<string>("All Locations");
//   const [locations, setLocations] = useState<Location[]>([]);
//   const [from, setFrom] = useState<string>("");
//   const [to, setTo] = useState<string>("");
//   const [patientName, setPatientName] = useState("");
//   const [rows, setRows] = useState<AppointmentDTO[]>([]);

//   const [loadingProviders, setLoadingProviders] = useState(true);
//   const [loadingCategories, setLoadingCategories] = useState(true);
//   const [loadingLocations, setLoadingLocations] = useState(true);
//   const [loadingAppointments, setLoadingAppointments] = useState(false);

//   const [currentPage, setCurrentPage] = useState(1);
//   const [pageSize, setPageSize] = useState(10);
//   const [totalPages, setTotalPages] = useState(1);
//   const [totalItems, setTotalItems] = useState(0);
//   const tableRef = useRef<HTMLDivElement>(null);

//   // NEW — status filter & inline status edit
//   const [statusFilter, setStatusFilter] = useState<string>("All");
//   const [editingStatusId, setEditingStatusId] = useState<number | null>(null);

//   // drawer state
//   const [drawerOpen, setDrawerOpen] = useState(false);
//   const [selectedRow, setSelectedRow] = useState<AppointmentDTO | null>(null);
//   const [activeSection, setActiveSection] = useState<DrawerSection>("notes");

//   // Visit Categories (active only)
//   useEffect(() => {
//     const fetchCategories = async () => {
//       try {
//         const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/list-options/list/Visit Type`);
//         if (!res.ok) throw new Error("Failed to fetch categories");
//         const data = await res.json();
//         const active = (data as Category[]).filter((c) => c.activity === 1).map((c) => c.title || c.optionName);
//         setCategories(active);
//       } catch { setCategories([]); }
//       finally { setLoadingCategories(false); }
//     };
//     fetchCategories();
//   }, []);

//   // Providers
//   useEffect(() => {
//     const fetchProviders = async () => {
//       try {
//         const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/providers`);
//         if (!res.ok) throw new Error("Failed to fetch providers");
//         const data = await res.json();
//         const list: Provider[] = data.data.map((p: { id: number; identification: { firstName: string; lastName: string } }) => ({
//           id: p.id,
//           name: `${p.identification.firstName} ${p.identification.lastName}`,
//         }));
//         setProviders(list);
//       } catch { setProviders([]); }
//       finally { setLoadingProviders(false); }
//     };
//     fetchProviders();
//   }, []);

//   // Locations
//   useEffect(() => {
//     const fetchLocations = async () => {
//       try {
//         const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/locations`);
//         if (!res.ok) throw new Error("Failed to fetch locations");
//         const data = await res.json();
//         const list: Location[] = data.data.map((l: { id: number; name: string }) => ({ id: l.id, name: l.name }));
//         setLocations(list);
//       } catch { setLocations([]); }
//       finally { setLoadingLocations(false); }
//     };
//     fetchLocations();
//   }, []);

//   // Default date range: last month -> today
//   useEffect(() => {
//     const today = new Date();
//     const lastMonth = new Date(today);
//     lastMonth.setMonth(today.getMonth() - 1);
//     const fmt = (d: Date) => `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;
//     setFrom(fmt(lastMonth));
//     setTo(fmt(today));
//   }, []);

//   // ---- Appointments loader ----
//   const loadAppointments = useCallback(async () => {
//     setLoadingAppointments(true);
//     try {
//       // include status filter when not "All"
//       const params = new URLSearchParams({
//         page: String(currentPage - 1),
//         size: String(pageSize),
//       });
//       if (statusFilter && statusFilter !== "All") params.set("status", statusFilter);

//       const res = await fetchWithAuth(
//         `${process.env.NEXT_PUBLIC_API_URL}/api/appointments?${params.toString()}`
//       );
//       if (!res.ok) throw new Error("Failed to fetch appointments");
//       const data = await res.json();

//       // Support both: { data: { content, totalPages, totalElements } }
//       // and legacy:  { data: { content }, totalPages in data.data }
//       const payload = data?.data ?? {};
//       const content: AppointmentDTO[] = payload.content ?? payload?.data?.content ?? [];
//       const totalPagesVal = payload.totalPages ?? data?.data?.totalPages ?? 1;
//       const totalElementsVal = payload.totalElements ?? data?.data?.totalElements ?? content.length;

//       if (content && Array.isArray(content)) {
//         const enriched = await Promise.all(
//           content.map(async (appt: AppointmentDTO) => {
//             const name = await fetchPatientName(appt.patientId);
//             return { ...appt, patientName: name };
//           })
//         );
//         setRows(enriched);
//         setTotalPages(totalPagesVal);
//         setTotalItems(totalElementsVal);
//       } else {
//         setRows([]);
//         setTotalPages(1);
//         setTotalItems(0);
//       }
//     } catch (err) {
//       console.error(err);
//       setRows([]);
//     } finally {
//       setLoadingAppointments(false);
//     }
//   }, [currentPage, pageSize, statusFilter]);

//   // Initial & pagination fetch
//   useEffect(() => { loadAppointments(); }, [loadAppointments]);

//   const onRefresh = () => { loadAppointments(); };
//   const onPrint = () => window.print();
//   const onKiosk = () => {
//     const el = tableRef.current as FullscreenElement | null;
//     if (!el) return;
//     if (el.requestFullscreen) el.requestFullscreen();
//     else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
//     else if (el.msRequestFullscreen) el.msRequestFullscreen();
//   };

//   // NEW — update status
//   const updateStatus = useCallback(
//     async (row: AppointmentDTO, newStatus: "Checked" | "Unchecked") => {
//       try {
//         const res = await fetchWithAuth(
//           `${process.env.NEXT_PUBLIC_API_URL}/api/appointments/${row.id}/status`,
//           {
//             method: "PUT",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({ status: newStatus }),
//           }
//         );
//         const json = await res.json();
//         if (!res.ok || !json?.success) {
//           throw new Error(json?.message || "Failed to update status");
//         }
//         setEditingStatusId(null);
//         await loadAppointments(); // auto-refresh the row list
//       } catch (e) {
//         console.error(e);
//         alert("Failed to update status");
//       }
//     },
//     [loadAppointments]
//   );

//   const filtered = useMemo(() => {
//     if (!Array.isArray(rows)) return [];
//     const fromTime = from ? timeFromMMDDYYYY(from, -Infinity) : -Infinity;
//     const toTime = to ? timeFromMMDDYYYY(to, Infinity) : Infinity;
//     return rows.filter((r) => {
//       const d = new Date(r.appointmentStartDate).getTime();
//       const matchDate = d >= fromTime && d <= toTime;
//       const matchProvider = provider === "All Providers" ? true : r.providerId === Number(provider);
//       const matchCategory = category === "All Visit Categories" ? true : r.visitType === category;
//       const matchLocation = location === "All Locations" ? true : r.locationId === Number(location);
//       const matchPatient = patientName ? r.patientName?.toLowerCase().includes(patientName.trim().toLowerCase()) : true;
//       return matchDate && matchProvider && matchCategory && matchLocation && matchPatient;
//     });
//   }, [rows, from, to, provider, category, location, patientName]);

//   const total = filtered.length;
//   const handlePrevious = () => currentPage > 1 && setCurrentPage(currentPage - 1);
//   const handleNext = () => currentPage < totalPages && setCurrentPage(currentPage + 1);

//   const getStatusClass = (status: string) => {
//     switch (status) {
//       case "Confirmed": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
//       case "Scheduled": return "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
//       case "Pending": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
//       case "Cancelled": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
//       case "Checked": return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200";
//       case "Unchecked": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
//       default: return "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200";
//     }
//   };

//   const openDrawer = (row: AppointmentDTO, section: DrawerSection) => {
//     setSelectedRow(row);
//     setActiveSection(section);
//     setDrawerOpen(true);
//   };

//   const encounterUrl = (row: AppointmentDTO) =>
//     `/patients/${row.patientId}/encounters/${row.id}`;

//   const sectionLabel = (s: DrawerSection) =>
//     s === "notes" ? "Provider Notes" : s === "procedures" ? "Procedures" : "Vitals";

//   return (
//     <AdminLayout>
//       <div className="container mx-auto p-6 overflow-x-hidden text-gray-800 dark:text-gray-200">
//         {/* Heading */}
//         <div className="flex items-center justify-between mb-4">
//           <div className="text-sm">
//             <span className="italic font-semibold">Total appointments:</span>{" "}
//             {loadingAppointments ? "…" : total}
//           </div>
//         </div>

//         {/* Filters */}
//         <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
//           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 w-full">
//             <select value={category} onChange={(e) => setCategory(e.target.value)}
//               className="rounded-md border px-3 py-2 bg-white dark:bg-gray-800 dark:border-gray-600">
//               <option value="All Visit Categories">All Visit Categories</option>
//               {loadingCategories ? <option disabled>Loading...</option> :
//                 categories.map((c, idx) => (<option key={idx} value={c}>{c}</option>))}
//             </select>

//             <select value={provider} onChange={(e) => setProvider(e.target.value)}
//               className="rounded-md border px-3 py-2 bg-white dark:bg-gray-800 dark:border-gray-600">
//               <option value="All Providers">All Providers</option>
//               {loadingProviders ? <option disabled>Loading...</option> :
//                 providers.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
//             </select>

//             <select value={location} onChange={(e) => setLocation(e.target.value)}
//               className="rounded-md border px-3 py-2 bg-white dark:bg-gray-800 dark:border-gray-600">
//               <option value="All Locations">All Locations</option>
//               {loadingLocations ? <option disabled>Loading...</option> :
//                 locations.map((l) => (<option key={l.id} value={l.id}>{l.name}</option>))}
//             </select>

//             <input type="text" placeholder="MM/DD/YYYY" value={from} onChange={(e) => setFrom(e.target.value)}
//               className="rounded-md border px-3 py-2 bg-white dark:bg-gray-800 dark:border-gray-600" />

//             <input type="text" placeholder="MM/DD/YYYY" value={to} onChange={(e) => setTo(e.target.value)}
//               className="rounded-md border px-3 py-2 bg-white dark:bg-gray-800 dark:border-gray-600" />

//             {/* NEW — Status filter */}
//             <select
//               value={statusFilter}
//               onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
//               className="rounded-md border px-3 py-2 bg-white dark:bg-gray-800 dark:border-gray-600"
//             >
//               <option value="All">All Statuses</option>
//               <option value="Scheduled">Scheduled</option>
//               <option value="Checked">Checked</option>
//               <option value="Unchecked">Unchecked</option>
//             </select>

//             <input type="text" placeholder="Patient Name" value={patientName} onChange={(e) => setPatientName(e.target.value)}
//               className="rounded-md border px-3 py-2 bg-white dark:bg-gray-800 dark:border-gray-600" />
//           </div>

//           <div className="flex gap-2">
//             <button onClick={onRefresh} disabled={loadingAppointments}
//               className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60" title="Refresh table data">
//               Refresh
//             </button>
//             <button onClick={onPrint} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
//               Print
//             </button>
//             <button onClick={onKiosk} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
//               Kiosk
//             </button>
//           </div>
//         </div>

//         {/* Table */}
//         <div ref={tableRef} className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-md">
//           <table className="w-full table-auto">
//             <colgroup>
//               <col className="w-20" />
//               <col className="w-48" />
//               <col className="w-48" />
//               <col />
//               <col className="w-32" />
//               <col className="w-32" />
//               <col className="w-28" />
//               <col className="w-28" />
//               <col className="w-28" />
//               <col className="w-[260px]" />
//             </colgroup>
//             <thead className="bg-gray-100 dark:bg-gray-800">
//               <tr>
//                 <th className="py-3 px-6 text-left text-sm font-medium">MRN</th>
//                 <th className="py-3 px-6 text-left text-sm font-medium">Patient Name</th>
//                 <th className="py-3 px-6 text-left text-sm font-medium">Provider Name</th>
//                 <th className="py-3 px-6 text-left text-sm font-medium">Location</th>
//                 <th className="py-3 px-6 text-left text-sm font-medium">Visit Type</th>
//                 <th className="py-3 px-6 text-left text-sm font-medium">Start Date</th>
//                 <th className="py-3 px-6 text-left text-sm font-medium">Start Time</th>
//                 <th className="py-3 px-6 text-left text-sm font-medium">Priority</th>
//                 <th className="py-3 px-6 text-left text-sm font-medium">Status</th>
//                 <th className="py-3 px-6 text-left text-sm font-medium">Action</th>
//               </tr>
//             </thead>
//             <tbody>
//               {loadingAppointments ? (
//                 <tr>
//                   <td colSpan={10} className="py-8 text-center text-sm text-gray-500 dark:text-gray-400" />
//                 </tr>
//               ) : filtered.length === 0 ? (
//                 <tr>
//                   <td colSpan={10} className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
//                     No appointments match your filters.
//                   </td>
//                 </tr>
//               ) : (
//                 filtered.map((r) => (
//                   <tr key={`${r.patientId}-${r.id}`} className="hover:bg-gray-50 dark:hover:bg-gray-800 border-b dark:border-gray-700">
//                     <td className="py-3 px-6 text-sm whitespace-nowrap">{r.patientId}</td>
//                     <td className="py-3 px-6 text-sm">{r.patientName || "—"}</td>
//                     <td className="py-3 px-6 text-sm">
//                       {providers.find((p) => p.id === r.providerId)?.name || r.providerId}
//                     </td>
//                     <td className="py-3 px-6 text-sm">
//                       {locations.find((l) => l.id === r.locationId)?.name || "—"}
//                     </td>
//                     <td className="py-3 px-6 text-sm">{r.visitType}</td>
//                     <td className="py-3 px-6 text-sm">{formatToMMDDYYYY(r.appointmentStartDate)}</td>
//                     <td className="py-3 px-6 text-sm">{r.appointmentStartTime}</td>
//                     <td className="py-3 px-6 text-sm">{r.priority}</td>

//                     {/* Status cell — click to edit */}
//                     <td className="py-3 px-6 text-sm">
//                       {editingStatusId === r.id ? (
//                         <div className="flex items-center gap-2">
//                           <select
//                             autoFocus
//                             defaultValue={
//                               r.status === "Checked" ? "Checked" :
//                               r.status === "Unchecked" ? "Unchecked" : ""
//                             }
//                             className="rounded-md border px-2 py-1 bg-white dark:bg-gray-800 dark:border-gray-600 text-sm"
//                             onChange={(e) => {
//                               const val = e.target.value as "Checked" | "Unchecked" | "";
//                               if (val) updateStatus(r, val);
//                             }}
//                             onBlur={() => setEditingStatusId(null)}
//                           >
//                             {/* Placeholder if current is not checked/unchecked */}
//                             {r.status !== "Checked" && r.status !== "Unchecked" && (
//                               <option value="">{r.status}</option>
//                             )}
//                             <option value="Checked">Checked</option>
//                             <option value="Unchecked">Unchecked</option>
//                           </select>

//                           <button
//                             type="button"
//                             className="px-2 py-1 text-xs rounded border dark:border-gray-600"
//                             onClick={() => setEditingStatusId(null)}
//                           >
//                             Cancel
//                           </button>
//                         </div>
//                       ) : (
//                         <button
//                           type="button"
//                           className={[
//                             "inline-flex items-center rounded-full text-[11px] font-semibold px-2 py-0.5 whitespace-nowrap",
//                             getStatusClass(r.status),
//                           ].join(" ")}
//                           title="Click to change status"
//                           onClick={() => setEditingStatusId(r.id)}
//                         >
//                           {r.status}
//                         </button>
//                       )}
//                     </td>

//                     <td className="py-3 px-6 text-sm">
//                       <div className="flex items-center gap-2">
//                         {/* Encounter button */}
//                         <button
//                           className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
//                           onClick={() => window.location.assign(encounterUrl(r))}
//                           title="Open encounters for this appointment"
//                         >
//                           Encounter
//                         </button>

//                         {/* Icon buttons — aligned and sized consistently */}
//                         <button
//                           type="button"
//                           onClick={() => openDrawer(r, "notes")}
//                           className="inline-flex items-center justify-center h-9 w-9 rounded-full border hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800 dark:border-gray-600"
//                           title="Provider Notes"
//                           aria-label="Open Provider Notes"
//                         >
//                           <NotebookPen className="h-4 w-4" />
//                         </button>
//                         <button
//                           type="button"
//                           onClick={() => openDrawer(r, "procedures")}
//                           className="inline-flex items-center justify-center h-9 w-9 rounded-full border hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800 dark:border-gray-600"
//                           title="Procedures"
//                           aria-label="Open Procedures"
//                         >
//                           <Scissors className="h-4 w-4" />
//                         </button>
//                         <button
//                           type="button"
//                           onClick={() => openDrawer(r, "vitals")}
//                           className="inline-flex items-center justify-center h-9 w-9 rounded-full border hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800 dark:border-gray-600"
//                           title="Vitals"
//                           aria-label="Open Vitals"
//                         >
//                           <Activity className="h-4 w-4" />
//                         </button>
//                       </div>
//                     </td>
//                   </tr>
//                 ))
//               )}
//             </tbody>
//           </table>
//         </div>

//         {/* Pagination */}
//         <div className="mt-3 flex items-center justify-between px-3 py-2 border-t bg-white dark:bg-gray-900 dark:border-gray-700 text-sm">
//           <div className="flex items-center gap-3">
//             <button disabled={currentPage === 1 || loadingAppointments} onClick={handlePrevious}
//               className="px-3 py-1.5 border rounded disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800">
//               Prev
//             </button>
//             <div>Page {currentPage} of {totalPages}</div>
//             <button disabled={currentPage === totalPages || loadingAppointments} onClick={handleNext}
//               className="px-3 py-1.5 border rounded disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800">
//               Next
//             </button>
//           </div>
//           <div className="flex items-center gap-4">
//             <div>Showing {loadingAppointments ? "…" : filtered.length} of {totalItems}</div>
//             <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
//               className="border rounded px-3 py-1.5 bg-white dark:bg-gray-800 dark:border-gray-600 text-sm">
//               <option value={5}>5</option>
//               <option value={10}>10</option>
//               <option value={25}>25</option>
//               <option value={50}>50</option>
//             </select>
//           </div>
//         </div>

//         {/* Drawer: shows ONLY the chosen section */}
//         <Drawer
//           open={drawerOpen}
//           onClose={() => setDrawerOpen(false)}
//           title={
//             selectedRow ? (
//               <>
//                 Appointment #{selectedRow.id} — Patient {selectedRow.patientName ?? selectedRow.patientId} &nbsp;·&nbsp; {sectionLabel(activeSection)}
//               </>
//             ) : ("")
//           }
//         >
//           {selectedRow && activeSection === "notes" && (
//             <section className="mb-8">
//               <div className="mb-2 flex items-center justify-between">
//                 <h3 className="text-base font-semibold">Provider Notes</h3>
//               </div>
//               <ProviderNoteList
//                 patientId={selectedRow.patientId}
//                 encounterId={selectedRow.id}
//               />
//             </section>
//           )}

//           {selectedRow && activeSection === "procedures" && (
//             <section className="mb-8">
//               <div className="mb-2 flex items-center justify-between">
//                 <h3 className="text-base font-semibold">Procedures</h3>
//               </div>
//               <ProcedureList
//                 patientId={selectedRow.patientId}
//                 encounterId={selectedRow.id}
//               />
//             </section>
//           )}

//           {selectedRow && activeSection === "vitals" && (
//             <section className="mb-8">
//               <div className="mb-2 flex items-center justify-between">
//                 <h3 className="text-base font-semibold">Vitals</h3>
//               </div>
//               <VitalsList
//                 patientId={selectedRow.patientId}
//                 encounterId={selectedRow.id}
//               />
//             </section>
//           )}
//         </Drawer>
//       </div>
//     </AdminLayout>
//   );
// }
"use client";
import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import AdminLayout from "@/app/(admin)/layout";
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { NotebookPen, Scissors, Activity, X, CheckCircle, XCircle, Loader2 } from "lucide-react";

// drawer content
import ProviderNoteList from "@/components/encounter/providernote/Providernotelist";
import ProcedureList from "@/components/encounter/procedure/Procedurelist";
import VitalsList from "@/components/encounter/Vitals/Vitalslist";

// Insurance Verification APIs
import {
  verifyInsuranceEligibility as verifySikka,
  downloadEligibilityReport,
  printEligibilityReport
} from "@/utils/sikkaApi";
import {
  verifyInsuranceEligibility as verifyZuub,
} from "@/utils/zuubApi";

export type AppointmentDTO = {
  id: number;
  visitType: string;
  patientId: number; // still used for MRN
  providerId: number;
  appointmentStartDate: string;
  appointmentEndDate: string;
  appointmentStartTime: string;
  appointmentEndTime: string;
  priority: string;
  locationId: number;
  status: string;
  reason: string;
  orgId: number;
  patientName?: string; // resolved from patient API
  audit: {
    createdDate: string;
    lastModifiedDate: string;
  };
};

interface Category { title: string; optionName: string; activity?: number; }
interface Provider { id: number; name: string; }
interface Location { id: number; name: string; }

interface FullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>;
  msRequestFullscreen?: () => Promise<void>;
}

type DrawerSection = "notes" | "procedures" | "vitals";

const pad = (n: number) => n.toString().padStart(2, "0");

function formatToMMDDYYYY(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;
}
function parseMMDDYYYY(s: string): string | null {
  if (!s) return null;
  const parts = s.split("/");
  if (parts.length !== 3) return null;
  const [mmStr, ddStr, yyyyStr] = parts;
  const mm = parseInt(mmStr, 10);
  const dd = parseInt(ddStr, 10);
  const yyyy = parseInt(yyyyStr, 10);
  if (Number.isNaN(mm) || Number.isNaN(dd) || Number.isNaN(yyyy)) return null;
  const d = new Date(Date.UTC(yyyy, mm - 1, dd));
  if (d.getUTCFullYear() !== yyyy || d.getUTCMonth() !== mm - 1 || d.getUTCDate() !== dd) return null;
  return `${yyyy}-${pad(mm)}-${pad(dd)}`;
}
function timeFromMMDDYYYY(s: string, fallback: number): number {
  const iso = parseMMDDYYYY(s);
  return iso ? new Date(iso).getTime() : fallback;
}

const fetchPatientName = async (id: number): Promise<string> => {
  try {
    const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/patients/${id}`);
    if (!res.ok) return String(id);
    const data = await res.json();
    return `${data.data.firstName} ${data.data.lastName}`;
  } catch {
    return String(id);
  }
};

/** Right-side drawer (frame only) */
function Drawer({
                  open,
                  onClose,
                  title,
                  children,
                }: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
      <div className="fixed inset-0 z-50 flex">
        <div className="flex-1 bg-black/40" onClick={onClose} />
        <div className="w-[800px] max-w-full bg-white dark:bg-slate-900 shadow-xl p-6 overflow-y-auto animate-slideInRight">
          <button className="mb-4 text-sm text-gray-500 hover:text-gray-700" onClick={onClose}>
            ✕ Close
          </button>
          <h2 className="text-lg font-semibold mb-4">{title}</h2>
          {children}
        </div>
      </div>
  );
}

export default function AppointmentPage() {
  const [category, setCategory] = useState<string>("All Visit Categories");
  const [categories, setCategories] = useState<string[]>([]);
  const [provider, setProvider] = useState<string>("All Providers");
  const [providers, setProviders] = useState<Provider[]>([]);
  const [location, setLocation] = useState<string>("All Locations");
  const [locations, setLocations] = useState<Location[]>([]);
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [patientName, setPatientName] = useState("");
  const [rows, setRows] = useState<AppointmentDTO[]>([]);

  const [loadingProviders, setLoadingProviders] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [loadingAppointments, setLoadingAppointments] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const tableRef = useRef<HTMLDivElement>(null);

  // NEW — status filter & inline status edit
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [editingStatusId, setEditingStatusId] = useState<number | null>(null);
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  // drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<AppointmentDTO | null>(null);
  const [activeSection, setActiveSection] = useState<DrawerSection>("notes");

  // Verification modal state
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verificationProvider, setVerificationProvider] = useState<'sikka' | 'zuub'>('sikka'); // Choose verification API
  const [downloadingPDF, setDownloadingPDF] = useState(false); // PDF download state

  // Multi-insurance verification state
  type InsuranceLevel = 'primary' | 'secondary' | 'tertiary';
  type CoverageData = {
    id?: number;
    patientId?: number;
    coverageType?: string;
    planName?: string;
    policyNumber?: string;
    provider?: string;
    groupNumber?: string;
  };
  const [availableInsurances, setAvailableInsurances] = useState<Record<InsuranceLevel, CoverageData | null>>({
    primary: null,
    secondary: null,
    tertiary: null
  });
  const [selectedInsurances, setSelectedInsurances] = useState<InsuranceLevel[]>([]);
  const [verificationResults, setVerificationResults] = useState<Record<InsuranceLevel, { success: boolean; data?: Record<string, unknown>; error?: string } | null>>({
    primary: null,
    secondary: null,
    tertiary: null
  });

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch available statuses
  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/appointments/status-options`);
        if (res.ok) {
          const data = await res.json();
          setAvailableStatuses(data.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch status options:', error);
      }
    };
    fetchStatuses();
  }, []);

  // Visit Categories (active only)
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/list-options/list/Visit Type`);
        if (!res.ok) throw new Error("Failed to fetch categories");
        const data = await res.json();
        const active = (data as Category[]).filter((c) => c.activity === 1).map((c) => c.title || c.optionName);
        setCategories(active);
      } catch { setCategories([]); }
      finally { setLoadingCategories(false); }
    };
    fetchCategories();
  }, []);

  // Providers
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/providers`);
        if (!res.ok) throw new Error("Failed to fetch providers");
        const data = await res.json();
        const list: Provider[] = data.data.map((p: { id: number; identification: { firstName: string; lastName: string } }) => ({
          id: p.id,
          name: `${p.identification.firstName} ${p.identification.lastName}`,
        }));
        setProviders(list);
      } catch { setProviders([]); }
      finally { setLoadingProviders(false); }
    };
    fetchProviders();
  }, []);

  // Locations
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/locations`);
        if (!res.ok) throw new Error("Failed to fetch locations");
        const data = await res.json();
        if (data?.success && data?.data) {
          // Handle paginated response
          const locationData = data.data.content || data.data;
          const list: Location[] = Array.isArray(locationData) ? locationData.map((l: { id: number; name: string }) => ({ id: l.id, name: l.name })) : [];
          setLocations(list);
        }
      } catch { setLocations([]); }
      finally { setLoadingLocations(false); }
    };
    fetchLocations();
  }, []);

  // Default date range: last month -> today
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const today = new Date();
      const lastMonth = new Date(today);
      lastMonth.setMonth(today.getMonth() - 1);
      const fmt = (d: Date) => `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;
      setFrom(fmt(lastMonth));
      setTo(fmt(today));
    }
  }, []);

  // ---- Appointments loader ----
  const loadAppointments = useCallback(async () => {
    setLoadingAppointments(true);
    try {
      // include status filter when not "All"
      const params = new URLSearchParams({
        page: String(currentPage - 1),
        size: String(pageSize),
      });
      if (statusFilter && statusFilter !== "All") params.set("status", statusFilter);

      const res = await fetchWithAuth(
          `${process.env.NEXT_PUBLIC_API_URL}/api/appointments?${params.toString()}`
      );
      if (!res.ok) throw new Error("Failed to fetch appointments");
      const data = await res.json();

      const payload = data?.data ?? {};
      const content: AppointmentDTO[] = payload.content ?? payload?.data?.content ?? [];
      const totalPagesVal = payload.totalPages ?? data?.data?.totalPages ?? 1;
      const totalElementsVal = payload.totalElements ?? data?.data?.totalElements ?? content.length;

      if (content && Array.isArray(content)) {
        const enriched = await Promise.all(
            content.map(async (appt: AppointmentDTO) => {
              const name = await fetchPatientName(appt.patientId);
              return { ...appt, patientName: name };
            })
        );
        setRows(enriched);
        setTotalPages(totalPagesVal);
        setTotalItems(totalElementsVal);
      } else {
        setRows([]);
        setTotalPages(1);
        setTotalItems(0);
      }
    } catch (err) {
      console.error(err);
      setRows([]);
    } finally {
      setLoadingAppointments(false);
    }
  }, [currentPage, pageSize, statusFilter]);

  // Initial & pagination fetch
  useEffect(() => { loadAppointments(); }, [loadAppointments]);

  const onRefresh = () => { loadAppointments(); };
  const onPrint = () => window.print();
  const onKiosk = () => {
    const el = tableRef.current as FullscreenElement | null;
    if (!el) return;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else if (el.msRequestFullscreen) el.msRequestFullscreen();
  };

  // NEW — update status
  const updateStatus = useCallback(
      async (row: AppointmentDTO, newStatus: string) => {
        try {
          const res = await fetchWithAuth(
              `${process.env.NEXT_PUBLIC_API_URL}/api/appointments/${row.id}/status`,
              {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
              }
          );
          const json = await res.json();
          if (!res.ok || !json?.success) {
            throw new Error(json?.message || "Failed to update status");
          }
          setEditingStatusId(null);
          await loadAppointments(); // auto-refresh the row list
        } catch (e) {
          console.error(e);
          alert("Failed to update status");
        }
      },
      [loadAppointments]
  );

  // ✅ Client-side filter includes status (case-insensitive)
  const filtered = useMemo(() => {
    if (!Array.isArray(rows)) return [];

    const fromTime = from ? timeFromMMDDYYYY(from, -Infinity) : -Infinity;
    const toTime   = to   ? timeFromMMDDYYYY(to,   Infinity)  : Infinity;
    const wanted   = (statusFilter || "All").toUpperCase();

    return rows.filter((r) => {
      const d = new Date(r.appointmentStartDate).getTime();

      const matchDate      = d >= fromTime && d <= toTime;
      const matchProvider  = provider === "All Providers" ? true : r.providerId === Number(provider);
      const matchCategory  = category === "All Visit Categories" ? true : r.visitType === category;
      const matchLocation  = location === "All Locations" ? true : r.locationId === Number(location);
      const matchPatient   = patientName
          ? (r.patientName || "").toLowerCase().includes(patientName.trim().toLowerCase())
          : true;

      const currStatus     = (r.status || "").toUpperCase();
      const matchStatus    = wanted === "ALL" ? true : currStatus === wanted;

      return matchDate && matchProvider && matchCategory && matchLocation && matchPatient && matchStatus;
    });
  }, [rows, from, to, provider, category, location, patientName, statusFilter]);

  const total = filtered.length;
  const handlePrevious = () => currentPage > 1 && setCurrentPage(currentPage - 1);
  const handleNext = () => currentPage < totalPages && setCurrentPage(currentPage + 1);

  // ✅ tolerant to any casing
  const getStatusClass = (status: string) => {
    const s = (status || "").toUpperCase();
    switch (s) {
      case "CONFIRMED":  return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "SCHEDULED":  return "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
      case "PENDING":    return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "CANCELLED":
      case "CANCELED":   return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "CANCELED LESS THAN 24H": return "bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100";
      case "CHECKED":    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200";
      case "UNCHECKED":  return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "CHECKED OUT": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "ARRIVED LATE": return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
      case "LEFT W/O APT": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "NO-FILL ISSUE": return "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200";
      case "CODING ISSUE": return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200";
      case "AM CONFIRMED": return "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200";
      case "EMAIL CONFIRMED": return "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200";
      case "CALLBACK REQUESTED": return "bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200";
      default:           return "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200";
    }
  };

  const openDrawer = (row: AppointmentDTO, section: DrawerSection) => {
    setSelectedRow(row);
    setActiveSection(section);
    setDrawerOpen(true);
  };

  const encounterUrl = (row: AppointmentDTO) =>
      `/patients/${row.patientId}/encounters/${row.id}`;

  const sectionLabel = (s: DrawerSection) =>
      s === "notes" ? "Provider Notes" : s === "procedures" ? "Procedures" : "Vitals";

  // Handle insurance verification
  const handleVerification = async (appointment: AppointmentDTO) => {
    setSelectedRow(appointment);
    setVerificationModalOpen(true);
    setVerificationLoading(true);
    setVerificationError(null);

    // Reset multi-insurance state
    setAvailableInsurances({ primary: null, secondary: null, tertiary: null });
    setSelectedInsurances([]);
    setVerificationResults({ primary: null, secondary: null, tertiary: null });

    try {
      console.log("📋 Fetching patient insurances for appointment:", appointment);

      // Fetch all coverages for this patient from backend
      const API = process.env.NEXT_PUBLIC_API_URL;
      const orgId = typeof window !== "undefined" ? localStorage.getItem("orgId") || process.env.NEXT_PUBLIC_ORG_ID : process.env.NEXT_PUBLIC_ORG_ID;

      const res = await fetchWithAuth(`${API}/api/coverages`, {
        headers: { "Content-Type": "application/json", "orgId": String(orgId) }
      });

      if (!res.ok) {
        throw new Error("Failed to fetch patient insurances");
      }

      const body = await res.json();

      if (body.success && Array.isArray(body.data)) {
        const patientCoverages = body.data.filter((c: CoverageData) => Number(c.patientId) === appointment.patientId);

        const insurancesByLevel: Record<InsuranceLevel, CoverageData | null> = {
          primary: null,
          secondary: null,
          tertiary: null
        };

        // Map coverages to their levels
        patientCoverages.forEach((coverage: CoverageData) => {
          const type = coverage.coverageType?.toUpperCase();
          if (type?.includes('PRIMARY')) {
            insurancesByLevel.primary = coverage;
          } else if (type?.includes('SECONDARY')) {
            insurancesByLevel.secondary = coverage;
          } else if (type?.includes('TERTIARY')) {
            insurancesByLevel.tertiary = coverage;
          }
        });

        setAvailableInsurances(insurancesByLevel);

        // Auto-select available insurances
        const available: InsuranceLevel[] = [];
        if (insurancesByLevel.primary) available.push('primary');
        if (insurancesByLevel.secondary) available.push('secondary');
        if (insurancesByLevel.tertiary) available.push('tertiary');

        setSelectedInsurances(available);

        if (available.length === 0) {
          setVerificationError("No insurance information found for this patient. Please add insurance details in the Demographics page first.");
          setVerificationLoading(false);
          return;
        }

        console.log(`✅ Found ${available.length} insurance(s): ${available.join(', ')}`);
      } else {
        throw new Error("No insurance data returned");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch patient insurances";
      setVerificationError(errorMessage);
    } finally {
      setVerificationLoading(false);
    }
  };

  // Verify selected insurances
  const performVerification = async () => {
    if (!selectedRow || selectedInsurances.length === 0) return;

    setVerificationLoading(true);
    setVerificationError(null);

    const results: Record<InsuranceLevel, { success: boolean; data?: Record<string, unknown>; error?: string } | null> = {
      primary: null,
      secondary: null,
      tertiary: null
    };

    console.log(`🔧 Verifying ${selectedInsurances.length} insurance(s) using ${verificationProvider === 'sikka' ? 'Provider A' : 'Provider B'}`);

    const verifyFunction = verificationProvider === 'sikka' ? verifySikka : verifyZuub;

    // Verify each selected insurance
    for (const level of selectedInsurances) {
      const insurance = availableInsurances[level];
      if (!insurance) continue;

      try {
        console.log(`🔍 Verifying ${level} insurance: ${insurance.planName || insurance.provider}`);

        const result = await verifyFunction({
          patientId: selectedRow.patientId,
          providerId: selectedRow.providerId,
          appointmentId: selectedRow.id
        });

        results[level] = {
          success: result.success,
          data: result.data ? (result.data as Record<string, unknown>) : undefined,
          error: result.error || undefined
        };

        if (result.success) {
          console.log(`✅ ${level} insurance verified successfully`);
        } else {
          console.error(`❌ ${level} insurance verification failed:`, result.error);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Verification failed";
        results[level] = {
          success: false,
          error: errorMsg,
          data: undefined
        };
        console.error(`❌ ${level} insurance verification error:`, error);
      }
    }

    setVerificationResults(results);
    setVerificationLoading(false);

    // Check if all failed
    const allFailed = selectedInsurances.every(level => !results[level]?.success);
    if (allFailed) {
      setVerificationError("All insurance verifications failed. Please check the insurance details and try again.");
    }
  };

  // Close verification modal
  const closeVerificationModal = () => {
    setVerificationModalOpen(false);
    setVerificationError(null);
    setSelectedRow(null);
    setAvailableInsurances({ primary: null, secondary: null, tertiary: null });
    setSelectedInsurances([]);
    setVerificationResults({ primary: null, secondary: null, tertiary: null });
  };

  if (!mounted) return null;

  return (
      <AdminLayout>
        <div className="container mx-auto p-6 overflow-x-hidden text-gray-800 dark:text-gray-200">
          {/* Heading */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm">
              <span className="italic font-semibold">Total appointments:</span>{" "}
              {loadingAppointments ? "…" : total}
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 w-full">
              <select value={category} onChange={(e) => setCategory(e.target.value)}
                      className="rounded-md border px-3 py-2 bg-white dark:bg-gray-800 dark:border-gray-600">
                <option value="All Visit Categories">All Visit Categories</option>
                {loadingCategories ? <option disabled>Loading...</option> :
                    categories.map((c, idx) => (<option key={idx} value={c}>{c}</option>))}
              </select>

              <select value={provider} onChange={(e) => setProvider(e.target.value)}
                      className="rounded-md border px-3 py-2 bg-white dark:bg-gray-800 dark:border-gray-600">
                <option value="All Providers">All Providers</option>
                {loadingProviders ? <option disabled>Loading...</option> :
                    providers.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
              </select>

              <select value={location} onChange={(e) => setLocation(e.target.value)}
                      className="rounded-md border px-3 py-2 bg-white dark:bg-gray-800 dark:border-gray-600">
                <option value="All Locations">All Locations</option>
                {loadingLocations ? <option disabled>Loading...</option> :
                    locations.map((l) => (<option key={l.id} value={l.id}>{l.name}</option>))}
              </select>

              <input type="text" placeholder="MM/DD/YYYY" value={from} onChange={(e) => setFrom(e.target.value)}
                     className="rounded-md border px-3 py-2 bg-white dark:bg-gray-800 dark:border-gray-600" />

              <input type="text" placeholder="MM/DD/YYYY" value={to} onChange={(e) => setTo(e.target.value)}
                     className="rounded-md border px-3 py-2 bg-white dark:bg-gray-800 dark:border-gray-600" />

              {/* NEW — Status filter */}
              <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                  className="rounded-md border px-3 py-2 bg-white dark:bg-gray-800 dark:border-gray-600"
              >
                <option value="All">All Statuses</option>
                {availableStatuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>

              <input type="text" placeholder="Patient Name" value={patientName} onChange={(e) => setPatientName(e.target.value)}
                     className="rounded-md border px-3 py-2 bg-white dark:bg-gray-800 dark:border-gray-600" />
            </div>

            <div className="flex gap-2">
              <button onClick={onRefresh} disabled={loadingAppointments}
                      className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60" title="Refresh table data">
                Refresh
              </button>
              <button onClick={onPrint} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                Print
              </button>
              <button onClick={onKiosk} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                Kiosk
              </button>
            </div>
          </div>

          {/* Table */}
          <div ref={tableRef} className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-md">
            <table className="w-full table-auto">
              <colgroup>
                <col className="w-20" />
                <col className="w-48" />
                <col className="w-48" />
                <col />
                <col className="w-32" />
                <col className="w-32" />
                <col className="w-28" />
                <col className="w-28" />
                <col className="w-28" />
                <col className="w-[260px]" />
              </colgroup>
              <thead className="bg-gray-100 dark:bg-gray-800">
              <tr>
                <th className="py-3 px-6 text-left text-sm font-medium">MRN</th>
                <th className="py-3 px-6 text-left text-sm font-medium">Patient Name</th>
                <th className="py-3 px-6 text-left text-sm font-medium">Provider Name</th>
                <th className="py-3 px-6 text-left text-sm font-medium">Location</th>
                <th className="py-3 px-6 text-left text-sm font-medium">Visit Type</th>
                <th className="py-3 px-6 text-left text-sm font-medium">Start Date</th>
                <th className="py-3 px-6 text-left text-sm font-medium">Start Time</th>
                <th className="py-3 px-6 text-left text-sm font-medium">Priority</th>
                <th className="py-3 px-6 text-left text-sm font-medium">Status</th>
                <th className="py-3 px-6 text-left text-sm font-medium">Action</th>
              </tr>
              </thead>
              <tbody>
              {loadingAppointments ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-sm text-gray-500 dark:text-gray-400" />
                  </tr>
              ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                      No appointments match your filters.
                    </td>
                  </tr>
              ) : (
                  filtered.map((r) => (
                      <tr key={`${r.patientId}-${r.id}`} className="hover:bg-gray-50 dark:hover:bg-gray-800 border-b dark:border-gray-700">
                        <td className="py-3 px-6 text-sm whitespace-nowrap">{r.patientId}</td>
                        <td className="py-3 px-6 text-sm">{r.patientName || "—"}</td>
                        <td className="py-3 px-6 text-sm">
                          {providers.find((p) => p.id === r.providerId)?.name || r.providerId}
                        </td>
                        <td className="py-3 px-6 text-sm">
                          {locations.find((l) => l.id === r.locationId)?.name || "—"}
                        </td>
                        <td className="py-3 px-6 text-sm">{r.visitType}</td>
                        <td className="py-3 px-6 text-sm">{formatToMMDDYYYY(r.appointmentStartDate)}</td>
                        <td className="py-3 px-6 text-sm">{r.appointmentStartTime}</td>
                        <td className="py-3 px-6 text-sm">{r.priority}</td>

                        {/* Status cell — click to edit */}
                        <td className="py-3 px-6 text-sm">
                          {editingStatusId === r.id ? (
                              <div className="flex items-center gap-2">
                                <select
                                    autoFocus
                                    defaultValue={
                                      ((r.status || "").toUpperCase() === "CHECKED") ? "Checked" :
                                          ((r.status || "").toUpperCase() === "UNCHECKED") ? "Unchecked" : ""
                                    }
                                    className="rounded-md border px-2 py-1 bg-white dark:bg-gray-800 dark:border-gray-600 text-sm"
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val && val !== r.status) updateStatus(r, val);
                                    }}
                                    onBlur={() => setEditingStatusId(null)}
                                >
                                  {availableStatuses.map((status) => (
                                    <option key={status} value={status}>{status}</option>
                                  ))}
                                </select>

                                <button
                                    type="button"
                                    className="px-2 py-1 text-xs rounded border dark:border-gray-600"
                                    onClick={() => setEditingStatusId(null)}
                                >
                                  Cancel
                                </button>
                              </div>
                          ) : (
                              <button
                                  type="button"
                                  className={[
                                    "inline-flex items-center rounded-full text-[11px] font-semibold px-2 py-0.5 whitespace-nowrap",
                                    getStatusClass(r.status),
                                  ].join(" ")}
                                  title="Click to change status"
                                  onClick={() => setEditingStatusId(r.id)}
                              >
                                {r.status}
                              </button>
                          )}
                        </td>

                        <td className="py-3 px-6 text-sm">
                          <div className="flex items-center gap-2">
                            {/* Encounter button */}
                            <button
                                className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 text-xs font-medium"
                                onClick={() => window.location.assign(encounterUrl(r))}
                                title="Open encounters for this appointment"
                            >
                              Encounter
                            </button>

                            {/* Verification button */}
                            <button
                                className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700 text-xs font-medium"
                                onClick={() => handleVerification(r)}
                                title="Verify insurance eligibility"
                            >
                              Verification
                            </button>

                            {/* Icon buttons — aligned and sized consistently */}
                            <button
                                type="button"
                                onClick={() => openDrawer(r, "notes")}
                                className="inline-flex items-center justify-center h-9 w-9 rounded-full border hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800 dark:border-gray-600"
                                title="Provider Notes"
                                aria-label="Open Provider Notes"
                            >
                              <NotebookPen className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => openDrawer(r, "procedures")}
                                className="inline-flex items-center justify-center h-9 w-9 rounded-full border hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800 dark:border-gray-600"
                                title="Procedures"
                                aria-label="Open Procedures"
                            >
                              <Scissors className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => openDrawer(r, "vitals")}
                                className="inline-flex items-center justify-center h-9 w-9 rounded-full border hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800 dark:border-gray-600"
                                title="Vitals"
                                aria-label="Open Vitals"
                            >
                              <Activity className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                  ))
              )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-3 flex items-center justify-between px-3 py-2 border-t bg-white dark:bg-gray-900 dark:border-gray-700 text-sm">
            <div className="flex items-center gap-3">
              <button disabled={currentPage === 1 || loadingAppointments} onClick={handlePrevious}
                      className="px-3 py-1.5 border rounded disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800">
                Prev
              </button>
              <div>Page {currentPage} of {totalPages}</div>
              <button disabled={currentPage === totalPages || loadingAppointments} onClick={handleNext}
                      className="px-3 py-1.5 border rounded disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800">
                Next
              </button>
            </div>
            <div className="flex items-center gap-4">
              <div>Showing {loadingAppointments ? "…" : filtered.length} of {totalItems}</div>
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                      className="border rounded px-3 py-1.5 bg-white dark:bg-gray-800 dark:border-gray-600 text-sm">
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          {/* Drawer: shows ONLY the chosen section */}
          <Drawer
              open={drawerOpen}
              onClose={() => setDrawerOpen(false)}
              title={
                selectedRow ? (
                    <>
                      Appointment #{selectedRow.id} — Patient {selectedRow.patientName ?? selectedRow.patientId} &nbsp;·&nbsp; {sectionLabel(activeSection)}
                    </>
                ) : ("")
              }
          >
            {selectedRow && activeSection === "notes" && (
                <section className="mb-8">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-base font-semibold">Provider Notes</h3>
                  </div>
                  <ProviderNoteList
                      patientId={selectedRow.patientId}
                      encounterId={selectedRow.id}
                  />
                </section>
            )}

            {selectedRow && activeSection === "procedures" && (
                <section className="mb-8">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-base font-semibold">Procedures</h3>
                  </div>
                  <ProcedureList
                      patientId={selectedRow.patientId}
                      encounterId={selectedRow.id}
                  />
                </section>
            )}

            {selectedRow && activeSection === "vitals" && (
                <section className="mb-8">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-base font-semibold">Vitals</h3>
                  </div>
                  <VitalsList
                      patientId={selectedRow.patientId}
                      encounterId={selectedRow.id}
                  />
                </section>
            )}
          </Drawer>

          {/* Insurance Verification Modal */}
          {verificationModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                  {/* Modal Header */}
                  <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                        Dental Insurance Eligibility Verification
                      </h2>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        ⚠️ DENTAL Insurance Only - Not for Medical Insurance
                      </p>
                      {selectedRow && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Patient: {selectedRow.patientName || selectedRow.patientId} | Appointment ID: {selectedRow.id}
                          </p>
                      )}
                    </div>
                    <button
                        onClick={closeVerificationModal}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        disabled={verificationLoading}
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="p-6">
                    {/* Insurance Selection - Only show before verification starts */}
                    {!verificationLoading && Object.values(verificationResults).every(r => r === null) && !verificationError && (
                        <>
                          {/* Insurance Selection */}
                          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                              Select Insurance(s) to Verify
                            </h4>
                            <div className="space-y-3">
                              {(['primary', 'secondary', 'tertiary'] as InsuranceLevel[]).map((level) => {
                                const insurance = availableInsurances[level];
                                const isAvailable = insurance !== null;
                                const isSelected = selectedInsurances.includes(level);

                                return (
                                    <div key={level} className={`flex items-start gap-3 p-3 rounded border ${isAvailable ? 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600' : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-50'}`}>
                                      <input
                                          type="checkbox"
                                          id={`insurance-${level}`}
                                          checked={isSelected}
                                          disabled={!isAvailable}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              setSelectedInsurances([...selectedInsurances, level]);
                                            } else {
                                              setSelectedInsurances(selectedInsurances.filter(l => l !== level));
                                            }
                                          }}
                                          className="mt-1 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                                      />
                                      <label htmlFor={`insurance-${level}`} className="flex-1 cursor-pointer">
                                        <div className="flex items-center justify-between">
                                  <span className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                                    {level} Insurance
                                  </span>
                                          {!isAvailable && (
                                              <span className="text-xs text-red-600 dark:text-red-400">Not Added</span>
                                          )}
                                        </div>
                                        {isAvailable && (
                                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                              <div><span className="font-medium">Provider:</span> {insurance.provider || 'N/A'}</div>
                                              <div><span className="font-medium">Plan:</span> {insurance.planName || 'N/A'}</div>
                                              <div><span className="font-medium">Policy #:</span> {insurance.policyNumber || 'N/A'}</div>
                                            </div>
                                        )}
                                        {!isAvailable && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                              Add this insurance in Demographics page first
                                            </p>
                                        )}
                                      </label>
                                    </div>
                                );
                              })}
                            </div>
                            <button
                                onClick={performVerification}
                                disabled={selectedInsurances.length === 0}
                                className="mt-4 w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
                            >
                              Verify Selected Insurance{selectedInsurances.length > 1 ? 's' : ''} ({selectedInsurances.length})
                            </button>
                          </div>
                        </>
                    )}

                    {verificationLoading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
                          <p className="text-gray-600 dark:text-gray-400">
                            Verifying DENTAL insurance eligibility...
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                            This may take a few moments (checking dental coverage only)
                          </p>
                        </div>
                    ) : verificationError ? (
                        <div className="flex flex-col items-center py-8">
                          <XCircle className="h-16 w-16 text-red-500 mb-4" />
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                            Verification Failed
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
                            {verificationError}
                          </p>
                          <button
                              onClick={closeVerificationModal}
                              className="mt-6 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                          >
                            Close
                          </button>
                        </div>
                    ) : Object.values(verificationResults).some(r => r !== null) ? (
                        <div className="space-y-4">
                          {/* Success header if at least one verification succeeded */}
                          {Object.values(verificationResults).some(r => r?.success) && (
                              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                                <div>
                                  <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">
                                    Dental Insurance Verification Complete
                                  </h3>
                                  <p className="text-sm text-green-700 dark:text-green-300">
                                    {Object.values(verificationResults).filter(r => r?.success).length} insurance(s) verified successfully
                                  </p>
                                </div>
                              </div>
                          )}

                          {/* Display each verification result */}
                          {(['primary', 'secondary', 'tertiary'] as InsuranceLevel[]).map((level) => {
                            const result = verificationResults[level];
                            if (!result) return null;

                            const insurance = availableInsurances[level];

                            return (
                                <div key={level} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                  {/* Header */}
                                  <div className={`px-4 py-3 ${result.success ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        {result.success ? (
                                            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                                        ) : (
                                            <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                                        )}
                                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 capitalize">
                                          {level} Insurance
                                        </h4>
                                      </div>
                                      <span className={`text-sm px-2 py-1 rounded ${result.success ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'}`}>
                                {result.success ? 'Verified' : 'Failed'}
                              </span>
                                    </div>
                                    {insurance && (
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                          {insurance.provider} • {insurance.planName} • Policy: {insurance.policyNumber}
                                        </p>
                                    )}
                                  </div>

                                  {/* Result content */}
                                  <div className="p-4 bg-gray-50 dark:bg-gray-900">
                                    {result.success && result.data ? (
                                        <>
                                <pre className="text-xs text-gray-700 dark:text-gray-300 overflow-x-auto whitespace-pre-wrap max-h-60 overflow-y-auto">
                                  {JSON.stringify(result.data, null, 2)}
                                </pre>
                                          <div className="flex gap-2 mt-3">
                                            <button
                                                onClick={async () => {
                                                  if (selectedRow && result.data && !downloadingPDF) {
                                                    setDownloadingPDF(true);
                                                    try {
                                                      await downloadEligibilityReport(
                                                          result.data,
                                                          {
                                                            name: selectedRow.patientName || `Patient ${selectedRow.patientId}`,
                                                            id: selectedRow.patientId,
                                                            insuranceLevel: level
                                                          }
                                                      );
                                                    } catch (error) {
                                                      console.error("Failed to download PDF:", error);
                                                      alert("Failed to download PDF report. Please try again.");
                                                    } finally {
                                                      setDownloadingPDF(false);
                                                    }
                                                  }
                                                }}
                                                disabled={downloadingPDF}
                                                className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-green-400 transition-colors"
                                            >
                                              Download {level} PDF
                                            </button>
                                            <button
                                                onClick={() => {
                                                  if (selectedRow && result.data) {
                                                    printEligibilityReport(
                                                        result.data,
                                                        {
                                                          name: selectedRow.patientName || `Patient ${selectedRow.patientId}`,
                                                          id: selectedRow.patientId,
                                                          insuranceLevel: level
                                                        }
                                                    );
                                                  }
                                                }}
                                                className="px-4 py-2 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                                            >
                                              Print {level}
                                            </button>
                                          </div>
                                        </>
                                    ) : (
                                        <p className="text-sm text-red-600 dark:text-red-400">
                                          {result.error || 'Verification failed'}
                                        </p>
                                    )}
                                  </div>
                                </div>
                            );
                          })}

                          {/* Combined download for all successful verifications */}
                          {Object.values(verificationResults).filter(r => r?.success).length > 1 && (
                              <div className="flex justify-between items-center pt-4 border-t dark:border-gray-700">
                                <button
                                    onClick={async () => {
                                      if (selectedRow && !downloadingPDF) {
                                        setDownloadingPDF(true);
                                        try {
                                          // Collect all successful verification data
                                          const allData = {
                                            primary: verificationResults.primary?.success ? verificationResults.primary.data : null,
                                            secondary: verificationResults.secondary?.success ? verificationResults.secondary.data : null,
                                            tertiary: verificationResults.tertiary?.success ? verificationResults.tertiary.data : null
                                          };

                                          await downloadEligibilityReport(
                                              allData,
                                              {
                                                name: selectedRow.patientName || `Patient ${selectedRow.patientId}`,
                                                id: selectedRow.patientId,
                                                multiInsurance: true
                                              }
                                          );
                                        } catch (error) {
                                          console.error("Failed to download combined PDF:", error);
                                          alert("Failed to download combined PDF report. Please try again.");
                                        } finally {
                                          setDownloadingPDF(false);
                                        }
                                      }
                                    }}
                                    disabled={downloadingPDF}
                                    className={`px-6 py-3 ${downloadingPDF ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed flex items-center gap-2`}
                                >
                                  {downloadingPDF ? (
                                      <>
                                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Generating Combined PDF...
                                      </>
                                  ) : (
                                      <>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        Download All Insurances PDF
                                      </>
                                  )}
                                </button>
                                <button
                                    onClick={closeVerificationModal}
                                    className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                                >
                                  Close
                                </button>
                              </div>
                          )}

                          {/* Single close button if only one insurance or some failed */}
                          {Object.values(verificationResults).filter(r => r?.success).length <= 1 && (
                              <div className="flex justify-end pt-4 border-t dark:border-gray-700">
                                <button
                                    onClick={closeVerificationModal}
                                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                                >
                                  Close
                                </button>
                              </div>
                          )}
                        </div>
                    ) : null}
                  </div>
                </div>
              </div>
          )}
        </div>
      </AdminLayout>
  );
}
