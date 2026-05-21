# Architecture

## Overview

ShipOne is organized in layers:

- `extension.ts` bootstraps the extension.
- bootstrap classes wire services and commands.
- services contain business logic and data rules.
- providers render the sidebar UI.
- models define project data and settings.
- localization keeps text structured.
- templates generate starter project files.

## Key modules

- `src/bootstrap/`
  - extension startup and service wiring.
- `src/commands/`
  - user actions exposed in VS Code.
- `src/providers/`
  - tree views, nodes and sidebar content.
- `src/services/`
  - project store, creation, health, Git and GitHub logic.
- `src/models/`
  - shared types for project metadata and settings.
- `src/localization/`
  - translation keys and localized text.

## Main flow

1. VS Code activates the extension.
2. ShipOne registers commands and providers.
3. The project store loads local metadata.
4. The sidebar renders project groups, metrics and focus state.
5. User actions go through services.
6. Services update the store and refresh the UI.

## Design goal

Keep the extension simple to maintain and easy to extend by domain.

## Extension points

- Add a command in `src/commands/`.
- Add business rules in `src/services/`.
- Add UI nodes in `src/providers/`.
- Add shared data in `src/models/`.
- Add copy in `src/localization/`.
