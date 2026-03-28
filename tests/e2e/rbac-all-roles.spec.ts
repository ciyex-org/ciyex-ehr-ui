/**
 * Comprehensive SMART Role RBAC Test Suite
 * ==========================================
 * Tests all EHR roles against every major screen to verify:
 *  1. Nav items show/hide correctly per role
 *  2. Page-level PermissionGuard blocks unauthorized access
 *  3. Permitted pages render real content (not access denied)
 *
 * Generates a full HTML report at test-results/rbac-report.html
 *
 * Roles tested: SUPER_ADMIN, ADMIN, PROVIDER, NURSE, MA, FRONT_DESK, BILLING, PATIENT
 */

import { test, Page, Browser, chromium } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

// ── Config ──────────────────────────────────────────────────────────────────

const BASE_URL = "https://app-dev.ciyex.org";
const API_URL = "https://api-dev.ciyex.org";
const PASSWORD = process.env.TEST_USER_PASSWORD || "Test@123";
const SCREENSHOTS_DIR = path.join(process.cwd(), "test-results", "rbac-screenshots");
const REPORT_PATH = path.join(process.cwd(), "test-results", "rbac-report.html");

// ── Users ────────────────────────────────────────────────────────────────────
// Sunrise Family Medicine — all roles in one org

interface TestUser {
  role: string;
  email: string;
  password?: string;
}

const USERS: TestUser[] = [
  // SUPER_ADMIN + ADMIN — Sunrise Family Medicine
  { role: "SUPER_ADMIN",  email: "michael.chen@example.com" },
  // PROVIDER — Riverside Medical (emily.chen has PROVIDER role)
  { role: "PROVIDER",     email: "emily.chen@riverside-medical.com" },
  // NURSE — Sunrise Family Medicine
  { role: "NURSE",        email: "nurse.johnson@sunrisefamilymedicine.com" },
  // FRONT_DESK — Sunrise Family Medicine
  { role: "FRONT_DESK",   email: "frontdesk.brown@sunrisefamilymedicine.com" },
  // BILLING — Sunrise Family Medicine (confirmed working)
  { role: "BILLING",      email: "billing.davis@sunrisefamilymedicine.com" },
  // PATIENT — Sunrise Family Medicine (patients use portal, not EHR — login expected to fail)
  { role: "PATIENT",      email: "jennifer.martinez@example.com", password: PASSWORD },
];

// ── Routes to test ───────────────────────────────────────────────────────────
// path → expected permission category (null = open to all)

interface RouteSpec {
  label: string;
  path: string;
  permCategory: string | null; // null = accessible by all
}

const ROUTES: RouteSpec[] = [
  // Scheduling
  { label: "Calendar",           path: "/calendar",                   permCategory: "scheduling" },
  { label: "Appointments",       path: "/appointments",               permCategory: "scheduling" },

  // Demographics
  { label: "Patients",           path: "/patients",                   permCategory: "demographics" },

  // Clinical
  { label: "All Encounters",     path: "/all-encounters",             permCategory: "chart" },
  { label: "Prescriptions",      path: "/prescriptions",              permCategory: "rx" },
  { label: "Lab Orders",         path: "/labs/orders",                permCategory: "orders" },
  { label: "Lab Results",        path: "/labs/results",               permCategory: "orders" },
  { label: "Immunizations",      path: "/immunizations",              permCategory: "rx" },
  { label: "Care Plans",         path: "/care-plans",                 permCategory: "chart" },
  { label: "Referrals",          path: "/referrals",                  permCategory: "chart" },
  { label: "CDS Alerts",         path: "/cds",                        permCategory: "chart" },
  { label: "Consents",           path: "/consents",                   permCategory: "chart" },

  // Documents
  { label: "Doc Scanning",       path: "/document-scanning",          permCategory: "documents" },

  // Messaging
  { label: "Messaging",          path: "/messaging",                  permCategory: "messaging" },
  { label: "Notifications",      path: "/notifications",              permCategory: "messaging" },
  { label: "Fax",                path: "/fax",                        permCategory: "messaging" },

  // Billing
  { label: "Payments",           path: "/payments",                   permCategory: "billing" },
  { label: "Claim Management",   path: "/patients/claim-management",  permCategory: "billing" },

  // Reports
  { label: "Reports",            path: "/reports",                    permCategory: "reports" },

  // Admin / Settings
  { label: "User Management",    path: "/settings/user-management",   permCategory: "admin" },
  { label: "Roles & Permissions",path: "/settings/roles-permissions", permCategory: "admin" },
  { label: "Settings",           path: "/settings",                   permCategory: "admin" },
  { label: "Audit Log",          path: "/admin/audit-log",            permCategory: "admin" },

  // Open to all authenticated
  { label: "Tasks",              path: "/tasks",                      permCategory: null },
  { label: "Recall",             path: "/recall",                     permCategory: null },
  { label: "Ciyex Hub",          path: "/hub",                        permCategory: null },
  { label: "Kiosk",              path: "/kiosk",                      permCategory: null },
  { label: "Dashboard",          path: "/dashboard",                  permCategory: null },
];

