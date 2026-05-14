# ShipOne - Roadmap Realista para Public Release

Fecha base: 2026-05-14

## Objetivo real

Convertir ShipOne en una extension publica, estable, entendible y mantenible.

El foco ya no es seguir sumando features sin orden. El foco es:

- arquitectura limpia
- UX clara
- internacionalizacion
- calidad
- distribucion publica

## Regla de trabajo

Cada vez que avancemos en el proyecto y guardemos el cambio con commit y push, este documento debe actualizarse para marcar:

- lo que se completo
- lo que sigue pendiente
- cualquier riesgo nuevo detectado

## Fase 1 - Core Stabilization

Objetivo: convertir el codigo actual en una base mantenible y segura antes de escalar.

### 1.1 Arquitectura

- [x] Reducir `extension.ts` a bootstrap y composicion
- [x] Mover el registro de comandos por dominio
- [x] Separar handlers por feature
- [x] Eliminar logica de negocio de `extension.ts`
- [x] Crear registradores por dominio
- [x] Separar comandos por dominio real
- [x] Separar `ProjectCreationService`
- [x] Crear `TemplateService`
- [x] Crear `ProjectContextService`
- [x] Crear `GitService`
- [x] Crear `GithubService`
- [x] Crear `StatusFileService`
- [x] Crear `ProjectHealthService`
- [x] Crear `TodoScannerService`
- [x] Separar nodes de UI en archivos individuales
- [x] Separar renderizado del arbol
- [x] Crear icon provider
- [x] Crear tooltip provider
- [x] Crear health renderer
- [x] Validar `ProjectMetadata`
- [x] Añadir type guards
- [x] Añadir migracion de versiones
- [x] Añadir compatibilidad futura de schema

### 1.2 Persistencia segura

- [x] Validar JSON antes de cargar
- [x] Detectar metadata corrupta
- [x] Restaurar automaticamente backup
- [x] Añadir logs de errores
- [x] Añadir recovery mode
- [x] Añadir versionado de metadata
- [x] Añadir migraciones automaticas

### 1.3 Calidad de codigo

- [x] Configurar ESLint estricto
- [x] Configurar Prettier
- [x] Eliminar codigo duplicado
- [x] Corregir encoding roto
- [x] Revisar nombres inconsistentes
- [ ] Añadir comentarios importantes
- [ ] Limpiar imports muertos
- [x] Revisar async/await inseguros

## Fase 2 - Internationalization

Objetivo: hacer que ShipOne funcione automaticamante en el idioma configurado por el usuario.

### 2.1 Sistema de localizacion

- [x] Crear sistema `t()`
- [ ] Evitar textos hardcodeados
- [x] Crear carpeta `src/localization/`
- [x] Crear `package.nls.json`
- [x] Crear `package.nls.es.json`
- [ ] Crear `package.nls.fr.json`
- [ ] Crear `package.nls.de.json`

### 2.2 Internacionalizacion de `package.json`

- [x] Traducir `displayName`
- [x] Traducir `description`
- [x] Traducir comandos
- [x] Traducir settings
- [x] Traducir descriptions
- [ ] Traducir titles
- [ ] Traducir menues contextuales

### 2.3 UI completa

- [x] Traducir warnings
- [ ] Traducir errors
- [x] Traducir success messages
- [x] Traducir quick picks
- [x] Traducir placeholders
- [x] Traducir input boxes
- [x] Traducir onboarding
- [x] Traducir focus mode
- [x] Traducir health messages
- [x] Traducir weekly review

### 2.4 Idiomas iniciales

- [ ] Ingles
- [ ] Espanol
- [ ] Frances
- [ ] Aleman
- [ ] Portugues

## Fase 3 - UX Polish

Objetivo: hacer que la extension se sienta profesional.

### 3.1 Simplificacion UX

- [ ] Crear modo `Quick Create`
- [ ] Crear modo `Advanced Create`
- [ ] Reducir prompts innecesarios
- [ ] Mejorar defaults inteligentes
- [ ] Mejorar placeholders
- [ ] Mejorar spacing visual
- [ ] Reducir ruido en la vista
- [ ] Mejorar iconografia
- [ ] Mejorar empty states
- [ ] Mejorar health indicators
- [ ] Añadir badges claros

### 3.2 Onboarding

- [ ] Crear onboarding guiado
- [ ] Explicar filosofia de ShipOne
- [ ] Explicar la regla de un solo proyecto activo
- [ ] Crear walkthrough inicial

### 3.3 Descubribilidad

- [ ] Mejorar nombres de comandos
- [ ] Añadir aliases utiles
- [ ] Añadir comandos rapidos
- [ ] Añadir shortcuts opcionales

### 3.4 Errores

- [ ] Mensajes humanos
- [ ] Errores accionables
- [ ] Detectar Git faltante
- [ ] Detectar GH faltante
- [ ] Detectar permisos insuficientes
- [ ] Detectar rutas invalidas
- [ ] Añadir recovery suggestions

