# Architecture & Directory Structure

## Overview
This document defines **WHERE** files go and **HOW** modules are organized.

## Directory Structure

```text
{PROJECT_NAME}/
├── src/                        # Application source code
│   ├── core/                   # Domain logic & business rules
│   ├── adapters/               # External integrations (APIs, DB, services)
│   ├── ui/                     # Components & presentation layer
│   └── shared/                 # Shared utilities, types, constants
├── tests/                      # Test files (mirrors src/ structure)
├── .context/                   # AI context & documentation
│   ├── project.md              # Product vision & flows
│   ├── architecture.md         # This file — structure & boundaries
│   ├── stack.md                # Technologies & dependencies
│   ├── conventions.md          # Code style & patterns
│   └── specs/                  # Feature specifications
│       ├── _template.md        # Spec template
│       ├── feat-*.md           # Active feature specs
│       ├── fix-*.md            # Active bugfix specs
│       └── .archive/           # Completed specs
├── .agents/skills/             # Installed AI skills
├── AGENTS.md                   # AI agent entry point
└── README.md                   # Human-facing documentation
```

## Module Boundaries

| Module | Responsibility | May Import From |
|---|---|---|
| `core/` | Business logic, domain models, validation | `shared/` only |
| `adapters/` | External APIs, database, file I/O | `core/`, `shared/` |
| `ui/` | Components, pages, routing | `core/`, `shared/` |
| `shared/` | Utilities, types, constants | Nothing (leaf module) |

## Rules
- **New files** must be placed according to this structure. Ask if unsure.
- **Cross-module imports** must follow the "May Import From" column.
- **Circular dependencies** between modules are forbidden.