# Project Context

ShipOne can export a compact `PROJECT_CONTEXT.md` file for a project.
The file is meant for AI assistants and for quick human recovery.

## What it includes

The export focuses on the most useful facts:

- project name
- project state
- project type
- project path
- favorite flag
- goal
- next action
- MVP progress
- blockers
- Git branch
- Git status
- recent commits
- missing `nextAction` hints
- simple stack detection

## Why it exists

The file helps answer a simple question:

- what is this project?
- what is blocking it?
- what should happen next?

It is intentionally short.
It should be useful on the first read.

## How ShipOne uses it

ShipOne can generate the file from the project view.
The command is available as:

- `ShipOne: Generate project context`
- `ShipOne: Generar contexto del proyecto`

## Relation with other files

- `STATUS.md` tracks the current state in a simple format.
- `PROJECT_CONTEXT.md` is a fuller snapshot for recovery and AI help.
- `README.md` explains the project to people.

## Good use

Use the export when:

- you want to resume later
- you want an AI to understand the project fast
- you want a concise summary of status and Git state

