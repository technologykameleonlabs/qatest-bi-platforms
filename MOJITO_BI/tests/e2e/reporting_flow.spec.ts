import { test, expect } from '@playwright/test';
import { Actor } from '../../../common/screenplay/Screenplay';
import { FilterReport } from './screenplay/FilterReportTask';
import { LoginToMojito } from './screenplay/LoginTask';
import { ValidateDataIntegrity } from './screenplay/ValidateDataIntegrityTask';
import { ExportReport } from './screenplay/ExportReportTask';

test.describe('MOJITO BI - Flujo Completo de Auditoría', () => {
    test('Validación Híbrida de Datos y Exportación en Mojito', async ({ page }) => {
        const analyst = Actor.named('MojitoAnalyst', page);

        // 1. Autenticación con Red Interceptor
        await analyst.attemptsTo(
            LoginToMojito.withCredentials(process.env.CEC_USERNAME!, process.env.CEC_PASSWORD!)
        );

        // 2. Filtrado y Carga de Datos
        console.log('[AUDIT] Aplicando filtros de tiempo...');
        await analyst.attemptsTo(
            FilterReport.forDateRange('Last 30 Days')
        );

        // 3. Validación de Integridad (UI vs Backend)
        // Usamos un endpoint base que sabemos que responde OData folders/providers para esta demo
        // o uno de reportes si tenemos el key.
        console.log('[AUDIT] Ejecutando validación de integridad híbrida...');
        await analyst.attemptsTo(
            ValidateDataIntegrity.againstApi('/odata/Folders')
        );

        // 4. Validación de Exportación (Download)
        console.log('[AUDIT] Validando funcionalidad de exportación...');
        await analyst.attemptsTo(
            ExportReport.toFile()
        );

        console.log('[AUDIT] ✅ Flujo Mojito BI completado con éxito.');
    });
});
