/**
 * Incremental RBAC Test — Complete EHR Coverage
 * ================================================
 * Tests ALL menu pages by incrementally granting permission categories
 * to a test user (FRONT_DESK) and verifying page access changes.
 *
 * Flow:
 * 1. Login as ADMIN → modify FRONT_DESK role permissions via admin API
 * 2. Login as FRONT_DESK → verify each page is ALLOWED/DENIED as expected
 * 3. Incrementally add permission categories → re-verify
 * 4. Restore original permissions on cleanup
 *
 * Uses deployed dev: https://app-dev.ciyex.org
 */

import { test, expect, Page } from "@playwright/test";
import * as https from "https";
import * as fs from "fs";
import * as path from "path";

// ── Config ──────────────────────────────────────────────────────────────────

const BASE_URL = "https://app-dev.ciyex.org";
const API_URL = "https://api-dev.ciyex.org";
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'Test@123';
const PASSWORD = TEST_PASSWORD;

const ADMIN_EMAIL = "michael.chen@example.com";
const TEST_EMAIL = "frontdesk.brown@sunrisefamilymedicine.com";
const TEST_ROLE = "FRONT_DESK";

const REPORT_DIR = path.join(process.cwd(), "test-results");
const SS_DIR = path.join(REPORT_DIR, "rbac-incremental-screenshots");

// ── ALL routes from the menu (exact permission map from /api/menus/ehr-sidebar) ──

interface Route {
  label: string;
  path: string;
  /** Permission category from menu (null = open to all authenticated users) */
  perm: string | null;
}

const ALL_ROUTES: Route[] = [
  // Scheduling
  { label: "Calendar",              path: "/calendar",                perm: "scheduling" },
  { label: "Appointments",          path: "/appointments",            perm: "scheduling" },
  // Demographics (open in menu, but has patient CRUD)
  { label: "Patients",              path: "/patients",                perm: null },
  // Clinical / Chart
  { label: "All Encounters",        path: "/all-encounters",          perm: "chart" },
  { label: "Prescriptions",         path: "/prescriptions",           perm: "chart" },
  { label: "Labs",                  path: "/labs",                    perm: "chart" },
  { label: "Immunizations",         path: "/immunizations",           perm: "chart" },
  { label: "Referrals",             path: "/referrals",               perm: "chart" },
  { label: "Care Plans",            path: "/care-plans",              perm: "chart" },
  { label: "Education",             path: "/education",               perm: "chart" },
  // Messaging
  { label: "Messaging",             path: "/messaging",               perm: "messaging" },
  { label: "Notifications",         path: "/notifications",           perm: "messaging" },
  { label: "Fax",                   path: "/fax",                     perm: "messaging" },
  // Billing
  { label: "Payments",              path: "/payments",                perm: "billing" },
  { label: "Claim Management",      path: "/patients/claim-management", perm: "billing" },
  // Reports
  { label: "Reports",               path: "/reports",                 perm: "reports" },
  // Admin / Settings
  { label: "Settings",              path: "/settings",                perm: "admin" },
  { label: "Settings - Layout",     path: "/settings/layout-settings", perm: "admin" },
  { label: "Settings - Portal",     path: "/settings/portal-settings", perm: "admin" },
  { label: "User Management",       path: "/settings/user-management", perm: "admin" }, // sub-route of /settings
  { label: "Roles & Permissions",   path: "/settings/roles-permissions", perm: "admin" }, // sub-route of /settings
  // Open to all
  { label: "Tasks",                 path: "/tasks",                   perm: null },
  { label: "Authorizations",        path: "/authorizations",          perm: null },
  { label: "Recall",                path: "/recall",                  perm: null },
  { label: "Codes",                 path: "/codes",                   perm: null },
  { label: "CDS Alerts",            path: "/cds",                     perm: null },
  { label: "Consents",              path: "/consents",                perm: null },
  { label: "Doc Scanning",          path: "/document-scanning",       perm: null },
  { label: "Kiosk",                 path: "/kiosk",                   perm: null },
  { label: "Audit Log",             path: "/admin/audit-log",         perm: null },
  { label: "Ciyex Hub",             path: "/hub",                     perm: null },
];

// ── Incremental permission steps ────────────────────────────────────────────

