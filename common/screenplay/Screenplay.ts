import { Page } from '@playwright/test';

export interface Ability {}

export interface Action {
    performAs(actor: Actor): Promise<void>;
}

export interface Task {
    performAs(actor: Actor): Promise<void>;
}

export class Actor {
    private _networkToken: string | null = null;

    constructor(readonly name: string, readonly page: Page) {}

    static named(name: string, page: Page): Actor {
        return new Actor(name, page);
    }

    async attemptsTo(...activities: (Task | Action)[]) {
        for (const activity of activities) {
            await activity.performAs(this);
        }
    }

    /**
     * Inicia la interceptación de red para capturar el JWT directamente desde las respuestas de la API.
     */
    async startTokenInterception() {
        console.log(`[${this.name}] Red Interceptor Activado.`);
        this.page.on('response', async response => {
            const url = response.url();
            const contentType = response.headers()['content-type'];

            // Interceptar cualquier respuesta JSON que pueda contener un token
            if (contentType?.includes('application/json')) {
                try {
                    const body = await response.json();
                    // Buscar patrones típicos de token (token, jwt, access_token)
                    const token = body.token || body.jwt || body.access_token || body.accessToken || body.id_token;
                    if (token && typeof token === 'string' && token.startsWith('ey')) {
                        this._networkToken = token;
                        console.log(`[${this.name}] ✅ JWT Capturado desde Red: ${url}`);
                    }
                } catch (e) {
                    // No es una respuesta JSON válida o cuerpo ya leído (raro en Playwright response event)
                }
            }
        });
    }

    /**
     * Obtiene el token capturado por red o intenta extraerlo del storage como fallback.
     */
    async getToken(): Promise<string | null> {
        if (this._networkToken) {
            return this._networkToken;
        }
        return await this.extractTokenFromStorage();
    }

    /**
     * Espera a que el token esté disponible (ya sea por red o storage).
     */
    async waitForToken(timeout: number = 30000): Promise<string> {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            const token = await this.getToken();
            if (token) return token;
            await this.page.waitForTimeout(1000);
            console.log(`[${this.name}] Esperando JWT... (${Math.round((Date.now() - start) / 1000)}s)`);
        }
        throw new Error(`[${this.name}] Timeout esperando JWT.`);
    }

    async extractTokenFromStorage(): Promise<string | null> {
        return await this.page.evaluate(() => {
            const storages = [
                { name: 'localStorage', ref: localStorage },
                { name: 'sessionStorage', ref: sessionStorage }
            ];
            for (const { name, ref } of storages) {
                for (let i = 0; i < ref.length; i++) {
                    const key = ref.key(i);
                    if (key) {
                        const value = ref.getItem(key);
                        // Log fundamental analysis for debugging
                        console.log(`[STORAGE-DEBUG] ${name} -> Key: ${key}, ValueLen: ${value?.length}, Start: ${value?.substring(0, 10)}`);
                        if (value && value.startsWith('ey') && value.length > 100) {
                            console.log(`[AUTH-DEBUG] JWT Encontrado en ${name} -> Key: ${key}`);
                            return value;
                        }
                        // Check if it's nested in a JSON object
                        if (value && value.startsWith('{')) {
                            try {
                                const parsed = JSON.parse(value);
                                for (const subKey in parsed) {
                                    const subValue = parsed[subKey];
                                    if (typeof subValue === 'string' && subValue.startsWith('ey') && subValue.length > 100) {
                                        console.log(`[AUTH-DEBUG] JWT Encontrado (Anidado) en ${name} -> Key: ${key}, SubKey: ${subKey}`);
                                        return subValue;
                                    }
                                }
                            } catch (e) {}
                        }
                    }
                }
            }
            return null;
        });
    }
}
