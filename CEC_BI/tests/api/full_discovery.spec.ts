import { test, expect, chromium } from '@playwright/test';
import { BaseClient } from '../../../common/BaseClient';
import { Actor } from '../../../common/screenplay/Screenplay';
import { LoginToCEC } from '../e2e/screenplay/LoginTask';
import { SwaggerDiscovery } from '../../../common/SwaggerDiscovery';
import * as path from 'path';

/**
 * CEC BI — Full API Dynamic Discovery
 *
 * Esta suite lee el archivo docs/api/bi_swagger.json y realiza un ping GET
 * a cada endpoint para auditar la salud masiva de la API.
 */
test.describe('CEC BI — API Global Discovery & Mass Audit', () => {
    let client: BaseClient;
    const SWAGGER_PATH = path.resolve(__dirname, '../../../docs/api/bi_swagger.json');
    const BASE_URL = process.env.CEC_BASE_URL || 'https://dev.bi.empresascec.com/backend';

    test.beforeAll(async () => {
        console.log('\n[DISCOVERY] Iniciando Auditoría Masiva basada en Swagger...');
        
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
        
        // request viene como fixture en los tests, pero aquí usamos el del context si fuera necesario.
        // En beforeAll de Playwright, solemos usar un fixture inyectado o crear uno.
    });

    test('Ejecutar Auditoría Masiva (Todos los endpoints Swagger)', async ({ request }) => {
        const endpoints = SwaggerDiscovery.extractGetEndpoints(SWAGGER_PATH);
        console.log(`[DISCOVERY] Detectados ${endpoints.length} endpoints GET en Swagger.`);

        // Re-obtener token para este test específico (o usar el del beforeAll si lo guardamos)
        // Por consistencia, inicializamos el cliente aquí.
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();
        const auditor = Actor.named('CEC-Auditor', page);
        await auditor.startTokenInterception();
        await auditor.attemptsTo(LoginToCEC.withCredentials(process.env.CEC_USERNAME!, process.env.CEC_PASSWORD!));
        const token = await auditor.waitForToken();
        await browser.close();

        client = new BaseClient(request, token, BASE_URL);

        const results = {
            total: endpoints.length,
            success: 0,
            error: 0,
            unauthorized: 0,
            notFound: 0,
            serverError: 0,
            withParams: 0
        };

        for (const endpoint of endpoints) {
            if (endpoint.hasParams) {
                results.withParams++;
                continue; 
            }

            const response = await client.getSafe(endpoint.path);
            if (!response) {
                results.error++;
                continue;
            }

            const status = response.status();
            if (status >= 200 && status < 300) results.success++;
            else if (status === 401 || status === 403) results.unauthorized++;
            else if (status === 404) results.notFound++;
            else if (status >= 500) results.serverError++;
            else results.error++;

            if (status >= 400 && status !== 405) {
                console.warn(`[FAIL] ${status} en ${endpoint.path}`);
            }
        }

        console.log('\n📊 RESUMEN CEC BI:');
        console.log(`✅ OK: ${results.success} | ❌ 500: ${results.serverError} | ⚠️ 404: ${results.notFound} | ⚙️ Params: ${results.withParams}`);
        
        expect(results.success).toBeGreaterThan(0);
    });
});