interface PermStep {
  label: string;
  permissions: string[];
  description: string;
}

const STEPS: PermStep[] = [
  {
    label: "Step 0: No permissions",
    permissions: [],
    description: "All protected pages should be denied; open pages allowed",
  },
  {
    label: "Step 1: demographics.read only",
    permissions: ["demographics.read"],
    description: "Patients is already open; no new pages should unlock (demographics not in menu perm map)",
  },
  {
    label: "Step 2: + scheduling",
    permissions: ["demographics.read", "scheduling.read", "scheduling.write"],
    description: "Calendar and Appointments should now be accessible",
  },
  {
    label: "Step 3: + chart",
    permissions: ["demographics.read", "scheduling.read", "scheduling.write", "chart.read", "chart.write"],
    description: "All clinical pages (encounters, prescriptions, labs, etc.) should unlock",
  },
  {
    label: "Step 4: + messaging",
    permissions: ["demographics.read", "scheduling.read", "scheduling.write", "chart.read", "chart.write", "messaging.read", "messaging.send"],
    description: "Messaging, Notifications, Fax should unlock",
  },
  {
    label: "Step 5: + billing",
    permissions: [
      "demographics.read", "scheduling.read", "scheduling.write",
      "chart.read", "chart.write", "messaging.read", "messaging.send",
      "billing.read", "billing.write",
    ],
    description: "Payments, Claim Management should unlock",
  },
  {
    label: "Step 6: + reports",
    permissions: [
      "demographics.read", "scheduling.read", "scheduling.write",
      "chart.read", "chart.write", "messaging.read", "messaging.send",
      "billing.read", "billing.write", "reports.clinical", "reports.financial",
    ],
    description: "Reports should unlock",
  },
  {
    label: "Step 7: + admin (full access)",
    permissions: [
      "demographics.read", "scheduling.read", "scheduling.write",
      "chart.read", "chart.write", "messaging.read", "messaging.send",
      "billing.read", "billing.write", "reports.clinical", "reports.financial",
      "admin.users", "admin.settings", "admin.roles",
    ],
    description: "Settings and all admin pages should unlock — full access achieved",
  },
];

// ── HTTP helpers ─────────────────────────────────────────────────────────────

function httpsReq(url: string, method: string, headers: Record<string, string>, body?: string): Promise<{ status: number; data: string }> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname, port: parseInt(u.port) || 443,
      path: u.pathname + (u.search || ""), method,
      headers: { ...headers, ...(body ? { "Content-Length": String(Buffer.byteLength(body)) } : {}) },
      rejectUnauthorized: false,
    }, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => resolve({ status: res.statusCode || 0, data: d }));
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function apiLogin(email: string): Promise<Record<string, unknown> | null> {
  const resp = await httpsReq(`${API_URL}/api/auth/login`, "POST",
    { "Content-Type": "application/json" },
    JSON.stringify({ email, password: PASSWORD }));
  try {
    const json = JSON.parse(resp.data);
    return json.success ? json.data : null;
  } catch { return null; }
}

function tenantFromToken(token: string): string | undefined {
  try {
    const p = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    const org = p.organization;
    return typeof org === "string" ? org : Array.isArray(org) ? String(org[0]) : undefined;
  } catch { return undefined; }
}

async function fetchPermissionsAPI(token: string, tenant?: string): Promise<{ permissions: string[]; role: string; superAdmin: boolean }> {
  const resp = await httpsReq(`${API_URL}/api/user/permissions`, "GET", {
    Authorization: `Bearer ${token}`, Accept: "application/json",
    ...(tenant ? { "X-Tenant-Name": tenant } : {}),
  });
  try {
    const json = JSON.parse(resp.data);
    return json.data || { permissions: [], role: "", superAdmin: false };
  } catch { return { permissions: [], role: "", superAdmin: false }; }
}

