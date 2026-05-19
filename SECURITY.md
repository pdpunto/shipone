# Security Policy

If you find a security issue in ShipOne, please do not open a public issue.

## Report it privately

- Describe the problem clearly.
- Include steps to reproduce if possible.
- Avoid sharing secrets, tokens, or personal data.
- Do not attach `.env` files or private keys.
- If you have logs, redact paths and credentials first.
- If the issue touches publishing, mention `VSCE_PAT` only in private.

## What we will do

- Review the report as soon as possible.
- Confirm the issue and plan a fix.
- Credit you if you want to be mentioned.
- Keep the report private while it is being handled.

## Scope

ShipOne is a local-first VS Code extension.

It may use:

- local filesystem data;
- VS Code global storage;
- Git;
- GitHub CLI;
- a `VSCE_PAT` secret for publishing.

Keep your VS Code settings and repo credentials safe.

## What not to share

- tokens
- passwords
- private keys
- `.env` files
- personal data
- private repo URLs if they reveal sensitive context
