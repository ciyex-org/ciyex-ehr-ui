/**
 * Inspect runtime state of React contexts on the dev environment.
 */
import { test, Page } from "@playwright/test";
import path from "path";

const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'Test@123';
const BASE_URL = "https://app-dev.ciyex.org";
const API_URL = "https://api-dev.ciyex.org";
const SCREENSHOTS_DIR = path.join(process.cwd(), "test-results", "screenshots");

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `runtime-${name}.png`), fullPage: true });
  console.log(`[ss] runtime-${name}.png`);
}

test("Inspect pagePermissionMap and permissions at runtime for billing user", async ({ page }) => {
  test.setTimeout(120000);

  // Get billing token
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "billing.davis@sunrisefamilymedicine.com", password: TEST_PASSWORD }),
  });
  const billingData = (await res.json() as any).data;

  // Listen to all console messages
  const logs: string[] = [];
  page.on("console", msg => logs.push(`[${msg.type()}] ${msg.text().substring(0, 300)}`));

  // Do real login to avoid any auth issues
  await page.goto(`${BASE_URL}/signin`, { waitUntil: "networkidle" });
  await page.fill('input[id="email"]', "billing.davis@sunrisefamilymedicine.com");
  await page.click('button:has-text("Continue")');
  await page.waitForTimeout(3000);

  const passwordVisible = await page.locator('input[id="password"]').isVisible().catch(() => false);
  if (passwordVisible) {
    await page.fill('input[id="password"]', TEST_PASSWORD);
    await page.click('button:has-text("Sign in")');
    try {
      await page.waitForURL(`${BASE_URL}/calendar`, { timeout: 30000 });
    } catch {
      console.log("[login] Did not reach calendar, URL:", page.url());
    }
    await page.waitForTimeout(4000);
    console.log("[login] Successfully logged in, URL:", page.url());
    await shot(page, "after-login-calendar");
  }

  // Now navigate to roles-permissions and inject debug code
  // First, use client-side navigation by clicking a link rather than hard navigation
  // to keep React context alive
  await page.evaluate(() => {
    // Add a debug hook to window
    (window as any).__debugPermissions = {};
  });

  // Navigate to settings/roles-permissions via Next.js router
  await page.goto(`${BASE_URL}/settings/roles-permissions`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(5000);
  await shot(page, "billing-roles-permissions");

  // Inspect what's in the PermissionGuard's pagePermissionMap at this point
  // We need to find it through the React fiber tree
  const debugInfo = await page.evaluate(() => {
    // Find React fiber root
    const rootEl = document.querySelector('[data-reactroot], #__next, main, [id="__next"]');

    // Try to get data from any globally accessible context or render output
    const bodyText = document.body.innerText;
    const hasAccessDenied = bodyText.includes("Access Denied");
    const hasRolesPermissions = bodyText.includes("Roles & Permissions");
    const hasNoPermission = bodyText.includes("don't have permission");

    return {
      hasAccessDenied,
      hasRolesPermissions,
      hasNoPermission,
      url: window.location.href,
      bodyTextSnippet: bodyText.substring(0, 500),
    };
  });

  console.log("[runtime debug]", JSON.stringify(debugInfo, null, 2));

  // Also check for the guard's loading state - try to find if it's returning null
  const pageHTML = await page.content();
  const hasShieldX = pageHTML.includes("shield-x") || pageHTML.includes("ShieldX");
  console.log("[runtime] Page HTML has shield-x: " + hasShieldX);
  console.log("[runtime] Page HTML length: " + pageHTML.length);

  // Check if Access Denied div exists at all (even hidden)
  const guardDivExists = await page.evaluate(() => {
    const h2s = Array.from(document.querySelectorAll('h2'));
    const accessDenied = h2s.find(h => h.textContent?.includes('Access Denied'));
    return !!accessDenied;
  });
  console.log("[runtime] Access Denied h2 exists in DOM: " + guardDivExists);

  // Log the actual page main content
  const mainContent = await page.locator('main, [role="main"], .main-content, #main').first().textContent().catch(() => "not found");
  console.log("[runtime] Main content snippet: " + (mainContent || "").substring(0, 200));

  // Log console output
  console.log("\n--- Relevant console logs ---");
  logs.filter(l =>
    l.includes("permission") ||
    l.includes("menu") ||
    l.includes("admin") ||
    l.includes("fetch") ||
    l.includes("403") ||
    l.includes("guard") ||
    l.includes("Guard")
  ).forEach(l => console.log("  " + l));
});

