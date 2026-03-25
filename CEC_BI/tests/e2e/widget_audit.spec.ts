import { test } from '@playwright/test';
import { Actor } from '../../../common/screenplay/Screenplay';
import { LoginToCEC } from '../e2e/screenplay/LoginTask';
import { AuditWidgetsTask } from '../e2e/screenplay/AuditWidgetsTask';

/**
 * Suite de Auditoría de Salud del Entorno CEC BI
 * Verifica que el Dashboard principal cargue con datos íntegros y KPIs reales.
 */
test.describe('CEC BI Ecosystem Health Audit', () => {
    
    test('Auditoría Híbrida de Dashboard (Widgets + API)', async ({ page }) => {
        const admin = Actor.named('CorporateAuditor', page);

        // 1. Fase E2E: Login y navegación al Dashboard
        await admin.attemptsTo(
            LoginToCEC.withCredentials(
                process.env.CEC_USERNAME!,
                process.env.CEC_PASSWORD!
            )
        );

        // 2. Fase de Auditoría: Extracción UI y cruce con Backend
        // Verifica: Usuarios, Reportes, Integraciones y Roles.
        await admin.attemptsTo(
            AuditWidgetsTask.verifyIntegrity()
        );
        
        // 3. Captura final de evidencia
        await page.screenshot({ path: 'cec_audit_result.png', fullPage: true });
    });

});
