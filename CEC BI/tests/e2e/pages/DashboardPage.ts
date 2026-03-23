import { Page, Locator } from '@playwright/test';

export class DashboardPage {
    readonly page: Page;
    readonly userProfileButton: Locator;
    readonly logoutButton: Locator;

    constructor(page: Page) {
        this.page = page;
        this.userProfileButton = page.locator('.user-profile-button');
        this.logoutButton = page.locator('.logout-button');
    }

    async logout() {
        await this.userProfileButton.click();
        await this.logoutButton.click();
    }
}
