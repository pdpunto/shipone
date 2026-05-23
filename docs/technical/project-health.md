# Project Health

ShipOne uses project health to show when a project needs attention and what to do next.

## What it checks

ShipOne looks for:

- missing `README.md`
- empty `README.md`
- missing `STATUS.md`
- stale activity
- inactive active projects
- missing `nextAction`
- missing Git repository
- missing `package.json`
- missing `requirements.txt`

## How it behaves

Health is shown in the tree view and in focus mode.

- healthy projects stay quiet
- warning projects show clear labels
- bad projects surface stronger warnings
- active projects can expose a direct action when `nextAction` is missing

## Quick actions

From a warning, ShipOne can help you:

- create a `README.md`
- sync `STATUS.md`
- initialize Git
- add a `nextAction`
- regenerate `PROJECT_CONTEXT.md`

## Why it matters

Project health is not a score for vanity.

It is a short, practical way to answer:

- can I resume this project now?
- what is missing?
- what should I do next?

## Related settings

- `shipone.inactiveWarningDays`
- `shipone.staleWarningDays`
- `shipone.enforceOneActiveProject`
