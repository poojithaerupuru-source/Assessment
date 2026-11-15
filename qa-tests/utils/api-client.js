const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export const API_PATHS = Object.freeze({
  login: '/api/auth/login',
  csrf: '/api/auth/csrf',
  claims: '/api/claims',
  claim: (claimId) => `/api/claims/${claimId}`,
  claimStatus: (claimId) => `/api/admin/claims/${claimId}/status`,
});

export const ACCESS_TOKEN_COOKIE = 'access_token';

/**
 * Thin wrapper around a Playwright APIRequestContext for the BFF.
 * One instance = one user's cookie jar (access_token, XSRF-TOKEN).
 */
export class ApiClient {
  /** @param {import('@playwright/test').APIRequestContext} context */
  constructor(context) {
    this.context = context;
    this.csrf = null;
  }

  static async create(playwright, { baseURL, extraHTTPHeaders = {} } = {}) {
    const context = await playwright.request.newContext({
      baseURL,
      // Fresh TCP connection per request. Reused keep-alive connections through
      // Docker Desktop's port forwarding on Windows were reset (ECONNRESET) mid-run,
      // while one-connection-per-request curl calls never failed.
      extraHTTPHeaders: { Connection: 'close', ...extraHTTPHeaders },
    });
    return new ApiClient(context);
  }

  async login(email, password) {
    return this.context.post(API_PATHS.login, { data: { email, password } });
  }

  /** The BFF requires a CSRF token (cookie + header) on every write except login/signup. */
  async csrfHeader() {
    if (!this.csrf) {
      const response = await this.context.get(API_PATHS.csrf);
      const { token, headerName } = await response.json();
      this.csrf = { [headerName]: token };
    }
    return this.csrf;
  }

  /**
   * @param {string} method GET, POST, PATCH, ...
   * @param {{ data?: unknown, withCsrf?: boolean }} options withCsrf defaults to true for writes
   */
  async send(method, path, { data, withCsrf } = {}) {
    const upperMethod = method.toUpperCase();
    const useCsrf = withCsrf ?? WRITE_METHODS.has(upperMethod);
    const headers = useCsrf ? await this.csrfHeader() : {};
    return this.context.fetch(path, { method: upperMethod, data, headers });
  }

  async cookieNames() {
    const { cookies } = await this.context.storageState();
    return cookies.map((cookie) => cookie.name);
  }

  async dispose() {
    await this.context.dispose();
  }
}
