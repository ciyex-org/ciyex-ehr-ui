/**
 * Sikka API Integration - v3.3 (FIXED - Request-Key in Header)
 * Handles authentication and DENTAL insurance eligibility verification
 * 
 * API Documentation: https://apidocs.sikkasoft.com/#64dbebb9-44ed-4d88-a8c7-a024b02aeec7
 * Endpoint: POST /v4/sandbox/patient_eligibility
 * Authentication: Request-Key header (NOT URL parameter!)
 * 
 * CREDENTIALS: Managed via Settings → Integration page (stored in database)
 * 
 * CRITICAL: request_key MUST be sent in "Request-Key" header, not as URL query parameter!
 * 
 * Last Updated: October 23, 2025
 */

import { getEnv } from "@/utils/env";
import { fetchWithAuth } from './fetchWithAuth';

// Sikka API Configuration
const SIKKA_API_BASE_URL = "https://api.sikkasoft.com/v4";
const API_BASE = getEnv("NEXT_PUBLIC_API_URL") || "http://localhost:8080";

// ✅ CORRECT: Use "sandbox/patient_eligibility" with SLASH (as per Sikka support)
const PATIENT_ELIGIBILITY_ENDPOINT = "sandbox/patient_eligibility";

/**
 * Get Sikka credentials from org-configs
 */
async function getSikkaCredentials() {
  try {
    console.log("🔍 Fetching Sikka credentials from database...");
    
    // Use the /api/orgConfig/map endpoint which doesn't require orgId in URL
    // fetchWithAuth will automatically include orgId in headers
    const res = await fetchWithAuth(`${API_BASE}/api/orgConfig/map`);
    
    if (!res.ok) {
      if (res.status === 404) {
        throw new Error(
          "Organization configuration not found. Please go to Settings → Integration and configure Insurance Verification."
        );
      }
      if (res.status === 401) {
        throw new Error(
          "Authentication failed. Please log out and log in again."
        );
      }
      throw new Error(`Failed to fetch org config: ${res.status}`);
    }
    
    const flatMap = await res.json();
    console.log("📦 Org config map fetched:", Object.keys(flatMap || {}).length, "keys");
    
    // Extract Sikka credentials - try multiple possible key formats
    let sikkaAppId = flatMap['integrations.sikka.appId'] || flatMap['sikka.appId'];
    let sikkaAppKey = flatMap['integrations.sikka.appKey'] || flatMap['sikka.appKey'];
    let sikkaRefreshKey = flatMap['integrations.sikka.refreshKey'] || flatMap['sikka.refreshKey'];
    
    // Also check nested structure
    if (!sikkaAppId && flatMap.integrations?.sikka) {
      sikkaAppId = flatMap.integrations.sikka.appId;
      sikkaAppKey = flatMap.integrations.sikka.appKey;
      sikkaRefreshKey = flatMap.integrations.sikka.refreshKey;
    }
    
    if (!sikkaAppId || !sikkaAppKey) {
      console.log("⚠️ Insurance credentials missing in config:", { 
        hasAppId: !!sikkaAppId, 
        hasAppKey: !!sikkaAppKey,
        availableKeys: Object.keys(flatMap)
      });
      throw new Error(
        "Insurance verification credentials not configured. Please go to Settings → Integration and configure Insurance Verification."
      );
    }
    
    console.log("✅ Insurance credentials loaded successfully");
    return {
      appId: sikkaAppId,
      appKey: sikkaAppKey,
      refreshKey: sikkaRefreshKey || sikkaAppKey, // Use appKey as fallback
    };
  } catch (error) {
    console.error("❌ Error fetching insurance credentials:", error);
    if (error instanceof Error && error.message.includes("not configured")) {
      throw error; // Re-throw configuration errors as-is
    }
    throw new Error(
      "Unable to load insurance verification credentials. Please configure them in Settings → Integration."
    );
  }
}

interface SikkaRequestKeyResponse {
  href: string;
  status: string;
  request_key: string;
  start_time: string;
  end_time: string;
  expires_in: string;
  issued_to: string;
  request_count: string;
  scope: string;
  refresh_key: string;
}

interface SikkaInsuranceEligibilityRequest {
  patientId: number;
  providerId: number;
  appointmentId?: number;
  // Optional: Pass patient/provider data directly to avoid API calls
  patientData?: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    medicalRecordNumber?: string;
  };
  providerData?: {
    npi?: string;
    firstName?: string;
    lastName?: string;
  };
}

interface SikkaInsuranceEligibilityResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  message?: string;
}

/**
 * Get Sikka Request Key (Authentication)
 * This generates a request key for API calls using credentials from Settings
 */
export async function getSikkaRequestKey(): Promise<string> {
  try {
    // Fetch credentials from Settings → Integration
    const credentials = await getSikkaCredentials();
    
    console.log("🔑 Requesting new Sikka request key...");
    
    const response = await fetch(`${SIKKA_API_BASE_URL}/request_key`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "refresh_key",
        refresh_key: credentials.refreshKey,
        app_id: credentials.appId,
        app_key: credentials.appKey,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorText = errorData ? JSON.stringify(errorData) : await response.text();
      
      // Check if it's an authorization error
      if (response.status === 401 || response.status === 403) {
        const errorCode = errorData?.error_code || "AUTH_ERROR";
        
        if (errorCode === "API2003") {
          throw new Error(
            `❌ CREDENTIALS ERROR\n\n` +
            `Your insurance verification credentials are incorrect.\n\n` +
            `Error: ${errorData?.short_message || "Authentication Failed"}\n` +
            `Details: ${errorData?.long_message || "Credentials are incorrect"}\n\n` +
            `🔧 QUICK FIX:\n` +
            `1. Go to Settings → Integration\n` +
            `2. Find "Insurance Verification" card\n` +
            `3. Click Edit and verify your credentials\n` +
            `4. Save and try again`
          );
        }
        
        throw new Error(
          `Authorization Error: The insurance verification API is not accessible. ` +
          `Error details: ${errorText}`
        );
      }
      
      throw new Error(`Failed to get insurance verification request key: ${response.status} - ${errorText}`);
    }

    const data: SikkaRequestKeyResponse = await response.json();
    
    if (data.status !== "active" || !data.request_key) {
      throw new Error("Invalid insurance verification request key response");
    }

    console.log("✅ Successfully obtained request key from insurance verification API");
    return data.request_key;
  } catch (error) {
    console.error("❌ Error getting Sikka request key:", error);
    throw error;
  }
}

