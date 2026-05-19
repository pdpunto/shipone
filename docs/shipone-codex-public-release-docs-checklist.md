# ShipOne - Checklist de documentacion para release publico

Fecha: 2026-05-19

Objetivo: dejar la documentacion de ShipOne lista para publicarse como proyecto open source y como extension de VS Code Marketplace.

## Proposito

ShipOne ya tiene base funcional. Ahora toca dejar clara su presentacion publica.

Este checklist sirve para:

- [ ] ordenar la documentacion;
- [ ] separar lo publico de lo interno;
- [ ] preparar el README final;
- [ ] completar las guias de usuario;
- [ ] completar las guias tecnicas;
- [ ] preparar el repo para GitHub y Marketplace;
- [ ] evitar tono interno o de borrador.

## Checklist maestro

- [x] Fase 1 - Auditoria inicial
- [x] Fase 2 - Separar documentacion
- [x] Fase 3 - README publico profesional
- [x] Fase 4 - Documentacion de usuario
- [x] Fase 5 - Documentacion tecnica
- [x] Fase 6 - GitHub open source
- [x] Fase 7 - Marketplace
- [x] Fase 8 - Configuracion y uso real
- [x] Fase 9 - Requisitos y limitaciones
- [x] Fase 10 - Capturas y multimedia
- [x] Fase 11 - Troubleshooting
- [x] Fase 12 - FAQ
- [x] Fase 13 - Contribucion
- [x] Fase 14 - Seguridad y privacidad
- [x] Fase 15 - Release y publicacion
- [x] Fase 16 - Limpieza de tono
- [x] Fase 17 - Validacion final
- [x] Fase 18 - Prioridad de trabajo
- [x] Fase 19 - Resumen corto

## Reglas de estilo

- Responder en tono de producto.
- No usar frases de proceso interno.
- No prometer assets que no existen.
- No mezclar documentacion publica con notas internas.
- No dejar enlaces rotos.
- No dejar texto con codificacion rota.

## 1. Auditoria inicial

Antes de editar nada, revisar:

- `README.md`
- `CONTRIBUTING.md`
- `SECURITY.md`
- `CHANGELOG.md`
- `CODE_OF_CONDUCT.md`
- carpeta `docs/`
- carpeta `media/branding/`
- `package.json`
- `package.nls.json`
- `package.nls.es.json`
- comandos expuestos por la extension
- settings publicas
- scripts npm
- workflows de GitHub Actions
- capturas y GIF reales

Resultado esperado:

- saber que es publico;
- saber que es tecnico;
- saber que es interno;
- saber que sobra;
- saber que falta.

## 2. Separar documentacion

Estructura recomendada:

```txt
docs/
  user/
  technical/
  internal/
  assets/
```

### Tareas

- crear `docs/user/`
- crear `docs/technical/`
- crear `docs/internal/`
- crear `docs/assets/`
- mover auditorias a `docs/internal/audits/`
- mover roadmaps internos a `docs/internal/roadmap/`
- crear `docs/README.md` como indice global
- evitar que el README principal enlace a notas internas

## 3. README publico

El README debe ser la pagina principal del producto.

### Debe incluir

- nombre y tagline
- descripcion corta
- problemas que resuelve
- features principales
- quick start
- flujo real de uso
- estados de proyecto
- configuracion
- requisitos
- screenshots
- limitaciones conocidas
- troubleshooting
- FAQ
- contribucion
- seguridad y privacidad
- licencia

### Debe evitar

- lenguaje interno;
- referencias a trabajo pendiente;
- promesas visuales que no existen;
- texto largo al inicio;
- repeticiones;
- tono de borrador.

## 4. Documentacion de usuario

Crear o completar estas guias:

- `docs/user/getting-started.md`
- `docs/user/configuration.md`
- `docs/user/project-states.md`
- `docs/user/troubleshooting.md`
- `docs/user/faq.md`
- `docs/user/known-limitations.md`

### Cada una debe cubrir

- que hace;
- como se usa;
- cuando usarlo;
- que pasa si algo falla;
- que no hace.

## 5. Documentacion tecnica

Crear o completar estas guias:

- `docs/technical/architecture.md`
- `docs/technical/data-model.md`
- `docs/technical/persistence.md`
- `docs/technical/project-creation.md`
- `docs/technical/localization.md`
- `docs/technical/release.md`

### Cada una debe cubrir

- estructura del sistema;
- flujo de datos;
- reglas de negocio;
- dependencias externas;
- riesgos conocidos;
- comportamiento ante fallos.

## 6. GitHub open source

Preparar:

- `.github/ISSUE_TEMPLATE/bug_report.md`
- `.github/ISSUE_TEMPLATE/feature_request.md`
- `.github/ISSUE_TEMPLATE/config.yml`
- `.github/PULL_REQUEST_TEMPLATE.md`

### Tambien revisar

- `CONTRIBUTING.md`
- `SECURITY.md`
- `CHANGELOG.md`
- `CODE_OF_CONDUCT.md`
- `LICENSE`

## 7. Marketplace

