# Test Strategy — Claims Management App

This is a working document, not a finished test plan. Where I say something is a "lead", it means I spotted it while reading the code but haven't proven it yet with a test or a manual check. Once I check a lead, I either confirm it or drop it.

## What the app does and how I looked at it

It's an insurance claims app. A claimant submits a claim, an admin moves it through a status workflow (submitted, under review, approved or rejected, closed), and the claimant is supposed to see each change live without refreshing.

Behind the screens there are a few moving parts. The browser only talks to the Next.js UI on port 3001, which calls the BFF on port 8090. The BFF handles login (through Keycloak), checks permissions, and forwards requests to the Claims Service on port 8080, which owns the business rules and the PostgreSQL database. When a claim changes, an event goes through Kafka back to the BFF, which pushes it to the browser over a WebSocket.

One thing worth saying up front: the brief describes an Angular frontend and an app with no tests at all. The code I was given is actually Next.js 16 with React 19, and it already ships with some unit tests (JUnit on the backend, Vitest on the frontend). Everything below is based on the code as delivered, not the brief's description.

Before writing any tests I traced three flows through every layer. The first was submitting a claim, from the wizard in the UI through the BFF's `ClaimsController`, the Claims Service's `ClaimController` and `CreateClaimUseCase`, down to the `Claim` domain class. The second was an admin changing a status, from the admin screen through the BFF's `AdminController` to `AdminClaimsController`, `UpdateClaimStatusUseCase` and `ClaimStatus`. The third was the live update, from the use case through Kafka to the BFF's `ClaimEventKafkaConsumer`, then `ClaimWebSocketHandler`, and finally the UI hook that listens for it.

For each area I asked myself three questions. How much damage would a defect here do? How complex is the logic? And does it sit at a seam where data passes from one system to another? Anything that scored high on two or three of those went near the top of my list.

## Where I think the risk is

I've ranked these roughly by damage times likelihood. File paths are relative to `code/`.

### 1. Access control

This is the one where a bug does the most harm: a claimant reading someone else's claim, or a non-admin approving claims. I wanted to prove that a logged-out user gets 401, that a claimant gets 403 on anything under `/api/admin/`, and that claimant A can't fetch claimant B's claim through the BFF. The ownership check lives in `claims-service/.../usecases/GetClaimUseCase.java:35` and the role rules in `bff-service/.../config/SecurityConfig.java:73`.

I've now verified this. The 401s and 403s are all correct and one claimant can't see another's claims, either in their list or by asking for the claim directly. What isn't right is the status code the API returns in some of those cases, which I've logged separately as BUG-07. The tests for this are in `qa-tests/features/api/`.

### 2. Status transitions

This is the core business decision, and the rules are written twice, once in Java and once in TypeScript, which means they can drift apart. While reading them I noticed that `UNDER_REVIEW → SUBMITTED` is allowed, so a claim can move backwards. That might be intentional, but it's worth asking about. I'd like to test all 25 from-to combinations and check that the UI and the backend agree. The rules are in `claims-service/.../domain/claim/ClaimStatus.java:13` and `demo-app-ui/src/features/admin/utils/claim-status-transitions.ts:5`. Still a lead.

### 3. Money handling

Anything involving money gets extra attention. The claim amount travels through the API as a `double` and is converted with `BigDecimal.valueOf(double)`, which can lose precision. I want to test the boundaries: 0, 0.01, exactly 1,000,000, and 1,000,000.01. The conversion happens in `bff-service/.../web/ClaimsController.java:41` and `claims-service/.../web/ClaimController.java:76`. Still a lead.

### 4. Live updates through Kafka and the WebSocket

This path has the most handovers between systems, and when it breaks it breaks silently: nobody gets an error, the screen just doesn't update. Two things caught my eye. First, `docker-compose.apps.yml:23` sets `APP_EVENTS_CDC_ENABLED` to `true`, which tells the Claims Service to leave event publishing to Debezium. But Debezium isn't started by default, so it's possible no events are published at all (the UI did show "Offline" at one point early on). Second, in `bff-service/.../websocket/ClaimWebSocketHandler.java`, the Kafka listener and the 30-second heartbeat (lines 130 and 172) can both write to the same WebSocket session at the same time, and Spring's `WebSocketSession` isn't safe for that. Both are still leads.

### 5. The test helper doesn't match the real message format

There's a `TestEventController` in the Claims Service that injects fake change events for testing. It builds messages with an `"id"` field, but the BFF's consumer reads `"claim_id"` and `"user_id"`. So anything injected this way arrives with an empty claim ID and only reaches admins. A broken test helper is dangerous because it gives false confidence. See `claims-service/.../web/TestEventController.java:66` and `bff-service/.../messaging/ClaimEventKafkaConsumer.java:118`. Still a lead.

### 6. Token validation

