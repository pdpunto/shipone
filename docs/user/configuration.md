# Configuration

## Ajustes mas utiles

### Resumen rapido

| Setting | Valor por defecto | Para que sirve |
| --- | --- | --- |
| `shipone.projectsRoot` | `C:\dev\proyectos` | Carpeta base donde ShipOne crea y abre proyectos |
| `shipone.defaultProjectType` | `blank` | Tipo que se propone primero al crear un proyecto |
| `shipone.defaultVisibility` | `private` | Visibilidad por defecto para repos GitHub |
| `shipone.defaultPackageManager` | `npm` | Gestor de paquetes por defecto |
| `shipone.openAfterCreate` | `true` | Abre el proyecto al terminar |
| `shipone.createGitRepoByDefault` | `true` | Crea un repositorio Git local |
| `shipone.createGitHubRepoByDefault` | `true` | Crea un repositorio GitHub si Git local ya existe |
| `shipone.enforceOneActiveProject` | `true` | Mantiene un solo proyecto `Active` |
| `shipone.createStatusFileByDefault` | `true` | Genera `STATUS.md` automaticamente |
| `shipone.showFinishedProjects` | `true` | Muestra o oculta proyectos terminados |
| `shipone.inactiveWarningDays` | `7` | Dias para avisar inactividad |
| `shipone.staleWarningDays` | `30` | Dias para aviso fuerte de stale |

### `shipone.projectsRoot`

Carpeta base donde ShipOne crea y abre proyectos.

Ejemplo:

```json
"shipone.projectsRoot": "C:\\dev\\proyectos"
```

### `shipone.defaultProjectType`

Tipo que se propone primero al crear un proyecto.

Ejemplo:

```json
"shipone.defaultProjectType": "nextjs"
```

### `shipone.defaultVisibility`

Visibilidad por defecto para repos GitHub.

Valores:

- `private`
- `public`

### `shipone.defaultPackageManager`

Gestor de paquetes por defecto.

Valores:

- `npm`
- `pnpm`
- `yarn`

### `shipone.openAfterCreate`

Abre el proyecto automaticamente al terminar de crearlo.

Desactivado: ShipOne crea el proyecto pero no cambia de ventana.

### `shipone.createGitRepoByDefault`

Crea un repositorio Git local al crear un proyecto.

Desactivado: la creacion sera solo local.

### `shipone.createGitHubRepoByDefault`

Crea un repositorio GitHub si Git local ya existe.

Desactivado: ShipOne no intenta crear repo remoto.

### `shipone.enforceOneActiveProject`

Mantiene un solo proyecto `Active`.

Desactivado: puedes tener mas de un proyecto activo.

### `shipone.createStatusFileByDefault`

Genera `STATUS.md` de forma automatica.

Desactivado: ShipOne no crea el archivo de estado.

### `shipone.showFinishedProjects`

Muestra o oculta proyectos terminados.

Desactivado: la vista queda mas limpia.

### `shipone.inactiveWarningDays`

Dias para avisar inactividad.

Valor recomendado: `7`.

### `shipone.staleWarningDays`

Dias para avisar de forma mas fuerte que un proyecto esta parado.

Valor recomendado: `30`.

## Recomendacion

Empieza con los valores por defecto y ajusta solo lo que de verdad uses.
