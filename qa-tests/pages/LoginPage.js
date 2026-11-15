import { BasePage } from './BasePage.js';
import { ROUTES } from '../utils/routes.js';

const LOGIN_ERROR_TEXT = 'Invalid email or password';

export class LoginPage extends BasePage {
  constructor(page) {
    super(page);
    this.emailInput = page.getByLabel('Email', { exact: true });
    // exact: the "Show password" toggle button would also match "Password".
    this.passwordInput = page.getByLabel('Password', { exact: true });
    this.submitButton = page.getByRole('button', { name: 'Log In' });
    // The form has a data-testid="login-error" element, but it stays empty;
    // the visible message is rendered elsewhere, so match on its text.
    this.errorMessage = page.getByText(LOGIN_ERROR_TEXT);
  }

  async open() {
    await this.goto(ROUTES.Login);
  }

  async login(email, password) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
