const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'Test@123';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

let screenshotCounter = 0;
async function screenshot(page, name) {
  screenshotCounter++;
  const filepath = path.join(SCREENSHOT_DIR, `${String(screenshotCounter).padStart(2,'0')}-${name}.png`);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`[SCREENSHOT] ${path.basename(filepath)}`);
  return filepath;
}

async function login(page, email, password, label) {
  console.log(`\n[LOGIN] Logging in as ${email} (${label})`);

  // Navigate to app
  await page.goto('http://localhost:3002', { waitUntil: 'networkidle', timeout: 30000 });
  console.log(`[NAV] Current URL: ${page.url()}`);
  await screenshot(page, `${label}-login-page`);

  // Fill email in the custom EHR signin form
  const emailField = await page.waitForSelector('#email, input[type="email"]', { timeout: 10000 });
  await emailField.fill(email);
  console.log('[LOGIN] Filled email field');
  await screenshot(page, `${label}-email-filled`);

  // Click Continue button
  await page.click('button[type="submit"]');
  console.log('[LOGIN] Clicked Continue');
  await page.waitForTimeout(2000);
  await screenshot(page, `${label}-after-continue`);

  // Now we should be on step 2 - password
  const passwordField = await page.waitForSelector('#password, input[type="password"]', { timeout: 10000 });
  await passwordField.fill(password);
  console.log('[LOGIN] Filled password field');
  await screenshot(page, `${label}-password-filled`);

  // Click Sign in button
  await page.click('button[type="submit"]');
  console.log('[LOGIN] Clicked Sign in');

  // Wait for redirect to app interior
  try {
    await page.waitForURL('http://localhost:3002/**', { timeout: 30000 });
    await page.waitForFunction(() => !window.location.pathname.includes('/signin'), { timeout: 15000 });
  } catch (e) {
    console.log(`[LOGIN] Redirect wait error: ${e.message}, current URL: ${page.url()}`);
  }

  await page.waitForTimeout(2500);
  await screenshot(page, `${label}-after-login`);
  console.log(`[LOGIN] Login complete. Current URL: ${page.url()}`);
}

