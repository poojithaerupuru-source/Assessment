import { expect } from '@playwright/test';
import { Given, Then } from '../fixtures/index.js';
import { routeFor } from '../utils/routes.js';
import { userFor } from '../utils/test-users.js';
import { PAGE_LOAD_TIMEOUT_MS } from '../utils/timeouts.js';

// Shared steps used by Background sections across features.

// Logs in through the UI. Later this can switch to a saved storageState
// (log in once, reuse the cookies) to make suites faster.
//
// Waits for the logged-in header (Logout button), not just a URL change: after login
// the app redirects with a full page load, and navigating again before that load
// finishes made the next step bounce back to /login intermittently.
Given('I am logged in as {string}', async ({ loginPage, appHeader }, role) => {
  const { email, password } = userFor(role);
  await loginPage.open();
  await loginPage.login(email, password);
  await expect(appHeader.logoutButton).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT_MS });
});

Given('I am on the {string} page', async ({ page }, pageName) => {
  await page.goto(routeFor(pageName));
});

Then('I should be on the {string} page', async ({ page }, pageName) => {
  await expect(page).toHaveURL(new RegExp(`${routeFor(pageName)}$`), { timeout: PAGE_LOAD_TIMEOUT_MS });
});
