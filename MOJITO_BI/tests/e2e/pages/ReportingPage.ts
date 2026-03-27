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
        
        await this.page.waitForTimeout(2000);
        
        // Buscar carpeta o reporte disponible
        console.log('[MOJITO-DEBUG] Buscando reportes o carpetas...');
        const folder = this.page.locator('text=testing').first();
        const reportDirect = this.page.locator('div').filter({ hasText: /Reporte/i }).last();
        
        if (await folder.isVisible()) {
            console.log('[MOJITO-DEBUG] Carpeta "testing" encontrada, entrando...');
            await folder.click();
            await this.page.waitForTimeout(2000);
        }
        
        // Ahora buscar el primer reporte disponible dentro
        console.log('[MOJITO-DEBUG] Seleccionando el primer reporte disponible...');
        const reportCard = this.page.locator('[class*="report"], [class*="card"], div').filter({ hasText: /reporte|report|test/i }).last();
        await reportCard.waitFor({ state: 'visible', timeout: 15000 });
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

    async verifyReportLoaded() {
        console.log('[MOJITO-DEBUG] Verificando que el reporte cargó con datos...');
        
        // Esperar a que aparezca la sección "Totales"
        const totalesHeading = this.page.locator('text=Totales');
        await totalesHeading.waitFor({ state: 'visible', timeout: 30000 });
        
        // Extraer KPIs principales
        const totalOrdenesText = this.page.locator('text=Total de Órdenes').first();
        await totalOrdenesText.waitFor({ state: 'visible', timeout: 10000 });
        console.log('[MOJITO-DEBUG] ✅ KPI "Total de Órdenes" visible.');

        const geoText = this.page.locator('text=Geoposicionadas').first();
        if (await geoText.isVisible()) {
            console.log('[MOJITO-DEBUG] ✅ KPI "Geoposicionadas" visible.');
        }
        
        // Verificar que la tabla de datos esté presente
        const table = this.page.locator('table').first();
        await table.waitFor({ state: 'visible', timeout: 15000 });
        const rowCount = await this.page.locator('table tbody tr').count();
        console.log(`[MOJITO-DEBUG] ✅ Tabla cargada con ${rowCount} filas visibles.`);
        
        return { rowCount };
    }

    async getKpiValues() {
        console.log('[MOJITO-DEBUG] Extrayendo KPIs del reporte...');
        
        // Los KPIs son números grandes seguidos de "/" y otro número
        // Formato: "329 / 329" con "Total de Órdenes" debajo
        const kpiSection = this.page.locator('text=Total de Órdenes').locator('..');
        
        // Extraer todos los textos numéricos cercanos al label
        const kpis: Record<string, string> = {};
        
        const totalText = await this.page.locator('text=Total de Órdenes').locator('..').locator('..').textContent();
        if (totalText) {
            console.log(`[MOJITO-DEBUG] KPI Raw: ${totalText.trim()}`);
            kpis['totalOrdenes'] = totalText.trim();
        }
        
        return kpis;
    }

    async exportToExcel() {
        console.log('[MOJITO-DEBUG] Exportando a Excel...');
        // El botón de export es el icono "file-excel" dentro de la sección de la tabla
        const excelBtn = this.page.locator('button:has(img[alt="file-excel"])').first();
        
        if (await excelBtn.isVisible()) {
            const downloadPromise = this.page.waitForEvent('download', { timeout: 30000 });
            await excelBtn.click();
            try {
                const download = await downloadPromise;
                console.log(`[MOJITO-DEBUG] ✅ Archivo descargado: ${download.suggestedFilename()}`);
                return download;
            } catch (e) {
                console.log('[MOJITO-DEBUG] ⚠️ No se completó la descarga (posible popup de confirmación).');
                return null;
            }
        } else {
            // Fallback: botón download en el header
            const headerDownload = this.page.locator('button:has(img[alt="download"])').first();
            if (await headerDownload.isVisible()) {
                await headerDownload.click();
                console.log('[MOJITO-DEBUG] ⚠️ Usando botón download del header.');
            }
            return null;
        }
    }

    async getFirstCellValue() {
        // Ant Design tables have a hidden first row (nz-disable-td), skip it
        const cell = this.page.locator('table tbody tr:nth-child(2) td').first();
        await cell.waitFor({ state: 'visible', timeout: 15000 });
        return await cell.innerText();
    }
}
