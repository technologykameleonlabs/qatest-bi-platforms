import { test, expect } from '@playwright/test';

test.describe('MOJITO BI API Smoke Tests', () => {
    test('Verificar endpoint de Health', async ({ request }) => {
        const response = await request.get('https://reporting.dev.mojito360.com/backend/Health');
        console.log(`Status de Mojito Health: ${response.status()}`);
        expect(response.ok()).toBeTruthy();
    });
});
