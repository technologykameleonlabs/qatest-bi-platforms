import { test } from '@playwright/test';
import { Actor } from '../../../common/screenplay/Screenplay';
import { FilterReport } from './screenplay/FilterReportTask';
import { LoginToMojito } from './screenplay/LoginTask';
import { ValidateDataIntegrity } from './screenplay/ValidateDataIntegrityTask';
import { ExportReport } from './screenplay/ExportReportTask';

// ─────────────────────────────────────────────────────────────────────────────
// MOJITO BI — Flujo Completo de Auditoría
//
// Test de integración end-to-end que cubre el flujo de negocio completo:
// login → filtrado → validación de integridad UI/API → exportación.
// ─────────────────────────────────────────────────────────────────────────────
test.describe('MOJITO BI — Flujo Completo de Auditoría', () => {

    test('Validación híbrida de datos y exportación', async ({ page }) => {
        test.setTimeout(120000);

        const analyst = Actor.named('MojitoAnalyst', page);

        // 1. Autenticación via SSO con JWT interceptado
        await analyst.attemptsTo(
            LoginToMojito.withCredentials(
                process.env.MOJITO_USERNAME || process.env.CEC_USERNAME!,
                process.env.MOJITO_PASSWORD || process.env.CEC_PASSWORD!
            )
        );

        // 2. Filtrado por rango de fechas
        await analyst.attemptsTo(
            FilterReport.forDateRange('Last 30 Days')
        );

        // 3. Validación híbrida: KPI "Total de Órdenes" (UI) vs Fulfillments/$count (API)
        await analyst.attemptsTo(
            ValidateDataIntegrity.againstApi('/odata/Fulfillments/$count')
        );

        // 4. Exportar el reporte a Excel
        await analyst.attemptsTo(
            ExportReport.toFile()
        );

        console.log('✅ Flujo Mojito BI completado con éxito.');
    });

});
