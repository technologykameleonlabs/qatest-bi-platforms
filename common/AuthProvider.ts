import { request } from '@playwright/test';

/**
 * AuthProvider — Autenticación directa vía OAuth Password Grant.
 * 
 * Obtiene un JWT sin necesidad de navegador, ideal para tests de API puros.
 * Hace POST al SSO de Mojito/CEC para obtener un access_token directamente.
 */
export class AuthProvider {
    /**
     * Obtiene un JWT directamente desde el SSO sin navegador.
     * @param ssoUrl - URL base del SSO (ej: https://sso.pre.mojito360.com)
     * @param clientId - Client ID de la aplicación
     * @param username - Nombre de usuario
     * @param password - Contraseña
     * @returns El JWT (access_token) o null si falla
     */
    static async getToken(
        ssoUrl: string = 'https://sso.pre.mojito360.com',
        clientId: string = 'cecbi_web',
        username?: string,
        password?: string
    ): Promise<string | null> {
        const user = username || process.env.CEC_USERNAME!;
        const pass = password || process.env.CEC_PASSWORD!;

        console.log(`[AuthProvider] Solicitando JWT directamente al SSO: ${ssoUrl}`);
        console.log(`[AuthProvider] Usuario: ${user.substring(0, 10)}...`);

        const ctx = await request.newContext();
        try {
            const response = await ctx.post(`${ssoUrl}/connect/token`, {
                form: {
                    grant_type: 'password',
                    client_id: clientId,
                    username: user,
                    password: pass,
                    scope: 'openid profile'
                },
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            if (response.status() === 200) {
                const body = await response.json();
                const token = body.access_token;
                if (token) {
                    console.log(`[AuthProvider] ✅ JWT obtenido directamente (${token.substring(0, 20)}...)`);
                    return token;
                }
            }

            console.error(`[AuthProvider] ❌ Error ${response.status()}: ${await response.text()}`);
            return null;
        } catch (e: any) {
            console.error(`[AuthProvider] ❌ Error de conexión: ${e.message}`);
            return null;
        } finally {
            await ctx.dispose();
        }
    }
}
