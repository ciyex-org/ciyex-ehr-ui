"use client";

import { getEnv } from "@/utils/env";
import React, { useEffect, useState, useRef } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

interface PatientRelationship {
  id: number;
  patientId: number;
  relatedPatientId?: number;
  relatedPatientName?: string;
  relationshipType: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  emergencyContact: boolean;
  notes?: string;
  active: boolean;
}

interface RelationType {
  id: number;
  title: string;
  optionId: string;
  activity: number;
}

interface PatientSearchResult {
  id: number;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
}

interface CurrentPatient {
  id: number;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
}

interface Props {
  patientId: number;
}

export default function PatientRelationshipsTab({ patientId }: Props) {
  const [relationships, setRelationships] = useState<PatientRelationship[]>([]);
  const [relationTypes, setRelationTypes] = useState<RelationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<PatientRelationship>>({
    relationshipType: "",
    emergencyContact: false,
    active: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Patient search states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PatientSearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [currentPatient, setCurrentPatient] = useState<CurrentPatient | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadRelationships();
    loadRelationTypes();
    loadCurrentPatient();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadRelationships = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth(
          `${getEnv("NEXT_PUBLIC_API_URL")}/api/patients/${patientId}/relationships`
      );
      const data = await response.json();
      console.log("📋 Relationships API response:", data);
      
      const items = data.success && data.data ? data.data : (Array.isArray(data) ? data : []);
      setRelationships(items);
      console.log("✅ Loaded relationships:", items);
    } catch (err) {
      console.error("Error loading relationships:", err);
      setError("Failed to load relationships");
    } finally {
      setLoading(false);
    }
  };

  const loadRelationTypes = async () => {
    try {
      const response = await fetchWithAuth(
        `${getEnv("NEXT_PUBLIC_API_URL")}/api/list-options/list/Patient_relationship`
      );
      const data = await response.json();
      
      const items = Array.isArray(data) ? data : (data.data || []);
      const activeTypes = items.filter((item: RelationType) => item.activity === 1);
      setRelationTypes(activeTypes);
      console.log("✅ Loaded relationship types:", activeTypes);
    } catch (err) {
      console.error("❌ Error loading relation types:", err);
      setRelationTypes([]);
    }
  };

  const loadCurrentPatient = async () => {
    try {
      const response = await fetchWithAuth(
          `${getEnv("NEXT_PUBLIC_API_URL")}/api/patients/${patientId}`
      );
      const data = await response.json();
      if (data.success && data.data) {
        setCurrentPatient(data.data);
      }
    } catch (err) {
      console.error("Error loading current patient:", err);
    }
  };

  const searchPatients = async (query: string) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      setSearchLoading(true);
      setShowSearchResults(true);

      const params = new URLSearchParams();
      params.set("page", "0");
      params.set("size", "10");
      params.set("search", query.trim());
      params.set("sort", "id,asc");

      const response = await fetchWithAuth(
        `${getEnv("NEXT_PUBLIC_API_URL")}/api/patients?${params.toString()}`
      );

      const data = await response.json();

      if (data.success && data.data) {
        const patients = data.data.content || [];
        
        // Filter out current patient
        const filteredPatients = patients.filter(
          (p: PatientSearchResult) => p.id !== patientId
        );
        
        setSearchResults(filteredPatients);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error("Error searching patients:", err);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handlePatientSelect = (patient: PatientSearchResult) => {
    const fullName = `${patient.firstName} ${patient.lastName}`;
    setSearchQuery(fullName);

    setFormData({
      ...formData,
      relatedPatientId: patient.id,
      relatedPatientName: fullName,
      phoneNumber: patient.phoneNumber || "",
      email: patient.email || "",
      address: patient.address || "",
    });

    setShowSearchResults(false);
  };

  const handleRelationshipTypeChange = (relationshipType: string) => {
    // If "Self" is selected, auto-fill with current patient details
    if (relationshipType.toLowerCase() === "self" && currentPatient) {
      setFormData({
        ...formData,
        relationshipType,
        relatedPatientId: currentPatient.id,
        relatedPatientName: `${currentPatient.firstName} ${currentPatient.lastName}`,
        phoneNumber: currentPatient.phoneNumber || "",
        email: currentPatient.email || "",
        address: currentPatient.address || "",
      });
      setSearchQuery(`${currentPatient.firstName} ${currentPatient.lastName}`);
    } else {
      // If switching from "Self" to another type, clear the auto-filled fields
      setFormData({
        ...formData,
        relationshipType,
        relatedPatientId: undefined,
        relatedPatientName: "",
        phoneNumber: "",
        email: "",
        address: "",
      });
      setSearchQuery("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    console.log("📤 Submitting relationship:", formData);

    try {
      const url = editingId
          ? `${getEnv("NEXT_PUBLIC_API_URL")}/api/patients/${patientId}/relationships/${editingId}`
          : `${getEnv("NEXT_PUBLIC_API_URL")}/api/patients/${patientId}/relationships`;

      const method = editingId ? "PUT" : "POST";

      const response = await fetchWithAuth(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      console.log("📥 Save response:", data);

      if (data.success) {
        setSuccess(data.message || "Relationship saved successfully");
        setShowForm(false);
        setEditingId(null);
        setFormData({
          relationshipType: "",
          emergencyContact: false,
          active: true,
        });
        setSearchQuery("");
        setSearchResults([]);
        setShowSearchResults(false);
        await loadRelationships();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.message || "Operation failed");
      }
    } catch (err) {
      console.error("Error saving relationship:", err);
      setError("Failed to save relationship");
    }
  };

  const handleEdit = (relationship: PatientRelationship) => {
    setFormData(relationship);
    setEditingId(relationship.id);
    setSearchQuery(relationship.relatedPatientName || "");
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this relationship?")) return;

    try {
      const response = await fetchWithAuth(
          `${getEnv("NEXT_PUBLIC_API_URL")}/api/patients/${patientId}/relationships/${id}`,
          { method: "DELETE" }
      );
      const data = await response.json();

      if (data.success) {
        setSuccess("Relationship deleted successfully");
        loadRelationships();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.message || "Delete failed");
      }
    } catch (err) {
      console.error("Error deleting relationship:", err);
      setError("Failed to delete relationship");
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      relationshipType: "",
      emergencyContact: false,
      active: true,
    });
    setSearchQuery("");
    setSearchResults([]);
    setShowSearchResults(false);
    setError(null);
  };

  if (loading) {
    return <div className="p-4 text-center">Loading relationships...</div>;
  }

  return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Patient Relationships</h2>
          <button
              onClick={() => {
                setShowForm(true);
                setEditingId(null);
                setFormData({
                  relationshipType: "",
                  emergencyContact: false,
                  active: true,
                });
                setSearchQuery("");
                setSearchResults([]);
                setShowSearchResults(false);
              }}
              className="h-8 px-3 rounded bg-blue-600 hover:bg-blue-700 text-xs font-medium text-white shadow-sm"
          >
            + Add
          </button>
        </div>

        {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
              {error}
            </div>
        )}

        {success && (
            <div className="mb-4 p-3 bg-green-100 text-green-700 rounded text-sm">
              {success}
            </div>
        )}

        {/* Modal / Popup */}
        {showForm && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30">
              <div className="w-full sm:max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl shadow-lg">
                <div className="px-4 py-3 border-b flex items-center justify-between">
                  <h5 className="text-sm font-semibold">
                    {editingId ? "Edit Relationship" : "Add New Relationship"}
                  </h5>
                  <button
                      onClick={handleCancel}
                      className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="p-4 space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Relationship Type *
                    </label>
                    <select
                        value={formData.relationshipType || ""}
                        onChange={(e) => handleRelationshipTypeChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                        required
                    >
                      <option value="">Select Relationship Type</option>
                      {relationTypes.map((type) => (
                          <option key={type.id} value={type.title}>
                            {type.title}
                          </option>
                      ))}
                    </select>
                  </div>

                  <div className="relative" ref={searchRef}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Related Person Name
                    </label>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          searchPatients(e.target.value);
                        }}
                        onFocus={() => searchQuery && setShowSearchResults(true)}
                        placeholder="Search patient by name..."
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    />

                    {/* Search Results Dropdown */}
                    {showSearchResults && searchQuery.length >= 2 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {searchLoading ? (
                              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                🔍 Searching...
                              </div>
                          ) : searchResults.length > 0 ? (
                              searchResults.map((patient) => (
                                  <div
                                      key={patient.id}
                                      onClick={() => handlePatientSelect(patient)}
                                      className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                                  >
                                    <div className="text-sm font-medium text-gray-900">
                                      {patient.firstName} {patient.lastName}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {patient.phoneNumber && `📞 ${patient.phoneNumber}`}
                                      {patient.phoneNumber && patient.email && " • "}
                                      {patient.email && `📧 ${patient.email}`}
                                    </div>
                                  </div>
                              ))
                          ) : (
                              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                ❌ No patients found
                              </div>
                          )}
                        </div>
                    )}
                  </div>

                  {/* Emergency Contact Checkbox */}
                  <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="emergencyContact"
                        checked={formData.emergencyContact || false}
                        onChange={(e) =>
                            setFormData({ ...formData, emergencyContact: e.target.checked })
                        }
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label
                        htmlFor="emergencyContact"
                        className="text-sm font-medium text-gray-700 cursor-pointer"
                    >
                      Mark as Emergency Contact
                    </label>
                  </div>

                  {/* Status Toggle */}
                  <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="active"
                        checked={formData.active !== false}
                        onChange={(e) =>
                            setFormData({ ...formData, active: e.target.checked })
                        }
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label
                        htmlFor="active"
                        className="text-sm font-medium text-gray-700 cursor-pointer"
                    >
                      Active Status
                    </label>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="px-3 py-1.5 rounded border"
                    >
                      Cancel
                    </button>
                    <button
                        type="submit"
                        className="px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700"
                    >
                      {editingId ? "Update" : "Save"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Relationship Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Name
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                Emergency Contact
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
            {relationships.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                    No relationships found. Click &quot;+ Add&quot; to create one.
                  </td>
                </tr>
            ) : (
                relationships.map((rel) => (
                    <tr key={rel.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {rel.relationshipType}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {rel.relatedPatientName || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        {rel.emergencyContact ? (
                            <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                        Yes
                      </span>
                        ) : (
                            <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        {rel.active ? (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                        Active
                      </span>
                        ) : (
                            <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                        Inactive
                      </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        <div className="inline-flex gap-2">
                          <button
                              className="text-gray-600 hover:text-blue-700"
                              onClick={() => handleEdit(rel)}
                              title="Edit"
                          >
                            ✎
                          </button>
                          <button
                              className="text-gray-600 hover:text-red-700"
                              onClick={() => handleDelete(rel.id)}
                              title="Delete"
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                ))
            )}
            </tbody>
          </table>
        </div>
      </div>
  );
}
