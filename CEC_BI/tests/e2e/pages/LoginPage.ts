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
        await this.usernameInput.waitFor({ state: 'visible', timeout: 15000 });
        await this.usernameInput.fill(username);
        await this.passwordInput.fill(pass);
        await this.loginButton.click();
        
        // Esperar a que desaparezca el formulario de login (indica éxito preliminar)
        await this.loginButton.waitFor({ state: 'hidden', timeout: 20000 });
    }
}
