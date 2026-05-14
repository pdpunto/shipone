# ShipOne - Auditoria completa del estado actual

Fecha de auditoria: 2026-05-14

Este documento resume el estado real actual de ShipOne. Sirve como contexto completo para continuar el desarrollo, pasar el proyecto a otra IA o hacer una revision tecnica y de producto sin perder nada importante.

## 1. Resumen ejecutivo

ShipOne es una extension de VS Code orientada a ayudar a desarrollar, organizar y terminar proyectos. El enfoque principal ya no es solo crear carpetas o guardar metadata: ahora el producto mezcla gestion de proyectos, foco, salud del proyecto, checklist MVP, STATUS.md, busqueda, favoritos, congelacion/reanudacion, deteccion de bloqueadores, generacion de contexto para IA y automatizacion de arranque con Git y GitHub.

La extension ya tiene una base funcional amplia y bastante avanzada. No es un esqueleto inicial. Tiene:

- un panel lateral propio dentro de VS Code;
- una vista agrupada por estado;
- metrica basica;
- favoritos;
- foco en un proyecto activo;
- flujo de creacion de proyectos con templates;
- almacenamiento local persistente;
- integracion opcional con Git y GitHub;
- sincronizacion con STATUS.md;
- herramientas auxiliares para revisar tareas, bloqueos y contexto.

La idea de producto sigue siendo clara: ayudar a terminar proyectos, no solo a arrancarlos.

## 2. Estado del repositorio

### 2.1. Archivos relevantes detectados

```txt
src/
  extension.ts
  models/
    project.ts
    settings.ts
  providers/
    shiponeProjectsTreeDataProvider.ts
    index.ts
  services/
    settingsService.ts
    projectStoreService.ts
    projectCreationService.ts
  utils/
    index.ts
media/branding/
  branding-notes.md
  banner.png
  icon-16.png
  icon-24.png
  icon-32.png
  icon-48.png
  icon-64.png
  icon-128.png
  icon-256.png
  icon-512.png
  icon.png
  logo.svg
  logo-transparent.png
  marketplace-preview.png
package.json
README.md
STATUS.md
shipone_dossier_checklist.md
shipone.code-workspace
```

### 2.2. Estado de git

En el momento de esta auditoria hay dos archivos sin trackear en el workspace:

- `STATUS.md`
- `shipone.code-workspace`

Eso significa que el repositorio no esta completamente limpio. El resto del codigo principal parece versionado y trabajado en sesiones previas.

### 2.3. Observacion importante del workspace

El archivo `shipone.code-workspace` incluye una carpeta externa adicional:

- el repo actual
- una carpeta de branding localizada fuera del repo: `../../../Users/Usuario/Downloads/ShipOne_Final_Branding`

Eso es relevante porque parte de la identidad visual puede venir de esa carpeta externa y no del propio arbol del repo.

## 3. Proposito real de ShipOne

ShipOne no pretende ser un Kanban general ni un gestor de tareas puro. Su foco real es:

- reducir la cantidad de proyectos abiertos;
- obligar a elegir un proyecto activo;
- dar siempre un siguiente paso claro;
- evitar abandonar sin contexto;
- ayudar a cerrar proyectos;
- dar visibilidad rapida de estado y salud;
- facilitar el reenganche rapido a un proyecto pausado.

El producto esta claramente orientado a proyectos de desarrollador individual, indie, estudiante o maker.

## 4. Arquitectura actual

### 4.1. Estructura de alto nivel

La extension ya esta separada en capas relativamente claras:

- `extension.ts`: orquestacion principal y registro de comandos.
- `services/`: logica de negocio, almacenamiento, creacion de proyectos, settings.
- `providers/`: la UI del arbol lateral.
- `models/`: tipos y contratos de datos.
- `utils/`: todavia muy vacio.

### 4.2. Observacion de arquitectura

Aunque ya existe separacion por carpetas, la logica principal sigue bastante concentrada en `src/extension.ts`. Ese archivo ya actua como:

