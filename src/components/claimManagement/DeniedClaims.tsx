import { getEnv } from "@/utils/env";
import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from "@/utils/fetchWithAuth";

const DeniedClaims: React.FC = () => {
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchPatient, setSearchPatient] = useState("");
  const [searchClaim, setSearchClaim] = useState("");
  const [patientSearchQuery, setPatientSearchQuery] = useState("");
  const [patientSearchResults, setPatientSearchResults] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  const searchPatientsAPI = async (query: string) => {
    if (!query || query.length < 2) { setPatientSearchResults([]); return; }
    try {
      const API_URL = getEnv("NEXT_PUBLIC_API_URL");
      const res = await fetchWithAuth(`${API_URL}/api/all-claims/patient-search?query=${encodeURIComponent(query)}&page=0&size=20`);
      if (!res.ok) throw new Error("Failed to search patients");
      const response = await res.json();
      setPatientSearchResults(response.data?.content || []);
      setShowPatientDropdown(true);
    } catch { setPatientSearchResults([]); }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (patientSearchQuery) searchPatientsAPI(patientSearchQuery);
      else { setPatientSearchResults([]); setShowPatientDropdown(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [patientSearchQuery]);

  const reloadClaims = async () => {
    setLoading(true);
    const API_URL = getEnv("NEXT_PUBLIC_API_URL");
    try {
      const res = await fetchWithAuth(`${API_URL}/api/all-claims`);
      if (!res.ok) throw new Error("Failed to fetch claims");
      const data = await res.json();
      setClaims(Array.isArray(data) ? data : data.data || []);
      setError(null);
    } catch (err: unknown) {
      setError((err as Error).message || "Error fetching claims");
    } finally { setLoading(false); }
  };

  const loadClaimsByPatient = async (patientId: number) => {
    setLoading(true);
    const API_URL = getEnv("NEXT_PUBLIC_API_URL");
    try {
      const res = await fetchWithAuth(`${API_URL}/api/all-claims/patient/${patientId}/claims`);
      if (!res.ok) throw new Error("Failed to fetch patient claims");
      const response = await res.json();
      setClaims(response.data || []);
      setError(null);
    } catch (err: unknown) {
      setError((err as Error).message || "Error fetching patient claims");
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (selectedPatientId) loadClaimsByPatient(selectedPatientId);
    else reloadClaims();
  }, [selectedPatientId]);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '';
    const date = new Date(dateString.includes("T") ? dateString : dateString + "T00:00:00");
    return date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  // Show only DENIED status claims
  const filteredClaims = claims.filter((claim: any) =>
    claim.status === "DENIED" &&
    (!searchPatient || (claim.patientName && claim.patientName.toLowerCase().includes(searchPatient.toLowerCase()))) &&
    (!searchClaim || (claim.id && claim.id.toString().includes(searchClaim)) || claim.createdOn?.includes(searchClaim))
  );

  return (
    <div>
      <h2 className="font-semibold text-lg mb-2">Billing Denials ({filteredClaims.length})</h2>
      {error && <p className="text-red-500 mb-2">{error}</p>}
      <div className="flex gap-4 mb-4 flex-wrap items-center">
        <div className="relative">
          <input
            type="text"
            placeholder="Search patient by name/MRN"
            value={patientSearchQuery}
            onChange={e => {
              setPatientSearchQuery(e.target.value);
              if (!e.target.value) setSelectedPatientId(null);
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
          <button className="border px-2 py-1 rounded bg-gray-200 text-sm" onClick={() => { setSelectedPatientId(null); setPatientSearchQuery(""); }}>
            Clear Patient Filter
          </button>
        )}
        <input type="text" placeholder="Search by patient name" value={searchPatient} onChange={(e) => setSearchPatient(e.target.value)} className="border px-2 py-1 rounded" />
        <input type="text" placeholder="Search by claim # or date" value={searchClaim} onChange={(e) => setSearchClaim(e.target.value)} className="border px-2 py-1 rounded" />
      </div>

      {loading && <p className="text-gray-500">Loading...</p>}

      {!loading && filteredClaims.length === 0 && (
        <p className="text-gray-500 text-center py-8">No denied claims found.</p>
      )}

      {!loading && filteredClaims.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Claim ID</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Patient</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Provider</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Type</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Created</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Status</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredClaims.map((claim: any) => (
                <tr key={claim.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono text-xs">{claim.id}</td>
                  <td className="px-3 py-2">{claim.patientName || '--'}</td>
                  <td className="px-3 py-2">{claim.provider || '--'}</td>
                  <td className="px-3 py-2">{claim.type || '--'}</td>
                  <td className="px-3 py-2">{formatDate(claim.createdOn)}</td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">{claim.status}</span>
                  </td>
                  <td className="px-3 py-2 text-gray-500 text-xs">{claim.notes || '--'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DeniedClaims;
