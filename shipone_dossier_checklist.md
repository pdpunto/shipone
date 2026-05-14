# SHIPONE — VS Code Extension Dossier

> Working name: **ShipOne**  
> Tagline: **Start less. Ship more.**  
> Product idea: A VS Code extension that helps indie developers create, track, focus on, and finish programming projects.

---

## 1. Core Problem

Many developers love starting new projects but struggle to finish them.

The common pattern:

- Too many ideas.
- Too many unfinished folders.
- No clear next action.
- No visual project status.
- No simple rule for focus.
- No lightweight system inside the IDE.

Most tools manage tasks.  
**ShipOne manages projects.**

---

## 2. Product Promise

**ShipOne helps developers start fewer projects and finish more.**

It combines:

- project launcher,
- Git/GitHub bootstrap,
- project lifecycle tracking,
- one-active-project rule,
- next action system,
- simple project dashboard.

---

## 3. Target User

Primary user:

- indie developers,
- beginner developers,
- solo builders,
- students,
- creative programmers,
- developers who start many side projects.

Secondary user:

- bootcamp students,
- freelancers,
- makers,
- AI-assisted developers.

---

## 4. Main Difference

ShipOne is NOT:

- a generic Kanban board,
- a task manager,
- a Git client,
- a template generator only.

ShipOne IS:

- a project operating system for developers,
- a finishing system,
- a lightweight product tracker inside VS Code.

---

## 5. Core Principles

- Simple first.
- One active project only.
- Every project needs a next action.
- Finished is better than perfect.
- No feature creep.
- No heavy setup.
- No forced workflow.
- Works locally first.
- GitHub optional.
- AI optional later.

---

## 6. Project States

Every project can have one of these states:

```txt
Idea
Active
Paused
Finished
```

Rules:

- Only one project can be Active.
- If another project becomes Active, the previous Active project must become Paused.
- Finished projects stay visible as motivation.
- Ideas are not real projects until activated or created.

---

## 7. Core Data Model

Example metadata:

```json
{
  "id": "project-uuid",
  "name": "my-saas-app",
  "description": "A simple SaaS dashboard",
  "type": "nextjs",
  "status": "active",
  "path": "C:/dev/projects/my-saas-app",
  "repoUrl": "https://github.com/user/my-saas-app",
  "createdAt": "2026-05-14",
  "lastOpenedAt": "2026-05-14",
  "finishedAt": null,
  "nextAction": "Create authentication flow",
  "favorite": false,
  "tags": ["saas", "nextjs"]
}
```

---

# VERSION ROADMAP

---

# V0 — Personal Prototype Cleanup

Goal: turn the current personal extension into a cleaner base.

## Checklist

### Audit current extension

- [ ] Run `git status`
- [ ] Review current folder structure
- [ ] Identify extension entry point
- [ ] Identify commands already registered
- [ ] Identify current TreeDataProviders
- [ ] Identify project creation scripts
- [ ] Identify hardcoded paths
- [ ] Identify hardcoded personal names
- [ ] Identify duplicated code

### Refactor safely

- [ ] Create `src/models`
- [ ] Create `src/services`
- [ ] Create `src/providers`
- [ ] Create `src/utils`
- [ ] Move filesystem logic into service
- [ ] Move project creation logic into service
- [ ] Move UI tree logic into provider
- [ ] Keep all existing features working
- [ ] Test creating Next.js project
- [ ] Test creating React Vite project
- [ ] Test creating Python project
- [ ] Test opening existing project
- [ ] Test deleting local project

### Remove personal dependency

- [ ] Replace fixed `C:\dev\proyectos` with configurable base folder
- [ ] Add setting: `shipone.projectsRoot`
- [ ] Add setting: `shipone.defaultVisibility`
- [ ] Add setting: `shipone.openAfterCreate`
- [ ] Make `AGENTS.md` optional
- [ ] Make GitHub repo creation optional
- [ ] Make PowerShell scripts replaceable later

---

# V1 — Public MVP

Goal: release a useful first version.

## V1 Features

- Project list
- Project states
- One active project rule
- Next Action
- Open project
- Create project from template
- Optional Git init
- Optional GitHub repo creation
- Simple sidebar dashboard

