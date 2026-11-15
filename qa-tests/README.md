# qa-tests — BDD end-to-end suite

Playwright + [playwright-bdd](https://vitalets.github.io/playwright-bdd/), in JavaScript.
Feature files are turned into Playwright tests, so we keep Playwright's runner,
HTML report, traces, screenshots and retries.

## Layout

```
features/      Gherkin feature files, grouped by area (auth, claims, admin)
steps/         Step definitions. Thin: call page objects, then assert.
pages/         Page objects. Hold locators and user actions, no assertions.
  components/  Parts shared across pages (e.g. the header)
fixtures/      Playwright fixtures: page objects + per-scenario state. Exports Given/When/Then.
utils/         Routes, test users, test data builders
```

Rules of thumb:
- **Steps assert, pages act.** Page objects return locators; steps call `expect`.
- **No magic strings:** routes live in `utils/routes.js`, users in `utils/test-users.js`,
  claim rules and data in `utils/claim-builder.js`.
- **Share data between steps** through the `scenario` fixture, not global variables.

## First-time setup

```bash
npm install
npx playwright install chromium
cp .env.example .env   # then fill in the user emails and passwords
```

## Credentials

No credentials are committed. `utils/test-users.js` reads them from environment
variables and fails with a clear message if one is missing.

- **Locally:** `qa-tests/.env` (git-ignored). The seeded values are in
  `docker/compose/keycloak/demo-app-realm.json`.
- **In CI:** add these as GitHub Actions secrets; `.github/workflows/e2e.yml` maps them:
  `CLAIMANT_EMAIL`, `CLAIMANT_PASSWORD`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`,
  `OTHER_CLAIMANT_EMAIL`, `OTHER_CLAIMANT_PASSWORD`,
  `KEYCLOAK_ADMIN_USERNAME`, `KEYCLOAK_ADMIN_PASSWORD`.

The second claimant (`OTHER_CLAIMANT_*`) is created in Keycloak by the tests
themselves (`utils/keycloak-admin.js`), because the app's signup is broken (BUG-05).

## API tests

`features/api/` call the BFF directly with Playwright's request context — no browser.
`apiAs(role)` (in `fixtures/index.js`) gives each role its own logged-in cookie jar,
and `ApiClient` adds the CSRF token to writes automatically. Run only these with:

```bash
npx bddgen && npx playwright test --grep @api
```

## Known-bug scenarios

Scenarios tagged `@bug @fail` describe the correct behaviour and currently fail
because of a confirmed app bug. Playwright treats them as expected failures, so
the run stays green, and reports "unexpectedly passed" once the bug is fixed.
Remove `@fail` to see them fail red.

## Run (the full Docker stack must be running)

```bash
npm test                 # all scenarios
npm run test:smoke       # only @smoke
npm run test:headed      # watch the browser
npm run test:ui          # Playwright UI mode
npm run report           # open the last HTML report
```

`npm test` runs `bddgen` first, which writes generated specs to `.features-gen/`
(ignored by Git). If a step in a feature file has no definition, `bddgen` fails
and prints a snippet to paste into `steps/`.
