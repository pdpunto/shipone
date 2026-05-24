# Project Creation

## Flow

1. Ask for project name.
2. Ask for project type.
3. Ask for description.
4. Pick destination folder.
5. Resolve folder collisions.
6. Create project metadata.
7. Generate template.
8. Optionally create `STATUS.md`.
9. Optionally initialize Git.
10. Optionally create GitHub repo.
11. Open the project if configured.

## Import existing project

ShipOne can also register a folder that already exists on disk.

Import flow:

1. Pick an existing folder.
2. Infer the project name from the folder name.
3. Ask for a short description.
4. Choose project type and initial state.
5. Detect Git remote origin if available.
6. Optionally create `STATUS.md`.
7. Optionally generate `PROJECT_CONTEXT.md`.
8. Register the project without creating templates.

## Scan projects root

ShipOne can scan `shipone.projectsRoot` and add new folders automatically.

Scan flow:

1. Read the configured projects root.
2. List direct child folders only.
3. Ignore hidden and build folders.
4. Exclude already tracked projects.
5. Detect a likely project type.
6. Let the user choose the folders to add.
7. Add the selected folders without overwriting files.

When ShipOne scans the projects root during startup, it can refresh the view silently so the list stays current.

## Templates

- `blank`
- `react-vite`
- `nextjs`
- `python`
- `node-api`

## Notes

- Git is optional.
- GitHub is optional.
- Folder collisions should not overwrite existing projects.
- Partial failures can leave temporary artifacts.
- Imported folders keep their files.
