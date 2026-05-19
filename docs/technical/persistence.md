# Persistence

## Storage

ShipOne stores project metadata in VS Code global storage.

Files used:

- `projects.json`
- `projects.json.bak`

## Behavior

- load local data on startup;
- validate and normalize data;
- write a backup before saving;
- recover from backup when possible;
- keep writes as safe as possible.

## Failure cases

- corrupted JSON;
- partial save;
- missing storage file;
- stale backup.

## Goal

Keep local project data recoverable and predictable.