async function updateRolePermissions(adminToken: string, tenant: string, roleName: string, permissions: string[]): Promise<boolean> {
  try {
    // Get role list
    const listResp = await httpsReq(`${API_URL}/api/admin/roles`, "GET", {
      Authorization: `Bearer ${adminToken}`, Accept: "application/json", "X-Tenant-Name": tenant,
    });
    if (listResp.status !== 200) {
      console.error(`  [role-update] GET roles failed: ${listResp.status} ${listResp.data.slice(0, 200)}`);
      return false;
    }
    const listJson = JSON.parse(listResp.data);
    const roles = listJson.data || listJson || [];
    const role = (Array.isArray(roles) ? roles : []).find((r: { roleName?: string }) => r.roleName === roleName);
    if (!role) { console.error(`Role ${roleName} not found`); return false; }

    const body = JSON.stringify({
      roleName: role.roleName,
      roleLabel: role.roleLabel || roleName,
      description: role.description || "",
      permissions,
    });
    const resp = await httpsReq(`${API_URL}/api/admin/roles/${role.id}`, "PUT", {
      Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json", "X-Tenant-Name": tenant,
    }, body);
    const result = JSON.parse(resp.data);
    console.log(`  [role-update] ${roleName} → ${permissions.length} perms → ${resp.status} ${result.success ? "OK" : result.message || "FAIL"}`);
    return result.success === true;
  } catch (err) {
    console.error(`  [role-update] Error: ${err}`);
    return false;
  }
}

async function loginBrowser(page: Page, authData: Record<string, unknown>, email: string): Promise<boolean> {
  await page.goto(`${BASE_URL}/signin`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(1000);

  const token = authData.token as string;
  const tenant = tenantFromToken(token);

  await page.evaluate(({ data, email, tenant }) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("user", JSON.stringify(data));
    localStorage.setItem("token", data.token);
    if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);
    localStorage.setItem("userEmail", email);
    localStorage.setItem("userFullName", `${data.firstName || ""} ${data.lastName || ""}`.trim());
    localStorage.setItem("userId", String(data.userId || ""));
    localStorage.setItem("groups", JSON.stringify(data.groups || []));
    localStorage.setItem("authMethod", "keycloak");
    if (data.groups?.length) localStorage.setItem("primaryGroup", data.groups[0]);
    if (data.practitionerFhirId) localStorage.setItem("practitionerFhirId", data.practitionerFhirId);
    if (data.patientFhirId) localStorage.setItem("patientFhirId", data.patientFhirId);
    if (tenant) {
      localStorage.setItem("selectedTenant", tenant);
      localStorage.setItem("tenantName", tenant);
    }
    window.dispatchEvent(new CustomEvent("auth-token-set", { detail: { key: "token" } }));
  }, { data: authData as Record<string, unknown>, email, tenant });

  await page.goto(`${BASE_URL}/calendar`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(5000);
  return !page.url().includes("/signin");
}

type CheckResult = "ALLOWED" | "DENIED" | "NOT_FOUND" | "ERROR";

