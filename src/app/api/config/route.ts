import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "",
    NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_URL || "",
    NEXT_PUBLIC_ENV: process.env.NEXT_PUBLIC_ENV || "",
    NEXT_PUBLIC_KEYCLOAK_ENABLED: process.env.NEXT_PUBLIC_KEYCLOAK_ENABLED || "false",
    NEXT_PUBLIC_KEYCLOAK_URL: process.env.NEXT_PUBLIC_KEYCLOAK_URL || "",
    NEXT_PUBLIC_KEYCLOAK_REALM: process.env.NEXT_PUBLIC_KEYCLOAK_REALM || "master",
    NEXT_PUBLIC_KEYCLOAK_CLIENT_ID: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || "ciyex-app",
    NEXT_PUBLIC_ORG_ID: process.env.NEXT_PUBLIC_ORG_ID || "",
    NEXT_PUBLIC_STRIPE_PK: process.env.NEXT_PUBLIC_STRIPE_PK || "",
    NEXT_PUBLIC_MARKETPLACE_URL: process.env.NEXT_PUBLIC_MARKETPLACE_URL || "",
    NEXT_PUBLIC_METADATA_URL: process.env.NEXT_PUBLIC_METADATA_URL || "",
    NEXT_PUBLIC_DEBUG: process.env.NEXT_PUBLIC_DEBUG || "",
  });
}
