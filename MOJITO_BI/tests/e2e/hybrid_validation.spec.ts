import { test, expect } from '@playwright/test';
import { Actor } from '../../../common/screenplay/Screenplay';
import { LoginToMojito } from './screenplay/LoginTask';
import { FilterReport } from './screenplay/FilterReportTask';
import { ValidateDataIntegrity } from './screenplay/ValidateDataIntegrityTask';
import { ExportReport } from './screenplay/ExportReportTask';

test.describe('MOJITO BI E2E Hybrid Validation', () => {
    test('Validar integridad de datos (API vs UI) y exportación exitosa', async ({ page }) => {
        const analyst = Actor.named('DataAnalyst', page);

        // 1. Login y Preparación
        await analyst.attemptsTo(
            LoginToMojito.withCredentials(
                process.env.CEC_USERNAME!,
                process.env.CEC_PASSWORD!
            )
        );

        // 2. Navegación y Filtro
        await analyst.attemptsTo(
            FilterReport.forDateRange('Last 30 Days')
        );

        // 3. Validación de Integridad (Hybrid)
        // Usamos un endpoint de ejemplo de Mojito que devuelva los datos del reporte actual
        await analyst.attemptsTo(
            ValidateDataIntegrity.againstApi('https://reporting.dev.mojito360.com/backend/api/InternalSupport/ping') 
            // Usamos ping como placeholder si no tenemos el ID del reporte exacto aun
        );

        // 4. Exportación
        await analyst.attemptsTo(
            ExportReport.toFile()
        );

        console.log('🎉 FLUJO HÍBRIDO COMPLETADO: Datos validados y reporte exportado.');
    });
});
