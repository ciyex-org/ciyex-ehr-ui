import { test, expect, Page } from "@playwright/test";
import path from "path";

const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'Test@123';
const BASE_URL = "http://localhost:3002";
const API_URL = "https://api-dev.ciyex.org";

const SCREENSHOTS_DIR = path.join(process.cwd(), "test-results", "screenshots");

async function shot(page: Page, name: string) {
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, `${name}.png`),
    fullPage: true,
  });
  console.log(`[screenshot] ${name}.png`);
}

async function fetchAuthData(email: string, password: string) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json() as any;
  if (!json.success) throw new Error(`Login failed for ${email}: ${json.error}`);
  return json.data;
}

async function injectAuth(page: Page, data: any) {
  // Navigate to app first so localStorage is in the right origin
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);

  const fullName = `${data.firstName || ""} ${data.lastName || ""}`.trim() || data.username || "";

  await page.evaluate((d: any) => {
    localStorage.clear();
    localStorage.setItem("token", d.token);
    localStorage.setItem("refreshToken", d.refreshToken || "");
    localStorage.setItem("userEmail", d.email || "");
    localStorage.setItem("userFullName", d.fullName);
    localStorage.setItem("userId", String(d.userId || ""));
    localStorage.setItem("groups", JSON.stringify(d.groups || []));
    localStorage.setItem("authMethod", "keycloak");
    localStorage.setItem("user", JSON.stringify(d));
    if (d.practitionerFhirId) localStorage.setItem("practitionerFhirId", d.practitionerFhirId);
    localStorage.setItem("selectedTenant", "sunrise-family-medicine");
    if (d.groups && d.groups.length > 0) {
      localStorage.setItem("primaryGroup", d.groups[0]);
    }
    // Dispatch event so contexts pick up the token
    window.dispatchEvent(new CustomEvent("auth-token-set", { detail: { key: "token" } }));
  }, { ...data, fullName });

  console.log(`[auth] Injected token for ${data.email}, groups: ${JSON.stringify(data.groups)}`);
}

