import { request, APIRequestContext } from '@playwright/test';

/**
 * BaseAuth handles common authentication logic for both CEC BI and MOJITO BI.
 */
export class BaseAuth {
    private context: APIRequestContext;

    constructor(context: APIRequestContext) {
        this.context = context;
    }

    /**
     * Get a token for the specified system.
     * @param system 'CEC' | 'MOJITO'
     * @param credentials { username, password }
     */
    async login(system: 'CEC' | 'MOJITO', credentials: any): Promise<string> {
        // TODO: Implement specific login logic based on Swagger docs
        console.log(`Logueando en el sistema ${system}...`);
        return "fake-token";
    }
}
