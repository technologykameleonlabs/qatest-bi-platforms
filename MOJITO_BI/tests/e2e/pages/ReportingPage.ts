import { Page, Locator } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// ReportingPage — Page Object Model para el módulo de reportes de Mojito BI
//
// Gestiona la navegación, extracción de KPIs, filtrado y exportación.
// El desafío SSO intermitente se maneja de forma transparente en `navigate()`.
// ─────────────────────────────────────────────────────────────────────────────
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

    /**
     * Navega al módulo de reportes, entra en la carpeta "testing" si existe,
     * abre el primer reporte disponible y maneja el desafío SSO intermitente.
     */
    async navigate() {
        console.log('[ReportingPage] Navegando al módulo de reportes...');

        // Intentar via menú de navegación, fallback a URL directa
        const reportsMenu = this.page.locator('text=Gestión de Reportes');
        const menuVisible = await reportsMenu.waitFor({ state: 'visible', timeout: 15000 })
            .then(() => true)
            .catch(() => false);

        if (menuVisible) {
            await reportsMenu.click();
        } else {
            console.warn('[ReportingPage] Menú no encontrado, navegando por URL directa.');
            await this.page.goto('https://reporting.dev.mojito360.com/reports');
        }

        await this.page.waitForTimeout(2000);

        // Entrar en carpeta "testing" si existe
        const folder = this.page.locator('text=testing').first();
        if (await folder.isVisible()) {
            console.log('[ReportingPage] Carpeta "testing" encontrada — entrando...');
            await folder.click();
            await this.page.waitForTimeout(2000);
        }

        // Seleccionar el primer reporte disponible
        console.log('[ReportingPage] Seleccionando primer reporte...');
        const reportCard = this.page
            .locator('[class*="report"], [class*="card"], div')
            .filter({ hasText: /reporte|report|test/i })
            .last();

        await reportCard.waitFor({ state: 'visible', timeout: 15000 });
        await reportCard.click();

        // Manejar el desafío SSO (aparece de forma intermitente tras abrir un reporte)
        await this.handleSsoChallenge();

        await this.page.waitForLoadState('load');
        await this.page.screenshot({ path: 'mojito_report_opened.png' });
        console.log('[ReportingPage] ✅ Reporte abierto.');
    }

    /**
     * Verifica si el usuario fue redirigido al SSO de Mojito y, si es así,
     * completa el re-login automáticamente con las credenciales configuradas.
     *
     * Este comportamiento es intermitente y depende del estado de sesión del entorno.
     */
    private async handleSsoChallenge() {
        const ssoInput = this.page.locator('#nameInput');
        const challenged = await ssoInput
            .waitFor({ state: 'visible', timeout: 10000 })
            .then(() => true)
            .catch(() => false);

        if (!challenged) {
            console.log('[ReportingPage] ✅ Sin desafío SSO (sesión activa).');
            return;
        }

        // Credenciales de re-login: usa MOJITO_RELOGIN_USERNAME si está definido
        const reloginUser =
            process.env.MOJITO_RELOGIN_USERNAME ||
            process.env.MOJITO_USERNAME ||
            process.env.CEC_USERNAME!;
        const reloginPass = process.env.MOJITO_PASSWORD || process.env.CEC_PASSWORD!;

        console.warn(`[ReportingPage] 🔐 Desafío SSO detectado. Re-login como: ${reloginUser.slice(0, 15)}...`);

        await ssoInput.click({ clickCount: 3 });
        await this.page.keyboard.press('Backspace');
        await ssoInput.type(reloginUser, { delay: 50 });

        const passInput = this.page.locator('#passwordInput');
        await passInput.click({ clickCount: 3 });
        await this.page.keyboard.press('Backspace');
        await passInput.type(reloginPass, { delay: 50 });

        await this.page.locator('.body_login_submit').click();
        await this.page.waitForLoadState('networkidle', { timeout: 30000 });
        console.log('[ReportingPage] ✅ Re-autenticación SSO completada.');
    }

    /**
     * Verifica que el reporte cargó correctamente con datos visibles.
     * Retorna el número de filas de la tabla como indicador de salud.
     */
    async verifyReportLoaded() {
        console.log('[ReportingPage] Verificando carga del reporte...');

        // Esperar la sección de Totales
        await this.page.locator('text=Totales').waitFor({ state: 'visible', timeout: 30000 });

        // Verificar KPI principal
        const totalOrdenesKpi = this.page.locator('text=Total de Órdenes').first();
        await totalOrdenesKpi.waitFor({ state: 'visible', timeout: 10000 });
        console.log('[ReportingPage] ✅ KPI "Total de Órdenes" visible.');

        // Verificar tabla de datos
        const table = this.page.locator('table').first();
        await table.waitFor({ state: 'visible', timeout: 15000 });
        const rowCount = await this.page.locator('table tbody tr').count();
        console.log(`[ReportingPage] ✅ Tabla cargada con ${rowCount} filas.`);

        return { rowCount };
    }

    /**
     * Extrae los valores de los KPIs del reporte.
     * Maneja el formato "329 / 329" devolviendo el primer número.
     */
    async getKpiValues(): Promise<Record<string, string>> {
        console.log('[ReportingPage] Extrayendo KPIs...');
        const kpis: Record<string, string> = {};

        try {
            const label = this.page.locator('text=Total de Órdenes').first();
            await label.waitFor({ state: 'visible', timeout: 15000 });

            // El número está en el contenedor padre
            const container = await label.locator('xpath=../..').textContent();
            if (!container) return kpis;

            console.log(`[ReportingPage] KPI raw: "${container.trim()}"`);

            // Formato "329 / 329" → tomar el primer número
            const slashMatch = container.match(/(\d+)\s*\/\s*(\d+)/);
            if (slashMatch) {
                kpis['totalOrdenes'] = slashMatch[1];
            } else {
                // Fallback: cualquier número en el texto
                const numMatch = container.match(/(\d+)/);
                if (numMatch) kpis['totalOrdenes'] = numMatch[1];
            }

            console.log(`[ReportingPage] ✅ Total de Órdenes: ${kpis['totalOrdenes']}`);
        } catch (e: any) {
            console.error(`[ReportingPage] ❌ Error extrayendo KPIs: ${e.message}`);
        }

        return kpis;
    }

    /**
     * Selecciona un rango de fecha predefinido en el selector Ant Design.
     */
    async selectDateRange(range: string) {
        console.log(`[ReportingPage] Seleccionando rango: "${range}"...`);

        const datePicker = this.page.locator('.ant-picker-range, [placeholder*="Fecha"]').first();
        await datePicker.click();

        const option = this.page
            .locator(`.ant-picker-presets li:has-text("${range}"), .ant-tag:has-text("${range}")`)
            .first();

        if (await option.isVisible()) {
            await option.click();
            await this.page.waitForLoadState('networkidle');
            await this.page.waitForTimeout(2000);
            console.log(`[ReportingPage] ✅ Rango "${range}" seleccionado.`);
        } else {
            console.warn(`[ReportingPage] ⚠️ Opción "${range}" no encontrada en el picker.`);
        }
    }

    /**
     * Intenta exportar el reporte a Excel. Retorna el objeto Download o null si falla.
     */
    async exportToExcel() {
        console.log('[ReportingPage] Exportando a Excel...');

        const excelBtn = this.page.locator('button:has(img[alt="file-excel"])').first();
        const headerDownload = this.page.locator('button:has(img[alt="download"])').first();

        const targetBtn = (await excelBtn.isVisible()) ? excelBtn : headerDownload;

        if (!(await targetBtn.isVisible())) {
            console.warn('[ReportingPage] ⚠️ Botón de exportación no encontrado.');
            return null;
        }

        const downloadPromise = this.page.waitForEvent('download', { timeout: 30000 });
        await targetBtn.click();

        try {
            const download = await downloadPromise;
            console.log(`[ReportingPage] ✅ Archivo descargado: ${download.suggestedFilename()}`);
            return download;
        } catch {
            console.warn('[ReportingPage] ⚠️ Descarga no completada (posible popup de confirmación).');
            return null;
        }
    }

    /**
     * Obtiene el texto de la primera celda de datos en la tabla (Ant Design).
     * Omite la fila fantasma que genera el nz-disable-td.
     */
    async getFirstCellValue(): Promise<string> {
        const cell = this.page.locator('table tbody tr:nth-child(2) td').first();
        await cell.waitFor({ state: 'visible', timeout: 15000 });
        return cell.innerText();
    }
}
