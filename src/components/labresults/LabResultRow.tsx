"use client";
import React from "react";
import DateInput from "@/components/ui/DateInput";

// Inline LabResultDto (kept consistent with definition in LabResultsTable)
export interface LabResultDto {
  id?: number;
  patientId: number;
  encounterId?: number;
  labOrderId?: number;
  orderNumber?: string;
  procedureName?: string;
  testCode?: string;
  testName?: string;
  status?: string;
  specimen?: string;
  collectedDate?: string;
  reportedDate?: string;
  abnormalFlag?: string | null;
  value?: string;
  units?: string;
  referenceRange?: string;
  recommendations?: string;
  notes?: string;
  signed?: boolean;
  signedAt?: string;
  signedBy?: string;
}

export interface LabResultRowProps {
  result: LabResultDto;
  onChange: (patch: Partial<LabResultDto>) => void;
  onRemove?: () => void;
  disableRemove?: boolean;
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-2 py-2 align-top ${className}`}>{children}</td>;
}

export const LabResultRow: React.FC<LabResultRowProps> = ({ result, onChange, onRemove, disableRemove }) => {
  return (
    <tr className="border-t hover:bg-gray-50">
      <Td>
        <div className="flex items-center gap-1 mb-1">
          <button
            type="button"
            disabled={disableRemove}
            onClick={onRemove}
            title="Remove row"
            className={`w-6 h-6 flex items-center justify-center rounded border text-[11px] font-semibold ${disableRemove ? "opacity-30 cursor-not-allowed" : "hover:bg-red-50 text-red-600 border-red-200"}`}
          >×</button>
          <input
            value={result.procedureName || ""}
            onChange={(e) => onChange({ procedureName: e.target.value })}
            placeholder="Procedure"
            className="w-40 border rounded px-2 py-1 text-xs"
          />
        </div>
        <input
          value={result.testName || ""}
          onChange={(e) => onChange({ testName: e.target.value })}
          placeholder="Test name"
          className="w-40 border rounded px-2 py-1 text-xs"
        />
      </Td>
      <Td>
        <input
          value={result.testCode || ""}
          onChange={(e) => onChange({ testCode: e.target.value.replace(/[^0-9\-.]/g, '') })}
          placeholder="12345"
          className="w-28 border rounded px-2 py-1 text-xs font-mono"
        />
        <select
          value={result.status || "Pending"}
          onChange={(e) => onChange({ status: e.target.value })}
          className="mt-1 w-28 border rounded px-2 py-1 text-xs"
        >
          <option value="Pending">Pending</option>
          <option value="Preliminary">Preliminary</option>
          <option value="Partial">Partial</option>
          <option value="Final">Final</option>
          <option value="Corrected">Corrected</option>
          <option value="Amended">Amended</option>
        </select>
      </Td>
      <Td>
        <input
          value={result.specimen || ""}
          onChange={(e) => onChange({ specimen: e.target.value })}
          placeholder="Specimen"
          className="w-28 border rounded px-2 py-1 text-xs"
        />
        <DateInput
          value={result.collectedDate || ""}
          onChange={(e) => {
            const v = e.target.value;
            const updates: Record<string, unknown> = { collectedDate: v };
            // Clear reported date if it's now before the new collected date
            if (v && result.reportedDate && result.reportedDate < v) {
              updates.reportedDate = "";
            }
            onChange(updates);
          }}
          placeholder="Collected YYYY-MM-DD"
          className="mt-1 w-36 border rounded px-2 py-1 text-xs"
        />
      </Td>
      <Td>
        <DateInput
          value={result.reportedDate || ""}
          min={result.collectedDate || undefined}
          onChange={(e) => {
            const v = e.target.value;
            if (result.collectedDate && v && v < result.collectedDate) return;
            onChange({ reportedDate: v });
          }}
          placeholder="Reported YYYY-MM-DD"
          className={`w-36 border rounded px-2 py-1 text-xs ${result.reportedDate && result.collectedDate && result.reportedDate < result.collectedDate ? "border-red-400" : ""}`}
        />
        {result.reportedDate && result.collectedDate && result.reportedDate < result.collectedDate && (
          <p className="text-[10px] text-red-500 mt-0.5">Must be after collected date</p>
        )}
        <select
          value={result.abnormalFlag || ""}
          onChange={(e) => onChange({ abnormalFlag: e.target.value || null })}
          className="mt-1 w-32 border rounded px-2 py-1 text-xs"
        >
          <option value="">Normal</option>
          <option value="Low">Low</option>
          <option value="High">High</option>
          <option value="Critical">Critical</option>
          <option value="Abnormal">Abnormal</option>
        </select>
      </Td>
      <Td>
        <input
          value={result.value || ""}
          onChange={(e) => onChange({ value: e.target.value })}
          placeholder="Value"
          className="w-24 border rounded px-2 py-1 text-xs text-right"
        />
        <input
          value={result.units || ""}
          onChange={(e) => onChange({ units: e.target.value })}
          placeholder="Units"
          className="mt-1 w-20 border rounded px-2 py-1 text-xs"
        />
      </Td>
      <Td>
        <input
          value={result.referenceRange || ""}
          onChange={(e) => onChange({ referenceRange: e.target.value })}
          placeholder="Range"
          className="w-32 border rounded px-2 py-1 text-xs"
        />
        <textarea
          value={result.recommendations || ""}
          onChange={(e) => onChange({ recommendations: e.target.value })}
          placeholder="Recommendations"
          rows={2}
          className="mt-1 w-40 border rounded px-2 py-1 text-xs resize-none"
        />
      </Td>
      <Td>
        <textarea
          value={result.notes || ""}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder="Notes"
          rows={3}
          className="w-48 border rounded px-2 py-1 text-xs resize-none"
        />
      </Td>
      <Td className="text-center">
        <label className="flex items-center justify-center gap-1 text-[11px]">
          <input
            type="checkbox"
            checked={!!result.signed}
            onChange={(e) => onChange({ signed: e.target.checked, signedAt: e.target.checked ? new Date().toISOString() : undefined })}
          />
          Signed
        </label>
      </Td>
    </tr>
  );
};

export default LabResultRow;
