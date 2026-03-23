import { Page, Locator } from '@playwright/test';

export class ReportingPage {
    readonly page: Page;
    readonly reportGrid: Locator;
    readonly filterButton: Locator;
    readonly exportButton: Locator;

    constructor(page: Page) {
        this.page = page;
        this.reportGrid = page.locator('.report-grid');
        this.filterButton = page.locator('button:has-text("Filter")');
        this.exportButton = page.locator('button:has-text("Export")');
    }

    async navigate() {
        await this.page.goto('https://reporting.dev.mojito360.com/');
    }

    async selectFilters(dateRange: string) {
        await this.filterButton.click();
        // Lógica de selección de filtros específica
    }
}
