import { Actor, Task } from '../../../common/screenplay/Screenplay';
import { LoginPage } from '../pages/LoginPage';

export class LoginToCEC implements Task {
    constructor(private user: string, private pass: string) {}

    static withCredentials(user: string, pass: string) {
        return new LoginToCEC(user, pass);
    }

    async performAs(actor: Actor): Promise<void> {
        const loginPage = new LoginPage(actor.page);
        await loginPage.navigate();
        await loginPage.login(this.user, this.pass);
    }
}
