import { test, expect, chromium } from '@playwright/test';
import { BaseClient } from '../../../common/BaseClient';
import { Actor } from '../../../common/screenplay/Screenplay';
import { LoginToMojito } from '../e2e/screenplay/LoginTask';
import { SwaggerDiscovery } from '../../../common/SwaggerDiscovery';
import * as path from 'path';

/**
 * MOJITO BI — Full API Dynamic Discovery
 *
 * Esta suite lee el archivo docs/api/reporting_swagger.json y realiza un ping GET
 * a cada endpoint para auditar la salud masiva de la API de Mojito BI.
 */
test.describe('MOJITO BI — API Global Discovery & Mass Audit', () => {
    let client: BaseClient;
    const SWAGGER_PATH = path.resolve(__dirname, '../../../docs/api/reporting_swagger.json');
    const BASE_URL = process.env.MOJITO_BASE_URL || 'https://reporting.dev.mojito360.com/backend';

    test.beforeAll(async () => {
        console.log('\n[DISCOVERY] Iniciando discovery masivo en MOJITO BI...');
        
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();
        
        const auditor = Actor.named('Mojito-Discovery', page);
        await auditor.startTokenInterception();
        
        await auditor.attemptsTo(
            LoginToMojito.withCredentials(
                process.env.MOJITO_USERNAME || process.env.CEC_USERNAME!,
                process.env.MOJITO_PASSWORD || process.env.CEC_PASSWORD!
            )
        );
        
        const token = await auditor.waitForToken(60000);
        await browser.close();
        
        // Guardamos el token para usarlo en el test
    });

    test('Ejecutar Auditoría Masiva (Mojito Swagger)', async ({ request }) => {
        const endpoints = SwaggerDiscovery.extractGetEndpoints(SWAGGER_PATH);
        console.log(`[DISCOVERY] Detectados ${endpoints.length} endpoints GET en Swagger.`);

        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();
        const auditor = Actor.named('Mojito-Discovery', page);
        await auditor.startTokenInterception();
        await auditor.attemptsTo(
            LoginToMojito.withCredentials(
                process.env.MOJITO_USERNAME || process.env.CEC_USERNAME!,
                process.env.MOJITO_PASSWORD || process.env.CEC_PASSWORD!
            )
        );
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

        console.log('\n📊 RESUMEN MOJITO BI:');
        console.log(`✅ OK: ${results.success} | ❌ 500: ${results.serverError} | ⚠️ 404: ${results.notFound} | ⚙️ Params: ${results.withParams}`);
        
        expect(results.success).toBeGreaterThan(0);
    });
});
