import { expect } from '@playwright/test';
import { Given, When, Then } from '../fixtures/index.js';
import { API_PATHS, ACCESS_TOKEN_COOKIE } from '../utils/api-client.js';
import { buildValidClaim } from '../utils/claim-builder.js';
import { userFor, unregisteredUser } from '../utils/test-users.js';

const MALFORMED_TOKEN = 'not.a.valid.jwt';

/** Keep status and body together so Then steps can assert on either. */
async function remember(scenario, response) {
  scenario.response = { status: response.status(), body: await response.text() };
}

function claimPayload() {
  const { incidentDate, incidentLocation, description, claimAmount } = buildValidClaim();
  return { incidentDate, incidentLocation, description, claimAmount: Number(claimAmount) };
}

// ---- Login ---------------------------------------------------------------

When('{string} logs in through the API', async ({ newApiClient, scenario }, role) => {
  const { email, password } = userFor(role);
  scenario.client = await newApiClient();
  await remember(scenario, await scenario.client.login(email, password));
});

When('an unregistered user logs in through the API', async ({ newApiClient, scenario }) => {
  const { email, password } = unregisteredUser();
  scenario.client = await newApiClient();
  await remember(scenario, await scenario.client.login(email, password));
});

Then('an access token cookie should be set', async ({ scenario }) => {
  expect(await scenario.client.cookieNames()).toContain(ACCESS_TOKEN_COOKIE);
});

// ---- Generic requests ----------------------------------------------------

When('an anonymous user sends a {string} request to {string}', async ({ apiAs, scenario }, method, path) => {
  const client = await apiAs('anonymous');
  await remember(scenario, await client.send(method, path));
});

When('a user with a malformed access token sends a {string} request to {string}', async ({ newApiClient, scenario }, method, path) => {
  const client = await newApiClient({
    extraHTTPHeaders: { Cookie: `${ACCESS_TOKEN_COOKIE}=${MALFORMED_TOKEN}` },
  });
  await remember(scenario, await client.send(method, path));
});

When('{string} sends a {string} request to {string}', async ({ apiAs, scenario }, role, method, path) => {
  const client = await apiAs(role);
  await remember(scenario, await client.send(method, path));
});

// ---- Claims --------------------------------------------------------------

Given('{string} has submitted a claim through the API', async ({ apiAs, scenario }, role) => {
  const client = await apiAs(role);
  scenario.claim = claimPayload();
  const response = await client.send('POST', API_PATHS.claims, { data: scenario.claim });
  expect(response.status(), 'claim creation should succeed as test setup').toBe(201);
  scenario.claimId = (await response.json()).claimId;
});

When('{string} submits a claim through the API without a CSRF token', async ({ apiAs, scenario }, role) => {
  const client = await apiAs(role);
  await remember(
    scenario,
    await client.send('POST', API_PATHS.claims, { data: claimPayload(), withCsrf: false }),
  );
});

When('{string} requests the submitted claim by its ID', async ({ apiAs, scenario }, role) => {
  const client = await apiAs(role);
  await remember(scenario, await client.send('GET', API_PATHS.claim(scenario.claimId)));
});

When('{string} changes the claim status to {string} through the API', async ({ apiAs, scenario }, role, newStatus) => {
  const client = await apiAs(role);
  await remember(scenario, await client.send('PATCH', API_PATHS.claimStatus(scenario.claimId), { data: { newStatus } }));
});

// ---- Assertions ----------------------------------------------------------

Then('the response status should be {int}', async ({ scenario }, expectedStatus) => {
  expect(scenario.response.status, `body: ${scenario.response.body.slice(0, 300)}`).toBe(expectedStatus);
});

Then('the response status should not be {int}', async ({ scenario }, unexpectedStatus) => {
  expect(scenario.response.status).not.toBe(unexpectedStatus);
});

// Checks the claim's private content (its unique description), not just its ID:
// error bodies echo the request path, which contains the ID without leaking data.
Then('the response should contain the submitted claim', async ({ scenario }) => {
  expect(scenario.response.body).toContain(scenario.claimId);
  expect(scenario.response.body).toContain(scenario.claim.description);
});

Then('the response should not contain the submitted claim', async ({ scenario }) => {
  expect(scenario.response.body).not.toContain(scenario.claim.description);
});
