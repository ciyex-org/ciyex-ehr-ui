/**
 * Zuub AI Insurance Verification API Integration
 * Handles DENTAL insurance eligibility verification with AI-enhanced data
 * 
 * API Documentation: https://zuub.com/dental-insurance-eligibility-verification-api/
 * Features:
 * - 350+ payer integrations
 * - AI-enhanced coverage details
 * - Normalized JSON responses
 * - Direct payer connections (not EDI)
 * 
 * CREDENTIALS: Managed via Settings → Integration page (stored in database)
 * Last Updated: October 22, 2025
 */

import { getEnv } from "@/utils/env";
import { fetchWithAuth } from './fetchWithAuth';

// Zuub API Configuration
const ZUUB_API_BASE_URL = "https://api.zuub.com/v1"; // Default API URL
const API_BASE = getEnv("NEXT_PUBLIC_API_URL") || "http://localhost:8080";

/**
 * Get Zuub credentials from org-configs
 */
async function getZuubCredentials() {
  try {
    // Get orgId from localStorage (same as Settings page does)
    const keys = ['orgId', 'orgID', 'org_id'];
    const orgId = keys.map((k) => localStorage.getItem(k)).find(Boolean);
    
    if (!orgId) {
      throw new Error("Organization ID not found. Please log in again.");
    }

    // Removed debug log
    const res = await fetchWithAuth(`${API_BASE}/api/org-configs/by-org/${orgId}`);
    
    if (!res.ok) {
      if (res.status === 404) {
        throw new Error(
          "Organization configuration not found. Please go to Settings → Integration and configure Zuub AI Insurance Verification."
        );
      }
      throw new Error(`Failed to fetch org config: ${res.status}`);
    }
    
    const data = await res.json();
    // Removed debug log
    
    const zuub = data.integrations?.zuub;
    
    if (!zuub || !zuub.apiKey) {
      throw new Error(
        "Zuub credentials not configured. Please go to Settings → Integration and configure Zuub AI Insurance Verification."
      );
    }
    
    // Removed debug log
    return {
      apiKey: zuub.apiKey,
      apiUrl: zuub.apiUrl || ZUUB_API_BASE_URL, // Use custom URL or default
    };
  } catch (error) {
    // logger.error(" Error fetching Zuub credentials:", error);
    throw new Error(
      "Unable to load Zuub credentials. Please configure them in Settings → Integration."
    );
  }
}

interface ZuubInsuranceEligibilityRequest {
  patientId: number;
  providerId: number;
  appointmentId?: number;
  insuranceLevel?: 'primary' | 'secondary' | 'tertiary'; // NEW: Which insurance to verify
  insuranceDetails?: Record<string, unknown>; // NEW: Insurance coverage details
  // Optional: Pass patient/provider data directly to avoid API calls
  patientData?: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    memberId?: string;
    ssn?: string;
  };
  providerData?: {
    npi?: string;
    firstName?: string;
    lastName?: string;
    taxId?: string;
  };
  insuranceData?: {
    carrierId?: string;
    groupNumber?: string;
    planName?: string;
  };
}

interface ZuubInsuranceEligibilityResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  message?: string;
}

/**
 * Verify DENTAL Insurance Eligibility using Zuub AI API
 * 
 * ⚠️ IMPORTANT: This function verifies DENTAL insurance ONLY
 * 
 * Features:
 * - Real-time eligibility verification
 * - AI-enhanced benefit details
 * - Coverage limits and frequency rules
 * - Normalized, structured JSON response
 * - Direct payer integration (350+ payers)
 * 
 * @param request - Patient and provider information
 * @returns Promise with eligibility verification results
 */
