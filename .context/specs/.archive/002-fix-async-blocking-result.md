---
description: Fix blocking .Result call in async code that can cause deadlocks
priority: critical
effort: minimal
impact: Prevents deadlocks, better thread pool utilization
status: pending
created: 2026-01-02
---

# Fix Async Blocking with .Result

## Problem

Using `.Result` on async methods blocks the calling thread, which can cause:
- **Deadlocks** in ASP.NET Core
- **Thread pool starvation** under load
- **Reduced scalability** and throughput

## Affected Files

### Primary
- `Services/CheckInService.cs` (line 652)

### Needs Audit
- Search entire codebase for `.Result` and `.Wait()` patterns
- Check all async methods for proper await usage

## Specific Changes

### CheckInService.cs Line 652

**Current (BAD)**:
```csharp
var clientResponse = _httpClient.PostAsJsonAsync("checkIn/submit", webApiInput).Result;
```

**Fixed**:
```csharp
var clientResponse = await _httpClient.PostAsJsonAsync("checkIn/submit", webApiInput);
```

## Why This Matters

### Deadlock Scenario
```
1. Thread A calls async method
2. Method uses .Result (blocks Thread A)
3. Async continuation tries to return to Thread A
4. Thread A is blocked waiting for result
5. DEADLOCK - neither can proceed
```

### Performance Impact
- Blocks expensive thread pool threads
- Under load, can exhaust thread pool
- Reduces concurrent request capacity by 50-80%

## Testing Checklist

- [ ] Verify check-in flow works (v1 and v2)
- [ ] Test under load (50+ concurrent requests)
- [ ] Monitor for deadlocks in logs
- [ ] Verify no performance regression

## Implementation Notes

**Never use**:
-  `.Result`
-  `.Wait()`
-  `.GetAwaiter().GetResult()` (in async context)

**Always use**:
-  `await methodAsync()`
-  Async all the way up the call stack

## Related Improvements

- Audit entire codebase for blocking async calls
- Add analyzer rule to catch these patterns
- Add to coding guidelines
