# Memory & Performance Optimization

**Source:** Gui Ferreira & Nick Chapsas (C# performance experts)  
**Best for:** High-throughput APIs, real-time systems, memory-constrained environments

> [!TIP]
> **"To retain performance benefits, return Span, not string."** Converting back to string reintroduces allocations. — Nick Chapsas

## Rule Summary

| Rule | Impact | Description |
|------|--------|-------------|
| `perf-span` | CRITICAL | Use `Span<T>` for zero-allocation slicing |
| `perf-arraypool` | HIGH | Rent arrays from pool instead of allocating |
| `perf-valuetask` | HIGH | Use `ValueTask` in hot paths |
| `perf-record-struct` | HIGH | Use `record struct` for small value-type data |
| `perf-struct` | MEDIUM | Use readonly struct for small, short-lived data |
| `perf-stringbuilder` | MEDIUM | Use StringBuilder for 4+ concatenations |
| `perf-stackalloc` | MEDIUM | Stack-allocate small buffers |
| `perf-frozen` | MEDIUM | Use FrozenDictionary for read-heavy lookups |

---

## 1. Span\<T\> - Zero-Allocation Slicing (CRITICAL)

```csharp
// ❌ BAD: Allocates new arrays for each slice
public string[] ParseCsv(string line)
{
    return line.Split(','); // Allocates new string array
}

// ✅ GOOD: Zero-allocation with Span
public void ParseCsv(ReadOnlySpan<char> line)
{
    int start = 0;
    for (int i = 0; i < line.Length; i++)
    {
        if (line[i] == ',')
        {
            ReadOnlySpan<char> field = line.Slice(start, i - start);
            ProcessField(field);
            start = i + 1;
        }
    }
    ProcessField(line.Slice(start)); // Last field
}
```

**Use cases:**
- Parsing strings/bytes
- Processing network buffers
- Substring operations
- Any slice operation in hot paths

---

## 2. ArrayPool\<T\> - Array Rental (HIGH)

```csharp
// ❌ BAD: Allocates new buffer each call
public void ProcessData(Stream input)
{
    byte[] buffer = new byte[4096]; // Allocation pressure
    int read = input.Read(buffer);
    // ...
}

// ✅ GOOD: Rent from pool
public void ProcessData(Stream input)
{
    byte[] buffer = ArrayPool<byte>.Shared.Rent(4096);
    try
    {
        int read = input.Read(buffer);
        // Process buffer...
    }
    finally
    {
        ArrayPool<byte>.Shared.Return(buffer);
    }
}
```

> [!WARNING]
> Always return rented arrays! Memory leaks occur if you forget.

---

## 3. ValueTask - Cached Results (HIGH)

```csharp
// ❌ BAD: Always allocates Task
public async Task<User?> GetUserAsync(Guid id)
{
    return await _cache.GetOrAddAsync(id, () => LoadUserFromDbAsync(id));
}

// ✅ GOOD: ValueTask avoids allocation when cached
public ValueTask<User?> GetUserAsync(Guid id)
{
    if (_cache.TryGetValue(id, out var user))
        return new ValueTask<User?>(user); // No allocation
        
    return new ValueTask<User?>(LoadUserFromDbAsync(id));
}
```

**Use when:**
- Result is often already available (cached)
- Called frequently in hot paths
- Majority of calls complete synchronously

**Don't use when:**
- Task is typically awaited multiple times
- Result needs to be stored

---

## 4. struct vs class (MEDIUM)

```csharp
// ❌ BAD: Class for small, short-lived data
public class Point { public int X; public int Y; }
Point[] points = new Point[1000]; // 1000 heap allocations

// ✅ GOOD: Struct avoids heap allocation
public readonly struct Point(int x, int y)
{
    public int X { get; } = x;
    public int Y { get; } = y;
}
Point[] points = new Point[1000]; // Single contiguous allocation
```

**Use struct when:**
- Size ≤ 16 bytes
- Immutable (readonly struct)
- Short-lived
- No inheritance needed

---

## 5. StringBuilder (MEDIUM)

```csharp
// ❌ BAD: Creates intermediate strings
string result = "";
foreach (var item in items)
{
    result += item.ToString() + ", "; // N allocations!
}

// ✅ GOOD: Single allocation
var sb = new StringBuilder();
foreach (var item in items)
{
    sb.Append(item).Append(", ");
}
string result = sb.ToString();

// ✅ BETTER: String.Join for simple cases
string result = string.Join(", ", items);
```

**Rule:** Use StringBuilder for 4+ concatenations.

---

## 6. stackalloc (MEDIUM)

```csharp
// ❌ BAD: Heap allocation for small buffer
byte[] buffer = new byte[256];

// ✅ GOOD: Stack allocation (no GC pressure)
Span<byte> buffer = stackalloc byte[256];
```

> [!CAUTION]
> Only use for small buffers (<1KB). Stack overflow risk with large allocations.

---

## 7. FrozenDictionary (.NET 8+)

```csharp
// ❌ BAD: Regular dictionary with read-heavy access
var lookup = new Dictionary<string, int>(data);
// Hash computation + bucket lookup on every access

// ✅ GOOD: FrozenDictionary for read-only data
var lookup = data.ToFrozenDictionary();
// Optimized for fast lookup, no modification support

// Perfect for:
// - Configuration loaded at startup
// - Static mapping tables
// - Cached reference data
```

---

## 8. Collection Optimization

```csharp
// ❌ BAD: O(n) lookup in list
var items = new List<string>(names);
bool exists = items.Contains("john"); // O(n)

// ✅ GOOD: O(1) lookup with HashSet
var items = new HashSet<string>(names);
bool exists = items.Contains("john"); // O(1)

// ✅ For key-value: Dictionary for O(1)
var lookup = names.ToDictionary(n => n.ToLower());
```

---

## 9. Object Pooling

```csharp
// Microsoft.Extensions.ObjectPool
private readonly ObjectPool<StringBuilder> _stringBuilderPool;

public string Format(IEnumerable<string> items)
{
    var sb = _stringBuilderPool.Get();
    try
    {
        foreach (var item in items)
            sb.Append(item).Append(", ");
        return sb.ToString();
    }
    finally
    {
        _stringBuilderPool.Return(sb);
    }
}

// Registration
builder.Services.AddSingleton<ObjectPoolProvider, DefaultObjectPoolProvider>();
builder.Services.AddSingleton(sp =>
{
    var provider = sp.GetRequiredService<ObjectPoolProvider>();
    return provider.CreateStringBuilderPool();
});
```

---

## 10. LINQ Optimization

```csharp
// ❌ BAD: Multiple iterations + allocations
var result = items
    .Where(x => x.IsActive)
    .Select(x => x.Name)
    .OrderBy(x => x)
    .ToList();

// ✅ GOOD: Single loop when performance matters
var result = new List<string>();
foreach (var item in items)
{
    if (item.IsActive)
        result.Add(item.Name);
}
result.Sort();

// ✅ Or: Use .ToArray() instead of .ToList() (smaller allocation)
```

---

## Quick Profiling

```csharp
// BenchmarkDotNet for micro-benchmarks
[MemoryDiagnoser]
public class StringBenchmarks
{
    [Benchmark]
    public string Concat() => "a" + "b" + "c";
    
    [Benchmark]
    public string StringBuilder()
    {
        var sb = new StringBuilder();
        sb.Append("a").Append("b").Append("c");
        return sb.ToString();
    }
}

// Run: dotnet run -c Release
```

---

## 11. Records Performance (Nick Chapsas)

### Record Class vs Record Struct

```csharp
// Record class (reference type) - allocates on heap
public record Point(int X, int Y);
var p1 = new Point(1, 2); // Heap allocation

// Record struct (value type) - no heap allocation
public record struct PointStruct(int X, int Y);
var p2 = new PointStruct(1, 2); // Stack or inline
```

**Use record struct when:**
- Small data (≤16 bytes)
- Value semantics needed
- Performance-critical calculations
- Short-lived instances

**Use record class when:**
- Larger data structures
- Needs to be null
- Inheritance required
- Stored in collections long-term

### Beware of `with` Expressions

```csharp
// ❌ Record class: `with` creates NEW allocation each time
public record Order(Guid Id, string Status, decimal Total);

var order = new Order(id, "Pending", 100m);
var updated = order with { Status = "Shipped" }; // New heap allocation!

// ✅ For frequent updates, consider mutable class or struct
```

---

## 12. Benchmarking Best Practices (Nick Chapsas)

### BenchmarkDotNet Setup

```csharp
[MemoryDiagnoser]  // Track allocations
[SimpleJob(RuntimeMoniker.Net80)]
public class StringBenchmarks
{
    private readonly string[] _items = Enumerable.Range(0, 100)
        .Select(i => i.ToString())
        .ToArray();

    [Benchmark(Baseline = true)]
    public string Concat()
    {
        string result = "";
        foreach (var item in _items)
            result += item + ",";
        return result;
    }

    [Benchmark]
    public string StringBuilder()
    {
        var sb = new StringBuilder();
        foreach (var item in _items)
            sb.Append(item).Append(',');
        return sb.ToString();
    }

    [Benchmark]
    public string StringJoin() => string.Join(",", _items);
}
```

### Benchmarking Rules

| Rule | Description |
|------|-------------|
| Release mode | Always run in Release, never Debug |
| No debugger | Detach debugger during benchmarks |
| Warm-up | Let BenchmarkDotNet handle JIT warm-up |
| Realistic data | Use production-like data sizes |
| Isolate code | Mock external dependencies |
| Multiple runs | Let BenchmarkDotNet determine iterations |

```bash
# Run benchmarks
dotnet run -c Release -- --filter *StringBenchmarks*
```

---

## 13. Span Limitations

```csharp
// ❌ BAD: Span cannot be used in async methods
public async Task ProcessAsync(Span<byte> buffer) // Compile error!
{
    await Task.Delay(100);
}

// ✅ GOOD: Use Memory<T> for async
public async Task ProcessAsync(Memory<byte> buffer)
{
    await Task.Delay(100);
    var span = buffer.Span; // Get span when needed
}

// ❌ BAD: Span cannot be stored in class fields
public class BadService
{
    private Span<byte> _buffer; // Compile error!
}

// ✅ GOOD: Use Memory<T> or array for storage
public class GoodService
{
    private Memory<byte> _buffer;
    // Or: private byte[] _buffer;
}
```

---

## 14. Unsafe High Performance (Nick Chapsas)

### CollectionsMarshal.AsSpan
Get a `Span<T>` directly from a `List<T>` without copying.

```csharp
List<int> numbers = [1, 2, 3, 4];

// ❌ BAD: .ToArray().AsSpan() allocates array copy
Span<int> span = numbers.ToArray().AsSpan();

// ✅ GOOD: Direct access to internal array (Zero allocation)
Span<int> span = CollectionsMarshal.AsSpan(numbers);
```

> [!CAUTION]
> **This is unsafe!** If you Add/Remove from the list while using the span, the span becomes invalid (dangling pointer risk) or points to garbage. Use only when list is stable.

---

## 15. Struct Layout & Padding (Gui Ferreira)

Structs are not always packed tightly. The runtime adds padding for alignment.

```csharp
// ❌ BAD: Wasteful layout (Size: 24 bytes on x64)
struct BadLayout
{
    byte A;  // 1 byte (+ 7 padding)
    long B;  // 8 bytes
    byte C;  // 1 byte (+ 7 padding)
}

// ✅ GOOD: Ordered by size (Size: 16 bytes on x64)
[StructLayout(LayoutKind.Sequential)]
struct GoodLayout
{
    long B;  // 8 bytes
    byte A;  // 1 byte
    byte C;  // 1 byte (+ 6 padding at end only)
}
```

**Tip:** Order fields from largest to smallest (Long -> Int -> Byte).

---

## Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| Creating arrays in hot paths | Use ArrayPool or stackalloc |
| String concat in loops | Use StringBuilder |
| List.Contains for lookups | Use HashSet or Dictionary |
| Struct padding waste | Order fields largest to smallest |
| Modifying list while using CollectionsMarshal | Don't do it! |
| Boxing value types | Use generics, avoid object |
| Allocating in LINQ | Consider manual loops in hot paths |
| Record class for small data | Use record struct instead |
| Span in async methods | Use Memory<T> |
| Benchmarking in Debug mode | Always use Release |
