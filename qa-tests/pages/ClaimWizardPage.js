import { BasePage } from './BasePage.js';
import { ROUTES } from '../utils/routes.js';

const SUCCESS_TEXT = /^Claim submitted successfully!/;

// Step 1 = incident date, location, amount. Step 2 = description. Step 3 = review and submit.
export class ClaimWizardPage extends BasePage {
  constructor(page) {
    super(page);
    // Scope to <main>: the header nav also has a "Submit Claim" button.
    const main = page.getByRole('main');
    this.progress = main.getByRole('progressbar'); // accessible name "Step N of 3"

    this.incidentDateInput = main.getByLabel('When did the incident occur?');
    this.incidentLocationInput = main.getByLabel('Where did the incident occur?');
    this.claimAmountInput = main.getByLabel('Claim Amount');
    this.descriptionInput = main.getByLabel('Describe what happened');

    this.nextButton = main.getByRole('button', { name: 'Next' });
    this.backButton = main.getByRole('button', { name: 'Back' });
    this.cancelButton = main.getByRole('button', { name: 'Cancel' });
    this.submitButton = main.getByRole('button', { name: 'Submit Claim' });

    this.invalidFields = main.locator('[aria-invalid="true"]');
    // Toast shown after submit, e.g. "Claim submitted successfully! Claim ID: <uuid>"
    this.successMessage = page.getByText(SUCCESS_TEXT);
  }

  async open() {
    await this.goto(ROUTES['Submit Claim']);
  }

  /** Step 1 */
  async fillIncidentDetails({ incidentDate, incidentLocation, claimAmount }) {
    await this.incidentDateInput.fill(incidentDate);
    await this.incidentLocationInput.fill(incidentLocation);
    await this.claimAmountInput.fill(claimAmount);
    await this.nextButton.click();
  }

  /** Step 2 */
  async fillDescription(description) {
    await this.descriptionInput.fill(description);
    await this.nextButton.click();
  }

  /** Step 3 */
  async submit() {
    await this.submitButton.click();
  }
}
