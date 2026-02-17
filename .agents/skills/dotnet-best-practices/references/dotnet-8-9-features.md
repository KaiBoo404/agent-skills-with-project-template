# .NET 8/9 Features

Modern .NET features for improved performance, productivity, and code quality.

## .NET 8 Features (LTS)

### 1. FrozenDictionary & FrozenSet

Optimized for read-heavy scenarios with immutable collections.

```csharp
// ❌ Before: Regular dictionary
var lookup = new Dictionary<string, Country>(countries);

// ✅ After: Frozen for read-only data
var lookup = countries.ToFrozenDictionary(c => c.Code, c => c);

// Perfect for:
// - Configuration loaded at startup
// - Static mapping tables
// - Cached reference data
```

### 2. Primary Constructors (C# 12)

```csharp
// ❌ Before: Verbose constructor
public class OrderService
{
    private readonly IOrderRepository _repository;
    private readonly ILogger<OrderService> _logger;

    public OrderService(IOrderRepository repository, ILogger<OrderService> logger)
    {
        _repository = repository;
        _logger = logger;
    }
}

// ✅ After: Primary constructor
public class OrderService(IOrderRepository repository, ILogger<OrderService> logger)
{
    public async Task<Order?> GetAsync(Guid id) => await repository.GetByIdAsync(id);
}
```

### 3. Collection Expressions (C# 12)

```csharp
// ❌ Before
int[] numbers = new int[] { 1, 2, 3 };
List<string> names = new List<string> { "a", "b" };

// ✅ After
int[] numbers = [1, 2, 3];
List<string> names = ["a", "b"];

// Spread operator
int[] combined = [..numbers, 4, 5, ..otherNumbers];
```

### 4. TimeProvider for Testing

```csharp
// ❌ Before: Hard to test
public class Order
{
    public DateTime CreatedAt { get; } = DateTime.UtcNow;
}

// ✅ After: Testable with TimeProvider
public class OrderService(TimeProvider timeProvider)
{
    public Order Create()
    {
        return new Order { CreatedAt = timeProvider.GetUtcNow().DateTime };
    }
}

// Production
builder.Services.AddSingleton(TimeProvider.System);

// Tests
var fakeTime = new FakeTimeProvider(new DateTimeOffset(2024, 1, 15, 0, 0, 0, TimeSpan.Zero));
var service = new OrderService(fakeTime);
var order = service.Create();
order.CreatedAt.Should().Be(new DateTime(2024, 1, 15));
```

### 5. Native AOT

Compile directly to native code for faster startup and smaller size.

```xml
<!-- Project file -->
<PropertyGroup>
  <PublishAot>true</PublishAot>
</PropertyGroup>
```

```bash
# Publish
dotnet publish -c Release -r win-x64
```

**Considerations:**
- No runtime JIT compilation
- Some reflection features limited
- Smaller attack surface
- Great for containerized apps

### 6. Keyed Services

```csharp
// ❌ Before: Marker interfaces or manual factories
public interface IPrimaryDatabase : IDatabase { }
public interface ISecondaryDatabase : IDatabase { }

// ✅ After: Keyed registration
builder.Services.AddKeyedSingleton<IDatabase, SqlDatabase>("primary");
builder.Services.AddKeyedSingleton<IDatabase, CosmosDatabase>("secondary");

// Injection
public class Service([FromKeyedServices("primary")] IDatabase database)
{
    // Uses SqlDatabase
}
```

### 7. ConfigureHttpClientDefaults

```csharp
// Apply defaults to all HttpClients
builder.Services.ConfigureHttpClientDefaults(http =>
{
    http.AddStandardResilienceHandler(); // Polly integration
    http.ConfigureHttpClient(client =>
    {
        client.DefaultRequestHeaders.Add("User-Agent", "MyApp/1.0");
    });
});
```

---

## .NET 9 Features (Preview/STS)

### 1. LINQ Improvements

```csharp
// CountBy - Count by key without intermediate grouping
var countsByCategory = products.CountBy(p => p.Category);
// Before: products.GroupBy(p => p.Category).Select(g => (g.Key, g.Count()))

// AggregateBy - Aggregate by key
var totalByCategory = products.AggregateBy(
    p => p.Category,
    seed: 0m,
    (total, p) => total + p.Price);

// Index - Get index with each element
foreach (var (index, item) in items.Index())
{
    Console.WriteLine($"{index}: {item}");
}
```

### 2. Params Collections

```csharp
// ❌ Before: Only arrays
public void Log(params string[] messages) { }

// ✅ After: Any collection type
public void Log(params ReadOnlySpan<string> messages) { }
public void Log(params IEnumerable<string> messages) { }
public void Log(params List<string> messages) { }
```

### 3. Task.WhenEach

```csharp
// Process tasks as they complete
var tasks = urls.Select(url => httpClient.GetStringAsync(url));

await foreach (var completedTask in Task.WhenEach(tasks))
{
    try
    {
        var result = await completedTask;
        ProcessResult(result);
    }
    catch (Exception ex)
    {
        HandleError(ex);
    }
}
```

### 4. HybridCache

```csharp
// Combines in-memory and distributed cache
builder.Services.AddHybridCache(options =>
{
    options.DefaultEntryOptions = new HybridCacheEntryOptions
    {
        Expiration = TimeSpan.FromMinutes(5),
        LocalCacheExpiration = TimeSpan.FromMinutes(1)
    };
});

public class ProductService(HybridCache cache)
{
    public async Task<Product?> GetAsync(Guid id, CancellationToken ct)
    {
        return await cache.GetOrCreateAsync(
            $"product:{id}",
            async token => await _repository.GetByIdAsync(id, token),
            cancellationToken: ct);
    }
}
```

### 5. SearchValues Span Optimization

```csharp
// Optimized multi-value search in spans
private static readonly SearchValues<char> Vowels = SearchValues.Create("aeiouAEIOU");

public int CountVowels(ReadOnlySpan<char> text)
{
    int count = 0;
    foreach (var c in text)
    {
        if (Vowels.Contains(c)) count++;
    }
    return count;
}
```

---

## Migration Tips

### .NET 8 Upgrade Checklist

1. Update `global.json` and project files to .NET 8
2. Update NuGet packages to .NET 8 compatible versions
3. Review breaking changes in Microsoft docs
4. Enable new C# 12 features in project file
5. Consider enabling Keyed Services where appropriate
6. Evaluate Native AOT for suitable projects

### Quick Wins

```csharp
// 1. Use collection expressions
int[] ids = [1, 2, 3];

// 2. Use primary constructors
public class Service(IRepository repo) { }

// 3. Use FrozenDictionary for static lookups
var lookup = data.ToFrozenDictionary();

// 4. Use TimeProvider for testability
services.AddSingleton(TimeProvider.System);

// 5. Configure HTTP client defaults
services.ConfigureHttpClientDefaults(http => http.AddStandardResilienceHandler());
```
