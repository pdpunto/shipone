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
- [x] Improve status visibility
- [x] Improve inactive project warnings
- [x] Improve project health display
- [x] Improve project review display

### 3.2 Project Creation UX

- [x] Add Quick Create
- [x] Add Advanced Create
- [x] Reduce unnecessary prompts
- [x] Improve defaults
- [x] Improve placeholders
- [x] Improve project type selection
- [x] Expose `node-api` properly
- [x] Add project type descriptions

### 3.3 Focus UX

- [x] Improve Focus Mode visuals
- [x] Highlight next action better
- [x] Improve active project visibility
- [x] Reduce distraction in focus mode
- [x] Improve health summaries

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

- [x] Test metadata loading
- [x] Test metadata saving
- [x] Test corrupted metadata
- [x] Test backup recovery
- [x] Test migrations

Status logic:

- [x] Test one active project rule
- [x] Test state transitions
- [x] Test finish flow
- [x] Test pause flow
- [x] Test freeze flow

Health:

- [x] Test inactive project detection
- [x] Test missing README detection
- [x] Test Git health detection
- [x] Test next action validation

Utilities:

- [x] Test path sanitization
- [x] Test project naming
- [x] Test template resolution
- [x] Test TODO scanner

### 4.2 Integration Tests

- [x] Create project flow
- [x] Open project flow
- [x] STATUS.md sync
- [x] Git init flow
- [x] GitHub creation flow
- [x] Focus mode flow
- [x] Weekly review flow

### 4.3 Manual QA

Platforms:

- [x] Windows
- [ ] macOS
- [ ] Linux

Scenarios:

- [x] Without Git
- [x] Without GitHub CLI
- [x] Offline mode
- [x] Paths with spaces
- [x] Unicode paths
- [x] Corrupted metadata
- [x] Empty workspace

### 4.4 Performance

- [x] Reduce unnecessary refreshes
- [x] Cache health checks
- [x] Cache TODO scans
- [x] Lazy-load heavy operations
- [x] Improve tree rendering performance
- [x] Avoid renderer recreation

---

## Phase 5 - Product Consolidation

Goal: keep ShipOne focused and avoid feature creep.

### 5.1 Define Official Core

Core features:

- [x] One Active Project
- [x] Next Action
- [x] Focus Mode
- [x] STATUS.md
- [x] Project Health
- [x] Weekly Review

### 5.2 Secondary Features

Keep simple:

- [x] AI Context
- [x] TODO Scanner
- [x] Templates
- [x] GitHub Integration
- [x] Metrics

### 5.3 Feature Review

- [x] Remove confusing commands
- [x] Reduce duplicated actions
- [x] Simplify command names
- [x] Review feature necessity
- [x] Remove unnecessary complexity

---

## Phase 6 - Public Repository Preparation

Goal: prepare ShipOne for open-source collaboration.

### 6.1 Repository Structure

- [x] Add `.github/`
- [x] Add issue templates
- [x] Add bug report template
- [x] Add feature request template
- [x] Add pull request template

### 6.2 Community Files

- [x] Add `CONTRIBUTING.md`
- [x] Add `CODE_OF_CONDUCT.md`
- [x] Add `SECURITY.md`
- [x] Add `CHANGELOG.md`
- [x] Add final `LICENSE`
- [x] Add release notes template

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

- [x] Build workflow
- [x] Lint workflow
- [x] Test workflow
- [x] Package VSIX workflow
- [x] Release workflow
- [x] Changelog workflow

### 7.2 Release Management

- [x] Semantic versioning
- [x] Release tagging
- [x] Beta release flow
- [x] Stable release flow
- [x] Marketplace publish workflow

---

## Phase 8 - VS Code Marketplace Release

Goal: publish ShipOne professionally.

### 8.1 Marketplace Assets

- [x] Final logo
- [x] Final banner
- [x] Screenshots
- [x] Demo GIF
- [x] Marketplace preview image
- [x] Consistent branding

### 8.2 package.json Metadata

- [x] Add keywords
- [x] Add categories
- [x] Add repository URL
- [x] Add homepage URL
- [x] Add bugs URL
- [x] Add icon
- [x] Add license
- [x] Add engines.vscode

### 8.3 VS Code Publisher

- [ ] Create publisher account
- [x] Configure `vsce`
- [x] Configure PAT token
- [x] Validate package
- [x] Generate VSIX package

### 8.4 Public Release Strategy

Beta:

- [x] Publish beta release
- [x] Gather feedback
- [x] Fix critical issues
- [x] Improve onboarding

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
