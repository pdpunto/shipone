# Development Setup

This guide keeps local setup simple for contributors.

## Requirements

- VS Code
- Node.js
- npm
- Git

## Install

From the repository root:

```powershell
npm install
```

## Build

Compile the extension:

```powershell
npm.cmd run compile
```

## Test

Run the test suite:

```powershell
npm.cmd run test
```

## Run locally

Open the project in VS Code and press `F5`.

## Common checks

- make sure dependencies are installed
- make sure the workspace is the ShipOne repo
- make sure the TypeScript build is clean
