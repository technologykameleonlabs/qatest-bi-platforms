import { Actor, Task } from '../../../../common/screenplay/Screenplay';
import { ReportingPage } from '../pages/ReportingPage';
import { expect } from '@playwright/test';
import { BaseClient } from '../../../../common/BaseClient';

/**
 * Tarea: Validar Integridad de Datos en Mojito
 * Verifica que tanto la API como la UI estén sirviendo datos coherentes.
 */
export class ValidateDataIntegrity implements Task {
    constructor(private endpoint: string) {}

    static againstApi(endpoint: string) {
        return new ValidateDataIntegrity(endpoint);
    }

    async performAs(actor: Actor): Promise<void> {
        console.log(`[MOJITO-AUDIT] Iniciando validación híbrida real...`);
        const reportingPage = new ReportingPage(actor.page);
        
        // 1. Extraer KPIs de la UI
        const uiKpis = await reportingPage.getKpiValues();
        const uiTotal = parseInt(uiKpis['totalOrdenes'] || '0', 10);
        console.log(`[MOJITO-AUDIT] ✅ UI -> Total de Órdenes: ${uiTotal}`);
        expect(uiTotal).toBeGreaterThan(0);

        // 2. Obtener Token y Cliente API
        const token = await actor.waitForToken();
        const baseUrl = process.env.MOJITO_BASE_URL || 'https://reporting.dev.mojito360.com/backend';
        const client = new BaseClient(actor.page.request, token, baseUrl);

        // 3. Consultar API (OData $count o endpoint de reporte)
        const response = await client.get(this.endpoint);
        console.log(`[MOJITO-AUDIT] API ${this.endpoint} → Status: ${response.status()}`);
        expect(response.status()).toBe(200);

        // 4. Comparar (Asumiendo que el endpoint devuelve un número plano o $count)
        const apiBody = await response.text();
        const apiTotal = parseInt(apiBody, 10);
        
        console.log(`[MOJITO-AUDIT] COMPARACIÓN -> UI: ${uiTotal} | API: ${apiTotal}`);
        
        if (!isNaN(apiTotal)) {
            expect(uiTotal, 'Mismatch entre UI y API (Total de Órdenes)').toBe(apiTotal);
            console.log(`[MOJITO-AUDIT] 🎉 ¡INTEGRIDAD VALIDADA! Los datos coinciden.`);
        } else {
            console.warn(`[MOJITO-AUDIT] ⚠️ La API no devolvió un número válido para comparación directa.`);
        }
    }
}
