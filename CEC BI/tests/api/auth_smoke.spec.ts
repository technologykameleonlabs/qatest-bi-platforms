import { test, expect } from '@playwright/test';
import { Actor } from '../../../common/screenplay/Screenplay';
import { LoginToCEC } from '../e2e/screenplay/LoginTask';
import { BaseClient } from '../../../common/BaseClient';

/**
 * Suite de API Automatizada: Utiliza el Token dinámico de la sesión UI
 * para validar los endpoints del backend.
 */
test.describe('CEC BI Automated API Suite', () => {
    let client: BaseClient;

    test.beforeAll(async ({ browser, request }) => {
        test.setTimeout(60000); // Dar 60s para el login y extracción
        const page = await browser.newPage();
        const admin = Actor.named('AdminRunner', page);

        // 1. Obtener Token dinámico vía UI
        await admin.attemptsTo(
            LoginToCEC.withCredentials(
                process.env.CEC_USERNAME!,
                process.env.CEC_PASSWORD!
            )
        );

        let token: string | null = null;
        for (let i = 0; i < 20; i++) {
            token = await admin.extractTokenFromStorage();
            if (token) break;
            await page.waitForTimeout(1000);
        }

        if (!token) throw new Error('No se pudo obtener el token dinámico para la suite de API.');

        // 2. Inicializar Cliente API con el token robado
        client = new BaseClient(request, token, process.env.CEC_BASE_URL!);
        await page.close();
    });

    test('Validar integridad del perfil de usuario (/Auth/me)', async () => {
        const response = await client.get('/api/Auth/me');
        expect(response.status()).toBe(200);
        
        const user = await response.json();
        expect(user.success).toBe(true);
        expect(user.data.email).toBe(process.env.CEC_USERNAME + '@kameleonlabs.ai'); // O el que corresponda
    });

    test('Validar acceso al módulo de PowerBI', async () => {
        const response = await client.get('/api/PowerBI/GetWorkspaceReports');
        // Si no tiene permisos dará 403, si el interceptor captura un 400+ nos avisará
        expect(response.status()).not.toBe(401);
    });
});
