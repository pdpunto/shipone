# ShipOne - Public Release Roadmap

Version: 1.0
Date: 2026-05-15

## Objective

Turn ShipOne from a strong private VS Code extension into a stable, maintainable, internationalized, polished, public-ready product.

## Product Principle

ShipOne exists to help developers:

- start fewer projects
- keep context
- stay focused
- finish projects

Everything in the product should support that.


Core pillars:

- One Active Project
- Next Action
- Focus Mode
- STATUS.md
- Project Health
- Weekly Review

## Scope

This roadmap focuses on:

- stability
- architecture
- UX
- internationalization
- reliability
- public release readiness

It does not aim at random feature expansion.

---

## Phase 1 - Core Stabilization

Goal: reduce technical debt and make the extension easier to maintain.

### 1.1 Extension Architecture

- [x] Reduce `src/extension.ts` to bootstrap only
- [x] Move command registration by domain
- [x] Extract domain coordinators
- [x] Centralize startup flow
- [x] Remove business logic from `extension.ts`

### 1.2 Commands

- [x] Keep `commands/projects/`
- [x] Add `commands/status/`
- [x] Add `commands/focus/`
- [x] Add `commands/review/`
- [x] Add `commands/github/`
- [x] Add `commands/ai/`
- [x] Add `commands/onboarding/`

### 1.3 Services

- [x] Keep `GitService`
- [x] Keep `GithubService`
- [x] Keep `TemplateService`
- [x] Keep `StatusFileService`
- [x] Keep `ProjectHealthService`
- [x] Keep `TodoScannerService`
- [x] Add `ProjectRecoveryService`
- [x] Add a clearer `LocalizationService`

### 1.4 UI

- [x] Split tree nodes into separate files
- [x] Keep a dedicated tree renderer
- [x] Keep icon provider
- [x] Keep tooltip provider
- [x] Keep health renderer
- [x] Reduce duplicated tooltip content
- [ ] Reduce sidebar density

### 1.5 Models

- [x] Add stronger type guards
- [x] Add metadata schema validation
- [x] Add schema versioning
- [x] Add migration support
- [x] Normalize project metadata consistently

### 1.6 Storage Reliability

- [x] Validate JSON before parse
- [x] Detect corrupted metadata
- [x] Restore from backup automatically
- [x] Add recovery flow
- [ ] Add migration system
- [x] Add structured error logging
- [x] Add safe write strategy
- [x] Add atomic save strategy
- [x] Prevent partial project corruption

### 1.7 Code Quality

- [x] Configure strict ESLint rules
- [ ] Configure Prettier
- [x] Remove dead code
- [x] Remove duplicate logic
- [x] Fix inconsistent naming
- [x] Improve async safety
- [x] Review exception handling
- [x] Add inline documentation where needed

---

## Phase 2 - Encoding and Internationalization

Goal: make ShipOne render correctly in every supported environment.

### 2.1 Encoding Cleanup

- [ ] Convert all files to UTF-8
- [x] Fix mojibake
- [ ] Fix broken accents
- [x] Fix broken separators
- [ ] Validate JSON encoding
- [ ] Validate markdown encoding
- [ ] Validate TypeScript encoding

### 2.2 VS Code Localization

- [x] Add `package.nls.json`
- [x] Add `package.nls.es.json`
- [ ] Add more locale files later if needed
- [x] Localize extension name
- [x] Localize extension description
- [x] Localize commands
- [x] Localize menus
- [x] Localize settings
- [x] Localize configuration descriptions
- [x] Localize walkthrough titles

### 2.3 Runtime UI Localization

- [ ] Keep `t()` helper
- [x] Remove hardcoded UI strings
- [x] Translate QuickPick labels
- [x] Translate placeholders
- [x] Translate notifications
- [x] Translate warnings
- [x] Translate errors
- [x] Translate onboarding
- [x] Translate tree descriptions
- [x] Translate health messages
- [x] Translate metrics
- [x] Translate focus mode
- [x] Translate weekly review
- [x] Translate freeze and resume flow
- [x] Translate dialogs
- [x] Translate confirmations

### 2.4 Translation Structure

- [x] Use structured translation keys
- [x] Group keys by domain
- [x] Avoid duplicated strings
- [x] Add fallback language behavior
- [x] Add missing key detection
- [x] Add translation validation script

---

## Phase 3 - UX Polish

Goal: make ShipOne feel simple, modern, and professional.

### 3.1 Sidebar Simplification

- [x] Reduce visual density
- [x] Improve spacing
- [x] Simplify project descriptions
- [x] Reduce repeated warnings
- [x] Improve hierarchy
- [ ] Improve status visibility
- [ ] Improve inactive project warnings
- [ ] Improve project health display

### 3.2 Project Creation UX

- [ ] Add Quick Create
- [ ] Add Advanced Create
- [ ] Reduce unnecessary prompts
- [ ] Improve defaults
- [ ] Improve placeholders
- [ ] Improve project type selection
- [x] Expose `node-api` properly
- [ ] Add project type descriptions

### 3.3 Focus UX

- [ ] Improve Focus Mode visuals
- [ ] Highlight next action better
- [ ] Improve active project visibility
- [ ] Reduce distraction in focus mode
- [ ] Improve health summaries

### 3.4 Empty States

- [x] Add onboarding empty states
- [x] Add no-project states
- [x] Add no-active-project state
- [x] Add recovery suggestions
- [x] Add contextual hints

### 3.5 Error UX

- [x] Human-readable errors
- [x] Actionable recovery suggestions
- [x] Better Git errors
- [x] Better GitHub errors
- [x] Better filesystem errors
- [x] Better authentication warnings

---