test.describe("Role-Based Permission Guard", () => {
  let adminData: any;
  let billingData: any;

  test.beforeAll(async () => {
    adminData = await fetchAuthData("michael.chen@example.com", TEST_PASSWORD);
    billingData = await fetchAuthData("billing.davis@sunrisefamilymedicine.com", TEST_PASSWORD);
    console.log(`[setup] Admin groups: ${JSON.stringify(adminData.groups)}`);
    console.log(`[setup] Billing groups: ${JSON.stringify(billingData.groups)}`);
  });

  test("1. Admin can access roles-permissions", async ({ page }) => {
    test.setTimeout(60000);

    // Capture console messages
    const consoleLogs: string[] = [];
    page.on("console", msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));

    await injectAuth(page, adminData);

    // Navigate directly to the restricted page
    await page.goto(`${BASE_URL}/settings/roles-permissions`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(5000); // Wait for React contexts to load

    await shot(page, "01-admin-roles-permissions");

    const url = page.url();
    const bodyText = await page.locator("body").textContent().catch(() => "");
    const accessDeniedVisible = await page.locator('h2:has-text("Access Denied")').isVisible().catch(() => false);

    console.log(`[result] Admin URL: ${url}`);
    console.log(`[result] Access Denied visible: ${accessDeniedVisible}`);
    console.log(`[result] Page has 'Roles & Permissions': ${bodyText?.includes("Roles & Permissions")}`);
    console.log(`[result] Page has 'Access Denied': ${bodyText?.includes("Access Denied")}`);

    // Log relevant console messages
    const permLogs = consoleLogs.filter(l => l.toLowerCase().includes("permission") || l.toLowerCase().includes("menu") || l.toLowerCase().includes("guard"));
    if (permLogs.length > 0) {
      console.log("[console logs]", permLogs.join("\n"));
    }
  });

  test("2. Billing user on roles-permissions - diagnose PermissionGuard", async ({ page }) => {
    test.setTimeout(60000);

    const consoleLogs: string[] = [];
    page.on("console", msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));

    await injectAuth(page, billingData);

    // Navigate and wait for contexts to fully load
    await page.goto(`${BASE_URL}/settings/roles-permissions`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(6000); // Wait for permission/menu contexts to fetch from API

    await shot(page, "02-billing-roles-permissions-initial");

    // Inspect what the React contexts have loaded
    const contextState = await page.evaluate(() => {
      // Try to read from window or React fiber
      const token = localStorage.getItem("token");
      const groups = localStorage.getItem("groups");
      return {
        hasToken: !!token,
        tokenLength: token?.length || 0,
        groups: groups,
        selectedTenant: localStorage.getItem("selectedTenant"),
      };
    });
    console.log(`[context] localStorage state:`, JSON.stringify(contextState));

    const url = page.url();
    const bodyText = await page.locator("body").textContent().catch(() => "");
    const accessDeniedVisible = await page.locator('h2:has-text("Access Denied")').isVisible().catch(() => false);
    const shieldXVisible = await page.locator('[data-lucide="shield-x"], svg').first().isVisible().catch(() => false);

    console.log(`[result] Billing user URL: ${url}`);
    console.log(`[result] Access Denied element visible: ${accessDeniedVisible}`);
    console.log(`[result] Page has "Access Denied" text: ${bodyText?.includes("Access Denied")}`);
    console.log(`[result] Page has "don't have permission": ${bodyText?.includes("don't have permission")}`);
    console.log(`[result] Page has "Roles & Permissions" header: ${bodyText?.includes("Roles & Permissions")}`);

    // Log all console messages for debugging
    consoleLogs.slice(0, 30).forEach(l => console.log(l));

    await shot(page, "02-billing-roles-permissions-final");
  });

  test("3. Billing user on user-management - diagnose PermissionGuard", async ({ page }) => {
    test.setTimeout(60000);

    await injectAuth(page, billingData);

    await page.goto(`${BASE_URL}/settings/user-management`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(6000);
    await shot(page, "03-billing-user-management");

    const bodyText = await page.locator("body").textContent().catch(() => "");
    const accessDeniedVisible = await page.locator('h2:has-text("Access Denied")').isVisible().catch(() => false);

    console.log(`[result] URL: ${page.url()}`);
    console.log(`[result] Access Denied element visible: ${accessDeniedVisible}`);
    console.log(`[result] Page has "Access Denied": ${bodyText?.includes("Access Denied")}`);
    console.log(`[result] Page has "User Management": ${bodyText?.includes("User Management")}`);
  });

  test("4. Billing user on /settings - should be blocked (requiredPermission=admin)", async ({ page }) => {
    test.setTimeout(60000);

    await injectAuth(page, billingData);

    await page.goto(`${BASE_URL}/settings`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(6000);
    await shot(page, "04-billing-settings-main");

    const bodyText = await page.locator("body").textContent().catch(() => "");
    const accessDeniedVisible = await page.locator('h2:has-text("Access Denied")').isVisible().catch(() => false);

    console.log(`[result] URL: ${page.url()}`);
    console.log(`[result] Access Denied element visible: ${accessDeniedVisible}`);
    console.log(`[result] Page has "Access Denied": ${bodyText?.includes("Access Denied")}`);
  });

  test("5. Admin on settings - should have full access", async ({ page }) => {
    test.setTimeout(60000);

    await injectAuth(page, adminData);

    await page.goto(`${BASE_URL}/settings`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(5000);
    await shot(page, "05-admin-settings");

    const bodyText = await page.locator("body").textContent().catch(() => "");
    const accessDeniedVisible = await page.locator('h2:has-text("Access Denied")').isVisible().catch(() => false);

    console.log(`[result] Admin on /settings: URL=${page.url()}`);
    console.log(`[result] Access Denied visible: ${accessDeniedVisible}`);
  });

  test("6. Billing login via actual form then navigate to admin page", async ({ page }) => {
    test.setTimeout(120000);

    // Use the real login flow (since API is at api-dev.ciyex.org, accessible from browser)
    await page.goto(`${BASE_URL}/signin`, { waitUntil: "networkidle" });
    await shot(page, "06-signin-page");

    // Enter email
    await page.fill('input[id="email"]', "billing.davis@sunrisefamilymedicine.com");
    await page.click('button:has-text("Continue")');
    await page.waitForTimeout(3000);
    await shot(page, "06-after-email-step");

    const passwordVisible = await page.locator('input[id="password"]').isVisible().catch(() => false);
    console.log(`[login] Password field visible after email: ${passwordVisible}`);

    if (passwordVisible) {
      await page.fill('input[id="password"]', TEST_PASSWORD);
      await shot(page, "06-password-filled");
      await page.click('button:has-text("Sign in")');
      await page.waitForTimeout(5000);
      await shot(page, "06-after-signin");
      console.log(`[login] URL after signin: ${page.url()}`);

      // Now navigate to restricted page
      if (page.url().includes("/calendar") || page.url().includes("/signin") === false) {
        await page.goto(`${BASE_URL}/settings/roles-permissions`, { waitUntil: "networkidle", timeout: 30000 });
        await page.waitForTimeout(5000);
        await shot(page, "06-billing-after-login-roles-permissions");

        const bodyText = await page.locator("body").textContent().catch(() => "");
        const accessDeniedVisible = await page.locator('h2:has-text("Access Denied")').isVisible().catch(() => false);
        console.log(`[result] After real login - Access Denied visible: ${accessDeniedVisible}`);
        console.log(`[result] After real login - URL: ${page.url()}`);
      }
    }
  });

  test("7. FINAL: Side-by-side comparison screenshots", async ({ page }) => {
    test.setTimeout(120000);

    // Admin on roles-permissions - should see the page
    await injectAuth(page, adminData);
    await page.goto(`${BASE_URL}/settings/roles-permissions`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(5000);
    await shot(page, "07-FINAL-admin-roles-permissions");

    const adminBody = await page.locator("body").textContent().catch(() => "");
    const adminDenied = await page.locator('h2:has-text("Access Denied")').isVisible().catch(() => false);
    console.log(`[FINAL] Admin on roles-permissions - Access Denied: ${adminDenied}, has page content: ${adminBody?.includes("Roles") || false}`);

    // Billing on roles-permissions - should see Access Denied
    await injectAuth(page, billingData);
    await page.goto(`${BASE_URL}/settings/roles-permissions`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(5000);
    await shot(page, "07-FINAL-billing-roles-permissions");

    const billingBody = await page.locator("body").textContent().catch(() => "");
    const billingDenied = await page.locator('h2:has-text("Access Denied")').isVisible().catch(() => false);
    console.log(`[FINAL] Billing on roles-permissions - Access Denied: ${billingDenied}, has page content: ${billingBody?.includes("Roles") || false}`);

    // Billing on /settings/user-management
    await page.goto(`${BASE_URL}/settings/user-management`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(5000);
    await shot(page, "07-FINAL-billing-user-management");

    const billingUMBody = await page.locator("body").textContent().catch(() => "");
    const billingUMDenied = await page.locator('h2:has-text("Access Denied")').isVisible().catch(() => false);
    console.log(`[FINAL] Billing on user-management - Access Denied: ${billingUMDenied}`);

    console.log("\n========== PERMISSION GUARD SUMMARY ==========");
    console.log(`Admin can access /settings/roles-permissions: ${!adminDenied}`);
    console.log(`Billing gets Access Denied on /settings/roles-permissions: ${billingDenied}`);
    console.log(`Billing gets Access Denied on /settings/user-management: ${billingUMDenied}`);
    console.log(`Guard working correctly: ${!adminDenied && billingDenied && billingUMDenied}`);
    console.log("================================================");
  });
});