- bootstrap de VS Code;
- router de comandos;
- coordinador de estado;
- handler de busqueda;
- editor de checklist MVP;
- sincronizador de STATUS.md;
- detector de bloqueadores;
- generador de AI context;
- flujo de focus mode;
- weekly review;
- congelacion y reanudacion;
- cambio de estado;
- manejo de next action;
- favorito;
- apertura de STATUS.md.

Eso funciona, pero ya es una deuda tecnica real. El archivo sigue creciendo y convendria dividirlo por dominios.

## 5. Modelo de datos

### 5.1. `ProjectMetadata`

El modelo de proyecto ya es rico. Incluye:

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

### 5.2. `ProjectStatus`

Los estados principales son:

- `idea`
- `active`
- `paused`
- `finished`

### 5.3. `MvpTask`

Hay un submodelo para checklist MVP:

- `id`
- `text`
- `done`

### 5.4. Interpretacion de producto

El modelo ya deja claro que ShipOne no es solo un listado de carpetas. Cada proyecto puede tener:

- vida util;
- estado;
- repo remoto;
- evolucion;
- progreso MVP;
- motivo de pausa;
- nota de pausa;
- favoritismo;
- contexto para IA.

## 6. Configuracion disponible

### 6.1. `SettingsService`

La extension lee configuracion desde la seccion `shipone`.

### 6.2. Settings actuales

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

### 6.3. Lectura critica

La configuracion es ya bastante madura y cubre:

- ruta base de proyectos;
- tipo por defecto;
- Git local y GitHub por defecto;
- regla de un solo activo;
- STATUS.md automatico;
- package manager;
- templates externos;
- apertura automatica;
- avisos por inactividad;
- visibilidad de finished.

Esto indica que el producto ya esta orientado a ser personalizable, no rigido.

## 7. Persistencia y almacenamiento

### 7.1. `ProjectStoreService`

La persistencia se hace en el almacenamiento global de VS Code. El archivo principal es:

- `projects.json`

Y existe una copia de seguridad:

- `projects.json.bak`

### 7.2. Funciones principales

La capa de almacenamiento ya permite:

- inicializar almacenamiento;
- cargar proyectos;
- guardar proyectos con backup;
- upsert;
- crear proyectos respetando la regla de un activo;
- cambiar estado;
- editar next action;
- alternar favorito;
- setear checklist MVP;
- marcar tarea MVP como hecha;
- congelar proyecto;
- registrar apertura del proyecto;
- obtener un proyecto por ID;
- agrupar por estado;
- crear carpeta de proyecto.

### 7.3. Reglas de negocio en almacenamiento

La capa ya impone varias reglas de producto:

- si se crea o activa un proyecto con estado `active`, los otros `active` pasan a `paused` cuando la config lo exige;
- al pasar a `paused`, se limpian algunos metadatos de congelacion o pausa segun la operacion;
- al pasar a `finished`, se rellena `finishedAt`;
- al activar, se actualiza `lastOpenedAt`.

### 7.4. Riesgos observados

- La validacion de estructura al leer JSON es basica.
- Si el archivo esta corrompido, se retorna lista vacia en vez de reportar mas contexto.
- La copia de seguridad existe, pero no hay politica visible de restauracion automatica.

## 8. Creacion de proyectos

### 8.1. `ProjectCreationService`

La creacion de proyectos ya es uno de los bloques mas completos de ShipOne.

### 8.2. Flujo actual

El flujo real de creacion es:

1. pedir nombre;
2. pedir tipo;
3. pedir descripcion;
4. seleccionar carpeta de destino;
5. elegir package manager;
6. decidir si usar Git local;
7. si Git esta activo, comprobar si `gh` esta autenticado;
8. decidir si crear repo GitHub y su visibilidad;
9. resolver carpeta final, evitando colisiones;
10. crear carpeta;
11. crear `STATUS.md` si la config lo permite;
12. generar template seleccionado;
13. inicializar Git si procede;
14. crear commit inicial si procede;
15. crear repo GitHub si procede;
16. guardar metadata;
17. abrir el proyecto si la config lo pide.

### 8.3. Templates soportados

Ya existen plantillas para:

- `blank`
- `react-vite`
- `nextjs`
- `python`
- `node-api`

### 8.4. Templates custom

La extension tambien soporta una carpeta de templates custom configurable. Si existe, puede sobrescribir o complementar el starter segun el tipo.

