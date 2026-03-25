import { test, expect } from '@playwright/test';
import { Actor } from '../../../common/screenplay/Screenplay';
import { LoginToCEC } from '../e2e/screenplay/LoginTask';

test('Descubrimiento de Dashboard CEC BI', async ({ page }) => {
    const admin = Actor.named('AdminDiscovery', page);

    // 1. Login
    await admin.attemptsTo(
        LoginToCEC.withCredentials(
            process.env.CEC_USERNAME!,
            process.env.CEC_PASSWORD!
        )
    );

    // 2. Esperar a la carga del Dashboard
    await page.waitForTimeout(10000); // Dar tiempo para que PowerBI cargue
    
    // 3. Tomar screenshot para identificar widgets
    await page.screenshot({ path: 'cec_dashboard_discovery.png', fullPage: true });
    
    // 4. Logear los roles y metadatos del usuario para entender el contexto
    const token = await admin.extractTokenFromStorage();
    console.log('[DISCOVERY] Token capturado:', token ? 'SI' : 'NO');
    
    // 5. Intentar detectar contenedores comunes
    const cards = await page.locator('.card, .widget, .visual, iframe').count();
    console.log(`[DISCOVERY] Se encontraron ${cards} posibles elementos de dashboard.`);
});
