import { test, expect, Page } from "@playwright/test";

/**
 * Seed script: Create 25 appointments via browser UI.
 * Run: npx playwright test tests/e2e/seed/create-appointments.spec.ts
 *
 * Prerequisites: dev server on localhost:3000, user logged in (or auth cookies set).
 */

const APPOINTMENTS = [
  { search: "john s",  patient: "John Smith",        time: "08:00", endTime: "08:30", visitType: "Consultation",    provider: "Michael Chen",   reason: "Annual checkup" },
  { search: "sarah",   patient: "Sarah Johnson",     time: "08:00", endTime: "08:30", visitType: "Follow-up",       provider: "Sarah Williams", reason: "Blood pressure follow-up" },
  { search: "tho",     patient: "Thomas Moore",      time: "08:30", endTime: "09:00", visitType: "New Patient",     provider: "Jessica Patel",  reason: "New patient intake" },
  { search: "ant",     patient: "Anthony Williams",  time: "09:00", endTime: "09:30", visitType: "Routine",         provider: "David Thompson", reason: "Routine physical exam" },
  { search: "deb",     patient: "Deborah Martinez",  time: "09:30", endTime: "10:00", visitType: "Annual Physical", provider: "Amanda Johnson", reason: "Annual wellness visit" },
  { search: "kar",     patient: "Karen Mitchell",    time: "09:30", endTime: "10:00", visitType: "Telehealth",      provider: "James Lee",      reason: "Medication review telehealth" },
  { search: "and",     patient: "Andrew White",      time: "10:00", endTime: "10:30", visitType: "Follow-up",       provider: "Laura Martinez", reason: "Diabetes management follow-up" },
  { search: "don",     patient: "Donna Martin",      time: "10:00", endTime: "10:30", visitType: "Urgent",          provider: "Brian Wilson",   reason: "Acute chest pain evaluation" },
  { search: "lis",     patient: "Lisa Harris",       time: "10:30", endTime: "11:00", visitType: "Consultation",    provider: "Robert Kumar",   reason: "Dermatology consultation" },
  { search: "kev",     patient: "Kevin Lee",         time: "10:30", endTime: "11:00", visitType: "Lab Work",        provider: "Aravindh K",     reason: "Comprehensive metabolic panel" },
  { search: "mel",     patient: "Melissa Sanchez",   time: "11:00", endTime: "11:30", visitType: "Procedure",       provider: "Emily Taylor",   reason: "Mole removal procedure" },
  { search: "ric",     patient: "Richard Perez",     time: "11:00", endTime: "11:30", visitType: "Referral",        provider: "Michael Chen",   reason: "Cardiology referral" },
  { search: "wil",     patient: "William Taylor",    time: "11:30", endTime: "12:00", visitType: "Consultation",    provider: "Sarah Williams", reason: "Joint pain consultation" },
  { search: "lin",     patient: "Linda Jackson",     time: "11:30", endTime: "12:00", visitType: "Follow-up",       provider: "Jessica Patel",  reason: "Post-surgery follow-up" },
  { search: "jen",     patient: "Jennifer Sanchez",  time: "12:00", endTime: "12:30", visitType: "New Patient",     provider: "David Thompson", reason: "Pediatric new patient" },
  { search: "san",     patient: "Sandra Walker",     time: "12:30", endTime: "13:00", visitType: "Routine",         provider: "Amanda Johnson", reason: "Routine vaccination" },
  { search: "josh",    patient: "Joshua Perez",      time: "13:00", endTime: "13:30", visitType: "Annual Physical", provider: "James Lee",      reason: "Medicare annual wellness" },
  { search: "john t",  patient: "John Testpatient",  time: "13:30", endTime: "14:00", visitType: "Telehealth",      provider: "Laura Martinez", reason: "Virtual mental health check" },
  { search: "tho",     patient: "Thomas Moore",      time: "14:00", endTime: "14:30", visitType: "Follow-up",       provider: "Brian Wilson",   reason: "Asthma management follow-up" },
  { search: "sarah",   patient: "Sarah Johnson",     time: "14:00", endTime: "14:30", visitType: "Lab Work",        provider: "Robert Kumar",   reason: "Lipid panel and A1C" },
  { search: "kar",     patient: "Karen Mitchell",    time: "14:30", endTime: "15:00", visitType: "Urgent",          provider: "Aravindh K",     reason: "Severe migraine evaluation" },
  { search: "john s",  patient: "John Smith",        time: "15:00", endTime: "15:30", visitType: "Procedure",       provider: "Emily Taylor",   reason: "Skin biopsy" },
  { search: "and",     patient: "Andrew White",      time: "15:30", endTime: "16:00", visitType: "Consultation",    provider: "Michael Chen",   reason: "Weight management consultation" },
  { search: "don",     patient: "Donna Martin",      time: "16:00", endTime: "16:30", visitType: "Follow-up",       provider: "Sarah Williams", reason: "Thyroid function follow-up" },
  { search: "mel",     patient: "Melissa Sanchez",   time: "16:30", endTime: "17:00", visitType: "Routine",         provider: "Jessica Patel",  reason: "Well-woman exam" },
];