## Fase 4 - Testing and Reliability

Objetivo: publicar sin miedo.

### 4.1 Tests automaticos

- [ ] Unit tests para `ProjectStoreService`
- [ ] Tests de migracion de metadata
- [ ] Tests de transiciones de estado
- [ ] Tests de la regla de un activo
- [ ] Tests de sanitizacion de rutas
- [ ] Tests del scanner de TODO
- [ ] Tests de deteccion de salud
- [ ] Integration tests de creacion de proyecto
- [ ] Integration tests de apertura de proyecto
- [ ] Integration tests de cambio de estado
- [ ] Integration tests de sincronizacion de `STATUS.md`
- [ ] Integration tests de Git init
- [ ] Integration tests del flujo GitHub

### 4.2 QA manual

- [ ] Windows
- [ ] macOS
- [ ] Linux
- [ ] Sin Git
- [ ] Sin GH CLI
- [ ] Offline
- [ ] Rutas con espacios
- [ ] Rutas Unicode

### 4.3 Performance

- [ ] Lazy load de partes pesadas
- [ ] Evitar rescans innecesarios
- [ ] Cachear health checks
- [ ] Cachear scan de TODO
- [ ] Reducir refresh globales
- [ ] Optimizar TreeDataProvider

## Fase 5 - Marketplace Readiness

Objetivo: preparar ShipOne para usuarios reales.

### 5.1 Branding

- [ ] Logo final
- [ ] Banner final
- [ ] Screenshots reales
- [ ] GIF demo
- [ ] Marketplace preview
- [ ] Colores consistentes
- [ ] Iconografia consistente

### 5.2 README profesional

- [ ] Hero section
- [ ] GIF principal
- [ ] Problema que resuelve
- [ ] Quick start
- [ ] Screenshots
- [ ] Filosofia
- [ ] Features
- [ ] Workflow
- [ ] Configuracion
- [ ] FAQ
- [ ] Troubleshooting
- [ ] Contributing
- [ ] Roadmap publico

### 5.3 GitHub publico

- [ ] Hacer repo publico
- [ ] Añadir `.github/`
- [ ] Issue templates
- [ ] Bug report template
- [ ] Feature request template
- [ ] Pull request template
- [ ] `CODE_OF_CONDUCT`
- [ ] `CONTRIBUTING.md`
- [ ] `SECURITY.md`
- [ ] `LICENSE`
- [ ] `CHANGELOG.md`

### 5.4 CI/CD

- [ ] GitHub Actions
- [ ] Build automatico
- [ ] Lint automatico
- [ ] Tests automaticos
- [ ] Package VSIX
- [ ] Release workflow
- [ ] Semantic versioning
- [ ] Auto changelog

### 5.5 Publicacion en Marketplace

- [ ] Crear publisher
- [ ] Configurar `vsce`
- [ ] Configurar PAT
- [ ] Verificar `package.json`
- [ ] Verificar keywords
- [ ] Verificar categories
- [ ] Añadir icon
- [ ] Añadir repository url
- [ ] Añadir bugs url
- [ ] Añadir homepage url
- [ ] Publicar beta privada
- [ ] Recoger feedback
- [ ] Corregir bugs criticos
- [ ] Publicar v1 estable

## Fase 6 - Product Consolidation

Objetivo: evitar feature creep.

### 6.1 Core oficial

ShipOne debe centrarse oficialmente en:

- [ ] Project States
- [ ] One Active Project
- [ ] Next Action
- [ ] Focus Mode
- [ ] STATUS.md
- [ ] Project Health
- [ ] Weekly Review

### 6.2 Features secundarias

- [ ] GitHub
- [ ] AI context
- [ ] TODO scan
- [ ] Templates
- [ ] Metrics

Estas features deben apoyar el nucleo, no dominar el producto.

## Estado funcional actual

Estas areas ya estan bastante avanzadas en el codigo actual:

- [x] vista lateral propia
- [x] almacenamiento local de proyectos
- [x] estados de proyecto
- [x] un proyecto activo
- [x] next action
- [x] favoritos
- [x] foco en proyecto activo
- [x] STATUS.md
- [x] metrics basicas
- [x] busqueda de proyectos
- [x] checklist MVP
- [x] congelar y reanudar
- [x] weekly review
- [x] deteccion de TODO/FIXME
- [x] deteccion de bloqueadores
- [x] generacion de AI context
- [x] Git local opcional
- [x] GitHub opcional
- [x] templates basicos

## Siguiente bloque recomendado

La prioridad profesional ahora mismo es:

1. estabilizar arquitectura
2. corregir encoding y consistencia textual
3. empezar localizacion
4. separar `extension.ts`
5. añadir tests basicos
6. mejorar UX del flujo de creacion y revision

## Nota final

ShipOne ya tiene valor funcional. Lo que falta ahora es convertirlo en un producto que se pueda mantener, explicar y publicar sin miedo.
