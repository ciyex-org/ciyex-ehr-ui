/**
 * Deep diagnostic of the PermissionGuard race condition on dev.
 */
import { test, Page } from "@playwright/test";
import path from "path";

const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'Test@123';
const BASE_URL = "https://app-dev.ciyex.org";
const API_URL = "https://api-dev.ciyex.org";
const SCREENSHOTS_DIR = path.join(process.cwd(), "test-results", "screenshots");

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `debug-${name}.png`), fullPage: true });
  console.log(`[ss] debug-${name}.png`);
}

async function fetchAuthData(email: string, password: string) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const j = await res.json() as any;
  if (!j.success) throw new Error(`Login failed for ${email}: ${j.error}`);
  return j.data;
}

test("Diagnose PermissionGuard - measure when contexts load vs when page renders", async ({ page }) => {
  test.setTimeout(120000);

  const billingData = await fetchAuthData("billing.davis@sunrisefamilymedicine.com", TEST_PASSWORD);

  // Capture timing of console messages
  const events: Array<{time: number, msg: string}> = [];
  const start = Date.now();
  page.on("console", msg => {
    events.push({ time: Date.now() - start, msg: `[${msg.type()}] ${msg.text().substring(0, 200)}` });
  });

  // Go to base URL, inject auth
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(500);

  const fullName = `${billingData.firstName || ""} ${billingData.lastName || ""}`.trim();
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
    localStorage.setItem("selectedTenant", "sunrise-family-medicine");
    if (d.groups && d.groups.length > 0) localStorage.setItem("primaryGroup", d.groups[0]);
  }, { ...billingData, fullName });

  // Navigate to restricted page and take screenshots at intervals
  await page.goto(`${BASE_URL}/settings/roles-permissions`, { waitUntil: "domcontentloaded", timeout: 30000 });

  // Take screenshots at multiple points to see if Access Denied ever appears
  await shot(page, "t0-domcontentloaded");
  await page.waitForTimeout(1000);
  await shot(page, "t1-1sec");
  await page.waitForTimeout(2000);
  await shot(page, "t2-3sec");
  await page.waitForTimeout(3000);
  await shot(page, "t3-6sec");
  await page.waitForTimeout(4000);
  await shot(page, "t4-10sec");

  const finalBody = await page.locator("body").textContent().catch(() => "");
  const finalDenied = await page.locator('h2:has-text("Access Denied")').isVisible().catch(() => false);

  console.log(`[final] Access Denied: ${finalDenied}`);
  console.log(`[final] Has "Roles & Permissions": ${finalBody?.includes("Roles & Permissions")}`);

  // Log all console events
  console.log("\n--- Console events timeline ---");
  events.forEach(e => console.log(`  +${e.time}ms: ${e.msg}`));
  console.log("--- End timeline ---");

  // Also check: does navigating to /calendar first (where the context loads) then to roles-permissions help?
  console.log("\n--- Testing via /calendar first then navigating ---");
  await page.goto(`${BASE_URL}/calendar`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(5000); // Let contexts fully load on calendar
  await shot(page, "calendar-for-billing-context-loaded");

  // Now navigate to restricted page via client-side navigation
  await page.evaluate(() => {
    window.history.pushState({}, '', '/settings/roles-permissions');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await page.waitForTimeout(3000);
  await shot(page, "after-client-nav-to-roles-permissions");

  const body2 = await page.locator("body").textContent().catch(() => "");
  const denied2 = await page.locator('h2:has-text("Access Denied")').isVisible().catch(() => false);
  console.log(`[after-client-nav] Access Denied: ${denied2}`);
  console.log(`[after-client-nav] Has "Roles & Permissions": ${body2?.includes("Roles & Permissions")}`);

  // Try Next.js router navigation
  await page.goto(`${BASE_URL}/calendar`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(5000);
  await shot(page, "calendar-loaded-again");

  // Click the settings link in sidebar if visible
  const settingsLink = page.locator('[href="/settings/roles-permissions"], [data-href="/settings/roles-permissions"]').first();
  const settingsLinkVisible = await settingsLink.isVisible().catch(() => false);
  console.log(`[sidebar] Settings/roles-permissions link visible: ${settingsLinkVisible}`);

  // Navigate using Next router via evaluate
  await page.evaluate(() => {
    // Try to find Next.js router
    const anchorEl = document.querySelector('a[href="/settings"]');
    if (anchorEl) {
      console.log('Found settings link, clicking...');
      (anchorEl as HTMLElement).click();
    }
  });
  await page.waitForTimeout(2000);
  await shot(page, "after-settings-link-click");
  console.log(`[after-settings-click] URL: ${page.url()}`);
  console.log(`[after-settings-click] Access Denied: ${await page.locator('h2:has-text("Access Denied")').isVisible().catch(() => false)}`);
});

test("Test with real login form - billing user", async ({ page }) => {
  test.setTimeout(120000);

  const events: Array<{time: number, msg: string}> = [];
  const start = Date.now();
  page.on("console", msg => {
    events.push({ time: Date.now() - start, msg: `[${msg.type()}] ${msg.text().substring(0, 150)}` });
  });

  // Real login via form
  await page.goto(`${BASE_URL}/signin`, { waitUntil: "networkidle" });
  await page.fill('input[id="email"]', "billing.davis@sunrisefamilymedicine.com");
  await page.click('button:has-text("Continue")');
  await page.waitForTimeout(3000);
  await shot(page, "real-login-email-step");

  const passwordVisible = await page.locator('input[id="password"]').isVisible().catch(() => false);
  if (passwordVisible) {
    await page.fill('input[id="password"]', TEST_PASSWORD);
    await page.click('button:has-text("Sign in")');
    // Wait for redirect to calendar
    await page.waitForURL(`${BASE_URL}/calendar`, { timeout: 30000 }).catch(() => {
      console.log("[login] Did not reach calendar, URL:", page.url());
    });
    await page.waitForTimeout(3000);
    await shot(page, "real-login-after-signin");
    console.log(`[login] After signin URL: ${page.url()}`);

    // Now navigate to roles-permissions
    await page.goto(`${BASE_URL}/settings/roles-permissions`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(5000);
    await shot(page, "real-login-billing-roles-permissions");

    const body = await page.locator("body").textContent().catch(() => "");
    const denied = await page.locator('h2:has-text("Access Denied")').isVisible().catch(() => false);
    console.log(`[REAL LOGIN RESULT] Billing → roles-permissions → Access Denied: ${denied}`);
    console.log(`[REAL LOGIN RESULT] Has "Roles & Permissions": ${body?.includes("Roles & Permissions")}`);
  } else {
    console.log("[login] Password step did not appear");
    await shot(page, "real-login-no-password-step");
  }

  console.log("\n--- Console events ---");
  events.slice(0, 40).forEach(e => console.log(`  +${e.time}ms: ${e.msg}`));
});
