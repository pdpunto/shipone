# FAQ

## Does ShipOne require GitHub?

No. It works with local Git only.

## Does ShipOne require Git?

No for exploring the extension. If you need local repos or Git-based health checks, use local Git.

## Can I use it offline?

Yes, for the local flow.

## Where does it store data?

In the local storage of VS Code.

## Does it upload my data to a server?

No in the normal local flow.

## Can I have more than one active project?

Only if you disable the single `Active` rule.

## What is `STATUS.md` for?

It is a status summary and support file for project context.

## What is `PROJECT_CONTEXT.md` for?

It helps rebuild project context quickly with AI support.

## Can I use my own templates?

Yes, if you configure a compatible template folder.

## Can I hide finished projects?

Yes, with `shipone.showFinishedProjects`.

## What happens if GitHub CLI is not installed?

ShipOne can still create GitHub repos if your GitHub account is signed in to VS Code.
GitHub CLI is no longer required for the normal create-repo flow.

## What happens if a project fails halfway through creation?

It may leave a partial folder. Use `troubleshooting.md` to recover it.

## Can I delete a project from ShipOne?

Yes. The view shows a trash icon to delete the local project and, if it exists, the GitHub repo with confirmation.

## Does ShipOne work on macOS and Linux?

ShipOne has already been confirmed on macOS.
Linux validation is still pending.

## Can I contribute?

Yes. Read `CONTRIBUTING.md` before opening a PR.
