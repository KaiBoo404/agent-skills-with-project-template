# Technology Stack

## Core Technologies
| Category | Technology | Version | Notes |
|---|---|---|---|
| **Language** | {language} | {version} | — |
| **Framework** | {framework} | {version} | — |
| **Database** | {db} | {version} | — |
| **ORM / Query** | {orm} | {version} | — |
| **Authentication** | {auth} | — | — |
| **Testing** | {test framework} | {version} | — |
| **CI/CD** | {platform} | — | — |

## Key Dependencies
<!-- List only the critical dependencies that affect architecture decisions -->
| Package | Purpose | Constraints |
|---|---|---|
| `{package}` | {why it's used} | {version lock, deprecation, etc.} |

## Rules
- **Before adding a dependency:** Check this file first to avoid duplicates.
- **After adding a dependency:** Update this file with the package, purpose, and any constraints.
- **Version locks:** Any package with a constraint must not be upgraded without updating this file.

## Security
- {Key security considerations for this stack}

## Configuration
- Environment variables: `.env` / `.env.example`
- Secrets management: {approach}