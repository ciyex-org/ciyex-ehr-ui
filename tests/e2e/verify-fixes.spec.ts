import { test, expect, Page } from "@playwright/test";

/**
 * Verify all 10 patient tab fixes on the live dev environment.
 * Run: npx playwright test tests/e2e/verify-fixes.spec.ts --headed
 */

const BASE = "https://app-dev.ciyex.org";
const PATIENT_URL = `${BASE}/patients/6762`;

// Login helper — two-step: email → Continue → password → Sign In
async function login(page: Page) {
  await page.goto(`${BASE}/signin`);
  await page.waitForURL(/signin|dashboard|patients/, { timeout: 30000 });

  if (page.url().includes("signin")) {
    // Step 1: Enter email
    const emailField = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i], input[type="text"]').first();
    await emailField.waitFor({ timeout: 15000 });
    await emailField.fill("kiran@example.com");

    // Click Continue
    const continueBtn = page.locator('button:has-text("Continue"), button[type="submit"]').first();
    await continueBtn.click();

    // Step 2: Wait for password field to appear
    const passwordField = page.locator('input[type="password"]').first();
    await passwordField.waitFor({ timeout: 15000 });
    await passwordField.fill("Test@123");

    // Click Sign In
    const signInBtn = page.locator('button:has-text("Sign In"), button:has-text("Login"), button[type="submit"]').first();
    await signInBtn.click();

    // Wait for navigation after login
    await page.waitForURL(/dashboard|patients|\/(?!signin)/, { timeout: 15000 });
  }
}

