import { test, expect, chromium, request } from '@playwright/test';
import { BaseClient } from '../../../common/BaseClient';
import { Actor } from '../../../common/screenplay/Screenplay';
import { LoginToMojito } from '../e2e/screenplay/LoginTask';

/**
 * Diagnóstico de OData 400
 * 
 * Este test intenta una petición a /odata/Reports y loguea el body completo
 * para identificar qué falta (cabeceras, filtros, etc).
 */
test('Diagnóstico de OData 400 en Mojito', async () => {
    test.setTimeout(120000);

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    const auditor = Actor.named('Diagnostico', page);
    await auditor.startTokenInterception();
    
    await auditor.attemptsTo(
        LoginToMojito.withCredentials(
            process.env.MOJITO_USERNAME || process.env.CEC_USERNAME!,
            process.env.MOJITO_PASSWORD || process.env.CEC_PASSWORD!
        )
    );
    
    const token = await auditor.waitForToken(60000);
    
    // Decodificar JWT para ver los claims de empresa
    const payloadBase64 = token.split('.')[1];
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());
    console.log('\n[DIAGNOSTICO] JWT Payload (Claims):', JSON.stringify(payload, null, 2));

    await browser.close();

    const requestContext = await request.newContext();
    // Intentamos extraer un ID de empresa común de los claims (ej: cid, companyid, sub)
    const companyId = payload.cid || payload.companyId || payload.sub;
    
    console.log(`\n[DIAGNOSTICO] Usando CompanyID extraído: ${companyId}`);
    const client = new BaseClient(requestContext, token, 'https://reporting.dev.mojito360.com/backend', companyId);

    console.log('\n[DIAGNOSTICO] Petición a /odata/Reports con X-Reporting-Entity...');
    const res = await client.get('/odata/Reports');
    
    const status = res.status();
    const body = await res.text();
    
    console.log(`[DIAGNOSTICO] Status: ${status}`);
    console.log(`[DIAGNOSTICO] Body: ${body}`);

    // Si sigue dando 400, probamos sin la cabecera de Entidad
    if (status === 400) {
        console.log('\n[DIAGNOSTICO] Re-intentando SIN X-Reporting-Entity...');
        const clientNoEntity = new BaseClient(requestContext, token, 'https://reporting.dev.mojito360.com/backend');
        const res2 = await clientNoEntity.get('/odata/Reports');
        console.log(`[DIAGNOSTICO] Status sin entidad: ${res2.status()}`);
        console.log(`[DIAGNOSTICO] Body: ${await res2.text()}`);
    }
});
