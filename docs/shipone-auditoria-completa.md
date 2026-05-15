# ShipOne - Auditoria completa del estado actual

Fecha de auditoria: 2026-05-15

Este documento resume el estado real de la extension ShipOne despues de revisar el codigo fuente, la estructura del repo, la logica de negocio y la UI del panel lateral. Sirve como base para seguir desarrollando, refactorizar o pasar el proyecto a otra persona o IA sin perder contexto.

## 1. Resumen ejecutivo

ShipOne ya no es un esqueleto. Es una extension de VS Code con una base funcional amplia para crear, organizar, seguir y cerrar proyectos desde un panel propio.

Lo mas importante que hace hoy:

- crea proyectos con templates;
- guarda metadata local de cada proyecto;
- muestra una vista lateral con estados, metricas y alertas;
- permite marcar proyectos como `idea`, `active`, `paused` o `finished`;
- mantiene un solo proyecto activo si la configuracion lo exige;
- sincroniza `STATUS.md` y genera `AI_CONTEXT.md`;
- integra Git y GitHub de forma opcional;
- detecta bloqueadores y TODO/FIXME;
- soporta focus mode, weekly review, favoritos y reanudacion de proyectos.

La idea de producto es clara: ayudar a terminar proyectos, no solo a crearlos.

## 2. Alcance de la auditoria

Se reviso:

- estructura del repo;
- archivos de entrada principales;
- modelo de datos;
- persistencia;
- creacion de proyectos;
- comandos;
- providers de UI;
- servicios de dominio;
- utilidades;
- onboarding;
- configuracion y packaging;
- calidad tecnica visible;
- riesgos y deuda.

Tambien se ejecuto la compilacion del proyecto y paso correctamente con:

- `npm.cmd run compile`

No se detectaron fallos de TypeScript en el estado actual.

## 3. Estructura general del proyecto

La estructura esta bastante bien separada para una extension de VS Code:

- `src/extension.ts`
- `src/commands/projects/`
- `src/models/`
- `src/providers/`
- `src/providers/treeNodes/`
- `src/services/`
- `src/utils/`
- `src/onboarding/`
- `media/branding/`
- `docs/`

### Lectura arquitectonica

- `extension.ts` funciona como bootstrap y coordinador.
- `services/` contiene la logica de negocio y persistencia.
- `providers/` arma la UI del panel lateral.
- `commands/` agrupa acciones por dominio.
- `models/` define contratos de datos.
- `utils/` resuelve filtros y formatos.

La separacion ya es buena, pero `extension.ts` sigue siendo un punto central demasiado grande para el volumen funcional actual.

## 4. Estado funcional real

ShipOne hoy cubre un flujo bastante completo:

1. onboarding inicial;
2. configuracion de carpeta base;
3. creacion de proyecto;
4. templates por tipo;
5. guardado de metadata;
6. opcionalmente Git local;
7. opcionalmente repo GitHub;
8. vista lateral con estados y metricas;
9. acciones rapidas por proyecto;
10. revision de salud y contexto;
11. cierre o congelacion del proyecto;
12. reanudacion y seguimiento.

Eso significa que el producto ya tiene una narrativa de uso completa y no solo utilidades sueltas.

## 5. Modelo de datos

### `ProjectMetadata`

El modelo de proyecto esta bastante completo:

- `id`
- `name`
- `description`
- `type`
- `status`
- `path`
- `repoUrl`
- `createdAt`
- `lastOpenedAt`
- `finishedAt`
- `nextAction`
- `favorite`
- `tags`
- `mvpTasks`
- `pauseReason`
- `pauseNote`

### `ProjectStatus`

Los estados soportados son:

- `idea`
- `active`
- `paused`
- `finished`

### `MvpTask`

Cada tarea MVP tiene:

- `id`
- `text`
- `done`

### Valor de producto

El modelo no solo guarda datos. Guarda contexto de trabajo real:

- estado del proyecto;
- proxima accion;
- historial de apertura;
- motivo de pausa;
- checklist MVP;
- favorito;
- repo remoto;
- metadatos utiles para IA.

## 6. Configuracion

La configuracion vive en el namespace `shipone` y esta bastante madura.

### Ajustes actuales

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

### Lectura tecnica

La configuracion cubre bien:

- ruta base de proyectos;
- template por defecto;
- visibilidad GitHub;
- Git y GitHub por defecto;
- una sola app activa;
- creacion automatica de `STATUS.md`;
- package manager;
- templates personalizados;
- apertura automatica;
- avisos por inactividad;
- ocultar o mostrar terminados.

