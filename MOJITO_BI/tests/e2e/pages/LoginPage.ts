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
        await this.page.goto('https://reporting.dev.mojito360.com/');
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
        await this.page.screenshot({ path: 'mojito_login_success.png' });
        
        const entityLocator = this.page.locator('div').filter({ hasText: new RegExp(`^${entityName}$`, 'i') }).first();
        if (!(await entityLocator.isVisible())) {
            // Reintento con selector más laxo si el estricto falla
            console.log(`[MOJITO-DEBUG] Reintentando selector laxo para ${entityName}`);
            await this.page.locator(`text=${entityName}`).first().click();
        } else {
            await entityLocator.click();
        }
        
        await this.page.waitForLoadState('networkidle');
        console.log(`[MOJITO-DEBUG] Entidad ${entityName} seleccionada.`);
        await this.page.screenshot({ path: 'mojito_after_entity.png' });
    }
}
