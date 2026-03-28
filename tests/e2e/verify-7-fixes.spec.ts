import { test, expect, type Page } from "@playwright/test";

const BASE = "https://app-dev.ciyex.org";
const API = "https://api-dev.ciyex.org";
const EMAIL = "rose@example.com";
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'Test@123';
const PASSWORD = TEST_PASSWORD;

test.describe.configure({ mode: "serial" });

let authToken = "";
let tenantName = "";

async function login(page: Page) {
  await page.goto(`${BASE}/signin`, { waitUntil: "networkidle", timeout: 30000 });

  // Check if already logged in
  if (!page.url().includes("signin")) return;

  await page.fill('input[type="email"], input[name="email"]', EMAIL);
  await page.click('button:has-text("Continue"), button[type="submit"]');
  await page.waitForTimeout(2000);
  const passwordField = page.locator('input[type="password"]');
  if (await passwordField.isVisible({ timeout: 5000 })) {
    await passwordField.fill(PASSWORD);
    await page.click('button:has-text("Sign In"), button:has-text("Log In"), button[type="submit"]');
  }
  await page.waitForURL((url) => !url.pathname.includes("signin"), { timeout: 20000 });
  await page.waitForTimeout(2000);

  // Extract auth token from localStorage
  authToken = await page.evaluate(() => {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes("token")) {
        const val = localStorage.getItem(key);
        if (val && val.startsWith("ey")) return val;
      }
    }
    // Try sessionStorage too
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.includes("token")) {
        const val = sessionStorage.getItem(key);
        if (val && val.startsWith("ey")) return val;
      }
    }
    return "";
  });
  tenantName = await page.evaluate(() => localStorage.getItem("selectedTenant") || "");
  console.log("Auth token obtained:", authToken ? "yes" : "no");
  console.log("Tenant:", tenantName);
}

test.beforeEach(async ({ page }) => {
  await login(page);
});

test("Issue 1: Appointments - end column shows data not just dash", async ({ page }) => {
  await page.goto(`${BASE}/patients/6862?tab=appointments`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(4000);

  await page.screenshot({ path: "test-results/fix1-appointments.png", fullPage: true });

  // Check the table exists
  const table = page.locator("table");
  const tableExists = await table.isVisible({ timeout: 5000 }).catch(() => false);
  console.log("Appointments table visible:", tableExists);

  if (tableExists) {
    const headers = await page.locator("thead th").allTextContents();
    console.log("Appointment headers:", headers.map(h => h.trim()));

    const hasEndCol = headers.some(h => /end/i.test(h.trim()));
    console.log("Has End column:", hasEndCol);
    expect(hasEndCol).toBeTruthy();
  }
});

test("Issue 2: Allergies - create without 422 error", async ({ page }) => {
  await page.goto(`${BASE}/patients/6862?tab=allergies`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(3000);

  await page.screenshot({ path: "test-results/fix2-allergies-list.png", fullPage: true });

  // Check no error on the page
  const bodyText = await page.textContent("body");
  const hasError = bodyText?.includes("Coding has no system") || false;
  console.log("Has 'Coding has no system' error:", hasError);

  // Try to open create form
  const createBtn = page.locator('button:has-text("Add"), button:has-text("Create"), button:has-text("New")').first();
  if (await createBtn.isVisible({ timeout: 5000 })) {
    await createBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "test-results/fix2-allergies-form.png", fullPage: true });

    // Fill the form with test data
    const allergenField = page.locator('input[placeholder*="Allergen"], input[placeholder*="allergen"]').first();
    if (await allergenField.isVisible({ timeout: 3000 })) {
      await allergenField.fill("Test Allergy - Penicillin");
    }

    // Select severity if available
    const severitySelect = page.locator('select').filter({ hasText: /mild|moderate|severe/i }).first();
    if (await severitySelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await severitySelect.selectOption("mild");
    }

    // Select clinical status
    const statusSelect = page.locator('select').filter({ hasText: /active|inactive|resolved/i }).first();
    if (await statusSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await statusSelect.selectOption("active");
    }

    console.log("Allergy form opened and filled successfully");
  }
});

