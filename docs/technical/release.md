# Release

## Local validation

- `npm.cmd run compile`
- `npm.cmd run test`
- `npm.cmd run lint`
- `npm.cmd run validate:utf8`
- `npm.cmd run validate:translations`

## Packaging

- check icon and banner;
- verify README render;
- verify package metadata;
- build the VSIX if needed;
- keep secrets out of the repo.

## Suggested flow

1. Verify docs and assets.
2. Run validation commands.
3. Package the extension.
4. Publish beta if needed.
5. Collect feedback.
6. Fix critical issues.
7. Publish stable release.

## Marketplace

- prepare beta if needed;
- collect feedback;
- fix critical issues;
- publish stable version;
- keep `VSCE_PAT` secret.

## Notes

- Keep changelog updated.
- Keep release notes short and concrete.
- Do not publish with broken README links.
- Do not publish with missing secrets or broken metadata.

## Goal

Make release repeatable and safe.
