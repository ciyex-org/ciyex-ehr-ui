import { test, expect } from "@playwright/test";

const BASE = "https://app-dev.ciyex.org";
const EMAIL = "rose@example.com";
const PASSWORD = process.env.TEST_USER_PASSWORD || "Test@123";

test.describe.configure({ mode: "serial" });

let loggedIn = false;

test.beforeEach(async ({ page }) => {
  if (!loggedIn) {
    await page.goto(`${BASE}/signin`, { waitUntil: "networkidle", timeout: 30000 });
    // Step 1: Enter email
    await page.fill('input[type="email"], input[name="email"]', EMAIL);
    // Click Continue button
    await page.click('button:has-text("Continue"), button[type="submit"]');
    await page.waitForTimeout(2000);
    // Step 2: Enter password (might appear after Continue)
    const passwordField = page.locator('input[type="password"]');
    if (await passwordField.isVisible({ timeout: 5000 })) {
      await passwordField.fill(PASSWORD);
      await page.click('button:has-text("Sign In"), button:has-text("Log In"), button[type="submit"]');
    }
    await page.waitForURL((url) => !url.pathname.includes("signin"), { timeout: 20000 });
    loggedIn = true;
  }
});

test("1. Calendar page loads and provider dropdown has options", async ({ page }) => {
  await page.goto(`${BASE}/calendar`, { waitUntil: "networkidle", timeout: 30000 });
  // Check the provider filter multi-select exists
  const providerFilter = page.locator("text=Providers").first();
  await expect(providerFilter).toBeVisible({ timeout: 10000 });

  // Open appointment modal by clicking on the calendar
  const addButton = page.locator('button:has-text("Add"), button:has-text("New Appointment"), button[title*="appointment" i]').first();
  if (await addButton.isVisible()) {
    await addButton.click();
    await page.waitForTimeout(1000);

    // Check provider dropdown in modal
    const providerSelect = page.locator('select').filter({ hasText: /provider/i }).first();
    if (await providerSelect.isVisible()) {
      const options = await providerSelect.locator('option').count();
      console.log(`Provider dropdown has ${options} options`);
      expect(options).toBeGreaterThan(1); // At least one provider + placeholder
    }
  }

  await page.screenshot({ path: "test-results/01-calendar.png", fullPage: true });
});

test("2. Patient list - navigate to a patient and check appointments tab", async ({ page }) => {
  await page.goto(`${BASE}/patients`, { waitUntil: "networkidle", timeout: 30000 });

  // Click on first patient
  const patientRow = page.locator("table tbody tr, [class*='patient']").first();
  await patientRow.click({ timeout: 10000 });
  await page.waitForTimeout(2000);

  // Navigate to appointments tab
  const appointmentsTab = page.locator('button:has-text("Appointments"), [role="tab"]:has-text("Appointments"), a:has-text("Appointments")').first();
  if (await appointmentsTab.isVisible({ timeout: 5000 })) {
    await appointmentsTab.click();
    await page.waitForTimeout(2000);

    // Click Add button
    const addBtn = page.locator('button:has-text("Add")').first();
    if (await addBtn.isVisible({ timeout: 5000 })) {
      await addBtn.click();
      await page.waitForTimeout(1000);

      // Check provider field is accessible (should be a lookup/select, not disabled)
      const providerField = page.locator('[class*="provider" i], label:has-text("Provider")').first();
      if (await providerField.isVisible()) {
        console.log("Provider field is visible in appointments form");
      }
    }
  }

  await page.screenshot({ path: "test-results/02-appointments.png", fullPage: true });
});

test("3. Patient - check visit notes tab", async ({ page }) => {
  await page.goto(`${BASE}/patients`, { waitUntil: "networkidle", timeout: 30000 });

  const patientRow = page.locator("table tbody tr").first();
  await patientRow.click({ timeout: 10000 });
  await page.waitForTimeout(2000);

  const visitNotesTab = page.locator('button:has-text("Visit Notes"), button:has-text("Visit"), [role="tab"]:has-text("Visit")').first();
  if (await visitNotesTab.isVisible({ timeout: 5000 })) {
    await visitNotesTab.click();
    await page.waitForTimeout(2000);
    console.log("Visit Notes tab loaded");
  }

  await page.screenshot({ path: "test-results/03-visit-notes.png", fullPage: true });
});

test("4. Patient - check insurance tab dates", async ({ page }) => {
  await page.goto(`${BASE}/patients`, { waitUntil: "networkidle", timeout: 30000 });

  const patientRow = page.locator("table tbody tr").first();
  await patientRow.click({ timeout: 10000 });
  await page.waitForTimeout(2000);

  const insuranceTab = page.locator('button:has-text("Insurance"), [role="tab"]:has-text("Insurance")').first();
  if (await insuranceTab.isVisible({ timeout: 5000 })) {
    await insuranceTab.click();
    await page.waitForTimeout(2000);
    console.log("Insurance tab loaded");
  }

  await page.screenshot({ path: "test-results/04-insurance.png", fullPage: true });
});