## 7. Persistencia y almacenamiento

### `ProjectStoreService`

La persistencia se hace en `globalStorageUri` de VS Code con:

- `projects.json`
- `projects.json.bak`

### Lo que ya hace bien

- inicializa almacenamiento;
- carga proyectos;
- guarda con backup previo;
- recupera desde backup;
- actualiza proyecto existente;
- crea proyecto nuevo;
- cambia estados;
- marca favorito;
- cambia `nextAction`;
- guarda tareas MVP;
- marca tareas MVP como hechas;
- congela proyecto;
- registra aperturas;
- agrupa por estado;
- crea carpetas.

### Observacion importante

La capa de persistencia ya aplica reglas de negocio, no solo I/O. Eso esta bien para un producto pequeno o mediano, pero ya esta cerca del limite donde convendria separar validacion, mutacion y almacenamiento.

### Riesgos detectados

- si el JSON esta corrupto, la recuperacion cae a lista vacia con poco detalle;
- la normalizacion es util, pero puede esconder errores de datos;
- no hay una politica visible de migraciones versionadas mas explicita;
- la recuperacion automatica existe, pero no esta muy expuesta al usuario.

## 8. Creacion de proyectos

### `ProjectCreationService`

Es uno de los bloques mas completos del proyecto.

### Flujo real actual

1. pedir nombre;
2. pedir tipo;
3. pedir descripcion;
4. pedir carpeta destino;
5. pedir package manager;
6. pedir si se crea Git local;
7. comprobar autenticacion de GitHub CLI si Git se va a usar;
8. preguntar si crear repo GitHub y su visibilidad;
9. evitar colision de carpeta;
10. crear carpeta;
11. crear metadata;
12. crear `STATUS.md` si corresponde;
13. generar template;
14. inicializar Git;
15. crear commit inicial;
16. crear repo GitHub si aplica;
17. registrar proyecto en el almacenamiento;
18. abrir el proyecto si la config lo indica.

### Templates soportados

- `blank`
- `react-vite`
- `nextjs`
- `python`
- `node-api`

### Punto importante

Hay una inconsistencia funcional:

- `node-api` existe en el tipo de configuracion y en `TemplateService`;
- pero no aparece en el selector de tipo de proyecto de la UI de creacion;
- tampoco aparece en el filtro rapido de busqueda.

Eso hace que el template exista, pero no este realmente accesible desde los flujos principales.

### Lectura tecnica

La creacion esta bien pensada y es segura en varios puntos:

- no sobreescribe carpetas existentes;
- no rompe el flujo completo si falla Git;
- no rompe el flujo completo si falla GitHub;
- mantiene la idea de crear primero la carpeta y luego completar el resto.

### Riesgo de atomicidad

Si una parte intermedia falla despues de crear la carpeta, pueden quedar proyectos parcialmente creados. Es aceptable para una extension de este tipo, pero convendria mejorar la recuperacion o limpieza de estados intermedios.

## 9. UI y experiencia visual

### `ShipOneProjectsTreeDataProvider`

La UI lateral es bastante rica. No muestra solo proyectos:

- muestra metricas;
- muestra warnings del proyecto activo;
- agrupa por estado;
- soporta focus mode;
- muestra empty states;
- renderiza salud de cada proyecto;
- expone favoritas, next action y progreso MVP.

### Nodos visuales

- `MetricsNode`
- `MetricItemNode`
- `GroupNode`
- `ProjectNode`
- `WarningNode`
- `FocusNode`
- `EmptyStateNode`

### Lo que comunica la UI

La vista transmite:

- orden;
- foco;
- salud;
- avance;
- pausas;
- proyectos terminados;
- proximidad al siguiente paso.

### Lo que hace bien

- es util sin salir de VS Code;
- tiene jerarquia visual clara;
- usa tooltips para dar contexto;
- usa iconos para reforzar estados;
- resalta favorito y estado;
- muestra alertas sin obligar a abrir muchos archivos.

### Lo que podria mejorar

- hay bastante densidad de informacion en una sola vista;
- algunos mensajes de estado se repiten entre description, tooltip y warning;
- la UI ya funciona, pero puede sentirse algo cargada si hay muchos proyectos;
- faltan mas estados intermedios o vistas resumidas para reducir ruido.

## 10. Sistema de salud

### `ProjectHealthService`

La salud del proyecto se calcula con:

- `nextAction` presente o no;
- estado `active` con inactividad;
- existencia de `README.md`;
- commits recientes en Git.

