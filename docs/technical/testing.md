# Testing

ShipOne keeps testing simple and local.

## Main commands

Run these from the repository root:

```powershell
npm.cmd run test
npm.cmd run lint
npm.cmd run format
npm.cmd run compile
```

## Package check

Before a release, also validate the package:

```powershell
npm.cmd run validate:package
npm.cmd run package:vsix
```

## What to check

- tests pass
- lint passes
- format passes
- compile passes
- the package builds without missing files

## Good habit

Test early.
Test small.
Test before asking for review.
