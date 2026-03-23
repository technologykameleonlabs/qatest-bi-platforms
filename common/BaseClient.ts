import { APIRequestContext, request } from '@playwright/test';

/**
 * BaseClient envuelve la lógica de peticiones para inyectar headers comunes (Auth, CompanyId).
 */
export class BaseClient {
    constructor(
        private requestContext: APIRequestContext,
        private token: string,
        private baseUrl: string,
        private companyId?: string
    ) {}

    async get(endpoint: string, params?: Record<string, string>) {
        const response = await this.requestContext.get(`${this.baseUrl}${endpoint}`, {
            headers: this.getHeaders(),
            params: params
        });
        await this.validateResponse(response);
        return response;
    }

    async post(endpoint: string, data: any) {
        const response = await this.requestContext.post(`${this.baseUrl}${endpoint}`, {
            headers: this.getHeaders(),
            data: data
        });
        await this.validateResponse(response);
        return response;
    }

    private async validateResponse(response: any) {
        if (response.status() >= 400) {
            const body = await response.text();
            console.error(`❌ API Error ${response.status()} en ${response.url()}: ${body}`);
            // Podríamos lanzar error o capturarlo para Allure
        }
    }

    private getHeaders() {
        const headers: Record<string, string> = {
            'Authorization': `Bearer ${this.token}`,
            'Accept': 'application/json'
        };
        if (this.companyId) {
            headers['X-Company-Id'] = this.companyId;
        }
        return headers;
    }
}
