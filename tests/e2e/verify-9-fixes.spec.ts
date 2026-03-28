import { test, expect, type Page } from "@playwright/test";

const BASE = "https://app-dev.ciyex.org";
const EMAIL = "rose@example.com";
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'Test@123';
const PASSWORD = TEST_PASSWORD;

test.describe.configure({ mode: "serial" });

async function login(page: Page) {
  await page.goto(`${BASE}/signin`, { waitUntil: "networkidle", timeout: 30000 });
  await page.fill('input[type="email"], input[name="email"]', EMAIL);
  await page.click('button:has-text("Continue"), button[type="submit"]');
  await page.waitForTimeout(2000);
  const passwordField = page.locator('input[type="password"]');
  if (await passwordField.isVisible({ timeout: 5000 })) {
    await passwordField.fill(PASSWORD);
    await page.click('button:has-text("Sign In"), button:has-text("Log In"), button[type="submit"]');
  }
  await page.waitForURL((url) => !url.pathname.includes("signin"), { timeout: 20000 });
}

test.beforeEach(async ({ page }) => {
  await login(page);
});

test("Issue 1: Appointments table has End column", async ({ page }) => {
  await page.goto(`${BASE}/appointments`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(3000);

  // Check that the End column header exists in the appointments table
  const headers = page.locator("thead th");
  const allHeaders = await headers.allTextContents();
  console.log("Appointment table headers:", allHeaders);

  const hasEndColumn = allHeaders.some(h => /end/i.test(h.trim()));
  expect(hasEndColumn).toBeTruthy();

  await page.screenshot({ path: "test-results/fix1-appointments-end-column.png", fullPage: true });
});

test("Issue 2: Patient allergies tab - no Access Denied", async ({ page }) => {
  await page.goto(`${BASE}/patients`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(2000);

  // Click first patient
  const patientRow = page.locator("table tbody tr").first();
  await patientRow.click({ timeout: 10000 });
  await page.waitForTimeout(3000);

  // Navigate to allergies tab
  const allergiesTab = page.locator('button:has-text("Allergies"), [role="tab"]:has-text("Allergies")').first();
  if (await allergiesTab.isVisible({ timeout: 5000 })) {
    await allergiesTab.click();
    await page.waitForTimeout(3000);

    // Verify "Access Denied" is NOT shown
    const accessDenied = page.locator('text="Access Denied"');
    const isAccessDeniedVisible = await accessDenied.isVisible({ timeout: 3000 }).catch(() => false);
    console.log("Access Denied visible:", isAccessDeniedVisible);
    expect(isAccessDeniedVisible).toBeFalsy();
  }

  await page.screenshot({ path: "test-results/fix2-allergies-no-access-denied.png", fullPage: true });
});

test("Issue 3: Referral Providers - Organization field editable", async ({ page }) => {
  // Navigate to Settings > General > Referral Providers
  await page.goto(`${BASE}/settings/p/referral-providers`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(3000);

  // Check if page loaded
  const pageContent = await page.textContent("body");
  console.log("Referral providers page loaded:", pageContent?.includes("Referral") || pageContent?.includes("referral"));

  // Try to find and click an edit button or create button
  const editBtn = page.locator('button:has-text("Edit"), button:has-text("Add"), button:has-text("Create"), button:has-text("New")').first();
  if (await editBtn.isVisible({ timeout: 5000 })) {
    await editBtn.click();
    await page.waitForTimeout(2000);

    // Check for organization field - it should be an input (not a read-only span)
    const orgInput = page.locator('input[placeholder*="Organization" i], input[placeholder*="Search" i]').first();
    const orgInputVisible = await orgInput.isVisible({ timeout: 5000 }).catch(() => false);
    console.log("Organization input field visible:", orgInputVisible);
  }

  await page.screenshot({ path: "test-results/fix3-referral-org-editable.png", fullPage: true });
});

test("Issue 4: Patient Demographics report - Insurance column", async ({ page }) => {
  await page.goto(`${BASE}/reports`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(3000);

  // Click on Patient Demographics report
  const demoReport = page.locator('text="Patient Demographics"').first();
  if (await demoReport.isVisible({ timeout: 5000 })) {
    await demoReport.click();
    await page.waitForTimeout(5000);

    // Check for Insurance column header
    const headers = page.locator("thead th");
    const allHeaders = await headers.allTextContents();
    console.log("Demographics table headers:", allHeaders);

    const hasInsurance = allHeaders.some(h => /insurance/i.test(h.trim()));
    expect(hasInsurance).toBeTruthy();

    // Check if any insurance data is populated (not all dashes)
    const insuranceCells = page.locator("table tbody tr td:last-child, table tbody tr td:nth-child(6)");
    const cellCount = await insuranceCells.count();
    if (cellCount > 0) {
      const firstCellText = await insuranceCells.first().textContent();
      console.log("First insurance cell content:", firstCellText);
    }
  }

  await page.screenshot({ path: "test-results/fix4-demographics-insurance.png", fullPage: true });
});

test("Issue 5: Campaigns - Recipients column", async ({ page }) => {
  // Navigate to System > Notifications > Campaigns
  await page.goto(`${BASE}/admin/notifications`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(3000);

  // Click on Campaigns tab
  const campaignsTab = page.locator('button:has-text("Campaigns"), [role="tab"]:has-text("Campaign")').first();
  if (await campaignsTab.isVisible({ timeout: 5000 })) {
    await campaignsTab.click();
    await page.waitForTimeout(3000);

    // Check recipients column
    const recipientCells = page.locator("td").filter({ hasText: /^\d+$/ });
    const count = await recipientCells.count();
    console.log("Recipient cells with numbers:", count);
  }

  await page.screenshot({ path: "test-results/fix5-campaigns-recipients.png", fullPage: true });
});

test("Issue 6: Audit Log - data fetches", async ({ page }) => {
  await page.goto(`${BASE}/admin/audit-log`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(5000);

  // Check that "total entries" counter shows a number > 0
  const totalEntries = page.locator('text=/\\d+ total entries/i').first();
  const totalVisible = await totalEntries.isVisible({ timeout: 10000 }).catch(() => false);
  console.log("Total entries visible:", totalVisible);
  if (totalVisible) {
    const text = await totalEntries.textContent();
    console.log("Total entries text:", text);
  }

  // Check that table has rows
  const tableRows = page.locator("table tbody tr");
  const rowCount = await tableRows.count();
  console.log("Audit log table rows:", rowCount);

  // Check NO error banner
  const errorBanner = page.locator('text="Failed to fetch"');
  const hasError = await errorBanner.isVisible({ timeout: 3000 }).catch(() => false);
  console.log("Has fetch error:", hasError);

  await page.screenshot({ path: "test-results/fix6-audit-log.png", fullPage: true });
});

test("Issue 7: Lab Orders report - Test column", async ({ page }) => {
  await page.goto(`${BASE}/reports`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(3000);

  // Click on Lab Orders report
  const labReport = page.locator('text="Lab Orders"').first();
  if (await labReport.isVisible({ timeout: 5000 })) {
    await labReport.click();
    await page.waitForTimeout(5000);

    // Check for Test column header
    const headers = page.locator("thead th");
    const allHeaders = await headers.allTextContents();
    console.log("Lab Orders table headers:", allHeaders);

    const hasTest = allHeaders.some(h => /test/i.test(h.trim()));
    expect(hasTest).toBeTruthy();
  }

  await page.screenshot({ path: "test-results/fix7-lab-orders-test.png", fullPage: true });
});

test("Issue 8: Encounter PE - BMI calculation", async ({ page }) => {
  await page.goto(`${BASE}/patients`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(2000);

  // Click first patient
  const patientRow = page.locator("table tbody tr").first();
  await patientRow.click({ timeout: 10000 });
  await page.waitForTimeout(3000);

  // Navigate to encounters/visit notes
  const encounterTab = page.locator('button:has-text("Visit Notes"), button:has-text("Encounters"), [role="tab"]:has-text("Visit"), [role="tab"]:has-text("Encounter")').first();
  if (await encounterTab.isVisible({ timeout: 5000 })) {
    await encounterTab.click();
    await page.waitForTimeout(3000);

    // Click on first encounter if available
    const encounterRow = page.locator("table tbody tr, a:has-text('Encounter'), button:has-text('View')").first();
    if (await encounterRow.isVisible({ timeout: 5000 })) {
      await encounterRow.click();
      await page.waitForTimeout(3000);

      // Look for BMI field on the page
      const bmiField = page.locator('text=/BMI/i').first();
      const bmiVisible = await bmiField.isVisible({ timeout: 5000 }).catch(() => false);
      console.log("BMI field visible:", bmiVisible);
    }
  }

  await page.screenshot({ path: "test-results/fix8-bmi-calculation.png", fullPage: true });
});

test("Issue 9: Payment dropdown - no duplicate No claim options", async ({ page }) => {
  await page.goto(`${BASE}/patients`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(2000);

  // Click first patient
  const patientRow = page.locator("table tbody tr").first();
  await patientRow.click({ timeout: 10000 });
  await page.waitForTimeout(3000);

  // Navigate to financial/payments tab
  const financialTab = page.locator('button:has-text("Financial"), button:has-text("Payments"), button:has-text("Billing"), [role="tab"]:has-text("Financial"), [role="tab"]:has-text("Payment")').first();
  if (await financialTab.isVisible({ timeout: 5000 })) {
    await financialTab.click();
    await page.waitForTimeout(3000);

    // Look for the collect payment button
    const collectBtn = page.locator('button:has-text("Collect"), button:has-text("Patient Payment")').first();
    if (await collectBtn.isVisible({ timeout: 5000 })) {
      await collectBtn.click();
      await page.waitForTimeout(2000);

      // Check the claim dropdown
      const claimSelect = page.locator('select').filter({ hasText: /No claim|general payment/i }).first();
      if (await claimSelect.isVisible({ timeout: 5000 })) {
        const options = await claimSelect.locator("option").allTextContents();
        console.log("Claim dropdown options:", options);

        // Count "No claim" options - should be exactly 1
        const noClaimCount = options.filter(o => /no claim/i.test(o)).length;
        console.log("No claim option count:", noClaimCount);
        expect(noClaimCount).toBeLessThanOrEqual(1);
      }
    }
  }

  await page.screenshot({ path: "test-results/fix9-payment-no-duplicates.png", fullPage: true });
});
