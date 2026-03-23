import { test, expect } from '@playwright/test';
import { Actor } from '../../../common/screenplay/Screenplay';
import { FilterReport } from '../screenplay/FilterReportTask';

test.describe('MOJITO BI E2E Tests (POM + Screenplay)', () => {
    test('El usuario debe visualizar la tabla de reportes correctamente', async ({ page }) => {
        const analyst = Actor.named('ReportAnalyst', page);

        await analyst.attemptsTo(
            FilterReport.forDateRange('Last 30 Days')
        );

        // Verificación de existencia del grid de datos
        await expect(page.locator('.report-grid')).toBeVisible();
    });
});
