# ShipOne - Auditoria completa

Fecha: 2026-05-19

Este documento resume el estado real de ShipOne tras revisar codigo, UI, logica de negocio, persistencia, localizacion, pruebas y preparacion para release publico.

Esta escrito para poder compartirlo con otra IA o con una persona tecnica y que sirva como mapa fiable del proyecto.

## 1. Resumen ejecutivo

ShipOne ya es una extension de VS Code funcional y coherente.

Hoy hace bien estas cosas:

- crea proyectos nuevos con templates;
- mantiene metadata local por proyecto;
- organiza proyectos por estado;
- soporta un solo proyecto activo si la configuracion lo exige;
- genera `STATUS.md` y `AI_CONTEXT.md`;
- integra Git y GitHub de forma opcional;
- soporta focus mode, weekly review, favoritos y pausas;
- expone la UI principal en el Activity Bar;
- tiene localizacion completa en runtime;
- tiene packaging y branding preparados para publicacion.

La idea de producto es clara: ayudar a terminar proyectos, no solo a empezarlos.

## 2. Estado actual verificado

Validacion actual:

- `npm.cmd run test` pasa;
- la suite actual tiene 97 tests y 0 fallos;
- `npm.cmd run compile` pasa;
- el repo queda limpio tras los cambios recientes.

Pendientes que no dependen del codigo:

- probar macOS;
- probar Linux;
- crear cuenta de publisher;
- publicar estable;
- anunciar publicamente;
- recoger feedback comunitario;
- priorizar bugs post release.

## 3. Metodologia de la auditoria

Se reviso:

- entrada de la extension;
- bootstrap;
- comandos;
- modelos;
- servicios;
- providers de UI;
- utilidades;
- onboarding;
- localizacion;
- tests;
- manifests;
- branding;
- documentacion publica;
- roadmap de release.

La auditoria se baso en:

- lectura del codigo fuente;
- ejecucion de la suite de tests;
- revision de la documentacion existente;
- comprobacion de flujos de usuario reales.

## 4. Mapa del sistema

### Entrada

- `src/extension.ts`
- `src/bootstrap/shiponeBootstrap.ts`
- `src/bootstrap/shiponeApp.ts`

### Comandos

- `src/commands/projects/`
- `src/commands/status/`
- `src/commands/focus/`
- `src/commands/review/`
- `src/commands/github/`
- `src/commands/ai/`
- `src/commands/onboarding/`

### UI

- `src/providers/shiponeProjectsTreeDataProvider.ts`
- `src/providers/treeRendererService.ts`
- `src/providers/treeTooltipProvider.ts`
- `src/providers/treeNodes/`
- `src/providers/projectHealthRenderer.ts`

### Servicios

- `src/services/projectCreationService.ts`
- `src/services/projectStoreService.ts`
- `src/services/projectHealthService.ts`
- `src/services/templateService.ts`
- `src/services/statusFileService.ts`
- `src/services/projectContextService.ts`
- `src/services/gitService.ts`
- `src/services/githubService.ts`
- `src/services/projectRecoveryService.ts`
- `src/services/settingsService.ts`
- `src/services/todoScannerService.ts`

### Modelos y utilidades

- `src/models/`
- `src/utils/`
- `src/localization/`
- `src/onboarding/`

### Documentacion y branding

- `README.md`
- `docs/`
- `media/branding/`
- `CONTRIBUTING.md`
- `CHANGELOG.md`
- `SECURITY.md`
- `CODE_OF_CONDUCT.md`

## 5. Flujo real del usuario

### 5.1 Primer arranque

Al activar la extension:

- se inicializa `ShipOneApp`;
- se registran comandos;
- se crea el provider de arbol;
- se muestra onboarding si es la primera ejecucion;
- se habilita la vista lateral.

### 5.2 Crear proyecto

El flujo de creacion cubre:

1. nombre;
2. tipo de proyecto;
3. descripcion;
4. carpeta destino;
5. package manager;
6. Git local opcional;
7. GitHub opcional si Git local existe;
8. `STATUS.md` opcional;
9. template inicial;
10. apertura del proyecto al final si la config lo pide.

### 5.3 Trabajar con proyecto

El usuario puede:

- abrir un proyecto;
- cambiar estado;
- editar `nextAction`;
- marcar favorito;
- editar checklist MVP;
- marcar tarea MVP hecha;
- congelar proyecto;
- reanudarlo;
- generar `AI_CONTEXT.md`;
- sincronizar `STATUS.md`;
- detectar bloqueadores;
- ejecutar weekly review.

### 5.4 Navegar por la UI

La vista lateral muestra:

- metricas globales;
- grupos por estado;
- warnings del activo;
- focus mode;
- empty states;
- tooltips con contexto.

## 6. Logica de dominio

### 6.1 Estados

ShipOne maneja:

- `idea`
- `active`
- `paused`
- `finished`