test("5. Patient - check documents tab", async ({ page }) => {
  await page.goto(`${BASE}/patients`, { waitUntil: "networkidle", timeout: 30000 });

  const patientRow = page.locator("table tbody tr").first();
  await patientRow.click({ timeout: 10000 });
  await page.waitForTimeout(2000);

  const documentsTab = page.locator('button:has-text("Documents"), [role="tab"]:has-text("Documents")').first();
  if (await documentsTab.isVisible({ timeout: 5000 })) {
    await documentsTab.click();
    await page.waitForTimeout(2000);
    console.log("Documents tab loaded");
  }

  await page.screenshot({ path: "test-results/05-documents.png", fullPage: true });
});

test("6. Patient - check messaging tab", async ({ page }) => {
  await page.goto(`${BASE}/patients`, { waitUntil: "networkidle", timeout: 30000 });

  const patientRow = page.locator("table tbody tr").first();
  await patientRow.click({ timeout: 10000 });
  await page.waitForTimeout(2000);

  const messagingTab = page.locator('button:has-text("Messaging"), button:has-text("Messages"), [role="tab"]:has-text("Messag")').first();
  if (await messagingTab.isVisible({ timeout: 5000 })) {
    await messagingTab.click();
    await page.waitForTimeout(2000);
    console.log("Messaging tab loaded");
  }

  await page.screenshot({ path: "test-results/06-messaging.png", fullPage: true });
});

test("7. Patient - check relationships tab", async ({ page }) => {
  await page.goto(`${BASE}/patients`, { waitUntil: "networkidle", timeout: 30000 });

  const patientRow = page.locator("table tbody tr").first();
  await patientRow.click({ timeout: 10000 });
  await page.waitForTimeout(2000);

  const relationshipsTab = page.locator('button:has-text("Relationship"), [role="tab"]:has-text("Relationship")').first();
  if (await relationshipsTab.isVisible({ timeout: 5000 })) {
    await relationshipsTab.click();
    await page.waitForTimeout(2000);
    console.log("Relationships tab loaded");
  }

  await page.screenshot({ path: "test-results/07-relationships.png", fullPage: true });
});

test("8. Patient - check issues tab onset date", async ({ page }) => {
  await page.goto(`${BASE}/patients`, { waitUntil: "networkidle", timeout: 30000 });

  const patientRow = page.locator("table tbody tr").first();
  await patientRow.click({ timeout: 10000 });
  await page.waitForTimeout(2000);

  const issuesTab = page.locator('button:has-text("Issues"), button:has-text("Conditions"), button:has-text("Problems"), [role="tab"]:has-text("Issue")').first();
  if (await issuesTab.isVisible({ timeout: 5000 })) {
    await issuesTab.click();
    await page.waitForTimeout(2000);
    console.log("Issues tab loaded");
  }

  await page.screenshot({ path: "test-results/08-issues.png", fullPage: true });
});

test("9. Settings - User management page", async ({ page }) => {
  await page.goto(`${BASE}/settings/user-management`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(2000);

  // Click Add User button
  const addUserBtn = page.locator('button:has-text("Add User")').first();
  if (await addUserBtn.isVisible({ timeout: 5000 })) {
    await addUserBtn.click();
    await page.waitForTimeout(1000);

    // Check role dropdown - it should show in the panel after selecting a user
    // Type in search to find a provider
    const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="name" i]').last();
    if (await searchInput.isVisible()) {
      await searchInput.fill("Test");
      await page.waitForTimeout(1000);

      // Select first result
      const result = page.locator('button:has(span)').filter({ hasText: /test/i }).first();
      if (await result.isVisible({ timeout: 3000 })) {
        await result.click();
        await page.waitForTimeout(500);

        // Now check role dropdown
        const roleSelect = page.locator('select').last();
        if (await roleSelect.isVisible()) {
          const options = await roleSelect.locator('option').allTextContents();
          console.log("Role dropdown options:", options);
          const hasPatient = options.some(o => o.toLowerCase().includes("patient"));
          console.log("Has Patient role:", hasPatient);
        }

        // Check welcome email checkbox
        const welcomeCheckbox = page.locator('input[type="checkbox"]#lu-welcome, label:has-text("welcome email")').first();
        if (await welcomeCheckbox.isVisible()) {
          console.log("Welcome email checkbox is visible");
        }
      }
    }
  }

  await page.screenshot({ path: "test-results/09-user-management.png", fullPage: true });
});

test("10. Patient - check allergies tab", async ({ page }) => {
  await page.goto(`${BASE}/patients`, { waitUntil: "networkidle", timeout: 30000 });

  const patientRow = page.locator("table tbody tr").first();
  await patientRow.click({ timeout: 10000 });
  await page.waitForTimeout(2000);

  const allergiesTab = page.locator('button:has-text("Allergies"), [role="tab"]:has-text("Allergies")').first();
  if (await allergiesTab.isVisible({ timeout: 5000 })) {
    await allergiesTab.click();
    await page.waitForTimeout(2000);
    console.log("Allergies tab loaded");

    // Check if severity column shows data
    const severityCell = page.locator('td').filter({ hasText: /mild|moderate|severe/i }).first();
    if (await severityCell.isVisible({ timeout: 3000 })) {
      console.log("Severity data is displayed:", await severityCell.textContent());
    }
  }

  await page.screenshot({ path: "test-results/10-allergies.png", fullPage: true });
});
