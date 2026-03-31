import { test, expect } from '@playwright/test';
import { BaseAuth } from '../../../common/auth';
import { BaseClient } from '../../../common/BaseClient';

test.describe('MOJITO BI - API Global Health & Security Suite (Unified)', () => {
    let client: BaseClient;
    const BASE_URL = process.env.MOJITO_BASE_URL || 'https://reporting.dev.mojito360.com/backend';

    test.beforeAll(async ({ request }) => {
        const token = await BaseAuth.getToken(request, 'MOJITO', {
            client_id: process.env.MOJITO_CLIENT_ID || 'placeholder_id',
            client_secret: process.env.MOJITO_CLIENT_SECRET || 'placeholder_secret'
        });

        client = new BaseClient(request, token, BASE_URL);
    });

    test('Fase 0: Auditoría de Seguridad (Test Negativos sin Auth)', async ({ request }) => {
        console.log('\n[SECURITY] ══════════════════════════════════════');
        console.log('[SECURITY] 👉 FASE 0: Validando accesos sin Token en MOJITO BI (401)');
        console.log('[SECURITY] ══════════════════════════════════════');

        const protectedEndpoints = [
            '/api/Auth/ping',
            '/api/Auth/me',
            '/api/Credentials',
            '/odata/DataSourceProviders',
            '/odata/Folders',
            '/odata/Permissions',
            '/odata/Roles',
            '/odata/UserAccounts',
            '/odata/Reports',
            '/odata/DataSourceProviders/$count'
        ];

        for (const endpoint of protectedEndpoints) {
            const res = await request.get(`${BASE_URL}${endpoint}`, {
                headers: { 'Accept': 'application/json' },
                timeout: 10000,
            });
            console.log(`[SECURITY] MOJITO ${endpoint} → ${res.status()}`);
            expect([401, 500]).toContain(res.status());
        }
    });

    test('Fase 1: Verificar estado de salud global (Health y Ping)', async () => {
        const response = await client.get('/Health');
        console.log(`[AUDIT] Status de Mojito Health: ${response.status()}`);
        expect(response.status()).toBe(200);

        const pingRes = await client.get('/api/Auth/ping');
        console.log(`[AUDIT] Status de Mojito Auth/ping: ${pingRes.status()}`);
        expect([200, 204]).toContain(pingRes.status());
    });
});
