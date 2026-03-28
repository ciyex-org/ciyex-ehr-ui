import { chromium } from "playwright";

const BASE = "https://app-dev.ciyex.org";
const EMAIL = "rose@example.com";
const PASSWORD = process.env.TEST_USER_PASSWORD || "Test@123";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  // Intercept console messages for debugging
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warn") {
      console.log(`  [${msg.type()}] ${msg.text()}`);
    }
  });

  // Track network errors
  page.on("response", (response) => {
    if (response.status() >= 400 && response.status() !== 403) {
      console.log(`  [NET ${response.status()}] ${response.url().substring(0, 100)}`);
    }
  });

  console.log("=== Step 1: Login ===");
  try {
    await page.goto(`${BASE}/signin`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);

    // Check if Cloudflare challenge
    const bodyText = await page.textContent("body");
    if (bodyText?.includes("Cloudflare") || bodyText?.includes("security verification")) {
      console.log("❌ Cloudflare challenge detected - cannot proceed with headless browser");
      console.log("   The site requires manual Cloudflare verification.");
      console.log("   Please test the fixes manually in Chrome browser.");
      await page.screenshot({ path: "test-results/cloudflare-block.png" });
      await browser.close();
      process.exit(1);
    }

    // Step 1: email
    await page.fill('input[type="email"], input[name="email"]', EMAIL);
    const continueBtn = page.locator('button:has-text("Continue"), button[type="submit"]');
    await continueBtn.click();
    await page.waitForTimeout(2000);

    // Step 2: password
    const passwordField = page.locator('input[type="password"]');
    if (await passwordField.isVisible({ timeout: 5000 })) {
      await passwordField.fill(PASSWORD);
      const signInBtn = page.locator('button:has-text("Sign In"), button:has-text("Log In"), button[type="submit"]');
      await signInBtn.click();
    }
    await page.waitForURL((url) => !url.pathname.includes("signin"), { timeout: 20000 });
    console.log("✅ Logged in successfully");
  } catch (err: any) {
    console.log("❌ Login failed:", err.message?.substring(0, 200));
    await page.screenshot({ path: "test-results/login-failed.png" });
    await browser.close();
    process.exit(1);
  }

  // Helper to navigate and screenshot
  async function testPage(name: string, url: string, checks: (page: any) => Promise<void>) {
    console.log(`\n=== Testing: ${name} ===`);
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(3000);
      await checks(page);
      await page.screenshot({ path: `test-results/${name.replace(/[^a-z0-9]/gi, '-')}.png`, fullPage: true });
      console.log(`✅ ${name} - screenshot saved`);
    } catch (err: any) {
      console.log(`❌ ${name} failed:`, err.message?.substring(0, 200));
      await page.screenshot({ path: `test-results/${name.replace(/[^a-z0-9]/gi, '-')}-error.png`, fullPage: true });
    }
  }

  // Test 1: Calendar page
  await testPage("01-calendar", `${BASE}/calendar`, async (p) => {
    const providerText = await p.locator("body").textContent();
    if (providerText?.includes("Providers")) {
      console.log("  ✅ Provider filter visible on calendar");
    }
  });

  // Test 2: Navigate to patients list
  await testPage("02-patients-list", `${BASE}/patients`, async (p) => {
    const rows = await p.locator("table tbody tr").count();
    console.log(`  Found ${rows} patient rows`);
  });

  // Test 3-10: Navigate to a patient and check each tab
  // First find a patient ID
  await page.goto(`${BASE}/patients`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(3000);

  // Click first patient row
  const firstPatientRow = page.locator("table tbody tr").first();
  if (await firstPatientRow.isVisible({ timeout: 5000 })) {
    await firstPatientRow.click();
    await page.waitForTimeout(3000);
    const patientUrl = page.url();
    console.log(`\nNavigated to patient: ${patientUrl}`);

    // Helper to click a tab and check
    async function testTab(tabName: string, tabSelector: string, checks?: (p: any) => Promise<void>) {
      console.log(`\n=== Testing: ${tabName} Tab ===`);
      try {
        const tab = page.locator(tabSelector).first();
        if (await tab.isVisible({ timeout: 5000 })) {
          await tab.click();
          await page.waitForTimeout(2000);
          console.log(`  ✅ ${tabName} tab loaded`);

          if (checks) await checks(page);

          await page.screenshot({
            path: `test-results/tab-${tabName.replace(/[^a-z0-9]/gi, '-')}.png`,
            fullPage: true,
          });
        } else {
          console.log(`  ⚠️ ${tabName} tab not found with selector: ${tabSelector}`);
          // Try to find it by listing all tab-like elements
          const buttons = await page.locator('button, [role="tab"]').allTextContents();
          console.log(`  Available tabs/buttons: ${buttons.filter(b => b.trim()).join(", ")}`);
        }
      } catch (err: any) {
        console.log(`  ❌ ${tabName} failed:`, err.message?.substring(0, 150));
      }
    }

    // Test Appointments tab
    await testTab("Appointments", 'button:has-text("Appointments"), [role="tab"]:has-text("Appointments")', async (p) => {
      // Try clicking Add
      const addBtn = p.locator('button:has-text("Add")').first();
      if (await addBtn.isVisible({ timeout: 3000 })) {
        await addBtn.click();
        await p.waitForTimeout(1500);

        // Check for provider lookup field
        const body = await p.locator("body").textContent();
        if (body?.toLowerCase().includes("provider")) {
          console.log("  ✅ Provider field visible in appointment form");
        }
        if (body?.toLowerCase().includes("location")) {
          console.log("  ✅ Location field visible in appointment form");
        }

        // Cancel
        const cancelBtn = p.locator('button:has-text("Cancel")').first();
        if (await cancelBtn.isVisible()) await cancelBtn.click();
        await p.waitForTimeout(500);
      }
    });

    // Test Visit Notes tab
    await testTab("Visit-Notes", 'button:has-text("Visit Notes"), button:has-text("Visit"), [role="tab"]:has-text("Visit")');

    // Test Insurance tab
    await testTab("Insurance", 'button:has-text("Insurance"), [role="tab"]:has-text("Insurance")', async (p) => {
      const body = await p.locator("body").textContent();
      if (body?.includes("Self Pay") || body?.includes("records")) {
        console.log("  ✅ Insurance tab shows data or Self Pay");
      }
    });

    // Test Documents tab
    await testTab("Documents", 'button:has-text("Documents"), [role="tab"]:has-text("Document")');

    // Test Messaging tab
    await testTab("Messaging", 'button:has-text("Messaging"), button:has-text("Messages"), [role="tab"]:has-text("Messag")');

    // Test Relationships tab
    await testTab("Relationships", 'button:has-text("Relationship"), [role="tab"]:has-text("Relation")');

    // Test Issues tab
    await testTab("Issues", 'button:has-text("Issues"), button:has-text("Conditions"), button:has-text("Problems"), [role="tab"]:has-text("Issue"), [role="tab"]:has-text("Condition"), [role="tab"]:has-text("Problem")');

    // Test Allergies tab
    await testTab("Allergies", 'button:has-text("Allergies"), [role="tab"]:has-text("Allerg")', async (p) => {
      const body = await p.locator("body").textContent();
      const hasSeverity = /mild|moderate|severe/i.test(body || "");
      console.log(`  Severity data visible: ${hasSeverity}`);
    });
  }

  // Test Settings - User Management
  await testPage("09-user-management", `${BASE}/settings/user-management`, async (p) => {
    const addBtn = p.locator('button:has-text("Add User")').first();
    if (await addBtn.isVisible({ timeout: 5000 })) {
      await addBtn.click();
      await p.waitForTimeout(1000);

      // Search for a test user
      const searchInput = p.locator('input[placeholder*="search" i], input[placeholder*="name" i]').last();
      if (await searchInput.isVisible()) {
        await searchInput.fill("Rose");
        await p.waitForTimeout(1500);

        // Try to select first result
        const results = p.locator('button').filter({ hasText: /rose/i });
        const count = await results.count();
        console.log(`  Found ${count} search results for "Rose"`);

        if (count > 0) {
          const first = results.first();
          const isDisabled = await first.isDisabled();
          if (!isDisabled) {
            await first.click();
            await p.waitForTimeout(500);

            // Check role dropdown
            const selects = p.locator('select');
            const selectCount = await selects.count();
            for (let i = 0; i < selectCount; i++) {
              const options = await selects.nth(i).locator('option').allTextContents();
              if (options.some(o => o.includes("Patient"))) {
                console.log(`  ✅ Patient role found in dropdown: ${options.join(", ")}`);
                break;
              }
            }

            // Check welcome email checkbox
            const welcomeLabel = p.locator('label:has-text("welcome email")');
            if (await welcomeLabel.isVisible({ timeout: 2000 })) {
              console.log("  ✅ Welcome email checkbox visible");
            }
          } else {
            console.log("  ⚠️ First result disabled (may already have account)");
          }
        }
      }
    }
  });

  console.log("\n=== All tests complete ===");
  await browser.close();
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