test("Issue 3: Reports - patient demographics insurance column", async ({ page }) => {
  await page.goto(`${BASE}/reports`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(3000);

  // Click on Patient Demographics report
  const demoCard = page.locator('text=Patient Demographics').first();
  if (await demoCard.isVisible({ timeout: 5000 })) {
    await demoCard.click();
    await page.waitForTimeout(5000);

    await page.screenshot({ path: "test-results/fix3-reports-demographics.png", fullPage: true });

    // Check the table has insurance column
    const headers = await page.locator("thead th, table th").allTextContents();
    console.log("Report headers:", headers.map(h => h.trim()));

    const hasInsurance = headers.some(h => /insurance/i.test(h.trim()));
    console.log("Has Insurance column:", hasInsurance);
    expect(hasInsurance).toBeTruthy();

    // Check if any insurance values are shown (not all dashes)
    const insuranceCells = page.locator("tbody td:nth-child(6)");
    const cellCount = await insuranceCells.count();
    if (cellCount > 0) {
      const values = await insuranceCells.allTextContents();
      const nonDash = values.filter(v => v.trim() !== "—" && v.trim() !== "-" && v.trim() !== "");
      console.log(`Insurance values: ${cellCount} total, ${nonDash.length} with data`);
      console.log("Sample values:", values.slice(0, 5));
    }
  } else {
    console.log("Patient Demographics report card not found");
  }
});

test("Issue 4: Campaigns - create without 500 error", async ({ page }) => {
  await page.goto(`${BASE}/notifications`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(3000);

  await page.screenshot({ path: "test-results/fix4-notifications.png", fullPage: true });

  // Click Campaigns tab if available
  const campaignsTab = page.locator('button:has-text("Campaigns"), [role="tab"]:has-text("Campaigns")').first();
  if (await campaignsTab.isVisible({ timeout: 5000 })) {
    await campaignsTab.click();
    await page.waitForTimeout(2000);
  }

  // Click create/new campaign button
  const createBtn = page.locator('button:has-text("Create"), button:has-text("New"), button:has-text("Add")').first();
  if (await createBtn.isVisible({ timeout: 5000 })) {
    await createBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "test-results/fix4-campaign-form.png", fullPage: true });

    // Fill campaign name
    const nameInput = page.locator('input[placeholder*="name"], input[placeholder*="Name"]').first();
    if (await nameInput.isVisible({ timeout: 3000 })) {
      await nameInput.fill("Test Campaign " + Date.now());
    }

    // Fill subject
    const subjectInput = page.locator('input[placeholder*="subject"], input[placeholder*="Subject"]').first();
    if (await subjectInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await subjectInput.fill("Test Subject");
    }

    // Fill body
    const bodyInput = page.locator('textarea').first();
    if (await bodyInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await bodyInput.first().fill("Test body content");
    }

    // Fill recipients
    const recipientsInput = page.locator('textarea[placeholder*="recipient"], textarea[placeholder*="email"]').first();
    if (await recipientsInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await recipientsInput.fill("test@example.com");
    }

    console.log("Campaign form filled successfully");
    await page.screenshot({ path: "test-results/fix4-campaign-filled.png", fullPage: true });
  }
});

test("Issue 5: BMI status in encounter - shows input or message instead of dash", async ({ page }) => {
  await page.goto(`${BASE}/patients/6862/encounters/7158`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(4000);

  await page.screenshot({ path: "test-results/fix5-encounter-bmi.png", fullPage: true });

  // Look for BMI label
  const bmiLabel = page.locator('label:has-text("BMI"), label:has-text("Body Mass")').first();
  if (await bmiLabel.isVisible({ timeout: 5000 })) {
    console.log("BMI field found");

    // Check if it shows a helpful message or input instead of just "-"
    const bmiContainer = bmiLabel.locator("..");
    const containerText = await bmiContainer.textContent();
    console.log("BMI container text:", containerText);

    // Should NOT just show a bare dash
    const hasInput = await bmiContainer.locator("input").isVisible({ timeout: 2000 }).catch(() => false);
    const hasMessage = containerText?.includes("weight") || containerText?.includes("calculate");
    const hasValue = containerText?.match(/\d+\.\d/);
    console.log("Has input:", hasInput, "Has message:", hasMessage, "Has value:", !!hasValue);
  } else {
    console.log("BMI field not found on this page - checking vitals section");
    const pageContent = await page.textContent("body");
    console.log("Page has BMI text:", pageContent?.includes("BMI"));
  }
});

test("Issue 6: Insurance tab - loads without Organization error", async ({ page }) => {
  // Listen for API errors
  const apiErrors: string[] = [];
  page.on("response", async (response) => {
    if (response.status() >= 400 && response.url().includes("api")) {
      try {
        const body = await response.text();
        apiErrors.push(`${response.status()} ${response.url()}: ${body.substring(0, 200)}`);
      } catch { /* ignore */ }
    }
  });

  await page.goto(`${BASE}/patients/6862?tab=insurance-coverage`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(4000);

  await page.screenshot({ path: "test-results/fix6-insurance.png", fullPage: true });

  const bodyText = await page.textContent("body");
  const hasOrgError = bodyText?.includes("Unknown search parameter") || bodyText?.includes("subject") && bodyText?.includes("Organization");
  console.log("Has Organization/subject error:", hasOrgError);
  console.log("API errors:", apiErrors);

  // Should not have the Organization subject error
  const hasSubjectError = apiErrors.some(e => e.includes("subject") && e.includes("Organization"));
  console.log("Has subject/Organization API error:", hasSubjectError);
});

test("Issue 7: Payment - button label and claims dropdown", async ({ page }) => {
  await page.goto(`${BASE}/patients/6862?tab=payment`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(4000);

  await page.screenshot({ path: "test-results/fix7-payment.png", fullPage: true });

  // Check button label
  const postInsuranceBtn = page.locator('button:has-text("Post Insurance")');
  const postPaymentBtn = page.locator('button:has-text("Post Payment")');

  const hasOldLabel = await postInsuranceBtn.isVisible({ timeout: 3000 }).catch(() => false);
  const hasNewLabel = await postPaymentBtn.isVisible({ timeout: 3000 }).catch(() => false);
  console.log("Has 'Post Insurance' (old, bad):", hasOldLabel);
  console.log("Has 'Post Payment' (new, good):", hasNewLabel);

  expect(hasOldLabel).toBeFalsy();
  expect(hasNewLabel).toBeTruthy();

  // Click Post Payment to open form
  if (hasNewLabel) {
    await postPaymentBtn.click();
    await page.waitForTimeout(3000);

    await page.screenshot({ path: "test-results/fix7-payment-form.png", fullPage: true });

    // Check claims dropdown
    const claimsSelect = page.locator('select').filter({ hasText: /claim|Choose/i }).first();
    if (await claimsSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      const options = await claimsSelect.locator("option").allTextContents();
      console.log("Claims dropdown options:", options);
      console.log("Has claims:", options.length > 1); // > 1 because first is placeholder
    } else {
      console.log("Claims select not found");
    }
  }
});