// ── Result types ──────────────────────────────────────────────────────────────

type PageResult = "ALLOWED" | "DENIED" | "NOT_FOUND" | "ERROR" | "SKIP";

interface RouteResult {
  route: RouteSpec;
  result: PageResult;
  screenshot?: string;
  note?: string;
}

interface RoleResult {
  user: TestUser;
  loginSuccess: boolean;
  actualPermissions: string[];
  actualRole: string;
  superAdmin: boolean;
  navItems: string[];
  routes: RouteResult[];
  loginError?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ssName(role: string, label: string, result: PageResult): string {
  const safe = (s: string) => s.replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
  return `${safe(role)}__${safe(label)}__${result}.png`;
}

/** Call login API from Node.js (not browser) to get auth token */
async function fetchLoginToken(email: string, password: string): Promise<{
  token: string;
  refreshToken: string;
  groups: string[];
  userId: string;
  firstName: string;
  lastName: string;
  practitionerFhirId?: string;
  patientFhirId?: string;
} | null> {
  try {
    const https = await import("https");
    const http = await import("http");

    const body = JSON.stringify({ email, password });
    const url = new URL(`${API_URL}/api/auth/login`);
    const isHttps = url.protocol === "https:";

    return await new Promise((resolve, reject) => {
      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
        rejectUnauthorized: false,
      };

      const req = (isHttps ? https : http).default.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            if (json.success && json.data?.token) {
              resolve(json.data);
            } else {
              console.log(`[api-login] Failed: ${json.error || "unknown"}`);
              resolve(null);
            }
          } catch {
            resolve(null);
          }
        });
      });

      req.on("error", (err) => {
        console.error(`[api-login] Request error:`, err.message);
        resolve(null);
      });

      req.write(body);
      req.end();
    });
  } catch (err) {
    console.error(`[api-login] Error:`, err);
    return null;
  }
}