test("Check PermissionGuard component rendering via page source", async ({ page }) => {
  test.setTimeout(120000);

  const API_URL_LOCAL = "https://api-dev.ciyex.org";

  // Get billing token
  const res = await fetch(`${API_URL_LOCAL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "billing.davis@sunrisefamilymedicine.com", password: TEST_PASSWORD }),
  });
  const billingData = (await res.json() as any).data;
  console.log("[setup] Billing groups: " + JSON.stringify(billingData.groups));

  const networkLogs: Array<{url: string, status: number}> = [];
  page.on("response", resp => {
    if (resp.url().includes("/api/")) {
      networkLogs.push({ url: resp.url(), status: resp.status() });
    }
  });

  // Real login
  await page.goto(`${BASE_URL}/signin`, { waitUntil: "networkidle" });
  await page.fill('input[id="email"]', "billing.davis@sunrisefamilymedicine.com");
  await page.click('button:has-text("Continue")');
  await page.waitForTimeout(3000);

  const passwordVisible = await page.locator('input[id="password"]').isVisible().catch(() => false);
  if (passwordVisible) {
    await page.fill('input[id="password"]', TEST_PASSWORD);
    await page.click('button:has-text("Sign in")');
    try { await page.waitForURL(`${BASE_URL}/calendar`, { timeout: 30000 }); } catch {}
    await page.waitForTimeout(4000);
    console.log("[login] URL after login: " + page.url());
  }

  // Navigate and watch network
  await page.goto(`${BASE_URL}/settings/roles-permissions`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(6000);
  await shot(page, "billing-roles-perm-network-check");

  // Print all API calls made during this navigation
  console.log("\n--- Network API calls ---");
  networkLogs.forEach(n => console.log(`  ${n.status} ${n.url}`));

  // Look for the permission and menu API calls specifically
  const menuCall = networkLogs.find(n => n.url.includes("menus/ehr-sidebar") && !n.url.includes("has-custom"));
  const permCall = networkLogs.find(n => n.url.includes("user/permissions"));

  console.log("\n[critical] Menu API call: " + (menuCall ? `${menuCall.status} ${menuCall.url}` : "NOT FOUND"));
  console.log("[critical] Permissions API call: " + (permCall ? `${permCall.status} ${permCall.url}` : "NOT FOUND"));

  // Get the actual response from menu API to verify pagePermissionMap
  if (menuCall) {
    const menuRes = await page.evaluate(async (token: string) => {
      try {
        const r = await fetch("https://api-dev.ciyex.org/api/menus/ehr-sidebar", {
          headers: {
            "Authorization": "Bearer " + token,
            "Accept": "application/json",
          }
        });
        const data = await r.json();
        // Build pagePermissionMap like MenuContext does
        const map: Record<string, string | null> = {};
        function traverse(nodes: any[]) {
          for (const n of nodes) {
            if (n.item.screenSlug) {
              map[n.item.screenSlug] = n.item.requiredPermission;
            }
            if (n.children?.length) traverse(n.children);
          }
        }
        traverse(data.items || []);
        return { map, success: true };
      } catch (e: any) {
        return { error: e.message, success: false };
      }
    }, billingData.token);

    console.log("\n[pagePermissionMap]:", JSON.stringify(menuRes, null, 2));

    // Check the prefix match for /settings/roles-permissions
    if (menuRes.map) {
      const pathname = "/settings/roles-permissions";
      const exactMatch = menuRes.map[pathname];
      const prefixEntries = Object.entries(menuRes.map)
        .filter(([slug]) => pathname.startsWith(slug + "/"))
        .sort((a, b) => b[0].length - a[0].length);
      const prefixMatch = prefixEntries[0]?.[1];
      console.log(`\n[guard check] Exact match for '${pathname}':`, exactMatch);
      console.log(`[guard check] Prefix matches:`, prefixEntries);
      console.log(`[guard check] Required permission: ${exactMatch ?? prefixMatch ?? "undefined"}`);
    }
  }

  // Also check permissions API response
  const permResult = await page.evaluate(async (token: string) => {
    try {
      const r = await fetch("https://api-dev.ciyex.org/api/user/permissions", {
        headers: {
          "Authorization": "Bearer " + token,
          "Accept": "application/json",
        }
      });
      const data = await r.json();
      return { data, success: true };
    } catch (e: any) {
      return { error: (e as any).message, success: false };
    }
  }, billingData.token);

  console.log("\n[permissions]:", JSON.stringify(permResult, null, 2));

  // Check hasCategory("admin") manually
  if (permResult.data?.data?.permissions) {
    const permissions: string[] = permResult.data.data.permissions;
    const superAdmin: boolean = permResult.data.data.superAdmin;
    const hasAdminCategory = superAdmin || permissions.some((p: string) => p.startsWith("admin."));
    console.log(`\n[guard check] superAdmin: ${superAdmin}`);
    console.log(`[guard check] permissions: ${JSON.stringify(permissions)}`);
    console.log(`[guard check] hasCategory("admin"): ${hasAdminCategory}`);
    console.log(`[guard check] Guard SHOULD block: ${!hasAdminCategory}`);
  }

  const accessDeniedVisible = await page.locator('h2:has-text("Access Denied")').isVisible().catch(() => false);
  console.log(`\n[RESULT] Access Denied actually shown: ${accessDeniedVisible}`);
});
