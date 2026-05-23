# Configuration

## Most useful settings

### Quick summary

| Setting                             | Default            | What it does                                         |
| ----------------------------------- | ------------------ | ---------------------------------------------------- |
| `shipone.projectsRoot`              | `C:\dev\proyectos` | Base folder where ShipOne creates and opens projects |
| `shipone.defaultProjectType`        | `blank`            | First type ShipOne suggests when creating a project  |
| `shipone.defaultVisibility`         | `private`          | Default visibility for GitHub repos                  |
| `shipone.defaultPackageManager`     | `npm`              | Default package manager                              |
| `shipone.openAfterCreate`           | `true`             | Opens the project after creation                     |
| `shipone.createGitRepoByDefault`    | `true`             | Creates a local Git repo                             |
| `shipone.createGitHubRepoByDefault` | `true`             | Creates a GitHub repo if local Git already exists    |
| `shipone.enforceOneActiveProject`   | `true`             | Keeps only one `Active` project                      |
| `shipone.createStatusFileByDefault` | `true`             | Generates `STATUS.md` automatically                  |
| `shipone.showFinishedProjects`      | `true`             | Shows or hides finished projects                     |
| `shipone.inactiveWarningDays`       | `7`                | Days before an inactivity warning                    |
| `shipone.staleWarningDays`          | `30`               | Days before a stronger stale warning                 |

### `shipone.projectsRoot`

Base folder where ShipOne creates and opens projects.

Example:

```json
"shipone.projectsRoot": "C:\\dev\\proyectos"
```

### `shipone.defaultProjectType`

Type suggested first when creating a project.

Example:

```json
"shipone.defaultProjectType": "nextjs"
```

### `shipone.defaultVisibility`

Default visibility for GitHub repos.

Values:

- `private`
- `public`

### `shipone.defaultPackageManager`

Default package manager.

Values:

- `npm`
- `pnpm`
- `yarn`

### `shipone.openAfterCreate`

Opens the project automatically after creation.

Disabled: ShipOne creates the project but does not switch windows.

### `shipone.createGitRepoByDefault`

Creates a local Git repository when a project is created.

Disabled: creation stays local only.

### `shipone.createGitHubRepoByDefault`

Creates a GitHub repository if local Git already exists.

Disabled: ShipOne does not try to create a remote repo.

### `shipone.enforceOneActiveProject`

Keeps only one `Active` project.

Disabled: you can have more than one active project.

### `shipone.createStatusFileByDefault`

Generates `STATUS.md` automatically.

Disabled: ShipOne does not create the status file.

### `shipone.showFinishedProjects`

Shows or hides finished projects.

Disabled: the view stays cleaner.

### `shipone.inactiveWarningDays`

Days before an inactivity warning.

Recommended value: `7`.

### `shipone.staleWarningDays`

Days before a stronger stale warning.

Recommended value: `30`.

## Recommendation

Start with the defaults and change only what you actually use.
