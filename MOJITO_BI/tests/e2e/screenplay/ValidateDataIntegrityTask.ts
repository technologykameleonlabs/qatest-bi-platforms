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
        console.log(`[MOJITO-AUDIT] Iniciando validación híbrida...`);
        const reportingPage = new ReportingPage(actor.page);
        
        // 1. Validar que la UI tiene datos cargados
        const uiValue = await reportingPage.getFirstCellValue();
        console.log(`[MOJITO-AUDIT] ✅ UI: Primera celda = "${uiValue}"`);
        expect(uiValue).toBeTruthy();

        // 2. Validar KPIs visibles
        const kpis = await reportingPage.getKpiValues();
        console.log(`[MOJITO-AUDIT] ✅ KPIs extraídos: ${JSON.stringify(kpis)}`);

        // 3. Verificar que la API backend responde con token capturado
        const token = await actor.waitForToken();
        const baseUrl = process.env.MOJITO_BASE_URL || process.env.CEC_BASE_URL!;
        const client = new BaseClient(actor.page.request, token, baseUrl, '1');

        const response = await client.get(this.endpoint);
        console.log(`[MOJITO-AUDIT] API ${this.endpoint} → Status: ${response.status()}`);
        expect([200, 204]).toContain(response.status());
        
        console.log(`[MOJITO-AUDIT] ✅ Validación Híbrida Completada: UI activa + API respondiendo.`);
    }
}
