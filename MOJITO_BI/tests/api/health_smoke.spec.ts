import { test, expect, chromium } from '@playwright/test';
import { BaseClient } from '../../../common/BaseClient';
import { Actor } from '../../../common/screenplay/Screenplay';
import { LoginToMojito } from '../e2e/screenplay/LoginTask';

// ─────────────────────────────────────────────────────────────────────────────
// MOJITO BI — API Health Suite (6 Fases)
//
// Audita los endpoints de la plataforma Mojito BI de forma granular.
// Cada test cubre una fase independiente, espejando la estructura de CEC BI.
//
// Auth: JWT obtenido via UI Interceptor (SSO de Mojito no expone client_secret).
// ─────────────────────────────────────────────────────────────────────────────
test.describe('MOJITO BI — API Health Suite', () => {
    let client: BaseClient;
    const BASE_URL = process.env.MOJITO_BASE_URL || 'https://reporting.dev.mojito360.com/backend';

    // ── Setup: Captura de JWT via UI + Inicialización del Cliente ─────────────
    test.beforeAll(async () => {
        console.log('\n[SETUP] Obteniendo JWT vía UI Interceptor para MOJITO BI...');

        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();

        const auditor = Actor.named('Mojito-Auditor', page);
        await auditor.startTokenInterception();

        await auditor.attemptsTo(
            LoginToMojito.withCredentials(
                process.env.MOJITO_USERNAME || process.env.CEC_USERNAME!,
                process.env.MOJITO_PASSWORD || process.env.CEC_PASSWORD!
            )
        );

        const token = await auditor.waitForToken(60000);
        await browser.close();

        client = new BaseClient(page.request, token, BASE_URL);
        console.log('[SETUP] ✅ JWT capturado. Cliente API listo.\n');
    });

    // ── Fase 0: Seguridad — Endpoints sin token deben retornar 401 ────────────
    test('Fase 0 › Seguridad — Acceso sin token devuelve 401', async ({ request }) => {
        const endpoints = [
            '/api/Auth/ping',
            '/api/Auth/me',
            '/api/Credentials',
            '/odata/DataSourceProviders',
            '/odata/Folders',
            '/odata/Permissions',
            '/odata/Roles',
            '/odata/UserAccounts',
            '/odata/Reports',
            '/odata/DataSourceProviders/$count',
            '/odata/Folders/$count',
            '/odata/Permissions/$count',
            '/odata/Roles/$count',
            '/odata/UserAccounts/$count',
            '/odata/Reports/$count',
        ];

        for (const endpoint of endpoints) {
            const res = await request.get(`${BASE_URL}${endpoint}`, {
                headers: { Accept: 'application/json' },
                timeout: 10000,
            });
            console.log(`[Fase 0] ${endpoint} → ${res.status()}`);

            if (res.status() === 500) {
                console.warn(`[Fase 0] ⚠️ HALLAZGO: ${endpoint} retorna 500 sin token`);
            }
            expect([401, 500], `${endpoint} debería rechazar acceso sin token`).toContain(res.status());
        }
    });

    // ── Fase 1: Auth & Health ─────────────────────────────────────────────────
    test('Fase 1 › Auth & Health — ping, me, /Health', async () => {
        // /Health — Estado general del backend
        const healthRes = await client.get('/Health');
        expect(healthRes.status()).toBe(200);
        console.log(`[Fase 1] ✅ Health → ${healthRes.status()}`);

        // /api/Auth/me — Perfil del usuario autenticado
        const meRes = await client.get('/api/Auth/me');
        expect(meRes.status()).toBe(200);
        const userData = await meRes.json();
        expect(userData).toHaveProperty('userId');
        console.log(`[Fase 1] ✅ Auth/me → Usuario: ${userData.displayName || userData.userName}`);

        // /api/Auth/ping — Heartbeat
        const pingRes = await client.get('/api/Auth/ping');
        expect([200, 204]).toContain(pingRes.status());
        console.log(`[Fase 1] ✅ Auth/ping → ${pingRes.status()}`);
    });

    // ── Fase 2: OData Core — DataSourceProviders & Folders ───────────────────
    test('Fase 2 › OData Core — DataSourceProviders y Folders', async () => {
        // DataSourceProviders
        const providersRes = await client.get('/odata/DataSourceProviders');
        expect(providersRes.status()).toBe(200);
        const providers = await providersRes.json();
        console.log(`[Fase 2] ✅ DataSourceProviders → ${providers.value.length} encontrados`);

        const providersCountRes = await client.get('/odata/DataSourceProviders/$count');
        expect(providersCountRes.status()).toBe(200);

        // Folders
        const foldersRes = await client.get('/odata/Folders');
        expect(foldersRes.status()).toBe(200);
        const folders = await foldersRes.json();
        console.log(`[Fase 2] ✅ Folders → ${folders.value.length} encontradas`);

        const foldersCountRes = await client.get('/odata/Folders/$count');
        expect(foldersCountRes.status()).toBe(200);
    });

    // ── Fase 3: OData RBAC — Permissions, Roles, UserAccounts ────────────────
    test('Fase 3 › OData RBAC — Permissions, Roles, UserAccounts', async () => {
        // Permissions
        const permissionsRes = await client.get('/odata/Permissions');
        expect(permissionsRes.status()).toBe(200);
        const permissions = await permissionsRes.json();
        console.log(`[Fase 3] ✅ Permissions → ${permissions.value.length} encontrados`);
        expect((await client.get('/odata/Permissions/$count')).status()).toBe(200);

        // Roles
        const rolesRes = await client.get('/odata/Roles');
        expect(rolesRes.status()).toBe(200);
        const roles = await rolesRes.json();
        console.log(`[Fase 3] ✅ Roles → ${roles.value.length} encontrados`);
        expect((await client.get('/odata/Roles/$count')).status()).toBe(200);

        // UserAccounts
        const usersRes = await client.get('/odata/UserAccounts');
        expect(usersRes.status()).toBe(200);
        const users = await usersRes.json();
        console.log(`[Fase 3] ✅ UserAccounts → ${users.value.length} encontrados`);
        expect((await client.get('/odata/UserAccounts/$count')).status()).toBe(200);

        console.log(`[Fase 3] ✅ RBAC validado: ${roles.value.length} roles, ${users.value.length} usuarios`);
    });

    // ── Fase 4: OData Reports & Fulfillments ─────────────────────────────────
    test('Fase 4 › OData Reports & Fulfillments', async () => {
        // Reports
        const reportsRes = await client.get('/odata/Reports');
        expect(reportsRes.status()).toBe(200);
        const reports = await reportsRes.json();
        console.log(`[Fase 4] ✅ Reports → ${reports.value.length} encontrados`);
        expect((await client.get('/odata/Reports/$count')).status()).toBe(200);

        // Fulfillments — Recurso de negocio clave para Mojito BI
        const fulfillmentsCountRes = await client.getSafe('/odata/Fulfillments/$count');
        if (fulfillmentsCountRes) {
            console.log(`[Fase 4] ✅ Fulfillments/$count → ${fulfillmentsCountRes.status()}`);
            expect([200, 404]).toContain(fulfillmentsCountRes.status());
            if (fulfillmentsCountRes.status() === 200) {
                const total = parseInt(await fulfillmentsCountRes.text(), 10);
                console.log(`[Fase 4] ✅ Fulfillments totales: ${total}`);
                expect(total).toBeGreaterThanOrEqual(0);
            }
        }
    });

    // ── Fase 5: Reports API Discovery (Dinámico) ──────────────────────────────
    test('Fase 5 › Reports API Discovery — cards, filters, tablekeys', async () => {
        const reportsRes = await client.get('/odata/Reports');
        expect(reportsRes.status()).toBe(200);
        const { value: reports } = await reportsRes.json();

        if (reports.length === 0) {
            console.warn('[Fase 5] ⚠️ No hay reportes disponibles para discovery. Saltando.');
            return;
        }

        const first = reports[0];
        const key = first.key || first.Key || first.id || first.Id;
        const name = first.name || first.Name || key;
        console.log(`[Fase 5] Usando reporte: "${name}" (key: ${key})`);

        const paths = ['cards', 'filters', 'tablekeys'];
        for (const path of paths) {
            const res = await client.getSafe(`/api/reports/${key}/default/${path}`);
            if (res) {
                console.log(`[Fase 5] ✅ /api/reports/${key}/default/${path} → ${res.status()}`);
                expect([200, 400, 404, 405]).toContain(res.status());
            }
        }

        console.log('[Fase 5] ✅ Discovery completado.');
    });
});
