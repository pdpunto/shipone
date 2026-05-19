# Data Model

## Core entity

The main entity is `ProjectMetadata`.

## Typical fields

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
- `pauseReason`
- `pauseNote`

## Related concepts

- `ProjectStatus`: `idea`, `active`, `paused`, `finished`
- MVP task list
- local storage version

## Rule

Metadata should stay normalized so UI, storage and commands all read the same shape.
