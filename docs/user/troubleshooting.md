# Troubleshooting

## ShipOne does not open

- Check that the workspace is this repo.
- Check that there are no compile errors.
- Run `npm.cmd run compile` again.
- Check that the extension is activated.
- Open Developer Tools to see the exact error.

## No projects appear

- Check `shipone.projectsRoot`.
- Check that local metadata exists.
- Verify that the VS Code storage is not corrupted.
- Check that the project was created in the correct folder.
- Check whether the project was hidden by the status filter.

## Git fails

- Make sure Git is installed.
- Check that the terminal can see `git`.
- Check permissions and paths.
- Check that the path has no strange characters or limited permissions.
- Verify that the local repo is not in a broken state.

## GitHub does not connect

- Check `gh auth status`.
- Verify that GitHub CLI is installed.
- Check `VSCE_PAT` if you are publishing.
- To create remote repos, confirm that local Git already exists.
- Check that the authenticated account has enough permissions.

## The folder already exists

ShipOne tries to avoid collisions by using an alternate name.

- If you need an exact folder name, review the final created name.
- If there are multiple versions of the same name, confirm which one is correct.

## Broken storage

- Check whether a backup exists.
- Try to recover from the backup copy.
- If the problem remains, open an issue with clear steps.
- Do not delete storage files before saving a copy.

## Project creation failed

- Check whether the project was left half created.
- Check whether the chosen template exists.
- Verify that the toolchain package is installed correctly.
- If the failure was in GitHub, try creating only the local project first.

## How to report the issue

- What happened.
- What you expected.
- Steps to reproduce.
- VS Code and operating system.
- Whether you used Git or GitHub.
- Screenshot or log if relevant.