async function testPageAccess(page, url, pageLabel, userLabel) {
  console.log(`\n[TEST] ${userLabel} navigating to ${url}`);
  await page.goto(`http://localhost:3002${url}`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  const finalUrl = page.url();
  const pageContent = await page.textContent('body').catch(() => '');

  // Detect access status
  let accessStatus = 'UNKNOWN';
  const contentLower = pageContent.toLowerCase();

  if (contentLower.includes('access denied')) {
    accessStatus = 'ACCESS_DENIED';
  } else if (contentLower.includes('forbidden') || contentLower.includes('403')) {
    accessStatus = 'FORBIDDEN';
  } else if (finalUrl.includes('/signin') || finalUrl.includes('/login')) {
    accessStatus = 'REDIRECTED_TO_LOGIN';
  } else {
    accessStatus = 'PAGE_ACCESSIBLE';
  }

  // Get main heading text
  const headingText = await page.$eval('h1, h2, [class*="heading"], [class*="title"]',
    el => el.textContent?.trim()
  ).catch(() => '');

  await screenshot(page, `${userLabel}-${pageLabel}`);

  console.log(`[RESULT] ${userLabel} @ ${url}: ${accessStatus}`);
  if (headingText) console.log(`[RESULT] Heading: "${headingText}"`);
  console.log(`[RESULT] Final URL: ${finalUrl}`);

  return { url, userLabel, accessStatus, headingText, finalUrl };
}

async function logout(page, label) {
  console.log(`\n[LOGOUT] Logging out ${label}...`);

  // Try user menu approach
  try {
    // Look for avatar/user menu button
    const selectors = [
      'button[aria-label*="user"]',
      'button[aria-label*="account"]',
      'button[aria-label*="profile"]',
      '[data-testid="user-menu"]',
      '.user-avatar',
      'button img[class*="avatar"]',
      'button[class*="avatar"]',
    ];

    let clicked = false;
    for (const sel of selectors) {
      const el = await page.$(sel);
      if (el) {
        await el.click();
        await page.waitForTimeout(1000);
        clicked = true;
        console.log(`[LOGOUT] Clicked user menu via: ${sel}`);
        break;
      }
    }

    if (clicked) {
      await screenshot(page, `${label}-user-menu-open`);
      const logoutBtn = await page.$('button:has-text("Logout"), button:has-text("Sign out"), a:has-text("Logout"), a:has-text("Sign out"), [role="menuitem"]:has-text("Logout"), [role="menuitem"]:has-text("Sign out")');
      if (logoutBtn) {
        await logoutBtn.click();
        await page.waitForTimeout(2000);
        console.log('[LOGOUT] Clicked logout');
        await screenshot(page, `${label}-logged-out`);
        return;
      }
    }
  } catch (e) {
    console.log(`[LOGOUT] UI logout failed: ${e.message}`);
  }

  // Fallback: clear storage and navigate to signin
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.context().clearCookies();
  console.log('[LOGOUT] Cleared storage/cookies');
  await page.goto('http://localhost:3002/signin', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1000);
  await screenshot(page, `${label}-logged-out`);
}

async function main() {
  console.log('=== RBAC Permission Guard Test ===\n');
  console.log(`Screenshots will be saved to: ${SCREENSHOT_DIR}\n`);

  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });

  const page = await context.newPage();
  const results = [];

  try {
    // ==========================================
    // PART 1: BILLING USER
    // ==========================================
    console.log('\n' + '='.repeat(60));
    console.log('PART 1: BILLING USER (billing.davis@sunrisefamilymedicine.com)');
    console.log('='.repeat(60));

    await login(page, 'billing.davis@sunrisefamilymedicine.com', TEST_PASSWORD, 'billing');

    // Admin-restricted pages - billing should NOT see these
    results.push(await testPageAccess(page, '/settings/roles-permissions', 'roles-permissions', 'billing'));
    results.push(await testPageAccess(page, '/settings/user-management', 'user-management', 'billing'));
    results.push(await testPageAccess(page, '/administration', 'administration', 'billing'));

    // Billing-accessible pages - billing SHOULD see these
    results.push(await testPageAccess(page, '/payments', 'payments', 'billing'));
    results.push(await testPageAccess(page, '/billing', 'billing', 'billing'));
    results.push(await testPageAccess(page, '/calendar', 'calendar', 'billing'));

    // ==========================================
    // PART 2: ADMIN USER
    // ==========================================
    console.log('\n' + '='.repeat(60));
    console.log('PART 2: ADMIN USER (michael.chen@example.com)');
    console.log('='.repeat(60));

    await logout(page, 'billing');
    await login(page, 'michael.chen@example.com', TEST_PASSWORD, 'admin');

    // Same restricted pages - admin SHOULD see these
    results.push(await testPageAccess(page, '/settings/roles-permissions', 'roles-permissions', 'admin'));
    results.push(await testPageAccess(page, '/settings/user-management', 'user-management', 'admin'));
    results.push(await testPageAccess(page, '/administration', 'administration', 'admin'));
    results.push(await testPageAccess(page, '/payments', 'payments', 'admin'));

    // ==========================================
    // FINAL SUMMARY
    // ==========================================
    console.log('\n' + '='.repeat(60));
    console.log('FINAL RESULTS SUMMARY');
    console.log('='.repeat(60));
    for (const r of results) {
      const expected = getExpected(r.userLabel, r.url);
      const pass = r.accessStatus === expected ? 'PASS' : 'FAIL';
      console.log(`[${pass}] ${r.userLabel.toUpperCase()} @ ${r.url}: ${r.accessStatus} (expected: ${expected})`);
    }

    console.log(`\nAll screenshots saved to: ${SCREENSHOT_DIR}`);

  } catch (error) {
    console.error('\n[FATAL ERROR]', error.message);
    console.error(error.stack);
    await screenshot(page, 'fatal-error').catch(() => {});
  } finally {
    await page.waitForTimeout(3000);
    await browser.close();
  }
}

function getExpected(userLabel, url) {
  const adminOnlyUrls = ['/settings/roles-permissions', '/settings/user-management', '/administration'];
  if (userLabel === 'billing' && adminOnlyUrls.includes(url)) return 'ACCESS_DENIED';
  return 'PAGE_ACCESSIBLE';
}

main().catch(console.error);