/**
 * Generate mock DENTAL insurance eligibility data for testing
 * NOTE: This system is for DENTAL insurance verification ONLY
 */
/**
 * Verify DENTAL Insurance Eligibility using Sikka API
 * 
 * ⚠️ IMPORTANT: This function verifies DENTAL insurance ONLY
 * It should NOT be used for medical insurance verification
 * 
 * @param request - Patient and provider information
 * @returns DENTAL insurance eligibility verification result
 */
export async function verifyInsuranceEligibility(
  request: SikkaInsuranceEligibilityRequest
): Promise<SikkaInsuranceEligibilityResponse> {
  try {
    console.log("🚀 Starting DENTAL insurance eligibility verification...");
    
    // Step 1: Get a FRESH authentication request key (valid for 24 hours)
    // This is called EVERY TIME to avoid using expired keys
    console.log("🔄 Requesting fresh request_key from Sikka...");
    const requestKey = await getSikkaRequestKey();
    console.log("✅ Fresh request_key obtained:", requestKey.substring(0, 30) + "...");

    // Step 2: Get patient and provider data
    // If data is provided directly, use it; otherwise fetch from API
    let patient;
    let provider;

    if (request.patientData) {
      // Use provided patient data
      patient = request.patientData;
      console.log("✅ Using provided patient data");
    } else {
      // Fetch patient details from backend API
      console.log(`🔍 Fetching REAL patient data for patient ID ${request.patientId}...`);
      
      // fetchWithAuth handles authentication and orgId automatically
      const patientResponse = await fetchWithAuth(
        `${getEnv("NEXT_PUBLIC_API_URL")}/api/patients/${request.patientId}`
      );
      
      if (!patientResponse.ok) {
        const errorText = await patientResponse.text();
        console.error("❌ Patient API Error:", {
          status: patientResponse.status,
          statusText: patientResponse.statusText,
          body: errorText
        });
        
        if (patientResponse.status === 401) {
          throw new Error(
            `❌ AUTHENTICATION FAILED (401 Unauthorized)\n\n` +
            `Your session may have expired. Please:\n` +
            `1. Logout and login again\n` +
            `2. Make sure you have access to patient records\n` +
            `3. Try the verification again\n\n` +
            `Technical details: ${errorText}`
          );
        } else if (patientResponse.status === 403) {
          throw new Error(
            `❌ ACCESS DENIED (403 Forbidden)\n\n` +
            `You don't have permission to view patient ID ${request.patientId}.\n` +
            `Please contact your administrator.\n\n` +
            `Technical details: ${errorText}`
          );
        } else {
          throw new Error(
            `Failed to fetch patient data (Status: ${patientResponse.status}).\n` +
            `Technical details: ${errorText}`
          );
        }
      }
      
      const patientData = await patientResponse.json();
      console.log("📦 Patient API Response:", patientData);
      
      // Comprehensive validation
      if (!patientData) {
        throw new Error("Patient API returned empty response");
      }
      
      if (!patientData.success) {
        throw new Error(
          `Patient API request failed: ${patientData.message || 'Unknown error'}\n` +
          `Patient ID: ${request.patientId}\n` +
          `This usually means the patient doesn't exist or you don't have access.`
        );
      }
      
      if (!patientData.data) {
        throw new Error(
          `Patient not found in database (Patient ID: ${request.patientId}).\n` +
          `API message: ${patientData.message}\n` +
          `Please verify the patient exists and belongs to your organization.`
        );
      }
      
      patient = patientData.data;
      console.log(`✅ REAL patient data fetched successfully:`, {
        name: `${patient.firstName} ${patient.lastName}`,
        dob: patient.dateOfBirth,
        mrn: patient.medicalRecordNumber || patient.id
      });
    }

    if (request.providerData) {
      // Use provided provider data
      provider = request.providerData;
      console.log("✅ Using provided provider data");
    } else {
      // Fetch provider details from backend API
      console.log(`🔍 Fetching REAL provider data for provider ID ${request.providerId}...`);
      
      const providerResponse = await fetchWithAuth(
        `${getEnv("NEXT_PUBLIC_API_URL")}/api/providers/${request.providerId}`
      );
      
      if (!providerResponse.ok) {
        const errorText = await providerResponse.text();
        console.error("❌ Provider API Error:", {
          status: providerResponse.status,
          statusText: providerResponse.statusText,
          body: errorText
        });
        
        if (providerResponse.status === 401) {
          throw new Error(
            `❌ AUTHENTICATION FAILED (401 Unauthorized)\n` +
            `Your session may have expired. Please logout and login again.`
          );
        } else if (providerResponse.status === 403) {
          throw new Error(
            `❌ ACCESS DENIED: You don't have permission to view provider ID ${request.providerId}.`
          );
        } else {
          throw new Error(
            `Failed to fetch provider data (Status: ${providerResponse.status}).\n` +
            `Details: ${errorText}`
          );
        }
      }
      
      const providerData = await providerResponse.json();
      console.log("📦 Provider API response:", providerData);
      
      // Validate response structure
      if (!providerData) {
        throw new Error(`Provider API returned empty response for provider ID ${request.providerId}.`);
      }
      
      if (!providerData.success) {
        throw new Error(
          `Provider API request failed: ${providerData.message || 'Unknown error'}.\n` +
          `Provider ID: ${request.providerId}`
        );
      }
      
      if (!providerData.data) {
        throw new Error(
          `Provider not found in database (Provider ID: ${request.providerId}).\n` +
          `API message: ${providerData.message}`
        );
      }
      
      provider = providerData.data;
      console.log(`✅ REAL provider data fetched successfully:`, {
        name: `Dr. ${provider.firstName} ${provider.lastName}`,
        npi: provider.npi,
        specialty: provider.specialty
      });
    }

    // Step 3: Prepare DENTAL patient eligibility request payload
    // ✅ Validate patient data exists
    if (!patient || typeof patient !== 'object') {
      throw new Error(
        `Patient data is invalid or missing. Received: ${JSON.stringify(patient)}. ` +
        `Please ensure patient ID ${request.patientId} exists in the database with complete information.`
      );
    }

    // Format date as YYYY-MM-DD (Sikka requirement)
    const dob = patient.dateOfBirth?.split('T')[0] || patient.dateOfBirth || "1990-01-01";
    
    // ✅ Ensure all fields have at least 2 characters (Sikka validation requirement)
    const firstName = patient.firstName || "Test";
    const lastName = patient.lastName || "Patient";
    const subscriberId = patient.medicalRecordNumber || patient.id?.toString() || request.patientId.toString() || "123456";

    // ✅ Additional validation - check if essential fields are present
    if (!firstName || firstName.trim().length === 0) {
      throw new Error(
        `Patient first name is missing for patient ID ${request.patientId}. ` +
        `Please update the patient record in the database with complete information.`
      );
    }
    
    if (!lastName || lastName.trim().length === 0) {
      throw new Error(
        `Patient last name is missing for patient ID ${request.patientId}. ` +
        `Please update the patient record in the database with complete information.`
      );
    }
    
    // Validate minimum length (at least 2 characters for each field)
    const eligibilityPayload = {
      firstname: firstName.length >= 2 ? firstName : "TestPatient",
      lastname: lastName.length >= 2 ? lastName : "TestLastName",
      birthdate: dob,
      subscriber_id: subscriberId.length >= 2 ? subscriberId : "1234567890",
      npi: provider.npi || "1234567890",
      payer_id: "PRINCIPAL",
    };

    // Validate all required fields are present
    console.log("🦷 Verifying DENTAL insurance eligibility with Sikka...");
    console.log("📋 Patient data:", { firstName: patient.firstName, lastName: patient.lastName, dob: patient.dateOfBirth });
    console.log("📋 Request payload:", eligibilityPayload);
    console.log("🔑 Using request_key:", requestKey.substring(0, 30) + "...");

    // Step 4: Call Sikka Patient Eligibility API
    // ✅ CRITICAL: request_key goes in HEADER as "Request-Key" (not URL parameter!)
    const apiUrl = `${SIKKA_API_BASE_URL}/${PATIENT_ELIGIBILITY_ENDPOINT}`;
    console.log("🌐 API URL:", apiUrl);

    // Use POST method with Request-Key in header (as shown in Bruno/Postman)
    const eligibilityResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Request-Key": requestKey,  // ✅ THIS IS THE FIX!
      },
      body: JSON.stringify(eligibilityPayload),
    });

    console.log("📡 Response status:", eligibilityResponse.status);
    console.log("📡 Response headers:", Object.fromEntries(eligibilityResponse.headers.entries()));

    if (!eligibilityResponse.ok) {
      // Try to get error response as text first
      const errorText = await eligibilityResponse.text();
      console.error("❌ Raw error response:", errorText);
      console.error("❌ Request payload sent:", JSON.stringify(eligibilityPayload, null, 2));
      console.error("❌ Request URL:", apiUrl);
      
      let errorData = null;
      try {
        errorData = JSON.parse(errorText);
        console.error("❌ Parsed error data:", errorData);
      } catch {
        console.error("❌ Could not parse error as JSON");
      }
      
      const errorCode = errorData?.error_code || errorData?.http_code;
      const shortMessage = errorData?.short_message || errorData?.message;
      const longMessage = errorData?.long_message || errorData?.error;
      
      // Check for request_key specific errors
      if (longMessage?.includes("Requestkey") || longMessage?.includes("request_key") || longMessage?.includes("Authorization")) {
        throw new Error(
          `❌ REQUEST KEY ERROR\n\n` +
          `${longMessage}\n\n` +
          `🔧 DEBUGGING INFO:\n` +
          `- Request URL: ${apiUrl}\n` +
          `- Request-Key Header: ${requestKey.substring(0, 30)}...\n` +
          `- Status Code: ${eligibilityResponse.status}\n` +
          `- Error Code: ${errorCode || "N/A"}\n\n` +
          `💡 The request_key was freshly generated and sent in Request-Key header.\n` +
          `Please verify your Sikka credentials have access to ${PATIENT_ELIGIBILITY_ENDPOINT} API.`
        );
      }
      
      // Check for specific error codes
      if (errorCode === "API100") {
        throw new Error(
          `Bad Request (API100): ${shortMessage || "Missing or invalid parameter"}. ` +
          `Details: ${longMessage || "Check request_key and payload format"}`
        );
      }
      
      // Check if it's a 401/403 authorization error
      if (eligibilityResponse.status === 401 || eligibilityResponse.status === 403) {
        throw new Error(
          `API Access Error (${errorCode || "AUTH"}): ${longMessage || "Not authorized to use this API"}`
        );
      }

      // Check for API2004 (not authorized)
      if (errorCode === "API2004" || errorCode === "API2003") {
        throw new Error(
          `Authorization Error (${errorCode}): ${longMessage || "API endpoint not accessible. Contact Sikka support."}`
        );
      }

      // Generic error
      const errorMessage = longMessage || shortMessage || errorText || "Verification failed";
      throw new Error(`Eligibility verification failed: ${errorMessage}`);
    }

    const eligibilityData = await eligibilityResponse.json();
    console.log("✅ Sikka API Response:", eligibilityData);

    return {
      success: true,
      data: eligibilityData,
      message: "DENTAL insurance eligibility verified successfully",
    };
  } catch (error) {
    console.error("Error verifying insurance eligibility:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to verify insurance eligibility";
    return {
      success: false,
      error: errorMessage,
      message: errorMessage,
    };
  }
}

