---
MAYBE SKIPPED FOR MVP PHASE
---

# Coding Conventions & Standards

## 1. Code Style
- **Language:** -
- **Formatting:** -
- **Naming:** -
- **Comments:** Explain *why* a decision was made, not *what* the code does.
- **Constants:** Eliminate magic numbers/strings; declare constants with meaningful identifiers.

## 2. Architectural Patterns
-

## 3. Testing Strategy
-


## 4. Git Commit Message Guidelines
Use the following format for commit messages:

```text
<type>[optional scope]: [optional issue or defect IDs] <description>
[optional detailed body]
[optional footer(s)]
```

## Commit Types
* **build**: Changes that affect the build system or external dependencies (example scopes: npm, gulp, broccoli).
* **feat**: A new feature for the codebase.
* **fix**: A bug fix for the codebase.
* **docs**: Documentation-only changes.
* **style**: Code style changes (white-space, formatting, missing semi-colons) that do not affect the meaning of the code.
* **refactor**: A code change that neither fixes a bug nor adds a feature; a code structure improvement for readability and maintainability.
* **perf**: A code change that improves performance.
* **test**: Adding missing or correcting existing tests.
* **ci**: Changes to CI configuration files and scripts (Travis, Circle, BrowserStack, etc.).