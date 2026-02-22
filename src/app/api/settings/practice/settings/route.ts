import { getEnv } from "@/utils/env";
import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

/**
 * Proxy requests to backend /settings/practice/settings endpoint
 * This allows frontend to call /api/settings/practice/settings
 * which gets forwarded to backend /settings/practice/settings
 */

function getProxyHeaders(req: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Forward authorization from incoming request
  const auth = req.headers.get("authorization");
  if (auth) {
    headers["Authorization"] = auth;
  }

  // Forward any security/context headers
  const xOrgId = req.headers.get("x-org-id") || req.headers.get("orgid");
  if (xOrgId) {
    headers["orgId"] = xOrgId;
  }

  const xFacilityId = req.headers.get("x-facility-id");
  if (xFacilityId) {
    headers["X-Facility-Id"] = xFacilityId;
  }

  const xRole = req.headers.get("x-role");
  if (xRole) {
    headers["X-Role"] = xRole;
  }

  return headers;
}

/**
 * GET /api/settings/practice/settings
 * Proxies to GET /settings/practice/settings on backend
 */
export async function GET(req: NextRequest) {
  try {
    console.log("[Proxy] GET /api/settings/practice/settings → backend /settings/practice/settings");
    
    const backendResponse = await fetch(`${API_BASE_URL}/settings/practice/settings`, {
      method: "GET",
      headers: getProxyHeaders(req),
    });

    const text = await backendResponse.text();
    console.log(`[Proxy] Response status: ${backendResponse.status}`);
    
    return new NextResponse(text, { 
      status: backendResponse.status,
      headers: { "content-type": "application/json" }
    });
  } catch (error) {
    console.error("[Proxy] GET error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch practice settings", error: String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings/practice/settings
 * Proxies to POST /settings/practice/settings on backend
 * 
 * Expected body:
 * {
 *   "practiceName": "string",
 *   "enablePatientPractice": boolean,
 *   "sessionTimeoutMinutes": 5-30
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    console.log("[Proxy] POST /api/settings/practice/settings → backend /settings/practice/settings");
    console.log("[Proxy] Request body:", body);

    const backendResponse = await fetch(`${API_BASE_URL}/settings/practice/settings`, {
      method: "POST",
      headers: getProxyHeaders(req),
      body,
    });

    const text = await backendResponse.text();
    console.log(`[Proxy] Response status: ${backendResponse.status}`);
    console.log("[Proxy] Response body:", text);
    
    return new NextResponse(text, { 
      status: backendResponse.status,
      headers: { "content-type": "application/json" }
    });
  } catch (error) {
    console.error("[Proxy] POST error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update practice settings", error: String(error) },
      { status: 500 }
    );
  }
}
