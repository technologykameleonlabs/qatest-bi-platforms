# 📊 QA Automation BI Platforms (CEC & MOJITO)

Framework de automatización de pruebas de alto rendimiento para las plataformas de Business Intelligence de **CEC BI** (Empresas CEC) y **MOJITO BI** (Reporting Mojito360), diseñado para garantizar la integridad de datos, seguridad y disponibilidad de APIs.

---

## 🔥 Capacidades Avanzadas

### 🛡️ API Health Audit (6-Fases)
Implementación de un motor de auditoría de salud de API que valida:
1. **Conectividad**: Verificación de latencia y disponibilidad de endpoints.
2. **Esquema (OData V4)**: Validación de contratos y tipos de datos.
3. **Contenido**: Integridad de los payloads y respuestas de negocio.
4. **Performance**: Benchmarking de tiempos de respuesta bajo carga mínima.
5. **Seguridad (RBAC)**: Validación de acceso basado en roles y protección de endpoints.
6. **Resiliencia**: Manejo de errores y recuperación ante fallos de red.

### 🧩 Validación Híbrida (UI vs API)
Sincronización de pruebas E2E (Screenplay Pattern) con validaciones directas a API para asegurar que los KPIs mostrados en el dashboard coinciden exactamente con los datos origen de OData.

### 🔍 Discovery & Swagger Audit
Mecanismo automático de descubrimiento de endpoints mediante análisis de Swagger para detectar cambios no documentados en la API y asegurar una cobertura del 100%.

---

## 🚀 Stack Tecnológico

- **Core**: [Playwright](https://playwright.dev/) con TypeScript.
- **Patrones**: 
  - **Screenplay Pattern**: Para workflows de usuario legibles y escalables.
  - **POM (Page Object Model)**: Para la gestión técnica de selectores.
- **Reportes**: [Allure Framework](https://docs.qameta.io/allure/) con capturas de pantalla, trazas y video.
- **Auth**: Provedor centralizado `AuthProvider` para gestión de SSO y `X-Company-Id`.

---

## 📂 Estructura del Proyecto

```text
.
├── CEC_BI/             # Suite para Empresas CEC (API & E2E)
├── MOJITO_BI/          # Suite para Mojito360 (API & E2E)
├── common/             # Núcleo compartido (Auth, Discovery, Utils)
├── docs/               # Documentación y especificaciones OpenAPI
├── allure-results/     # Datos crudos de ejecución para Allure
└── playwright.config.ts # Configuración global de entornos
```

---

## 🛠️ Instalación y Uso

### Prerrequisitos
- **Node.js**: v18+ (Recomendado)
- **npm**: v9+

### Configuración inicial
```bash
npm install
npx playwright install --with-deps chromium
```

### Comandos de Ejecución
| Comando | Descripción |
| :--- | :--- |
| `npm test` | Ejecuta toda la suite de pruebas. |
| `npm run test:cec` | Ejecuta solo las pruebas de CEC BI. |
| `npm run test:mojito` | Ejecuta solo las pruebas de MOJITO BI. |
| `npx playwright test --grep @api` | Ejecuta exclusivamente auditorías de API. |
| `npx playwright test --grep @e2e` | Ejecuta exclusivamente flujos de usuario UI. |

### Generación de Reportes
```bash
# Generar y abrir el reporte Allure localmente
npm run report
```

---

## 📈 Roadmap & Próximos Pasos
- [x] Implementación de Auditoría API de 6 fases.
- [x] Estabilización de SSO en Mojito BI.
- [x] Validación cruzada de KPIs.
- [/] Expansión de cobertura RBAC (Security Testing).
- [ ] Integración con CI/CD (GitHub Actions).

---
*Developed & Maintained by **Kameleon Labs***
