# 🧠 Universal Vibe Coding Template

> The standard foundation for Spec-Driven Development with AI coding agents.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## What Is This?

A **minimal, agent-agnostic template** that gives AI coding assistants (Cursor, Claude Code, GitHub Copilot, Trae, Antigravity) structured context about your project. Instead of repeating yourself every session, you define your project's rules once, and every AI agent respects them.

**Core idea:** `AGENTS.md` → `.context/` → Skills

```
Your Project/
├── AGENTS.md              ← AI reads this first (the entry point)
├── .context/              ← Project knowledge (the brain)
│   ├── project.md         ← What are we building?
│   ├── architecture.md    ← Where do files go?
│   ├── stack.md           ← What technologies are we using?
│   ├── conventions.md     ← How do we write code?
│   └── specs/             ← What are we working on right now?
├── .agents/skills/        ← Installable AI capabilities
├── .cursorrules           ← Auto-generated Cursor compatibility
└── .github/copilot-instructions.md  ← Auto-generated Copilot compatibility
```

## Quick Start

### Option A: CLI (Recommended)
```bash
# Lite setup (3 files — AGENTS.md + project.md + conventions.md)
npx @vibecoding/skills init myproject

# Full setup (all context files + stubs + skills manifest)
npx @vibecoding/skills init myproject --full
```

### Option B: Manual
1. Copy `AGENTS.md` to your project root
2. Create `.context/` directory
3. Copy `project.md` and `conventions.md` into `.context/`
4. Fill in the `{placeholders}`

## How It Works

### The Lazy-Load Principle
Unlike systems that dump all context at once, this template uses a **lazy-load table** in `AGENTS.md`. AI agents only read the files relevant to their current task:

| Doing This? | Read This |
|---|---|
| Starting a session | `project.md` |
| Creating files | `architecture.md` |
| Adding dependencies | `stack.md` |
| Writing code | `conventions.md` |
| Working on a feature | `specs/feat-*.md` |

This prevents **context overload** — the #1 failure mode of AI-assisted development.

### Agent Compatibility
`AGENTS.md` is the **single canonical source**. Thin stubs (`.cursorrules`, `.github/copilot-instructions.md`) redirect other agents to it. No duplicate instructions to maintain.

| Agent | Reads From | Status |
|---|---|---|
| Claude Code | `AGENTS.md` ✅ | Native support |
| Antigravity | `AGENTS.md` + `.agents/skills/` ✅ | Native support |
| Cursor | `.cursorrules` → `AGENTS.md` | Redirect stub |
| GitHub Copilot | `.github/copilot-instructions.md` → `AGENTS.md` | Redirect stub |
| Trae | `AGENTS.md` | Native support |

## Skills

Skills are packaged AI capabilities that teach your agent domain-specific patterns.

### Core Skills (Pre-installed)

| Skill | Purpose |
|---|---|
| `context-sync` | Auto-detects when `.context/` files need updating |
| `spec-lifecycle` | Manages feature specs: create → progress → complete → archive |
| `architecture-guard` | Validates file placement against `architecture.md` |
| `commit-conventions` | Generates structured commit messages from diffs |
| `onboard` | Generates a project dashboard for instant orientation |

### Managing Skills
```bash
npx @vibecoding/skills list              # See installed skills
npx @vibecoding/skills add <name>        # Install a skill
npx @vibecoding/skills remove <name>     # Remove a skill
npx @vibecoding/skills search <query>    # Find skills in registry
```

### Creating a Skill
Create a directory in `.agents/skills/<name>/` with a `SKILL.md` file:

```yaml
---
name: my-skill
description: What this skill does (used for lazy-loading decisions)
version: 1.0.0
---

# My Skill
Instructions for the AI agent...
```

## Spec-Driven Development Workflow

### 1. Define → 2. Spec → 3. Build → 4. Sync

```
┌─────────────┐     ┌───────────────┐     ┌─────────────┐     ┌──────────────┐
│  1. Define   │────▶│  2. Write Spec │────▶│  3. Build    │────▶│  4. Sync     │
│  project.md  │     │  specs/feat-*  │     │  with AI     │     │  .context/   │
└─────────────┘     └───────────────┘     └─────────────┘     └──────────────┘
```

1. **Define** your project context in `.context/` files
2. **Write a spec** in `.context/specs/feat-my-feature.md` using the template
3. **Build** by telling the AI: *"Read the spec and implement it"*
4. **Sync** — after building, update `.context/` files to reflect changes

## File Reference

| File | Purpose | Edit Frequency |
|---|---|---|
| `AGENTS.md` | AI entry point + persona | Rarely |
| `.context/project.md` | Product vision, users, flows | Per milestone |
| `.context/architecture.md` | Directory structure, module boundaries | When adding modules |
| `.context/stack.md` | Technologies, dependencies, versions | When adding deps |
| `.context/conventions.md` | Code style, naming, testing rules | When standards change |
| `.context/specs/_template.md` | Feature spec template | Rarely |
| `.agents/skills/skills.json` | Installed skills manifest | Auto-managed by CLI |

## Design Principles

1. **Minimal by default** — Start with 3 files, add more as needed
2. **Lazy-load over eager-load** — AI reads only what's relevant
3. **Single source of truth** — `AGENTS.md` is canonical; stubs redirect
4. **Skills are opt-in** — Never bulk-loaded; triggered by relevance
5. **Tech-agnostic** — Works with any language, framework, or stack

## Contributing

1. Fork this repository
2. Create a feature branch
3. Submit a PR with a description of what you're adding

## License

MIT
