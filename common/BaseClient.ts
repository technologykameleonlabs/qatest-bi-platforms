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
        return await this.requestContext.get(`${this.baseUrl}${endpoint}`, {
            headers: this.getHeaders(),
            params: params
        });
    }

    async post(endpoint: string, data: any) {
        return await this.requestContext.post(`${this.baseUrl}${endpoint}`, {
            headers: this.getHeaders(),
            data: data
        });
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
