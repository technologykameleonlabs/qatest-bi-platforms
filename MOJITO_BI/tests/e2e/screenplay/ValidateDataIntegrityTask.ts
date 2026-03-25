import { Actor, Task } from '../../../../common/screenplay/Screenplay';
import { ReportingPage } from '../pages/ReportingPage';
import { expect } from '@playwright/test';
import { BaseClient } from '../../../../common/BaseClient';

/**
 * Tarea: Validar Integridad de Datos en Mojito
 * Compara un valor de la UI con el resultado de una petición API.
 */
export class ValidateDataIntegrity implements Task {
    constructor(private endpoint: string) {}

    static againstApi(endpoint: string) {
        return new ValidateDataIntegrity(endpoint);
    }

    async performAs(actor: Actor): Promise<void> {
        console.log(`[MOJITO-AUDIT] Iniciando validación contra endpoint: ${this.endpoint}`);
        const reportingPage = new ReportingPage(actor.page);
        
        // 1. Asegurar Token mediante Red Interceptor
        const token = await actor.waitForToken();
        const client = new BaseClient(actor.page.request, token, process.env.CEC_BASE_URL!, '1');

        // 2. Obtener datos de la UI (desde POM)
        const uiValue = await reportingPage.getFirstCellValue();
        console.log(`[MOJITO-AUDIT] Valor detectado en UI (Grilla): ${uiValue}`);

        // 3. Obtener datos de la API
        const response = await client.get(this.endpoint);
        expect(response.status()).toBe(200);
        
        const json = await response.json();
        const jsonString = JSON.stringify(json);
        
        // 4. Verificación Híbrida: El valor visual debe existir en el set de datos del backend
        expect(jsonString, `El valor UI [${uiValue}] no se encontró en la respuesta API`).toContain(uiValue);
        
        console.log(`[MOJITO-AUDIT] ✅ Integridad confirmada para ${this.endpoint}`);
    }
}
