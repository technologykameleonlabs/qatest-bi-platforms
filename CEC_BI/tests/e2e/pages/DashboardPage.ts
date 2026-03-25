import { Page, Locator } from '@playwright/test';

export class DashboardPage {
    readonly page: Page;
    readonly userProfileButton: Locator;
    readonly logoutButton: Locator;
    
    // KPIs de Negocio
    readonly totalUsersCard: Locator;
    readonly totalReportsCard: Locator;
    readonly totalIntegrationsCard: Locator;
    readonly totalRolesCard: Locator;

    constructor(page: Page) {
        this.page = page;
        this.userProfileButton = page.locator('.user-profile-button');
        this.logoutButton = page.locator('.logout-button');
        
        // Locatarios basados en el texto de los encabezados de las tarjetas
        this.totalUsersCard = page.locator('div').filter({ hasText: /^Usuarios Totales$/ }).locator('..');
        this.totalReportsCard = page.locator('div').filter({ hasText: /^Reportes Totales$/ }).locator('..');
        this.totalIntegrationsCard = page.locator('div').filter({ hasText: /^Integraciones Totales$/ }).locator('..');
        this.totalRolesCard = page.locator('div').filter({ hasText: /^Roles Definidos$/ }).locator('..');
    }

    async getKpiValue(card: Locator): Promise<number> {
        // Buscamos cualquier elemento dentro del card que contenga solo números
        const valueText = await card.locator('text=/^\\d+$/').first().textContent();
        return parseInt(valueText?.trim() || '0', 10);
    }

    async logout() {
        await this.userProfileButton.click();
        await this.logoutButton.click();
    }
}