/**
 * Format eligibility response for display
 */
export function formatEligibilityResponse(data: Record<string, unknown>): string {
  if (!data) return "No data available";
  
  try {
    // Format the response based on Sikka API structure
    const formatted = JSON.stringify(data, null, 2);
    return formatted;
  } catch {
    return "Error formatting response";
  }
}

/**
 * Parse Sikka API response and extract structured data dynamically
 */
function parseSikkaResponse(data: Record<string, unknown>) {
  console.log("🔍 Parsing Sikka API Response:", data);
  
  // Extract insurance company info - fully dynamic from API
  const patient = data?.patient as Record<string, unknown> | undefined;
  const plan = data?.plan as Record<string, unknown> | undefined;
  const coverage = patient?.coverage as Record<string, unknown> | undefined;
  
  // Payer ID is at root level in this API response structure
  const payerId = String(data?.payer_uuid || 'N/A');
  
  // Determine network type from coverage or plan data
  // Check if we have "in_network" data in maximums to determine primary network
  const maximumsArray = data?.maximums as Array<Record<string, unknown>> | undefined;
  const hasInNetwork = maximumsArray?.some((m) => m.network === 'in_network');
  const hasOutNetwork = maximumsArray?.some((m) => m.network === 'out_of_network');
  
  let networkStatus = 'N/A';
  if (hasInNetwork && hasOutNetwork) {
    networkStatus = 'In-Network & Out-of-Network';
  } else if (hasInNetwork) {
    networkStatus = 'In-Network';
  } else if (hasOutNetwork) {
    networkStatus = 'Out-of-Network';
  }
  
  const insuranceInfo = {
    company: String(plan?.name || 'N/A'),
    memberId: String(patient?.member_id || 'N/A'),
    groupNumber: String(plan?.group_number || 'N/A'),
    groupName: String(plan?.group_number || 'N/A'), // API only provides group_number, not group_name
    planName: String(plan?.type || 'N/A'),
    effectiveDate: String(coverage?.effective_date || 'N/A'),
    payerId: payerId,
    network: networkStatus,
    claimMailingAddress: 'Contact insurance provider for claim submission address',
  };

  // Extract coverage limits - fully dynamic from API maximums and deductibles arrays
  const deductiblesArray = data?.deductible as Array<Record<string, unknown>> | undefined;
  
  // Find in-network individual values
  const inNetworkIndividualMax = maximumsArray?.find(
    (m) => m.network === 'in_network' && m.category === 'preventive_basic_and_major' && m.plan_period === 'calendar'
  );
  const inNetworkIndividualMaxRemaining = maximumsArray?.find(
    (m) => m.network === 'in_network' && m.category === 'preventive_basic_and_major' && m.plan_period === 'remaining'
  );
  const inNetworkIndividualDeductible = deductiblesArray?.find(
    (d) => d.network === 'in_network' && d.category === 'basic_and_major' && d.plan_period === 'calendar' && d.coverage_level === 'individual'
  );
  const inNetworkIndividualDeductibleRemaining = deductiblesArray?.find(
    (d) => d.network === 'in_network' && d.category === 'basic_and_major' && d.plan_period === 'remaining' && d.coverage_level === 'individual'
  );
  const inNetworkFamilyMax = maximumsArray?.find(
    (m) => m.network === 'in_network' && m.category === 'preventive_basic_and_major' && m.plan_period === 'calendar'
  );
  const inNetworkFamilyDeductible = deductiblesArray?.find(
    (d) => d.network === 'in_network' && d.category === 'basic_and_major' && d.plan_period === 'calendar' && d.coverage_level === 'family'
  );
  
  const coverageLimits = {
    individualYearMax: Number(inNetworkIndividualMax?.amount || 0),
    familyYearMax: Number(inNetworkFamilyMax?.amount || 0),
    individualDeductible: Number(inNetworkIndividualDeductible?.amount || 0),
    familyDeductible: Number(inNetworkFamilyDeductible?.amount || 0),
    deductibleRemaining: Number(inNetworkIndividualDeductibleRemaining?.amount || 0),
    benefitsUsed: Number(inNetworkIndividualMax?.amount || 0) - Number(inNetworkIndividualMaxRemaining?.amount || 0),
    benefitsRemaining: Number(inNetworkIndividualMaxRemaining?.amount || 0),
  };

  // Extract coinsurance data (coverage percentages by category)
  const coinsuranceData = data?.coinsurance || [];
  const categories: Array<{ name: string; coverage: string; network: string }> = [];

  // Parse coinsurance array from Sikka API
  if (Array.isArray(coinsuranceData) && coinsuranceData.length > 0) {
    console.log("✅ Found coinsurance data in API response:", coinsuranceData.length);
    
    // Group by category and network
    const categoryMap = new Map<string, { in_network?: string; out_of_network?: string }>();

    coinsuranceData.forEach((item: Record<string, unknown>) => {
      const category = String(item?.category || '');
      const network = String(item?.network || '');
      const percent = String(item?.percent || '');

      // Skip if essential data is missing
      if (!category || !network || !percent) {
        return;
      }

      if (!categoryMap.has(category)) {
        categoryMap.set(category, {});
      }

      const categoryData = categoryMap.get(category)!;
      if (network === 'in_network') {
        categoryData.in_network = percent;
      } else if (network === 'out_of_network') {
        categoryData.out_of_network = percent;
      }
    });

    // Convert map to array format for the report
    categoryMap.forEach((networkData, categoryName) => {
      const inNetworkPercent = networkData.in_network || 'N/A';
      const outNetworkPercent = networkData.out_of_network || 'N/A';
      
      categories.push({
        name: categoryName.charAt(0).toUpperCase() + categoryName.slice(1), // Capitalize
        coverage: `In-Network: ${inNetworkPercent}%, Out-of-Network: ${outNetworkPercent}%`,
        network: 'both'
      });
    });
  }

  console.log(`📊 Extracted ${categories.length} coverage categories from coinsurance data`);

  // Extract procedure-level details from limitations array (Service Types like D0120, D0140, etc.)
  const limitationsData = data?.limitations || [];
  
  const procedureDetails: Array<{ 
    type: string; 
    category: string; 
    codes: string[]; 
    limitation: string 
  }> = [];

  if (Array.isArray(limitationsData) && limitationsData.length > 0) {
    console.log("✅ Found limitations data in API response:", limitationsData.length);
    
    limitationsData.forEach((limitation: Record<string, unknown>) => {
      const serviceType = String(limitation?.service_type || '');
      const category = String(limitation?.category || '');
      const cdtCodes = limitation?.limitation_applies_to as string[] || [];
      const limitationText = String(limitation?.limitation || '');

      // Skip if essential data is missing
      if (!serviceType || !category || !Array.isArray(cdtCodes) || cdtCodes.length === 0) {
        return;
      }

      procedureDetails.push({
        type: serviceType,
        category: category.charAt(0).toUpperCase() + category.slice(1), // Capitalize
        codes: cdtCodes,
        limitation: limitationText || 'No limitation specified'
      });
    });
  }

  console.log(`🔧 Extracted ${procedureDetails.length} procedure details from limitations data`);

  return { insuranceInfo, coverageLimits, categories, procedureDetails };
}

