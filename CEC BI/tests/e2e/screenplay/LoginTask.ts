import { Actor, Task, Action } from '../../../common/screenplay/Screenplay';
import { LoginPage } from '../pages/LoginPage';

export class LoginToCEC implements Task {
    constructor(private user: string, private pass: string) {}

    static withCredentials(user: string, pass: string) {
        return new LoginToCEC(user, pass);
    }

    async performAs(actor: Actor): Promise<void> {
        // Interceptar errores de red durante el proceso de Login
        actor.page.on('response', response => {
            if (response.status() >= 400 && response.url().includes('Auth')) {
                console.error(`⚠️ API Error durante Login: ${response.status()} en ${response.url()}`);
            }
        });

        const loginPage = new LoginPage(actor.page);
        await loginPage.navigate();
        await loginPage.login(this.user, this.pass);
    }
}
