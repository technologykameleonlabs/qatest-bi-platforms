import { test, expect } from '@playwright/test';
import { BaseClient } from '../../../common/BaseClient';
import { AuthProvider } from '../../../common/AuthProvider';

test.describe('CEC BI - API Global Health Suite (6 Fases)', () => {
    let client: BaseClient;
    let jwt: string;

    test.beforeAll(async ({ request }) => {
        console.log('[AUDIT] Obteniendo JWT directamente via API...');
        
        const token = await AuthProvider.getToken(
            'https://sso.pre.mojito360.com',
            process.env.CEC_CLIENT_ID!,
            process.env.CEC_USERNAME!,
            process.env.CEC_PASSWORD!
        );

        if (!token) {
            throw new Error('❌ Fallo crítico: No se pudo obtener el JWT del SSO.');
        }

        jwt = token;
        // Inicializar cliente con el token capturado
        client = new BaseClient(request, jwt, process.env.CEC_BASE_URL!);
        console.log('[AUDIT] ✅ Cliente API Inicializado con éxito.');
    });

    test('Ejecutar Auditoría Completa de Endpoints (Fases 1-6)', async ({ page }) => {
        // ============================================================
        // FASE 1: AUTH & HEALTH
        // ============================================================
        console.log('\n[AUDIT] ══════════════════════════════════════');
        console.log('[AUDIT] 👉 FASE 1: Auth & Health');
        console.log('[AUDIT] ══════════════════════════════════════');

        // 1a. /api/Auth/me
        const authRes = await client.get('/api/Auth/me');
        expect(authRes.status()).toBe(200);
        const userData = await authRes.json();
        expect(userData).toHaveProperty('userId');
        console.log(`[AUDIT] ✅ Auth/me → Perfil: ${userData.displayName || userData.userName}`);

        // 1b. /api/Auth/ping
        const pingRes = await client.get('/api/Auth/ping');
        console.log(`[AUDIT] ✅ Auth/ping → Status: ${pingRes.status()}`);
        expect([200, 204]).toContain(pingRes.status());

        // 1c. /Health
        const healthRes = await client.get('/Health');
        console.log(`[AUDIT] ✅ Health → Status: ${healthRes.status()}`);
        expect(healthRes.status()).toBe(200);

        // ============================================================
        // FASE 2: CREDENTIALS
        // ============================================================
        console.log('\n[AUDIT] ══════════════════════════════════════');
        console.log('[AUDIT] 👉 FASE 2: Credentials');
        console.log('[AUDIT] ══════════════════════════════════════');

        // 2a. /api/Credentials (puede ser POST-only, 405 es válido)
        const credsRes = await client.get('/api/Credentials');
        console.log(`[AUDIT] Credentials → Status: ${credsRes.status()}`);
        expect([200, 204, 404, 405]).toContain(credsRes.status());
        if (credsRes.status() === 200) {
            const credsData = await credsRes.json();
            const count = Array.isArray(credsData) ? credsData.length : (credsData.value?.length ?? '?');
            console.log(`[AUDIT] ✅ Credentials: ${count} encontradas.`);
        } else if (credsRes.status() === 405) {
            console.log(`[AUDIT] ⚠️ Credentials: Solo acepta POST (405). Sondeo exitoso.`);
        }

        // 2b. /api/Credentials/status
        const credsStatusRes = await client.get('/api/Credentials/status');
        console.log(`[AUDIT] ✅ Credentials/status → Status: ${credsStatusRes.status()}`);
        expect([200, 204, 404, 405]).toContain(credsStatusRes.status());

        // ============================================================
        // FASE 3: ODATA CORE (Providers & Folders)
        // ============================================================
        console.log('\n[AUDIT] ══════════════════════════════════════');
        console.log('[AUDIT] 👉 FASE 3: OData Core (Providers & Folders)');
        console.log('[AUDIT] ══════════════════════════════════════');

        // 3a. /odata/DataSourceProviders
        const providersRes = await client.get('/odata/DataSourceProviders');
        expect(providersRes.status()).toBe(200);
        const providersData = await providersRes.json();
        console.log(`[AUDIT] ✅ Providers: ${providersData.value.length} encontrados.`);

        // 3b. /odata/DataSourceProviders/$count
        const providersCountRes = await client.get('/odata/DataSourceProviders/$count');
        console.log(`[AUDIT] ✅ Providers/$count → Status: ${providersCountRes.status()}`);
        expect(providersCountRes.status()).toBe(200);

        // 3c. /odata/Folders
        const foldersRes = await client.get('/odata/Folders');
        expect(foldersRes.status()).toBe(200);
        const foldersData = await foldersRes.json();
        console.log(`[AUDIT] ✅ Folders: ${foldersData.value.length} encontradas.`);

        // 3d. /odata/Folders/$count
        const foldersCountRes = await client.get('/odata/Folders/$count');
        console.log(`[AUDIT] ✅ Folders/$count → Status: ${foldersCountRes.status()}`);
        expect(foldersCountRes.status()).toBe(200);

        // ============================================================
        // FASE 4: ODATA RBAC (Permissions, Roles, UserAccounts)
        // ============================================================
        console.log('\n[AUDIT] ══════════════════════════════════════');
        console.log('[AUDIT] 👉 FASE 4: OData RBAC (Permissions, Roles, Users)');
        console.log('[AUDIT] ══════════════════════════════════════');

        // 4a. /odata/Permissions
        const permissionsRes = await client.get('/odata/Permissions');
        expect(permissionsRes.status()).toBe(200);
        const permissionsData = await permissionsRes.json();
        console.log(`[AUDIT] ✅ Permissions: ${permissionsData.value.length} encontrados.`);

        // 4b. /odata/Permissions/$count
        const permCountRes = await client.get('/odata/Permissions/$count');
        console.log(`[AUDIT] ✅ Permissions/$count → Status: ${permCountRes.status()}`);
        expect(permCountRes.status()).toBe(200);

        // 4c. /odata/Roles
        const rolesRes = await client.get('/odata/Roles');
        expect(rolesRes.status()).toBe(200);
        const rolesData = await rolesRes.json();
        console.log(`[AUDIT] ✅ Roles: ${rolesData.value.length} encontrados.`);

        // 4d. /odata/Roles/$count
        const rolesCountRes = await client.get('/odata/Roles/$count');
        console.log(`[AUDIT] ✅ Roles/$count → Status: ${rolesCountRes.status()}`);
        expect(rolesCountRes.status()).toBe(200);

        // 4e. /odata/UserAccounts
        const usersRes = await client.get('/odata/UserAccounts');
        expect(usersRes.status()).toBe(200);
        const usersData = await usersRes.json();
        console.log(`[AUDIT] ✅ UserAccounts: ${usersData.value.length} encontrados.`);

        // 4f. /odata/UserAccounts/$count
        const usersCountRes = await client.get('/odata/UserAccounts/$count');
        console.log(`[AUDIT] ✅ UserAccounts/$count → Status: ${usersCountRes.status()}`);
        expect(usersCountRes.status()).toBe(200);

        // ============================================================
        // FASE 5: ODATA REPORTS & AUDITS
        // ============================================================
        console.log('\n[AUDIT] ══════════════════════════════════════');
        console.log('[AUDIT] 👉 FASE 5: OData Reports & RequestAudits');
        console.log('[AUDIT] ══════════════════════════════════════');

        // 5a. /odata/Reports
        const reportsRes = await client.get('/odata/Reports');
        expect(reportsRes.status()).toBe(200);
        const reportsData = await reportsRes.json();
        console.log(`[AUDIT] ✅ Reports: ${reportsData.value.length} encontrados.`);

        // 5b. /odata/Reports/$count
        const reportsCountRes = await client.get('/odata/Reports/$count');
        console.log(`[AUDIT] ✅ Reports/$count → Status: ${reportsCountRes.status()}`);
        expect(reportsCountRes.status()).toBe(200);

        // 5c. /odata/RequestAudits
        const auditsRes = await client.get('/odata/RequestAudits');
        expect(auditsRes.status()).toBe(200);
        const auditsData = await auditsRes.json();
        console.log(`[AUDIT] ✅ RequestAudits: ${auditsData.value.length} encontrados.`);

        // 5d. /odata/RequestAudits/$count
        const auditsCountRes = await client.get('/odata/RequestAudits/$count');
        console.log(`[AUDIT] ✅ RequestAudits/$count → Status: ${auditsCountRes.status()}`);
        expect(auditsCountRes.status()).toBe(200);

        // ============================================================
        // FASE 6: REPORTS API DISCOVERY (Dinámico)
        // ============================================================
        console.log('\n[AUDIT] ══════════════════════════════════════');
        console.log('[AUDIT] 👉 FASE 6: Reports API Discovery (Dinámico)');
        console.log('[AUDIT] ══════════════════════════════════════');

        // Usar el primer reporte obtenido de la Fase 5 para sondar la API de reportes
        if (reportsData.value.length > 0) {
            const firstReport = reportsData.value[0];
            const reportKey = firstReport.key || firstReport.Key || firstReport.id || firstReport.Id;
            console.log(`[AUDIT] Usando reporte "${firstReport.name || firstReport.Name || reportKey}" para discovery...`);

            if (reportKey) {
                // 6a. Intentar obtener secciones/cards del reporte
                const cardsUrl = `/api/reports/${reportKey}/default/cards`;
                const cardsRes = await client.get(cardsUrl);
                console.log(`[AUDIT] Reports/cards → Status: ${cardsRes.status()}`);
                // 200=datos, 404=sección inexistente, 400=params inválidos, 405=POST-only
                expect([200, 400, 404, 405]).toContain(cardsRes.status());

                // 6b. Intentar obtener filtros
                const filtersUrl = `/api/reports/${reportKey}/default/filters`;
                const filtersRes = await client.get(filtersUrl);
                console.log(`[AUDIT] Reports/filters → Status: ${filtersRes.status()}`);
                expect([200, 400, 404, 405]).toContain(filtersRes.status());

                // 6c. Intentar obtener tablekeys
                const tablekeysUrl = `/api/reports/${reportKey}/default/tablekeys`;
                const tablekeysRes = await client.get(tablekeysUrl);
                console.log(`[AUDIT] Reports/tablekeys → Status: ${tablekeysRes.status()}`);
                expect([200, 400, 404, 405]).toContain(tablekeysRes.status());
            }
        } else {
            console.log('[AUDIT] ⚠️ No hay reportes disponibles para discovery dinámico.');
        }

        // ============================================================
        // RESUMEN FINAL
        // ============================================================
        console.log('\n[AUDIT] ══════════════════════════════════════');
        console.log('[AUDIT] 🎉 AUDITORÍA COMPLETA (6 FASES) FINALIZADA');
        console.log('[AUDIT] ══════════════════════════════════════');
    });
});