## Checklist

### Extension identity

- [ ] Rename extension to `ShipOne`
- [ ] Choose extension ID
- [ ] Create logo placeholder
- [ ] Update `package.json`
- [ ] Update README
- [ ] Add tagline: `Start less. Ship more.`
- [ ] Add marketplace description
- [ ] Add license

### Settings

- [ ] Add setting: projects root
- [ ] Add setting: default project type
- [ ] Add setting: create Git repo by default
- [ ] Add setting: create GitHub repo by default
- [ ] Add setting: GitHub repo visibility
- [ ] Add setting: enforce one active project
- [ ] Add setting: show finished projects

### Metadata storage

- [ ] Create metadata file if missing
- [ ] Store metadata in global VS Code storage or root config file
- [ ] Add read metadata function
- [ ] Add write metadata function
- [ ] Add update project function
- [ ] Add migration-safe structure
- [ ] Handle corrupted metadata gracefully
- [ ] Add backup before writing metadata

### Project states

- [ ] Add status enum
- [ ] Add command: change project status
- [ ] Add command: mark as Idea
- [ ] Add command: mark as Active
- [ ] Add command: mark as Paused
- [ ] Add command: mark as Finished
- [ ] Enforce only one Active project
- [ ] Ask user before pausing previous Active project
- [ ] Refresh tree after status change

### Sidebar UI

- [ ] Create grouped tree view
- [ ] Group by Ideas
- [ ] Group by Active
- [ ] Group by Paused
- [ ] Group by Finished
- [ ] Show icons by status
- [ ] Show favorite star
- [ ] Show project type
- [ ] Show next action under project
- [ ] Add context menu actions
- [ ] Add refresh button
- [ ] Add open project button
- [ ] Add open root folder button

### Next Action

- [ ] Add `nextAction` field
- [ ] Add command: edit next action
- [ ] Add command: clear next action
- [ ] Prompt user with input box
- [ ] Show next action in sidebar
- [ ] Warn if Active project has no next action

### Project creation

- [ ] Add create project command
- [ ] Ask project name
- [ ] Ask project type
- [ ] Ask destination folder
- [ ] Ask Git yes/no
- [ ] Ask GitHub repo yes/no
- [ ] Ask repo visibility if GitHub yes
- [ ] Create folder
- [ ] Generate selected template
- [ ] Initialize Git if selected
- [ ] Create first commit if Git selected
- [ ] Create GitHub repo if selected
- [ ] Save metadata
- [ ] Ask if user wants to open project

### Templates

- [ ] Add Blank template
- [ ] Add React Vite template
- [ ] Add Next.js template
- [ ] Add Python template
- [ ] Add Node API template
- [ ] Keep templates minimal
- [ ] Avoid personal files by default
- [ ] Optional: create README
- [ ] Optional: create STATUS.md

### STATUS.md

- [ ] Add optional STATUS.md creation
- [ ] Add command: open STATUS.md
- [ ] Add default template
- [ ] Include Objective section
- [ ] Include MVP section
- [ ] Include Next Action section
- [ ] Include Blockers section
- [ ] Include Done section

### GitHub integration

- [ ] Check if `gh` CLI is installed
- [ ] Check if user is authenticated
- [ ] Handle missing `gh` gracefully
- [ ] Run `gh repo create`
- [ ] Support public/private visibility
- [ ] Save repo URL in metadata
- [ ] Do not fail whole project if GitHub creation fails

### Safety

- [ ] Never delete without confirmation
- [ ] Confirm project deletion
- [ ] Confirm GitHub repo deletion separately
- [ ] Do not overwrite existing folder
- [ ] Validate project name
- [ ] Sanitize folder names
- [ ] Handle spaces in paths
- [ ] Handle Windows paths
- [ ] Handle macOS/Linux paths

### MVP Done Criteria

- [ ] User can create a project
- [ ] User can list projects
- [ ] User can open projects
- [ ] User can change status
- [ ] User can set one Active project
- [ ] User can add next action
- [ ] User can mark project Finished
- [ ] Extension works after VS Code restart
- [ ] README explains the workflow

---

# V1.1 — Quality Release

