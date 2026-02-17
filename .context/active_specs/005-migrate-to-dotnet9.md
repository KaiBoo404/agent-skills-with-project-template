---
description: Upgrade from .NET 7 to .NET 9.0 (Current)
priority: medium
effort: medium
impact: 20-40% performance improvement, modern features, extended support
status: completed
created: 2026-01-02
updated: 2026-02-10
---

# Migrate to .NET 9.0

## Problem

Current project uses **.NET 7.0** which:
- Went **out of support on May 14, 2024**
- No longer receives security updates
- Missing significant performance improvements
- Missing new language features (C# 12, C# 13)

## Target

**.NET 9.0 (Current)**
- Supported until **May 2026** (STS) — evaluate .NET 10 LTS when available (Nov 2025)
- 20-40% cumulative performance improvement over .NET 7
- C# 13 language features
- Native AOT improvements
- Security updates and bug fixes

> [!NOTE]
> .NET 9 is STS (Standard Term Support), not LTS. If LTS stability is critical, consider .NET 8 LTS (supported until November 2026). However, .NET 10 LTS releases November 2025, making .NET 9 a practical stepping stone.

## Affected Files

### Primary
- `OnebookMobileAPI.csproj` (line 4)
- `OnebookMobileAPI_UnitTest.csproj`

### May Need Updates
- Package references (some may have .NET 9 specific versions)
- Any deprecated API usage
- Potential breaking changes across .NET 8 and .NET 9

## Migration Steps

### 1. Update Target Framework

**OnebookMobileAPI.csproj**:
```diff
- <TargetFramework>net7.0</TargetFramework>
+ <TargetFramework>net9.0</TargetFramework>
```

### 2. Update Package References

Check for newer versions compatible with .NET 9:
```bash
dotnet list package --outdated
dotnet outdated
```

Key packages to verify:
- Microsoft.EntityFrameworkCore (7.0.4 → 9.0.x)
- Microsoft.AspNetCore.* packages
- Serilog.AspNetCore
- NodaTime
- FirebaseAdmin

### 3. Install .NET 9 SDK

```bash
# Verify installation
dotnet --list-sdks
# Should show 9.0.x
```

### 4. Test Compatibility

```bash
# Build
dotnet build

# Run tests
dotnet test

# Check for warnings
dotnet build /warnaserror
```

## Expected Benefits

### Performance Improvements (cumulative .NET 7 → 9)
- JSON serialization: **20-40% faster** (System.Text.Json improvements)
- LINQ queries: **40% faster** (vectorized operations in .NET 9)
- Overall throughput: **20-40% improvement**
- Lower memory allocations (GC improvements)
- Regex: **significant performance gains** via source generators

### New Features Unlocked
- C# 12: Primary constructors, collection expressions, `required` members
- C# 13: `params` collections, `Lock` type
- `TimeProvider` — proper replacement for `DateTime.Now` (replaces Spec 018 partially)
- `FrozenDictionary` / `FrozenSet` — optimized read-heavy collections
- `SearchValues<T>` — hardware-accelerated string searching
- Built-in `RateLimiter` improvements (benefits Spec 013)
- `IExceptionHandler` — modern exception handling middleware
- `HybridCache` — unified in-memory + distributed cache (preview)

## Post-Migration Performance Investigation

> [!IMPORTANT]
> After migration, conduct a performance investigation using the patterns documented in:
> - `.context/skills/dotnet-best-practices/references/perf-async.md`
> - `.context/skills/dotnet-best-practices/references/perf-memory.md`

### Items to evaluate post-migration:
1. **`ValueTask` in cached paths** — `ConfigService`, `MasterCodeService` could benefit where cache hits are frequent
2. **`FrozenDictionary`** — for static lookup tables and configuration data loaded at startup
3. **`Span<T>` / `Memory<T>`** — profile hot paths to identify if zero-allocation slicing helps
4. **`record struct`** — evaluate small DTOs for value-type semantics
5. **LINQ hot paths** — .NET 9 vectorization may eliminate need for manual loops
6. **`TimeProvider`** — replace `DateTime.UtcNow` with injectable `TimeProvider` for testability

### How to investigate:
```bash
# Profile with dotnet-counters
dotnet counters monitor --process-id <PID> --counters System.Runtime

# Use BenchmarkDotNet for micro-benchmarks (perf-memory.md § Quick Profiling)
dotnet run -c Release -- --filter *HotPathBenchmarks*
```

## Testing Checklist

- [ ] All projects compile successfully
- [ ] All unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing of key features
- [ ] Performance benchmarks (before/after)
- [ ] Verify all NuGet packages compatible
- [ ] Test deployment process
- [ ] CI/CD pipeline updated for .NET 9 SDK

## Potential Breaking Changes

Review breaking changes documentation:
- .NET 8: https://learn.microsoft.com/en-us/dotnet/core/compatibility/8.0
- .NET 9: https://learn.microsoft.com/en-us/dotnet/core/compatibility/9.0

Common issues:
- Minimal API binding changes
- Authentication/authorization behavior changes
- EF Core query behavior updates
- `System.Text.Json` serialization changes
- Obsoleted APIs from .NET 7 → 9 gap

## Rollback Plan

If issues arise:
```diff
+ <TargetFramework>net7.0</TargetFramework>
- <TargetFramework>net9.0</TargetFramework>
```

Keep .NET 7 SDK installed for rollback.

## Implementation Notes

**Timeline**:
- Planning: 2-4 hours
- Migration: 6-8 hours (larger gap: .NET 7 → 9)
- Testing: 2-3 days
- Post-migration perf investigation: 1-2 days
- **Total**: ~3-5 days

**Risk Level**: Medium-High
- Skipping .NET 8 means more breaking changes to review
- Thorough testing required
- Have rollback plan ready

## Related Specs

- **Spec 013** (Rate Limiting) — benefits from .NET 9 `RateLimiter` improvements
- **Spec 018** (DateTime.Now) — `TimeProvider` available after migration
- **Spec 009** (Caching) — `HybridCache` available after migration
