'use client';

import { getEnv } from "@/utils/env";
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import AdminLayout from '@/app/(admin)/layout';
import { fetchWithAuth } from '@/utils/fetchWithAuth';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';

interface Provider { id: number; name: string; }
interface Location { id: number; name: string; }
interface Appointment {
  id: number;
  patientId: number;
  providerId: number;
  locationId: number;
  appointmentStartDate: string;
  appointmentStartTime: string;
  appointmentEndTime: string;
  visitType: string;
  status: string;
  priority: string;
  patientName?: string;
}

const pad = (n: number) => n.toString().padStart(2, '0');

function formatToMMDDYYYY(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return iso;
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;
}

function parseMMDDYYYY(s: string): string | null {
  if (!s) return null;
  const parts = s.split('/');
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
    const res = await fetchWithAuth(`${getEnv("NEXT_PUBLIC_API_URL")}/api/patients/${id}`);
    if (!res.ok) return String(id);
    const data = await res.json();
    return `${data.data.firstName} ${data.data.lastName}`;
  } catch {
    return String(id);
  }
};

export default function AppointmentReportPage() {
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [provider, setProvider] = useState('All Providers');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [location, setLocation] = useState('All Locations');
  const [locations, setLocations] = useState<Location[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'checked' | 'unchecked' | 'cancelled'>('all');
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['date', 'time', 'provider', 'location', 'type', 'priority']);
  const [draftVisibleColumns, setDraftVisibleColumns] = useState<string[]>(['date', 'time', 'provider', 'location', 'type', 'priority']);
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [rows, setRows] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [patientNames, setPatientNames] = useState<Map<number, string>>(new Map());
  const fromDateRef = useRef<HTMLInputElement>(null);
  const toDateRef = useRef<HTMLInputElement>(null);

  // Fetch providers
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const res = await fetchWithAuth(`${getEnv("NEXT_PUBLIC_API_URL")}/api/providers`);
        if (!res.ok) throw new Error('Failed to fetch providers');
        const data = await res.json();
        const list: Provider[] = data.data.map((p: { id: number; identification: { firstName: string; lastName: string } }) => ({
          id: p.id,
          name: `${p.identification.firstName} ${p.identification.lastName}`,
        }));
        setProviders(list);
      } catch { setProviders([]); }
    };
    fetchProviders();
  }, []);

  // Fetch locations
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await fetchWithAuth(`${getEnv("NEXT_PUBLIC_API_URL")}/api/locations`);
        if (!res.ok) throw new Error('Failed to fetch locations');
        const data = await res.json();
        if (data?.success && data?.data) {
          const locationData = data.data.content || data.data;
          const list: Location[] = Array.isArray(locationData) ? locationData.map((l: { id: number; name: string }) => ({ id: l.id, name: l.name })) : [];
          setLocations(list);
        }
      } catch { setLocations([]); }
    };
    fetchLocations();
  }, []);

  // Default date range: last month -> today
  useEffect(() => {
    const today = new Date();
    const lastMonth = new Date(today);
    lastMonth.setMonth(today.getMonth() - 1);
    const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    setFrom(fmt(lastMonth));
    setTo(fmt(today));
  }, []);

  useEffect(() => {
    if (fromDateRef.current) {
      flatpickr(fromDateRef.current, {
        dateFormat: 'Y-m-d',
        disableMobile: true,
        onChange: (selectedDates, dateStr) => {
          setFrom(dateStr);
        }
      });
    }
    if (toDateRef.current) {
      flatpickr(toDateRef.current, {
        dateFormat: 'Y-m-d',
        disableMobile: true,
        onChange: (selectedDates, dateStr) => {
          setTo(dateStr);
        }
      });
    }
  }, []);

  // Load appointments with pagination
  const loadAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ 
        page: currentPage.toString(), 
        size: pageSize.toString(),
        sort: 'id,asc'
      });
      // Only send basic pagination to API
      
      const res = await fetchWithAuth(`${getEnv("NEXT_PUBLIC_API_URL")}/api/appointments?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch appointments');
      const data = await res.json();

      const payload = data?.data ?? {};
      const content: Appointment[] = payload.content ?? payload?.data?.content ?? [];
      
      setRows(content || []);
      setTotalElements(payload.totalElements || 0);
      setTotalPages(payload.totalPages || 0);
      
      // Load patient names for current page only
      if (content && Array.isArray(content)) {
        const uniquePatientIds = [...new Set(content.map(a => a.patientId))];
        
        setPatientNames(prevNames => {
          const newNames = new Map(prevNames);
          uniquePatientIds.forEach(async (id) => {
            if (!newNames.has(id)) {
              const name = await fetchPatientName(id);
              setPatientNames(current => new Map(current.set(id, name)));
            }
          });
          return newNames;
        });
      }
    } catch (err) {
      console.error(err);
      setRows([]);
      setTotalElements(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize]);

  useEffect(() => { loadAppointments(); }, [loadAppointments]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [search, statusFilter, from, to, provider, location]);

  const filtered = useMemo(() => {
    if (!Array.isArray(rows)) return [];

    return rows.filter(a => {
      // Search filter
      const searchMatch = !search || 
        (patientNames.get(a.patientId) || '').toLowerCase().includes(search.toLowerCase()) ||
        String(a.id).includes(search) ||
        String(a.patientId).includes(search);

      // Date range filter
      const appointmentDate = new Date(a.appointmentStartDate);
      const fromDate = from ? new Date(from) : null;
      const toDate = to ? new Date(to + 'T23:59:59') : null;
      const dateMatch = (!fromDate || appointmentDate >= fromDate) && 
                       (!toDate || appointmentDate <= toDate);

      // Provider filter
      const providerMatch = provider === 'All Providers' || 
                           String(a.providerId) === provider;

      // Location filter
      const locationMatch = location === 'All Locations' || 
                           String(a.locationId) === location;

      // Status filter
      const statusMatch = statusFilter === 'all' || 
                         a.status.toLowerCase() === statusFilter.toLowerCase();

      return searchMatch && dateMatch && providerMatch && locationMatch && statusMatch;
    }).sort((a, b) => a.id - b.id);
  }, [rows, search, from, to, provider, location, statusFilter, patientNames]);

  const applyFilters = () => {
    setVisibleColumns(draftVisibleColumns);
    setShowFilters(false);
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(a => a.id)));
    }
    setSelectAll(!selectAll);
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
    setSelected(new Set());
    setSelectAll(false);
  };

  const changePageSize = (size: number) => {
    setPageSize(size);
    setCurrentPage(0);
    setSelected(new Set());
    setSelectAll(false);
  };

  const toggleRow = (id: number) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
    setSelectAll(next.size === filtered.length);
  };

  const downloadCSV = () => {
    const dataToExport = selected.size > 0 ? filtered.filter(a => selected.has(a.id)) : filtered;
    const headers = ['Appointment ID', 'Patient Name', 'Status'];
    if (visibleColumns.includes('date')) headers.push('Date');
    if (visibleColumns.includes('time')) headers.push('Time');
    if (visibleColumns.includes('provider')) headers.push('Provider');
    if (visibleColumns.includes('location')) headers.push('Location');
    if (visibleColumns.includes('type')) headers.push('Type');
    if (visibleColumns.includes('priority')) headers.push('Priority');

    const csvRows = dataToExport.map(a => {
      const providerName = providers.find(p => p.id === a.providerId)?.name || String(a.providerId);
      const locationName = locations.find(l => l.id === a.locationId)?.name || String(a.locationId);
      const row = [a.id, patientNames.get(a.patientId) || a.patientId, a.status.toUpperCase()];
      if (visibleColumns.includes('date')) row.push(formatToMMDDYYYY(a.appointmentStartDate));
      if (visibleColumns.includes('time')) row.push(a.appointmentStartTime);
      if (visibleColumns.includes('provider')) row.push(providerName);
      if (visibleColumns.includes('location')) row.push(locationName);
      if (visibleColumns.includes('type')) row.push(a.visitType);
      if (visibleColumns.includes('priority')) row.push(a.priority);
      return row.join(',');
    });

    const csv = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'appointment_report.csv';
    a.click();
  };

  const printTable = () => {
    const dataToExport = selected.size > 0 ? filtered.filter(a => selected.has(a.id)) : filtered;
    const tableHeaders = `
      <tr>
        <th>Appointment ID</th>
        <th>Patient Name</th>
        <th>Status</th>
        ${visibleColumns.includes('date') ? '<th>Date</th>' : ''}
        ${visibleColumns.includes('time') ? '<th>Time</th>' : ''}
        ${visibleColumns.includes('provider') ? '<th>Provider</th>' : ''}
        ${visibleColumns.includes('location') ? '<th>Location</th>' : ''}
        ${visibleColumns.includes('type') ? '<th>Type</th>' : ''}
        ${visibleColumns.includes('priority') ? '<th>Priority</th>' : ''}
      </tr>
    `;
    
    const tableRows = dataToExport.map(a => {
      const providerName = providers.find(p => p.id === a.providerId)?.name || String(a.providerId);
      const locationName = locations.find(l => l.id === a.locationId)?.name || String(a.locationId);
      return `
      <tr>
        <td>${a.id}</td>
        <td>${patientNames.get(a.patientId) || a.patientId}</td>
        <td>${a.status.charAt(0).toUpperCase() + a.status.slice(1)}</td>
        ${visibleColumns.includes('date') ? `<td>${formatToMMDDYYYY(a.appointmentStartDate)}</td>` : ''}
        ${visibleColumns.includes('time') ? `<td>${a.appointmentStartTime}</td>` : ''}
        ${visibleColumns.includes('provider') ? `<td>${providerName}</td>` : ''}
        ${visibleColumns.includes('location') ? `<td>${locationName}</td>` : ''}
        ${visibleColumns.includes('type') ? `<td>${a.visitType}</td>` : ''}
        ${visibleColumns.includes('priority') ? `<td>${a.priority}</td>` : ''}
      </tr>
    `;
    }).join('');
    
    const printDiv = document.createElement('div');
    printDiv.innerHTML = `
      <table style="border-collapse: collapse; width: 100%;">
        <thead>${tableHeaders}</thead>
        <tbody>${tableRows}</tbody>
      </table>
    `;
    
    document.body.style.visibility = 'hidden';
    printDiv.style.visibility = 'visible';
    printDiv.style.position = 'absolute';
    printDiv.style.left = '0';
    printDiv.style.top = '0';
    printDiv.style.width = '100%';
    
    const printStyles = document.createElement('style');
    printStyles.innerHTML = `
      @media print {
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
      }
    `;
    
    document.head.appendChild(printStyles);
    document.body.appendChild(printDiv);
    window.print();
    document.body.removeChild(printDiv);
    document.head.removeChild(printStyles);
    document.body.style.visibility = 'visible';
  };

  const getStatusColor = (status: string) => {
    const s = (status || '').toUpperCase();
    switch(s) {
      case 'SCHEDULED': return 'bg-gray-200 text-gray-800';
      case 'CHECKED': return 'bg-emerald-100 text-emerald-800';
      case 'UNCHECKED': return 'bg-orange-100 text-orange-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      case 'CONFIRMED': return 'bg-green-100 text-green-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col h-full gap-4">
        {/* FILTER BAR */}
        <div className="bg-white rounded-lg border p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Patient/Appointment ID"
              className="px-4 py-2 border rounded-lg"
            />
            <div className="relative">
              <input
                ref={fromDateRef}
                type="text"
                value={from}
                placeholder="Start Date"
                readOnly
                className="px-4 py-2 border rounded-lg w-full cursor-pointer"
              />
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <div className="relative">
              <input
                ref={toDateRef}
                type="text"
                value={to}
                placeholder="End Date"
                readOnly
                className="px-4 py-2 border rounded-lg w-full cursor-pointer"
              />
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="All Providers">All Providers</option>
              {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="flex gap-3">
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="All Locations">All Locations</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="all">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="checked">Checked</option>
              <option value="unchecked">Unchecked</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button onClick={() => setShowFilters(!showFilters)} className="px-4 py-2 border rounded-lg">Customize</button>
            <button onClick={downloadCSV} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">Export CSV</button>
            <button onClick={printTable} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              Print
            </button>
          </div>

          {/* COLUMN FILTER */}
          {showFilters && (
            <div className="border-t pt-4 mt-4">
              <p className="text-xs font-semibold mb-3 text-gray-500">SHOW COLUMNS</p>
              <div className="flex flex-wrap gap-4">
                {['date', 'time', 'provider', 'location', 'type', 'priority'].map(col => (
                  <label key={col} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={draftVisibleColumns.includes(col)}
                      onChange={() => setDraftVisibleColumns(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col])}
                    />
                    <span className="text-sm">{col.charAt(0).toUpperCase() + col.slice(1)}</span>
                  </label>
                ))}
                <button onClick={applyFilters} className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-lg">Apply Filter</button>
              </div>
            </div>
          )}
        </div>

        {/* TABLE */}
        <div className="bg-white border rounded-lg overflow-hidden flex flex-col">
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <tr>
                  <th className="p-3">
                    <input type="checkbox" checked={selectAll} onChange={toggleSelectAll} className="w-4 h-4 text-blue-600 rounded" />
                  </th>
                  <th className="p-3 text-left font-semibold text-gray-700">Appointment ID</th>
                  <th className="p-3 text-left font-semibold text-gray-700">Patient Name</th>
                  <th className="p-3 text-left font-semibold text-gray-700">Status</th>
                  {visibleColumns.includes('date') && <th className="p-3 font-semibold text-gray-700">Date</th>}
                  {visibleColumns.includes('time') && <th className="p-3 font-semibold text-gray-700">Time</th>}
                  {visibleColumns.includes('provider') && <th className="p-3 font-semibold text-gray-700">Provider</th>}
                  {visibleColumns.includes('location') && <th className="p-3 font-semibold text-gray-700">Location</th>}
                  {visibleColumns.includes('type') && <th className="p-3 font-semibold text-gray-700">Type</th>}
                  {visibleColumns.includes('priority') && <th className="p-3 font-semibold text-gray-700">Priority</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-sm text-gray-500">Loading appointments...</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-10 text-center text-sm text-gray-500">No appointments match your filters.</td>
                  </tr>
                ) : (
                  filtered.map((a, idx) => (
                    <tr key={a.id} className={`border-t hover:bg-blue-50 transition ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="p-3">
                        <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggleRow(a.id)} className="w-4 h-4 text-blue-600 rounded" />
                      </td>
                      <td className="p-3 font-semibold text-blue-600">{a.id}</td>
                      <td className="p-3 font-medium text-gray-900">{patientNames.get(a.patientId) || a.patientId}</td>
                      <td className="p-3">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(a.status)}`}>
                          {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                        </span>
                      </td>
                      {visibleColumns.includes('date') && <td className="p-3 text-gray-600">{formatToMMDDYYYY(a.appointmentStartDate)}</td>}
                      {visibleColumns.includes('time') && <td className="p-3 text-gray-600">{a.appointmentStartTime}</td>}
                      {visibleColumns.includes('provider') && <td className="p-3 text-gray-600">{providers.find(p => p.id === a.providerId)?.name || a.providerId}</td>}
                      {visibleColumns.includes('location') && <td className="p-3 text-gray-600">{locations.find(l => l.id === a.locationId)?.name || '—'}</td>}
                      {visibleColumns.includes('type') && <td className="p-3 text-gray-600">{a.visitType}</td>}
                      {visibleColumns.includes('priority') && <td className="p-3 text-gray-600">{a.priority}</td>}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* PAGINATION */}
          <div className="border-t px-4 py-3 flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span>{totalElements} total records</span>
              {selected.size > 0 && <span className="text-blue-600">{selected.size} selected</span>}
              <div className="flex items-center gap-2">
                <span>Show:</span>
                <select 
                  value={pageSize} 
                  onChange={(e) => changePageSize(Number(e.target.value))}
                  className="border rounded px-2 py-1"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
            
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => goToPage(0)}
                  disabled={currentPage === 0}
                  className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  First
                </button>
                <button 
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 0}
                  className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i;
                    } else if (currentPage < 3) {
                      pageNum = i;
                    } else if (currentPage > totalPages - 4) {
                      pageNum = totalPages - 5 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => goToPage(pageNum)}
                        className={`px-3 py-1 border rounded ${
                          currentPage === pageNum 
                            ? 'bg-blue-600 text-white border-blue-600' 
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        {pageNum + 1}
                      </button>
                    );
                  })}
                </div>
                
                <button 
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage >= totalPages - 1}
                  className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
                <button 
                  onClick={() => goToPage(totalPages - 1)}
                  disabled={currentPage >= totalPages - 1}
                  className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Last
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
