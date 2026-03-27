import { Page, Locator } from '@playwright/test';
import { LoginPage } from './LoginPage';

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
        
        // --- RESILIENCIA: DETECTAR REDIRECCIÓN A SSO (INTERMITENTE) ---
        console.log('[MOJITO-DEBUG] Verificando redirección de seguridad (SSO)...');
        try {
            const ssoInput = this.page.locator('#nameInput');
            const isSso = await ssoInput.waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false);
            
            if (isSso) {
                // Usar credenciales específicas de re-login (diferente al login inicial)
                const reloginUser = process.env.MOJITO_RELOGIN_USERNAME || process.env.CEC_USERNAME!;
                const reloginPass = process.env.CEC_PASSWORD!;
                console.warn(`[MOJITO-DEBUG] 🔐 Re-login SSO detectado. Usando: ${reloginUser.substring(0, 10)}...`);
                
                await ssoInput.click({ clickCount: 3 });
                await this.page.keyboard.press('Backspace');
                await ssoInput.type(reloginUser, { delay: 50 });
                
                const passInput = this.page.locator('#passwordInput');
                await passInput.click({ clickCount: 3 });
                await this.page.keyboard.press('Backspace');
                await passInput.type(reloginPass, { delay: 50 });
                
                await this.page.waitForTimeout(500);
                const loginBtn = this.page.locator('.body_login_submit');
                await loginBtn.click();
                
                await this.page.waitForLoadState('networkidle', { timeout: 30000 });
                console.log('[MOJITO-DEBUG] ✅ Re-autenticación completada.');
            } else {
                console.log('[MOJITO-DEBUG] ✅ No hubo redirección (sesión activa).');
            }
        } catch (e) {
            console.log('[MOJITO-DEBUG] ⚠️ Error en detección de re-login (continuando).');
        }

        await this.page.waitForLoadState('load');
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

    async exportReport() {
        console.log('[MOJITO-DEBUG] Iniciando exportación de reporte...');
        const downloadPromise = this.page.waitForEvent('download');
        await this.exportButton.click();
        const download = await downloadPromise;
        console.log(`[MOJITO-DEBUG] Descarga completada: ${download.suggestedFilename()}`);
        return download;
    }

    async getFirstCellValue() {
        const cell = this.page.locator('.report-grid table tr td').first();
        await cell.waitFor({ state: 'visible', timeout: 5000 });
        return await cell.innerText();
    }
}
