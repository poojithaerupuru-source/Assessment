import { expect } from '@playwright/test';
import { When, Then } from '../fixtures/index.js';
import { buildValidClaim } from '../utils/claim-builder.js';
import { PAGE_LOAD_TIMEOUT_MS } from '../utils/timeouts.js';

When('I start a new claim', async ({ myClaimsPage, scenario }) => {
  scenario.claim = buildValidClaim();
  await myClaimsPage.startNewClaim();
});

When('I enter valid incident details with a claim amount of {string}', async ({ claimWizardPage, scenario }, claimAmount) => {
  scenario.claim.claimAmount = claimAmount;
  await claimWizardPage.fillIncidentDetails(scenario.claim);
});

When('I enter a valid description', async ({ claimWizardPage, scenario }) => {
  await claimWizardPage.fillDescription(scenario.claim.description);
});

When('I review and submit the claim', async ({ claimWizardPage }) => {
  await claimWizardPage.submit();
});

Then('I should see a confirmation that the claim was submitted', async ({ claimWizardPage }) => {
  await expect(claimWizardPage.successMessage).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT_MS });
});

Then('my new claim should appear in my claims list with status {string}', async ({ myClaimsPage, scenario }, statusLabel) => {
  await myClaimsPage.open();
  await myClaimsPage.waitForClaimsLoaded();
  // The unique tag at the start of the description identifies this run's claim.
  const row = myClaimsPage.claimRowContaining(scenario.claim.tag);
  await expect(row).toHaveCount(1);
  await expect(myClaimsPage.statusOf(row)).toHaveText(statusLabel);
});
