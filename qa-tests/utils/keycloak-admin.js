/**
 * Creates test users directly in Keycloak.
 *
 * Workaround for BUG-05: the app's own signup always returns 500, so tests that
 * need a second claimant create it here instead. On first login the BFF
 * auto-provisions the matching claims-service user record.
 */
const REALM = 'demo-app';
const HTTP_CONFLICT = 409;

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable ${name} (see qa-tests/.env.example).`);
  }
  return value;
}

async function adminToken(api) {
  const response = await api.post('/realms/master/protocol/openid-connect/token', {
    form: {
      grant_type: 'password',
      client_id: 'admin-cli',
      username: requiredEnv('KEYCLOAK_ADMIN_USERNAME'),
      password: requiredEnv('KEYCLOAK_ADMIN_PASSWORD'),
    },
  });
  if (!response.ok()) {
    throw new Error(`Keycloak admin login failed: HTTP ${response.status()}`);
  }
  return (await response.json()).access_token;
}

/** Idempotent: creates the user if missing and makes sure it has the realm role. */
export async function ensureKeycloakUser(playwright, { email, password, firstName, lastName, realmRole }) {
  const api = await playwright.request.newContext({ baseURL: requiredEnv('KEYCLOAK_URL') });
  try {
    const headers = { Authorization: `Bearer ${await adminToken(api)}` };

    const created = await api.post(`/admin/realms/${REALM}/users`, {
      headers,
      data: {
        username: email,
        email,
        firstName,
        lastName,
        enabled: true,
        emailVerified: true,
        credentials: [{ type: 'password', value: password, temporary: false }],
      },
    });
    if (!created.ok() && created.status() !== HTTP_CONFLICT) {
      throw new Error(`Creating Keycloak user ${email} failed: HTTP ${created.status()}`);
    }

    const [user] = await (
      await api.get(`/admin/realms/${REALM}/users`, { headers, params: { email, exact: 'true' } })
    ).json();
    const role = await (await api.get(`/admin/realms/${REALM}/roles/${realmRole}`, { headers })).json();
    const assigned = await api.post(`/admin/realms/${REALM}/users/${user.id}/role-mappings/realm`, {
      headers,
      data: [role],
    });
    if (!assigned.ok()) {
      throw new Error(`Assigning role ${realmRole} to ${email} failed: HTTP ${assigned.status()}`);
    }
  } finally {
    await api.dispose();
  }
}
