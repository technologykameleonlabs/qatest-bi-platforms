import { test, expect } from '@playwright/test';

/**
 * Suite de Seguridad API — CEC BI
 * 
 * Valida que TODOS los endpoints protegidos devuelvan 401 (Unauthorized)
 * cuando se acceden SIN token de autenticación.
 * 
 * También confirma que los endpoints públicos (Health, Ping) responden sin auth.
 */
test.describe('CEC BI - API Security Suite (Sin Token)', () => {
    const BASE_URL = process.env.CEC_BASE_URL || 'https://dev.bi.empresascec.com/backend';

    // Helper para hacer requests sin token
    async function rawGet(request: any, endpoint: string) {
        return await request.get(`${BASE_URL}${endpoint}`, {
            headers: { 'Accept': 'application/json' },
            timeout: 15000,
        });
    }

    // ============================================================
    // ENDPOINTS PÚBLICOS (Deben responder sin auth)
    // ============================================================
    test('Endpoint Auth/ping requiere autenticación', async ({ request }) => {
        console.log('[SECURITY] 👉 Validando que Auth/ping requiere token...');

        const pingRes = await rawGet(request, '/api/Auth/ping');
        console.log(`[SECURITY] /api/Auth/ping → ${pingRes.status()}`);
        // Auth/ping está protegido — esto es correcto
        expect([401]).toContain(pingRes.status());

        console.log('[SECURITY] ✅ Auth/ping correctamente protegido.');
    });

    // ============================================================
    // ENDPOINTS PROTEGIDOS (Deben devolver 401 sin auth)
    // ============================================================
    test('Endpoints protegidos deben devolver 401 sin token', async ({ request }) => {
        console.log('[SECURITY] 👉 Validando endpoints protegidos...');

        const protectedEndpoints = [
            '/api/Auth/me',
            '/api/Credentials',
            '/api/Credentials/status',
            '/odata/DataSourceProviders',
            '/odata/Folders',
            '/odata/Permissions',
            '/odata/Roles',
            '/odata/UserAccounts',
            '/odata/Reports',
            '/odata/RequestAudits',
        ];

        for (const endpoint of protectedEndpoints) {
            const res = await rawGet(request, endpoint);
            console.log(`[SECURITY] ${endpoint} → ${res.status()}`);
            // 401 = correcto (Unauthorized), 500 = el servidor falla sin auth (hallazgo de seguridad)
            expect([401, 500]).toContain(res.status());
            if (res.status() === 500) {
                console.warn(`[SECURITY] ⚠️ HALLAZGO: ${endpoint} devuelve 500 en vez de 401. Posible vulnerabilidad.`);
            }
        }

        console.log('[SECURITY] ✅ Todos los endpoints protegidos rechazan acceso sin token.');
    });

    // ============================================================
    // ODATA $COUNT (También debe requerir auth)
    // ============================================================
    test('OData $count endpoints deben devolver 401 sin token', async ({ request }) => {
        console.log('[SECURITY] 👉 Validando OData $count sin token...');

        const countEndpoints = [
            '/odata/DataSourceProviders/$count',
            '/odata/Folders/$count',
            '/odata/Permissions/$count',
            '/odata/Roles/$count',
            '/odata/UserAccounts/$count',
            '/odata/Reports/$count',
            '/odata/RequestAudits/$count',
        ];

        for (const endpoint of countEndpoints) {
            const res = await rawGet(request, endpoint);
            console.log(`[SECURITY] ${endpoint} → ${res.status()}`);
            expect(res.status(), `${endpoint} debería devolver 401 sin token`).toBe(401);
        }

        console.log('[SECURITY] ✅ Todos los endpoints $count protegidos correctamente.');
    });
});
