"use client";
import { getEnv } from "@/utils/env";
import React, { useEffect, useMemo, useState } from "react";

// Inline type (summary row)
export interface LabResultDto {
  id?: number;
  patientId: number;
  encounterId?: number;
  procedureName?: string;   // e.g. Hemoglobin Test
  testCode?: string;        // 1001
  testName?: string;        // Hemoglobin
  status?: string;          // Pending | Preliminary | Final | Corrected | Amended
  specimen?: string;        // blood
  collectedDate?: string;   // YYYY-MM-DD
  reportedDate?: string;    // YYYY-MM-DD
  abnormalFlag?: string | null; // Low | High | Critical | Abnormal | Normal
  value?: string;           // 9
  units?: string;           // g/dL
  referenceRange?: string;  // 12.1 - 15.1
  notes?: string;
  recommendations?: string;
  signed?: boolean;
  signedAt?: string;
  signedBy?: string;
}

interface LabResultsTableProps { patientId?: number; encounterId?: number }
type ToastState = { type: "success" | "error" | "info"; text: string } | null;

// Helper (same pattern as LabOrderPage)
// Reserved for future backend integration (kept pattern consistent)
// function resolveOrgId(): string {
//   if (typeof window !== 'undefined') {
//     const v = (localStorage.getItem('orgId') || '').trim();
//     if (v) return v;
//   }
//   return (getEnv("NEXT_PUBLIC_ORG_ID") || '1').toString();
// }

// Status badge color helper
function statusBadgeClasses(status?: string) {
  const s = (status || '').toLowerCase();
  if (s === 'final') return 'bg-green-100 text-green-800 ring-1 ring-green-200';
  if (s === 'preliminary' || s === 'pending') return 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200';
  if (s === 'corrected' || s === 'amended') return 'bg-blue-100 text-blue-800 ring-1 ring-blue-200';
  return 'bg-gray-100 text-gray-800 ring-1 ring-gray-200';
}

// Abnormal flag color
function abnormalClasses(flag?: string | null) {
  const f = (flag || '').toLowerCase();
  if (!f || f === 'normal') return 'bg-gray-50 text-gray-600 ring-1 ring-gray-200';
  if (f === 'low') return 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200';
  if (f === 'high') return 'bg-orange-50 text-orange-700 ring-1 ring-orange-200';
  if (f === 'critical') return 'bg-red-100 text-red-800 ring-1 ring-red-200';
  return 'bg-purple-50 text-purple-700 ring-1 ring-purple-200';
}

