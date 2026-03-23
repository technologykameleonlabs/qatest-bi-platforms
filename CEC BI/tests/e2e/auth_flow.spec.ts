import { test, expect } from '@playwright/test';
import { Actor } from '../../../common/screenplay/Screenplay';
import { LoginToCEC } from '../screenplay/LoginTask';

test.describe('CEC BI E2E Tests (POM + Screenplay)', () => {
    test('El usuario debe poder iniciar sesión exitosamente', async ({ page }) => {
        const admin = Actor.named('AdminUser', page);

        // Uso del patrón Screenplay
        await admin.attemptsTo(
            LoginToCEC.withCredentials(
                process.env.CEC_USERNAME || 'usuario_demo',
                process.env.CEC_PASSWORD || 'pass_demo'
            )
        );

        // Verificación (Question o Assertion tradicional de Playwright)
        await expect(page).not.toHaveURL(/.*login/);
    });
});