Goal: make the MVP feel reliable.

## Checklist

### UX polish

- [ ] Add empty states
- [ ] Add helpful messages
- [ ] Add command palette names
- [ ] Add icons
- [ ] Add tooltips
- [ ] Improve error messages
- [ ] Add loading states
- [ ] Add success notifications
- [ ] Add warning for inactive active project

### Project search

- [x] Add command: search project
- [x] Search by name
- [x] Search by type
- [x] Search by tag
- [x] Open selected project from QuickPick

### Favorites

- [x] Add favorite field
- [x] Add command: toggle favorite
- [x] Show favorites at top
- [x] Show star in sidebar

### Inactivity detection

- [x] Track last opened date
- [x] Show inactive warning after 7 days
- [x] Show stronger warning after 30 days
- [x] Add setting for warning thresholds

### Metrics

- [ ] Count total projects
- [ ] Count Ideas
- [ ] Count Active
- [ ] Count Paused
- [ ] Count Finished
- [ ] Calculate finish ratio
- [ ] Show simple metrics view

---

# V2 — Finish System

Goal: make ShipOne more than a launcher.

## V2 Features

- MVP checklist per project
- Focus mode
- Project health
- Anti-abandonment flow
- Weekly review

## Checklist

### MVP checklist

- [ ] Add MVP tasks field
- [ ] Add command: edit MVP checklist
- [ ] Add command: mark MVP item done
- [ ] Show MVP progress
- [ ] Show percentage completed
- [ ] Add STATUS.md sync option

### Focus mode

- [ ] Add command: focus mode
- [ ] Hide non-active projects
- [ ] Show only Active project
- [ ] Show next action prominently
- [ ] Add command: exit focus mode

### Project health

- [ ] Detect missing next action
- [ ] Detect inactive active project
- [ ] Detect no README
- [ ] Detect no recent Git commits
- [ ] Show health indicator
- [ ] Keep health logic simple

### Anti-abandonment

- [ ] Add command: freeze project
- [ ] Ask for reason when pausing
- [ ] Ask for next action before pausing
- [ ] Save pause note
- [ ] Add command: resume paused project
- [ ] Show pause reason

### Weekly review

- [ ] Add command: weekly review
- [ ] Show active project
- [ ] Show projects finished this week
- [ ] Show paused projects
- [ ] Ask next action for active project
- [ ] Ask whether to finish/pause stale projects

---

# V3 — Templates and Launch Workflows

Goal: improve project creation.

## Checklist

### Template system

- [ ] Move templates into configurable system
- [ ] Add template metadata
- [ ] Add custom template folder
- [ ] Let user add templates
- [ ] Let user duplicate template
- [ ] Let user remove template
- [ ] Let user choose package manager

### Supported starters

- [ ] Blank
- [ ] React Vite
- [ ] Next.js
- [ ] Node API
- [ ] Python
- [ ] Express API
- [ ] CLI app
- [ ] Static website

### Creation presets

- [ ] Add preset: Quick Prototype
- [ ] Add preset: SaaS MVP
- [ ] Add preset: API Project
- [ ] Add preset: Learning Project
- [ ] Add preset: Client Project

### First-run onboarding

- [ ] Ask projects root
- [ ] Ask GitHub preference
- [ ] Ask package manager
- [ ] Create sample idea
- [ ] Explain one-active-project rule

---

# V4 — AI-Assisted Workflow

Goal: add AI support without making AI required.

## Checklist

### AI preparation

- [ ] Add optional AI context file
- [ ] Add command: generate project summary
- [ ] Add command: generate next action suggestions
- [ ] Add command: generate MVP checklist
- [ ] Add command: detect blockers from STATUS.md
- [ ] Keep AI provider optional

### TODO/FIXME detection

- [ ] Scan project files for TODO
- [ ] Scan project files for FIXME
- [ ] Ignore node_modules
- [ ] Ignore .git
- [ ] Show detected tasks
- [ ] Convert TODO to next action optionally

### Agent instructions

- [ ] Add optional AGENTS.md
- [ ] Add optional COPILOT_INSTRUCTIONS.md
- [ ] Add optional AI workflow template
- [ ] Let user enable/disable AI files

---

