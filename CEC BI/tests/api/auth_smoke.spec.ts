import { test, expect } from '@playwright/test';

test.describe('CEC BI API Smoke Tests', () => {
    test('Verificar endpoint de ping', async ({ request }) => {
        const response = await request.get('https://dev.bi.empresascec.com/backend/api/Auth/ping');
        // Aceptamos cualquier respuesta por ahora para validar conectividad
        console.log(`Status de CEC Ping: ${response.status()}`);
        expect(response.ok()).toBeTruthy();
    });
});
