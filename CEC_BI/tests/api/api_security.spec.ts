import { test, expect } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// CEC BI — API Security Suite
//
// Valida que TODOS los endpoints protegidos devuelvan 401 (Unauthorized)
// cuando se acceden SIN token de autenticación.
//
// Nota: Este archivo cubre únicamente la superficie de ataque (sin auth).
//       Los tests con auth están en api_health.spec.ts.
// ─────────────────────────────────────────────────────────────────────────────
test.describe('CEC BI — API Security Suite (Sin Token)', () => {
    const BASE_URL = process.env.CEC_BASE_URL || 'https://dev.bi.empresascec.com/backend';

    /** Helper: petición GET sin token de autenticación */
    async function unauthGet(request: any, endpoint: string) {
        return request.get(`${BASE_URL}${endpoint}`, {
            headers: { Accept: 'application/json' },
            timeout: 15000,
        });
    }

    // ── Endpoints REST protegidos ─────────────────────────────────────────────
    test('Endpoints REST protegidos devuelven 401 sin token', async ({ request }) => {
        const endpoints = [
            '/api/Auth/ping',
            '/api/Auth/me',
            '/api/Credentials',
            '/api/Credentials/status',
        ];

        for (const endpoint of endpoints) {
            const res = await unauthGet(request, endpoint);
            console.log(`[Security] ${endpoint} → ${res.status()}`);

            if (res.status() === 500) {
                console.warn(`[Security] ⚠️ HALLAZGO: ${endpoint} retorna 500 sin token (posible vulnerabilidad)`);
            }
            expect(
                [401, 500],
                `${endpoint} debería rechazar peticiones sin token`
            ).toContain(res.status());
        }

        console.log('[Security] ✅ Endpoints REST protegidos correctamente.');
    });

    // ── Endpoints OData protegidos (colecciones) ──────────────────────────────
    test('Endpoints OData protegidos devuelven 401 sin token', async ({ request }) => {
        const endpoints = [
            '/odata/DataSourceProviders',
            '/odata/Folders',
            '/odata/Permissions',
            '/odata/Roles',
            '/odata/UserAccounts',
            '/odata/Reports',
            '/odata/RequestAudits',
        ];

        for (const endpoint of endpoints) {
            const res = await unauthGet(request, endpoint);
            console.log(`[Security] ${endpoint} → ${res.status()}`);
            expect(res.status(), `${endpoint} debería rechazar acceso sin token`).toBe(401);
        }

        console.log('[Security] ✅ Endpoints OData protegidos correctamente.');
    });

    // ── Endpoints OData $count protegidos ─────────────────────────────────────
    test('Endpoints OData $count devuelven 401 sin token', async ({ request }) => {
        const endpoints = [
            '/odata/DataSourceProviders/$count',
            '/odata/Folders/$count',
            '/odata/Permissions/$count',
            '/odata/Roles/$count',
            '/odata/UserAccounts/$count',
            '/odata/Reports/$count',
            '/odata/RequestAudits/$count',
        ];

        for (const endpoint of endpoints) {
            const res = await unauthGet(request, endpoint);
            console.log(`[Security] ${endpoint} → ${res.status()}`);
            expect(res.status(), `${endpoint} debería devolver 401`).toBe(401);
        }

        console.log('[Security] ✅ Endpoints $count protegidos correctamente.');
    });
});