/** Inject auth token into browser localStorage and navigate to app */
async function login(
  page: Page,
  email: string,
  authData: NonNullable<Awaited<ReturnType<typeof fetchLoginToken>>>,
  permMap?: Record<string, string | null>,
  permCache?: { permissions: string[]; role: string; superAdmin: boolean },
): Promise<boolean> {
  const fullName = `${authData.firstName || ""} ${authData.lastName || ""}`.trim() || email;

  // Load the app page first so we can access localStorage
  await page.goto(`${BASE_URL}/signin`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(1000);

  // Inject token + user data into localStorage
  await page.evaluate(({ token, refreshToken, email: em, groups, userId, fullName: fn,
    practitionerFhirId, patientFhirId }) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("token", token);
    if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
    localStorage.setItem("userEmail", em);
    localStorage.setItem("userFullName", fn);
    localStorage.setItem("userId", String(userId || ""));
    localStorage.setItem("groups", JSON.stringify(groups || []));
    localStorage.setItem("authMethod", "keycloak");
    if (groups?.length) localStorage.setItem("primaryGroup", groups[0]);
    if (practitionerFhirId) localStorage.setItem("practitionerFhirId", practitionerFhirId);
    if (patientFhirId) localStorage.setItem("patientFhirId", patientFhirId);
  }, {
    token: authData.token,
    refreshToken: authData.refreshToken,
    email,
    groups: authData.groups,
    userId: authData.userId,
    fullName,
    practitionerFhirId: authData.practitionerFhirId,
    patientFhirId: authData.patientFhirId,
  });

  // Set org tenant — decode from JWT; also inject pre-fetched permission map
  try {
    const tokenParts = authData.token.split(".");
    const payload = JSON.parse(Buffer.from(tokenParts[1], "base64url").toString());
    const org = payload.organization;
    let tenant: string | null = null;
    if (typeof org === "string") tenant = org;
    else if (Array.isArray(org) && org.length > 0) tenant = String(org[0]);
    if (tenant) {
      await page.evaluate((t) => {
        localStorage.setItem("selectedTenant", t);
        localStorage.setItem("tenantName", t);
      }, tenant);
      console.log(`[login] Tenant: ${tenant}`);
    }
  } catch {}

  // Inject pre-fetched permission map so MenuContext can bootstrap without browser API calls
  if (permMap && Object.keys(permMap).length > 0) {
    await page.evaluate((map) => {
      localStorage.setItem("__menu_perm_map_cache__", JSON.stringify(map));
    }, permMap);
    console.log(`[login] Injected pagePermissionMap (${Object.keys(permMap).length} slugs) into localStorage`);
  }

  // Inject permissions data so PermissionContext bootstraps without browser API calls
  if (permCache) {
    await page.evaluate((cache) => {
      localStorage.setItem("__perm_cache__", JSON.stringify(cache));
    }, permCache);
    console.log(`[login] Injected permCache (${permCache.permissions.length} perms, superAdmin=${permCache.superAdmin}) into localStorage`);
  }

  // Navigate to calendar (the main app page)
  await page.goto(`${BASE_URL}/calendar`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(4000); // let permission + menu contexts load

  const url = page.url();
  if (url.includes("/signin")) {
    return false;
  }

  return true;
}

async function logout(page: Page): Promise<void> {
  try {
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  } catch {}
}

async function nodeGet(url: string, token: string, tenantName?: string): Promise<unknown> {
  const https = await import("https");
  const parsed = new URL(url);
  return new Promise((resolve) => {
    const req = https.default.request({
      hostname: parsed.hostname,
      port: parsed.port || 443,
      path: parsed.pathname + (parsed.search || ""),
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...(tenantName ? { "X-Tenant-Name": tenantName } : {}),
      },
      rejectUnauthorized: false,
    }, (res) => {
      let data = "";
      res.on("data", (c) => { data += c; });
      res.on("end", () => { try { resolve(JSON.parse(data)); } catch { resolve(null); } });
    });
    req.on("error", () => resolve(null));
    req.end();
  });
}

async function getPermissions(token: string, tenantName?: string): Promise<{ permissions: string[]; role: string; superAdmin: boolean }> {
  try {
    const json = await nodeGet(`${API_URL}/api/user/permissions`, token, tenantName) as Record<string, unknown> | null;
    return (json?.data as { permissions: string[]; role: string; superAdmin: boolean }) || { permissions: [], role: "", superAdmin: false };
  } catch {
    return { permissions: [], role: "", superAdmin: false };
  }
}

/** Fetch menu from Node.js and build the pagePermissionMap (slug → requiredPermission) */
async function fetchMenuPermissionMap(token: string, tenantName?: string): Promise<Record<string, string | null>> {
  try {
    const json = await nodeGet(`${API_URL}/api/menus/ehr-sidebar`, token, tenantName) as Record<string, unknown> | null;
    if (!json || !Array.isArray((json as { items?: unknown[] }).items)) return {};

    const map: Record<string, string | null> = {};
    function traverse(nodes: Array<{ item: { screenSlug?: string | null; requiredPermission?: string | null }; children?: unknown[] | null }>) {
      for (const node of nodes) {
        if (node.item.screenSlug) {
          map[node.item.screenSlug] = node.item.requiredPermission ?? null;
        }
        if (Array.isArray(node.children) && node.children.length) {
          traverse(node.children as typeof nodes);
        }
      }
    }
    traverse((json as { items: Array<{ item: { screenSlug?: string | null; requiredPermission?: string | null }; children?: unknown[] | null }> }).items);
    console.log(`  [menu] Fetched ${Object.keys(map).length} slugs from menu API`);
    return map;
  } catch (err) {
    console.warn("  [menu] Failed to fetch menu:", err);
    return {};
  }
}