In both services, the custom `jwtDecoder()` replaces Spring's default token checks with only a timestamp check, so the token's issuer is never verified (`bff-service/.../config/SecurityConfig.java:113` and `claims-service/.../config/SecurityConfig.java:83`). The WebSocket handshake also accepts the token as a `?token=` query parameter (`bff-service/.../websocket/WebSocketAuthInterceptor.java:70`), which means it can end up in access logs. Still a lead.

### 7. Data integrity

If a claim's user record is missing, the admin list quietly shows "Unknown User" and `unknown@example.com` instead of reporting a problem (`claims-service/.../web/AdminClaimsController.java:158`). Admins would see wrong information without any hint that something is off. Still a lead.

### 8. Build and setup

A clean checkout doesn't run as-is, which is a delivery risk in its own right. The UI's generated API client is excluded from Git and the Dockerfile never generates it, so the UI fails with "Module not found" (`demo-app-ui/.gitignore:47`, `demo-app-ui/Dockerfile:7`). The Maven wrapper's `.mvn/` folder is missing. JaCoCo 0.8.11 in `claims-service/pom.xml:466` is too old for JDK 25. And Playwright's config points at a `global-setup.ts` that doesn't exist (`demo-app-ui/playwright.config.ts:18`). I confirmed the first one the hard way: the UI failed to build on my first run.

## What I plan to test, and how

For access control, I'm testing at the API level against the running stack, using Playwright's request client to call the BFF directly with real logins. This is done.

For status transitions, I want a parameterised unit test in JUnit 5 covering all 25 combinations, plus a component test with Vitest and Testing Library checking that the admin's status dropdown only offers the allowed options.

For money handling, I want JUnit 5 boundary tests on the `Claim` class, plus API tests sending amounts with lots of decimal places.

For live updates, the idea is either a Testcontainers integration test (put an event on Kafka, check it comes out on the WebSocket) or a Playwright end-to-end test with two browser windows open, one as the admin and one as the claimant.

And for the main journey, a Playwright end-to-end test with page objects: the claimant submits a claim, the admin approves it, and the claimant sees the new status. The submit half of this is done.

## What I'm deliberately leaving out

The theme picker and copy-to-clipboard buttons have low business impact, so I'm skipping them. The correlation-ID and tracing filters are observability only, with no user-facing damage if they break. The Swagger pages aren't part of any user journey. The Debezium CDC mode is optional and I'm time-boxing it, so it's only covered indirectly through risk 5. Cross-browser testing and visual regression are bonus items I'll only get to if there's time left over, and the same goes for load testing, where I'd write a small k6 script against `GET /api/claims`.

## Issues I've found

BUG-01: the UI doesn't build from a clean checkout. The generated API client is missing because it's git-ignored and the Dockerfile never generates it (`demo-app-ui/Dockerfile:7`, `.gitignore:47`). After running `start-app.sh` the app is unusable until someone runs `npm run generate:api` by hand. I saw "Build error" on `/claims`, and `docker logs demo-ui` showed "Module not found". Confirmed.

BUG-02: the Maven wrapper can't be used. `mvnw` and `mvnw.cmd` exist in both services, but the `.mvn/` folder they rely on is missing, so the wrapper can't download Maven and you have to install it separately. I've confirmed the folder is missing but haven't actually run `./mvnw` yet.

BUG-03: if the same user logs in twice at nearly the same moment, one of the logins is rejected with a 401 even though the password is correct. Keycloak's brute-force protection is switched on (`docker/compose/keycloak/demo-app-realm.json:10`) and it treats near-simultaneous logins as an attack, logging `user_temporarily_disabled`. I found this because my BDD suite was flaky when Playwright ran tests in parallel, and then reproduced it at the API level by firing two logins at once with `curl`: three out of three admin pairs (and the one claimant pair I tried) gave one 200 and one 401, while one-at-a-time logins always succeeded. Confirmed at the API level.

What I haven't shown is a person hitting it through the UI. A double-click probably won't do it, because the Log In button disables itself while a login is in progress (`app/(auth)/login/page.tsx:122`), and two people or two devices would have to submit within a fraction of a second of each other. So the realistic impact is on anything automated that shares an account: parallel test runs, load tests, scripts or integrations logging in as the same service user. Before calling it user-facing I'd want to try two browsers submitting together, or a slow network where someone retries.

BUG-04: a locked account is shown as "Invalid email or password". So the user is told their password is wrong when actually their account is temporarily locked, and they'll probably keep retrying, which only extends the lock. I first noticed Keycloak logging `user_temporarily_disabled` at the same time as the UI showed that message, then reproduced it on purpose with my own test user, `claimant2@qa.test`. The realm's quick-login check locks an account for 60 seconds after two failed logins less than a second apart, so I sent two wrong passwords 0.26 seconds apart through the login API, then logged in through the UI with the correct password. The page said "Invalid email or password", Keycloak logged `user_temporarily_disabled`, and its brute-force status for the user showed `disabled: true` with the lock ending exactly 60 seconds after the second failure. After clearing the lock in Keycloak, the same login worked. Confirmed.