La regla de un solo `active` esta integrada en la logica de cambio de estado y en la creacion de proyectos.

### 6.2 Metadata

La metadata guarda:

- identidad;
- nombre;
- descripcion;
- tipo;
- estado;
- ruta;
- repo remoto;
- fecha de creacion;
- ultima apertura;
- fecha de cierre;
- siguiente accion;
- favorito;
- tags;
- tareas MVP;
- motivo de pausa;
- nota de pausa.

### 6.3 Valor funcional

La metadata no es solo persistencia.

Es contexto de trabajo real para:

- volver rapido a un proyecto;
- saber que sigue;
- ver si esta bloqueado;
- ver si esta parado;
- reconstruir contexto para una IA.

## 7. Persistencia y almacenamiento

### 7.1 Estructura

ShipOne guarda datos en `globalStorageUri` con:

- `projects.json`
- `projects.json.bak`

### 7.2 Comportamiento

`ProjectStoreService`:

- inicializa almacenamiento;
- carga proyectos;
- guarda con backup;
- recupera desde backup;
- normaliza metadata;
- migra datos viejos;
- agrupa por estado;
- actualiza `nextAction`;
- cambia estado;
- marca favorito;
- maneja tareas MVP;
- marca apertura;
- congela proyectos.

### 7.3 Riesgos

Todavia hay una mezcla de responsabilidades:

- persistencia;
- reglas de negocio;
- normalizacion;
- recuperacion.

Funciona bien, pero es candidato a separarse mas si crece el producto.

### 7.4 Recuperacion

La recuperacion ya no tiene botones ficticios en el flujo automatico de arranque.

El comando de recuperacion si ofrece acciones reales al usuario.

## 8. Creacion de proyectos

### 8.1 Comportamiento actual

`ProjectCreationService`:

- valida nombre;
- pide tipo;
- pide descripcion;
- crea carpeta;
- crea metadata;
- genera template;
- crea `STATUS.md` si toca;
- inicializa Git si se pide;
- crea commit inicial;
- crea repo GitHub si se pide;
- abre el proyecto si se pide;
- guarda las preferencias de tipo y package manager.

### 8.2 Templates

Templates soportados:

- `blank`
- `react-vite`
- `nextjs`
- `python`
- `node-api`

### 8.3 Ajuste importante

La creacion ya evita colisiones de nombre de carpeta y avanza con sufijo incremental cuando hace falta.

### 8.4 Riesgo residual

La creacion sigue siendo un flujo largo con varios puntos donde puede fallar a mitad.

Si algo falla despues de crear carpeta o archivos, pueden quedar restos parciales.

No es un fallo fatal, pero si una mejora futura clara.

## 9. UI y experiencia

### 9.1 Vista principal

La UI lateral comunica:

- cantidad de proyectos;
- estados;
- focus mode;
- warnings;
- project health;
- progreso;
- next action;
- favoritos.

### 9.2 Elementos visuales

- `MetricsNode`
- `MetricItemNode`
- `GroupNode`
- `ProjectNode`
- `WarningNode`
- `FocusNode`
- `EmptyStateNode`

### 9.3 Lo bueno

- el panel no depende de salir de VS Code;
- los tooltips aportan contexto real;
- el foco se puede activar o desactivar sin perder navegacion;
- las alertas aparecen con sentido;
- la jerarquia visual es clara.

### 9.4 Lo que conviene vigilar

- hay bastante densidad de informacion;
- algunos mensajes aparecen en varios sitios;
- la vista puede sentirse cargada si hay muchos proyectos;
- conviene evitar crecer el arbol sin simplificar primero.

## 10. Tooltips y texto contextual

Los tooltips cubren:

- grupo de proyectos;
- foco;
- empty states;
- warnings;
- proyectos individuales.

Eso ayuda mucho porque el usuario no necesita abrir archivos auxiliares para entender el estado.

## 11. Sistema de salud

### 11.1 Criterios

La salud se calcula con:

- `nextAction`;
- inactividad del activo;
- presencia de `README.md`;
- commits recientes en Git.

### 11.2 Salida

La extension clasifica salud en:

- `healthy`
- `warning`
- `bad`

### 11.3 Lectura de producto

Es un sistema util y simple.

No pretende ser un analizador profundo.

Sirve para dar senales rapidas de que falta algo importante.

## 12. Git y GitHub

### 12.1 Git

`GitService` maneja:

- `git init`;
- `git add .`;
- `git commit`;
- rama principal `main`.

### 12.2 GitHub

`GitHubService` maneja:

- comprobacion de `gh`;
- comprobacion de autenticacion;
- login en terminal;
- creacion de repo;
- obtencion de URL remota.

### 12.3 Dependencias externas

GitHub y Git dependen de herramientas externas:

- Git instalado;
- GitHub CLI instalado;
- GitHub CLI autenticado;
- secreto `VSCE_PAT` para publicar.

ShipOne lo soporta bien y no bloquea el flujo local si faltan.

