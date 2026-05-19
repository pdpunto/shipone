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
