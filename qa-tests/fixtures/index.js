import { test as base, createBdd } from 'playwright-bdd';
import { LoginPage } from '../pages/LoginPage.js';
import { SignupPage } from '../pages/SignupPage.js';
import { MyClaimsPage } from '../pages/MyClaimsPage.js';
import { ClaimWizardPage } from '../pages/ClaimWizardPage.js';
import { AdminClaimsPage } from '../pages/AdminClaimsPage.js';
import { AppHeader } from '../pages/components/AppHeader.js';
import { ApiClient } from '../utils/api-client.js';
import { userFor } from '../utils/test-users.js';
import { ensureKeycloakUser } from '../utils/keycloak-admin.js';

const ANONYMOUS = 'anonymous';
const HTTP_OK = 200;
const bffURL = () => process.env.BFF_URL ?? 'http://localhost:8090';

/**
 * Every page object is a fixture, so a step only asks for what it needs:
 *   When('...', async ({ loginPage }) => { ... })
 *
 * `scenario` is a plain object that lives for one scenario. Use it to pass data
 * between steps (e.g. the claim created in a When step, checked in a Then step).
 *
 * `apiAs(role)` returns a logged-in ApiClient for that role ("anonymous" = no login).
 * Each role gets its own cookie jar; clients are reused within a scenario and
 * disposed afterwards. Logins happen one at a time on purpose (BUG-03).
 */
export const test = base.extend({
  scenario: async ({}, use) => {
    await use({});
  },
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  signupPage: async ({ page }, use) => {
    await use(new SignupPage(page));
  },
  myClaimsPage: async ({ page }, use) => {
    await use(new MyClaimsPage(page));
  },
  claimWizardPage: async ({ page }, use) => {
    await use(new ClaimWizardPage(page));
  },
  adminClaimsPage: async ({ page }, use) => {
    await use(new AdminClaimsPage(page));
  },
  appHeader: async ({ page }, use) => {
    await use(new AppHeader(page));
  },

  newApiClient: async ({ playwright }, use) => {
    const clients = [];
    await use(async (options = {}) => {
      const client = await ApiClient.create(playwright, { baseURL: bffURL(), ...options });
      clients.push(client);
      return client;
    });
    await Promise.all(clients.map((client) => client.dispose()));
  },

  apiAs: async ({ playwright, newApiClient }, use) => {
    const byRole = new Map();
    await use(async (role) => {
      if (byRole.has(role)) return byRole.get(role);

      const client = await newApiClient();
      if (role !== ANONYMOUS) {
        const { email, password, keycloakProfile } = userFor(role);
        if (keycloakProfile) {
          await ensureKeycloakUser(playwright, { email, password, ...keycloakProfile });
        }
        const response = await client.login(email, password);
        if (response.status() !== HTTP_OK) {
          throw new Error(`API login as "${role}" failed: HTTP ${response.status()}`);
        }
      }
      byRole.set(role, client);
      return client;
    });
  },
});

export const { Given, When, Then } = createBdd(test);
