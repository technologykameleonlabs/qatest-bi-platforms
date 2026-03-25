import { Actor, Task, Action } from '../../../../common/screenplay/Screenplay';
import { LoginPage } from '../pages/LoginPage';

export class LoginToCEC implements Task {
    constructor(private user: string, private pass: string) {}

    static withCredentials(user: string, pass: string) {
        return new LoginToCEC(user, pass);
    }

    async performAs(actor: Actor): Promise<void> {
        // Activar el Red Interceptor para captura instantánea de JWT
        await actor.startTokenInterception();

        const loginPage = new LoginPage(actor.page);
        await loginPage.navigate();
        await loginPage.login(this.user, this.pass);
    }
}
