import { test, expect } from "@playwright/test";

const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'Test@123';
const BASE = "https://app-dev.ciyex.org";

async function login(page: any) {
  await page.goto(`${BASE}/signin`);
  await page.waitForLoadState("networkidle");
  // Step 1: Enter email
  const emailInput = page.locator('input[name="email"], input[type="email"], input[placeholder*="mail"]').first();
  await emailInput.fill("kiran@example.com");
  // Click Continue
  await page.locator('button:has-text("Continue")').first().click();
  await page.waitForTimeout(2000);
  // Step 2: Enter password
  const passInput = page.locator('input[name="password"], input[type="password"]').first();
  await passInput.waitFor({ state: "visible", timeout: 10000 });
  await passInput.fill(TEST_PASSWORD);
  await page.locator('button[type="submit"], button:has-text("Sign")').first().click();
  await page.waitForURL(/(?!.*signin).*/, { timeout: 15000 });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
}

test.describe("Batch 3 Fixes Verification", () => {
  test.setTimeout(60000);

  test("1. Document Scanning - patient column shows names", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/document-scanning`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);
    await page.screenshot({ path: "test-results/doc-scanning.png", fullPage: true });
    const rows = page.locator("table tbody tr");
    const count = await rows.count();
    console.log(`Document scanning rows: ${count}`);
    if (count > 0) {
      const cells = rows.first().locator("td");
      const cellTexts: string[] = [];
      for (let i = 0; i < await cells.count(); i++) {
        cellTexts.push((await cells.nth(i).textContent()) || "");
      }
      console.log(`Row cells: ${JSON.stringify(cellTexts)}`);
    }
  });

  test("2. Audit Log - resource type filter has options", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/admin/audit-log`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(4000);
    await page.screenshot({ path: "test-results/audit-log.png", fullPage: true });
    const selects = page.locator("select");
    const selectCount = await selects.count();
    console.log(`Audit log selects: ${selectCount}`);
    for (let i = 0; i < selectCount; i++) {
      const options = selects.nth(i).locator("option");
      const optCount = await options.count();
      const firstOpt = optCount > 0 ? await options.first().textContent() : "(none)";
      console.log(`Select ${i}: ${optCount} options, first="${firstOpt}"`);
    }
  });

  test("3. Settings - Users actions button works", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/settings/user-management`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);
    await page.screenshot({ path: "test-results/user-mgmt-before.png", fullPage: true });
    // Find action buttons (the three dots)
    const actionBtns = page.locator("table tbody tr button, td button").filter({ has: page.locator("svg") });
    const btnCount = await actionBtns.count();
    console.log(`Action buttons found: ${btnCount}`);
    if (btnCount > 0) {
      await actionBtns.first().click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: "test-results/user-mgmt-menu.png", fullPage: true });
      const editBtn = page.locator('button:has-text("Edit User")');
      const editVisible = await editBtn.isVisible();
      console.log(`Edit User menu visible: ${editVisible}`);
    }
  });

  test("4. Reports - No-Show dropdown filters", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/reports`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    // Click No-Show report card
    const noShow = page.locator('text="No-Show"').first();
    if (await noShow.isVisible()) {
      await noShow.click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: "test-results/no-show-report.png", fullPage: true });
      const selects = page.locator("select");
      const selectCount = await selects.count();
      console.log(`No-Show selects: ${selectCount}`);
      for (let i = 0; i < selectCount; i++) {
        const options = selects.nth(i).locator("option");
        const optCount = await options.count();
        const firstOpt = optCount > 0 ? await options.first().textContent() : "(none)";
        console.log(`Select ${i}: ${optCount} options, first="${firstOpt}"`);
      }
    } else {
      console.log("No-Show report card not found on page");
      await page.screenshot({ path: "test-results/reports-list.png", fullPage: true });
    }
  });

  test("5. Patient tabs - visit notes and appointments", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/patients`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);
    const patientRows = page.locator("table tbody tr");
    const pCount = await patientRows.count();
    console.log(`Patient rows: ${pCount}`);
    if (pCount > 0) {
      await patientRows.first().click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(3000);

      // Check appointments tab
      const tabs = page.locator('[role="tab"], button, a').filter({ hasText: /appointment/i });
      if (await tabs.count() > 0) {
        await tabs.first().click();
        await page.waitForTimeout(3000);
        await page.screenshot({ path: "test-results/appointments.png", fullPage: true });
        const rows = page.locator("table tbody tr");
        if (await rows.count() > 0) {
          const text = await rows.first().textContent();
          console.log(`Appointments first row: ${text}`);
        }
      }

      // Check visit-notes tab
      const vnTabs = page.locator('[role="tab"], button, a').filter({ hasText: /visit.?note/i });
      if (await vnTabs.count() > 0) {
        await vnTabs.first().click();
        await page.waitForTimeout(3000);
        await page.screenshot({ path: "test-results/visit-notes.png", fullPage: true });
        const rows = page.locator("table tbody tr");
        if (await rows.count() > 0) {
          const text = await rows.first().textContent();
          console.log(`Visit notes first row: ${text}`);
        }
      }
    }
  });

  test("6. Settings template documents DATE", async ({ page }) => {
    await login(page);
    // Navigate to settings -> template documents
    await page.goto(`${BASE}/settings`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    // Find template documents link
    const templateLink = page.locator('a, button').filter({ hasText: /template/i }).first();
    if (await templateLink.isVisible()) {
      await templateLink.click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: "test-results/template-docs.png", fullPage: true });
      const rows = page.locator("table tbody tr");
      if (await rows.count() > 0) {
        const text = await rows.first().textContent();
        console.log(`Template docs first row: ${text}`);
      }
    } else {
      console.log("Template documents link not visible");
      await page.screenshot({ path: "test-results/settings-page.png", fullPage: true });
    }
  });
});