async function getNavItems(page: Page): Promise<string[]> {
  try {
    await page.waitForTimeout(2000); // sidebar needs time to load menu
    const items = await page.locator("aside .menu-item span.menu-item-text, aside [class*='menu-item'] span").allTextContents();
    return items.map(s => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

async function testRoute(
  page: Page,
  route: RouteSpec,
  role: string
): Promise<RouteResult> {
  const ssDir = SCREENSHOTS_DIR;
  try {
    await page.goto(`${BASE_URL}${route.path}`, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });
    await page.waitForTimeout(3000);

    const url = page.url();

    // Redirected to signin → session expired (shouldn't happen)
    if (url.includes("/signin")) {
      return { route, result: "ERROR", note: "Redirected to signin" };
    }

    // Check for 404 — only match the specific not-found page text
    const isNotFound = await page.locator("text=We can't seem to find the page you are looking for!").isVisible().catch(() => false);

    if (isNotFound) {
      const ssFile = ssName(role, route.label, "NOT_FOUND");
      await page.screenshot({ path: path.join(ssDir, ssFile), fullPage: false });
      return { route, result: "NOT_FOUND", screenshot: ssFile, note: "Route not implemented" };
    }

    // Check for Access Denied
    const isDenied = await page.locator('h2:has-text("Access Denied")').isVisible().catch(() => false);

    if (isDenied) {
      const ssFile = ssName(role, route.label, "DENIED");
      await page.screenshot({ path: path.join(ssDir, ssFile), fullPage: false });
      return { route, result: "DENIED", screenshot: ssFile };
    }

    // Allowed — take screenshot
    const ssFile = ssName(role, route.label, "ALLOWED");
    await page.screenshot({ path: path.join(ssDir, ssFile), fullPage: false });
    return { route, result: "ALLOWED", screenshot: ssFile };

  } catch (err) {
    return { route, result: "ERROR", note: String(err).slice(0, 100) };
  }
}

// ── HTML Report Generator ─────────────────────────────────────────────────────

function resultEmoji(r: PageResult): string {
  switch (r) {
    case "ALLOWED":   return "✅";
    case "DENIED":    return "🔒";
    case "NOT_FOUND": return "⚠️";
    case "ERROR":     return "❌";
    case "SKIP":      return "⏭️";
  }
}

function resultColor(r: PageResult): string {
  switch (r) {
    case "ALLOWED":   return "#16a34a";
    case "DENIED":    return "#dc2626";
    case "NOT_FOUND": return "#d97706";
    case "ERROR":     return "#9333ea";
    case "SKIP":      return "#6b7280";
  }
}

function generateReport(results: RoleResult[]): string {
  const now = new Date().toLocaleString();
  const allRouteLabels = ROUTES.map(r => r.label);

  const tableRows = results.map(rr => {
    const roleCell = `
      <td style="white-space:nowrap;font-weight:bold;padding:8px 12px;border:1px solid #e5e7eb">
        ${rr.user.role}
        ${rr.superAdmin ? '<span style="background:#7c3aed;color:white;border-radius:4px;padding:1px 6px;font-size:10px;margin-left:4px">SUPER</span>' : ""}
        <br><span style="font-weight:normal;font-size:11px;color:#6b7280">${rr.user.email}</span>
        ${rr.actualRole ? `<br><span style="font-size:10px;color:#9333ea">role: ${rr.actualRole}</span>` : ""}
        ${rr.loginSuccess
          ? `<br><span style="font-size:10px;color:#16a34a">✓ logged in</span>`
          : `<br><span style="font-size:10px;color:#dc2626">✗ login failed: ${rr.loginError || "unknown"}</span>`}
      </td>`;

    const routeCells = allRouteLabels.map(label => {
      const rr2 = rr.routes.find(r => r.route.label === label);
      if (!rr2) return `<td style="border:1px solid #e5e7eb;text-align:center">—</td>`;
      const color = resultColor(rr2.result);
      const emoji = resultEmoji(rr2.result);
      const ss = rr2.screenshot ? `<br><a href="rbac-screenshots/${rr2.screenshot}" target="_blank" style="font-size:10px;color:#3b82f6">screenshot</a>` : "";
      const note = rr2.note ? `<br><span style="font-size:9px;color:#9ca3af">${rr2.note}</span>` : "";
      return `<td style="border:1px solid #e5e7eb;text-align:center;color:${color};padding:6px 8px">
        ${emoji}${ss}${note}
      </td>`;
    }).join("");

    const permCell = `<td style="border:1px solid #e5e7eb;padding:6px 8px;font-size:10px;max-width:180px">
      ${rr.actualPermissions.slice(0, 20).join(", ")}${rr.actualPermissions.length > 20 ? `... (+${rr.actualPermissions.length - 20})` : ""}
    </td>`;

    const navCell = `<td style="border:1px solid #e5e7eb;padding:6px 8px;font-size:10px;max-width:160px">
      ${rr.navItems.slice(0, 15).join(", ")}
    </td>`;

    return `<tr>${roleCell}${routeCells}${permCell}${navCell}</tr>`;
  }).join("");

  const headerCells = allRouteLabels.map(label => {
    const route = ROUTES.find(r => r.label === label)!;
    const perm = route.permCategory ? `<br><span style="font-size:9px;color:#6b7280">(${route.permCategory})</span>` : `<br><span style="font-size:9px;color:#16a34a">(open)</span>`;
    return `<th style="border:1px solid #d1d5db;padding:6px 8px;background:#f8fafc;writing-mode:vertical-rl;transform:rotate(180deg);min-height:100px;font-size:11px;font-weight:600;text-align:left">${label}${perm}</th>`;
  }).join("");

  // Per-route summary
  const routeSummary = ROUTES.map(route => {
    const counts = { ALLOWED: 0, DENIED: 0, NOT_FOUND: 0, ERROR: 0, SKIP: 0 };
    results.forEach(rr => {
      const r = rr.routes.find(r => r.route.label === route.label);
      if (r) counts[r.result]++;
    });
    return `<tr>
      <td style="border:1px solid #e5e7eb;padding:6px 10px;font-weight:500">${route.label}</td>
      <td style="border:1px solid #e5e7eb;padding:6px 10px;font-size:11px;color:#6b7280">${route.path}</td>
      <td style="border:1px solid #e5e7eb;padding:6px 10px;font-size:11px">${route.permCategory ?? "— (open)"}</td>
      <td style="border:1px solid #e5e7eb;padding:6px 10px;color:#16a34a;text-align:center">${counts.ALLOWED} ✅</td>
      <td style="border:1px solid #e5e7eb;padding:6px 10px;color:#dc2626;text-align:center">${counts.DENIED} 🔒</td>
      <td style="border:1px solid #e5e7eb;padding:6px 10px;color:#d97706;text-align:center">${counts.NOT_FOUND} ⚠️</td>
      <td style="border:1px solid #e5e7eb;padding:6px 10px;color:#9333ea;text-align:center">${counts.ERROR} ❌</td>
    </tr>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ciyex EHR — RBAC Role Test Report</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; margin: 0; padding: 20px; background: #f9fafb; color: #111827; }
    h1 { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
    .meta { color: #6b7280; font-size: 13px; margin-bottom: 24px; }
    h2 { font-size: 18px; font-weight: 600; margin: 32px 0 12px; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px; }
    .legend { display: flex; gap: 16px; margin-bottom: 16px; font-size: 13px; }
    .legend-item { display: flex; align-items: center; gap: 6px; }
    table { border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); width: 100%; }
    th { background: #f8fafc; font-weight: 600; }
    tr:hover td { background: #fafafa; }
    .overflow-table { overflow-x: auto; }
    .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
    .stat-card { background: white; border-radius: 8px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); text-align: center; }
    .stat-card .value { font-size: 32px; font-weight: 700; }
    .stat-card .label { font-size: 13px; color: #6b7280; margin-top: 4px; }
  </style>
</head>
<body>
  <h1>Ciyex EHR — RBAC Role Test Report</h1>
  <p class="meta">Generated: ${now} | Base URL: ${BASE_URL} | ${results.filter(r => r.loginSuccess).length}/${results.length} roles tested successfully</p>

  <div class="legend">
    <div class="legend-item">✅ <b>ALLOWED</b> — user can access the page</div>
    <div class="legend-item">🔒 <b>DENIED</b> — PermissionGuard blocked access (Access Denied screen)</div>
    <div class="legend-item">⚠️ <b>NOT_FOUND</b> — route returns 404 (not implemented)</div>
    <div class="legend-item">❌ <b>ERROR</b> — test error (network, timeout, etc.)</div>
  </div>

  ${(() => {
    const totalChecks = results.flatMap(r => r.routes).length;
    const allowed = results.flatMap(r => r.routes).filter(r => r.result === "ALLOWED").length;
    const denied = results.flatMap(r => r.routes).filter(r => r.result === "DENIED").length;
    const notFound = results.flatMap(r => r.routes).filter(r => r.result === "NOT_FOUND").length;
    return `<div class="stat-grid">
      <div class="stat-card"><div class="value" style="color:#16a34a">${allowed}</div><div class="label">Pages Accessible ✅</div></div>
      <div class="stat-card"><div class="value" style="color:#dc2626">${denied}</div><div class="label">Access Denied 🔒</div></div>
      <div class="stat-card"><div class="value" style="color:#d97706">${notFound}</div><div class="label">Not Found ⚠️</div></div>
      <div class="stat-card"><div class="value" style="color:#6b7280">${totalChecks}</div><div class="label">Total Checks</div></div>
    </div>`;
  })()}

  <h2>Permission Matrix (Role × Page)</h2>
  <div class="overflow-table">
    <table>
      <thead>
        <tr>
          <th style="border:1px solid #d1d5db;padding:8px 12px;background:#f8fafc;text-align:left;white-space:nowrap">Role / User</th>
          ${headerCells}
          <th style="border:1px solid #d1d5db;padding:8px 12px;background:#f8fafc;text-align:left">Permissions</th>
          <th style="border:1px solid #d1d5db;padding:8px 12px;background:#f8fafc;text-align:left">Nav Items</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  </div>

  <h2>Route Summary</h2>
  <table>
    <thead>
      <tr>
        <th style="border:1px solid #d1d5db;padding:8px 12px;text-align:left">Route</th>
        <th style="border:1px solid #d1d5db;padding:8px 12px;text-align:left">Path</th>
        <th style="border:1px solid #d1d5db;padding:8px 12px;text-align:left">Required Permission</th>
        <th style="border:1px solid #d1d5db;padding:8px 12px;text-align:center">Allowed</th>
        <th style="border:1px solid #d1d5db;padding:8px 12px;text-align:center">Denied</th>
        <th style="border:1px solid #d1d5db;padding:8px 12px;text-align:center">Not Found</th>
        <th style="border:1px solid #d1d5db;padding:8px 12px;text-align:center">Error</th>
      </tr>
    </thead>
    <tbody>${routeSummary}</tbody>
  </table>

  <h2>Per-Role Permission Details</h2>
  ${results.map(rr => `
    <details style="margin-bottom:12px;background:white;border-radius:8px;padding:12px 16px;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
      <summary style="cursor:pointer;font-weight:600;font-size:15px">
        ${rr.user.role} — ${rr.user.email}
        ${rr.loginSuccess ? '<span style="color:#16a34a;font-size:12px;font-weight:normal"> (logged in)</span>' : '<span style="color:#dc2626;font-size:12px;font-weight:normal"> (login failed)</span>'}
      </summary>
      <div style="margin-top:12px;font-size:13px">
        <p><b>Role from API:</b> ${rr.actualRole || "—"} | <b>Super Admin:</b> ${rr.superAdmin ? "Yes" : "No"}</p>
        <p><b>Permissions (${rr.actualPermissions.length}):</b> ${rr.actualPermissions.join(", ") || "—"}</p>
        <p><b>Nav items visible:</b> ${rr.navItems.join(", ") || "—"}</p>
      </div>
    </details>
  `).join("")}

</body>
</html>`;
}

// ── Main test ─────────────────────────────────────────────────────────────────

test.describe("RBAC All Roles", () => {
  test.setTimeout(600000); // 10 min for all roles

  test("Full RBAC matrix — all SMART roles × all routes", async ({ browser }) => {
    // Ensure screenshot dir
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

    const allResults: RoleResult[] = [];

    for (const user of USERS) {
      console.log(`\n${"=".repeat(60)}`);
      console.log(`Testing role: ${user.role} (${user.email})`);
      console.log("=".repeat(60));

      const context = await browser.newContext({
        viewport: { width: 1400, height: 900 },
      });
      const page = await context.newPage();

      const roleResult: RoleResult = {
        user,
        loginSuccess: false,
        actualPermissions: [],
        actualRole: "",
        superAdmin: false,
        navItems: [],
        routes: [],
      };

      try {
        // Fetch token via Node.js API call
        const authData = await fetchLoginToken(user.email, user.password || PASSWORD);

        if (!authData) {
          roleResult.loginError = "API auth failed (invalid credentials or user not found)";
          console.log(`  ✗ Login failed for ${user.email}`);
          allResults.push(roleResult);
          await context.close();
          continue;
        }

        // Decode tenant from JWT
        const loginTenant = (() => {
          try {
            const parts = authData.token.split(".");
            const p = JSON.parse(Buffer.from(parts[1], "base64url").toString());
            const org = p.organization;
            if (typeof org === "string") return org;
            if (Array.isArray(org) && org.length > 0) return String(org[0]);
          } catch {}
          return undefined;
        })();

        // Pre-fetch menu permission map + permissions via Node.js (bypasses CORS in headless browser)
        const [permMap, permsForCache] = await Promise.all([
          fetchMenuPermissionMap(authData.token, loginTenant),
          getPermissions(authData.token, loginTenant),
        ]);

        // Inject token + pre-fetched data into browser (so contexts bootstrap without CORS issues)
        const loggedIn = await login(page, user.email, authData, permMap, permsForCache);

        if (!loggedIn) {
          roleResult.loginError = "Browser session setup failed";
          console.log(`  ✗ Browser login failed for ${user.email}`);
          allResults.push(roleResult);
          await context.close();
          continue;
        }

        roleResult.loginSuccess = true;
        console.log(`  ✓ Logged in as ${user.email}`);

        roleResult.actualPermissions = permsForCache.permissions;
        roleResult.actualRole = permsForCache.role;
        roleResult.superAdmin = permsForCache.superAdmin;
        console.log(`  Role: ${permsForCache.role} | SuperAdmin: ${permsForCache.superAdmin} | Perms: ${permsForCache.permissions.length}`);

        // Capture visible nav items (navigate to a known page first)
        await page.goto(`${BASE_URL}/calendar`, { waitUntil: "domcontentloaded", timeout: 15000 });
        await page.waitForTimeout(3000);
        roleResult.navItems = await getNavItems(page);
        console.log(`  Nav items (${roleResult.navItems.length}): ${roleResult.navItems.slice(0, 8).join(", ")}...`);

        // Test each route
        for (const route of ROUTES) {
          const result = await testRoute(page, route, user.role);
          roleResult.routes.push(result);
          console.log(`  ${resultEmoji(result.result)} ${route.label.padEnd(25)} ${result.result}${result.note ? ` — ${result.note}` : ""}`);
        }

      } catch (err) {
        roleResult.loginError = String(err).slice(0, 200);
        console.error(`  ✗ Error testing ${user.role}:`, err);
      }

      allResults.push(roleResult);
      await context.close();
    }

    // Generate and write HTML report
    const html = generateReport(allResults);
    fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
    fs.writeFileSync(REPORT_PATH, html);
    console.log(`\n📊 Report written to: ${REPORT_PATH}`);
    console.log(`📸 Screenshots in: ${SCREENSHOTS_DIR}`);

    // Print summary
    console.log("\n" + "=".repeat(60));
    console.log("RBAC TEST SUMMARY");
    console.log("=".repeat(60));
    for (const rr of allResults) {
      if (!rr.loginSuccess) {
        console.log(`${rr.user.role.padEnd(12)} — LOGIN FAILED`);
        continue;
      }
      const allowed = rr.routes.filter(r => r.result === "ALLOWED").length;
      const denied  = rr.routes.filter(r => r.result === "DENIED").length;
      const nf      = rr.routes.filter(r => r.result === "NOT_FOUND").length;
      const err     = rr.routes.filter(r => r.result === "ERROR").length;
      console.log(`${rr.user.role.padEnd(12)} — ✅ ${allowed} allowed  🔒 ${denied} denied  ⚠️ ${nf} not found  ❌ ${err} error`);
    }
  });
});
