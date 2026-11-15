import { expect } from '@playwright/test';
import { Given, When, Then } from '../fixtures/index.js';
import { newUser } from '../utils/test-users.js';
import { PAGE_LOAD_TIMEOUT_MS } from '../utils/timeouts.js';

Given('I am on the signup page', async ({ signupPage }) => {
  await signupPage.open();
});

When('I sign up as a new user', async ({ signupPage, scenario }) => {
  scenario.newUser = newUser();
  await signupPage.signUp(scenario.newUser);
});

Then('I should see that my account was created', async ({ signupPage }) => {
  await expect(signupPage.successMessage).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT_MS });
});
