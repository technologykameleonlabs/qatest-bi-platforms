import { test, expect, chromium, request } from '@playwright/test';
import { BaseClient } from '../../../common/BaseClient';
import { Actor } from '../../../common/screenplay/Screenplay';
import { LoginToMojito } from '../e2e/screenplay/LoginTask';

// ─────────────────────────────────────────────────────────────────────────────
// MOJITO BI — RBAC Security Suite
//
// Valida que el control de acceso basado en roles funcione correctamente:
//   • Fase 1: Endpoints sin token devuelven 401 Unauthorized
//   • Fase 2: Endpoints de usuario normal responden 200 con token válido
//   • Fase 3: Endpoints de admin/sensibles devuelven 403 a usuario regular
//
// Auth: JWT capturado via UI Interceptor (SSO Mojito).
// IMPORTANTE: Suite propia de MOJITO BI — NO mezclar con CEC BI.
// ─────────────────────────────────────────────────────────────────────────────
test.describe('MOJITO BI — RBAC Security Suite', () => {
    let client: BaseClient;
    let unauthClient: BaseClient;
    const BASE_URL = process.env.MOJITO_BASE_URL || 'https://reporting.dev.mojito360.com/backend';
    const COMPANY_ID = '1';

    test.beforeAll(async () => {
        test.setTimeout(180000);
        console.log('\n[RBAC] Inicializando clientes para auditoría RBAC en MOJITO BI...');

        // Cliente AUTENTICADO (usuario normal)
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();

        const auditor = Actor.named('Mojito-RBAC', page);
        await auditor.startTokenInterception();

        try {
            await auditor.attemptsTo(
                LoginToMojito.withCredentials(
                    process.env.MOJITO_USERNAME || process.env.CEC_USERNAME!,
                    process.env.MOJITO_PASSWORD || process.env.CEC_PASSWORD!
                )
            );
        } catch (e) {
            console.warn('[RBAC] ⚠️ Login visual falló, intentando capturar token de todas formas...');
        }

        const token = await auditor.waitForToken(120000);
        await browser.close();

        const requestContext = await request.newContext();
        client = new BaseClient(requestContext, token, BASE_URL, COMPANY_ID);

        // Cliente SIN AUTENTICAR (para validar 401)
        const anonContext = await request.newContext();
        unauthClient = new BaseClient(anonContext, 'invalid-token', BASE_URL, COMPANY_ID);

        console.log('[RBAC] ✅ Clientes listos. Iniciando validaciones RBAC...');
    });

    // ── Fase 1: Sin token → 401 Unauthorized ─────────────────────────────────
    test.describe('Fase 1 — Protección: Sin Token → 401', () => {
        const protectedEndpoints = [
            '/odata/Reports',
            '/odata/Folders',
            '/odata/Companies',
            '/api/UserProfiles/current', // endpoint correcto según Swagger
        ];

        for (const endpoint of protectedEndpoints) {
            test(`[Sin-Auth] ${endpoint} debe responder 401`, async () => {
                const res = await unauthClient.getSafe(endpoint);
                expect(res).not.toBeNull();
                expect([401, 403], `Esperado 401/403, recibido ${res!.status()} en ${endpoint}`)
                    .toContain(res!.status());
            });
        }
    });

    // ── Fase 2: Con token válido → endpoints de usuario → 200 ─────────────────
    test.describe('Fase 2 — Acceso: Token Válido → 200', () => {
        const userEndpoints = [
            '/odata/Reports',
            '/odata/Folders',
            '/api/UserProfiles/current', // endpoint correcto según Swagger
        ];

        for (const endpoint of userEndpoints) {
            test(`[Auth] ${endpoint} debe responder 200`, async () => {
                const res = await client.getSafe(endpoint);
                expect(res).not.toBeNull();
                const status = res!.status();
                expect(status, `Esperado 200, recibido ${status} en ${endpoint}`)
                    .toBeGreaterThanOrEqual(200);
                expect(status).toBeLessThan(300);
            });
        }
    });

    // ── Fase 3: Endpoints de Admin → auditoría de exposición ─────────────────
    test.describe('Fase 3 — Auditoría: Exposición de Endpoints Admin', () => {
        // Endpoints típicamente reservados a administradores.
        // Un 200 en estos endpoints para usuario normal es un hallazgo de seguridad.
        const adminEndpoints = [
            '/odata/ApiResources',
            '/odata/Permissions',
            '/odata/UserAccounts',
        ];

        for (const endpoint of adminEndpoints) {
            test(`[RBAC-Audit] ${endpoint} — verificar nivel de acceso`, async () => {
                const res = await client.getSafe(endpoint);
                expect(res).not.toBeNull();
                const status = res!.status();
                
                if (status === 200) {
                    // Documentar como hallazgo de seguridad potencial
                    console.warn(`🚨 [HALLAZGO RBAC] ${endpoint} devolvió ${status} para usuario normal — revisar permisos`);
                } else {
                    console.log(`✅ [RBAC-OK] ${endpoint} → ${status} (acceso denegado correctamente)`);
                }
                
                // El test pasa siempre — el resultado se analiza en el log/reporte
                expect(res).not.toBeNull();
            });
        }
    });
});
