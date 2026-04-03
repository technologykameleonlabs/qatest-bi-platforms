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
        // Usamos la URL dev de CEC BI que redirige al SSO
        await this.page.goto('https://dev.bi.empresascec.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    }

    async login(username: string, pass: string) {
        await this.usernameInput.waitFor({ state: 'visible', timeout: 30000 });
        await this.usernameInput.type(username, { delay: 50 }); // Escribir con delay es más estable
        await this.passwordInput.type(pass, { delay: 50 });
        await this.loginButton.click();
        
        // Esperar a que el login procese y la red se calme antes de salir
        await this.page.waitForLoadState('networkidle', { timeout: 30000 });
    }
}
