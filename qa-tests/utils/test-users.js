/**
 * Test users are read from environment variables only — no credentials in code.
 *   Locally: a git-ignored qa-tests/.env file (see .env.example).
 *   In CI:   GitHub Actions secrets mapped to the same variable names.
 *
 * `keycloakProfile` marks users that tests create themselves in Keycloak
 * (see utils/keycloak-admin.js), because the app's signup is broken (BUG-05).
 */
const USERS = Object.freeze({
  claimant: { emailVar: 'CLAIMANT_EMAIL', passwordVar: 'CLAIMANT_PASSWORD' },
  admin: { emailVar: 'ADMIN_EMAIL', passwordVar: 'ADMIN_PASSWORD' },
  'another claimant': {
    emailVar: 'OTHER_CLAIMANT_EMAIL',
    passwordVar: 'OTHER_CLAIMANT_PASSWORD',
    keycloakProfile: { firstName: 'Other', lastName: 'Claimant', realmRole: 'claimant' },
  },
});

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. ` +
        'Copy qa-tests/.env.example to qa-tests/.env and fill it in (or set it as a CI secret).',
    );
  }
  return value;
}

/** A brand-new user for signup tests; the email is unique per call. */
export function newUser() {
  const id = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  return {
    name: 'QA Signup User',
    email: `qa-signup-${id}@example.com`,
    password: 'SecurePass123!',
  };
}

/**
 * A user that doesn't exist in Keycloak, for negative login tests.
 * Failing logins against seeded users would trip brute-force protection and lock them.
 */
export function unregisteredUser() {
  return {
    email: `not-registered-${Date.now()}@example.com`,
    password: 'NotARealPassword1!',
  };
}

/** @returns {{ email: string, password: string, keycloakProfile?: object }} */
export function userFor(role) {
  const user = USERS[role];
  if (!user) {
    throw new Error(`Unknown role "${role}". Known roles: ${Object.keys(USERS).join(', ')}`);
  }
  return {
    email: requiredEnv(user.emailVar),
    password: requiredEnv(user.passwordVar),
    keycloakProfile: user.keycloakProfile,
  };
}
