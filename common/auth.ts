import { APIRequestContext } from '@playwright/test';

export interface AuthCredentials {
    client_id: string;
    client_secret: string;
    username?: string;
    password?: string;
}

/**
 * BaseAuth centraliza la lógica de obtención de tokens para CEC BI y MOJITO BI.
 */
export class BaseAuth {
    private static tokenCache: Map<string, string> = new Map();
    private static SSO_TOKEN_URL = 'https://sso.pre.mojito360.com/connect/token';

    /**
     * Obtiene un token de acceso mediante el flujo de Client Credentials o ROPC.
     */
    static async getToken(request: APIRequestContext, system: 'CEC' | 'MOJITO', creds: AuthCredentials): Promise<string> {
        const cacheKey = `${system}_${creds.client_id}`;
        
        if (this.tokenCache.has(cacheKey)) {
            return this.tokenCache.get(cacheKey)!;
        }

        const scope = system === 'CEC' ? 'cecbi_api openid email profile offline_access' : 'mojitobi_api openid email profile offline_access';
        
        const formData: Record<string, string> = {
            grant_type: creds.password ? 'password' : 'client_credentials',
            client_id: creds.client_id,
            client_secret: creds.client_secret,
            scope: scope
        };

        if (creds.username) formData.username = creds.username;
        if (creds.password) formData.password = creds.password;
        
        const response = await request.post(this.SSO_TOKEN_URL, {
            form: formData
        });

        if (!response.ok()) {
            throw new Error(`Error obteniendo token para ${system}: ${response.statusText()}`);
        }

        const data = await response.json();
        this.tokenCache.set(cacheKey, data.access_token);
        return data.access_token;
    }
}
