/** The header shown on every logged-in page. */
export class AppHeader {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.root = page.getByRole('banner');
    this.welcomeText = this.root.getByText(/^Welcome, /);
    this.logoutButton = this.root.getByRole('button', { name: 'Logout' });
    // Text is "Live" when the WebSocket is connected, "Offline" otherwise.
    this.connectionStatus = this.root.getByRole('status', { name: /^Connection status:/ });
  }

  async logout() {
    await this.logoutButton.click();
  }
}
