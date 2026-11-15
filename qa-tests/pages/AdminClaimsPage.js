import { BasePage } from './BasePage.js';
import { ROUTES } from '../utils/routes.js';
import { PAGE_LOAD_TIMEOUT_MS } from '../utils/timeouts.js';

export class AdminClaimsPage extends BasePage {
  constructor(page) {
    super(page);
    const main = page.getByRole('main');
    this.heading = main.getByRole('heading', { name: 'Claims Management' });
    // Accessible names come from aria-label, not the visible "Filter by status" text.
    this.statusFilter = main.getByRole('combobox', { name: 'Filter claims by status' });
    this.userIdSearch = main.getByRole('textbox', { name: 'Search claims by user ID' });
    // The page renders a table (desktop) and cards (mobile); target the table.
    this.claimsTable = main.getByRole('table');
    this.claimRows = this.claimsTable.locator('tbody tr');
    this.confirmDialog = page.getByRole('dialog');
    this.confirmButton = this.confirmDialog.getByRole('button', { name: 'Confirm' });
    this.cancelDialogButton = this.confirmDialog.getByRole('button', { name: 'Cancel' });
  }

  async open() {
    await this.goto(ROUTES['Admin Claims']);
  }

  /** The page shows "Loading claims" first; wait until the table has rendered. */
  async waitForClaimsLoaded() {
    await this.claimsTable.waitFor({ state: 'visible', timeout: PAGE_LOAD_TIMEOUT_MS });
  }

  /** Filter once the initial (unfiltered) load has finished. */
  async filterByStatus(statusLabel) {
    await this.waitForClaimsLoaded();
    await this.selectStatusFilter(statusLabel);
    await this.waitForClaimsLoaded();
  }

  /** Pick a status in the filter immediately, without waiting for any load. */
  async selectStatusFilter(statusLabel) {
    await this.statusFilter.selectOption({ label: statusLabel });
  }

  /** Rows whose status badge is anything other than the given label. */
  rowsWithStatusOtherThan(statusLabel) {
    return this.claimRows.filter({
      hasNot: this.page.getByRole('status', { name: `Claim status: ${statusLabel}`, exact: true }),
    });
  }

  /**
   * Admin rows show the short claim ID (first 8 chars) but not the description,
   * so find a claim by its ID.
   */
  claimRowById(claimId) {
    return this.claimRows.filter({ hasText: claimId.slice(0, 8) });
  }

  statusOf(row) {
    return row.getByRole('status');
  }

  /** Native <select> offering only the transitions allowed from the current status. */
  statusSelectIn(row) {
    return row.getByRole('combobox', { name: 'Update Status' });
  }

  async changeStatus(row, statusLabel) {
    await this.statusSelectIn(row).selectOption({ label: statusLabel });
    await this.confirmButton.click();
  }
}
