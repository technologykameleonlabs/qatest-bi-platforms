import { test, expect } from '@playwright/test';
import { Actor } from '../../../common/screenplay/Screenplay';
import { LoginToCEC } from '../e2e/screenplay/LoginTask';
import { BaseClient } from '../../../common/BaseClient';

test.describe('CEC BI Final Hybrid Validation', () => {
    test('Login -> Dynamic JWT Extraction -> Global API Interception', async ({ page, request }) => {
        // Interceptores de red para errores de negocio (400, 500)
        page.on('response', async response => {
            if (response.status() >= 400) {
                const url = response.url();
                try {
                    const text = await response.text();
                    console.log(`🔴 [NETWORK ERROR] ${response.status()} en ${url}: ${text.substring(0, 100)}...`);
                } catch {
                    console.log(`🔴 [NETWORK ERROR] ${response.status()} en ${url}`);
                }
            }
        });

        const admin = Actor.named('AdminUser', page);

        // 1. Iniciar sesión vía UI
        await admin.attemptsTo(
            LoginToCEC.withCredentials(
                process.env.CEC_USERNAME!,
                process.env.CEC_PASSWORD!
            )
        );

        // 2. Esperar por el token (polling robusto)
        let token: string | null = null;
        console.log('Esperando por JWT dinámico (polling 60s max para internet lento)...');
        
        for (let i = 0; i < 60; i++) {
            token = await admin.extractTokenFromStorage();
            if (token) break;
            
            if (i === 30) {
                console.log('⚠️ Media vuelta del polling alcanzada (30s). Tomando captura de estado...');
                await page.screenshot({ path: 'debug_polling_30s.png' });
            }
            
            await page.waitForTimeout(1000);
        }

        if (!token) {
            // Debug: Volcar storage si falla
            const storage = await page.evaluate(() => JSON.stringify(localStorage));
            console.error(`❌ FALLÓ EXTRACCIÓN en URL: ${page.url()}`);
            console.error(`Storage actual (primeros 200 chars): ${storage.substring(0, 200)}...`);
            await page.screenshot({ path: 'debug_no_token_final.png', fullPage: true });
            throw new Error('No se detectó el JWT tras la redirección del Dashboard.');
        }

        console.log(`✅ JWT Detectado: e${token.substring(1, 15)}...`);

        // 3. Validación de servicios API con el token robado
        const client = new BaseClient(request, token, process.env.CEC_BASE_URL!);
        const response = await client.get('/api/Auth/me');
        
        expect(response.status()).toBe(200);
        const user = await response.json();
        console.log(`🎉 VALIDACIÓN EXITOSA: Usuario ${user.email} autenticado vía API usando sesión UI.`);
    });
});
