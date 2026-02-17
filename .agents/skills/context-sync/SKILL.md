---
name: context-sync
description: Detects when code changes should trigger updates to .context/ files. Use after adding dependencies, creating new modules, or completing feature specs.
version: 1.0.0
---

# Context Sync

Keeps `.context/` files in sync with the actual codebase. Prevents context drift — the #1 failure mode of spec-driven development.

## When to Use This Skill

- After installing or removing a dependency
- After creating new files or directories
- After completing a feature spec
- When starting a new session (validation mode)

## Sync Rules

### Dependency Changes → `stack.md`
When a dependency is added, removed, or upgraded:
1. Read `.context/stack.md`
2. Check if the change is already reflected
3. If not, propose an update with: package name, purpose, version, and constraints

**Trigger signals:**
- `npm install`, `pip install`, `dotnet add`, `go get` commands
- Changes to `package.json`, `requirements.txt`, `*.csproj`, `go.mod`

### New Files/Directories → `architecture.md`
When new files or directories are created outside the existing structure:
1. Read `.context/architecture.md`
2. Check if the new path fits an existing module
3. If not, propose adding it to the directory structure section

**Trigger signals:**
- `mkdir` commands
- Creating files in previously empty directories
- Adding new top-level directories

### Feature Completion → `project.md`
When a spec status changes to `[x] Completed`:
1. Read `.context/project.md`
2. Update the "Current Status" section to reflect the new capability
3. Suggest moving the spec to `.context/specs/.archive/`

### Conventions Changes → `conventions.md`
When the team agrees on a new pattern during development:
1. Read `.context/conventions.md`
2. Propose adding the new convention with rationale
3. Ensure it doesn't conflict with existing conventions

## Validation Mode

When activated at session start, perform a quick audit:

```
SYNC CHECK:
✅ stack.md     — matches package.json (last verified: {timestamp})
✅ architecture — all src/ modules documented
⚠️ project.md  — 2 completed specs not yet reflected
❌ conventions  — new pattern "useQuery hooks" found but not documented
```

## Output Format

Always present sync suggestions as a clear diff:

```markdown
### Suggested Update: stack.md

**Trigger:** `npm install @tanstack/react-query`

| Package | Purpose | Constraints |
|---|---|---|
| `@tanstack/react-query` | Server state management & caching | v5.x — do not downgrade, peer dep on React 18+ |

**Apply this update?** [Y/N]
```

## Integration

This skill is designed to fire automatically after other skills complete. Skills that should trigger a sync check:
- `spec-lifecycle` (on status change)
- `architecture-guard` (on new file creation)
- `commit-conventions` (on commit — optional)
