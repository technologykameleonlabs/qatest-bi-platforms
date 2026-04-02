import { Page } from '@playwright/test';

export interface Ability {}

export interface Action {
    performAs(actor: Actor): Promise<void>;
}

export interface Task {
    performAs(actor: Actor): Promise<void>;
}

/**
 * Actor — Entidad central del patrón Screenplay.
 *
 * Representa a un usuario que puede ejecutar tareas (Task) y acciones (Action),
 * y que es capaz de interceptar el JWT de red automáticamente durante el flujo de login.
 */
export class Actor {
    private _networkToken: string | null = null;

    constructor(readonly name: string, readonly page: Page) {}

    static named(name: string, page: Page): Actor {
        return new Actor(name, page);
    }

    /**
     * Ejecuta una secuencia de tareas / acciones en orden.
     */
    async attemptsTo(...activities: (Task | Action)[]) {
        for (const activity of activities) {
            await activity.performAs(this);
        }
    }

    /**
     * Activa el interceptor de red para capturar el JWT de forma pasiva.
     * Debe llamarse ANTES de navegar/hacer login.
     */
    async startTokenInterception() {
        console.log(`[${this.name}] 🔌 Red Interceptor activado.`);
        this.page.on('response', async (response) => {
            const contentType = response.headers()['content-type'] || '';
            if (!contentType.includes('application/json')) return;

            try {
                const body = await response.json();
                const token =
                    body.token ||
                    body.jwt ||
                    body.access_token ||
                    body.accessToken ||
                    body.id_token;

                if (token && typeof token === 'string' && token.startsWith('ey')) {
                    this._networkToken = token;
                    console.log(`[${this.name}] ✅ JWT capturado desde: ${response.url()}`);
                }
            } catch {
                // Respuesta sin cuerpo JSON válido — ignorar silenciosamente
            }
        });
    }

    /**
     * Devuelve el token capturado por red, o busca en localStorage/sessionStorage como fallback.
     */
    async getToken(): Promise<string | null> {
        if (this._networkToken) return this._networkToken;
        return await this.extractTokenFromStorage();
    }

    /**
     * Espera de forma activa hasta que el token esté disponible.
     * Lanza un error si el timeout se agota sin capturar el token.
     *
     * @param timeout - Tiempo máximo de espera en ms (por defecto 30s)
     */
    async waitForToken(timeout: number = 30000): Promise<string> {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            const token = await this.getToken();
            if (token) return token;
            await this.page.waitForTimeout(1000);
            console.log(
                `[${this.name}] ⏳ Esperando JWT... (${Math.round((Date.now() - start) / 1000)}s)`
            );
        }
        throw new Error(
            `[${this.name}] ❌ Timeout (${timeout / 1000}s) esperando JWT. Verifica el flujo de login.`
        );
    }

    /**
     * Busca el JWT en localStorage y sessionStorage del navegador.
     * Solo se usa como fallback si el interceptor de red no capturó el token.
     */
    async extractTokenFromStorage(): Promise<string | null> {
        return await this.page.evaluate(() => {
            const storages: Array<{ name: string; ref: Storage }> = [
                { name: 'localStorage', ref: localStorage },
                { name: 'sessionStorage', ref: sessionStorage },
            ];

            for (const { name, ref } of storages) {
                for (let i = 0; i < ref.length; i++) {
                    const key = ref.key(i);
                    if (!key) continue;

                    const value = ref.getItem(key);
                    if (!value) continue;

                    // Token JWT directo en la clave
                    if (value.startsWith('ey') && value.length > 100) {
                        console.log(`[Actor] ✅ JWT encontrado en ${name} → key: ${key}`);
                        return value;
                    }

                    // Token JWT anidado en un objeto JSON
                    if (value.startsWith('{')) {
                        try {
                            const parsed = JSON.parse(value);
                            for (const subKey in parsed) {
                                const subVal = parsed[subKey];
                                if (
                                    typeof subVal === 'string' &&
                                    subVal.startsWith('ey') &&
                                    subVal.length > 100
                                ) {
                                    console.log(
                                        `[Actor] ✅ JWT encontrado (anidado) en ${name} → ${key}.${subKey}`
                                    );
                                    return subVal;
                                }
                            }
                        } catch {
                            // No es JSON válido — ignorar
                        }
                    }
                }
            }
            return null;
        });
    }
}
