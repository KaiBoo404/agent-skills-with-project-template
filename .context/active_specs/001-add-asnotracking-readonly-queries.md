---
description: Add AsNoTracking() to read-only Entity Framework queries for better performance
priority: high
effort: low
impact: 20-30% memory reduction, 10-30% faster queries
status: completed
created: 2026-01-02
---

# Add AsNoTracking() to Read-Only Queries

## Problem

Entity Framework Core tracks all entities returned from queries by default, even when those entities won't be modified. This consumes unnecessary memory and CPU cycles.

**Current Impact**:
- Higher memory usage per request
- Slower query execution (10-40% overhead)
- Change tracking overhead for read-only operations

## Affected Files

### Primary
- `Services/ConfigService.cs` (lines 122, 139)

### Needs Audit
- All Repository classes
- All Service classes making EF queries
- Any LINQ queries returning entities

## Specific Changes

### ConfigService.cs

**Line 122 - Themes query**:
```diff
- themes = await _context.Themes.ToListAsync();
+ themes = await _context.Themes.AsNoTracking().ToListAsync();
```

**Line 139 - Modules query**:
```diff
- modules = await _context.Modules.Include(m => m.Features).ToListAsync();
+ modules = await _context.Modules.Include(m => m.Features).AsNoTracking().ToListAsync();
```

## Expected Results

- **Memory**: 20-30% reduction in memory usage for read operations
- **Performance**: 10-30% faster query execution
- **Scalability**: Better performance under high load

## Testing Checklist

- [ ] Verify configuration endpoint still returns correct data
- [ ] Check that caching still works (cached data should be identical)
- [ ] Load test to measure memory improvement
- [ ] Verify no functionality is broken (entities are truly read-only)

## Implementation Notes

**When to use AsNoTracking()**:
-  Queries for display-only data
-  Data that will be cached
-  API responses that just serialize data
-  Queries where you'll update entities
-  Queries where you need to track changes

**Pattern to follow**:
```csharp
// Read-only query
var employees = await _context.Employees
    .Where(e => e.IsActive)
    .AsNoTracking()
    .ToListAsync();

// Query for updates (keep tracking)
var employee = await _context.Employees
    .FirstOrDefaultAsync(e => e.Id == id);
employee.Name = "Updated";
await _context.SaveChangesAsync();
```

## Related Improvements

- Audit all repositories for similar patterns
- Consider creating extension methods for common read-only queries
- Add coding guideline: "Always use AsNoTracking() for read-only queries"