BUG-05: signup is completely broken, and every signup returns a 500. To create a user, the BFF has to log in to Keycloak's admin API. Its config defaults the Keycloak admin password to `admin` (`bff-service/src/main/resources/application.yml:69`), `docker-compose.apps.yml` doesn't override it, but Keycloak is actually started with `Admin123!` (`docker-compose.infra.yml:94`). So the admin login fails, Keycloak logs `invalid_user_credentials` on the master realm for the `admin-cli` client, and the BFF doesn't handle the resulting `NotAuthorizedException`. The API returns a generic 500 instead of the 201, 400 or 409 it documents. No new customer can register. I proved it with a `curl` call to `/api/auth/signup` using a fresh email, and there's a BDD scenario for it in `signup.feature`. Confirmed.

BUG-06: on the signup page, every server error is shown as "Network error, please try again" (`demo-app-ui/app/(auth)/signup/page.tsx`, lines 50 and 57). Any response other than 400 or 409 throws `Error('Signup failed')`, and the `catch` block then replaces that with a network-error message. Users and support are pointed at the wrong cause. I saw this while trying to sign up during BUG-05. Confirmed.

BUG-07: the BFF returns 500 where its own API contract says it should return 403, 404 or 400. Its `ClaimsServiceAdapter` turns every error from the Claims Service into an `IllegalStateException` ("Forbidden: not authorized…", "Claim not found…", "Claims Service call failed…"), and Spring returns that as a 500. The contract in `bff-api.yml` documents 403 for someone else's claim, 404 for a claim that doesn't exist, and 400 for an invalid status change. The practical effect is that the UI can't tell "not yours" or "doesn't exist" apart from a server crash, and server-error alerts would fire for ordinary user mistakes. To be fair, no data leaks: the other claimant gets no claim content back. I probed it directly (another claimant asking for a claim, an unknown claim ID, and moving a claim from under review to closed all gave 500), and the BDD scenarios in `claim-isolation.feature` fail with "Expected 403/404, Received 500". Confirmed.

BUG-08: the admin status filter can show the wrong claims. The admin claims store keeps whichever response arrives last, with no check that it belongs to the most recent request (`demo-app-ui/src/features/admin/stores/use-admin-claims-store.ts:31`). If the page's initial unfiltered load is slower than a filter the admin picks straight away, the unfiltered list overwrites the filtered one. The dropdown says "Submitted" but the table shows every status, and an admin could end up acting on the wrong claims. The API filter itself works correctly; this is purely in the UI. I first saw it as an intermittent end-to-end failure, then made it reproducible every time by delaying the unfiltered response by three seconds. That scenario in `admin-claims.feature` fails with "Expected 0 other-status rows, Received 9" on every run. Confirmed.

I also made two smaller observations. On the login page there's an element with `data-testid="login-error"` that's always empty, because the real error message is rendered somewhere else; a test that relied on that hook would never see the error. And on the admin claims page, the status filter's visible label says "Filter by status" while its accessible name is "Filter claims by status", which is a minor accessibility inconsistency (WCAG 2.5.3, Label in Name).

I'll keep adding to this list as I confirm the leads above.

### Things I noticed while building the end-to-end suite

There may be a timezone problem with the incident date. The date picker limits you to the browser's local "today", but `Claim.java` checks the date against `LocalDate.now()` on the server, and the container runs in UTC. Around midnight (between midnight and 05:30 in India, for example), the browser's today is the server's tomorrow, so a perfectly valid claim could be rejected. I haven't tested this yet.

And a note on test design: a failed login against one of the shared seeded users locks that account for several minutes, so my negative login tests use an email that isn't registered at all.

## Environment notes

I'm working on Windows 11 with Docker Desktop, and running the start scripts in Git Bash since they're bash scripts.

The project targets Java 21. JDK 25 risks JaCoCo failures, so I run the tests on 21.

The README says the Keycloak admin password is `Admin123!`, while `docker/compose/.env` says `admin`. I checked, and `Admin123!` is the one that works, so the `.env` file is out of date. The BFF's own default of `admin` is out of date too, which is exactly what causes BUG-05.

Scenarios for known bugs are tagged `@bug @fail`. Playwright runs them as expected failures, so the suite stays green while the bug exists, and it will report them as "unexpectedly passed" once the bug is fixed, which is the reminder to remove the tag.

The end-to-end suite runs with a single Playwright worker because of BUG-03.

The API tests send a `Connection: close` header. On Windows, reused keep-alive connections through Docker Desktop's port forwarding were being reset (`ECONNRESET`) partway through a run, while plain `curl` calls, which open a fresh connection each time, succeeded 100 times out of 100. With a fresh connection per request, the API suite went from two to six minutes with random resets to about eight seconds with none.