### 8.5. STATUS.md

Al crear proyecto, ShipOne puede crear `STATUS.md` automaticamente con:

- objetivo;
- checklist MVP;
- proximo paso;
- bloqueos;
- nombre del proyecto;
- fecha de actualizacion.

### 8.6. Git local

Si el usuario lo aprueba, se ejecuta:

- `git init`
- `git add .`
- `git commit -m "chore: initial commit"`
- `git branch -M main`

### 8.7. GitHub

Si GitHub esta disponible y autenticado:

- se pregunta si crear repo remoto;
- se pregunta visibilidad;
- se intenta `gh repo create`;
- si funciona, se guarda `repoUrl`.

Si `gh` no esta autenticado, la extension no rompe la creacion del proyecto. Solo avisa y sigue.

### 8.8. Comportamiento de seguridad

La creacion actual evita:

- sobrescribir carpetas existentes;
- cortar el flujo entero si Git falla;
- cortar el flujo entero si GitHub falla;
- depender de GitHub para poder crear un proyecto local.

### 8.9. Lectura critica

Esta capa ya mezcla:

- orquestacion;
- templates;
- configuracion;
- control de fs;
- Git;
- GitHub;
- STATUS.md;
- creacion de metadata.

Funciona, pero ya mereceria una separacion futura por subservicios.

## 9. UI lateral y presentacion

### 9.1. `ShipOneProjectsTreeDataProvider`

La vista lateral es bastante mas que una lista simple. Tiene:

- metrics node;
- warnings de proyecto activo;
- groups por estado;
- empty states;
- focus mode;
- project nodes;
- favoritos;
- progreso MVP;
- salud del proyecto;
- next action;
- aviso de inactividad;
- aviso de falta de README;
- aviso de commits recientes;
- aviso de bloqueadores;
- acceso rapido a proyecto y STATUS.md.

### 9.2. Estructura visual actual

La extension muestra en el panel:

- Metrics
- warnings del activo
- Focus mode cuando aplica
- Active
- Ideas
- Paused
- Finished

### 9.3. Node types actuales

- `MetricsNode`
- `MetricItemNode`
- `FocusNode`
- `WarningNode`
- `GroupNode`
- `ProjectNode`
- `EmptyStateNode`

### 9.4. Visualización por proyecto

Cada proyecto puede mostrar:

- tipo;
- next action;
- salud;
- estado;
- motivo de pausa;
- advertencia de inactividad;
- progreso MVP.

Ademas:

- favorito se pinta con estrella;
- el proyecto abre al hacer click;
- el tooltip da mas contexto;
- el contexto menu expone acciones.

### 9.5. Metrics actuales

La vista calcula:

- total;
- ideas;
- active;
- paused;
- finished;
- finish ratio.

### 9.6. Focus mode

Cuando se activa focus mode:

- la vista se reduce al proyecto activo;
- se muestra un bloque de salud;
- se prioriza la siguiente action;
- si no hay activo, aparece un empty state.

### 9.7. Warning system

La UI ya advierte si:

- el proyecto activo lleva demasiado tiempo sin abrirse;
- el proyecto activo no tiene next action;
- falta README;
- no hay commits recientes;
- el proyecto parece estancado.

### 9.8. Valor de la UI actual

La UI ya deja claro que ShipOne quiere ser un sistema de seguimiento, no solo un navegador de carpetas.

## 10. Inventario de comandos

La extension tiene un inventario grande de comandos. Los mas importantes son:

- `shipone.showWelcome`
- `shipone.setProjectsRoot`
- `shipone.openProjectsRoot`
- `shipone.searchProject`
- `shipone.createProject`
- `shipone.createSampleIdea`
- `shipone.openProjectQuickPick`
- `shipone.editMvpChecklist`
- `shipone.markMvpItemDone`
- `shipone.syncStatusFile`
- `shipone.connectGithub`
- `shipone.detectBlockers`
- `shipone.generateAiContext`
- `shipone.scanTodos`
- `shipone.focusMode`
- `shipone.exitFocusMode`
- `shipone.weeklyReview`
- `shipone.freezeProject`
- `shipone.resumeProject`
- `shipone.openProject`
- `shipone.changeProjectStatus`
- `shipone.markProjectIdea`
- `shipone.markProjectActive`
- `shipone.markProjectPaused`
- `shipone.markProjectFinished`
- `shipone.editNextAction`
- `shipone.clearNextAction`
- `shipone.openStatusFile`
- `shipone.toggleFavorite`
- `shipone.refreshProjects`