/** Helper: set a React-controlled input value via native setter + events */
async function setInputValue(page: Page, selector: string, value: string) {
  await page.evaluate(
    ({ sel, val }) => {
      const el = document.querySelector(sel) as HTMLInputElement;
      if (!el) throw new Error(`Element not found: ${sel}`);
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      setter.call(el, val);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    },
    { sel: selector, val: value },
  );
}

/** Helper: select option by visible text in a React-controlled <select> */
async function selectByText(page: Page, labelText: string, optionText: string) {
  await page.evaluate(
    ({ label, option }) => {
      // Find the select by its nearby label text
      const labels = document.querySelectorAll("label, .text-sm.font-medium, div > span");
      for (const lbl of labels) {
        if (!lbl.textContent?.includes(label)) continue;
        const container = lbl.closest("div");
        const select = container?.querySelector("select");
        if (!select || select.disabled) continue;
        const opt = Array.from(select.options).find((o) => o.text.includes(option));
        if (opt) {
          select.value = opt.value;
          select.dispatchEvent(new Event("change", { bubbles: true }));
          return true;
        }
      }
      return false;
    },
    { label: labelText, option: optionText },
  );
}

/** Helper: search patient and click matching result */
async function selectPatient(page: Page, searchTerm: string, patientName: string) {
  const input = page.locator('input[placeholder="Search patient by name..."]');
  await input.fill("");
  await input.pressSequentially(searchTerm, { delay: 80 });
  await page.waitForTimeout(1500);

  const found = await page.evaluate((name) => {
    const lis = document.querySelectorAll(".absolute.z-20 ul li");
    for (const li of lis) {
      const nameEl = li.querySelector(".font-medium");
      if (nameEl?.textContent?.trim() === name) {
        (li as HTMLElement).click();
        return true;
      }
    }
    // Fallback: click first result
    if (lis.length > 0) {
      (lis[0] as HTMLElement).click();
      return true;
    }
    return false;
  }, patientName);

  return found;
}

