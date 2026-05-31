# Changelog

All notable changes to ShipOne will be documented here.

## 0.0.8 - 2026-05-31

- Added a GitHub import flow so existing repos can be cloned into ShipOne from a URL.
- Fixed project deletion so open folders close before removing local files.
- Improved GitHub repo deletion to handle more repo URL formats and auth scopes.

## 0.0.7 - 2026-05-31

- Connected GitHub repo creation to the GitHub session already signed in VS Code.
- Created GitHub repos through the GitHub API instead of depending on GitHub CLI.
- Improved the create-project flow so local projects keep moving even when GitHub needs a fresh session.
- Updated docs and release notes for the new GitHub connection flow.

## 0.0.4 - 2026-05-22

- Fixed the `node-api` template so it runs with plain Node.js.
- Improved GitHub CLI flow and error messages.
- Polished contributor docs, issue templates and PR templates.
- Improved command palette icons and release notes templates.

## 0.0.5 - 2026-05-22

- Added safe project deletion from the project list.
- Added optional GitHub repo deletion with confirmation.
- Reduced noise when GitHub is not authenticated.

## 0.0.6 - 2026-05-22

- Improved project context with Git summary.
- Improved project health details with clearer issue summaries.
- Improved weekly review with the active project's next action and a simpler footer.
- Added support for adding existing projects without overwriting files.
- Added projects root scanning to import multiple existing folders.
- Aligned public docs and FAQ with the current workflows.
- Updated release notes handling for versioned sections.

## Unreleased

- No changes yet.
