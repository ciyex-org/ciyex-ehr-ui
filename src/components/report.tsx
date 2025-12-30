"use client";
import React, { useState, useEffect } from "react";
import { fetchWithAuth } from "@/utils/fetchWithAuth";

export interface ReportConfig {
  patientId: number;
  startDate?: string;
  endDate?: string;
  filters?: string[];
}

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080").replace(/\/$/, "");

export const generateReport = async (
  type: string,
  config: ReportConfig
): Promise<any> => {
  const { patientId, startDate, endDate, filters } = config;

  const params = new URLSearchParams({
    patientId: patientId.toString(),
    type,
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
    ...(filters && { filters: filters.join(",") }),
  });

  const response = await fetch(
    `${API_BASE}/api/reports/generate?${params}`
  );

  if (!response.ok) throw new Error("Failed to generate report");
  return response.json();
};

export const downloadReport = async (
  type: string,
  config: ReportConfig,
  format: "pdf" | "csv" = "pdf"
): Promise<void> => {
  const { patientId, startDate, endDate, filters } = config;

  const params = new URLSearchParams({
    patientId: patientId.toString(),
    type,
    format,
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
    ...(filters && { filters: filters.join(",") }),
  });

  const response = await fetch(
    `${API_BASE}/api/reports/download?${params}`
  );

  if (!response.ok) throw new Error("Failed to download report");

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${type}-report-${Date.now()}.${format}`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

interface ReportFlatProps {
  patientId: number;
  useDateRange: boolean;
  setUseDateRange: (value: boolean) => void;
  startDate: string;
  setStartDate: (value: string) => void;
  endDate: string;
  setEndDate: (value: string) => void;
  reportFilters: string[];
  toggleFilter: (filter: string) => void;
  generateReport: (type: string, filters?: string[]) => void;
  downloadReport: (type: string, filters?: string[]) => void;
  lastVisitedTab: string;
  setActiveTab: (tab: string) => void;
}

export const ReportFlat: React.FC<ReportFlatProps> = ({
  patientId,
  useDateRange,
  setUseDateRange,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  reportFilters,
  toggleFilter,
  generateReport: onGenerate,
  downloadReport: onDownload,
  lastVisitedTab,
  setActiveTab,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  useEffect(() => {
    if (showModal) {
      const style = document.createElement('style');
      style.id = 'print-styles';
      style.textContent = `
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }

          html, body {
            height: auto !important;
            min-height: 100% !important;
            overflow: visible !important;
            background: white !important;
          }

          body * {
            visibility: hidden;
          }

          #print-container,
          #print-container * {
            visibility: visible;
          }

          /* Reset all potential container constraints */
          .fixed,
          .absolute,
          .relative,
          .modal-wrapper {
            position: static !important;
            width: 100% !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            transform: none !important;
            margin: 0 !important;
            padding: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
          }

          /* Force the print container to be the only thing that matters */
          #print-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          /* Specific overrides for element visibility in print */
          .print-header {
            background-color: #2563eb !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            margin-bottom: 20px !important;
          }

          #report-content {
            overflow: visible !important;
            max-height: none !important;
            height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          .report-section {
            page-break-inside: auto !important;
            break-inside: auto !important;
            margin-bottom: 20px;
            border: 1px solid #e5e7eb !important;
            display: block !important;
          }

          .report-section h3 {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }

          /* Prevent table breaking issues */
          table {
            page-break-inside: auto !important;
            width: 100% !important;
          }

          thead {
            display: table-header-group !important;
          }

          tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }

          td, th {
            page-break-inside: avoid !important;
          }

          /* Hide UI elements */
          .no-print,
          button,
          .close-button {
            display: none !important;
          }

          /* Color consistency */
          .bg-blue-600, .bg-blue-50, .bg-indigo-50, .bg-gray-100, .border-blue-500, .border-blue-200 {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
      `;
      document.head.appendChild(style);
      return () => {
        const styleEl = document.getElementById('print-styles');
        if (styleEl) styleEl.remove();
      };
    }
  }, [showModal]);

  const fetchInsurance = async () => {
    if (!patientId) {
      console.error('No patient ID provided');
      return null;
    }
    try {
      console.log('Fetching insurance for patient ID:', patientId);
      const res = await fetchWithAuth(`${API_BASE}/api/coverages`);

      if (!res.ok) {
        console.error('Failed to fetch insurance:', res.status);
        return null;
      }

      const json = await res.json();
      console.log('Insurance API Response:', json);

      const patientCoverages = json.data?.filter((c: any) => Number(c.patientId) === patientId) || [];

      const insuranceData = {
        primary: patientCoverages.find((c: any) => c.coverageType?.toUpperCase() === 'PRIMARY') || null,
        secondary: patientCoverages.find((c: any) => c.coverageType?.toUpperCase() === 'SECONDARY') || null,
        tertiary: patientCoverages.find((c: any) => c.coverageType?.toUpperCase() === 'TERTIARY') || null
      };

      const formattedData = {
        primary: insuranceData.primary ? {
          insuranceName: insuranceData.primary.planName || '-',
          companyName: insuranceData.primary.provider || '-'
        } : { insuranceName: '-', companyName: '-' },
        secondary: insuranceData.secondary ? {
          insuranceName: insuranceData.secondary.planName || '-',
          companyName: insuranceData.secondary.provider || '-'
        } : { insuranceName: '-', companyName: '-' },
        tertiary: insuranceData.tertiary ? {
          insuranceName: insuranceData.tertiary.planName || '-',
          companyName: insuranceData.tertiary.provider || '-'
        } : { insuranceName: '-', companyName: '-' }
      };

      console.log('Patient Insurance Data:', formattedData);
      return formattedData;
    } catch (err) {
      console.error('Error fetching insurance:', err);
      return null;
    }
  };

  const fetchDemographics = async () => {
    if (!patientId) {
      console.error('No patient ID provided');
      return null;
    }
    try {
      console.log('Fetching demographics for patient ID:', patientId);
      const res = await fetchWithAuth(`${API_BASE}/api/patients/${patientId}`);

      if (!res.ok) {
        console.error('Failed to fetch demographics:', res.status);
        return null;
      }

      const json = await res.json();
      console.log('Demographics API Response:', json);
      console.log('Patient Data:', json.data || json);
      return json.data || json;
    } catch (err) {
      console.error('Error fetching demographics:', err);
      return null;
    }
  };

  const fetchImmunizations = async () => {
    if (!patientId) {
      console.error('No patient ID provided');
      return null;
    }
    try {
      console.log('Fetching immunizations for patient ID:', patientId);
      const res = await fetchWithAuth(`${API_BASE}/api/immunizations/${patientId}`);

      if (!res.ok) {
        console.error('Failed to fetch immunizations:', res.status);
        return null;
      }

      const json = await res.json();
      console.log('Immunizations API Response:', json);

      const immunizations = json.data?.immunizations || [];
      const sorted = immunizations.sort((a: any, b: any) => {
        const dateA = new Date(a.dateTimeAdministered || 0).getTime();
        const dateB = new Date(b.dateTimeAdministered || 0).getTime();
        return dateB - dateA;
      });

      const latest = sorted.length > 0 ? sorted[0] : null;
      console.log('Latest Immunization:', latest);
      return latest;
    } catch (err) {
      console.error('Error fetching immunizations:', err);
      return null;
    }
  };

  const fetchAllergies = async () => {
    if (!patientId) {
      console.error('No patient ID provided');
      return null;
    }
    try {
      console.log('Fetching allergies for patient ID:', patientId);
      const res = await fetchWithAuth(`${API_BASE}/api/allergy-intolerances/${patientId}`);

      if (!res.ok) {
        console.error('Failed to fetch allergies:', res.status);
        return null;
      }

      const json = await res.json();
      console.log('Allergies API Response:', json);

      const allergies = json.data?.allergiesList || [];
      const top3 = allergies.slice(0, 3);
      console.log('Top 3 Allergies:', top3);
      return top3;
    } catch (err) {
      console.error('Error fetching allergies:', err);
      return null;
    }
  };

  const fetchMedicalProblems = async () => {
    if (!patientId) {
      console.error('No patient ID provided');
      return null;
    }
    try {
      console.log('Fetching medical problems for patient ID:', patientId);
      const res = await fetchWithAuth(`${API_BASE}/api/medical-problems/${patientId}`);

      if (!res.ok) {
        console.error('Failed to fetch medical problems:', res.status);
        return null;
      }

      const json = await res.json();
      console.log('Medical Problems API Response:', json);

      const problems = json.data?.problemsList || [];
      const top3 = problems.slice(0, 3);
      console.log('Top 3 Medical Problems:', top3);
      return top3;
    } catch (err) {
      console.error('Error fetching medical problems:', err);
      return null;
    }
  };

  const fetchMedications = async () => {
    if (!patientId) {
      console.error('No patient ID provided');
      return null;
    }
    try {
      console.log('Fetching medications for patient ID:', patientId);
      const res = await fetchWithAuth(`${API_BASE}/api/medication-requests?patientId=${patientId}`);

      if (!res.ok) {
        console.error('Failed to fetch medications:', res.status);
        return null;
      }

      const json = await res.json();
      console.log('Medications API Response:', json);

      const medications = json.data || [];
      const sorted = medications.sort((a: any, b: any) => {
        const dateA = new Date(a.dateIssued || 0).getTime();
        const dateB = new Date(b.dateIssued || 0).getTime();
        return dateB - dateA;
      });

      const latest2 = sorted.slice(0, 2);
      console.log('Latest 2 Medications:', latest2);
      return latest2;
    } catch (err) {
      console.error('Error fetching medications:', err);
      return null;
    }
  };

  const fetchVitals = async () => {
    if (!patientId) {
      console.error('No patient ID provided');
      return null;
    }
    try {
      console.log('Fetching encounters for patient ID:', patientId);
      const encountersRes = await fetchWithAuth(`${API_BASE}/api/${patientId}/encounters`);

      if (!encountersRes.ok) {
        console.error('Failed to fetch encounters:', encountersRes.status);
        return null;
      }

      const encountersJson = await encountersRes.json();
      console.log('Encounters API Response:', encountersJson);

      const encounters = encountersJson.data || [];
      if (encounters.length === 0) {
        console.log('No encounters found');
        return null;
      }

      const latestEncounter = encounters.sort((a: any, b: any) => {
        const dateA = new Date(a.audit?.createdDate || 0).getTime();
        const dateB = new Date(b.audit?.createdDate || 0).getTime();
        return dateB - dateA;
      })[0];

      console.log('Latest encounter:', latestEncounter);
      const latestEncounterId = latestEncounter.id;

      console.log('Fetching vitals for encounter ID:', latestEncounterId);
      const vitalsRes = await fetchWithAuth(`${API_BASE}/api/vitals/${patientId}/${latestEncounterId}`);

      if (!vitalsRes.ok) {
        console.error('Failed to fetch vitals:', vitalsRes.status);
        return null;
      }

      const vitalsJson = await vitalsRes.json();
      console.log('Vitals API Response:', vitalsJson);

      const vitals = vitalsJson.data || [];
      if (vitals.length > 0) {
        const latestVital = vitals.sort((a: any, b: any) => {
          const dateA = new Date(a.audit?.createdDate || 0).getTime();
          const dateB = new Date(b.audit?.createdDate || 0).getTime();

          if (dateA === dateB) {
            return b.id - a.id;
          }

          return dateB - dateA;
        })[0];

        console.log('Latest vital:', latestVital);
        return latestVital;
      } else {
        // Fallback: fetch last available vital for this patient
        console.log('No vitals in latest encounter, fetching last available vital for patient');
        try {
          const allVitalsRes = await fetchWithAuth(`${API_BASE}/api/vitals/patient/${patientId}`);

          if (allVitalsRes.ok) {
            const allVitalsJson = await allVitalsRes.json();
            const allVitals = allVitalsJson.data || [];

            if (allVitals.length > 0) {
              const lastVital = allVitals.sort((a: any, b: any) => {
                const dateA = new Date(a.audit?.createdDate || 0).getTime();
                const dateB = new Date(b.audit?.createdDate || 0).getTime();

                if (dateA === dateB) {
                  return b.id - a.id;
                }

                return dateB - dateA;
              })[0];

              console.log('Fallback vital:', lastVital);
              return lastVital;
            }
          }
        } catch (fallbackErr) {
          console.error('Error fetching fallback vitals:', fallbackErr);
        }
      }
    } catch (err) {
      console.error('Error fetching vitals:', err);
      return null;
    }
  };

  const fetchPatientPayments = async () => {
    if (!patientId) {
      console.error('No patient ID provided');
      return null;
    }
    try {
      console.log('Fetching patient payments for patient ID:', patientId);
      const res = await fetchWithAuth(`${API_BASE}/api/patient-billing/${patientId}/patient-payments`);

      if (!res.ok) {
        console.error('Failed to fetch patient payments:', res.status);
        return null;
      }

      const json = await res.json();
      console.log('Patient Payments API Response:', json);

      const payments = json.data || [];
      const sorted = payments.sort((a: any, b: any) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });

      const latest5 = sorted.slice(0, 5);
      console.log('Latest 5 Patient Payments:', latest5);
      return latest5;
    } catch (err) {
      console.error('Error fetching patient payments:', err);
      return null;
    }
  };



  const handleCheckboxChange = async (filter: string) => {
    console.log('Checkbox changed for filter:', filter);
    toggleFilter(filter);

    if (filter === 'Demographics' && !reportFilters.includes(filter)) {
      console.log('Demographics checkbox selected - fetching data...');
      await fetchDemographics();
    }

    if (filter === 'Insurance' && !reportFilters.includes(filter)) {
      console.log('Insurance checkbox selected - fetching data...');
      await fetchInsurance();
    }

    if (filter === 'Immunizations' && !reportFilters.includes(filter)) {
      console.log('Immunizations checkbox selected - fetching data...');
      await fetchImmunizations();
    }

    if (filter === 'Allergies' && !reportFilters.includes(filter)) {
      console.log('Allergies checkbox selected - fetching data...');
      await fetchAllergies();
    }

    if (filter === 'Medical Problems' && !reportFilters.includes(filter)) {
      console.log('Medical Problems checkbox selected - fetching data...');
      await fetchMedicalProblems();
    }

    if (filter === 'Medications' && !reportFilters.includes(filter)) {
      console.log('Medications checkbox selected - fetching data...');
      await fetchMedications();
    }

    if (filter === 'Vitals' && !reportFilters.includes(filter)) {
      console.log('Vitals checkbox selected - fetching data...');
      await fetchVitals();
    }

    if (filter === 'Billing' && !reportFilters.includes(filter)) {
      console.log('Billing checkbox selected - fetching data...');
      await fetchPatientPayments();
    }
  };


  const handleGenerate = async (type: string, filters?: string[]) => {
    console.log('Generate report clicked with filters:', filters);
    const data: any = {};

    if (filters?.includes('Demographics')) {
      console.log('Demographics checkbox is selected, calling API...');
      const demographics = await fetchDemographics();
      console.log('Demographics fetched successfully:', demographics);
      data.demographics = demographics;
    }

    if (filters?.includes('Insurance')) {
      console.log('Insurance checkbox is selected, calling API...');
      const insurance = await fetchInsurance();
      console.log('Insurance fetched successfully:', insurance);
      data.insurance = insurance;
    }

    if (filters?.includes('Immunizations')) {
      console.log('Immunizations checkbox is selected, calling API...');
      const immunization = await fetchImmunizations();
      console.log('Latest Immunization fetched:', immunization);
      data.immunization = immunization;
    }

    if (filters?.includes('Allergies')) {
      console.log('Allergies checkbox is selected, calling API...');
      const allergies = await fetchAllergies();
      console.log('Top 3 Allergies fetched:', allergies);
      data.allergies = allergies;
    }

    if (filters?.includes('Medical Problems')) {
      console.log('Medical Problems checkbox is selected, calling API...');
      const medicalProblems = await fetchMedicalProblems();
      console.log('Top 3 Medical Problems fetched:', medicalProblems);
      data.medicalProblems = medicalProblems;
    }

    if (filters?.includes('Medications')) {
      console.log('Medications checkbox is selected, calling API...');
      const medications = await fetchMedications();
      console.log('Latest 2 Medications fetched:', medications);
      data.medications = medications;
    }

    if (filters?.includes('Vitals')) {
      console.log('Vitals checkbox is selected, calling API...');
      const vitals = await fetchVitals();
      console.log('Latest Vitals fetched:', vitals);
      data.vitals = vitals;
    }

    if (filters?.includes('Billing')) {
      console.log('Billing checkbox is selected, calling API...');
      const patientPayments = await fetchPatientPayments();
      console.log('Latest 5 Patient Payments fetched:', patientPayments);
      data.patientPayments = patientPayments;
    }

    console.log('Final report data:', data);
    setReportData(data);
    setShowModal(true);
  };



  const handleDownload = (type: string, filters?: string[]) => {
    downloadReport(type, { patientId, startDate: useDateRange ? startDate : undefined, endDate: useDateRange ? endDate : undefined, filters });
    onDownload(type, filters);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="mb-5">
          <h4 className="text-lg font-semibold text-gray-800 mb-1">Patient Report</h4>
          <p className="text-sm text-gray-500">Select sections to include in the report</p>
        </div>

        <div className="mb-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {["Demographics", "Insurance", "Immunizations", "Allergies", "Billing", "Medications", "Vitals", "Medical Problems"].map((f) => (
              <label key={f} className={`flex items-center gap-2 px-3 py-2 border rounded-md cursor-pointer transition text-sm ${reportFilters.includes(f) ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 hover:bg-gray-50'
                }`}>
                <input type="checkbox" checked={reportFilters.includes(f)} onChange={() => handleCheckboxChange(f)} className="w-4 h-4" />
                <span className="font-medium">{f}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <button onClick={() => setActiveTab(lastVisitedTab)} className="text-sm text-gray-600 hover:text-gray-800 font-medium">
            Cancel
          </button>
          <div className="flex gap-3">
            <button onClick={() => handleGenerate("Patient", reportFilters)} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition">
              Generate Report
            </button>
          </div>
        </div>
      </div>

      {showModal && reportData && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="modal-wrapper bg-white w-full max-w-4xl max-h-[90vh] overflow-hidden print:overflow-visible rounded-lg shadow-xl print:max-h-none print:overflow-visible" onClick={(e) => e.stopPropagation()}>
            <div id="print-container">
              <div className="print-header bg-blue-600 px-6 py-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-white">
                      {reportData.demographics ? (
                        `${reportData.demographics.firstName} ${reportData.demographics.middleName ? reportData.demographics.middleName + ' ' : ''}${reportData.demographics.lastName}`
                      ) : 'Patient Report'}
                    </h2>
                    <div className="flex gap-4 mt-2 text-sm text-blue-100">
                      {reportData.demographics?.dateOfBirth && <span>DOB: {reportData.demographics.dateOfBirth}</span>}
                      <span>Report Date: {new Date().toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 no-print">
                    <button onClick={handlePrint} className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 font-medium text-sm flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      Print
                    </button>
                    <button onClick={() => setShowModal(false)} className="text-white hover:text-gray-200">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              <div id="report-content" className="overflow-y-auto bg-gray-50 print:overflow-visible print:max-h-none print:h-auto" style={{ maxHeight: 'calc(90vh - 120px)' }}>
                <div className="max-w-4xl mx-auto bg-white">
                  <div className="p-6 space-y-5">
                    {reportFilters.includes('Demographics') && (
                      <div className="report-section border border-gray-300 rounded p-4">
                        <h3 className="text-sm font-bold text-gray-900 mb-3 pb-2 border-b border-blue-500">DEMOGRAPHICS</h3>
                        {reportData?.demographics ? (
                          <div className="grid grid-cols-3 gap-x-6 gap-y-2.5">
                            {reportData.demographics.firstName && (
                              <div><span className="text-xs text-gray-600 block mb-0.5">First Name</span><span className="text-sm font-medium text-gray-900">{reportData.demographics.firstName}</span></div>
                            )}
                            {reportData.demographics.middleName && (
                              <div><span className="text-xs text-gray-600 block mb-0.5">Middle Name</span><span className="text-sm font-medium text-gray-900">{reportData.demographics.middleName}</span></div>
                            )}
                            {reportData.demographics.lastName && (
                              <div><span className="text-xs text-gray-600 block mb-0.5">Last Name</span><span className="text-sm font-medium text-gray-900">{reportData.demographics.lastName}</span></div>
                            )}
                            {reportData.demographics.dateOfBirth && (
                              <div><span className="text-xs text-gray-600 block mb-0.5">Date of Birth</span><span className="text-sm font-medium text-gray-900">{reportData.demographics.dateOfBirth}</span></div>
                            )}
                            {reportData.demographics.gender && (
                              <div><span className="text-xs text-gray-600 block mb-0.5">Gender</span><span className="text-sm font-medium text-gray-900">{reportData.demographics.gender}</span></div>
                            )}
                            {reportData.demographics.medicalRecordNumber && (
                              <div><span className="text-xs text-gray-600 block mb-0.5">MRN</span><span className="text-sm font-medium text-gray-900">{reportData.demographics.medicalRecordNumber}</span></div>
                            )}
                            {reportData.demographics.email && (
                              <div><span className="text-xs text-gray-600 block mb-0.5">Email</span><span className="text-sm font-medium text-gray-900">{reportData.demographics.email}</span></div>
                            )}
                            {reportData.demographics.phoneNumber && (
                              <div><span className="text-xs text-gray-600 block mb-0.5">Phone</span><span className="text-sm font-medium text-gray-900">{reportData.demographics.phoneNumber}</span></div>
                            )}
                            {reportData.demographics.maritalStatus && (
                              <div><span className="text-xs text-gray-600 block mb-0.5">Marital Status</span><span className="text-sm font-medium text-gray-900">{reportData.demographics.maritalStatus}</span></div>
                            )}
                            {reportData.demographics.status && (
                              <div><span className="text-xs text-gray-600 block mb-0.5">Status</span><span className="text-sm font-medium text-gray-900">{reportData.demographics.status}</span></div>
                            )}
                            <div><span className="text-xs text-gray-600 block mb-0.5">Location</span><span className="text-sm font-medium text-gray-900">{[reportData.demographics.city, reportData.demographics.state, reportData.demographics.postalCode].filter(Boolean).join(', ') || '-'}</span></div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 italic">No demographics data available.</p>
                        )}
                      </div>
                    )}

                    {reportFilters.includes('Insurance') && (
                      <div className="report-section border border-gray-300 rounded p-4">
                        <h3 className="text-sm font-bold text-gray-900 mb-3 pb-2 border-b border-blue-500">INSURANCE COVERAGE</h3>
                        {reportData?.insurance ? (
                          <div className="grid grid-cols-3 gap-4">
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                                <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Primary</span>
                              </div>
                              <p className="text-sm font-bold text-gray-900">{reportData.insurance.primary.companyName === '-' ? 'N/A' : reportData.insurance.primary.companyName}</p>
                              <p className="text-xs text-gray-600 mt-1">({reportData.insurance.primary.insuranceName === '-' ? 'N/A' : reportData.insurance.primary.insuranceName})</p>
                            </div>
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                                <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Secondary</span>
                              </div>
                              <p className="text-sm font-bold text-gray-900">{reportData.insurance.secondary.companyName === '-' ? 'N/A' : reportData.insurance.secondary.companyName}</p>
                              <p className="text-xs text-gray-600 mt-1">({reportData.insurance.secondary.insuranceName === '-' ? 'N/A' : reportData.insurance.secondary.insuranceName})</p>
                            </div>
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                                <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Tertiary</span>
                              </div>
                              <p className="text-sm font-bold text-gray-900">{reportData.insurance.tertiary.companyName === '-' ? 'N/A' : reportData.insurance.tertiary.companyName}</p>
                              <p className="text-xs text-gray-600 mt-1">({reportData.insurance.tertiary.insuranceName === '-' ? 'N/A' : reportData.insurance.tertiary.insuranceName})</p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 italic">No insurance data available.</p>
                        )}
                      </div>
                    )}

                    {reportFilters.includes('Immunizations') && (
                      <div className="report-section border border-gray-300 rounded p-4">
                        <h3 className="text-sm font-bold text-gray-900 mb-3 pb-2 border-b border-blue-500">LATEST IMMUNIZATION</h3>
                        {reportData?.immunization ? (
                          <div className="overflow-x-auto print:overflow-visible print:overflow-visible">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-gray-100">
                                  <th className="text-left p-2 font-semibold text-gray-700">Date/Time</th>
                                  <th className="text-left p-2 font-semibold text-gray-700">CVX</th>
                                  <th className="text-left p-2 font-semibold text-gray-700">Manufacturer</th>
                                  <th className="text-left p-2 font-semibold text-gray-700">Lot</th>
                                  <th className="text-left p-2 font-semibold text-gray-700">Route</th>
                                  <th className="text-left p-2 font-semibold text-gray-700">Site</th>
                                  <th className="text-left p-2 font-semibold text-gray-700">Status</th>
                                  <th className="text-left p-2 font-semibold text-gray-700">Notes</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr className="border-b border-gray-200">
                                  <td className="p-2 text-gray-900">{reportData.immunization.dateTimeAdministered?.replace('.000Z', '').replace('T', ' ') || 'N/A'}</td>
                                  <td className="p-2 text-gray-900">{reportData.immunization.cvxCode || 'N/A'}</td>
                                  <td className="p-2 text-gray-900">{reportData.immunization.manufacturer || 'N/A'}</td>
                                  <td className="p-2 text-gray-900">{reportData.immunization.lotNumber || 'N/A'}</td>
                                  <td className="p-2 text-gray-900">{reportData.immunization.route || 'N/A'}</td>
                                  <td className="p-2 text-gray-900">{reportData.immunization.administrationSite || 'N/A'}</td>
                                  <td className="p-2 text-gray-900">{reportData.immunization.completionStatus || 'N/A'}</td>
                                  <td className="p-2 text-gray-900">{reportData.immunization.notes || 'N/A'}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 italic">No immunization data available.</p>
                        )}
                      </div>
                    )}

                    {reportFilters.includes('Allergies') && (
                      <div className="report-section border border-gray-300 rounded p-4">
                        <h3 className="text-sm font-bold text-gray-900 mb-3 pb-2 border-b border-blue-500">TOP 3 ALLERGIES</h3>
                        {reportData?.allergies && reportData.allergies.length > 0 ? (
                          <div className="overflow-x-auto print:overflow-visible">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-gray-100">
                                  <th className="text-left p-2 font-semibold text-gray-700">Name</th>
                                  <th className="text-left p-2 font-semibold text-gray-700">Status</th>
                                  <th className="text-left p-2 font-semibold text-gray-700">Reaction</th>
                                </tr>
                              </thead>
                              <tbody>
                                {reportData.allergies.map((allergy: any, idx: number) => (
                                  <tr key={idx} className="border-b border-gray-200">
                                    <td className="p-2 text-gray-900">{allergy.allergyName || 'N/A'}</td>
                                    <td className="p-2 text-gray-900">{allergy.status || 'N/A'}</td>
                                    <td className="p-2 text-gray-900">{allergy.reaction || 'N/A'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 italic">No allergy data available.</p>
                        )}
                      </div>
                    )}

                    {reportFilters.includes('Medical Problems') && (
                      <div className="report-section border border-gray-300 rounded p-4">
                        <h3 className="text-sm font-bold text-gray-900 mb-3 pb-2 border-b border-blue-500">TOP 3 MEDICAL PROBLEMS</h3>
                        {reportData?.medicalProblems && reportData.medicalProblems.length > 0 ? (
                          <div className="overflow-x-auto print:overflow-visible">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-gray-100">
                                  <th className="text-left p-2 font-semibold text-gray-700">Title</th>
                                  <th className="text-left p-2 font-semibold text-gray-700">Occurrence</th>
                                  <th className="text-left p-2 font-semibold text-gray-700">Outcome</th>
                                  <th className="text-left p-2 font-semibold text-gray-700">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {reportData.medicalProblems.map((problem: any, idx: number) => (
                                  <tr key={idx} className="border-b border-gray-200">
                                    <td className="p-2 text-gray-900">{problem.title || 'N/A'}</td>
                                    <td className="p-2 text-gray-900">{problem.occurrence || 'N/A'}</td>
                                    <td className="p-2 text-gray-900">{problem.outcome || 'N/A'}</td>
                                    <td className="p-2 text-gray-900">{problem.verificationStatus || 'N/A'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 italic">No medical problems data available.</p>
                        )}
                      </div>
                    )}

                    {reportFilters.includes('Medications') && (
                      <div className="report-section border border-gray-300 rounded p-4">
                        <h3 className="text-sm font-bold text-gray-900 mb-3 pb-2 border-b border-blue-500">LATEST 2 MEDICATIONS</h3>
                        {reportData?.medications && reportData.medications.length > 0 ? (
                          <div className="overflow-x-auto print:overflow-visible">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-gray-100">
                                  <th className="text-left p-2 font-semibold text-gray-700">Medication Name</th>
                                  <th className="text-left p-2 font-semibold text-gray-700">Dosage</th>
                                  <th className="text-left p-2 font-semibold text-gray-700">Prescribing Doctor</th>
                                </tr>
                              </thead>
                              <tbody>
                                {reportData.medications.map((medication: any, idx: number) => (
                                  <tr key={idx} className="border-b border-gray-200">
                                    <td className="p-2 text-gray-900">{medication.medicationName || 'N/A'}</td>
                                    <td className="p-2 text-gray-900">{medication.dosage || 'N/A'}</td>
                                    <td className="p-2 text-gray-900">{medication.prescribingDoctor || 'N/A'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 italic">No medications data available.</p>
                        )}
                      </div>
                    )}

                    {reportFilters.includes('Vitals') && (
                      <div className="report-section border border-gray-300 rounded p-4">
                        <h3 className="text-sm font-bold text-gray-900 mb-3 pb-2 border-b border-blue-500">LATEST VITALS</h3>
                        {reportData?.vitals ? (
                          <div className="grid grid-cols-3 gap-x-6 gap-y-2.5">
                            <div><span className="text-xs text-gray-600 block mb-0.5">Weight (kg)</span><span className="text-sm font-medium text-gray-900">{reportData.vitals.weightKg || 'N/A'}</span></div>
                            <div><span className="text-xs text-gray-600 block mb-0.5">Height (cm)</span><span className="text-sm font-medium text-gray-900">{reportData.vitals.heightCm || 'N/A'}</span></div>
                            <div><span className="text-xs text-gray-600 block mb-0.5">BP Systolic</span><span className="text-sm font-medium text-gray-900">{reportData.vitals.bpSystolic || 'N/A'}</span></div>
                            <div><span className="text-xs text-gray-600 block mb-0.5">Pulse</span><span className="text-sm font-medium text-gray-900">{reportData.vitals.pulse || 'N/A'}</span></div>
                            <div><span className="text-xs text-gray-600 block mb-0.5">Respiration</span><span className="text-sm font-medium text-gray-900">{reportData.vitals.respiration || 'N/A'}</span></div>
                            <div><span className="text-xs text-gray-600 block mb-0.5">Temperature (°C)</span><span className="text-sm font-medium text-gray-900">{reportData.vitals.temperatureC || 'N/A'}</span></div>
                            <div><span className="text-xs text-gray-600 block mb-0.5">Oxygen Saturation</span><span className="text-sm font-medium text-gray-900">{reportData.vitals.oxygenSaturation || 'N/A'}</span></div>
                            <div><span className="text-xs text-gray-600 block mb-0.5">BMI</span><span className="text-sm font-medium text-gray-900">{reportData.vitals.bmi || 'N/A'}</span></div>
                            <div><span className="text-xs text-gray-600 block mb-0.5">Notes</span><span className="text-sm font-medium text-gray-900">{reportData.vitals.notes || 'N/A'}</span></div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 italic">No vitals data available.</p>
                        )}
                      </div>
                    )}

                    {reportFilters.includes('Billing') && (
                      <div className="report-section border border-gray-300 rounded p-4">
                        <h3 className="text-sm font-bold text-gray-900 mb-3 pb-2 border-b border-blue-500">LATEST 5 PATIENT PAYMENTS</h3>
                        {reportData?.patientPayments && reportData.patientPayments.length > 0 ? (
                          <div className="overflow-x-auto print:overflow-visible">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-gray-100">
                                  <th className="text-left p-2 font-semibold text-gray-700">Payment ID</th>
                                  <th className="text-left p-2 font-semibold text-gray-700">Amount</th>
                                  <th className="text-left p-2 font-semibold text-gray-700">Payment Method</th>
                                  <th className="text-left p-2 font-semibold text-gray-700">Date</th>
                                </tr>
                              </thead>
                              <tbody>
                                {reportData.patientPayments.map((payment: any, idx: number) => (
                                  <tr key={idx} className="border-b border-gray-200">
                                    <td className="p-2 text-gray-900">{payment.id || 'N/A'}</td>
                                    <td className="p-2 text-gray-900">${payment.amount?.toFixed(2) || 'N/A'}</td>
                                    <td className="p-2 text-gray-900">{payment.paymentMethod || 'N/A'}</td>
                                    <td className="p-2 text-gray-900">{payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : 'N/A'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 italic">No billing data available.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
