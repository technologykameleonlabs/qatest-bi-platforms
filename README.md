# QA Automation BI Platforms (CEC & MOJITO)

Este repositorio contiene el framework de automatización de pruebas para las plataformas de Business Intelligence de **CEC BI** (Empresas CEC) y **MOJITO BI** (Reporting Mojito360).

## 🚀 Tecnologías y Arquitectura
- **Motor**: [Playwright](https://playwright.dev/) (TypeScript)
- **Patrones de Diseño**:
  - **POM (Page Object Model)**: Gestión eficiente de elementos de UI.
  - **Screenplay Pattern**: Acciones de negocio legibles y reutilizables.
- **Reportes**: [Allure Report](https://docs.qameta.io/allure/) para resultados visuales y ejecutivos.
- **Estructura**: Multisistema (CEC y MOJITO) con núcleo compartido (`common/`).

## 📂 Estructura del Proyecto
```text
.
├── CEC BI/             # Pruebas para empresas CEC
│   └── tests/          # API y E2E (POM + Screenplay)
├── MOJITO BI/          # Pruebas para Mojito360
│   └── tests/          # API y E2E (POM + Screenplay)
├── common/             # Helpers y lógica compartida (Auth, Utils)
├── docs/api/           # Especificaciones OpenAPI locales
└── playwright.config.ts # Configuración maestra
```

## 🛠️ Instalación y Uso

### Prerrequisitos
- Node.js (v16+)
- npm

### Instalación
```bash
npm install
npx playwright install chromium
```

### Ejecutar Pruebas
- **Todas las pruebas**: `npx playwright test`
- **Solo CEC BI**: `npx playwright test --project=CEC-BI`
- **Solo MOJITO BI**: `npx playwright test --project=MOJITO-BI`

### Generar Reportes Allure
```bash
npx playwright test --reporter=line,allure-playwright
npx allure serve allure-results
```

---
*Mantenido por Kameleon Labs*
