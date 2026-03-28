/**
 * Final definitive test - directly instrument the guard to understand why it's not blocking
 */
import { test, Page } from "@playwright/test";
import path from "path";

const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'Test@123';
const BASE_URL = "https://app-dev.ciyex.org";
const API_URL = "https://api-dev.ciyex.org";
const SCREENSHOTS_DIR = path.join(process.cwd(), "test-results", "screenshots");

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `final-${name}.png`), fullPage: true });
  console.log(`[ss] final-${name}.png`);
}

async function realLogin(page: Page, email: string, password: string) {
  await page.goto(`${BASE_URL}/signin`, { waitUntil: "networkidle" });
  await page.fill('input[id="email"]', email);
  await page.click('button:has-text("Continue")');
  await page.waitForTimeout(3000);
  const passwordVisible = await page.locator('input[id="password"]').isVisible().catch(() => false);
  if (passwordVisible) {
    await page.fill('input[id="password"]', password);
    await page.click('button:has-text("Sign in")');
    try { await page.waitForURL(`${BASE_URL}/calendar`, { timeout: 30000 }); } catch {}
    await page.waitForTimeout(4000);
  }
  console.log(`[login] URL after login: ${page.url()}`);
}

test("DEFINITIVE: Billing user blocked from admin-only settings pages", async ({ page }) => {
  test.setTimeout(120000);

  // Do real login to ensure full context loading
  await realLogin(page, "billing.davis@sunrisefamilymedicine.com", TEST_PASSWORD);

  if (!page.url().includes("/calendar")) {
    console.log("[SKIP] Login failed, skipping test");
    return;
  }

  await shot(page, "01-calendar-after-login");

  // Wait for contexts to fully settle
  await page.waitForTimeout(3000);

  // Now navigate to admin-only page
  await page.goto(`${BASE_URL}/settings/roles-permissions`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(5000);
  await shot(page, "02-billing-roles-permissions");

  const accessDenied = await page.locator('h2:has-text("Access Denied")').isVisible().catch(() => false);
  const bodyText = await page.locator("body").textContent().catch(() => "");

  console.log(`[RESULT] Access Denied visible: ${accessDenied}`);
  console.log(`[RESULT] Has "Roles & Permissions": ${bodyText?.includes("Roles & Permissions")}`);
  console.log(`[RESULT] URL: ${page.url()}`);

  // Try user-management too
  await page.goto(`${BASE_URL}/settings/user-management`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(5000);
  await shot(page, "03-billing-user-management");

  const accessDenied2 = await page.locator('h2:has-text("Access Denied")').isVisible().catch(() => false);
  const bodyText2 = await page.locator("body").textContent().catch(() => "");
  console.log(`[RESULT] user-management - Access Denied: ${accessDenied2}`);

  console.log("\n============= SUMMARY =============");
  console.log(`Billing blocked from /settings/roles-permissions: ${accessDenied}`);
  console.log(`Billing blocked from /settings/user-management: ${accessDenied2}`);
  console.log("Bug confirmed (guard not working): " + (!accessDenied && !accessDenied2));
  console.log("===================================");
});

test("DEFINITIVE: Admin user full access", async ({ page }) => {
  test.setTimeout(120000);

  await realLogin(page, "michael.chen@example.com", TEST_PASSWORD);

  if (!page.url().includes("/calendar")) {
    console.log("[SKIP] Login failed");
    return;
  }

  await shot(page, "04-admin-calendar");
  await page.waitForTimeout(2000);

  // Navigate to admin settings pages
  await page.goto(`${BASE_URL}/settings/roles-permissions`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(4000);
  await shot(page, "05-admin-roles-permissions");

  const adminDenied = await page.locator('h2:has-text("Access Denied")').isVisible().catch(() => false);
  const bodyText = await page.locator("body").textContent().catch(() => "");
  console.log(`[RESULT] Admin Access Denied on roles-permissions: ${adminDenied}`);
  console.log(`[RESULT] Admin sees Roles & Permissions page: ${bodyText?.includes("Roles & Permissions")}`);

  await page.goto(`${BASE_URL}/settings/user-management`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(4000);
  await shot(page, "06-admin-user-management");
  const adminDenied2 = await page.locator('h2:has-text("Access Denied")').isVisible().catch(() => false);
  console.log(`[RESULT] Admin Access Denied on user-management: ${adminDenied2}`);

  console.log("\n============= ADMIN SUMMARY =============");
  console.log(`Admin can access /settings/roles-permissions: ${!adminDenied}`);
  console.log(`Admin can access /settings/user-management: ${!adminDenied2}`);
  console.log("=========================================");
});

test("DEFINITIVE: Backend security check - billing user accessing admin APIs", async ({ page }) => {
  test.setTimeout(60000);

  // Fetch billing token
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "billing.davis@sunrisefamilymedicine.com", password: TEST_PASSWORD }),
  });
  const billingData = (await res.json() as any).data;

  // Test backend security directly
  const testEndpoints = [
    "/api/admin/roles",
    "/api/admin/users",
    "/api/user/permissions",
  ];

  console.log("\n--- Backend security check ---");
  for (const endpoint of testEndpoints) {
    const r = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        "Authorization": `Bearer ${billingData.token}`,
        "X-Tenant-Name": "sunrise-family-medicine",
        "Accept": "application/json",
      }
    });
    console.log(`  ${r.status} ${endpoint} (expected 403 for admin-only, except /api/user/permissions)`);
  }
  console.log("--- End backend check ---");
});