async function createOneAppointment(
  page: Page,
  apt: (typeof APPOINTMENTS)[number],
  index: number,
) {
  // 1. Open modal via "+" button (second "+" = appointment; first = patient)
  await page.getByRole("button", { name: "+" }).nth(1).click();
  await page.waitForTimeout(600);

  // 2. Select visit type
  await selectByText(page, "Visit Type", apt.visitType);
  await page.waitForTimeout(200);

  // 3. Search & select patient
  const patientOk = await selectPatient(page, apt.search, apt.patient);
  if (!patientOk) throw new Error(`Patient not found: ${apt.patient}`);
  await page.waitForTimeout(400);

  // 4. Fill date & time using native setters (React controlled inputs)
  const today = new Date().toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });

  // Set dates and times via evaluate to handle React state properly
  await page.evaluate(
    ({ date, startTime, endTime }) => {
      const inputs = document.querySelectorAll("input");
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )!.set!;

      for (const inp of inputs) {
        const parent = inp.closest("div");
        const label =
          parent?.previousElementSibling?.textContent?.trim() ||
          parent?.querySelector("label, .text-sm")?.textContent?.trim() ||
          "";

        if (
          inp.placeholder === "MM/DD/YYYY" &&
          label.toLowerCase().includes("start")
        ) {
          setter.call(inp, date);
          inp.dispatchEvent(new Event("input", { bubbles: true }));
          inp.dispatchEvent(new Event("change", { bubbles: true }));
        }
        if (
          inp.placeholder === "MM/DD/YYYY" &&
          label.toLowerCase().includes("end")
        ) {
          setter.call(inp, date);
          inp.dispatchEvent(new Event("input", { bubbles: true }));
          inp.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }

      // Set times: find inputs whose parent label mentions "start time" or "end time"
      for (const inp of inputs) {
        const container = inp.closest("div")?.parentElement;
        const labelEl = container?.querySelector(
          "label, .text-sm.font-medium, div > .text-sm",
        );
        const lt = labelEl?.textContent?.toLowerCase() || "";
        if (lt.includes("start time")) {
          setter.call(inp, startTime);
          inp.dispatchEvent(new Event("input", { bubbles: true }));
          inp.dispatchEvent(new Event("change", { bubbles: true }));
        }
        if (lt.includes("end time")) {
          setter.call(inp, endTime);
          inp.dispatchEvent(new Event("input", { bubbles: true }));
          inp.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
    },
    { date: today, startTime: apt.time, endTime: apt.endTime },
  );

  await page.waitForTimeout(800);

  // 5. Select provider (should be enabled now)
  await selectByText(page, "Provider", apt.provider);
  await page.waitForTimeout(500);

  // 6. Select location (first available / Main Clinic)
  await page.evaluate(() => {
    const selects = document.querySelectorAll("select");
    for (const sel of selects) {
      const opts = Array.from(sel.options);
      const clinic = opts.find((o) => o.text.includes("Main Clinic"));
      if (clinic && !sel.disabled) {
        sel.value = clinic.value;
        sel.dispatchEvent(new Event("change", { bubbles: true }));
        return;
      }
    }
  });
  await page.waitForTimeout(300);

  // 7. Fill reason
  const reasonInput = page.locator(
    'input[placeholder*="chest discomfort"]',
  );
  if (await reasonInput.isVisible()) {
    await reasonInput.fill(apt.reason);
  }
  await page.waitForTimeout(200);

  // 8. Click Save
  const saveBtn = page.locator('button:has-text("Save Appointment")');
  const isEnabled = await saveBtn.isEnabled();
  if (!isEnabled) {
    // Debug: check what's missing
    const state = await page.evaluate(() => {
      const selects = document.querySelectorAll("select");
      return Array.from(selects).map((s) => ({
        disabled: s.disabled,
        value: s.value,
        selectedText: s.options[s.selectedIndex]?.text,
      }));
    });
    throw new Error(
      `Save button disabled for #${index + 1}. Selects: ${JSON.stringify(state)}`,
    );
  }

  await saveBtn.click();
  await page.waitForTimeout(1500);

  // Verify modal closed (appointment saved)
  const modalStillOpen = await page
    .locator('button:has-text("Save Appointment")')
    .isVisible({ timeout: 500 })
    .catch(() => false);

  if (modalStillOpen) {
    // Close it manually
    await page.locator('button:has-text("Cancel")').click().catch(() => {});
    await page.waitForTimeout(300);
    throw new Error(`Modal still open after save for #${index + 1}`);
  }
}

test("seed 25 appointments via calendar UI", async ({ page }) => {
  test.setTimeout(300_000); // 5 minutes

  await page.goto("/calendar");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // Ensure All Providers view
  const providerFilter = page.locator("select").first();
  await providerFilter.selectOption("All Providers");
  await page.waitForTimeout(500);

  const results: string[] = [];

  for (let i = 0; i < APPOINTMENTS.length; i++) {
    const apt = APPOINTMENTS[i];
    try {
      await createOneAppointment(page, apt, i);
      results.push(
        `✓ #${i + 1}: ${apt.patient} @ ${apt.time} → ${apt.provider} (${apt.visitType})`,
      );
      console.log(results[results.length - 1]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push(`✗ #${i + 1}: ${apt.patient} — ${msg}`);
      console.error(results[results.length - 1]);
      // Try to close any lingering modal
      await page
        .locator('button:has-text("Cancel")')
        .click()
        .catch(() => {});
      await page
        .locator("button:has(svg)")
        .last()
        .click()
        .catch(() => {});
      await page.waitForTimeout(500);
    }
  }

  console.log("\n=== SUMMARY ===");
  results.forEach((r) => console.log(r));
  const ok = results.filter((r) => r.startsWith("✓")).length;
  console.log(`\n${ok}/${APPOINTMENTS.length} appointments created.`);

  // Take screenshot
  await page.screenshot({ path: "tests/e2e/seed/calendar-25-appointments.png", fullPage: false });

  expect(ok).toBeGreaterThan(0);
});
