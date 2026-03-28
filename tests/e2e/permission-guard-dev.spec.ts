/**
 * Tests against the LIVE dev environment (app-dev.ciyex.org)
 * where CORS is not an issue — the app's NEXT_PUBLIC_API_URL matches the deployed backend.
 */
import { test, expect, Page } from "@playwright/test";
import path from "path";

const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'Test@123';
const BASE_URL = "https://app-dev.ciyex.org";
const API_URL = "https://api-dev.ciyex.org";

const SCREENSHOTS_DIR = path.join(process.cwd(), "test-results", "screenshots");

async function shot(page: Page, name: string) {
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, `dev-${name}.png`),
    fullPage: true,
  });
  console.log(`[screenshot] dev-${name}.png`);
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

async function injectAuthAndNavigate(page: Page, data: any, targetPath: string) {
  const fullName = `${data.firstName || ""} ${data.lastName || ""}`.trim() || data.username || "";

  // First go to the base URL to set localStorage for the right origin
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(500);

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
    window.dispatchEvent(new CustomEvent("auth-token-set", { detail: { key: "token" } }));
  }, { ...data, fullName });

  // Navigate to target
  await page.goto(`${BASE_URL}${targetPath}`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(6000); // Wait for React contexts to load from API

  const url = page.url();
  const bodyText = await page.locator("body").textContent().catch(() => "");
  const accessDeniedVisible = await page.locator('h2:has-text("Access Denied")').isVisible().catch(() => false);

  return { url, bodyText, accessDeniedVisible };
}

test.describe("Permission Guard on Dev Environment (app-dev.ciyex.org)", () => {
  let adminData: any;
  let billingData: any;

  test.beforeAll(async () => {
    adminData = await fetchAuthData("michael.chen@example.com", TEST_PASSWORD);
    billingData = await fetchAuthData("billing.davis@sunrisefamilymedicine.com", TEST_PASSWORD);
    console.log(`[setup] Admin groups: ${JSON.stringify(adminData.groups)}`);
    console.log(`[setup] Billing groups: ${JSON.stringify(billingData.groups)}`);
  });

  test("DEV: Admin can access roles-permissions", async ({ page }) => {
    test.setTimeout(90000);

    const { url, bodyText, accessDeniedVisible } = await injectAuthAndNavigate(
      page, adminData, "/settings/roles-permissions"
    );
    await shot(page, "admin-roles-permissions");

    console.log(`[result] URL: ${url}`);
    console.log(`[result] Access Denied visible: ${accessDeniedVisible}`);
    console.log(`[result] Has "Roles & Permissions": ${bodyText?.includes("Roles & Permissions")}`);
    console.log(`[result] Has "Access Denied": ${bodyText?.includes("Access Denied")}`);
  });

  test("DEV: Billing user blocked from roles-permissions", async ({ page }) => {
    test.setTimeout(90000);

    const { url, bodyText, accessDeniedVisible } = await injectAuthAndNavigate(
      page, billingData, "/settings/roles-permissions"
    );
    await shot(page, "billing-roles-permissions");

    console.log(`[result] URL: ${url}`);
    console.log(`[result] Access Denied visible: ${accessDeniedVisible}`);
    console.log(`[result] Has "Roles & Permissions": ${bodyText?.includes("Roles & Permissions")}`);
    console.log(`[result] Has "Access Denied": ${bodyText?.includes("Access Denied")}`);
    console.log(`[result] Has "don't have permission": ${bodyText?.includes("don't have permission")}`);
    console.log(`[CHECK] PermissionGuard works on dev: ${accessDeniedVisible}`);
  });

  test("DEV: Billing user blocked from user-management", async ({ page }) => {
    test.setTimeout(90000);

    const { url, bodyText, accessDeniedVisible } = await injectAuthAndNavigate(
      page, billingData, "/settings/user-management"
    );
    await shot(page, "billing-user-management");

    console.log(`[result] URL: ${url}`);
    console.log(`[result] Access Denied visible: ${accessDeniedVisible}`);
    console.log(`[CHECK] Billing blocked from user-management: ${accessDeniedVisible}`);
  });

  test("DEV: Billing user blocked from /settings", async ({ page }) => {
    test.setTimeout(90000);

    const { url, bodyText, accessDeniedVisible } = await injectAuthAndNavigate(
      page, billingData, "/settings"
    );
    await shot(page, "billing-settings");

    console.log(`[result] URL: ${url}`);
    console.log(`[result] Access Denied visible: ${accessDeniedVisible}`);
    console.log(`[CHECK] Billing blocked from /settings: ${accessDeniedVisible}`);
  });

  test("DEV: FINAL SUMMARY - all guard checks", async ({ page }) => {
    test.setTimeout(120000);

    // Admin on roles-permissions
    const adminResult = await injectAuthAndNavigate(page, adminData, "/settings/roles-permissions");
    await shot(page, "FINAL-admin-roles-permissions");
    console.log(`[FINAL] Admin → /settings/roles-permissions: AccessDenied=${adminResult.accessDeniedVisible}, URL=${adminResult.url}`);

    // Billing on roles-permissions
    const billingRPResult = await injectAuthAndNavigate(page, billingData, "/settings/roles-permissions");
    await shot(page, "FINAL-billing-roles-permissions");
    console.log(`[FINAL] Billing → /settings/roles-permissions: AccessDenied=${billingRPResult.accessDeniedVisible}, URL=${billingRPResult.url}`);

    // Billing on user-management
    const billingUMResult = await injectAuthAndNavigate(page, billingData, "/settings/user-management");
    await shot(page, "FINAL-billing-user-management");
    console.log(`[FINAL] Billing → /settings/user-management: AccessDenied=${billingUMResult.accessDeniedVisible}, URL=${billingUMResult.url}`);

    // Billing on /calendar (should be accessible - has scheduling permission via category check)
    const billingCalResult = await injectAuthAndNavigate(page, billingData, "/payments");
    await shot(page, "FINAL-billing-payments");
    console.log(`[FINAL] Billing → /payments: AccessDenied=${billingCalResult.accessDeniedVisible}, URL=${billingCalResult.url}`);

    console.log("\n============ PERMISSION GUARD RESULTS (DEV) ============");
    console.log(`Admin can access /settings/roles-permissions:        ${!adminResult.accessDeniedVisible}`);
    console.log(`Billing BLOCKED from /settings/roles-permissions:    ${billingRPResult.accessDeniedVisible}`);
    console.log(`Billing BLOCKED from /settings/user-management:      ${billingUMResult.accessDeniedVisible}`);
    console.log(`Billing can access /payments (permitted):            ${!billingCalResult.accessDeniedVisible}`);
    const allGood = !adminResult.accessDeniedVisible && billingRPResult.accessDeniedVisible && billingUMResult.accessDeniedVisible && !billingCalResult.accessDeniedVisible;
    console.log(`Guard working correctly: ${allGood}`);
    console.log("=========================================================");
  });
});