### 10.1. Impresion general

Ya hay comandos para:

- iniciar;
- organizar;
- abrir;
- buscar;
- cambiar estado;
- pausar;
- reanudar;
- revisar;
- detectar bloqueos;
- generar contexto;
- manejar checklist;
- sincronizar STATUS;
- enlazar GitHub;
- y volver a cargar la UI.

## 11. Flujo de usuario actual

### 11.1. Onboarding

En la primera ejecucion:

- se muestra bienvenida;
- se explica la ruta base;
- se ofrece crear proyecto;
- se puede crear idea de ejemplo;
- se puede cambiar carpeta base;
- se puede conectar GitHub;
- se puede abrir ajustes.

### 11.2. Creacion de proyecto

El flujo ya no es manual a mano. La extension hace mucho del trabajo:

- pide datos basicos;
- crea la carpeta;
- genera archivos base;
- crea metadata;
- opcionalmente abre el proyecto;
- opcionalmente crea Git y GitHub.

### 11.3. Uso diario

Uso esperado:

- abrir ShipOne;
- ver el proyecto activo;
- revisar next action;
- corregir bloqueos;
- pausar o congelar si hace falta;
- terminar;
- marcar finished;
- revisar metrics y weekly review.

## 12. Sistema de STATUS.md

### 12.1. Papel real

ShipOne usa `STATUS.md` como archivo de soporte contextual.

### 12.2. Capacidades actuales

- se crea automaticamente si la config lo pide;
- se puede abrir desde ShipOne;
- se puede sincronizar desde metadata;
- se puede leer para detectar bloqueadores;
- se puede usar como parte del AI context.

### 12.3. Estructura esperada

Las secciones clave son:

- Objetivo
- MVP
- Proximo paso
- Bloqueos
- Proyecto
- Actualizado

### 12.4. Observacion

`STATUS.md` ya no es decorativo. Forma parte del flujo de producto.

## 13. Integracion con Git y GitHub

### 13.1. Git local

ShipOne puede inicializar Git localmente y crear primer commit.

### 13.2. GitHub

ShipOne comprueba:

- si `gh` existe;
- si `gh` esta autenticado;
- si el usuario quiere crear repo remoto;
- si quiere visibilidad privada o publica.

### 13.3. Estado real del entorno

En la auditoria previa se detecto que `gh auth status` no estaba autenticado en este entorno. Por tanto:

- la integracion esta preparada;
- pero el flujo remoto depende de autenticacion real;
- si no hay auth, ShipOne avisa y sigue.

### 13.4. Riesgo

El producto depende de GitHub CLI para el paso remoto. Es correcto, pero conviene documentarlo bien.

## 14. Bateria de herramientas de producto ya presentes

ShipOne ya tiene funciones que van mas alla del MVP original:

- buscador de proyectos;
- checklist MVP;
- marcar tarea hecha;
- sincronizacion de STATUS.md;
- deteccion de bloqueadores;
- generacion de AI_CONTEXT.md;
- scan de TODO/FIXME;
- focus mode;
- weekly review;
- freeze / resume;
- favorito;
- health hints;
- metricas;
- onboarding.

## 15. Salud tecnica

### 15.1. Lo bueno

- La extension compila.
- Hay separacion por carpetas.
- Hay persistencia.
- Hay vista lateral propia.
- Hay estados.
- Hay comandos orientados a trabajo real.
- Hay templates.
- Hay soporte de Git y GitHub.

### 15.2. Lo delicado

- `src/extension.ts` es muy grande.
- La logica de UI, comandos y reglas sigue bastante concentrada.
- Hay strings con problemas de codificacion en algunos archivos.
- Hay bastante comportamiento en una sola capa, lo que complica tests.

### 15.3. Lo que mas urge a nivel tecnico

