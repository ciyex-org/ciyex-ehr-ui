import { chromium } from "playwright";

const BASE = "https://app-dev.ciyex.org";
const PATIENT_ID = "6924";

async function main() {
  console.log("Connecting to Chrome via CDP...");
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
  const contexts = browser.contexts();
  const context = contexts[0] || await browser.newContext();
  let page = context.pages()[0] || await context.newPage();

  const apiErrors: string[] = [];
  page.on("response", (resp) => {
    const url = resp.url();
    if (url.includes("/api/") && resp.status() >= 400) {
      apiErrors.push(`[${resp.status()}] ${url.substring(0, 150)}`);
    }
  });

  // =========================================
  // TEST 1: Calendar - Provider/Location Dropdowns
  // =========================================
  console.log("\n=== TEST 1: Calendar ===");
  await page.goto(`${BASE}/calendar`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(5000);
  const hasProviders = await page.locator('text=All Providers').first().isVisible({ timeout: 5000 }).catch(() => false);
  const hasLocations = await page.locator('text=All Locations').first().isVisible({ timeout: 3000 }).catch(() => false);
  console.log(`  Provider dropdown: ${hasProviders ? "✅" : "❌"}`);
  console.log(`  Location dropdown: ${hasLocations ? "✅" : "❌"}`);
  await page.screenshot({ path: "test-results/t01-calendar.png", fullPage: true });

  // =========================================
  // TEST 2: Appointments Tab
  // =========================================
  console.log("\n=== TEST 2: Appointments ===");
  await page.goto(`${BASE}/patients/${PATIENT_ID}?tab=appointments`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(4000);
  let body = await page.textContent("body") || "";
  console.log(`  Tab loaded: ${body.includes("Appointments") || body.includes("records") || body.includes("Add") ? "✅" : "❌"}`);

  // Click Add to check form fields
  const addBtn = page.locator('button:has-text("Add")').first();
  if (await addBtn.isVisible({ timeout: 3000 })) {
    await addBtn.click();
    await page.waitForTimeout(2000);
    body = await page.textContent("body") || "";
    console.log(`  Provider field: ${body.toLowerCase().includes("provider") ? "✅" : "❌"}`);
    console.log(`  Location field: ${body.toLowerCase().includes("location") ? "✅" : "❌"}`);
    await page.screenshot({ path: "test-results/t02-appointments-form.png", fullPage: true });
    const cancelBtn = page.locator('button:has-text("Cancel"), button:has-text("Close")').first();
    if (await cancelBtn.isVisible({ timeout: 1000 })) await cancelBtn.click();
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: "test-results/t02-appointments.png", fullPage: true });

  // =========================================
  // TEST 3: Visit Notes (try "visit-notes" and "encounters" tab keys)
  // =========================================
  console.log("\n=== TEST 3: Visit Notes ===");
  // Try multiple possible tab keys
  for (const tabKey of ["visit-notes", "visitnotes", "encounters"]) {
    await page.goto(`${BASE}/patients/${PATIENT_ID}?tab=${tabKey}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);
    body = await page.textContent("body") || "";
    if (body.includes("Visit") || body.includes("Note") || body.includes("Encounter") || body.includes("records")) {
      console.log(`  Tab loaded with key "${tabKey}": ✅`);
      break;
    }
  }
  await page.screenshot({ path: "test-results/t03-visit-notes.png", fullPage: true });

  // =========================================
  // TEST 4: Insurance
  // =========================================
  console.log("\n=== TEST 4: Insurance ===");
  for (const tabKey of ["insurance-coverage", "insurance", "insurancecoverage"]) {
    await page.goto(`${BASE}/patients/${PATIENT_ID}?tab=${tabKey}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);
    body = await page.textContent("body") || "";
    if (body.includes("Insurance") || body.includes("Coverage") || body.includes("Self Pay") || body.includes("records") || body.includes("Add")) {
      console.log(`  Tab loaded with key "${tabKey}": ✅`);
      const hasDate = /effective|start|end|date|Self Pay/i.test(body);
      console.log(`  Date/data fields: ${hasDate ? "✅" : "⚠️ no data (patient has none)"}`);
      break;
    }
  }
  await page.screenshot({ path: "test-results/t04-insurance.png", fullPage: true });

  // =========================================
  // TEST 5: Documents
  // =========================================
  console.log("\n=== TEST 5: Documents ===");
  await page.goto(`${BASE}/patients/${PATIENT_ID}?tab=documents`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(3000);
  body = await page.textContent("body") || "";
  console.log(`  Tab loaded: ${body.includes("Document") || body.includes("records") || body.includes("Add") ? "✅" : "❌"}`);
  await page.screenshot({ path: "test-results/t05-documents.png", fullPage: true });

  // =========================================
  // TEST 6: Messaging
  // =========================================
  console.log("\n=== TEST 6: Messaging ===");
  for (const tabKey of ["messaging", "messages"]) {
    await page.goto(`${BASE}/patients/${PATIENT_ID}?tab=${tabKey}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);
    body = await page.textContent("body") || "";
    if (body.includes("Message") || body.includes("records") || body.includes("Add")) {
      console.log(`  Tab loaded with key "${tabKey}": ✅`);
      break;
    }
  }
  await page.screenshot({ path: "test-results/t06-messaging.png", fullPage: true });

  // =========================================
  // TEST 7: Relationships
  // =========================================
  console.log("\n=== TEST 7: Relationships ===");
  for (const tabKey of ["relationships", "related-persons", "relatedpersons"]) {
    await page.goto(`${BASE}/patients/${PATIENT_ID}?tab=${tabKey}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);
    body = await page.textContent("body") || "";
    if (body.includes("Relationship") || body.includes("Related") || body.includes("records") || body.includes("Add")) {
      console.log(`  Tab loaded with key "${tabKey}": ✅`);
      break;
    }
  }
  await page.screenshot({ path: "test-results/t07-relationships.png", fullPage: true });

  // =========================================
  // TEST 8: Problems/Issues
  // =========================================
  console.log("\n=== TEST 8: Problems/Issues ===");
  for (const tabKey of ["medicalproblems", "problems", "issues", "conditions"]) {
    await page.goto(`${BASE}/patients/${PATIENT_ID}?tab=${tabKey}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);
    body = await page.textContent("body") || "";
    if (body.includes("Problem") || body.includes("Issue") || body.includes("Condition") || body.includes("records") || body.includes("Add")) {
      console.log(`  Tab loaded with key "${tabKey}": ✅`);

      // Try Add to check onset date field
      const addBtn2 = page.locator('button:has-text("Add")').first();
      if (await addBtn2.isVisible({ timeout: 3000 })) {
        await addBtn2.click();
        await page.waitForTimeout(2000);
        body = await page.textContent("body") || "";
        const hasOnset = /onset|date/i.test(body);
        console.log(`  Onset date field: ${hasOnset ? "✅" : "⚠️"}`);
        await page.screenshot({ path: "test-results/t08-problems-form.png", fullPage: true });
        const cancelBtn = page.locator('button:has-text("Cancel"), button:has-text("Close")').first();
        if (await cancelBtn.isVisible({ timeout: 1000 })) await cancelBtn.click();
        await page.waitForTimeout(500);
      }
      break;
    }
  }
  await page.screenshot({ path: "test-results/t08-problems.png", fullPage: true });

  // =========================================
  // TEST 9: Allergies
  // =========================================
  console.log("\n=== TEST 9: Allergies ===");
  await page.goto(`${BASE}/patients/${PATIENT_ID}?tab=allergies`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(3000);
  body = await page.textContent("body") || "";
  console.log(`  Tab loaded: ${body.includes("Allerg") || body.includes("records") || body.includes("Add") ? "✅" : "❌"}`);

  // Check for 401 errors on this tab (was the original issue)
  const allergyErrors = apiErrors.filter(e => e.includes("allerg") || e.includes("401"));
  console.log(`  API errors on allergies: ${allergyErrors.length === 0 ? "✅ none" : "❌ " + allergyErrors.join(", ")}`);
  await page.screenshot({ path: "test-results/t09-allergies.png", fullPage: true });

  // =========================================
  // TEST 10: Settings - User Management
  // =========================================
  console.log("\n=== TEST 10: User Management ===");
  await page.goto(`${BASE}/settings/user-management`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(5000);

  const staffTab = await page.locator('text=Staff & Providers').first().isVisible({ timeout: 3000 }).catch(() => false);
  const patientsTab = await page.locator('text=Patients').first().isVisible({ timeout: 3000 }).catch(() => false);
  const addUserBtn = await page.locator('button:has-text("Add User")').first().isVisible({ timeout: 3000 }).catch(() => false);
  console.log(`  Staff & Providers tab: ${staffTab ? "✅" : "❌"}`);
  console.log(`  Patients tab: ${patientsTab ? "✅" : "❌"}`);
  console.log(`  Add User button: ${addUserBtn ? "✅" : "❌"}`);
  await page.screenshot({ path: "test-results/t10-user-mgmt.png", fullPage: true });

  // =========================================
  // SUMMARY
  // =========================================
  console.log("\n========================================");
  console.log("=== TEST SUMMARY ===");
  console.log("========================================");
  if (apiErrors.length > 0) {
    console.log("\nAPI Errors encountered:");
    [...new Set(apiErrors)].forEach(e => console.log(`  ${e}`));
  } else {
    console.log("\n✅ No API errors detected across all tests");
  }
  console.log("\nAll screenshots saved to test-results/");
  console.log("========================================");

  await browser.close();
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
