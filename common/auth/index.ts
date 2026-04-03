import { APIRequestContext } from '@playwright/test';

/**
 * BaseAuth — Módulo de Autenticación Directa via API (OAuth 2.0 Password Grant)
 *
 * Permite obtener un JWT sin necesidad de lanzar un navegador.
 * Útil para suites de salud de API puras donde no queremos el overhead de Chromium.
 *
 * @example
 * const token = await BaseAuth.getToken(request, 'MOJITO', {
 *     client_id: process.env.MOJITO_CLIENT_ID!,
 *     client_secret: process.env.MOJITO_CLIENT_SECRET!,
 * });
 */
export class BaseAuth {
    /**
     * Obtiene un JWT de acceso para la plataforma indicada vía OAuth Password Grant.
     *
     * @param request - Contexto de request de Playwright (del fixture `{ request }`)
     * @param platform - Identificador de la plataforma: 'CEC' | 'MOJITO'
     * @param overrides - Parámetros opcionales para sobreescribir las variables de entorno
     */
    static async getToken(
        request: APIRequestContext,
        platform: 'CEC' | 'MOJITO',
        overrides?: { client_id?: string; client_secret?: string }
    ): Promise<string> {
        const config = BaseAuth.buildConfig(platform, overrides);

        console.log(`[BaseAuth] Solicitando token para ${platform} en: ${config.tokenUrl}`);

        const response = await request.post(config.tokenUrl, {
            form: {
                grant_type: 'password',
                client_id: config.client_id,
                client_secret: config.client_secret || '',
                username: config.username,
                password: config.password,
                scope: 'openid profile email offline_access',
            },
            timeout: 20000,
        });

        if (!response.ok()) {
            const body = await response.text();
            throw new Error(
                `[BaseAuth] ❌ Error obteniendo token para ${platform} (${response.status()}): ${body}`
            );
        }

        const data = await response.json();
        const token = data.access_token || data.token || data.id_token;

        if (!token || typeof token !== 'string' || !token.startsWith('ey')) {
            throw new Error(
                `[BaseAuth] ❌ La respuesta de ${platform} no contiene un token JWT válido. Respuesta: ${JSON.stringify(data)}`
            );
        }

        console.log(`[BaseAuth] ✅ Token obtenido para ${platform}.`);
        return token;
    }

    private static buildConfig(
        platform: 'CEC' | 'MOJITO',
        overrides?: { client_id?: string; client_secret?: string }
    ) {
        if (platform === 'CEC') {
            const baseUrl = (process.env.CEC_BASE_URL || '').replace(/\/backend$/, '');
            return {
                tokenUrl: `${baseUrl}/connect/token`,
                client_id: overrides?.client_id || process.env.CEC_CLIENT_ID || 'cecbi_web',
                client_secret: overrides?.client_secret || process.env.CEC_CLIENT_SECRET || '',
                username: process.env.CEC_USERNAME!,
                password: process.env.CEC_PASSWORD!,
            };
        }

        // MOJITO
        return {
            tokenUrl: `https://sso.pre.mojito360.com/connect/token`,
            client_id: overrides?.client_id || process.env.MOJITO_CLIENT_ID || '',
            client_secret: overrides?.client_secret || process.env.MOJITO_CLIENT_SECRET || '',
            username: process.env.MOJITO_USERNAME || process.env.CEC_USERNAME!,
            password: process.env.MOJITO_PASSWORD || process.env.CEC_PASSWORD!,
        };
    }
}
