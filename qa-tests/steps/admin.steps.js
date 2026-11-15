import { expect } from '@playwright/test';
import { Given, When, Then } from '../fixtures/index.js';
import { PAGE_LOAD_TIMEOUT_MS } from '../utils/timeouts.js';

// Long enough that the filtered response always arrives before the unfiltered one.
const SLOW_RESPONSE_DELAY_MS = 3_000;
const ADMIN_CLAIMS_API = '**/api/admin/claims*';

Then('I should see the admin claims table', async ({ adminClaimsPage }) => {
  await adminClaimsPage.waitForClaimsLoaded();
  await expect(adminClaimsPage.claimsTable).toBeVisible();
});

When('I filter claims by status {string}', async ({ adminClaimsPage }, statusLabel) => {
  await adminClaimsPage.filterByStatus(statusLabel);
});

When('I filter claims by status {string} before the list has loaded', async ({ adminClaimsPage }, statusLabel) => {
  await adminClaimsPage.selectStatusFilter(statusLabel);
});

// Delays only the unfiltered list request (no ?status=), to force the race
// between the page's initial load and a filter picked straight away.
Given('the unfiltered admin claims list responds slowly', async ({ page, scenario }) => {
  const isUnfilteredList = (request) =>
    request.method() === 'GET' && !new URL(request.url()).searchParams.has('status');

  await page.route(ADMIN_CLAIMS_API, async (route) => {
    if (isUnfilteredList(route.request())) {
      await new Promise((resolve) => setTimeout(resolve, SLOW_RESPONSE_DELAY_MS));
    }
    await route.continue();
  });
  scenario.slowResponse = page.waitForResponse(
    (response) => response.url().includes('/api/admin/claims') && isUnfilteredList(response.request()),
    { timeout: PAGE_LOAD_TIMEOUT_MS },
  );
});

When('I reload the page', async ({ page }) => {
  await page.reload();
});

When('the slow unfiltered response has arrived', async ({ scenario }) => {
  await scenario.slowResponse;
});

Then('every claim shown should have status {string}', async ({ adminClaimsPage }, statusLabel) => {
  // At least one row first: an empty table would otherwise pass without checking anything.
  await expect(adminClaimsPage.claimRows.first()).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT_MS });
  await expect(adminClaimsPage.rowsWithStatusOtherThan(statusLabel)).toHaveCount(0);
});
