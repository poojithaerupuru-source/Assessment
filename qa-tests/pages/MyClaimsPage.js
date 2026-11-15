import { BasePage } from './BasePage.js';
import { ROUTES } from '../utils/routes.js';
import { PAGE_LOAD_TIMEOUT_MS } from '../utils/timeouts.js';

export class MyClaimsPage extends BasePage {
  constructor(page) {
    super(page);
    const main = page.getByRole('main');
    this.heading = main.getByRole('heading', { name: 'My Claims' });
    // "Submit New Claim" when claims exist, "Submit Your First Claim" on the empty state.
    this.newClaimButton = main.getByRole('button', { name: /^Submit (New|Your First) Claim$/ });
    // The page renders a table (desktop) and cards (mobile); target the table rows.
    this.claimRows = main.getByRole('table').locator('tbody tr');
  }

  async open() {
    await this.goto(ROUTES['My Claims']);
  }

  /** Wait until the claims table (not the loading skeleton) has rendered. */
  async waitForClaimsLoaded() {
    await this.claimRows.first().waitFor({ state: 'visible', timeout: PAGE_LOAD_TIMEOUT_MS });
  }

  async startNewClaim() {
    await this.newClaimButton.click();
  }

  /** The row that contains the given text, e.g. a unique tag from the description. */
  claimRowContaining(text) {
    return this.claimRows.filter({ hasText: text });
  }

  /** Status badge in a row: role="status", aria-label "Claim status: X", text "X". */
  statusOf(row) {
    return row.getByRole('status');
  }
}