Preparar todo para publicar bien en VS Code Marketplace.

### Revisar en `package.json`

- `name`
- `displayName`
- `description`
- `publisher`
- `version`
- `license`
- `repository`
- `bugs`
- `homepage`
- `icon`
- `banner`
- `categories`
- `keywords`
- `engines.vscode`
- `activationEvents`
- comandos
- vistas
- settings
- localizacion del manifest

### Revisar tambien

- `.vscodeignore`
- tamanio del paquete
- README renderizado
- icono
- banner
- preview
- enlaces
- secretos

## 8. Configuracion y uso real

Documentar claramente:

- `shipone.projectsRoot`
- `shipone.defaultVisibility`
- `shipone.defaultProjectType`
- `shipone.createGitRepoByDefault`
- `shipone.createGitHubRepoByDefault`
- `shipone.enforceOneActiveProject`
- `shipone.createStatusFileByDefault`
- `shipone.defaultPackageManager`
- `shipone.customTemplateFolder`
- `shipone.openAfterCreate`
- `shipone.inactiveWarningDays`
- `shipone.staleWarningDays`
- `shipone.showFinishedProjects`

Para cada setting:

- nombre exacto;
- valor por defecto;
- para que sirve;
- impacto real.

## 9. Requisitos y limitaciones

Documentar:

- version minima de VS Code;
- Node y npm para desarrollo local;
- Git opcional;
- GitHub CLI opcional;
- uso offline;
- uso con GitHub;
- limites conocidos;
- dependencias externas.

## 10. Capturas y multimedia

### Necesario para publicacion

- captura general de la vista;
- captura con proyecto activo;
- captura de estados;
- captura de Focus Mode;
- captura de creacion de proyecto;
- captura de STATUS.md si aporta;
- screenshot de marketplace;
- banner principal;
- logo final.

### Regla

- si no existe de verdad, no prometerlo;
- si existe, enlazarlo bien;
- no usar assets rotos;
- no mostrar datos privados.

## 11. Troubleshooting

Debe cubrir al menos:

- extension no arranca;
- no aparecen proyectos;
- fallo de compilacion;
- fallo de Git;
- fallo de GitHub CLI;
- fallo de autenticacion;
- storage corrupto;
- carpeta ya existente;
- rutas con espacios;
- permisos;
- problemas al publicar;
- `VSCE_PAT`.

## 12. FAQ

Debe responder:

- si necesita GitHub;
- si necesita Git;
- si funciona offline;
- donde guarda datos;
- si sube datos a servidores;
- si puede haber mas de un proyecto activo;
- que es `STATUS.md`;
- que es `AI_CONTEXT.md`;
- si acepta templates propios;
- si se puede ocultar lo terminado;
- si se puede contribuir.

## 13. Contribucion

`CONTRIBUTING.md` debe explicar:

- como instalar dependencias;
- como compilar;
- como correr tests;
- como abrir la extension en desarrollo;
- estilo de codigo;
- como proponer cambios;
- como hacer PRs pequenos;
- como evitar secretos.

## 14. Seguridad y privacidad

Documentar:

- datos locales;
- VS Code global storage;
- Git opcional;
- GitHub opcional;
- no subir secretos;
- no subir `.env`;
- reporte de vulnerabilidades.

## 15. Release y publicacion

Documentar:

- beta;
- estable;
- changelog;
- versionado semantico;
- `vsce`;
- `VSCE_PAT`;
- GitHub Release;
- checklist previa;
- checklist posterior.

## 16. Limpieza de tono

Eliminar de docs publicas:

- "pendiente";
- "por hacer";
- "vamos a";
- "mas adelante";
- "demo por grabar";
- "esto falta";
- "lo siguiente que queremos";
- referencias internas a IA;
- nombres personales innecesarios.

## 17. Validacion final

El conjunto de docs esta listo cuando:

- un usuario nuevo entiende ShipOne en menos de 1 minuto;
- sabe instalarlo;
- sabe probarlo;
- sabe configurarlo;
- sabe que hacer si falla;
- sabe que limita el producto;
- no hay tono interno;
- no hay enlaces rotos;
- no hay texto roto;
- no hay multimedia inventada;
- el repo se ve publico y serio.

## 18. Prioridad de trabajo

### Primero

1. README final.
2. Guia de instalacion y uso.
3. FAQ y troubleshooting.
4. Limitaciones conocidas.
5. Requisitos y configuracion.

### Segundo

1. Arquitectura.
2. Modelo de datos.
3. Persistencia.
4. Creacion de proyectos.
5. Release.

### Tercero

1. Capturas.
2. Banner.
3. Logo.
4. Marketplace preview.
5. GitHub issue templates.

## 19. Resumen corto

Lo que falta para cerrar la documentacion de ShipOne es:

- orden;
- claridad;
- tono publico;
- guias de usuario;
- docs tecnicas;
- release;
- GitHub;
- Marketplace;
- assets reales.

Cuando eso este hecho, ShipOne ya no parecera un proyecto interno bien avanzado, sino un producto publico bien presentado.
