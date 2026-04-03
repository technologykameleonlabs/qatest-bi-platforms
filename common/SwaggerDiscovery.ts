import * as fs from 'fs';
import * as path from 'path';

export interface Endpoint {
    path: string;
    method: string;
    summary?: string;
    tags?: string[];
    isOData: boolean;
    hasParams: boolean;
}

/**
 * SwaggerDiscovery — Utilidad para extraer rutas de archivos JSON locales de Swagger.
 *
 * Permite automatizar el sondeo de la API basándose en la especificación OpenAPI.
 */
export class SwaggerDiscovery {
    /**
     * Carga un archivo Swagger y extrae todos los endpoints GET.
     * @param jsonPath - Ruta absoluta al archivo JSON de Swagger.
     */
    static extractGetEndpoints(jsonPath: string): Endpoint[] {
        if (!fs.existsSync(jsonPath)) {
            throw new Error(`[Discovery] ❌ No se encontró el archivo Swagger en: ${jsonPath}`);
        }

        const swagger = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        const paths = swagger.paths || {};
        const endpoints: Endpoint[] = [];

        for (const pathKey in paths) {
            const methods = paths[pathKey];
            
            // Nos enfocamos en GET para descubrimiento seguro (sin efectos secundarios)
            if (methods.get) {
                const getOp = methods.get;
                endpoints.push({
                    path: pathKey,
                    method: 'GET',
                    summary: getOp.summary,
                    tags: getOp.tags || [],
                    isOData: pathKey.toLowerCase().includes('/odata/'),
                    hasParams: pathKey.includes('{')
                });
            }
            
            // Para otros métodos (POST, PUT, DELETE), podríamos mapearlos pero solo para validar existencia
        }

        console.log(`[Discovery] ✅ ${endpoints.length} endpoints GET extraídos de ${path.basename(jsonPath)}`);
        return endpoints;
    }

    /**
     * Intenta inyectar valores reales en los parámetros de la ruta (ej: {key}).
     * @param endpointPath - La ruta con placeholders (ej: /odata/Reports({key}))
     * @param values - Mapa de valores para inyectar
     */
    static resolvePath(endpointPath: string, values: Record<string, string>): string {
        let resolved = endpointPath;
        for (const key in values) {
            resolved = resolved.replace(new RegExp(`\\{${key}\\}`, 'g'), values[key]);
            resolved = resolved.replace(new RegExp(`\\(${key}\\)`, 'g'), `(${values[key]})`);
        }
        return resolved;
    }
}
