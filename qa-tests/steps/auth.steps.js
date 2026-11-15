import { expect } from '@playwright/test';
import { Given, When, Then } from '../fixtures/index.js';
import { userFor, unregisteredUser } from '../utils/test-users.js';

Given('I am on the login page', async ({ loginPage }) => {
  await loginPage.open();
});

When('I log in as {string}', async ({ loginPage }, role) => {
  const { email, password } = userFor(role);
  await loginPage.login(email, password);
});

When('I log in with an unregistered email', async ({ loginPage }) => {
  const { email, password } = unregisteredUser();
  await loginPage.login(email, password);
});

Then('I should see a login error message', async ({ loginPage }) => {
  await expect(loginPage.errorMessage).toBeVisible();
});
