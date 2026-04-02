import { Actor, Task } from '../../../../common/screenplay/Screenplay';
import { LoginPage } from '../pages/LoginPage';

export class LoginToMojito implements Task {
    constructor(private user: string, private pass: string) {}

    static withCredentials(user: string, pass: string) {
        return new LoginToMojito(user, pass);
    }

    async performAs(actor: Actor): Promise<void> {
        // Activar el Red Interceptor para captura instantánea de JWT
        await actor.startTokenInterception();

        const loginPage = new LoginPage(actor.page);
        await loginPage.navigate();
        await loginPage.login(this.user, this.pass);
        await loginPage.selectEntity('Empresas CEC'); // Entidad específica para este entorno BI
    }
}
