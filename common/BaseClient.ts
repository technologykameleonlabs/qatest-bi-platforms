import { APIRequestContext } from '@playwright/test';

/**
 * BaseClient — Cliente HTTP para comunicación con las APIs de las plataformas BI.
 *
 * Inyecta automáticamente los headers de autenticación (Bearer token) y los
 * headers necesarios para OData y reporteabilidad.
 */
export class BaseClient {
    constructor(
        private requestContext: APIRequestContext,
        private token: string,
        private baseUrl: string,
        private companyId?: string
    ) {}

    /**
     * GET autenticado. Lanza una advertencia en consola si la respuesta es un error.
     */
    async get(endpoint: string, params?: Record<string, string>) {
        const url = `${this.baseUrl}${endpoint}`;
        
        // Autorización para descubrimiento: autoinyectar $top=1 en OData si no hay params
        const queryParams = params || {};
        if (endpoint.toLowerCase().includes('/odata/') && !queryParams['$top'] && !endpoint.includes('$count')) {
            queryParams['$top'] = '1';
        }

        const response = await this.requestContext.get(url, {
            headers: this.getHeaders(),
            params: queryParams,
        });
        
        await this.logIfError(response);
        return response;
    }

    /**
     * GET autenticado "seguro" — nunca lanza, siempre devuelve la respuesta.
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
        await this.logIfError(response);
        return response;
    }

    // ─── Privados ───────────────────────────────────────────────────────────

    private getHeaders(): Record<string, string> {
        const headers: Record<string, string> = {
            Authorization: `Bearer ${this.token}`,
            Accept: 'application/json, text/plain, */*',
            'OData-Version': '4.0',
            'OData-MaxVersion': '4.0',
            'Prefer': 'odata.include-annotations="*"',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        };
        
        if (this.companyId) {
            headers['X-Company-Id'] = this.companyId;
        }
        
        return headers;
    }

    private async logIfError(response: { status: () => number; url: () => string; text: () => Promise<string> }) {
        const status = response.status();
        if (status >= 400) {
            const body = await response.text().catch(() => 'No body');
            console.warn(`[BaseClient] ⚠️ ${status} en ${response.url()} | Body: ${body.substring(0, 200)}`);
        }
    }
}
