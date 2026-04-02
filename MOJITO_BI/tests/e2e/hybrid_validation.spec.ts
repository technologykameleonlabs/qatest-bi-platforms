import { test, expect } from '@playwright/test';
import { Actor } from '../../../common/screenplay/Screenplay';
import { LoginToMojito } from './screenplay/LoginTask';
import { FilterReport } from './screenplay/FilterReportTask';
import { ValidateDataIntegrity } from './screenplay/ValidateDataIntegrityTask';
import { ExportReport } from './screenplay/ExportReportTask';

// ─────────────────────────────────────────────────────────────────────────────
// MOJITO BI — Hybrid Validation (E2E + API)
//
// Flujo completo que verifica que los datos de la UI coincidan con el backend:
//   1. Login via SSO con JWT interceptado
//   2. Navegación al reporte y filtrado por rango de fecha
//   3. Comparación UI KPIs vs OData API ($count)
//   4. Exportación a Excel
// ─────────────────────────────────────────────────────────────────────────────
test.describe('MOJITO BI — Hybrid Validation (E2E + API)', () => {

    test('Integridad de datos: UI vs OData API + Exportación', async ({ page }) => {
        test.setTimeout(120000); // El flujo SSO puede tardar hasta 2 minutos

        const analyst = Actor.named('DataAnalyst', page);

        // ── 1. Login ─────────────────────────────────────────────────────────
        // Usar credenciales específicas de Mojito, con fallback a las de CEC
        await analyst.attemptsTo(
            LoginToMojito.withCredentials(
                process.env.MOJITO_USERNAME || process.env.CEC_USERNAME!,
                process.env.MOJITO_PASSWORD || process.env.CEC_PASSWORD!
            )
        );

        // ── 2. Filtrado ───────────────────────────────────────────────────────
        await analyst.attemptsTo(
            FilterReport.forDateRange('Last 30 Days')
        );

        // ── 3. Validación Híbrida ─────────────────────────────────────────────
        // Compara el KPI "Total de Órdenes" de la UI con el $count del backend
        await analyst.attemptsTo(
            ValidateDataIntegrity.againstApi('/odata/Fulfillments/$count')
        );

        // ── 4. Exportación ────────────────────────────────────────────────────
        await analyst.attemptsTo(
            ExportReport.toFile()
        );

        console.log('🎉 Flujo híbrido completado: datos validados y reporte exportado.');
    });

});
