# Coding Conventions & Standards

## Code Style
- **Language:** {language}
- **Formatting:** {formatter, e.g., Prettier, Black, gofmt}
- **Naming:**
  - Files: `kebab-case.ext`
  - Functions/variables: `camelCase`
  - Classes/types: `PascalCase`
  - Constants: `UPPER_SNAKE_CASE`
- **Comments:** Explain *why*, not *what*. Code should be self-documenting.
- **Constants:** No magic numbers or strings — declare with meaningful names.

## Architectural Patterns
- {e.g., Clean Architecture, MVC, MVVM, Hexagonal}
- Modules follow boundaries defined in `architecture.md`

## Error Handling
- Always use typed/structured errors (no bare strings)
- Log errors at the boundary (adapters), handle at the caller (core)
- User-facing errors must be localized and non-technical

## Testing Strategy
- **Unit tests:** Required for all `core/` logic
- **Integration tests:** Required for all `adapters/`
- **Naming:** `describe("{module}") → it("should {behavior}")`
- **Coverage target:** {percentage}%

## Git Conventions

### Branch Naming
```
<type>/<short-description>
feat/add-user-auth
fix/payment-timeout
```

### Commit Messages
```
<type>[optional scope]: <description>
[optional body]
[optional footer]
```

#### Types
| Type | Use For |
|---|---|
| `feat` | New features |
| `fix` | Bug fixes |
| `docs` | Documentation changes |
| `style` | Formatting (no logic change) |
| `refactor` | Code restructuring |
| `perf` | Performance improvements |
| `test` | Adding or fixing tests |
| `build` | Build system / dependencies |
| `ci` | CI/CD configuration |

## Code Review Checklist
- [ ] Follows naming conventions above
- [ ] No magic values
- [ ] Error handling is correct
- [ ] Tests added/updated for changes
- [ ] No circular dependencies