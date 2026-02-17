# Production Pitfalls - Configuration & Resources

Common mistakes found in production .NET applications related to configuration, resource management, and HTTP clients.

## Configuration Pitfalls

### 1. Hardcoded Connection Strings (CRITICAL)

```csharp
// ❌ BAD: Secrets in code
var conn = "Server=prod;Database=App;User=admin;Password=secret123;";

// ✅ GOOD: Use configuration
var conn = builder.Configuration.GetConnectionString("Default");

// appsettings.json (development)
{
  "ConnectionStrings": {
    "Default": "Server=localhost;Database=App;..."
  }
}

// Production: Use environment variables or Azure Key Vault
// CONNECTIONSTRINGS__DEFAULT=Server=prod;Database=App;...
```

### 2. Missing Configuration Validation

```csharp
// ❌ BAD: No validation, fails at runtime
var apiKey = configuration["ApiKey"]; // null if missing

// ✅ GOOD: Validate at startup
public class ApiSettings
{
    public required string ApiKey { get; init; }
    public required string BaseUrl { get; init; }
}

builder.Services.AddOptions<ApiSettings>()
    .BindConfiguration("Api")
    .ValidateDataAnnotations()
    .ValidateOnStart();
```

---

## Resource Management Pitfalls

### 3. HttpClient Per-Request (CRITICAL)

```csharp
// ❌ BAD: Creates new HttpClient per request = PORT EXHAUSTION
public async Task CallApi()
{
    using var client = new HttpClient();
    await client.GetAsync("https://api.example.com");
}

// ✅ GOOD: Use IHttpClientFactory
public class MyService
{
    private readonly IHttpClientFactory _factory;
    
    public async Task CallApi()
    {
        var client = _factory.CreateClient();
        await client.GetAsync("https://api.example.com");
    }
}

// Registration
builder.Services.AddHttpClient();

// Or typed clients
builder.Services.AddHttpClient<IMyApiClient, MyApiClient>(client =>
{
    client.BaseAddress = new Uri("https://api.example.com");
    client.Timeout = TimeSpan.FromSeconds(30);
});
```

### 4. Missing IDisposable (HIGH)

```csharp
// ❌ BAD: Resource leak
public void ProcessFile(string path)
{
    var stream = File.OpenRead(path);
    // If exception occurs, stream never disposed!
    Process(stream);
    stream.Dispose();
}

// ✅ GOOD: Using statement
public void ProcessFile(string path)
{
    using var stream = File.OpenRead(path);
    Process(stream);
} // Disposed even if exception

// ✅ Also for DbContext, SqlConnection, etc.
using var connection = new SqlConnection(connectionString);
```

### 5. DbContext Lifetime Issues (HIGH)

```csharp
// ❌ BAD: Singleton DbContext (not thread-safe)
builder.Services.AddSingleton<AppDbContext>();

// ❌ BAD: Capturing DbContext in singleton
public class SingletonService
{
    private readonly AppDbContext _context; // Captured scoped service!
}

// ✅ GOOD: Scoped DbContext
builder.Services.AddDbContext<AppDbContext>(options => ...);

// ✅ GOOD: Factory for singletons
public class SingletonService
{
    private readonly IDbContextFactory<AppDbContext> _factory;
    
    public async Task DoWork()
    {
        using var context = _factory.CreateDbContext();
        // ...
    }
}
```

---

## DateTime Pitfalls

### 6. DateTime.Now in Business Logic (MEDIUM)

```csharp
// ❌ BAD: Hard to test, timezone issues
public class Order
{
    public DateTime CreatedAt { get; set; } = DateTime.Now;
}

// ✅ GOOD: Use UTC
public class Order
{
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

// ✅ BETTER: Use TimeProvider (.NET 8+) for testability
public class OrderService
{
    private readonly TimeProvider _timeProvider;
    
    public Order Create()
    {
        return new Order { CreatedAt = _timeProvider.GetUtcNow().DateTime };
    }
}

// Registration
builder.Services.AddSingleton(TimeProvider.System);

// In tests
var fakeTime = new FakeTimeProvider(new DateTime(2024, 1, 1));
```

---

## Logging Pitfalls

### 7. Logging Sensitive Data (HIGH)

```csharp
// ❌ BAD: Logging passwords, PII
_logger.LogInformation("User login: {Email}, Password: {Password}", email, password);
_logger.LogInformation("Request: {@Request}", request); // May contain sensitive props

// ✅ GOOD: Sanitize logged data
_logger.LogInformation("User login attempt: {Email}", email);
_logger.LogInformation("Request: {RequestType}, Id: {Id}", request.GetType().Name, request.Id);
```

### 8. String Interpolation in Logs (MEDIUM)

```csharp
// ❌ BAD: String allocated even if log level disabled
_logger.LogDebug($"Processing order {orderId}"); // Always allocates

// ✅ GOOD: Structured logging (lazy evaluation)
_logger.LogDebug("Processing order {OrderId}", orderId);
```

### 9. Catching Generic Exception (MEDIUM)

```csharp
// ❌ BAD: Catches everything including OutOfMemoryException
try { await ProcessAsync(); }
catch (Exception ex) { _logger.LogError(ex, "Failed"); }

// ✅ GOOD: Catch specific exceptions
try { await ProcessAsync(); }
catch (ValidationException ex) { return BadRequest(ex.Message); }
catch (NotFoundException ex) { return NotFound(); }
catch (OperationCanceledException) { throw; } // Re-throw cancellation
```

---

## String Pitfalls

### 10. String Concatenation in Loops (MEDIUM)

```csharp
// ❌ BAD: O(n²) allocations
string result = "";
foreach (var item in items)
    result += item.Name + ", ";

// ✅ GOOD: StringBuilder
var sb = new StringBuilder();
foreach (var item in items)
    sb.Append(item.Name).Append(", ");
string result = sb.ToString();

// ✅ BETTER: String.Join
string result = string.Join(", ", items.Select(i => i.Name));
```

---

## Common Pitfalls Summary

| Pitfall | Impact | Solution |
|---------|--------|----------|
| Hardcoded secrets | CRITICAL | Use configuration/Key Vault |
| HttpClient per-request | CRITICAL | Use IHttpClientFactory |
| Missing using/Dispose | HIGH | Always use `using` statement |
| DateTime.Now | MEDIUM | Use DateTime.UtcNow or TimeProvider |
| Logging sensitive data | HIGH | Sanitize all logged data |
| String interpolation in logs | MEDIUM | Use structured logging |
| Catching Exception | MEDIUM | Catch specific types |
| String concat in loops | MEDIUM | Use StringBuilder |
| Singleton DbContext | HIGH | Use Scoped or Factory |
| Missing config validation | MEDIUM | ValidateOnStart |