async function checkPage(page: Page, routePath: string): Promise<CheckResult> {
  try {
    await page.goto(`${BASE_URL}${routePath}`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(3000);
    if (page.url().includes("/signin")) return "ERROR";
    const denied = await page.locator('h2:has-text("Access Denied")').isVisible().catch(() => false);
    if (denied) return "DENIED";
    const notFound = await page.locator("text=We can't seem to find the page you are looking for!").isVisible().catch(() => false);
    if (notFound) return "NOT_FOUND";
    return "ALLOWED";
  } catch { return "ERROR"; }
}

// Determine expected result for a route given the current permission set
function expectedResult(route: Route, perms: string[]): "ALLOWED" | "DENIED" {
  if (route.perm === null) return "ALLOWED"; // open to all
  // Check if any permission starts with the required category
  return perms.some(p => p.startsWith(route.perm + ".") || p === route.perm) ? "ALLOWED" : "DENIED";
}

// ── Main Test ────────────────────────────────────────────────────────────────

test.describe("Incremental RBAC — Complete EHR", () => {
  test.setTimeout(900000);

  test("Grant permissions step by step and verify all pages", async ({ browser }) => {
    fs.mkdirSync(SS_DIR, { recursive: true });

    // Phase 0: Get admin token
    console.log("\n=== Admin Login ===");
    const adminAuth = await apiLogin(ADMIN_EMAIL);
    expect(adminAuth, "ADMIN login").toBeTruthy();
    const adminToken = adminAuth!.token as string;
    const tenant = tenantFromToken(adminToken) || "sunrise-family-medicine";

    // Save original permissions to restore later
    const rolesResp = await httpsReq(`${API_URL}/api/admin/roles`, "GET", {
      Authorization: `Bearer ${adminToken}`, Accept: "application/json", "X-Tenant-Name": tenant,
    });
    const rolesJson = JSON.parse(rolesResp.data);
    const originalRole = (rolesJson.data || []).find((r: { roleName?: string }) => r.roleName === TEST_ROLE);
    const originalPerms: string[] = originalRole?.permissions || [];
    console.log(`  Original ${TEST_ROLE} perms (${originalPerms.length}): [${originalPerms.join(", ")}]`);

    const report: Array<{
      step: string;
      description: string;
      permissions: string[];
      apiPerms: string[];
      results: Array<{ route: Route; expected: string; actual: string; pass: boolean }>;
    }> = [];

    try {
      for (let si = 0; si < STEPS.length; si++) {
        const step = STEPS[si];
        console.log(`\n${"═".repeat(70)}`);
        console.log(`${step.label}`);
        console.log(`  ${step.description}`);
        console.log(`  Permissions: [${step.permissions.join(", ")}]`);
        console.log("═".repeat(70));

        // Re-login admin each step to avoid token expiry (tests take a while)
        const freshAdmin = await apiLogin(ADMIN_EMAIL);
        expect(freshAdmin, `Admin re-login at ${step.label}`).toBeTruthy();
        const currentAdminToken = freshAdmin!.token as string;

        // Update role
        const ok = await updateRolePermissions(currentAdminToken, tenant, TEST_ROLE, step.permissions);
        expect(ok, `Role update at ${step.label}`).toBe(true);
        await new Promise(r => setTimeout(r, 2000)); // let cache expire

        // Login as test user
        const testAuth = await apiLogin(TEST_EMAIL);
        expect(testAuth, `Test login at ${step.label}`).toBeTruthy();
        const testToken = testAuth!.token as string;
        const testTenant = tenantFromToken(testToken) || tenant;

        // Verify API returns correct permissions
        const apiPerms = await fetchPermissionsAPI(testToken, testTenant);
        console.log(`  API: role=${apiPerms.role} perms=${apiPerms.permissions.length} [${apiPerms.permissions.join(", ")}]`);

        // Browser login
        const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
        const page = await ctx.newPage();
        const loggedIn = await loginBrowser(page, testAuth!, TEST_EMAIL);
        expect(loggedIn, `Browser login at ${step.label}`).toBe(true);

        // Check user profile
        const profileVisible = await page.locator("button.dropdown-toggle").isVisible().catch(() => false);
        const userName = await page.locator("button.dropdown-toggle span.font-medium").textContent().catch(() => "");
        console.log(`  User profile: ${profileVisible ? "visible" : "hidden"} — name: "${userName}"`);

        // Screenshot overview
        await page.screenshot({ path: path.join(SS_DIR, `step${si}_overview.png`) });

        // Test ALL routes
        const stepResults: typeof report[0]["results"] = [];
        let passCount = 0;
        let failCount = 0;

        for (const route of ALL_ROUTES) {
          const expected = expectedResult(route, step.permissions);
          const actual = await checkPage(page, route.path);

          // NOT_FOUND counts as ALLOWED (page exists but not yet built)
          const normalizedActual = actual === "NOT_FOUND" ? "ALLOWED" : actual;
          const pass = normalizedActual === expected;
          stepResults.push({ route, expected, actual, pass });

          if (pass) passCount++;
          else failCount++;

          const icon = pass ? "  ✅" : "  ❌";
          const extra = actual === "NOT_FOUND" ? " (404)" : "";
          if (!pass) {
            console.log(`${icon} ${route.label.padEnd(25)} exp=${expected.padEnd(7)} got=${actual}${extra}`);
          }

          // Screenshot for failures and denials
          if (!pass || actual === "DENIED") {
            const safeName = route.label.replace(/[^a-z0-9]/gi, "_").toLowerCase();
            await page.screenshot({ path: path.join(SS_DIR, `step${si}_${safeName}_${actual}.png`) });
          }
        }

        console.log(`  ── ${passCount}/${ALL_ROUTES.length} pass, ${failCount} fail ──`);
        report.push({
          step: step.label, description: step.description,
          permissions: step.permissions, apiPerms: apiPerms.permissions,
          results: stepResults,
        });

        await ctx.close();
      }
    } finally {
      // Restore original permissions (use fresh admin token)
      console.log(`\n=== Restoring ${TEST_ROLE} original permissions (${originalPerms.length}) ===`);
      const restoreAdmin = await apiLogin(ADMIN_EMAIL);
      if (restoreAdmin) {
        await updateRolePermissions(restoreAdmin.token as string, tenant, TEST_ROLE, originalPerms);
      }
    }

    // Generate report
    const html = buildReport(report);
    const reportPath = path.join(REPORT_DIR, "rbac-incremental-report.html");
    fs.writeFileSync(reportPath, html);
    console.log(`\n📊 Report: ${reportPath}`);

    // Summary
    console.log("\n" + "═".repeat(70));
    console.log("SUMMARY");
    console.log("═".repeat(70));
    let totalPass = 0, totalFail = 0;
    for (const r of report) {
      const p = r.results.filter(x => x.pass).length;
      const f = r.results.filter(x => !x.pass).length;
      totalPass += p; totalFail += f;
      console.log(`  ${r.step}: ${p} pass, ${f} fail`);
    }
    console.log(`\n  TOTAL: ${totalPass} pass, ${totalFail} fail`);
    expect(totalFail, "All checks should pass").toBe(0);
  });
});

// ── HTML Report ──────────────────────────────────────────────────────────────

function buildReport(report: Array<{
  step: string; description: string; permissions: string[]; apiPerms: string[];
  results: Array<{ route: Route; expected: string; actual: string; pass: boolean }>;
}>): string {
  const now = new Date().toLocaleString();
  const totalPass = report.flatMap(r => r.results).filter(x => x.pass).length;
  const totalFail = report.flatMap(r => r.results).filter(x => !x.pass).length;

  // Permission categories involved
  const allCategories = ["scheduling", "chart", "messaging", "billing", "reports", "admin"];

  // Build a big matrix: rows = routes, columns = steps
  const matrixRows = ALL_ROUTES.map(route => {
    const cells = report.map(r => {
      const res = r.results.find(x => x.route.path === route.path);
      if (!res) return { actual: "—", pass: true };
      return res;
    });
    return { route, cells };
  });

  const stepsHtml = report.map((r, i) => {
    const passed = r.results.filter(x => x.pass).length;
    const failed = r.results.filter(x => !x.pass).length;
    const failRows = r.results.filter(x => !x.pass).map(x =>
      `<tr><td style="padding:4px 8px;border:1px solid #e5e7eb;font-size:12px">${x.route.label}</td>
       <td style="padding:4px 8px;border:1px solid #e5e7eb;font-size:12px;font-family:monospace">${x.route.path}</td>
       <td style="padding:4px 8px;border:1px solid #e5e7eb;font-size:12px;text-align:center;color:#16a34a">${x.expected}</td>
       <td style="padding:4px 8px;border:1px solid #e5e7eb;font-size:12px;text-align:center;color:#dc2626">${x.actual}</td></tr>`
    ).join("");

    return `<div style="background:white;border-radius:8px;padding:16px;margin-bottom:12px;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <h3 style="margin:0;font-size:15px">${r.step}</h3>
        <span style="font-size:13px;color:${failed > 0 ? "#dc2626" : "#16a34a"};font-weight:600">${passed}/${r.results.length} pass</span>
      </div>
      <p style="margin:4px 0 8px;font-size:12px;color:#6b7280">${r.description}</p>
      <p style="margin:0 0 4px;font-size:11px"><b>Permissions:</b> <code>[${r.permissions.join(", ")}]</code></p>
      <p style="margin:0 0 8px;font-size:11px"><b>API returned:</b> <code>[${r.apiPerms.join(", ")}]</code></p>
      ${failed > 0 ? `<details open><summary style="cursor:pointer;font-size:12px;color:#dc2626;font-weight:600">${failed} failures</summary>
        <table style="width:100%;border-collapse:collapse;margin-top:8px">
          <tr><th style="text-align:left;padding:4px 8px;border:1px solid #d1d5db;font-size:11px;background:#fef2f2">Route</th>
          <th style="text-align:left;padding:4px 8px;border:1px solid #d1d5db;font-size:11px;background:#fef2f2">Path</th>
          <th style="text-align:center;padding:4px 8px;border:1px solid #d1d5db;font-size:11px;background:#fef2f2">Expected</th>
          <th style="text-align:center;padding:4px 8px;border:1px solid #d1d5db;font-size:11px;background:#fef2f2">Actual</th></tr>
          ${failRows}
        </table></details>` : '<p style="margin:0;font-size:12px;color:#16a34a">All checks passed</p>'}
    </div>`;
  }).join("");

  // Matrix view
  const matrixHtml = `<table style="width:100%;border-collapse:collapse;font-size:11px">
    <thead><tr>
      <th style="text-align:left;padding:6px;border:1px solid #d1d5db;background:#f8fafc;position:sticky;left:0;z-index:1">Route</th>
      <th style="padding:6px;border:1px solid #d1d5db;background:#f8fafc;font-size:10px">Perm</th>
      ${report.map((_, i) => `<th style="padding:6px;border:1px solid #d1d5db;background:#f8fafc;writing-mode:vertical-rl;transform:rotate(180deg);min-height:80px;font-size:10px">Step ${i}</th>`).join("")}
    </tr></thead>
    <tbody>
    ${matrixRows.map(({ route, cells }) => `<tr>
      <td style="padding:4px 6px;border:1px solid #e5e7eb;white-space:nowrap;position:sticky;left:0;background:white;z-index:1">${route.label}</td>
      <td style="padding:4px 6px;border:1px solid #e5e7eb;color:#6b7280;font-size:10px">${route.perm || "—"}</td>
      ${cells.map(c => {
        if (typeof c.actual === "string" && c.actual === "—") return `<td style="border:1px solid #e5e7eb;text-align:center">—</td>`;
        const color = c.pass ? (c.actual === "ALLOWED" || c.actual === "NOT_FOUND" ? "#dcfce7" : "#fef9c3") : "#fecaca";
        const icon = c.actual === "ALLOWED" ? "✅" : c.actual === "DENIED" ? "🔒" : c.actual === "NOT_FOUND" ? "⚠️" : "❌";
        return `<td style="border:1px solid #e5e7eb;text-align:center;background:${color};padding:2px">${icon}</td>`;
      }).join("")}
    </tr>`).join("")}
    </tbody></table>`;

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>Incremental RBAC Report</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 0; padding: 20px; background: #f9fafb; color: #111827; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  .meta { color: #6b7280; font-size: 13px; margin-bottom: 16px; }
  h2 { font-size: 17px; margin: 24px 0 12px; border-bottom: 2px solid #e5e7eb; padding-bottom: 4px; }
  .stats { display: flex; gap: 12px; margin-bottom: 20px; }
  .stat { background: white; border-radius: 8px; padding: 12px 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); text-align: center; }
  .stat .val { font-size: 28px; font-weight: 700; }
  .stat .lbl { font-size: 12px; color: #6b7280; }
  code { font-size: 10px; background: #f3f4f6; padding: 1px 4px; border-radius: 3px; }
  .matrix-wrap { overflow-x: auto; }
</style></head><body>
<h1>Incremental RBAC Test Report — Ciyex EHR</h1>
<p class="meta">Generated: ${now} | Test user: ${TEST_EMAIL} (${TEST_ROLE}) | ${ALL_ROUTES.length} routes x ${STEPS.length} steps</p>
<div class="stats">
  <div class="stat"><div class="val" style="color:#16a34a">${totalPass}</div><div class="lbl">Passed</div></div>
  <div class="stat"><div class="val" style="color:#dc2626">${totalFail}</div><div class="lbl">Failed</div></div>
  <div class="stat"><div class="val">${STEPS.length}</div><div class="lbl">Steps</div></div>
  <div class="stat"><div class="val">${ALL_ROUTES.length}</div><div class="lbl">Routes</div></div>
</div>
<h2>Permission Matrix (Route x Step)</h2>
<div class="matrix-wrap">${matrixHtml}</div>
<h2>Step Details</h2>
${stepsHtml}
</body></html>`;
}
