---
description: Review and fix dependency injection lifetime inconsistencies
priority: medium-high
effort: medium
impact: Prevents thread-safety issues and subtle bugs
status: completed
created: 2026-01-02
---

# Fix Dependency Injection Lifetime Issues

## Problem

Services and repositories have inconsistent DI lifetimes in `Program.cs` with no clear pattern:

- **Transient** (7 services): EmployeeInfoService, UserProfileService, etc.
- **Singleton** (20+ services): MasterCodeService, GraphService, etc.
- **Scoped**: Not used anywhere

**Issues**:
1. Some singletons have injected DbContext (should be scoped/transient)
2. No clear decision criteria for lifetime choice
3. Potential thread-safety concerns
4. Performance not optimized

## Affected Files

- `Program.cs` (lines 108-165) - Service registrations

## Analysis Needed

For each service, determine:

| Criteria | Recommended Lifetime |
|----------|---------------------|
| Stateless, no DbContext | Singleton (best performance) |
| Uses DbContext | Transient or Scoped |
| HTTP client operations | Singleton (with IHttpClientFactory) |
| Per-request state | Scoped |
| Frequent creation/disposal | Consider pooling |

## Current State

### Transient Services
```csharp
builder.Services.AddTransient<EmployeeInfoService>();
builder.Services.AddTransient<UserProfileService>();
builder.Services.AddTransient<AnnouncementService>();
builder.Services.AddTransient<ControlEnvironmentService>();
builder.Services.AddTransient<AttendanceService>();
builder.Services.AddTransient<RequestService>();
builder.Services.AddTransient<AttendanceCorrectionService>();
builder.Services.AddTransient<ConfigService>();
```

### Singleton Services
```csharp
builder.Services.AddSingleton<MasterCodeService>();
builder.Services.AddSingleton<GraphService>();
builder.Services.AddSingleton<TeamAttendanceService>();
builder.Services.AddSingleton<ProfileService>();
builder.Services.AddSingleton<OvertimeService>();
builder.Services.AddSingleton<PhotoService>();
builder.Services.AddSingleton<FileUrlService>();
// ... and many more
```

## Investigation Tasks

- [ ] Audit each service for DbContext usage
- [ ] Check for mutable state in singleton services
- [ ] Identify thread-safety concerns
- [ ] Document rationale for each lifetime choice

## Recommended Pattern

```csharp
// Stateless services - Singleton
builder.Services.AddSingleton<StatelessCalculationService>();

// Database operations - Scoped (tied to request)
builder.Services.AddScoped<EmployeeInfoService>();
builder.Services.AddScoped<UserProfileService>();

// Lightweight, frequently created - Transient
builder.Services.AddTransient<EmailService>();

// HTTP clients - Singleton (managed by IHttpClientFactory)
builder.Services.AddHttpClient<ExternalApiService>();
```

## Testing Checklist

- [ ] No DbContext issues in singletons
- [ ] Thread-safety verified for concurrent requests
- [ ] Load test to check for race conditions
- [ ] Memory usage doesn't increase significantly

## Implementation Notes

**DbContext Lifetime Rules**:
- DbContext should be **Scoped** (one per request)
- Services using DbContext should be **Scoped** or **Transient**
- Never inject DbContext into Singleton (will cause issues)

**Performance Considerations**:
- Singleton: Fastest (created once)
- Scoped: One per HTTP request
- Transient: Created every injection (highest overhead)

## Related Improvements

- Add XML documentation explaining lifetime choices
- Create service base classes with clear lifetime expectations
- Add coding guidelines for DI lifetime selection