// Simple Modal component (copied pattern)
function Modal({ title, open, onClose, children, footer }: { title: string; open: boolean; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) {
  useEffect(() => {
    function key(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    if (open) document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center overflow-y-auto">
        <div className="w-[min(900px,96vw)] max-h-[85vh] bg-white rounded-lg shadow-xl border flex flex-col mx-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">✕</button>
          </div>
            <div className="px-6 py-4 grow overflow-y-auto">{children}</div>
          <div className="px-6 py-4 border-t flex justify-end gap-2">{footer}</div>
        </div>
      </div>
    </div>
  );
}

export const LabResultsTable: React.FC<LabResultsTableProps> = ({ patientId = 0, encounterId }) => {
  // Mock data (later: load from backend)
  const [results, setResults] = useState<LabResultDto[]>([
    { id: 1, patientId, encounterId, procedureName: 'Hemoglobin Test', testCode: '1001', testName: 'Hemoglobin', status: 'Pending', specimen: 'blood', collectedDate: new Date().toISOString().slice(0,10), reportedDate: '', abnormalFlag: 'low', value: '9', units: 'g/dL', referenceRange: '12.1 - 15.1', recommendations: 'Increase iron intake' },
    { id: 2, patientId, encounterId, procedureName: 'Platelet Count', testCode: '1002', testName: 'Platelets', status: 'Final', specimen: 'blood', collectedDate: new Date().toISOString().slice(0,10), reportedDate: new Date().toISOString().slice(0,10), abnormalFlag: null, value: '250', units: 'x10^3/uL', referenceRange: '150 - 400', recommendations: '' },
  ]);

  // Filters
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [abnFilter, setAbnFilter] = useState('all');

  // Selection & modal
  const [selected, setSelected] = useState<LabResultDto | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editDraft, setEditDraft] = useState<LabResultDto | null>(null);

  // Toast
  const [toast, setToast] = useState<ToastState>(null);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2400); return () => clearTimeout(t); }, [toast]);

  const filtered = useMemo(() => {
    return results.filter(r => {
      const hay = [r.procedureName, r.testName, r.testCode, r.value, r.units].filter(Boolean).join(' ').toLowerCase();
      const q = query.trim().toLowerCase();
      const matchesQ = !q || hay.includes(q);
      const matchesS = statusFilter === 'all' || (r.status || '').toLowerCase() === statusFilter;
      const abn = (r.abnormalFlag || 'normal').toLowerCase();
      const matchesA = abnFilter === 'all' || abn === abnFilter;
      return matchesQ && matchesS && matchesA;
    });
  }, [results, query, statusFilter, abnFilter]);

  // Pagination (LabOrder style)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  useEffect(() => { setPage(1); }, [query, statusFilter, abnFilter, results]);
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, total);
  const pageItems = filtered.slice(startIndex, endIndex);

  function openView(r: LabResultDto) { setSelected(r); setEditDraft(r); setModalOpen(true); }
  function openNew() {
    setSelected(null);
    setEditDraft({ patientId, encounterId, status: 'Pending', collectedDate: new Date().toISOString().slice(0,10) });
    setModalOpen(true);
  }
  function closeModal() { setModalOpen(false); setSelected(null); setEditDraft(null); }
  function updateDraft<K extends keyof LabResultDto>(key: K, value: LabResultDto[K]) { if (!editDraft) return; setEditDraft({ ...editDraft, [key]: value }); }

  function saveEdit() {
    if (!editDraft) return;
    // Create new if no id yet
    // Required field validation
    const requiredFields: (keyof LabResultDto)[] = ['testName','value','collectedDate','status'];
    const missing = requiredFields.filter(f => !editDraft[f] || (typeof editDraft[f] === 'string' && (editDraft[f] as string).trim() === ''));
    if (missing.length) {
      setToast({ type: 'error', text: `Missing required: ${missing.join(', ')}` });
      return;
    }
    if (editDraft.id == null) {
      const nextId = Math.max(0, ...results.map(r => r.id || 0)) + 1;
      const newResult: LabResultDto = { ...editDraft, id: nextId };
      setResults(prev => [...prev, newResult]);
      setToast({ type: 'success', text: 'Result created' });
      closeModal();
      return;
    }
    // Update existing
    setResults(prev => prev.map(r => r.id === editDraft.id ? editDraft : r));
    setToast({ type: 'success', text: 'Result updated' });
    closeModal();
  }


  function deleteResult(id?: number) {
    if (id == null) return;
    setResults(prev => prev.filter(r => r.id !== id));
    setToast({ type: 'info', text: 'Result deleted' });
  }

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded shadow text-sm font-medium border ${toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>{toast.text}</div>
      )}

      {/* Top header row with button (match LabOrderPage layout) */}
      <div className="flex items-center justify-between">
        <div />
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm"
        >
          <span className="text-lg leading-none">＋</span>
          <span>New Result</span>
        </button>
      </div>

      {/* Filters row below header */}
      <div className="grid md:grid-cols-5 gap-3 items-end text-sm">
        <div className="md:col-span-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search test/code/value"
            className="w-full border rounded-lg px-3 py-2 bg-white"
          />
        </div>
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 bg-white"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="preliminary">Preliminary</option>
            <option value="final">Final</option>
            <option value="corrected">Corrected</option>
            <option value="amended">Amended</option>
          </select>
        </div>
        <div>
          <select
            value={abnFilter}
            onChange={(e) => setAbnFilter(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 bg-white"
          >
            <option value="all">All Flags</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
            <option value="abnormal">Abnormal</option>
          </select>
        </div>
        {/* Placeholder cell to balance grid like LabOrder (can be used later for an extra filter) */}
        <div className="hidden md:block" />
      </div>
      <div className="rounded-lg border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Test</th>
              <th className="text-left px-4 py-3 font-semibold">Value</th>
              <th className="text-left px-4 py-3 font-semibold">Range</th>
              <th className="text-left px-4 py-3 font-semibold">Abn</th>
              <th className="text-left px-4 py-3 font-semibold">Status</th>
              <th className="text-left px-4 py-3 font-semibold">Collected</th>
              <th className="text-left px-4 py-3 font-semibold">Reported</th>
              <th className="text-right px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map(r => (
              <tr key={r.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-900">
                  <div className="font-medium">{r.testName || r.procedureName || '—'}</div>
                  <div className="text-xs text-gray-500">{r.testCode || '—'}</div>
                </td>
                <td className="px-4 py-3 text-gray-900">
                  <div>{r.value || '—'} {r.units}</div>
                </td>
                <td className="px-4 py-3 text-gray-700 text-xs">{r.referenceRange || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block text-xs px-2 py-1 rounded-full ${abnormalClasses(r.abnormalFlag)}`}>{(r.abnormalFlag || 'Normal').toUpperCase()}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block text-xs px-2 py-1 rounded-full ${statusBadgeClasses(r.status)}`}>{(r.status || '—').toUpperCase()}</span>
                </td>
                <td className="px-4 py-3 text-gray-700 text-xs">{r.collectedDate || '—'}</td>
                <td className="px-4 py-3 text-gray-700 text-xs">{r.reportedDate || '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => openView(r)} title="View/Edit" className="p-2 rounded-md hover:bg-blue-50 text-blue-700">✏️</button>
                    <button onClick={() => deleteResult(r.id)} title="Delete" className="p-2 rounded-md hover:bg-red-50 text-red-600">🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-gray-500">No results match filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls (placed outside container like LabOrderPage) */}
      <div className="flex items-center justify-between px-2 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="px-3 py-1 border rounded bg-white hover:bg-gray-50 "
            disabled={page <= 1}
          >Prev</button>
          <div className="text-sm text-gray-600">Page {page} of {totalPages}</div>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            className="px-3 py-1 border rounded bg-white hover:bg-gray-50"
            disabled={page >= totalPages}
          >Next</button>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">{total === 0 ? 'Showing 0' : `Showing ${startIndex + 1}-${endIndex} of ${total}`}</div>
          <select
            value={pageSize}
            onChange={e => setPageSize(Number(e.target.value))}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {/* <div className="text-[11px] text-gray-500">Read-only summary with modal editing. Connect backend for persistence.</div> */}

      {/* Edit Modal */}
      <Modal
  title={selected ? (selected.testName || selected.procedureName || 'Result') : editDraft?.id == null ? 'New Result' : 'Result'}
        open={modalOpen}
        onClose={closeModal}
        footer={editDraft && (
          <>
            <button onClick={closeModal} className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-sm">Close</button>
            <button onClick={saveEdit} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm">Save</button>
          </>
        )}
      >
        {editDraft ? (
          <div className="space-y-6 text-sm">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="block">
                  <span className="text-gray-600 text-xs">Test Name <span className="text-red-600">*</span></span>
                  <input value={editDraft.testName || ''} onChange={e => updateDraft('testName', e.target.value)} className="mt-1 w-full border rounded px-3 py-2" />
                </label>
                <label className="block">
                  <span className="text-gray-600 text-xs">Test Code</span>
                  <input value={editDraft.testCode || ''} onChange={e => updateDraft('testCode', e.target.value)} className="mt-1 w-full border rounded px-3 py-2 font-mono" />
                </label>
                <label className="block">
                  <span className="text-gray-600 text-xs">Specimen</span>
                  <input value={editDraft.specimen || ''} onChange={e => updateDraft('specimen', e.target.value)} className="mt-1 w-full border rounded px-3 py-2" />
                </label>
                <label className="block">
                  <span className="text-gray-600 text-xs">Collected Date (YYYY-MM-DD) <span className="text-red-600">*</span></span>
                  <input value={editDraft.collectedDate || ''} onChange={e => updateDraft('collectedDate', e.target.value)} className="mt-1 w-full border rounded px-3 py-2" />
                </label>
                <label className="block">
                  <span className="text-gray-600 text-xs">Reported Date (YYYY-MM-DD)</span>
                  <input value={editDraft.reportedDate || ''} onChange={e => updateDraft('reportedDate', e.target.value)} className="mt-1 w-full border rounded px-3 py-2" />
                </label>
              </div>
              <div className="space-y-3">
                <label className="block">
                  <span className="text-gray-600 text-xs">Status <span className="text-red-600">*</span></span>
                  <select value={editDraft.status || 'Pending'} onChange={e => updateDraft('status', e.target.value)} className="mt-1 w-full border rounded px-3 py-2">
                    {['Pending','Preliminary','Final','Corrected','Amended'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-gray-600 text-xs">Abnormal Flag</span>
                  <select value={editDraft.abnormalFlag || ''} onChange={e => updateDraft('abnormalFlag', e.target.value || null)} className="mt-1 w-full border rounded px-3 py-2">
                    <option value="">Normal</option>
                    <option value="Low">Low</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                    <option value="Abnormal">Abnormal</option>
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-gray-600 text-xs">Value <span className="text-red-600">*</span></span>
                    <input value={editDraft.value || ''} onChange={e => updateDraft('value', e.target.value)} className="mt-1 w-full border rounded px-3 py-2" />
                  </label>
                  <label className="block">
                    <span className="text-gray-600 text-xs">Units</span>
                    <input value={editDraft.units || ''} onChange={e => updateDraft('units', e.target.value)} className="mt-1 w-full border rounded px-3 py-2" />
                  </label>
                </div>
                <label className="block">
                  <span className="text-gray-600 text-xs">Reference Range</span>
                  <input value={editDraft.referenceRange || ''} onChange={e => updateDraft('referenceRange', e.target.value)} className="mt-1 w-full border rounded px-3 py-2" />
                </label>
              </div>
            </div>
            <label className="block">
              <span className="text-gray-600 text-xs">Recommendations</span>
              <textarea rows={2} value={editDraft.recommendations || ''} onChange={e => updateDraft('recommendations', e.target.value)} className="mt-1 w-full border rounded px-3 py-2" />
            </label>
            <label className="block">
              <span className="text-gray-600 text-xs">Notes</span>
              <textarea rows={3} value={editDraft.notes || ''} onChange={e => updateDraft('notes', e.target.value)} className="mt-1 w-full border rounded px-3 py-2" />
            </label>
            {editDraft.signed && (
              <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2 inline-flex items-center gap-2">
                <span>✔ Signed</span>
                <span>{editDraft.signedAt?.slice(0,19).replace('T',' ')}</span>
                <span className="text-gray-500">{editDraft.signedBy}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500">No result selected.</div>
        )}
      </Modal>
    </div>
  );
};

export default LabResultsTable;
