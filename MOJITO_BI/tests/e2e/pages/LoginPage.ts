import { Page, Locator } from '@playwright/test';

export class LoginPage {
    readonly page: Page;
    readonly usernameInput: Locator;
    readonly passwordInput: Locator;
    readonly loginButton: Locator;

    constructor(page: Page) {
        this.page = page;
        this.usernameInput = page.locator('#nameInput');
        this.passwordInput = page.locator('#passwordInput');
        this.loginButton = page.locator('.body_login_submit');
    }

    async navigate() {
        // URL de Mojito BI que redirige al SSO
        await this.page.goto('https://reporting.dev.mojito360.com/', { waitUntil: 'domcontentloaded' });
    }

    async login(username: string, pass: string) {
        await this.usernameInput.waitFor({ state: 'visible', timeout: 15000 });
        await this.usernameInput.fill(username);
        await this.passwordInput.fill(pass);
        await this.loginButton.click();
        
        // Esperar a que el botón de login desaparezca
        await this.loginButton.waitFor({ state: 'hidden', timeout: 20000 });
    }

    async selectEntity(entityName: string = 'Global') {
        console.log(`[MOJITO-DEBUG] Seleccionando entidad: ${entityName}`);
        try {
            await this.page.waitForLoadState('domcontentloaded', { timeout: 15000 });
            await this.page.screenshot({ path: 'mojito_login_result.png', fullPage: true });

            const entityLocator = this.page.locator(`text=${entityName}`).first();
            await entityLocator.waitFor({ state: 'visible', timeout: 30000 });
            await entityLocator.click({ force: true });
            console.log(`[MOJITO-DEBUG] ✅ Entidad ${entityName} seleccionada.`);
        } catch (e: any) {
            console.warn(`[MOJITO-DEBUG] ⚠️ Falló la selección de entidad UI: ${e.message}. Continuando con token capturado...`);
        }
    }
}