## Phase 4 - Testing and Reliability

Goal: make ShipOne stable before public release.

### 4.1 Unit Tests

Storage:

- [ ] Test metadata loading
- [ ] Test metadata saving
- [ ] Test corrupted metadata
- [ ] Test backup recovery
- [ ] Test migrations

Status logic:

- [ ] Test one active project rule
- [ ] Test state transitions
- [ ] Test finish flow
- [ ] Test pause flow
- [ ] Test freeze flow

Health:

- [ ] Test inactive project detection
- [ ] Test missing README detection
- [ ] Test Git health detection
- [ ] Test next action validation

Utilities:

- [ ] Test path sanitization
- [ ] Test project naming
- [ ] Test template resolution
- [ ] Test TODO scanner

### 4.2 Integration Tests

- [ ] Create project flow
- [ ] Open project flow
- [ ] STATUS.md sync
- [ ] Git init flow
- [ ] GitHub creation flow
- [ ] Focus mode flow
- [ ] Weekly review flow

### 4.3 Manual QA

Platforms:

- [ ] Windows
- [ ] macOS
- [ ] Linux

Scenarios:

- [ ] Without Git
- [ ] Without GitHub CLI
- [ ] Offline mode
- [ ] Paths with spaces
- [ ] Unicode paths
- [ ] Corrupted metadata
- [ ] Empty workspace

### 4.4 Performance

- [ ] Reduce unnecessary refreshes
- [ ] Cache health checks
- [ ] Cache TODO scans
- [ ] Lazy-load heavy operations
- [ ] Improve tree rendering performance
- [ ] Avoid renderer recreation

---

## Phase 5 - Product Consolidation

Goal: keep ShipOne focused and avoid feature creep.

### 5.1 Define Official Core

Core features:

- [ ] One Active Project
- [ ] Next Action
- [ ] Focus Mode
- [ ] STATUS.md
- [ ] Project Health
- [ ] Weekly Review

### 5.2 Secondary Features

Keep simple:

- [ ] AI Context
- [ ] TODO Scanner
- [ ] Templates
- [ ] GitHub Integration
- [ ] Metrics

### 5.3 Feature Review

- [ ] Remove confusing commands
- [ ] Reduce duplicated actions
- [ ] Simplify command names
- [ ] Review feature necessity
- [ ] Remove unnecessary complexity

---

## Phase 6 - Public Repository Preparation

Goal: prepare ShipOne for open-source collaboration.

### 6.1 Repository Structure

- [ ] Add `.github/`
- [ ] Add issue templates
- [ ] Add bug report template
- [ ] Add feature request template
- [ ] Add pull request template

### 6.2 Community Files

- [ ] Add `CONTRIBUTING.md`
- [ ] Add `CODE_OF_CONDUCT.md`
- [ ] Add `SECURITY.md`
- [ ] Add `CHANGELOG.md`
- [ ] Add final `LICENSE`
- [ ] Add release notes template

### 6.3 Documentation

README:

- [ ] Hero section
- [ ] Product philosophy
- [ ] Problem explanation
- [ ] Quick start
- [ ] Screenshots
- [ ] GIF demo
- [ ] Commands
- [ ] Workflow explanation
- [ ] Configuration guide
- [ ] Troubleshooting
- [ ] FAQ
- [ ] Roadmap
- [ ] Contributing guide

---

## Phase 7 - CI/CD and Automation

Goal: automate quality control and releases.

### 7.1 GitHub Actions

- [ ] Build workflow
- [ ] Lint workflow
- [ ] Test workflow
- [ ] Package VSIX workflow
- [ ] Release workflow
- [ ] Changelog workflow

### 7.2 Release Management

- [ ] Semantic versioning
- [ ] Release tagging
- [ ] Beta release flow
- [ ] Stable release flow
- [ ] Marketplace publish workflow

---

## Phase 8 - VS Code Marketplace Release

Goal: publish ShipOne professionally.

### 8.1 Marketplace Assets

- [ ] Final logo
- [ ] Final banner
- [ ] Screenshots
- [ ] Demo GIF
- [ ] Marketplace preview image
- [ ] Consistent branding

### 8.2 package.json Metadata

- [ ] Add keywords
- [ ] Add categories
- [ ] Add repository URL
- [ ] Add homepage URL
- [ ] Add bugs URL
- [ ] Add icon
- [ ] Add license
- [ ] Add engines.vscode

### 8.3 VS Code Publisher

- [ ] Create publisher account
- [ ] Configure `vsce`
- [ ] Configure PAT token
- [ ] Validate package
- [ ] Generate VSIX package

### 8.4 Public Release Strategy

Beta:

- [ ] Publish beta release
- [ ] Gather feedback
- [ ] Fix critical issues
- [ ] Improve onboarding

Stable:

- [ ] Publish stable release
- [ ] Announce publicly
- [ ] Collect community feedback
- [ ] Prioritize bug fixes

---

## Final Success Criteria

ShipOne is ready for public release when:

- [ ] The extension is stable across platforms
- [ ] All visible UI supports localization
- [ ] No broken encoding exists
- [ ] Core workflows are tested
- [ ] README is professional
- [ ] GitHub repository is public-ready
- [ ] Marketplace assets are polished
- [ ] Users understand the product quickly
- [ ] ShipOne still feels simple
- [ ] The product clearly helps developers finish projects

## Final Positioning

One-liner:

ShipOne is a VS Code extension that helps developers organize, focus on, and finish programming projects.

Product philosophy:

Start less. Ship more.

## Most Important Rule

Do not turn ShipOne into a giant all-in-one platform.

Protect simplicity.

Protect focus.

Protect the finish-projects philosophy.
