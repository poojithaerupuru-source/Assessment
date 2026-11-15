import { BasePage } from './BasePage.js';
import { ROUTES } from '../utils/routes.js';

const ACCOUNT_CREATED_TEXT = 'Account created! Please log in.';

export class SignupPage extends BasePage {
  constructor(page) {
    super(page);
    this.nameInput = page.getByLabel('Name', { exact: true });
    this.emailInput = page.getByLabel('Email', { exact: true });
    // exact: the "Show password" toggle button would also match "Password".
    this.passwordInput = page.getByLabel('Password', { exact: true });
    this.submitButton = page.getByRole('button', { name: 'Sign Up' });
    this.successMessage = page.getByText(ACCOUNT_CREATED_TEXT);
    this.serverError = page.getByRole('alert').filter({ hasText: /\S/ });
  }

  async open() {
    await this.goto(ROUTES.Signup);
  }

  async signUp({ name, email, password }) {
    await this.nameInput.fill(name);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