export async function verifyInsuranceEligibility(
  request: ZuubInsuranceEligibilityRequest
): Promise<ZuubInsuranceEligibilityResponse> {
  try {
    // Step 1: Get Zuub credentials from Settings
    const credentials = await getZuubCredentials();

    // Step 2: Get patient and provider data
    let patient;
    let provider;

    if (request.patientData) {
      patient = request.patientData;
      // Removed debug log
    } else {
      // Fetch patient details from your API
      // logger.debug(` Fetching patient data for patient ID: ${request.patientId}`);
      const patientRes = await fetchWithAuth(`${API_BASE}/api/patients/${request.patientId}`);
      
      if (!patientRes.ok) {
        throw new Error(`Failed to fetch patient: ${patientRes.status}`);
      }
      
      patient = await patientRes.json();
      // Removed debug log
    }

    if (request.providerData) {
      provider = request.providerData;
      // Removed debug log
    } else {
      // Fetch provider details from your API
      // logger.debug(` Fetching provider data for provider ID: ${request.providerId}`);
      const providerRes = await fetchWithAuth(`${API_BASE}/api/providers/${request.providerId}`);
      
      if (!providerRes.ok) {
        throw new Error(`Failed to fetch provider: ${providerRes.status}`);
      }
      
      provider = await providerRes.json();
      // Removed debug log
    }

    // Step 3: Build Zuub API request
    // Note: Adjust fields based on actual Zuub API documentation
    const zuubRequest = {
      // Patient Information
      patient: {
        first_name: patient.firstName || patient.first_name,
        last_name: patient.lastName || patient.last_name,
        date_of_birth: patient.dateOfBirth || patient.date_of_birth,
        member_id: patient.memberId || patient.member_id || request.insuranceData?.groupNumber,
        ssn: patient.ssn,
      },
      
      // Provider Information
      provider: {
        npi: provider.npi,
        first_name: provider.firstName || provider.first_name,
        last_name: provider.lastName || provider.last_name,
        tax_id: provider.taxId || provider.tax_id,
      },
      
      // Insurance Information (if available)
      insurance: request.insuranceData ? {
        carrier_id: request.insuranceData.carrierId,
        group_number: request.insuranceData.groupNumber,
        plan_name: request.insuranceData.planName,
      } : undefined,
      
      // Service Type: DENTAL
      service_type: "dental",
      
      // Optional: Appointment details
      appointment_id: request.appointmentId?.toString(),
    };

    // Removed debug log
    // logger.debug(" Request payload:", JSON.stringify(zuubRequest, null, 2));

    // Step 4: Call Zuub API
    const response = await fetch(`${credentials.apiUrl}/eligibility/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${credentials.apiKey}`,
        "X-Api-Key": credentials.apiKey, // Some APIs use X-Api-Key header
      },
      body: JSON.stringify(zuubRequest),
    });

    // Step 5: Handle response
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorText = errorData ? JSON.stringify(errorData) : await response.text();
      
      // logger.error(" Zuub API error:", errorText);
      
      // Handle specific error codes
      if (response.status === 401) {
        throw new Error(
          "❌ ZUUB AUTHENTICATION ERROR\n\n" +
          "Your Zuub API key is invalid or expired.\n\n" +
          "🔧 QUICK FIX:\n" +
          "1. Go to Settings → Integration\n" +
          "2. Find 'Zuub AI Insurance Verification' card\n" +
          "3. Click Edit and verify your API Key\n" +
          "4. Save and try again"
        );
      }
      
      if (response.status === 404) {
        throw new Error(
          "Patient not found or insurance information is incomplete. " +
          "Please verify the patient has valid insurance information."
        );
      }
      
      throw new Error(`Zuub API error: ${response.status} - ${errorText}`);
    }

    const eligibilityData = await response.json();
    // Removed debug log
    // Removed debug log

    return {
      success: true,
      data: eligibilityData,
      message: "DENTAL insurance eligibility verified successfully",
    };

  } catch (error: any) {
    // logger.error(" Error verifying insurance eligibility:", error);
    
    return {
      success: false,
      error: error.message || "Unknown error occurred",
      message: "Failed to verify insurance eligibility. " + error.message,
    };
  }
}

/**
 * Get insurance benefit details for a specific service/procedure
 * 
 * @param patientId - Patient ID
 * @param procedureCode - ADA procedure code (e.g., "D0120" for periodic oral evaluation)
 * @returns Promise with benefit details
 */
export async function getBenefitDetails(
  patientId: number,
  procedureCode: string
): Promise<any> {
  try {
    const credentials = await getZuubCredentials();

    // logger.debug(` Fetching benefit details for procedure: ${procedureCode}`);

    const response = await fetch(`${credentials.apiUrl}/benefits/procedure`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${credentials.apiKey}`,
      },
      body: JSON.stringify({
        patient_id: patientId.toString(),
        procedure_code: procedureCode,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch benefit details: ${response.status}`);
    }

    const benefitData = await response.json();
    // Removed debug log

    return benefitData;
  } catch (error: any) {
    // logger.error(" Error fetching benefit details:", error);
    throw error;
  }
}

/**
 * Get historical benefit usage for a patient
 * 
 * @param patientId - Patient ID
 * @param year - Year to fetch usage for (optional, defaults to current year)
 * @returns Promise with usage history
 */
export async function getBenefitUsage(
  patientId: number,
  year?: number
): Promise<any> {
  try {
    const credentials = await getZuubCredentials();

    const currentYear = year || new Date().getFullYear();
    // logger.debug(` Fetching benefit usage for year: ${currentYear}`);

    const response = await fetch(`${credentials.apiUrl}/benefits/usage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${credentials.apiKey}`,
      },
      body: JSON.stringify({
        patient_id: patientId.toString(),
        year: currentYear,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch benefit usage: ${response.status}`);
    }

    const usageData = await response.json();
    // Removed debug log

    return usageData;
  } catch (error: any) {
    // logger.error(" Error fetching benefit usage:", error);
    throw error;
  }
}
