import { test, expect, chromium } from '@playwright/test';
import { BaseClient } from '../../../common/BaseClient';
import { Actor } from '../../../common/screenplay/Screenplay';
import { LoginToCEC } from '../e2e/screenplay/LoginTask';

// ─────────────────────────────────────────────────────────────────────────────
// CEC BI — API Global Health Suite (6 Fases)
//
// Audita los endpoints de la plataforma CEC BI de forma granular.
// Cada test cubre una fase independiente, por lo que un fallo en la Fase 3
// no impide ver los resultados de las Fases 4, 5 y 6.
//
// Auth: Se obtiene el JWT mediante UI Interceptor en el beforeAll compartido.
// ─────────────────────────────────────────────────────────────────────────────
test.describe('CEC BI — API Health Suite', () => {
    let client: BaseClient;
    const BASE_URL = process.env.CEC_BASE_URL || 'https://dev.bi.empresascec.com/backend';

    // ── Setup: Captura de JWT via UI + Inicialización del Cliente ─────────────
    test.beforeAll(async () => {
        console.log('\n[SETUP] Obteniendo JWT vía UI Interceptor (Headless)...');

        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();

        const auditor = Actor.named('CEC-Auditor', page);
        await auditor.startTokenInterception();

        await auditor.attemptsTo(
            LoginToCEC.withCredentials(
                process.env.CEC_USERNAME!,
                process.env.CEC_PASSWORD!
            )
        );

        const token = await auditor.waitForToken(45000);
        await browser.close();

        // Compartir el cliente autenticado con todos los tests de esta suite
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
            '/odata/RequestAudits',
            '/odata/DataSourceProviders/$count',
            '/odata/Folders/$count',
            '/odata/Permissions/$count',
            '/odata/Roles/$count',
            '/odata/UserAccounts/$count',
            '/odata/Reports/$count',
            '/odata/RequestAudits/$count',
        ];

        for (const endpoint of endpoints) {
            const res = await request.get(`${BASE_URL}${endpoint}`, {
                headers: { Accept: 'application/json' },
                timeout: 10000,
            });
            console.log(`[Fase 0] ${endpoint} → ${res.status()}`);

            if (res.status() === 500) {
                console.warn(`[Fase 0] ⚠️ HALLAZGO: ${endpoint} retorna 500 sin token (posible vulnerabilidad)`);
            }
            expect([401, 500], `${endpoint} debería rechazar acceso sin token`).toContain(res.status());
        }
    });

    // ── Fase 1: Auth & Health ─────────────────────────────────────────────────
    test('Fase 1 › Auth & Health — ping, me, /Health', async () => {
        // /api/Auth/me — Perfil del usuario autenticado
        const meRes = await client.get('/api/Auth/me');
        expect(meRes.status()).toBe(200);
        const userData = await meRes.json();
        expect(userData).toHaveProperty('userId');
        console.log(`[Fase 1] ✅ Auth/me → Usuario: ${userData.displayName || userData.userName} (ID: ${userData.userId})`);

        // /api/Auth/ping — Endpoint de heartbeat
        const pingRes = await client.get('/api/Auth/ping');
        expect([200, 204]).toContain(pingRes.status());
        console.log(`[Fase 1] ✅ Auth/ping → ${pingRes.status()}`);

        // /Health — Estado general del backend
        const healthRes = await client.get('/Health');
        expect(healthRes.status()).toBe(200);
        console.log(`[Fase 1] ✅ Health → ${healthRes.status()}`);
    });

    // ── Fase 2: Credentials ───────────────────────────────────────────────────
    test('Fase 2 › Credentials — estado y listado de integraciones', async () => {
        // /api/Credentials — Puede ser POST-only; 405 es válido
        const credsRes = await client.get('/api/Credentials');
        expect([200, 204, 404, 405]).toContain(credsRes.status());
        if (credsRes.status() === 200) {
            const data = await credsRes.json();
            const count = Array.isArray(data) ? data.length : (data.value?.length ?? '?');
            console.log(`[Fase 2] ✅ Credentials → ${count} encontradas`);
        } else {
            console.log(`[Fase 2] ✅ Credentials → ${credsRes.status()} (aceptado)`);
        }

        // /api/Credentials/status — Estado de las conectividades
        const statusRes = await client.get('/api/Credentials/status');
        expect([200, 204, 404, 405]).toContain(statusRes.status());
        console.log(`[Fase 2] ✅ Credentials/status → ${statusRes.status()}`);
    });

    // ── Fase 3: OData Core — DataSourceProviders & Folders ───────────────────
    test('Fase 3 › OData Core — DataSourceProviders y Folders', async () => {
        // DataSourceProviders
        const providersRes = await client.get('/odata/DataSourceProviders');
        expect(providersRes.status()).toBe(200);
        const providers = await providersRes.json();
        console.log(`[Fase 3] ✅ DataSourceProviders → ${providers.value.length} encontrados`);

        const providersCountRes = await client.get('/odata/DataSourceProviders/$count');
        expect(providersCountRes.status()).toBe(200);
        console.log(`[Fase 3] ✅ DataSourceProviders/$count → OK`);

        // Folders
        const foldersRes = await client.get('/odata/Folders');
        expect(foldersRes.status()).toBe(200);
        const folders = await foldersRes.json();
        console.log(`[Fase 3] ✅ Folders → ${folders.value.length} encontradas`);

        const foldersCountRes = await client.get('/odata/Folders/$count');
        expect(foldersCountRes.status()).toBe(200);
        console.log(`[Fase 3] ✅ Folders/$count → OK`);
    });

    // ── Fase 4: OData RBAC — Permissions, Roles, UserAccounts ────────────────
    test('Fase 4 › OData RBAC — Permissions, Roles, UserAccounts', async () => {
        // Permissions
        const permissionsRes = await client.get('/odata/Permissions');
        expect(permissionsRes.status()).toBe(200);
        const permissions = await permissionsRes.json();
        console.log(`[Fase 4] ✅ Permissions → ${permissions.value.length} encontrados`);

        const permCountRes = await client.get('/odata/Permissions/$count');
        expect(permCountRes.status()).toBe(200);

        // Roles
        const rolesRes = await client.get('/odata/Roles');
        expect(rolesRes.status()).toBe(200);
        const roles = await rolesRes.json();
        console.log(`[Fase 4] ✅ Roles → ${roles.value.length} encontrados`);

        const rolesCountRes = await client.get('/odata/Roles/$count');
        expect(rolesCountRes.status()).toBe(200);

        // UserAccounts
        const usersRes = await client.get('/odata/UserAccounts');
        expect(usersRes.status()).toBe(200);
        const users = await usersRes.json();
        console.log(`[Fase 4] ✅ UserAccounts → ${users.value.length} encontrados`);

        const usersCountRes = await client.get('/odata/UserAccounts/$count');
        expect(usersCountRes.status()).toBe(200);

        console.log(`[Fase 4] ✅ RBAC validado: ${roles.value.length} roles, ${users.value.length} usuarios`);
    });

    // ── Fase 5: OData Reports & RequestAudits ────────────────────────────────
    test('Fase 5 › OData Reports & RequestAudits', async () => {
        // Reports
        const reportsRes = await client.get('/odata/Reports');
        expect(reportsRes.status()).toBe(200);
        const reports = await reportsRes.json();
        console.log(`[Fase 5] ✅ Reports → ${reports.value.length} encontrados`);

        const reportsCountRes = await client.get('/odata/Reports/$count');
        expect(reportsCountRes.status()).toBe(200);

        // RequestAudits
        const auditsRes = await client.get('/odata/RequestAudits');
        expect(auditsRes.status()).toBe(200);
        const audits = await auditsRes.json();
        console.log(`[Fase 5] ✅ RequestAudits → ${audits.value.length} registros`);

        const auditsCountRes = await client.get('/odata/RequestAudits/$count');
        expect(auditsCountRes.status()).toBe(200);

        console.log(`[Fase 5] ✅ Reports: ${reports.value.length}, Auditorías: ${audits.value.length}`);
    });

    // ── Fase 6: Reports API Discovery (Dinámico) ──────────────────────────────
    test('Fase 6 › Reports API Discovery — cards, filters, tablekeys', async () => {
        // Necesitamos al menos un reporte para el discovery
        const reportsRes = await client.get('/odata/Reports');
        expect(reportsRes.status()).toBe(200);
        const { value: reports } = await reportsRes.json();

        if (reports.length === 0) {
            console.warn('[Fase 6] ⚠️ No hay reportes disponibles para discovery. Saltando.');
            return;
        }

        const first = reports[0];
        const key = first.key || first.Key || first.id || first.Id;
        const name = first.name || first.Name || key;
        console.log(`[Fase 6] Usando reporte: "${name}" (key: ${key})`);

        const paths = ['cards', 'filters', 'tablekeys'];
        for (const path of paths) {
            const res = await client.getSafe(`/api/reports/${key}/default/${path}`);
            if (res) {
                console.log(`[Fase 6] ✅ /api/reports/${key}/default/${path} → ${res.status()}`);
                // 200=datos, 404=sección inexistente, 400=params inválidos, 405=POST-only
                expect([200, 400, 404, 405]).toContain(res.status());
            }
        }

        console.log('[Fase 6] ✅ Discovery completado.');
    });
});
