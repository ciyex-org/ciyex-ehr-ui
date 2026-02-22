import { NextRequest, NextResponse } from "next/server";

// MARKETPLACE_SERVICE_URL is the actual upstream URL (server-side only).
// Falls back to NEXT_PUBLIC_MARKETPLACE_URL for backwards compat, then localhost.
const MARKETPLACE_URL = (
  process.env.MARKETPLACE_SERVICE_URL ||
  process.env.NEXT_PUBLIC_MARKETPLACE_URL ||
  ""
).replace(/\/$/, "");

/**
 * Server-side proxy for marketplace API calls.
 * Avoids CORS issues when the marketplace is on a different domain.
 */
async function proxyToMarketplace(req: NextRequest, path: string) {
  const url = `${MARKETPLACE_URL}/${path}${req.nextUrl.search}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  const contentType = req.headers.get("content-type");
  if (contentType) {
    headers["Content-Type"] = contentType;
  }

  const auth = req.headers.get("authorization");
  if (auth) {
    headers["Authorization"] = auth;
  }

  try {
    const upstream = await fetch(url, {
      method: req.method,
      headers,
      body: req.method !== "GET" && req.method !== "HEAD" ? await req.text() : undefined,
    });

    const body = await upstream.text();
    return new NextResponse(body, {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("Content-Type") || "application/json" },
    });
  } catch (err) {
    console.error("Marketplace proxy error:", err);
    return NextResponse.json({ error: "Marketplace service unavailable" }, { status: 502 });
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyToMarketplace(req, path.join("/"));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyToMarketplace(req, path.join("/"));
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyToMarketplace(req, path.join("/"));
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyToMarketplace(req, path.join("/"));
}