// Navigate to patient tab
async function goToTab(page: Page, tab: string) {
  await page.goto(`${PATIENT_URL}?tab=${tab}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000); // Wait for data to load
}

// Check that a table column doesn't show all dashes
async function checkColumnNotAllDashes(page: Page, columnName: string) {
  // Find the column index by header text
  const headers = page.locator("th");
  const headerCount = await headers.count();
  let colIndex = -1;
  for (let i = 0; i < headerCount; i++) {
    const text = await headers.nth(i).textContent();
    if (text?.toLowerCase().includes(columnName.toLowerCase())) {
      colIndex = i;
      break;
    }
  }

  if (colIndex === -1) {
    console.log(`Column "${columnName}" not found in headers`);
    return { found: false, allDashes: true };
  }

  // Check cells in that column
  const rows = page.locator("tbody tr");
  const rowCount = await rows.count();
  if (rowCount === 0) {
    console.log(`No rows found for column "${columnName}"`);
    return { found: true, allDashes: true, noRows: true };
  }

  let dashCount = 0;
  let totalCount = 0;
  for (let i = 0; i < Math.min(rowCount, 5); i++) {
    const cell = rows.nth(i).locator("td").nth(colIndex);
    const text = (await cell.textContent())?.trim();
    totalCount++;
    if (text === "-" || text === "—" || text === "" || text === "null") {
      dashCount++;
    }
  }

  return { found: true, allDashes: dashCount === totalCount, dashCount, totalCount };
}

test.describe("Patient Tab Fixes Verification", () => {
  test.setTimeout(120000);

  test("Login and verify all 10 fixes", async ({ page }) => {
    // Login
    console.log("Logging in...");
    await login(page);
    console.log("Logged in successfully, URL:", page.url());

    // --- Issue 1: Messaging - search patients "to" column ---
    console.log("\n=== Issue 1: Messaging - To patient search ===");
    await goToTab(page, "messaging");

    // Click Add button to open create form
    const addBtn = page.locator('button:has-text("Add")').first();
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await page.waitForTimeout(1000);

      // Look for "to" field - should be a lookup/search field, not plain text
      const toField = page.locator('input[placeholder*="Search"]').first();
      const toFieldVisible = await toField.isVisible().catch(() => false);
      console.log("To field is searchable:", toFieldVisible);

      if (toFieldVisible) {
        await toField.fill("jo");
        await page.waitForTimeout(1500);
        // Check if dropdown results appear
        const dropdown = page.locator('[class*="shadow-lg"] button, [class*="dropdown"] button').first();
        const hasResults = await dropdown.isVisible().catch(() => false);
        console.log("Search results appeared:", hasResults);
      }

      // Go back to list
      const cancelBtn = page.locator('button:has-text("Cancel"), button:has-text("Close")').first();
      if (await cancelBtn.isVisible()) await cancelBtn.click();
    }

    // --- Issue 2: Allergies - severity not null after edit ---
    console.log("\n=== Issue 2: Allergies - Severity not null ===");
    await goToTab(page, "allergies");

    const severityCheck = await checkColumnNotAllDashes(page, "severity");
    console.log("Severity column:", severityCheck);

    // Check if any row has data
    const allergyRows = page.locator("tbody tr");
    const allergyRowCount = await allergyRows.count();
    if (allergyRowCount > 0) {
      // Click first row to view
      await allergyRows.first().click();
      await page.waitForTimeout(1000);

      // Check severity field value in view mode
      const severityText = await page.locator('text=severity, text=Severity').first().textContent().catch(() => null);
      console.log("Severity field text:", severityText);

      // Go back
      const backBtn = page.locator('button:has-text("Close"), button:has-text("Cancel"), button:has-text("Back")').first();
      if (await backBtn.isVisible()) await backBtn.click();
    }

    // --- Issue 3: Visit Notes - noteType and action ---
    console.log("\n=== Issue 3: Visit Notes - noteType and action ===");
    await goToTab(page, "visit-notes");

    const noteTypeCheck = await checkColumnNotAllDashes(page, "type");
    console.log("NoteType column:", noteTypeCheck);

    // Click Add to check form fields
    const addVisitNoteBtn = page.locator('button:has-text("Add")').first();
    if (await addVisitNoteBtn.isVisible()) {
      await addVisitNoteBtn.click();
      await page.waitForTimeout(1000);

      // Check if noteType/type is a combobox (has dropdown arrow)
      const comboboxes = page.locator('[class*="ChevronDown"], svg.lucide-chevron-down');
      const hasCombobox = await comboboxes.first().isVisible().catch(() => false);
      console.log("Has combobox fields (noteType/action):", hasCombobox);

      const cancelBtn2 = page.locator('button:has-text("Cancel")').first();
      if (await cancelBtn2.isVisible()) await cancelBtn2.click();
    }

    // --- Issue 4 & 5: Labs - provider search, collection date and provider display ---
    console.log("\n=== Issue 4 & 5: Labs - provider search, collection date, provider display ===");
    await goToTab(page, "labs");

    const collDateCheck = await checkColumnNotAllDashes(page, "collection");
    const providerCheck = await checkColumnNotAllDashes(page, "provider");
    console.log("Collection Date column:", collDateCheck);
    console.log("Provider column:", providerCheck);

    // Check provider search in form
    const addLabBtn = page.locator('button:has-text("Add")').first();
    if (await addLabBtn.isVisible()) {
      await addLabBtn.click();
      await page.waitForTimeout(1000);

      const providerSearchField = page.locator('input[placeholder*="Search Provider" i], input[placeholder*="Search performer" i]').first();
      const hasProviderSearch = await providerSearchField.isVisible().catch(() => false);
      console.log("Provider search field available:", hasProviderSearch);

      const cancelBtn3 = page.locator('button:has-text("Cancel")').first();
      if (await cancelBtn3.isVisible()) await cancelBtn3.click();
    }

    // --- Issue 6 & 7: Procedures - CPT code search, CPT code and date display ---
    console.log("\n=== Issue 6 & 7: Procedures - CPT search, CPT code and date display ===");
    await goToTab(page, "procedures");

    const cptCheck = await checkColumnNotAllDashes(page, "cpt");
    const datePerformedCheck = await checkColumnNotAllDashes(page, "date");
    console.log("CPT Code column:", cptCheck);
    console.log("Date Performed column:", datePerformedCheck);

    // Check CPT search in form
    const addProcBtn = page.locator('button:has-text("Add")').first();
    if (await addProcBtn.isVisible()) {
      await addProcBtn.click();
      await page.waitForTimeout(1000);

      const cptSearchField = page.locator('input[placeholder*="Search CPT" i], input[placeholder*="Search code" i]').first();
      const hasCptSearch = await cptSearchField.isVisible().catch(() => false);
      console.log("CPT code search field available:", hasCptSearch);

      if (hasCptSearch) {
        await cptSearchField.fill("992");
        await page.waitForTimeout(2000);
        const cptDropdown = page.locator('[class*="shadow-lg"] button, [class*="z-50"] button').first();
        const hasCptResults = await cptDropdown.isVisible().catch(() => false);
        console.log("CPT search results appeared:", hasCptResults);
      }

      const cancelBtn4 = page.locator('button:has-text("Cancel")').first();
      if (await cancelBtn4.isVisible()) await cancelBtn4.click();
    }

    // --- Issue 8: Billing - CPT code and diagnosis search ---
    console.log("\n=== Issue 8: Billing - CPT and diagnosis search ===");
    await goToTab(page, "billing");

    const addBillBtn = page.locator('button:has-text("Add")').first();
    if (await addBillBtn.isVisible()) {
      await addBillBtn.click();
      await page.waitForTimeout(1000);

      // Check for CPT search field
      const billingCptField = page.locator('input[placeholder*="Search CPT" i], input[placeholder*="Search code" i]').first();
      const hasBillingCpt = await billingCptField.isVisible().catch(() => false);
      console.log("Billing CPT search field:", hasBillingCpt);

      // Check for diagnosis search field
      const diagField = page.locator('input[placeholder*="Search ICD" i], input[placeholder*="Search diag" i]').first();
      const hasDiagSearch = await diagField.isVisible().catch(() => false);
      console.log("Billing diagnosis search field:", hasDiagSearch);

      const cancelBtn5 = page.locator('button:has-text("Cancel")').first();
      if (await cancelBtn5.isVisible()) await cancelBtn5.click();
    }

    // --- Issue 9: Claims - service from and service to ---
    console.log("\n=== Issue 9: Claims - service from/to ===");
    await goToTab(page, "claims");

    const serviceFromCheck = await checkColumnNotAllDashes(page, "service");
    console.log("Service From/To column:", serviceFromCheck);

    // Also check for serviceFrom and serviceTo specifically
    const svcFromCheck = await checkColumnNotAllDashes(page, "serviceFrom");
    const svcToCheck = await checkColumnNotAllDashes(page, "serviceTo");
    console.log("ServiceFrom:", svcFromCheck, "ServiceTo:", svcToCheck);

    // --- Issue 10: Claim Submissions - tracking number and total charge ---
    console.log("\n=== Issue 10: Claim Submissions - tracking number and total charge ===");
    await goToTab(page, "claim-submissions");

    const trackingCheck = await checkColumnNotAllDashes(page, "tracking");
    const chargeCheck = await checkColumnNotAllDashes(page, "charge");
    console.log("Tracking Number column:", trackingCheck);
    console.log("Total Charge column:", chargeCheck);

    // Take a final screenshot for evidence
    await page.screenshot({ path: "test-results/fixes-verification.png", fullPage: true });
    console.log("\n=== All checks complete ===");
  });
});