### Criterios

- `healthy`
- `warning`
- `bad`

### Observacion tecnica

El sistema es util, pero tiene limites:

- un proyecto nuevo puede marcarse como poco sano aunque apenas haya arrancado;
- la dependencia de `git log` hace que repos sin historial den resultados pobres;
- el criterio de salud mezcla contexto real con heuristicas simples.

Eso no es un error, pero si una decision de producto que conviene documentar bien.

## 11. Comandos

La extension expone muchos comandos y ya tiene bastante cobertura de uso real.

### Comandos de creacion y arranque

- `shipone.createProject`
- `shipone.createSampleIdea`
- `shipone.setProjectsRoot`
- `shipone.openProjectsRoot`
- `shipone.openProjectQuickPick`
- `shipone.searchProject`

### Comandos de operacion

- `shipone.openProject`
- `shipone.changeProjectStatus`
- `shipone.markProjectIdea`
- `shipone.markProjectActive`
- `shipone.markProjectPaused`
- `shipone.markProjectFinished`
- `shipone.editNextAction`
- `shipone.clearNextAction`
- `shipone.toggleFavorite`
- `shipone.openStatusFile`
- `shipone.refreshProjects`

### Comandos de mantenimiento y contexto

- `shipone.editMvpChecklist`
- `shipone.markMvpItemDone`
- `shipone.syncStatusFile`
- `shipone.recoverStorage`
- `shipone.connectGithub`
- `shipone.detectBlockers`
- `shipone.generateAiContext`

### Comandos de revision

- `shipone.scanTodos`
- `shipone.focusMode`
- `shipone.exitFocusMode`
- `shipone.weeklyReview`
- `shipone.freezeProject`
- `shipone.resumeProject`

### Lectura tecnica

El catalogo ya es amplio. El riesgo no es falta de comandos, sino exceso de superficie funcional si no se agrupa mejor la experiencia.

## 12. Onboarding

### `showFirstRunOnboarding`

El primer arranque muestra una bienvenida con opciones para:

- crear proyecto;
- crear idea de ejemplo;
- elegir carpeta base;
- conectar GitHub;
- abrir ajustes.

### Hallazgo

El flag `shipone.firstRunSeen` se guarda antes de completar la accion elegida. Eso evita repetir el onboarding, pero tambien hace que si el flujo se interrumpe, el usuario no vuelva a verlo automaticamente.

Es un detalle pequeno, pero real.

## 13. Integracion con Git y GitHub

### `GitService`

Hace:

- `git init`
- `git add .`
- `git commit -m "chore: initial commit"`
- `git branch -M main`

### `GithubService`

Hace:

- comprobar si `gh` existe;
- comprobar autenticacion;
- abrir terminal con `gh auth login`;
- crear repo con `gh repo create`;
- devolver la URL del repo.

### Dependencias externas

La integracion funciona, pero depende de:

- Git instalado;
- GitHub CLI instalado;
- GitHub CLI autenticado.

Si falta algo, la extension avisa y sigue, lo cual esta bien para no bloquear el flujo local.

## 14. Review de la logica de negocio

### Fortalezas

- el dominio esta bien orientado a un flujo de proyectos reales;
- la regla de un solo `active` esta bien integrada;
- hay soporte para `paused`, `finished`, `favorite` y `nextAction`;
- la persistencia refleja bastante bien el estado de trabajo;
- la extension conecta UI y datos de forma clara.

### Fragilidades

- `extension.ts` sigue concentrando demasiada responsabilidad;
- la logica de estado y la logica de UI se cruzan mucho;
- algunos flujos dependen de varios servicios coordinados sin una capa de orquestacion mas formal;
- no hay tests visibles para validar reglas criticas.

## 15. Calidad de codigo

### Lo bueno

- TypeScript bien usado;
- tipos de dominio definidos;
- servicios relativamente pequenos;
- nombres funcionales y claros;
- compilacion correcta;
- separacion por carpetas razonable.

### Lo delicado

- `extension.ts` es demasiado central;
- `ProjectStoreService` hace bastante mas que almacenar;
- `ProjectCreationService` mezcla UX, validacion, filesystem, Git, GitHub y templates;
- `TreeRendererService` crea su renderer en cada llamada a `getChildren`;
- falta una capa de pruebas.

## 16. Calidad de texto y codificacion

Se detectaron varios textos con mojibake o codificacion rota en el codigo y en documentos existentes. Ejemplos claros:

- textos de visibilidad como `Público`;
- separadores como `·`;
- algunas cadenas de UI y mensajes traducidos;
- el propio documento previo de auditoria ya arrastraba esos caracteres.

### Impacto

- la UX se ve afectada;
- la lectura del codigo empeora;
- puede dar la sensacion de un producto menos pulido;
- dificulta futuras traducciones o publicacion en marketplace.

### Prioridad

Alta. Es una deuda visible para el usuario final.

## 17. Hallazgos principales

### Critico

Ninguno que impida el funcionamiento actual inmediato.

### Alto

1. `extension.ts` acumula demasiada responsabilidad y ya merece division por dominios.
2. Hay textos con codificacion rota en varias partes de la UI y utilidades.
3. `node-api` existe, pero no esta expuesto en los flujos principales de creacion y busqueda.

### Medio

1. La persistencia recupera silenciosamente a lista vacia en algunos fallos, lo que puede ocultar problemas de datos.
2. El sistema de salud depende de heuristicas simples y de Git, lo que puede generar falsos negativos en proyectos nuevos.
3. El onboarding marca la primera ejecucion como vista antes de completar la accion elegida.
4. La UI del arbol es rica pero puede quedar demasiado cargada cuando hay muchos proyectos.

### Bajo

1. `TreeRendererService` recrea el renderer en cada llamada.
2. Hay mensajes y descripciones duplicadas entre tooltip, description y warnings.
3. Falta un set de tests basicos para reglas criticas.

## 18. Fortalezas del producto

ShipOne ya tiene una identidad de producto bastante clara:

- foco en terminar proyectos;
- vista visual propia;
- estados comprensibles;
- contexto util para IA;
- soporte para pausas y reanudacion;
- integracion opcional con Git/GitHub;
- revision rapida del estado del trabajo.

Esto es importante: la extension no parece improvisada. Ya tiene una propuesta de valor reconocible.

## 19. Debilidad estructural principal

La debilidad mas clara es la concentracion de responsabilidad:

- `src/extension.ts` coordina demasiadas cosas;
- los servicios crecen con logica de producto;
- los comandos ya son muchos;
- la UX lateral tiene bastante densidad.

No es un problema de que el proyecto este mal hecho. Es un problema natural de crecimiento. Pero si no se corrige, el mantenimiento sera mas caro con cada feature nueva.

## 20. Recomendaciones priorizadas

### Inmediatas

1. Corregir la codificacion de textos y cadenas visibles.
2. Exponer `node-api` en los flujos de UI si realmente es parte del producto.
3. Separar `extension.ts` por dominios o coordinadores mas pequenos.

### Corto plazo

1. Crear tests para `ProjectStoreService`, parseo de metadata y utilidades de estado.
2. Mejorar la politica de recuperacion de datos corruptos.
3. Reducir duplicacion entre tooltip, description y mensajes.

### Medio plazo

1. Simplificar la experiencia de la vista lateral.
2. Revisar si todos los comandos siguen siendo necesarios.
3. Definir mejor el MVP frente a features secundarias.

### Largo plazo

1. Formalizar migraciones de datos.
2. Mejorar observabilidad y diagnostico.
3. Preparar el proyecto para release publico con textos, capturas y flujo de instalacion mas pulidos.

## 21. Estado de documentacion y branding

### Documentacion

El repo ya tiene:

- `README.md`
- `STATUS.md`
- `shipone_dossier_checklist.md`
- `docs/shipone-roadmap-public-release.md`
- este archivo de auditoria

### Branding

En `media/branding/` hay un set completo de imagenes y recursos visuales:

- iconos en varios tamanos;
- `banner.png`;
- `logo.svg`;
- `logo-transparent.png`;
- `marketplace-preview.png`.

Eso indica que el proyecto ya piensa en presentacion, no solo en funcionalidad interna.

## 22. Conclusiones

ShipOne ya es una extension con base real y con una propuesta de valor concreta.

Lo mejor:

- tiene logica de producto clara;
- tiene UI propia;
- tiene persistencia;
- tiene flujos completos de creacion y seguimiento;
- compila correctamente;
- ya soporta muchos escenarios de uso real.

Lo que mas urge:

- limpiar la codificacion rota;
- bajar la complejidad de `extension.ts`;
- exponer mejor `node-api` si realmente forma parte del producto;
- añadir pruebas basicas;
- pulir la experiencia visual.

Lectura final:

ShipOne ya no necesita mas "ideas". Necesita orden, pulido y control de calidad para consolidarse como una extension seria para seguir y terminar proyectos dentro de VS Code.
