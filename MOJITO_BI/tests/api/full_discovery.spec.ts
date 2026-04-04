import { test, expect, chromium, request } from '@playwright/test';
import { BaseClient } from '../../../common/BaseClient';
import { Actor } from '../../../common/screenplay/Screenplay';
import { LoginToMojito } from '../e2e/screenplay/LoginTask';
import { SwaggerDiscovery } from '../../../common/SwaggerDiscovery';
import * as path from 'path';

/**
 * MOJITO BI — Full API Global Discovery (Resiliente)
 */
test.describe('MOJITO BI — API Global Discovery & Mass Audit', () => {
    let client: BaseClient;
    const SWAGGER_PATH = path.resolve(__dirname, '../../../docs/api/reporting_swagger.json');
    const BASE_URL = process.env.MOJITO_BASE_URL || 'https://reporting.dev.mojito360.com/backend';

    test.beforeAll(async () => {
        // Timeout extendido para entornos muy lentos
        test.setTimeout(180000);

        console.log('\n[DISCOVERY] Iniciando Auditoría Masiva (MOJITO BI) - Modo Resiliente...');
        
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();
        
        const auditor = Actor.named('Mojito-Discovery', page);
        await auditor.startTokenInterception();
        
        try {
            await auditor.attemptsTo(
                LoginToMojito.withCredentials(
                    process.env.MOJITO_USERNAME || process.env.CEC_USERNAME!,
                    process.env.MOJITO_PASSWORD || process.env.CEC_PASSWORD!
                )
            );
        } catch (e) {
            console.warn('[DISCOVERY] ⚠️ Error durante Login visual, pero intentaremos capturar el token igualmente.');
        }
        
        // Espera extendida de 2 minutos para el token (SSO puede ser lento)
        const token = await auditor.waitForToken(120000);
        await browser.close();
        
        const requestContext = await request.newContext();
        // Usamos el ID '1' confirmado por inspección de red
        client = new BaseClient(requestContext, token, BASE_URL, '1');
        console.log('[DISCOVERY] ✅ JWT capturado exitosamente. Iniciando escaneo...');
    });

    test('Auditar todos los endpoints GET del Swagger', async () => {
        const endpoints = SwaggerDiscovery.extractGetEndpoints(SWAGGER_PATH);
        console.log(`[DISCOVERY] Procesando ${endpoints.length} endpoints en MOJITO BI...`);

        const results = {
            total: endpoints.length,
            success: 0,
            notFound: 0,
            error: 0,
            unauthorized: 0,
            withParams: 0
        };

        for (const endpoint of endpoints) {
            if (endpoint.hasParams) {
                results.withParams++;
                continue; 
            }

            const res = await client.getSafe(endpoint.path);
            if (!res) {
                results.error++;
                continue;
            }

            const status = res.status();
            if (status >= 200 && status < 300) results.success++;
            else if (status === 401 || status === 403) results.unauthorized++;
            else if (status === 404) results.notFound++;
            else results.error++;

            if (status >= 400 && status !== 405) {
                console.warn(`[AUDIT-FAIL] ${status} -> ${endpoint.path}`);
            }
        }

        console.log('\n📊 RESUMEN FINAL MOJITO BI:');
        console.log(`✅ OK: ${results.success} | ⚠️ 404: ${results.notFound} | ❌ Error: ${results.error} | ⚙️ Omitidos: ${results.withParams}`);
        
        expect(results.success).toBeGreaterThan(0);
    });
});
