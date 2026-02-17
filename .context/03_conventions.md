# Coding Conventions & Standards

## 1. Code Style
- **Language:** C# (.NET 7.0 WebAPI)
- **Formatting:** Prettier (default settings), 2 space indentation.
- **Naming:**
  - Variables: `camelCase`
  - React Components: `PascalCase`
  - C# Classes/Methods: `PascalCase`
  - C# Interfaces: `I` prefix + `PascalCase`
  - Files: `kebab-case.ts` (Frontend), `PascalCase.cs` (Backend)
- **Comments:** Explain *why* a decision was made, not *what* the code does.
- **Constants:** Eliminate magic numbers/strings; declare constants with meaningful identifiers.

## 2. Architecture Patterns & Implementation Rules

### Layered Architecture
Follow **Controllers → Services → Repositories** pattern.
- **Controllers**: Handle HTTP requests/responses only. Wrap responses in `ApiResponseModel.Ok(data)`.
- **Services**: Contain all business logic.
- **Repositories**: Handle data access. Use Dapper for legacy/raw SQL, EF Core for config.

### Dependency Injection
- Inject services/repositories via constructor.
- **Registration:**
  - Prefer `AddSingleton` for stateless services (Performance).
  - Use `AddTransient` for stateful or per-request services.

### Data Access
- **Async/Await:** All database operations MUST be async.
- **Dapper:** Use for complex/legacy queries.
  ```csharp
  var sql = @"SELECT * FROM Table WHERE Column = @Param";
  return await _dbConnectionFactory.GetConnection().QueryAsync<Dto>(sql, new { Param = dto.Value });
  ```
- **Date/Time:** Use NodaTime types (`LocalDateTime`, `LocalDate`) with custom type handlers.

### Authentication & Context
- Access user identity via `HttpContext.User.Identity as OnebookAuthIdentity`.
- Properties: `identity.ProjectCode`, `identity.EmployeeID`, `identity.EnvCode`.

### Logging & Error Handling
- **Logging:** Use `Serilog`. Inject `ILogger<T>`.
- **Error Handling:** Use `Result<T, E>` pattern in business logic (if applicable) or explicit exception handling. Avoid silent failures.

## 3. Code Examples

### Controller Pattern
```csharp
[HttpPost]
public async Task<ActionResult<ApiResponseModel<ResponseType>>> Action([FromBody] RequestType request)
{
    var identity = HttpContext.User.Identity as OnebookAuthIdentity;
    var result = await _service.Method(identity.ProjectCode, identity.EmployeeID, request);
    return Ok(ApiResponseModel.Ok(result));
}
```

### Service Pattern
```csharp
public async Task<ResultType> Method(string projectCode, string employeeId, RequestType dto)
{
    // Business logic validation
    if (dto.Value < 0) throw new ApiErrorException("Invalid value");

    var data = await _repository.GetData(dto);
    return _mapper.Map<ResultType>(data);
}
```

## 4. Testing Strategy
- Unit Tests: Vitest (Business logic only).
- Integration: Playwright (Critical user flows).


# Git Commit Message Guidelines
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