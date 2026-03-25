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
        console.log('[MOJITO-DEBUG] Navegando a Gestión de Reportes...');
        const reportsMenu = this.page.locator('text=Gestión de Reportes');
        await reportsMenu.waitFor({ state: 'visible', timeout: 15000 });
        await reportsMenu.click();
        
        await this.page.waitForTimeout(1000);
        console.log('[MOJITO-DEBUG] Seleccionando el primer reporte disponible...');
        // Selector muy laxo para cualquier cosa que diga Reporte y tenga icono
        const reportCard = this.page.locator('div').filter({ hasText: /Reporte V/i }).last(); // El header también lo tiene, queremos el de abajo
        await reportCard.waitFor({ state: 'visible', timeout: 10000 });
        await reportCard.click();
        
        await this.page.waitForLoadState('networkidle');
        await this.page.waitForTimeout(2000);
        await this.page.screenshot({ path: 'mojito_report_opened.png' });
    }

    async selectFilters(dateRange: string) {
        await this.filterButton.click();
        // Esperamos a que el dropdown de rangos de fecha sea visible
        const rangeOption = this.page.locator(`text=${dateRange}`);
        await rangeOption.waitFor({ state: 'visible', timeout: 5000 });
        await rangeOption.click();
        
        // Clic en aplicar si existe el botón
        const applyButton = this.page.locator('button:has-text("Apply")');
        if (await applyButton.isVisible()) {
            await applyButton.click();
        }
        
        // Esperar a que la grilla se actualice (indicado por el grid siendo visible)
        await this.reportGrid.waitFor({ state: 'visible', timeout: 10000 });
    }
}
