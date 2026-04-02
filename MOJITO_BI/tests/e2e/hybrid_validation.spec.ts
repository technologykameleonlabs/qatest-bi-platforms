import { test, expect } from '@playwright/test';
import { Actor } from '../../../common/screenplay/Screenplay';
import { LoginToMojito } from './screenplay/LoginTask';
import { FilterReport } from './screenplay/FilterReportTask';
import { ValidateDataIntegrity } from './screenplay/ValidateDataIntegrityTask';
import { ExportReport } from './screenplay/ExportReportTask';

test.describe('MOJITO BI E2E Hybrid Validation', () => {
    test('Validar integridad de datos (API vs UI) y exportación exitosa', async ({ page }) => {
        test.setTimeout(120000); // Dar más tiempo para el flujo SSO completo
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
        // Usamos el endpoint OData de Fulfillments que suele coincidir con "Total de Órdenes" en Mojito BI
        await analyst.attemptsTo(
            ValidateDataIntegrity.againstApi('/odata/Fulfillments/$count') 
        );

        // 4. Exportación
        await analyst.attemptsTo(
            ExportReport.toFile()
        );

        console.log('🎉 FLUJO HÍBRIDO COMPLETADO: Datos validados y reporte exportado.');
    });
});
