# <img src="media/branding/icon-32.png" alt="ShipOne icon" width="28" /> ShipOne

ShipOne is a VS Code extension for creating new projects, adding existing ones, and finishing work with clear context.

It keeps the next step visible, the project state precise, and the friction low when you return to work.

<p align="center">
  <img src="media/branding/banner.png" alt="ShipOne banner" />
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=pdpunto.shipone">
    <img src="https://img.shields.io/visual-studio-marketplace/v/pdpunto.shipone?color=0f172a&label=Marketplace" alt="Marketplace badge" />
  </a>
  <a href="https://github.com/pdpunto/shipone">
    <img src="https://img.shields.io/badge/GitHub-pdpunto%2Fshipone-111827?logo=github" alt="GitHub badge" />
  </a>
</p>

## Purpose

Many projects start fast and get abandoned just as fast.

ShipOne keeps in one place what usually ends up spread across notes, loose folders, and memory:

- a single `Active` project at a time;
- new projects and existing folders under the same workflow;
- synced `STATUS.md` and local metadata;
- focus mode, review, and project health in one view;
- optional Git and GitHub;
- a clear project list by state.

## Visual Identity

ShipOne uses a simple and consistent visual identity:

- a custom icon in the VS Code view;
- a banner for Marketplace;
- a visual preview for the product page.

## Project Status

- Current version: `0.0.6`
- Status: `public beta`
- Public: open repo, published extension, and docs ready for real use
- Pace: small, versioned changes that are easy to follow

## Screenshots

These images show the real ShipOne flow inside VS Code:

### Overview

![ShipOne overview](docs/assets/screenshots/01-overview.png)

### Active project

![ShipOne active project](docs/assets/screenshots/02-active-project.png)

### Focus mode

![ShipOne focus mode](docs/assets/screenshots/04-focus-mode.png)

## What it does

- Creates new projects or imports existing folders from a dedicated view.
- Stores local metadata for each project.
- Keeps only one `Active` project if that rule is enabled.
- Shows `nextAction`, favorites, health, pauses, and metrics.
- Generates `STATUS.md` and minimal templates by project type.

## Getting Started

1. Open the repo in VS Code or install ShipOne from Marketplace.
2. Run `npm.cmd run compile` for local development.
3. Press `F5` to open the Extension Development Host.
4. Open the `ShipOne` view in the sidebar.
5. Use the `ShipOne` view or `ShipOne: Create` to make a project.
6. Write a `nextAction` and keep working from the same view.
7. If a project gets stuck, use `Freeze project` or `Weekly review`.

## Codex Workflow Example

ShipOne works well with a simple, repeatable flow:

1. Create or open a project.
2. Run `ShipOne: Generate project context`.
3. Keep `PROJECT_CONTEXT.md` and `STATUS.md` current.
4. Use `ShipOne: Weekly review` to check the current state.
5. Export a summary with `ShipOne: Export weekly review summary`.
6. Resume work from `nextAction` instead of starting from zero.

## Useful Commands

- `ShipOne: Create` - create a new project
- `ShipOne: Open` - open a project
- `ShipOne: Search` - filter projects by name or tag
- `ShipOne: Focus` - enter focus mode
- `ShipOne: Weekly review` - review the weekly state
- `ShipOne: Generate project context` - create a summary ready to resume work
- `ShipOne: Add existing project` - import one folder you already have
- `ShipOne: Scan projects root` - add every new project found in your projects folder
- `ShipOne: Delete project` - delete a project with confirmation
- `ShipOne: STATUS.md` - sync the status file
- `ShipOne: Connect GitHub` - connect GitHub for remote repo publishing

## States

ShipOne works with four states:

- `idea`
- `active`
- `paused`
- `finished`

Main rule:

- only one project can be `Active` if that option is enabled.

## Settings

The most useful settings are:

- `shipone.projectsRoot` - base folder for your projects
- `shipone.defaultProjectType` - type ShipOne suggests first
- `shipone.defaultVisibility` - private or public repo by default
- `shipone.defaultPackageManager` - npm, pnpm, or yarn
- `shipone.openAfterCreate` - opens the project after creation
- `shipone.createGitRepoByDefault` - creates a local Git repo by default
- `shipone.createGitHubRepoByDefault` - creates a GitHub repo by default
- `shipone.enforceOneActiveProject` - keeps only one `Active` project
- `shipone.createStatusFileByDefault` - generates `STATUS.md`
- `shipone.showFinishedProjects` - shows finished projects
- `shipone.inactiveWarningDays` - days before an inactivity warning
- `shipone.staleWarningDays` - days before a stronger stale warning

## Requirements

- VS Code
- Node.js and npm for local development
- Git for local repo workflows
- GitHub CLI for creating GitHub repos from the extension
- `VSCE_PAT` for Marketplace publishing

## Tested Platforms

ShipOne has been tested on:

- Windows
- macOS

Linux is still pending validation.

## Local Development

```powershell
npm install
npm.cmd run compile
```

## Common Issues

- If `npm.cmd run compile` fails, check that Node and TypeScript are installed.
- If `F5` does not open the extension, verify that the workspace is this repo and that there are no compile errors.
- If GitHub does not connect, check `gh auth status` and the `VSCE_PAT` secret.
- If a folder already exists, ShipOne uses an alternate name to avoid collisions.

## FAQ

**Does ShipOne require GitHub?**
No. It can work with local Git only.

**Do I need to use `STATUS.md`?**
No. ShipOne creates and syncs it, but you do not have to edit it manually.

**Can I have multiple active projects?**
Not if the single `Active` project rule is enabled.

**Does it store data in the cloud?**
No. ShipOne uses local VS Code storage and optional local tools.

## Publishing

Simple flow:

1. Publish a beta with `vX.Y.Z-beta.N`.
2. Share the beta and collect feedback.
3. Gather feedback with `Issues` and the `bug report` template.
4. Fix the important stuff.
5. Ship the stable version with the `Publish Marketplace` workflow.
6. Use `VSCE_PAT` as the GitHub secret for publishing.

## Privacy

- Project data is stored locally.
- GitHub is optional.
- Never upload secrets, tokens, or `.env` files.
- Check `SECURITY.md` if you need to report a sensitive issue.
- `VSCE_PAT` is only for publishing and should never be shared publicly.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a PR.

## License

See `LICENSE`.