# V5 — Public Product Polish

Goal: prepare for real users.

## Checklist

### Marketplace readiness

- [ ] Final logo
- [ ] Screenshots
- [ ] Demo GIF
- [ ] README polished
- [ ] Installation instructions
- [ ] Usage examples
- [ ] Known limitations
- [ ] Changelog
- [ ] License
- [ ] Privacy note

### Testing

- [ ] Test on Windows
- [ ] Test on macOS
- [ ] Test on Linux
- [ ] Test without GitHub CLI
- [ ] Test with GitHub CLI
- [ ] Test with invalid paths
- [ ] Test metadata migration
- [ ] Test deletion safety
- [ ] Test VS Code restart

### Release

- [ ] Create GitHub repo
- [ ] Add issues templates
- [ ] Add feature request template
- [ ] Add bug report template
- [ ] Add release workflow
- [ ] Package extension
- [ ] Publish beta
- [ ] Collect feedback
- [ ] Fix critical bugs
- [ ] Publish stable version

---

# Suggested Commands

```txt
ShipOne: Create Project
ShipOne: Open Project
ShipOne: Search Project
ShipOne: Change Status
ShipOne: Set Active Project
ShipOne: Pause Project
ShipOne: Mark Project Finished
ShipOne: Edit Next Action
ShipOne: Clear Next Action
ShipOne: Toggle Favorite
ShipOne: Open STATUS.md
ShipOne: Show Metrics
ShipOne: Focus Mode
ShipOne: Weekly Review
```

---

# Suggested Sidebar Structure

```txt
SHIPONE

Metrics
  Finished: 4
  Active: 1
  Paused: 6
  Ideas: 12

Active
  🟢 my-saas-app
     → Create login screen

Ideas
  💡 ai-notes-app
  💡 portfolio-v2

Paused
  🟡 old-dashboard
     → Fix routing bug

Finished
  ✅ weather-app
  ✅ todo-api
```

---

# MVP User Flow

1. User installs ShipOne.
2. User selects projects root.
3. User creates a project.
4. User chooses type.
5. User chooses Git/GitHub options.
6. ShipOne creates the project.
7. ShipOne saves metadata.
8. ShipOne marks project as Active.
9. User adds Next Action.
10. User opens project.
11. Later, user marks it Finished.

---

# Final Definition of Done

ShipOne is finished when:

- [ ] A new user can install it without help.
- [ ] A new user can create a project in under 2 minutes.
- [ ] A new user can see all projects grouped by status.
- [ ] A new user can keep only one Active project.
- [ ] A new user can set a Next Action.
- [ ] A new user can mark a project Finished.
- [ ] The extension survives restart without losing data.
- [ ] The README clearly explains the workflow.
- [ ] The product solves the real problem: finishing projects.

---

# Product Positioning

## One-liner

**ShipOne is a VS Code extension that helps developers create, organize, focus on, and finish programming projects.**

## Short pitch

Most developers have too many unfinished projects. ShipOne gives them a simple system inside VS Code: one active project, clear next action, project states, and fast project creation with optional GitHub setup.

## Long pitch

ShipOne is not another task manager. It is a lightweight project operating system for developers who start many ideas but struggle to finish them. It combines project creation, Git/GitHub bootstrap, project lifecycle tracking, focus rules, and next actions directly inside VS Code.

---

# Anti-Scope Rules

Do NOT add in V1:

- [ ] Drag and drop Kanban
- [ ] Full task management
- [ ] Cloud sync
- [ ] Teams
- [ ] Notifications
- [ ] Calendar
- [ ] AI agent execution
- [ ] Complex analytics
- [ ] Time tracking
- [ ] Payments
- [ ] Web dashboard

Keep it simple.

---

# Tomorrow Start Plan

## First 10 steps

- [ ] Create new branch: `feature/shipone-product-base`
- [ ] Run `git status`
- [ ] Rename concept from personal extension to ShipOne
- [ ] Add configurable projects root
- [ ] Create metadata model
- [ ] Create metadata service
- [ ] Save/load project metadata
- [ ] Add project states
- [ ] Group sidebar by status
- [ ] Add Next Action command

After these 10 steps, the product direction is real.
