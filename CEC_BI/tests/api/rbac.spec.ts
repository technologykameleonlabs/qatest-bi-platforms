import { test, expect, chromium, request } from '@playwright/test';
import { BaseClient } from '../../../common/BaseClient';
import { Actor } from '../../../common/screenplay/Screenplay';
import { LoginToCEC } from '../e2e/screenplay/LoginTask';

// ─────────────────────────────────────────────────────────────────────────────
// CEC BI — RBAC Security Suite
//
// Valida que el control de acceso basado en roles funcione correctamente en CEC:
//   • Fase 1: Endpoints sin token devuelven 401 Unauthorized
//   • Fase 2: Endpoints de usuario normal responden 200 con token válido
//   • Fase 3: Endpoints admin — auditoría de exposición (documentar hallazgos)
//
// Auth: JWT capturado via UI Interceptor (SSO CEC / Microsoft).
// IMPORTANTE: Suite propia de CEC BI — NO mezclar con MOJITO BI.
// ─────────────────────────────────────────────────────────────────────────────
test.describe('CEC BI — RBAC Security Suite', () => {
    let client: BaseClient;
    let unauthClient: BaseClient;
    const BASE_URL = process.env.CEC_BASE_URL || 'https://dev.bi.empresascec.com/backend';
    const COMPANY_ID = '1';

    test.beforeAll(async () => {
        test.setTimeout(180000);
        console.log('\n[CEC-RBAC] Inicializando clientes para auditoría RBAC en CEC BI...');

        // Cliente AUTENTICADO (usuario normal)
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();

        const auditor = Actor.named('CEC-RBAC', page);
        await auditor.startTokenInterception();

        try {
            await auditor.attemptsTo(
                LoginToCEC.withCredentials(
                    process.env.CEC_USERNAME!,
                    process.env.CEC_PASSWORD!
                )
            );
        } catch (e) {
            console.warn('[CEC-RBAC] ⚠️ Login visual falló, intentando capturar token de todas formas...');
        }

        const token = await auditor.waitForToken(120000);
        await browser.close();

        const requestContext = await request.newContext();
        client = new BaseClient(requestContext, token, BASE_URL, COMPANY_ID);

        // Cliente SIN AUTENTICAR (token inválido para validar 401)
        const anonContext = await request.newContext();
        unauthClient = new BaseClient(anonContext, 'invalid-token', BASE_URL, COMPANY_ID);

        console.log('[CEC-RBAC] ✅ Clientes listos. Iniciando validaciones RBAC...');
    });

    // ── Fase 1: Sin token → 401 Unauthorized ─────────────────────────────────
    test.describe('Fase 1 — Protección: Sin Token → 401', () => {
        const protectedEndpoints = [
            '/api/Reports',
            '/odata/RequestAudits',
            '/odata/Roles',
            '/odata/UserAccounts',
        ];

        for (const endpoint of protectedEndpoints) {
            test(`[Sin-Auth] ${endpoint} debe responder 401`, async () => {
                const res = await unauthClient.getSafe(endpoint);
                expect(res).not.toBeNull();
                const status = res!.status();
                console.log(`[CEC-RBAC-Fase1] ${endpoint} → ${status}`);
                expect(
                    [401, 403],
                    `Esperado 401/403, recibido ${status} en ${endpoint}`
                ).toContain(status);
            });
        }
    });

    // ── Fase 2: Con token válido → endpoints de usuario → 200 ─────────────────
    test.describe('Fase 2 — Acceso: Token Válido → 200', () => {
        const userEndpoints = [
            '/api/Auth/me',
            '/api/Auth/ping',
        ];

        for (const endpoint of userEndpoints) {
            test(`[Auth] ${endpoint} debe responder 200`, async () => {
                const res = await client.getSafe(endpoint);
                expect(res).not.toBeNull();
                const status = res!.status();
                console.log(`[CEC-RBAC-Fase2] ${endpoint} → ${status}`);
                expect(
                    status,
                    `Esperado 200, recibido ${status} en ${endpoint}`
                ).toBeGreaterThanOrEqual(200);
                expect(status).toBeLessThan(300);
            });
        }
    });

    // ── Fase 3: Endpoints Admin → auditoría de exposición ─────────────────────
    // Un 200 para usuario normal en estos endpoints es un hallazgo de seguridad.
    test.describe('Fase 3 — Auditoría: Exposición de Endpoints Admin', () => {
        const adminEndpoints = [
            '/odata/Roles',
            '/odata/UserAccounts',
            '/odata/RequestAudits',
        ];

        for (const endpoint of adminEndpoints) {
            test(`[RBAC-Audit] ${endpoint} — verificar nivel de acceso`, async () => {
                const res = await client.getSafe(endpoint);
                expect(res).not.toBeNull();
                const status = res!.status();

                if (status === 200) {
                    console.warn(`🚨 [HALLAZGO CEC-RBAC] ${endpoint} devolvió ${status} para usuario normal — revisar permisos`);
                } else {
                    console.log(`✅ [CEC-RBAC-OK] ${endpoint} → ${status} (acceso denegado correctamente)`);
                }

                // El test pasa siempre — el resultado se analiza en el log/reporte
                expect(res).not.toBeNull();
            });
        }
    });
});