/**
 * Generate HTML report from eligibility data - Professional format matching Cigna sample
 */
function generateEligibilityReport(data: Record<string, unknown>, patientInfo: { name: string; id: number }): string {
  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const reportDate = new Date().toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
  
  // Parse Sikka response
  const { insuranceInfo, coverageLimits, categories, procedureDetails } = parseSikkaResponse(data);
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Dental Insurance Eligibility Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: Arial, Helvetica, sans-serif; 
      font-size: 11px;
      color: #000;
      background: #fff;
      padding: 20px;
    }
    .report-container { 
      max-width: 850px; 
      margin: 0 auto; 
      background: white;
    }
    
    /* Header Section */
    .header { 
      background: #6b7280;
      color: white;
      padding: 10px 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .header .patient-name {
      font-size: 16px;
      font-weight: bold;
    }
    .header .date {
      font-size: 11px;
    }

    /* Patient Info Grid */
    .info-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px 20px;
      margin-bottom: 25px;
      padding: 0 5px;
    }
    .info-item {
      display: flex;
      flex-direction: column;
    }
    .info-label {
      font-size: 9px;
      color: #6b7280;
      margin-bottom: 3px;
    }
    .info-value {
      font-size: 11px;
      font-weight: 600;
      color: #000;
    }

    /* Insurance Company Section */
    .insurance-section {
      background: #f3f4f6;
      padding: 15px;
      margin-bottom: 20px;
      border-radius: 4px;
    }
    .insurance-section h2 {
      font-size: 13px;
      color: #1f2937;
      margin-bottom: 12px;
      font-weight: bold;
    }

    /* Coverage Summary Tables */
    .coverage-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 10px;
    }
    .coverage-table thead {
      background: #e5e7eb;
    }
    .coverage-table th {
      text-align: left;
      padding: 8px 10px;
      font-weight: 600;
      font-size: 10px;
      border: 1px solid #d1d5db;
    }
    .coverage-table td {
      padding: 8px 10px;
      border: 1px solid #d1d5db;
    }
    .coverage-table tbody tr:nth-child(even) {
      background: #f9fafb;
    }
    
    /* Amount columns */
    .amount-col {
      text-align: right;
      font-weight: 600;
    }

    /* Section Headers */
    .section-header {
      background: #d1d5db;
      padding: 8px 12px;
      font-size: 12px;
      font-weight: bold;
      margin-top: 20px;
      margin-bottom: 10px;
    }

    /* Notes */
    .notes {
      font-size: 9px;
      color: #4b5563;
      margin-top: 15px;
      padding: 10px;
      background: #f9fafb;
      border-left: 3px solid #3b82f6;
    }
    .notes ul {
      margin-left: 15px;
      margin-top: 5px;
    }
    .notes li {
      margin-bottom: 3px;
    }

    /* Footer */
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      font-size: 9px;
      color: #6b7280;
    }
    .footer p {
      margin-bottom: 5px;
    }

    /* Page numbering */
    .page-number {
      text-align: right;
      font-size: 9px;
      color: #6b7280;
      margin-top: 10px;
    }

    @media print {
      body { 
        padding: 0; 
      }
      .report-container {
        max-width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="report-container">
    
    <!-- Header -->
    <div class="header">
      <div class="patient-name">${patientInfo.name}</div>
      <div class="date">${currentDate}</div>
    </div>

    <!-- Patient Information Grid -->
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Patient ID</div>
        <div class="info-value">${patientInfo.id}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Member ID</div>
        <div class="info-value">${insuranceInfo.memberId}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Effective Date</div>
        <div class="info-value">${insuranceInfo.effectiveDate}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Insurance Plan</div>
        <div class="info-value">${insuranceInfo.planName}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Group Number</div>
        <div class="info-value">${insuranceInfo.groupNumber}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Group Name</div>
        <div class="info-value">${insuranceInfo.groupName}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Payer ID</div>
        <div class="info-value">${insuranceInfo.payerId}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Network</div>
        <div class="info-value">${insuranceInfo.network}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Report Date</div>
        <div class="info-value">${reportDate}</div>
      </div>
    </div>

    <!-- Insurance Company Info -->
    <div class="insurance-section">
      <h2>${insuranceInfo.company}</h2>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 10px;">
        <div>
          <div class="info-label">Plan Type</div>
          <div class="info-value">${insuranceInfo.planName}</div>
        </div>
        <div>
          <div class="info-label">Coverage Status</div>
          <div class="info-value" style="color: #059669;">✓ Active</div>
        </div>
        <div>
          <div class="info-label">Network Status</div>
          <div class="info-value">${insuranceInfo.network}</div>
        </div>
        <div>
          <div class="info-label">Payer ID</div>
          <div class="info-value">${insuranceInfo.payerId}</div>
        </div>
      </div>
      <div style="margin-top: 10px;">
        <div class="info-label">Claim Mailing Address</div>
        <div class="info-value" style="margin-top: 4px;">${insuranceInfo.claimMailingAddress}</div>
      </div>
    </div>

    <!-- Coverage Summary -->
    <div class="section-header">Coverage Summary</div>
    <table class="coverage-table">
      <thead>
        <tr>
          <th style="width: 30%;">Benefit Type</th>
          <th style="width: 20%;">Coverage Level</th>
          <th style="width: 15%;">Period</th>
          <th style="width: 17.5%;">Amount</th>
          <th style="width: 17.5%;">Remaining</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Maximum</strong></td>
          <td>Individual</td>
          <td>Year</td>
          <td class="amount-col">$${coverageLimits.individualYearMax.toLocaleString()}</td>
          <td class="amount-col">$${(coverageLimits.individualYearMax - coverageLimits.benefitsUsed).toLocaleString()}</td>
        </tr>
        ${coverageLimits.familyYearMax > 0 ? `
        <tr>
          <td></td>
          <td>Family</td>
          <td>Year</td>
          <td class="amount-col">$${coverageLimits.familyYearMax.toLocaleString()}</td>
          <td class="amount-col">$${coverageLimits.familyYearMax.toLocaleString()}</td>
        </tr>
        ` : ''}
        <tr>
          <td><strong>Deductible</strong></td>
          <td>Individual</td>
          <td>Year</td>
          <td class="amount-col">$${coverageLimits.individualDeductible.toLocaleString()}</td>
          <td class="amount-col">$${coverageLimits.deductibleRemaining.toLocaleString()}</td>
        </tr>
        ${coverageLimits.familyDeductible > 0 ? `
        <tr>
          <td></td>
          <td>Family</td>
          <td>Year</td>
          <td class="amount-col">$${coverageLimits.familyDeductible.toLocaleString()}</td>
          <td class="amount-col">$${coverageLimits.familyDeductible.toLocaleString()}</td>
        </tr>
        ` : ''}
      </tbody>
    </table>

    <!-- Coverage Service Categories -->
    <div class="section-header">Coverage Service</div>
    ${categories.length > 0 ? `
    <table class="coverage-table">
      <thead>
        <tr>
          <th style="width: 40%;">Category</th>
          <th style="width: 60%;">Coverage</th>
        </tr>
      </thead>
      <tbody>
        ${categories.map(cat => `
        <tr>
          <td><strong>${cat.name}</strong></td>
          <td>${cat.coverage}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
    ` : `
    <div style="padding: 20px; text-align: center; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px;">
      <p style="color: #6b7280; font-size: 11px;">
        ℹ️ Coverage service details not available in the API response.
        <br>Please contact your insurance provider for detailed coverage information.
      </p>
    </div>
    `}

    ${procedureDetails && procedureDetails.length > 0 ? `
    <!-- Service Type Details -->
    <div class="section-header">Service Type</div>
    <table class="coverage-table">
      <thead>
        <tr>
          <th style="width: 25%;">Service Type</th>
          <th style="width: 15%;">Category</th>
          <th style="width: 30%;">CDT Codes</th>
          <th style="width: 30%;">Limitation</th>
        </tr>
      </thead>
      <tbody>
        ${procedureDetails.map((proc) => `
        <tr>
          <td><strong>${proc.type}</strong></td>
          <td>${proc.category}</td>
          <td>${proc.codes.join(', ')}</td>
          <td>${proc.limitation}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
    ` : ''}

    <!-- Notes Section -->
    <div class="notes">
      <strong>Important Notes:</strong>
      <ul>
        <li>Coverage percentages apply after deductible is met (if applicable)</li>
        <li>Some services may require prior authorization</li>
        <li>Actual coverage may vary based on specific procedure codes and contract terms</li>
        <li>This is an eligibility verification, not a guarantee of payment</li>
        <li>Please verify benefits with your insurance provider before treatment</li>
      </ul>
    </div>

    <!-- Debug Section (only visible if no data extracted) - Remove in production -->
    ${(categories.length === 0 && procedureDetails.length === 0) ? `
    <div class="section-header" style="background: #fef3c7; color: #92400e;">
      API Response Debug Information
    </div>
    <details style="margin: 15px 0; padding: 15px; background: #fffbeb; border: 1px solid #fbbf24; border-radius: 4px;">
      <summary style="cursor: pointer; font-weight: 600; color: #92400e; margin-bottom: 10px;">
        Click to view raw API response (for debugging)
      </summary>
      <pre style="font-size: 9px; color: #78350f; overflow-x: auto; white-space: pre-wrap; margin-top: 10px; background: #fff; padding: 10px; border-radius: 4px;">${JSON.stringify(data, null, 2)}</pre>
      <p style="font-size: 9px; color: #92400e; margin-top: 10px;">
        <strong>Note:</strong> If you see this section, it means the API response doesn't contain coverage_services or procedure_details in the expected format.
        Please share this JSON with the development team to update the parser.
      </p>
    </details>
    ` : ''}

    <!-- Footer -->
    <div class="footer">
      <p><strong>Dental Insurance Eligibility Verification Report</strong></p>
      <p>Generated by Ciyex Practice Management System | Powered by Sikka Insurance Verification</p>
      <p>This report is confidential and intended for authorized personnel only</p>
    </div>

    <div class="page-number">1/1</div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate combined eligibility report HTML for multiple insurances (primary, secondary, tertiary)
 */
function generateMultiInsuranceReport(
  insurances: { primary?: unknown; secondary?: unknown; tertiary?: unknown },
  patientInfo: { name: string; id: number }
): string {
  const currentDate = new Date().toLocaleDateString();
  
  // Generate sections for each insurance
  const insuranceSections: string[] = [];
  
  (['primary', 'secondary', 'tertiary'] as const).forEach((level) => {
    const data = insurances[level];
    if (!data) return;
    
    const result = parseSikkaResponse(data as Record<string, unknown>);
    
    insuranceSections.push(`
    <div class="insurance-section" style="margin-bottom: 40px; page-break-inside: avoid;">
      <div class="section-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 1px;">${level} Insurance</h2>
      </div>
      
      <!-- Insurance Information -->
      <div class="info-section" style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <div class="info-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
          <div>
            <div class="info-label" style="font-size: 12px; color: #64748b; margin-bottom: 4px;">Insurance Company</div>
            <div class="info-value" style="font-size: 14px; font-weight: 600; color: #1e293b;">${result.insuranceInfo.company}</div>
          </div>
          <div>
            <div class="info-label" style="font-size: 12px; color: #64748b; margin-bottom: 4px;">Member ID</div>
            <div class="info-value" style="font-size: 14px; font-weight: 600; color: #1e293b;">${result.insuranceInfo.memberId}</div>
          </div>
          <div>
            <div class="info-label" style="font-size: 12px; color: #64748b; margin-bottom: 4px;">Group Number</div>
            <div class="info-value" style="font-size: 14px; font-weight: 600; color: #1e293b;">${result.insuranceInfo.groupNumber}</div>
          </div>
          <div>
            <div class="info-label" style="font-size: 12px; color: #64748b; margin-bottom: 4px;">Coverage Status</div>
            <div class="info-value" style="font-size: 14px; font-weight: 600; color: #10b981;">Active</div>
          </div>
        </div>
      </div>

      <!-- Coverage Summary -->
      <div class="section-header" style="font-size: 16px; font-weight: 600; color: #1e293b; padding: 10px 0; border-bottom: 2px solid #e2e8f0; margin-bottom: 15px;">Coverage Summary</div>
      <table class="coverage-table" style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background: #f1f5f9;">
            <th style="padding: 12px; text-align: left; font-size: 13px; color: #475569; border-bottom: 2px solid #e2e8f0;">Benefit Type</th>
            <th style="padding: 12px; text-align: right; font-size: 13px; color: #475569; border-bottom: 2px solid #e2e8f0;">Annual Maximum</th>
            <th style="padding: 12px; text-align: right; font-size: 13px; color: #475569; border-bottom: 2px solid #e2e8f0;">Remaining</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #334155;">Individual Year Max</td>
            <td class="amount-col" style="padding: 12px; text-align: right; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #334155;">$${result.coverageLimits.individualYearMax.toLocaleString()}</td>
            <td class="amount-col" style="padding: 12px; text-align: right; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #10b981;">$${(result.coverageLimits.individualYearMax - result.coverageLimits.benefitsUsed).toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #334155;">Family Year Max</td>
            <td class="amount-col" style="padding: 12px; text-align: right; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #334155;">$${result.coverageLimits.familyYearMax.toLocaleString()}</td>
            <td class="amount-col" style="padding: 12px; text-align: right; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #10b981;">$${result.coverageLimits.familyYearMax.toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #334155;">Individual Deductible</td>
            <td class="amount-col" style="padding: 12px; text-align: right; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #334155;">$${result.coverageLimits.individualDeductible.toLocaleString()}</td>
            <td class="amount-col" style="padding: 12px; text-align: right; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #f59e0b;">$${result.coverageLimits.deductibleRemaining.toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding: 12px; color: #334155;">Family Deductible</td>
            <td class="amount-col" style="padding: 12px; text-align: right; font-weight: 600; color: #334155;">$${result.coverageLimits.familyDeductible.toLocaleString()}</td>
            <td class="amount-col" style="padding: 12px; text-align: right; font-weight: 600; color: #f59e0b;">$${result.coverageLimits.familyDeductible.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>

      <!-- Coverage Service -->
      <div class="section-header" style="font-size: 16px; font-weight: 600; color: #1e293b; padding: 10px 0; border-bottom: 2px solid #e2e8f0; margin-bottom: 15px;">Coverage Service</div>
      ${result.categories.length > 0 ? `
      <table class="coverage-table" style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background: #f1f5f9;">
            <th style="padding: 12px; text-align: left; font-size: 13px; color: #475569; border-bottom: 2px solid #e2e8f0;">Category</th>
            <th style="padding: 12px; text-align: left; font-size: 13px; color: #475569; border-bottom: 2px solid #e2e8f0;">Coverage</th>
          </tr>
        </thead>
        <tbody>
          ${result.categories.map(cat => `
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #334155; text-transform: capitalize;">${cat.name}</td>
              <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #10b981;">${cat.coverage}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ` : '<p style="color: #64748b; font-style: italic;">Coverage service details not available.</p>'}

      <!-- Service Type -->
      ${result.procedureDetails.length > 0 ? `
      <div class="section-header" style="font-size: 16px; font-weight: 600; color: #1e293b; padding: 10px 0; border-bottom: 2px solid #e2e8f0; margin-bottom: 15px;">Service Type</div>
      <table class="coverage-table" style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background: #f1f5f9;">
            <th style="padding: 12px; text-align: left; font-size: 13px; color: #475569; border-bottom: 2px solid #e2e8f0;">Service Type</th>
            <th style="padding: 12px; text-align: left; font-size: 13px; color: #475569; border-bottom: 2px solid #e2e8f0;">Category</th>
            <th style="padding: 12px; text-align: left; font-size: 13px; color: #475569; border-bottom: 2px solid #e2e8f0;">CDT Codes</th>
            <th style="padding: 12px; text-align: left; font-size: 13px; color: #475569; border-bottom: 2px solid #e2e8f0;">Limitation</th>
          </tr>
        </thead>
        <tbody>
          ${result.procedureDetails.map(proc => `
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #334155; text-transform: capitalize;">${proc.type}</td>
              <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #334155; text-transform: capitalize;">${proc.category}</td>
              <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #6366f1; font-family: monospace; font-size: 11px;">${Array.isArray(proc.codes) ? proc.codes.join(', ') : proc.codes}</td>
              <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 12px;">${proc.limitation}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ` : ''}
    </div>
    `);
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Multi-Insurance Verification Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: white; color: #333; line-height: 1.6; }
    .report-container { max-width: 850px; margin: 0 auto; padding: 40px; background: white; }
  </style>
</head>
<body>
  <div class="report-container">
    <!-- Header -->
    <div class="report-header" style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #667eea;">
      <h1 style="font-size: 28px; color: #1e293b; margin-bottom: 8px;">🦷 Multi-Insurance Eligibility Report</h1>
      <p style="color: #64748b; font-size: 14px;">Dental Insurance Verification for Multiple Policies</p>
      <div style="margin-top: 15px; padding: 12px; background: #f8fafc; border-radius: 8px;">
        <p style="font-size: 13px; color: #475569;"><strong>Patient:</strong> ${patientInfo.name} (ID: ${patientInfo.id})</p>
        <p style="font-size: 13px; color: #475569;"><strong>Report Date:</strong> ${currentDate}</p>
        <p style="font-size: 13px; color: #475569;"><strong>Insurances Verified:</strong> ${Object.keys(insurances).filter(k => insurances[k as keyof typeof insurances] !== null).length}</p>
      </div>
    </div>

    <!-- Insurance Sections -->
    ${insuranceSections.join('\n')}

    <!-- Footer -->
    <div class="report-footer" style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0; color: #94a3b8; font-size: 12px;">
      <p>This report is generated for informational purposes only. Please verify coverage details with the insurance provider.</p>
      <p style="margin-top: 8px;">© ${new Date().getFullYear()} CIYEX EHR System - Multi-Insurance Verification Report</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Download eligibility report as PDF file - supports single or multiple insurances
 */
export async function downloadEligibilityReport(
  data: Record<string, unknown> | { primary?: unknown; secondary?: unknown; tertiary?: unknown }, 
  patientInfo: { name: string; id: number; insuranceLevel?: string; multiInsurance?: boolean }
): Promise<void> {
  try {
    console.log("📄 Generating PDF report...");
    
    // Dynamically import jsPDF and html2canvas
    const { default: jsPDF } = await import('jspdf');
    const html2canvas = (await import('html2canvas')).default;
    
    let html: string;
    let filename: string;
    
    // Check if this is multi-insurance report
    if (patientInfo.multiInsurance && 
        typeof data === 'object' && 
        data !== null && 
        ('primary' in data || 'secondary' in data || 'tertiary' in data)) {
      // Generate combined report for multiple insurances
      html = generateMultiInsuranceReport(data as { primary?: unknown; secondary?: unknown; tertiary?: unknown }, patientInfo);
      filename = `Dental-Insurance-Report-ALL-Patient-${patientInfo.id}-${Date.now()}.pdf`;
      console.log("📄 Generating multi-insurance PDF report with", 
        Object.keys(data).filter(k => data[k as keyof typeof data] !== null).join(', '));
    } else {
      // Generate single insurance report
      html = generateEligibilityReport(data as Record<string, unknown>, patientInfo);
      const levelSuffix = patientInfo.insuranceLevel ? `-${patientInfo.insuranceLevel.toUpperCase()}` : '';
      filename = `Dental-Insurance-Report${levelSuffix}-Patient-${patientInfo.id}-${Date.now()}.pdf`;
    }
    
    // Create a temporary container
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = html;
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '0';
    tempContainer.style.width = '850px'; // Match report width
    document.body.appendChild(tempContainer);
    
    // Get the report element
    const reportElement = tempContainer.querySelector('.report-container') as HTMLElement;
    
    if (!reportElement) {
      throw new Error("Report element not found");
    }
    
    // Convert HTML to canvas
    const canvas = await html2canvas(reportElement, {
      scale: 2, // Higher quality
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });
    
    // Calculate PDF dimensions
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    
    // Create PDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    let position = 0;
    
    // Add image to PDF (handle multiple pages if needed)
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    
    // Save PDF with appropriate filename
    pdf.save(filename);
    
    // Cleanup
    document.body.removeChild(tempContainer);
    
    console.log("✅ PDF report downloaded successfully:", filename);
  } catch (error) {
    console.error("❌ Error downloading PDF report:", error);
    throw new Error("Failed to download PDF report");
  }
}

/**
 * Print eligibility report - supports single or multiple insurances
 */
export function printEligibilityReport(
  data: Record<string, unknown> | { primary?: unknown; secondary?: unknown; tertiary?: unknown }, 
  patientInfo: { name: string; id: number; insuranceLevel?: string; multiInsurance?: boolean }
): void {
  try {
    let html: string;
    
    // Check if this is multi-insurance report
    if (patientInfo.multiInsurance && 
        typeof data === 'object' && 
        data !== null && 
        ('primary' in data || 'secondary' in data || 'tertiary' in data)) {
      html = generateMultiInsuranceReport(data as { primary?: unknown; secondary?: unknown; tertiary?: unknown }, patientInfo);
    } else {
      html = generateEligibilityReport(data as Record<string, unknown>, patientInfo);
    }
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    } else {
      throw new Error("Failed to open print window");
    }
  } catch (error) {
    console.error("❌ Error printing report:", error);
    throw new Error("Failed to print report");
  }
}
