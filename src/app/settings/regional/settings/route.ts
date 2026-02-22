import { getEnv } from "@/utils/env";
import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

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
    // Get all practices (which includes nested settings)
    const practicesResponse = await fetch(`${API_BASE_URL}/api/practices`, {
      method: "GET",
      headers: getAuthHeaders(req),
    });

    if (!practicesResponse.ok) {
      return NextResponse.json(
        { success: false, message: "Failed to fetch practices" },
        { status: practicesResponse.status }
      );
    }

    const practicesData = await practicesResponse.json();
    
    if (!practicesData.success || !practicesData.data || practicesData.data.length === 0) {
      return NextResponse.json(
        { success: false, message: "No practice found" },
        { status: 404 }
      );
    }

    // Use first practice as default
    const defaultPractice = practicesData.data[0];

    // Extract regional settings
    const regionalSettings = defaultPractice.regionalSettings;

    return NextResponse.json(
      { 
        success: true, 
        message: "Regional settings retrieved successfully",
        data: regionalSettings 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Regional settings GET error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Get all practices to find the default one
    const practicesResponse = await fetch(`${API_BASE_URL}/api/practices`, {
      method: "GET",
      headers: getAuthHeaders(req),
    });

    if (!practicesResponse.ok) {
      return NextResponse.json(
        { success: false, message: "Failed to fetch practices" },
        { status: practicesResponse.status }
      );
    }

    const practicesData = await practicesResponse.json();
    
    if (!practicesData.success || !practicesData.data || practicesData.data.length === 0) {
      return NextResponse.json(
        { success: false, message: "No practice found" },
        { status: 404 }
      );
    }

    // Use first practice as default
    const defaultPractice = practicesData.data[0];
    const defaultPracticeId = defaultPractice.id;

    // Update the practice with new regional settings
    const updatedPractice = {
      ...defaultPractice,
      regionalSettings: {
        ...defaultPractice.regionalSettings,
        ...body
      }
    };

    // Update practice
    const updateResponse = await fetch(
      `${API_BASE_URL}/api/practices/${defaultPracticeId}`,
      {
        method: "PUT",
        headers: getAuthHeaders(req),
        body: JSON.stringify(updatedPractice),
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error("Failed to update regional settings:", errorText);
      return NextResponse.json(
        { success: false, message: "Failed to update regional settings" },
        { status: updateResponse.status }
      );
    }

    const data = await updateResponse.json();
    return NextResponse.json(data, { status: updateResponse.status });
  } catch (error) {
    console.error("Regional settings POST error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
