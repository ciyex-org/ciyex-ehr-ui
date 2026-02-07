import { getEnv } from "@/utils/env";
import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = getEnv("NEXT_PUBLIC_API_URL") || "http://localhost:8080";

// FHIR ID for the practice - used consistently across GET and POST operations
const PRACTICE_FHIR_ID = "1063";

// Helper function to get auth headers from the request
function getAuthHeaders(req?: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (req) {
    // Try to get from cookies first, then from incoming request headers
    const token = req.cookies.get("token")?.value || 
                  req.cookies.get("authToken")?.value ||
                  req.headers.get("authorization");
    const orgId = req.cookies.get("orgId")?.value || 
                  req.headers.get("x-org-id") ||
                  req.headers.get("orgid");
    const facilityId = req.cookies.get("facilityId")?.value || 
                       req.headers.get("x-facility-id");
    const role = req.cookies.get("role")?.value || 
                 req.headers.get("x-role");

    if (token) {
      headers["Authorization"] = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
    }
    if (orgId) {
      headers["orgId"] = orgId;
    }
    if (facilityId) {
      headers["X-Facility-Id"] = facilityId;
    }
    if (role) {
      headers["X-Role"] = role;
    }
  }

  return headers;
}

export async function GET(req: NextRequest) {
  try {
    const practiceId = PRACTICE_FHIR_ID;
    const practiceResponse = await fetch(`${API_BASE_URL}/api/practices/${practiceId}`, {
      method: "GET",
      headers: {
        ...getAuthHeaders(req),
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
      },
      cache: "no-store"
    });

    if (!practiceResponse.ok) {
      return NextResponse.json(
        { success: false, message: "Failed to fetch practice" },
        { status: practiceResponse.status }
      );
    }

    const practiceData = await practiceResponse.json();
    
    if (!practiceData.success || !practiceData.data) {
      return NextResponse.json(
        { success: false, message: "No practice found" },
        { status: 404 }
      );
    }

    const defaultPractice = practiceData.data;

    // Return complete practice data including both settings
    return NextResponse.json(
      {
        success: true,
        message: "Practice settings retrieved successfully",
        data: {
          name: defaultPractice.name || "",
          practiceSettings: defaultPractice.practiceSettings || {},
          regionalSettings: defaultPractice.regionalSettings || {}
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Practice settings GET error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const authHeaders = getAuthHeaders(req);
    const practiceId = PRACTICE_FHIR_ID;

    const practiceResponse = await fetch(`${API_BASE_URL}/api/practices/${practiceId}`, {
      method: "GET",
      headers: {
        ...authHeaders,
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
      },
      cache: "no-store"
    });

    if (!practiceResponse.ok) {
      return NextResponse.json(
        { success: false, message: "Failed to fetch current practice" },
        { status: practiceResponse.status }
      );
    }

    const practiceData = await practiceResponse.json();

    if (!practiceData.success || !practiceData.data) {
      return NextResponse.json(
        { success: false, message: "No practice found" },
        { status: 404 }
      );
    }

    const currentPractice = practiceData.data;

    const updatePayload: any = {
      ...currentPractice
    };

    if (body.name !== undefined) {
      updatePayload.name = body.name;
    }

    if (body.practiceSettings !== undefined) {
      updatePayload.practiceSettings = body.practiceSettings;
    }

    if (body.regionalSettings !== undefined) {
      updatePayload.regionalSettings = body.regionalSettings;
    }

    // Use the actual practice ID from the backend
    const updateResponse = await fetch(
      `${API_BASE_URL}/api/practices/${practiceId}`,
      {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify(updatePayload),
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      return NextResponse.json(
        { success: false, message: "Failed to update practice settings", error: errorText },
        { status: updateResponse.status }
      );
    }

    const data = await updateResponse.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Practice settings POST error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}