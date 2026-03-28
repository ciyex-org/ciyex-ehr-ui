import { test, expect, Page } from "@playwright/test";

const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'Test@123';
const APP_URL = "https://app-dev.ciyex.org";
const API_URL = "https://api-dev.ciyex.org";

async function loginViaUI(page: Page) {
  await page.goto(APP_URL, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(2000);

  // Check if we're on the Keycloak login page
  const emailInput = page.locator('input[name="username"], input[name="email"], input[type="email"], #username');
  const passwordInput = page.locator('input[name="password"], input[type="password"], #password');

  if (await emailInput.count() > 0) {
    await emailInput.first().fill("kiran@example.com");
    await passwordInput.first().fill(TEST_PASSWORD);
    // Submit login
    const submitBtn = page.locator('input[type="submit"], button[type="submit"], #kc-login');
    await submitBtn.first().click();
    await page.waitForTimeout(5000);
  } else {
    // Might already be logged in or on callback page
    console.log("No login form found, checking if already authenticated...");
  }

  await page.waitForTimeout(3000);
  await page.screenshot({ path: "test-results/after-login.png", fullPage: true });
}

test.describe("3 Issues Verification", () => {
  test.setTimeout(90000);

  test("Test all 3 issues after login", async ({ page }) => {
    await loginViaUI(page);

    // Check current URL
    const url = page.url();
    console.log("Current URL after login:", url);

    // Wait for token to be set
    const hasToken = await page.evaluate(() => {
      return !!(localStorage.getItem("token") || localStorage.getItem("authToken"));
    });
    console.log("Has auth token:", hasToken);

    if (!hasToken) {
      // Try waiting more for redirect
      await page.waitForTimeout(5000);
      await page.screenshot({ path: "test-results/login-wait.png", fullPage: true });
      const hasToken2 = await page.evaluate(() => {
        return !!(localStorage.getItem("token") || localStorage.getItem("authToken"));
      });
      console.log("Has auth token (after wait):", hasToken2);
    }

    // ===== ISSUE 1 & 2: Test Facilities & Services =====
    console.log("\n=== Testing Settings/Facilities ===");
    await page.goto(`${APP_URL}/settings`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: "test-results/issue1-settings-page.png", fullPage: true });

    // Check for facilities button
    const facilitiesBtn = page.locator("button:has-text('Facilities')");
    const facilitiesCount = await facilitiesBtn.count();
    console.log("Facilities button found:", facilitiesCount > 0);

    if (facilitiesCount > 0) {
      await facilitiesBtn.click();
      await page.waitForTimeout(4000);
      await page.screenshot({ path: "test-results/issue1-facilities.png", fullPage: true });

      const bodyText = await page.textContent("body") || "";
      const hasAccessDenied = bodyText.includes("Access Denied") || bodyText.includes("do not have permission");
      console.log("ISSUE 1 - Facilities has access error:", hasAccessDenied);
      if (!hasAccessDenied) {
        console.log("ISSUE 1 FIXED: Facilities accessible");
      } else {
        console.log("ISSUE 1 STILL PRESENT");
      }
    }

    // Check for services button
    const servicesBtn = page.locator("button:has-text('Services')");
    const servicesCount = await servicesBtn.count();
    console.log("\nServices button found:", servicesCount > 0);

    if (servicesCount > 0) {
      await servicesBtn.click();
      await page.waitForTimeout(4000);
      await page.screenshot({ path: "test-results/issue2-services.png", fullPage: true });

      const bodyText = await page.textContent("body") || "";
      const hasAccessDenied = bodyText.includes("Access Denied") || bodyText.includes("do not have permission");
      console.log("ISSUE 2 - Services has access error:", hasAccessDenied);
      if (!hasAccessDenied) {
        console.log("ISSUE 2 FIXED: Services accessible");
      } else {
        console.log("ISSUE 2 STILL PRESENT");
      }
    }

    // ===== API test through browser context =====
    console.log("\n=== Testing API endpoints through browser ===");
    const token = await page.evaluate(() => localStorage.getItem("token") || localStorage.getItem("authToken") || "");
    if (token) {
      // Test facilities API
      const facilitiesResult = await page.evaluate(async (tok) => {
        const apiUrl = "https://api-dev.ciyex.org";
        try {
          const res = await fetch(`${apiUrl}/api/fhir-resource/facilities?page=0&size=20`, {
            headers: {
              "Authorization": `Bearer ${tok}`,
              "X-Tenant-Name": localStorage.getItem("tenantName") || localStorage.getItem("selectedTenant") || "",
            },
          });
          const text = await res.text();
          return { status: res.status, body: text.substring(0, 300) };
        } catch (e: any) {
          return { status: -1, body: e.message };
        }
      }, token);
      console.log("Facilities API status:", facilitiesResult.status);
      console.log("Facilities API response:", facilitiesResult.body);

      // Test services API
      const servicesResult = await page.evaluate(async (tok) => {
        const apiUrl = "https://api-dev.ciyex.org";
        try {
          const res = await fetch(`${apiUrl}/api/fhir-resource/services?page=0&size=20`, {
            headers: {
              "Authorization": `Bearer ${tok}`,
              "X-Tenant-Name": localStorage.getItem("tenantName") || localStorage.getItem("selectedTenant") || "",
            },
          });
          const text = await res.text();
          return { status: res.status, body: text.substring(0, 300) };
        } catch (e: any) {
          return { status: -1, body: e.message };
        }
      }, token);
      console.log("Services API status:", servicesResult.status);
      console.log("Services API response:", servicesResult.body);

      // Test providers API
      const providersResult = await page.evaluate(async (tok) => {
        const apiUrl = "https://api-dev.ciyex.org";
        try {
          const res = await fetch(`${apiUrl}/api/providers?status=ACTIVE&size=200`, {
            headers: {
              "Authorization": `Bearer ${tok}`,
              "X-Tenant-Name": localStorage.getItem("tenantName") || localStorage.getItem("selectedTenant") || "",
            },
          });
          const text = await res.text();
          return { status: res.status, body: text.substring(0, 500) };
        } catch (e: any) {
          return { status: -1, body: e.message };
        }
      }, token);
      console.log("Providers API status:", providersResult.status);
      console.log("Providers API response:", providersResult.body);

      // Test channels API
      const channelsResult = await page.evaluate(async (tok) => {
        const apiUrl = "https://api-dev.ciyex.org";
        try {
          const res = await fetch(`${apiUrl}/api/channels`, {
            headers: {
              "Authorization": `Bearer ${tok}`,
              "X-Tenant-Name": localStorage.getItem("tenantName") || localStorage.getItem("selectedTenant") || "",
            },
          });
          const text = await res.text();
          return { status: res.status, body: text.substring(0, 300) };
        } catch (e: any) {
          return { status: -1, body: e.message };
        }
      }, token);
      console.log("Channels API status:", channelsResult.status);
      console.log("Channels API response:", channelsResult.body);
    }

    // ===== ISSUE 3: Test Messaging =====
    console.log("\n=== Testing Messaging ===");
    await page.goto(`${APP_URL}/messaging`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: "test-results/issue3-messaging.png", fullPage: true });

    const newMsgBtn = page.locator('button[title="New message"]');
    console.log("New message button found:", await newMsgBtn.count() > 0);

    if (await newMsgBtn.count() > 0) {
      await newMsgBtn.click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: "test-results/issue3-user-picker.png", fullPage: true });

      const searchInput = page.locator('input[placeholder="Search people..."]');
      console.log("Search people input visible:", await searchInput.count() > 0);

      // Count users in picker
      const userPickerArea = page.locator('.absolute.inset-0.z-50 .overflow-y-auto');
      if (await userPickerArea.count() > 0) {
        const userButtons = userPickerArea.locator('button');
        const userCount = await userButtons.count();
        console.log("Users in picker:", userCount);

        if (userCount > 0) {
          console.log("ISSUE 3: Users available - clicking first user");
          await userButtons.first().click();
          await page.waitForTimeout(3000);
          await page.screenshot({ path: "test-results/issue3-dm-opened.png", fullPage: true });

          // Check if compose bar appeared
          const composeInput = page.locator('textarea, input[placeholder*="message"], [contenteditable="true"]');
          console.log("Compose input visible:", await composeInput.count() > 0);

          if (await composeInput.count() > 0) {
            await composeInput.first().fill("Test message from automated test");
            await page.screenshot({ path: "test-results/issue3-message-typed.png", fullPage: true });
            console.log("ISSUE 3 FIXED: Can type message");
          }
        } else {
          const noUsersText = await userPickerArea.textContent();
          console.log("User picker text:", noUsersText);
          console.log("ISSUE 3: No users available (check if providers exist in org)");
        }
      }
    } else {
      const bodyText = await page.textContent("body") || "";
      console.log("Messaging page text:", bodyText.substring(0, 200));
    }
  });
});
