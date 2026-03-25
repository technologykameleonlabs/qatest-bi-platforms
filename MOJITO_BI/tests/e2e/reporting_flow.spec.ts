import { test, expect } from '@playwright/test';
import { Actor } from '../../../common/screenplay/Screenplay';
import { FilterReport } from './screenplay/FilterReportTask';
import { LoginToMojito } from './screenplay/LoginTask';

test.describe('MOJITO BI E2E Tests (POM + Screenplay)', () => {
    test('El usuario debe visualizar la tabla de reportes correctamente', async ({ page }) => {
        const analyst = Actor.named('ReportAnalyst', page);

        // Iniciar Sesión primero
        await analyst.attemptsTo(
            LoginToMojito.withCredentials(
                process.env.CEC_USERNAME!, // Usamos las mismas credenciales si el SSO es compartido
                process.env.CEC_PASSWORD!
            )
        );

        await analyst.attemptsTo(
            FilterReport.forDateRange('Last 30 Days')
        );

        // Verificación de existencia del grid de datos
        await expect(page.locator('.report-grid')).toBeVisible();
    });
});
