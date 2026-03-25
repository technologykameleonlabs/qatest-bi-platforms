import { test, expect } from '@playwright/test';
import { Actor } from '../../../common/screenplay/Screenplay';
import { LoginToCEC } from '../e2e/screenplay/LoginTask';
import { BaseClient } from '../../../common/BaseClient';

test.describe('CEC BI - API Global Health Suite (Sequential)', () => {
    let actor: Actor;
    let token: string;
    let client: BaseClient;

    test('Ejecutar Auditoría Completa de Endpoints (Fases 1, 2 y 3)', async ({ page }) => {
        actor = Actor.named('CorporateAuditor', page);
        
        // --- PRE-REQUISITO: LOGIN ---
        console.log('[AUDIT] Iniciando Login para captura de JWT...');
        await actor.attemptsTo(
            LoginToCEC.withCredentials(process.env.CEC_USERNAME!, process.env.CEC_PASSWORD!)
        );
        
        token = await actor.waitForToken();
        client = new BaseClient(actor.page.request, token, process.env.CEC_BASE_URL!, '1');
        console.log('[AUDIT] ✅ JWT Capturado y Cliente API Inicializado.');

        // --- FASE 1: AUTH ---
        console.log('[AUDIT] 👉 Fase 1: Validando /api/Auth/me...');
        const authRes = await client.get('/api/Auth/me');
        expect(authRes.status()).toBe(200);
        const userData = await authRes.json();
        expect(userData).toHaveProperty('userId');
        console.log(`[AUDIT] ✅ Perfil validado: ${userData.displayName}`);

        // --- FASE 2: ODATA METADATA ---
        console.log('[AUDIT] 👉 Fase 2: Validando OData (Providers & Folders)...');
        
        const providersRes = await client.get('/odata/DataSourceProviders');
        expect(providersRes.status()).toBe(200);
        const providersData = await providersRes.json();
        console.log(`[AUDIT] ✅ Providers: ${providersData.value.length} encontrados.`);

        const foldersRes = await client.get('/odata/Folders');
        expect(foldersRes.status()).toBe(200);
        const foldersData = await foldersRes.json();
        console.log(`[AUDIT] ✅ Folders: ${foldersData.value.length} encontradas.`);

        // --- FASE 3: DISCOVERY (REPORTS) ---
        // Intentamos descubrir un reporte real desde la lista de folders si es posible
        console.log('[AUDIT] 👉 Fase 3: Discovery de Reportes Genéricos...');
        
        // Usamos un endpoint base de reports para ver si el esquema responde (Fase de sondeo)
        // Nota: Estos parámetros son genéricos para validar el ruteo
        const reportsRes = await client.get('/api/reports/health/check/0'); 
        // Es probable que devuelva 404 (Not Found) o 400 si los keys no existen, 
        // pero buscamos validar que el middleware de Auth/CompanyId no devuelva 401/403.
        console.log(`[AUDIT] Sondeo de Reportes finalizado con status: ${reportsRes.status()}`);
        expect([200, 404, 400]).toContain(reportsRes.status()); 

        console.log('[AUDIT] 🎉 Auditoría de Salud API Finalizada con Éxito.');
    });
});
