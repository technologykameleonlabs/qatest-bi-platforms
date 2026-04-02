import { APIRequestContext } from '@playwright/test';

/**
 * BaseClient — Cliente HTTP para comunicación con las APIs de las plataformas BI.
 *
 * Inyecta automáticamente los headers de autenticación (Bearer token) y opcionales
 * como `X-Company-Id` en cada petición.
 *
 * @example
 * const client = new BaseClient(request, jwt, 'https://dev.bi.empresascec.com/backend');
 * const res = await client.get('/odata/Reports');
 * const res = await client.getSafe('/api/reports/123/cards'); // No lanza en 4xx/5xx
 */
export class BaseClient {
    constructor(
        private requestContext: APIRequestContext,
        private token: string,
        private baseUrl: string,
        private companyId?: string
    ) {}

    /**
     * GET autenticado. Lanza una advertencia en consola si la respuesta es un error,
     * pero devuelve la respuesta para que el caller decida cómo manejarla.
     */
    async get(endpoint: string, params?: Record<string, string>) {
        const response = await this.requestContext.get(`${this.baseUrl}${endpoint}`, {
            headers: this.getHeaders(),
            params,
        });
        this.logIfError(response);
        return response;
    }

    /**
     * GET autenticado "seguro" — nunca lanza, siempre devuelve la respuesta.
     * Ideal para sondeos y discovery de endpoints donde un 404 es un resultado válido.
     */
    async getSafe(endpoint: string, params?: Record<string, string>) {
        try {
            return await this.get(endpoint, params);
        } catch (e: any) {
            console.warn(`[BaseClient] ⚠️ getSafe capturó excepción en ${endpoint}: ${e.message}`);
            return null;
        }
    }

    /**
     * POST autenticado con payload JSON.
     */
    async post(endpoint: string, data: unknown) {
        const response = await this.requestContext.post(`${this.baseUrl}${endpoint}`, {
            headers: this.getHeaders(),
            data,
        });
        this.logIfError(response);
        return response;
    }

    // ─── Privados ───────────────────────────────────────────────────────────

    private getHeaders(): Record<string, string> {
        const headers: Record<string, string> = {
            Authorization: `Bearer ${this.token}`,
            Accept: 'application/json',
        };
        if (this.companyId) {
            headers['X-Company-Id'] = this.companyId;
        }
        return headers;
    }

    private logIfError(response: { status: () => number; url: () => string }) {
        const status = response.status();
        if (status >= 400) {
            console.warn(`[BaseClient] ⚠️ ${status} en ${response.url()}`);
        }
    }
}
