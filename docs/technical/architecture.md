# Architecture

## Overview

ShipOne is organized in layers:

- `extension.ts` bootstraps the extension.
- bootstrap classes wire services and commands.
- services contain business logic.
- providers render the sidebar UI.
- models define project data.
- localization keeps text structured.

## Main flow

1. VS Code activates the extension.
2. ShipOne registers commands and providers.
3. The project store loads local metadata.
4. The sidebar renders project groups and metrics.
5. User actions go through services.

## Design goal

Keep the extension simple to maintain and easy to extend by domain.
