import { getEnv } from "@/utils/env";
import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from "@/utils/fetchWithAuth";
import { Edit, Eye, Paperclip, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";


const API_BASE = "/api/patient-billing";

type ClaimLineDetail = {
  lineid: number;
  dos: number[];
  code: string;
  description: string;
  provider: string;
  totalSubmittedAmount: number;
};

const HistoryClaims: React.FC = () => {
  const router = useRouter();

  const [claims, setClaims] = useState<any[]>([]);
  const [uniqueCarriers, setUniqueCarriers] = useState<string[]>([]);
  const [searchPatient, setSearchPatient] = useState("");
  const [searchClaim, setSearchClaim] = useState("");
  const [filters, setFilters] = useState({ type: "", carrier: "", attachment: "" });
  const [loading, setLoading] = useState(false);
  const [selectedClaims, setSelectedClaims] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [hiddenClaims, setHiddenClaims] = useState<Set<number>>(new Set());

  // ✅ Patient search
  const [patientSearchQuery, setPatientSearchQuery] = useState("");
  const [patientSearchResults, setPatientSearchResults] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  const [showChangeStatusModal, setShowChangeStatusModal] = useState(false);
  const [showVoidRecreateModal, setShowVoidRecreateModal] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [showEditNarrativeModal, setShowEditNarrativeModal] = useState(false);
  const [selectedClaimForAction, setSelectedClaimForAction] = useState<any>(null);
  const [narrativeText, setNarrativeText] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [statusToChange, setStatusToChange] = useState("");
  const [remittanceDate, setRemittanceDate] = useState("");
  const [insurancePaymentAmount, setInsurancePaymentAmount] = useState("");

  // Line details modal
  const [showLineDetailsModal, setShowLineDetailsModal] = useState(false);
  const [lineDetails, setLineDetails] = useState<ClaimLineDetail[]>([]);
  const [lineDetailsLoading, setLineDetailsLoading] = useState(false);

  // ✅ Patient search API call
  const searchPatientsAPI = async (query: string) => {
    if (!query || query.length < 2) {
      setPatientSearchResults([]);
      return;
    }

    try {
      const API_URL = getEnv("NEXT_PUBLIC_API_URL");
      const res = await fetchWithAuth(
        `${API_URL}/api/all-claims/patient-search?query=${encodeURIComponent(query)}&page=0&size=20`
      );
      
      if (!res.ok) throw new Error("Failed to search patients");
      
      const response = await res.json();
      setPatientSearchResults(response.data?.content || []);
      setShowPatientDropdown(true);
    } catch (err: unknown) {
      console.error("Patient search error:", err);
      setPatientSearchResults([]);
    }
  };

  // ✅ Debounce patient search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (patientSearchQuery) {
        searchPatientsAPI(patientSearchQuery);
      } else {
        setPatientSearchResults([]);
        setShowPatientDropdown(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [patientSearchQuery]);

  // ✅ Load claims by patient ID
  const loadClaimsByPatient = async (patientId: number) => {
    setLoading(true);
    const API_URL = getEnv("NEXT_PUBLIC_API_URL");

    try {
      const res = await fetchWithAuth(`${API_URL}/api/all-claims/patient/${patientId}/claims`);
      if (!res.ok) throw new Error("Failed to fetch patient claims");

      const response = await res.json();
      setClaims(response.data || []);
      setUniqueCarriers(
        Array.from(new Set((response.data || []).map((c: any) => String(c.provider)).filter(Boolean)))
      );
      setError(null);
    } catch (err: unknown) {
      setError((err as Error).message ||"Error fetching patient claims");
    } finally {
      setLoading(false);
    }
  };

  // ✅ patientId
  const patientId = typeof window !== "undefined" ? localStorage.getItem("patientId") : 1;

  // ✅ Select functions
  const selectAll = () => {
    if (selectedClaims.size === filteredClaims.length) {
      setSelectedClaims(new Set());
    } else {
      setSelectedClaims(new Set(filteredClaims.map((claim: any) => claim.id)));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedClaims(prev => {
      const newSet = new Set(prev);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return newSet;
    });
  };

  const selectedCount = selectedClaims.size;

  // ✅ Print functionality
  const handlePrint = () => {
    window.print();
  };

  // ✅ Navigate to patient page
  const navigateToPatientBilling = (patientId: number) => {
    if (patientId) {
      router.push(`/patients/${patientId}`);
    }
  };

  // ✅ Fetch claim line details
  const fetchLineDetails = async (claimId: number) => {
    setLineDetailsLoading(true);
    const API_URL = getEnv("NEXT_PUBLIC_API_URL");

    try {
      const res = await fetchWithAuth(`${API_URL}/api/all-claims/${claimId}/line-details`);
      if (!res.ok) throw new Error("Failed to fetch line details");
      
      const response = await res.json();
      setLineDetails(response.data || []);
      setShowLineDetailsModal(true);
    } catch (err: unknown) {
      console.error("Error fetching line details:", err);
      alert("Failed to load procedure details");
    } finally {
      setLineDetailsLoading(false);
    }
  };

  // ✅ Change Status
  const handleChangeStatus = async () => {
    if (!statusToChange || selectedClaims.size === 0) return;
    setActionLoading(true);
    setActionError(null);

    try {
      const API_URL = getEnv("NEXT_PUBLIC_API_URL");

      for (const claimId of selectedClaims) {
        await fetchWithAuth(
          `${API_URL}/api/all-claims/${claimId}/status`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status: statusToChange,
              remitDate: remittanceDate,
              paymentAmount: insurancePaymentAmount
            })
          }
        );
      }

      setShowChangeStatusModal(false);
      setSelectedClaims(new Set());
      setStatusToChange("");
      setRemittanceDate("");
      setInsurancePaymentAmount("");

      await reloadClaims();
    } catch (err: unknown) {
      setActionError((err as Error).message ||"Error changing status");
    } finally {
      setActionLoading(false);
    }
  };

  // ✅ Void & Recreate
  const handleVoidRecreate = async () => {
    if (selectedClaims.size === 0) return;
    setActionLoading(true);
    setActionError(null);

    try {
      const API_URL = getEnv("NEXT_PUBLIC_API_URL");

      for (const claimId of selectedClaims) {
        const res = await fetchWithAuth(
          `${API_URL}/api/all-claims/${claimId}/void-recreate`,
          { method: "POST" }
        );
        if (!res.ok) throw new Error("Failed to void & recreate");
      }

      setShowVoidRecreateModal(false);
      setSelectedClaims(new Set());
      await reloadClaims();
    } catch (err: unknown) {
      setActionError((err as Error).message ||"Error voiding & recreating claims");
    } finally {
      setActionLoading(false);
    }
  };

  // ✅ Reload data
  const reloadClaims = async () => {
    setLoading(true);
    const API_URL = getEnv("NEXT_PUBLIC_API_URL");
    const res = await fetchWithAuth(`${API_URL}/api/all-claims`);
    const data = await res.json();
    setClaims(data);
    setUniqueCarriers(
      Array.from(new Set(data.map((c: any) => String(c.provider)).filter(Boolean)))
    );
    setLoading(false);
  };

  // ✅ Fetch claims initially
  useEffect(() => {
    if (selectedPatientId) {
      loadClaimsByPatient(selectedPatientId);
    } else {
      reloadClaims();
    }
  }, [selectedPatientId]);

  // ✅ Helper function to format date
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '';
    const date = new Date(dateString.includes("T") ? dateString : dateString + "T00:00:00");
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  // ✅ Filter
  const filteredClaims = claims.filter((claim: any) => {
    return (
      (!searchPatient || (claim.patientName && claim.patientName.toLowerCase().includes(searchPatient.toLowerCase()))) &&
      (!searchClaim || (claim.id && claim.id.toString().includes(searchClaim))) &&
      (!filters.type || (claim.type && claim.type.toLowerCase() === filters.type.toLowerCase())) &&
      (!filters.carrier || (claim.payerName || claim.provider) === filters.carrier) &&
      (!filters.attachment || (filters.attachment === "yes" ? claim.hasAttachment : !claim.hasAttachment)) &&
      !hiddenClaims.has(claim.id)
    );
  });

  return (
    <div>
      <h2 className="font-semibold text-lg mb-2">History Claims ({filteredClaims.length})</h2>

      {error && <p className="text-red-500 mb-2">{error}</p>}
      {actionError && <p className="text-red-500 mb-2">{actionError}</p>}

      <div className="flex gap-4 mb-4 flex-wrap items-center print:hidden">
        
        {/* ✅ Patient Search with Dropdown */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search patient by name/MRN"
            value={patientSearchQuery}
            onChange={e => {
              setPatientSearchQuery(e.target.value);
              if (!e.target.value) {
                setSelectedPatientId(null);
              }
            }}
            onFocus={() => patientSearchResults.length > 0 && setShowPatientDropdown(true)}
            className="border px-2 py-1 rounded w-64"
          />
          
          {showPatientDropdown && patientSearchResults.length > 0 && (
            <div className="absolute z-50 bg-white border border-gray-300 rounded shadow-lg mt-1 w-full max-h-60 overflow-y-auto">
              {patientSearchResults.map((patient: any) => (
                <div
                  key={patient.id}
                  className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                  onClick={() => {
                    setSelectedPatientId(patient.id);
                    setPatientSearchQuery(`${patient.firstName} ${patient.lastName} (MRN: ${patient.mrn})`);
                    setShowPatientDropdown(false);
                  }}
                >
                  <div className="font-medium">{patient.firstName} {patient.lastName}</div>
                  <div className="text-sm text-gray-500">MRN: {patient.mrn}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedPatientId && (
          <button
            className="border px-2 py-1 rounded bg-gray-200 text-sm"
            onClick={() => {
              setSelectedPatientId(null);
              setPatientSearchQuery("");
            }}
          >
            Clear Patient Filter
          </button>
        )}

        <div className="flex gap-2">
          <button
            className="border px-2 py-1 rounded bg-blue-500 text-white"
            onClick={() => setShowPrintPreview(true)}
          >
            Print Preview
          </button>

          <button
            className="border px-2 py-1 rounded bg-blue-500 text-white"
            disabled={!selectedCount}
            onClick={() => setShowChangeStatusModal(true)}
          >
            Change Status
          </button>

          <button
            className="border px-2 py-1 rounded bg-orange-500 text-white"
            disabled={!selectedCount}
            onClick={() => setShowVoidRecreateModal(true)}
          >
            Void & Recreate Claims ({selectedCount})
          </button>
        </div>
      </div>

      {/* ✅ TABLE */}
      <table className="w-full border text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2"><input type="checkbox" onChange={selectAll} /></th>
            <th className="p-2">Patient Name</th>
            <th className="p-2">Claim #</th>
            <th className="p-2">Claim Type</th>
            <th className="p-2">Sent on</th>
            <th className="p-2">Printed on</th>
            <th className="p-2">Carrier</th>
            <th className="p-2">Procedures</th>
            <th className="p-2">Status</th>
            <th className="p-2">ERA</th>
            <th className="p-2">Clearing House Status Message</th>
            <th className="p-2">Value</th>
            <th className="p-2">Notes</th>
            <th className="p-2">Description</th>
            <th className="p-2">Actions</th>
            <th className="p-2">Hide</th>
          </tr>
        </thead>

        <tbody>
          {loading ? (
            <tr><td colSpan={16} className="text-center p-4">Loading...</td></tr>
          ) : filteredClaims.length === 0 ? (
            <tr><td colSpan={16} className="text-center p-4">No claims found</td></tr>
          ) : (
            filteredClaims.map((claim: any) => (
              <tr key={claim.id} className="border-b">
                <td className="p-2">
                  <input
                    type="checkbox"
                    checked={selectedClaims.has(claim.id)}
                    onChange={() => toggleSelect(claim.id)}
                  />
                </td>
                <td className="p-2">
                  <button 
                    className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-left"
                    onClick={() => navigateToPatientBilling(claim.patientId)}
                    title="View patient billing"
                  >
                    {claim.patientName}
                  </button>
                </td>
                <td className="p-2">{claim.id}</td>
                <td className="p-2">{claim.type}</td>
                <td className="p-2">{formatDate(claim.sentOn || claim.createdOn)}</td>
                <td className="p-2">{formatDate(claim.printedOn) || ''}</td>
                <td className="p-2">{claim.payerName || claim.provider || "\u2014"}</td>
                <td className="p-2">
                  <button
                    className="text-blue-500 hover:text-blue-700 hover:underline"
                    onClick={() => fetchLineDetails(claim.id)}
                    disabled={lineDetailsLoading}
                  >
                    {lineDetailsLoading ? "Loading..." : "Show"}
                  </button>
                </td>
                <td className="p-2">{claim.status}</td>
                <td className="p-2">{claim.eraStatus || ''}</td>
                <td className="p-2">{claim.clearingHouseStatusMessage || ''}</td>
                <td className="p-2">{claim.value || ''}</td>
                <td className="p-2">{claim.notes}</td>
                <td className="p-2">{claim.description || ''}</td>
                <td className="p-2 flex gap-2">
                  <button 
                    className="border px-2 py-1 rounded text-xs hover:bg-blue-50 flex items-center gap-1" 
                    title="Edit"
                    onClick={() => {
                      setSelectedClaimForAction(claim);
                      setShowEditModal(true);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button 
                    className="border px-2 py-1 rounded text-xs hover:bg-green-50 flex items-center gap-1" 
                    title="View"
                    onClick={() => {
                      setSelectedClaimForAction(claim);
                      setShowViewModal(true);
                    }}
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button 
                    className="border px-2 py-1 rounded text-xs hover:bg-gray-50 flex items-center gap-1" 
                    title="Attachments"
                    onClick={() => {
                      setSelectedClaimForAction(claim);
                      setShowAttachmentModal(true);
                    }}
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                </td>
                <td className="p-2">
                  <button 
                    className="border px-2 py-1 rounded text-xs hover:bg-red-50 flex items-center gap-1" 
                    title="Hide"
                    onClick={() => {
                      const newHidden = new Set(hiddenClaims);
                      newHidden.add(claim.id);
                      setHiddenClaims(newHidden);
                    }}
                  >
                    <EyeOff className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* ✅ Change Status Modal */}
      {showChangeStatusModal && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow w-96">
            <h3 className="font-semibold mb-2">Modify Claim Status</h3>

            <form>
              <div className="mb-4 flex flex-col gap-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="claimStatus"
                    value="ACCEPTED"
                    checked={statusToChange === "ACCEPTED"}
                    onChange={e => setStatusToChange(e.target.value)}
                  />
                  <span className="ml-2">Accepted & Paid</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="radio"
                    name="claimStatus"
                    value="DENIED"
                    checked={statusToChange === "DENIED"}
                    onChange={e => setStatusToChange(e.target.value)}
                  />
                  <span className="ml-2">Accepted but Final Payment Denied</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="radio"
                    name="claimStatus"
                    value="REJECTED"
                    checked={statusToChange === "REJECTED"}
                    onChange={e => setStatusToChange(e.target.value)}
                  />
                  <span className="ml-2">Rejected</span>
                </label>
              </div>

              {(statusToChange === "ACCEPTED" ||
                statusToChange === "DENIED") && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">
                    Remittance Date
                  </label>
                  <input
                    type="date"
                    value={remittanceDate}
                    onChange={e => setRemittanceDate(e.target.value)}
                    className="border px-3 py-2 rounded w-full"
                  />
                </div>
              )}

              {statusToChange === "ACCEPTED" && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">
                    Insurance Payment Amount
                  </label>
                  <input
                    type="number"
                    value={insurancePaymentAmount}
                    onChange={e => setInsurancePaymentAmount(e.target.value)}
                    className="border px-3 py-2 rounded w-full" 
                  />
                </div>
              )}

              {actionError && <p className="text-red-500 mb-2">{actionError}</p>}

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  className="px-4 py-1 rounded bg-blue-500 text-white"
                  disabled={actionLoading || !statusToChange}
                  onClick={handleChangeStatus}
                >
                  Save
                </button>
                <button
                  type="button"
                  className="px-4 py-1 rounded bg-gray-300"
                  onClick={() => setShowChangeStatusModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ✅ Void & Recreate Modal */}
      {showVoidRecreateModal && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow w-96">
            <h3 className="font-semibold mb-2">
              Void & Recreate {selectedCount} Claim(s)
            </h3>

            <div className="mb-3 text-sm text-gray-700">
              Are you sure you want to void & recreate the selected claims? This cannot be undone.
            </div>

            <div className="flex gap-2 justify-end">
              <button
                className="border px-3 py-1 rounded"
                onClick={() => setShowVoidRecreateModal(false)}
              >
                Cancel
              </button>

              <button
                className="bg-orange-500 text-white px-3 py-1 rounded"
                disabled={actionLoading}
                onClick={handleVoidRecreate}
              >
                {actionLoading ? "Processing..." : "Void & Recreate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Print Preview Modal */}
      {showPrintPreview && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow w-full max-w-7xl max-h-[90vh] overflow-auto m-4">
            <div className="bg-blue-600 text-white p-4 flex justify-between items-center print:hidden">
              <h3 className="font-semibold text-lg">Print Preview</h3>
              <button
                className="text-white hover:text-gray-200"
                onClick={() => setShowPrintPreview(false)}
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              <div className="flex justify-end gap-2 mb-4 print:hidden">
                <button
                  className="border border-gray-300 px-4 py-2 rounded hover:bg-gray-100"
                  onClick={() => setShowPrintPreview(false)}
                >
                  Cancel
                </button>
                <button
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  onClick={handlePrint}
                >
                  Print
                </button>
              </div>

              <table className="w-full border-collapse border border-gray-300 text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-2 text-left">Patient Name</th>
                    <th className="border border-gray-300 p-2 text-left">Claim #</th>
                    <th className="border border-gray-300 p-2 text-left">Claim Type</th>
                    <th className="border border-gray-300 p-2 text-left">Sent on</th>
                    <th className="border border-gray-300 p-2 text-left">Printed on</th>
                    <th className="border border-gray-300 p-2 text-left">Carrier</th>
                    <th className="border border-gray-300 p-2 text-left">Status</th>
                    <th className="border border-gray-300 p-2 text-left">ERA Status</th>
                    <th className="border border-gray-300 p-2 text-left">Clearing House Status Message</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClaims.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="border border-gray-300 p-4 text-center">
                        No claims to print
                      </td>
                    </tr>
                  ) : (
                    filteredClaims.map((claim: any) => (
                      <tr key={claim.id} className="hover:bg-gray-50">
                        <td className="border border-gray-300 p-2">{claim.patientName}</td>
                        <td className="border border-gray-300 p-2">{claim.id}</td>
                        <td className="border border-gray-300 p-2">{claim.type}</td>
                        <td className="border border-gray-300 p-2">{formatDate(claim.sentOn || claim.createdOn)}</td>
                        <td className="border border-gray-300 p-2">{formatDate(claim.printedOn) || '-'}</td>
                        <td className="border border-gray-300 p-2">{claim.payerName || claim.provider || "\u2014"}</td>
                        <td className="border border-gray-300 p-2">{claim.status}</td>
                        <td className="border border-gray-300 p-2">{claim.eraStatus || '-'}</td>
                        <td className="border border-gray-300 p-2">{claim.clearingHouseStatusMessage || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Edit Modal */}
      {showEditModal && selectedClaimForAction && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow w-96">
            <h3 className="font-semibold text-lg mb-4">Edit Claim #{selectedClaimForAction.id}</h3>
            <div className="flex gap-2 justify-end">
              <button
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => {
                  setShowEditModal(false);
                  setNarrativeText(selectedClaimForAction.description || '');
                  setShowEditNarrativeModal(true);
                }}
              >
                Edit Narrative
              </button>
              <button
                className="px-4 py-1 rounded bg-gray-300"
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedClaimForAction(null);
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Edit Narrative Modal */}
      {showEditNarrativeModal && selectedClaimForAction && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow w-[600px]">
            <h3 className="font-semibold text-lg mb-4">Edit Narrative - Claim #{selectedClaimForAction.id}</h3>
            <textarea
              className="w-full border border-gray-300 rounded p-2 text-sm"
              rows={6}
              value={narrativeText}
              onChange={(e) => setNarrativeText(e.target.value)}
              placeholder="Enter narrative text..."
            />
            <div className="flex gap-2 justify-end mt-4">
              <button
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => {
                  // Save narrative logic here
                  setShowEditNarrativeModal(false);
                  setSelectedClaimForAction(null);
                  setNarrativeText('');
                }}
              >
                Save
              </button>
              <button
                className="px-4 py-2 rounded bg-gray-300"
                onClick={() => {
                  setShowEditNarrativeModal(false);
                  setSelectedClaimForAction(null);
                  setNarrativeText('');
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ View Modal */}
      {showViewModal && selectedClaimForAction && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow w-[600px] max-h-[80vh] overflow-auto">
            <h3 className="font-semibold text-lg mb-4">View Claim Details</h3>
            <div className="space-y-2 text-sm">
              <div><strong>Claim #:</strong> {selectedClaimForAction.id}</div>
              <div><strong>Patient:</strong> {selectedClaimForAction.patientName}</div>
              <div><strong>Type:</strong> {selectedClaimForAction.type}</div>
              <div><strong>Sent On:</strong> {formatDate(selectedClaimForAction.sentOn || selectedClaimForAction.createdOn)}</div>
              <div><strong>Carrier:</strong> {selectedClaimForAction.provider}</div>
              <div><strong>Status:</strong> {selectedClaimForAction.status}</div>
              <div><strong>ERA Status:</strong> {selectedClaimForAction.eraStatus || 'N/A'}</div>
              <div><strong>Notes:</strong> {selectedClaimForAction.notes || 'N/A'}</div>
              <div><strong>Description:</strong> {selectedClaimForAction.description || 'N/A'}</div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button
                className="px-4 py-1 rounded bg-gray-300"
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedClaimForAction(null);
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Attachment Modal */}
      {showAttachmentModal && selectedClaimForAction && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow w-[800px] max-h-[80vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg">Claim Attachments</h3>
              <button
                onClick={() => {
                  setShowAttachmentModal(false);
                  setSelectedClaimForAction(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600">Claim #{selectedClaimForAction.id}</p>
              <p className="text-sm text-gray-600">Payer Reference Number: 
                <span className="ml-2">
                  <button className="text-blue-500">✓</button>
                  <button className="text-red-500 ml-1">⚠</button>
                </span>
              </p>
            </div>

            <div className="mb-4">
              <h4 className="font-semibold mb-2">Imported Files</h4>
              <p className="text-sm text-gray-500">No files added yet</p>
            </div>

            <div className="mb-4">
              <h4 className="font-semibold mb-2">Import from:</h4>
              <p className="text-xs text-gray-400 mb-2">*PDF files will be submitted as images*</p>
              <div className="grid grid-cols-7 gap-2">
                <button className="border p-3 rounded hover:bg-gray-50 flex flex-col items-center">
                  <div className="text-blue-500 mb-1">🖼️</div>
                  <span className="text-xs">Images</span>
                </button>
                <button className="border p-3 rounded hover:bg-gray-50 flex flex-col items-center">
                  <div className="text-blue-500 mb-1">📤</div>
                  <span className="text-xs">Upload from PC</span>
                </button>
                <button className="border p-3 rounded hover:bg-gray-50 flex flex-col items-center">
                  <div className="text-blue-500 mb-1">📊</div>
                  <span className="text-xs">Perio Chart</span>
                </button>
                <button className="border p-3 rounded hover:bg-gray-50 flex flex-col items-center">
                  <div className="text-blue-500 mb-1">🏥</div>
                  <span className="text-xs">Medical History</span>
                </button>
                <button className="border p-3 rounded hover:bg-gray-50 flex flex-col items-center">
                  <div className="text-blue-500 mb-1">🦷</div>
                  <span className="text-xs">Dental History</span>
                </button>
                <button className="border p-3 rounded hover:bg-gray-50 flex flex-col items-center">
                  <div className="text-blue-500 mb-1">📝</div>
                  <span className="text-xs">Progress Notes</span>
                </button>
                <button className="border p-3 rounded hover:bg-gray-50 flex flex-col items-center bg-blue-50">
                  <div className="text-blue-500 mb-1">📄</div>
                  <span className="text-xs">Upload LOBs</span>
                </button>
              </div>
            </div>

            <div className="mb-4">
              <label className="flex items-center text-sm">
                <input type="checkbox" className="mr-2" />
                Send both Peart-annotated and original images
              </label>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                className="px-4 py-1 rounded bg-gray-300"
                onClick={() => {
                  setShowAttachmentModal(false);
                  setSelectedClaimForAction(null);
                }}
              >
                Cancel
              </button>
              <button className="px-4 py-1 rounded bg-blue-500 text-white">
                Submit Attachments
              </button>
              <button className="px-4 py-1 rounded bg-green-500 text-white">
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Line Details Modal */}
      {showLineDetailsModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Claim Line Details</h2>
              <button
                className="text-gray-500 hover:text-gray-700 text-2xl"
                onClick={() => {
                  setShowLineDetailsModal(false);
                  setLineDetails([]);
                }}
              >
                ×
              </button>
            </div>

            {lineDetails.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No line details found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-3 text-left border">DOS</th>
                      <th className="p-3 text-left border">Code</th>
                      <th className="p-3 text-left border">Description</th>
                      <th className="p-3 text-left border">Provider</th>
                      <th className="p-3 text-right border">Total Submitted Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineDetails.map((line) => (
                      <tr key={line.lineid} className="hover:bg-gray-50">
                        <td className="p-3 border">
                          {Array.isArray(line.dos) && line.dos.length > 0 ? (
                            <div>
                              {line.dos.map((dateNum, idx) => {
                                const year = Math.floor(dateNum / 10000);
                                const month = Math.floor((dateNum % 10000) / 100);
                                const day = dateNum % 100;
                                return (
                                  <div key={idx}>
                                    {`${month}/${day}/${year}`}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="p-3 border">{line.code || "-"}</td>
                        <td className="p-3 border">{line.description || "-"}</td>
                        <td className="p-3 border">{line.provider || "-"}</td>
                        <td className="p-3 border text-right">
                          ${line.totalSubmittedAmount?.toFixed(2) || "0.00"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end mt-4">
              <button
                className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
                onClick={() => {
                  setShowLineDetailsModal(false);
                  setLineDetails([]);
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryClaims;
