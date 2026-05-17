# ShipOne

ShipOne es una extension de VS Code para crear, organizar y terminar proyectos sin perder el foco.

![ShipOne preview](media/branding/marketplace-preview.png)

## Que hace

- Crea proyectos nuevos desde una vista propia.
- Guarda metadata local de cada proyecto.
- Mantiene un solo proyecto `Active` si lo quieres.
- Muestra `nextAction`, favoritos, salud, pausas y metricas.
- Genera `STATUS.md` y plantillas minimas por tipo de proyecto.

## Flujo rapido

1. Pulsa `F5` en VS Code.
2. Abre la vista `ShipOne` en la barra lateral.
3. Usa `Crear rapido`, `Crear avanzado`, `Abrir proyecto` o `Buscar proyecto`.
4. Si un proyecto se queda atascado, usa `Congelar proyecto` o `Weekly review`.

## Comandos utiles

- `ShipOne: Crear`
- `ShipOne: Abrir`
- `ShipOne: Buscar`
- `ShipOne: Focus`
- `ShipOne: Weekly review`
- `ShipOne: STATUS.md`
- `ShipOne: Conectar GitHub`

## Configuracion

- `shipone.projectsRoot`
- `shipone.defaultProjectType`
- `shipone.defaultVisibility`
- `shipone.defaultPackageManager`
- `shipone.createGitRepoByDefault`
- `shipone.createGitHubRepoByDefault`
- `shipone.enforceOneActiveProject`
- `shipone.createStatusFileByDefault`
- `shipone.openAfterCreate`
- `shipone.showFinishedProjects`
- `shipone.inactiveWarningDays`
- `shipone.staleWarningDays`

## Desarrollo

```powershell
npm install
npm.cmd run compile
```

## Publicacion

Para publicar en VS Code Marketplace:

1. Crea un secreto de GitHub llamado `VSCE_PAT`.
2. Guarda ahi el token personal del marketplace.
3. Usa el workflow `Publish Marketplace`.

## Notas

- Los assets de marca estan en `media/branding/`.
- ShipOne usa `STATUS.md` como apoyo, pero no obliga a usarlo.
