'use client';

import React, { useState, useEffect, useRef, useCallback } from "react";
import AdminLayout from '@/app/(admin)/layout';
import { fetchWithAuth } from '@/utils/fetchWithAuth';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';

interface Provider { id: number; name: string; }
interface Encounter {
  id: number;
  patientId: number;
  patientName?: string;
  primaryInsurance?: string;
  secondaryInsurance?: string;
  encounterDate: string;
  encounterProvider: string;
  status: string | null;
  type: string;
  diagnosis: string | null;
  reasonForVisit: string;
  visitCategory: string;
}

const fetchPatientName = async (id: number): Promise<string> => {
  try {
    const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/patients/${id}`);
    if (!res.ok) return `Patient ${id}`;
    const data = await res.json();
    return `${data.data.firstName} ${data.data.lastName}`;
  } catch {
    return `Patient ${id}`;
  }
};

export default function EncounterReportPage() {
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [provider, setProvider] = useState('All Providers');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'signed' | 'unsigned'>('all');
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['patientName', 'date', 'provider', 'type', 'status', 'diagnosis']);
  const [draftVisibleColumns, setDraftVisibleColumns] = useState<string[]>(['patientName', 'date', 'provider', 'type', 'status', 'diagnosis']);
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [patientNames, setPatientNames] = useState<Map<number, string>>(new Map());
  const startDateRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/providers`);
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

  // Default date range
  useEffect(() => {
    const today = new Date();
    const lastMonth = new Date(today);
    lastMonth.setMonth(today.getMonth() - 1);
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setStartDate(fmt(lastMonth));
    setEndDate(fmt(today));
  }, []);

  useEffect(() => {
    if (startDateRef.current) {
      flatpickr(startDateRef.current, {
        dateFormat: 'Y-m-d',
        disableMobile: true,
        onChange: (selectedDates, dateStr) => {
          setStartDate(dateStr);
        }
      });
    }
    if (endDateRef.current) {
      flatpickr(endDateRef.current, {
        dateFormat: 'Y-m-d',
        disableMobile: true,
        onChange: (selectedDates, dateStr) => {
          setEndDate(dateStr);
        }
      });
    }
  }, []);

  const fetchEncounters = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: '0',
        size: '1000'
      });
      // Load all data for client-side filtering

      const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/encounters/report/encounterAll?${params}`);
      if (!response.ok) throw new Error('Failed to fetch encounters');
      const result = await response.json();
      
      const payload = result?.data ?? {};
      const encounterList = payload.content ?? result.data ?? [];
      
      setEncounters(Array.isArray(encounterList) ? encounterList : []);
      
      // Load patient names for all encounters
      if (Array.isArray(encounterList)) {
        const uniquePatientIds = [...new Set(encounterList.map((e: Encounter) => e.patientId))];
        
        const namePromises = uniquePatientIds.map(async (id) => {
          const name = await fetchPatientName(id);
          return { id, name };
        });
        
        const nameResults = await Promise.all(namePromises);
        const namesMap = new Map(nameResults.map(({ id, name }) => [id, name]));
        setPatientNames(namesMap);
      }
    } catch (error) {
      console.error('Failed to fetch encounters:', error);
      setEncounters([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEncounters();
  }, [fetchEncounters]);

  // Client-side filtering
  const filteredEncounters = encounters.filter(e => {
    // Search filter
    const searchMatch = !search || 
      (patientNames.get(e.patientId) || '').toLowerCase().includes(search.toLowerCase()) ||
      String(e.id).includes(search) ||
      String(e.patientId).includes(search) ||
      e.encounterProvider.toLowerCase().includes(search.toLowerCase());

    // Date range filter
    const encounterDate = new Date(e.encounterDate);
    const fromDate = startDate ? new Date(startDate) : null;
    const toDate = endDate ? new Date(endDate + 'T23:59:59') : null;
    const dateMatch = (!fromDate || encounterDate >= fromDate) && 
                     (!toDate || encounterDate <= toDate);

    // Provider filter
    const selectedProvider = providers.find(p => p.name === provider);
    const providerMatch = provider === 'All Providers' || 
                         (selectedProvider && e.encounterProvider.toLowerCase().includes(selectedProvider.name.toLowerCase())) ||
                         e.encounterProvider.toLowerCase().includes(provider.toLowerCase());

    // Status filter
    const status = (e.status || '').toLowerCase();
    const statusMatch = statusFilter === 'all' || 
                       (statusFilter === 'signed' && status === 'signed') ||
                       (statusFilter === 'unsigned' && (!status || status === 'unsigned'));

    return searchMatch && dateMatch && providerMatch && statusMatch;
  }).sort((a, b) => a.id - b.id);

  // Client-side pagination
  const startIndex = currentPage * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedEncounters = filteredEncounters.slice(startIndex, endIndex);
  const totalFilteredElements = filteredEncounters.length;
  const totalFilteredPages = Math.ceil(totalFilteredElements / pageSize);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [search, startDate, endDate, provider, statusFilter]);

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelected(new Set());
    } else {
      setSelected(new Set(paginatedEncounters.map(e => e.id)));
    }
    setSelectAll(!selectAll);
  };

  const toggleRow = (id: number) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
    setSelectAll(next.size === paginatedEncounters.length);
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

  const applyFilters = () => {
    setVisibleColumns(draftVisibleColumns);
    setShowFilters(false);
  };

  const downloadCSV = () => {
    const dataToExport = selected.size > 0 ? filteredEncounters.filter(e => selected.has(e.id)) : filteredEncounters;
    const headers = ['Encounter ID'];
    if (visibleColumns.includes('patientName')) headers.push('Patient Name');
    if (visibleColumns.includes('date')) headers.push('Date');
    if (visibleColumns.includes('provider')) headers.push('Provider');
    if (visibleColumns.includes('type')) headers.push('Type');
    if (visibleColumns.includes('status')) headers.push('Status');
    if (visibleColumns.includes('diagnosis')) headers.push('Diagnosis');
    if (visibleColumns.includes('primaryInsurance')) headers.push('Primary Insurance');
    if (visibleColumns.includes('secondaryInsurance')) headers.push('Secondary Insurance');
    
    const rows = dataToExport.map(e => {
      const row = [e.id];
      if (visibleColumns.includes('patientName')) row.push(patientNames.get(e.patientId) || e.patientId);
      if (visibleColumns.includes('date')) row.push(e.encounterDate);
      if (visibleColumns.includes('provider')) row.push(e.encounterProvider);
      if (visibleColumns.includes('type')) row.push(e.type);
      if (visibleColumns.includes('status')) row.push(e.status || 'Unsigned');
      if (visibleColumns.includes('diagnosis')) row.push(e.diagnosis || 'N/A');
      if (visibleColumns.includes('primaryInsurance')) row.push(e.primaryInsurance || '-');
      if (visibleColumns.includes('secondaryInsurance')) row.push(e.secondaryInsurance || '-');
      return row.join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'encounter_report.csv';
    a.click();
  };

  const printTable = () => {
    const dataToExport = selected.size > 0 ? filteredEncounters.filter(e => selected.has(e.id)) : filteredEncounters;
    const tableHeaders = `
      <tr>
        <th>Encounter ID</th>
        ${visibleColumns.includes('patientName') ? '<th>Patient Name</th>' : ''}
        ${visibleColumns.includes('date') ? '<th>Date</th>' : ''}
        ${visibleColumns.includes('provider') ? '<th>Provider</th>' : ''}
        ${visibleColumns.includes('type') ? '<th>Type</th>' : ''}
        ${visibleColumns.includes('status') ? '<th>Status</th>' : ''}
        ${visibleColumns.includes('diagnosis') ? '<th>Diagnosis</th>' : ''}
        ${visibleColumns.includes('primaryInsurance') ? '<th>Primary Ins</th>' : ''}
        ${visibleColumns.includes('secondaryInsurance') ? '<th>Secondary Ins</th>' : ''}
      </tr>
    `;
    
    const tableRows = dataToExport.map(e => `
      <tr>
        <td>${e.id}</td>
        ${visibleColumns.includes('patientName') ? `<td>${patientNames.get(e.patientId) || `Patient ${e.patientId}`}</td>` : ''}
        ${visibleColumns.includes('date') ? `<td>${new Date(e.encounterDate).toLocaleString()}</td>` : ''}
        ${visibleColumns.includes('provider') ? `<td>${e.encounterProvider}</td>` : ''}
        ${visibleColumns.includes('type') ? `<td>${e.type}</td>` : ''}
        ${visibleColumns.includes('status') ? `<td>${getStatusText(e.status)}</td>` : ''}
        ${visibleColumns.includes('diagnosis') ? `<td>${e.diagnosis || 'N/A'}</td>` : ''}
        ${visibleColumns.includes('primaryInsurance') ? `<td>${e.primaryInsurance || '-'}</td>` : ''}
        ${visibleColumns.includes('secondaryInsurance') ? `<td>${e.secondaryInsurance || '-'}</td>` : ''}
      </tr>
    `).join('');
    
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

  const getStatusColor = (status: string | null) => {
    const s = (status || '').toUpperCase();
    if (!s || s === 'UNSIGNED') return 'bg-orange-100 text-orange-800';
    if (s === 'SIGNED') return 'bg-green-100 text-green-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status: string | null) => {
    if (!status) return 'UNSIGNED';
    return status.toUpperCase();
  };

  return (
    <AdminLayout>
      <div className="flex flex-col h-full gap-4">
        <div className="bg-white rounded-lg border p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Patient/Encounter ID"
              className="px-4 py-2 border rounded-lg"
            />
            <div className="relative">
              <input
                ref={startDateRef}
                type="text"
                value={startDate}
                placeholder="Start Date"
                readOnly
                className="px-4 py-2 border rounded-lg w-full cursor-pointer"
              />
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <div className="relative">
              <input
                ref={endDateRef}
                type="text"
                value={endDate}
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
              {providers.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          </div>

          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="all">All Status</option>
              <option value="signed">Signed</option>
              <option value="unsigned">Unsigned</option>
            </select>
            <button onClick={() => setShowFilters(!showFilters)} className="px-4 py-2 border rounded-lg">Customize</button>
            <button onClick={downloadCSV} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">Export CSV</button>
            <button onClick={printTable} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              Print
            </button>
          </div>

          {showFilters && (
            <div className="border-t pt-4 mt-4">
              <p className="text-xs font-semibold mb-3 text-gray-500">SHOW COLUMNS</p>
              <div className="flex flex-wrap gap-4">
                {['patientName', 'date', 'provider', 'type', 'status', 'diagnosis', 'primaryInsurance', 'secondaryInsurance'].map(col => (
                  <label key={col} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={draftVisibleColumns.includes(col)}
                      onChange={() => setDraftVisibleColumns(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col])}
                    />
                    <span className="text-sm">
                      {col === 'patientName' ? 'Patient Name' :
                       col === 'date' ? 'Date' :
                       col === 'provider' ? 'Provider' :
                       col === 'type' ? 'Type' :
                       col === 'status' ? 'Status' :
                       col === 'diagnosis' ? 'Diagnosis' :
                       col === 'primaryInsurance' ? 'Primary Insurance' : 'Secondary Insurance'}
                    </span>
                  </label>
                ))}
                <button onClick={applyFilters} className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-lg">Apply Filter</button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white border rounded-lg overflow-hidden">
          {startDate && endDate && new Date(endDate) < new Date(startDate) && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 m-4" role="alert">
              <p className="font-bold">Invalid Date Range</p>
              <p>End date cannot be before start date. Please enter dates properly.</p>
            </div>
          )}
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <tr>
                  <th className="p-3 w-12"><input type="checkbox" checked={selectAll} onChange={toggleSelectAll} className="w-4 h-4 text-blue-600 rounded" /></th>
                  <th className="p-3 text-left font-medium text-gray-700">Encounter ID</th>
                  {visibleColumns.includes('patientName') && <th className="p-3 text-left font-medium text-gray-700">Patient Name</th>}
                  {visibleColumns.includes('date') && <th className="p-3 text-left font-medium text-gray-700">Date</th>}
                  {visibleColumns.includes('provider') && <th className="p-3 text-left font-medium text-gray-700">Provider</th>}
                  {visibleColumns.includes('type') && <th className="p-3 text-left font-medium text-gray-700">Type</th>}
                  {visibleColumns.includes('status') && <th className="p-3 text-left font-medium text-gray-700">Status</th>}
                  {visibleColumns.includes('diagnosis') && <th className="p-3 text-left font-medium text-gray-700">Diagnosis</th>}
                  {visibleColumns.includes('primaryInsurance') && <th className="p-3 text-left font-medium text-gray-700">Primary Ins</th>}
                  {visibleColumns.includes('secondaryInsurance') && <th className="p-3 text-left font-medium text-gray-700">Secondary Ins</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={11} className="p-8 text-center text-gray-500">Loading encounters...</td></tr>
                ) : filteredEncounters.length === 0 ? (
                  <tr><td colSpan={11} className="p-8 text-center text-gray-500">No encounters found</td></tr>
                ) : (
                  paginatedEncounters.map((encounter, idx) => (
                    <tr key={encounter.id} className={`border-t hover:bg-blue-50 transition ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="p-3 w-12">
                        <input type="checkbox" checked={selected.has(encounter.id)} onChange={() => toggleRow(encounter.id)} className="w-4 h-4 text-blue-600 rounded" />
                      </td>
                      <td className="p-3 font-semibold text-blue-600">{encounter.id}</td>
                      {visibleColumns.includes('patientName') && <td className="p-3 font-medium text-gray-900">{patientNames.get(encounter.patientId) || `Patient ${encounter.patientId}`}</td>}
                      {visibleColumns.includes('date') && <td className="p-3 text-gray-600">{new Date(encounter.encounterDate).toLocaleString()}</td>}
                      {visibleColumns.includes('provider') && <td className="p-3 text-gray-600">{encounter.encounterProvider}</td>}
                      {visibleColumns.includes('type') && <td className="p-3 text-gray-600">{encounter.type}</td>}
                      {visibleColumns.includes('status') && (
                        <td className="p-3">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(encounter.status)}`}>
                            {getStatusText(encounter.status)}
                          </span>
                        </td>
                      )}
                      {visibleColumns.includes('diagnosis') && <td className="p-3 text-gray-600">{encounter.diagnosis || 'N/A'}</td>}
                      {visibleColumns.includes('primaryInsurance') && <td className="p-3 text-gray-600">{encounter.primaryInsurance || '-'}</td>}
                      {visibleColumns.includes('secondaryInsurance') && <td className="p-3 text-gray-600">{encounter.secondaryInsurance || '-'}</td>}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* PAGINATION */}
          <div className="border-t px-4 py-3 flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span>{totalFilteredElements} total records</span>
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
            
            {totalFilteredPages > 1 && (
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
                  {Array.from({ length: Math.min(5, totalFilteredPages) }, (_, i) => {
                    let pageNum;
                    if (totalFilteredPages <= 5) {
                      pageNum = i;
                    } else if (currentPage < 3) {
                      pageNum = i;
                    } else if (currentPage > totalFilteredPages - 4) {
                      pageNum = totalFilteredPages - 5 + i;
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
                  disabled={currentPage >= totalFilteredPages - 1}
                  className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
                <button 
                  onClick={() => goToPage(totalFilteredPages - 1)}
                  disabled={currentPage >= totalFilteredPages - 1}
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