## 13. Localizacion y codificacion

### 13.1 Localizacion runtime

El runtime ya usa `t()` y claves estructuradas de forma amplia.

Se cubren:

- comandos;
- notificaciones;
- warnings;
- errores;
- placeholders;
- descripciones;
- focus mode;
- weekly review;
- onboarding;
- tree UI;
- health;
- metrics.

### 13.2 Manifest localization

ShipOne tiene:

- `package.nls.json`
- `package.nls.es.json`

### 13.3 Codificacion

La validacion actual de UTF-8, JSON, markdown y TypeScript pasa.

Eso significa que la extension ya no arrastra los problemas de mojibake visibles que tenia antes.

## 14. Pruebas y calidad

### 14.1 Suite actual

La suite de pruebas pasa con:

- 97 tests;
- 0 fallos.

### 14.2 Cobertura visible

Hay pruebas para:

- storage;
- migracion;
- backup recovery;
- creacion de proyectos;
- Git;
- GitHub;
- onboarding;
- localizacion;
- README;
- workflows;
- roadmap de release;
- validacion UTF-8;
- utilidades de texto;
- tree UI;
- focus mode;
- weekly review.

### 14.3 Lo que falta

- no hay QA automatizado en macOS;
- no hay QA automatizado en Linux;
- no hay pruebas end-to-end de marketplace/public release;
- conviene mas cobertura de regresion para errores de escritura o rollback parcial.

## 15. Packaging y release

### 15.1 Metadatos

`package.json` ya tiene:

- icono;
- banner;
- keywords;
- categoria;
- repo;
- homepage;
- bugs URL;
- publisher;
- licencia;
- `engines.vscode`.

### 15.2 Assets

`media/branding/` contiene:

- iconos;
- banner;
- logo;
- logo transparente;
- preview para marketplace;
- notas de branding.

### 15.3 Documentacion publica

El repo ya incluye:

- `README.md`;
- `CONTRIBUTING.md`;
- `CODE_OF_CONDUCT.md`;
- `SECURITY.md`;
- `CHANGELOG.md`;
- roadmap de release;
- auditoria completa;
- walkthrough.

## 16. Seguridad y privacidad

ShipOne trabaja principalmente con:

- filesystem local;
- global storage de VS Code;
- Git opcional;
- GitHub CLI opcional.

No se ve telemetria ni intercambio oculto de datos.

Los secretos necesarios para publicar deben quedar fuera del repositorio.

## 17. Hallazgos actuales

### Alto

Ninguno que bloquee el uso normal actual.

### Medio

1. La creacion de proyecto sigue teniendo varios pasos y puede dejar restos parciales si algo falla a mitad.
2. `ProjectStoreService` sigue concentrando bastante logica de negocio y persistencia.
3. La UI lateral es util, pero puede crecer en densidad si se anaden mas features.

### Bajo

1. Hay mucha funcionalidad concentrada en pocos servicios.
2. Conviene seguir revisando que nuevos mensajes no dupliquen informacion ya visible en tooltips o warnings.

## 18. Lo que ya quedo resuelto

Durante la revision reciente ya se cerraron estos puntos:

- la localizacion visible del runtime;
- la codificacion rota;
- la guia publica del README;
- la colision de carpetas al crear proyectos;
- la recuperacion con botones no funcionales;
- la claridad de la documentacion publica;
- la calidad de la suite de tests.

## 19. Lo que queda fuera del codigo

Esto no lo puede cerrar el repo por si solo:

- instalar o verificar macOS;
- instalar o verificar Linux;
- crear la cuenta de publisher;
- publicar estable;
- anunciar publicamente;
- recoger feedback real de usuarios;
- priorizar bugs del mundo real tras publicar.

## 20. Recomendaciones priorizadas

### Inmediatas

1. Mantener la suite verde.
2. No volver a meter botones o acciones que no hagan nada.
3. Seguir evitando colisiones y estados parciales en flujos largos.

### Corto plazo

1. Preparar QA real en macOS y Linux.
2. Revisar si `ProjectStoreService` y `ProjectCreationService` merecen una division mas fina.
3. Mantener la UI simple si se agregan mas proyectos o mas tipos.

### Medio plazo

1. Anadir rollback o limpieza de artefactos parciales si la creacion falla a mitad.
2. Seguir mejorando observabilidad y mensajes de error.
3. Reducir cualquier duplicacion entre vista, tooltip y mensajes.

## 21. Veredicto final

ShipOne ya esta en una fase madura.

No parece un prototipo.

No parece un MVP roto.

Parece una extension con identidad clara, buena base tecnica, buena cobertura de dominio y una preparacion razonable para publicacion publica.

Mi lectura final:

- el codigo ya vale;
- la UX ya vale;
- la documentacion ya vale;
- la calidad general ya vale;
- lo que falta ahora es publicar, probar plataformas externas y recoger feedback real.
