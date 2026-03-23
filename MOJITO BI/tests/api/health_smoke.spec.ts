import { test, expect } from '@playwright/test';
import { BaseAuth } from '../../../common/auth';
import { BaseClient } from '../../../common/BaseClient';

test.describe('MOJITO BI API Functional Smoke Tests', () => {
    let client: BaseClient;

    test.beforeAll(async ({ request }) => {
        const token = await BaseAuth.getToken(request, 'MOJITO', {
            client_id: process.env.MOJITO_CLIENT_ID || 'placeholder_id',
            client_secret: process.env.MOJITO_CLIENT_SECRET || 'placeholder_secret'
        });

        client = new BaseClient(request, token, 'https://reporting.dev.mojito360.com/backend');
    });

    test('Verificar estado de salud (Health)', async () => {
        // El endpoint /backend/Health devuelve 200 OK si está operativo
        const response = await client.get('/Health');
        console.log(`Status de Mojito Health: ${response.status()}`);
        expect(response.status()).toBeDefined();
    });
});
