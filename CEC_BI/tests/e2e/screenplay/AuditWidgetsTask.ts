import { Actor, Task } from '../../../../common/screenplay/Screenplay';
import { expect } from '@playwright/test';
import { DashboardPage } from '../pages/DashboardPage';
import { BaseClient } from '../../../../common/BaseClient';

/**
 * Tarea: Auditar Widgets de Negocio
 * Realiza una comparación híbrida entre los valores de la UI y los datos del Backend.
 */
export class AuditWidgetsTask implements Task {
    private client?: BaseClient;

    static verifyIntegrity() {
        return new AuditWidgetsTask();
    }

    async performAs(actor: Actor): Promise<void> {
        const page = actor.page;
        const dashboard = new DashboardPage(page);
        
        // 1. Capturar Valores de la UI mediante POM
        console.log('[AUDIT] Extrayendo valores de la UI...');
        const uiUsers = await dashboard.getKpiValue(dashboard.totalUsersCard);
        const uiReports = await dashboard.getKpiValue(dashboard.totalReportsCard);
        const uiIntegrations = await dashboard.getKpiValue(dashboard.totalIntegrationsCard);
        const uiRoles = await dashboard.getKpiValue(dashboard.totalRolesCard);
        
        console.log(`[AUDIT] UI -> Usuarios: ${uiUsers}, Reportes: ${uiReports}, Integraciones: ${uiIntegrations}, Roles: ${uiRoles}`);

        // 2. Validaciones Básicas de la UI (No deben ser cero)
        expect(uiUsers).toBeGreaterThan(0);
        expect(uiReports).toBeGreaterThan(0);
        expect(uiRoles).toBeGreaterThan(0);

        // 3. Capturar Token para validación API (Priorizando el capturado por red)
        const token = await actor.getToken();
        if (token) {
            console.log('[AUDIT] Cruze de datos: Validando contra OData API...');
            const baseUrl = process.env.CEC_BASE_URL!;
            const client = new BaseClient(actor.page.request, token, baseUrl);
            
            // 3a. Usuarios Totales
            const usersCountRes = await client.get('/odata/UserAccounts/$count');
            if (usersCountRes.status() === 200) {
                const apiUsers = parseInt(await usersCountRes.text(), 10);
                console.log(`[AUDIT] Cruze Usuarios -> UI: ${uiUsers}, API: ${apiUsers}`);
                expect(uiUsers, 'El conteo de Usuarios en la UI no coincide con la API').toBe(apiUsers);
            }

            // 3b. Reportes Totales
            const reportsCountRes = await client.get('/odata/Reports/$count');
            if (reportsCountRes.status() === 200) {
                const apiReports = parseInt(await reportsCountRes.text(), 10);
                console.log(`[AUDIT] Cruze Reportes -> UI: ${uiReports}, API: ${apiReports}`);
                expect(uiReports, 'El conteo de Reportes en la UI no coincide con la API').toBe(apiReports);
            }

            // 3c. Roles Definidos
            const rolesCountRes = await client.get('/odata/Roles/$count');
            if (rolesCountRes.status() === 200) {
                const apiRoles = parseInt(await rolesCountRes.text(), 10);
                console.log(`[AUDIT] Cruze Roles -> UI: ${uiRoles}, API: ${apiRoles}`);
                expect(uiRoles, 'El conteo de Roles en la UI no coincide con la API').toBe(apiRoles);
            }

            console.log('[AUDIT] ✅ Cruze de datos (Audit Híbrida) completado exitosamente.');
        } else {
            console.warn('[AUDIT] ⚠️ No se capturó token de red. Omitiendo validación API cruzada.');
        }
    }
}