1. dividir `extension.ts`.
2. separar comandos por dominio.
3. introducir tests basicos para store y parseos.
4. revisar encoding de textos.
5. documentar mejor los flujos remotos.

## 16. UX y producto

### 16.1. Lo que transmite la UI

ShipOne transmite:

- orden;
- foco;
- estado;
- progreso;
- salud;
- reenganche rapido.

### 16.2. Lo que ya hace bien

- no obliga a salir de VS Code;
- da contexto rapido;
- evita proyectos invisibles;
- ayuda a no dejar proyectos abandonados;
- pone la next action en primer plano;
- hace visible lo que esta estancado.

### 16.3. Lo que podria mejorar despues

- simplificar comandos en exceso;
- evitar duplicidad entre barra lateral y comandos sueltos;
- hacer mas clara la diferencia entre idea, activo, pausado y terminado;
- reducir el ruido de opciones al crear proyecto;
- mejorar empty states y mensajes de ayuda.

## 17. Documentacion y branding

### 17.1. README actual

El README ya describe:

- que hace ShipOne;
- flujo rapido;
- comandos utiles;
- configuracion;
- desarrollo;
- notas.

### 17.2. Branding actual

Los assets presentes en `media/branding/` incluyen:

- banner.png
- icon.png
- icon-16.png
- icon-24.png
- icon-32.png
- icon-48.png
- icon-64.png
- icon-128.png
- icon-256.png
- icon-512.png
- logo.svg
- logo-transparent.png
- marketplace-preview.png

### 17.3. Implicacion

ShipOne ya esta pensado para verse como producto, no solo como prototipo interno.

## 18. Riesgos y deuda detectada

### 18.1. Riesgos de mantenibilidad

- `extension.ts` demasiado grande.
- mezcla de UI, reglas, lectura de archivos, comandos y flujo de onboarding.
- duplicidad de patrones para seleccionar proyecto.

### 18.2. Riesgos de consistencia

- varios mensajes y strings siguen con codificacion rota en algunos archivos.
- el modelo y la UI han evolucionado bastante, pero no todos los archivos probablemente estan igual de pulidos.

### 18.3. Riesgos de producto

- demasiada amplitud funcional puede diluir el objetivo principal;
- ShipOne podria parecer un “todo en uno” si no se sigue defendiendo la idea central: terminar proyectos.

### 18.4. Riesgos de dependencia externa

- `gh` necesario para GitHub remoto;
- Git necesario para health y commit inicial;
- algunas funciones de salud dependen de que el proyecto tenga historial Git real.

## 19. Lo que ya se puede considerar cubierto

ShipOne ya cubre razonablemente:

- crear proyecto;
- abrir proyecto;
- buscar proyecto;
- cambiar estado;
- mantener un solo activo;
- next action;
- marcar terminado;
- favorecer proyectos;
- abrir STATUS.md;
- guardar metadata;
- persistir entre reinicios;
- mostrar proyectos por estado;
- generar un contexto para IA;
- detectar TODO/FIXME;
- detectar bloqueadores;
- dar seguimiento a la salud del proyecto.

## 20. Lo que sigue pendiente para una version realmente publicable

- tests automatizados;
- refactor grande de `extension.ts`;
- documentacion publica final;
- checklist de instalacion y uso;
- screenshots y capturas reales;
- pulido de textos y codificacion;
- definicion exacta de MVP frente a features secundarias;
- revisiones cross-platform;
- estrategia de release;
- validacion de que la extension sigue siendo simple de usar.

## 21. Lectura final

ShipOne ya es un producto mucho mas serio de lo que era al principio. Tiene una base real y una historia clara:

- proyectos;
- foco;
- siguiente accion;
- estados;
- cierre;
- reenganche;
- salud;
- contexto;
- y apoyo visual dentro de VS Code.

La siguiente fase no deberia ser “meter mas cosas porque si”, sino:

- ordenar;
- probar;
- reducir ruido;
- reforzar el objetivo de terminar proyectos;
- dejarlo listo para usar y entender rapido.

Si esta auditoria se pasa a otra IA, la clave no es que vea una extension “grande”, sino que entienda que ShipOne es un sistema para convertir proyectos abiertos en proyectos terminados.
