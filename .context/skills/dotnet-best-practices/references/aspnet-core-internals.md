# ASP.NET Core Internals

**Source:** Andrew Lock (Author of "ASP.NET Core in Action")  
**Best for:** Understanding the framework, middleware pipeline, DI best practices

## Middleware Pipeline

### How It Works

```
Request → Middleware 1 → Middleware 2 → Middleware 3 → Endpoint
                ↓             ↓              ↓
Response ← Middleware 1 ← Middleware 2 ← Middleware 3 ←
```

Each middleware can:
- Process the request before passing to next
- Process the response after next completes
- Short-circuit the pipeline (return early)

### Order Matters (CRITICAL)

```csharp
// ✅ CORRECT order
app.UseExceptionHandler("/error");    // 1. Catch exceptions
app.UseHsts();                        // 2. HTTPS header
app.UseHttpsRedirection();            // 3. Redirect to HTTPS
app.UseStaticFiles();                 // 4. Static files (short-circuit)
app.UseRouting();                     // 5. Route matching
app.UseCors();                        // 6. CORS headers
app.UseAuthentication();              // 7. Who are you?
app.UseAuthorization();               // 8. Can you access?
app.MapControllers();                 // 9. Endpoints

// ❌ BAD: Authorization before Authentication
app.UseAuthorization();  // Doesn't know who user is!
app.UseAuthentication(); // Too late
```

### Custom Middleware

```csharp
// Inline middleware
app.Use(async (context, next) =>
{
    // Before
    var stopwatch = Stopwatch.StartNew();
    
    await next(context);
    
    // After
    stopwatch.Stop();
    context.Response.Headers.Add("X-Response-Time", $"{stopwatch.ElapsedMilliseconds}ms");
});

// Class-based middleware
public class RequestTimingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestTimingMiddleware> _logger;

    public RequestTimingMiddleware(RequestDelegate next, ILogger<RequestTimingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var stopwatch = Stopwatch.StartNew();
        
        await _next(context);
        
        stopwatch.Stop();
        _logger.LogInformation("Request {Path} took {Duration}ms", 
            context.Request.Path, stopwatch.ElapsedMilliseconds);
    }
}

// Registration
app.UseMiddleware<RequestTimingMiddleware>();
```

---

## Dependency Injection

### Service Lifetimes

| Lifetime | Instance Created | Use Case |
|----------|-----------------|----------|
| **Transient** | Every request | Lightweight, stateless services |
| **Scoped** | Once per HTTP request | DbContext, UnitOfWork |
| **Singleton** | Once for app lifetime | Configuration, caches, HttpClient |

```csharp
// Registration
builder.Services.AddTransient<IEmailService, EmailService>();
builder.Services.AddScoped<AppDbContext>();
builder.Services.AddSingleton<IConfiguration>(builder.Configuration);
```

### Lifetime Mismatch (CRITICAL)

```csharp
// ❌ BAD: Singleton depends on Scoped = CAPTIVE DEPENDENCY
public class SingletonService  // Lives forever
{
    private readonly AppDbContext _context; // Scoped - should die per request!
    
    public SingletonService(AppDbContext context)
    {
        _context = context; // This DbContext is "captive"
    }
}

// ✅ GOOD: Use factory for scoped in singleton
public class SingletonService
{
    private readonly IDbContextFactory<AppDbContext> _factory;
    
    public async Task DoWork()
    {
        using var context = _factory.CreateDbContext();
        // Fresh context each time
    }
}
```

### Constructor Injection Best Practices

```csharp
// ✅ GOOD: Constructor injection
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

// ❌ BAD: Service locator pattern
public class OrderService
{
    private readonly IServiceProvider _provider;
    
    public void DoWork()
    {
        var repo = _provider.GetService<IOrderRepository>(); // Anti-pattern!
    }
}
```

### Keyed Services (.NET 8+)

```csharp
// Register with keys
builder.Services.AddKeyedScoped<INotificationService, EmailService>("email");
builder.Services.AddKeyedScoped<INotificationService, SmsService>("sms");

// Inject by key
public class OrderProcessor([FromKeyedServices("email")] INotificationService notifier)
{
    // Uses EmailService
}
```

---

## Configuration

### Options Pattern

```csharp
// 1. Define options class
public class SmtpSettings
{
    public const string SectionName = "Smtp";
    
    public required string Host { get; init; }
    public int Port { get; init; } = 587;
    public required string Username { get; init; }
    public required string Password { get; init; }
}

// 2. Register with validation
builder.Services.AddOptions<SmtpSettings>()
    .BindConfiguration(SmtpSettings.SectionName)
    .ValidateDataAnnotations()
    .ValidateOnStart();  // Fail fast!

// 3. Inject
public class EmailService(IOptions<SmtpSettings> options)
{
    private readonly SmtpSettings _settings = options.Value;
}
```

### IOptions vs IOptionsSnapshot vs IOptionsMonitor

| Type | When Updated | Use Case |
|------|-------------|----------|
| `IOptions<T>` | Never (singleton) | Static config |
| `IOptionsSnapshot<T>` | Per request (scoped) | Request-scoped with reload |
| `IOptionsMonitor<T>` | Immediately (singleton) | Hot reload in singletons |

```csharp
// For config that can change at runtime
public class FeatureService(IOptionsMonitor<FeatureFlags> options)
{
    public bool IsEnabled(string feature)
    {
        return options.CurrentValue.EnabledFeatures.Contains(feature);
    }
}
```

---

## Request Pipeline Internals

### Endpoint Routing Flow

```csharp
// 1. UseRouting - determines WHICH endpoint matches
app.UseRouting();

// 2. Middleware between routing and endpoints
//    (knows which endpoint will run, but hasn't run yet)
app.UseAuthentication();
app.UseAuthorization();

// 3. UseEndpoints/MapControllers - RUNS the matched endpoint
app.MapControllers();
```

### Accessing Route Data in Middleware

```csharp
app.Use(async (context, next) =>
{
    var endpoint = context.GetEndpoint();
    
    if (endpoint != null)
    {
        var routePattern = (endpoint as RouteEndpoint)?.RoutePattern;
        var metadata = endpoint.Metadata;
        
        // Check for custom attributes
        var requiresAuth = metadata.GetMetadata<AuthorizeAttribute>();
    }
    
    await next(context);
});
```

---

## 7. Configuration Validation (Andrew Lock)

> [!IMPORTANT]
> **Don't let your app start with broken config.** Use `ValidateOnStart()`.

```csharp
// ❌ BAD: Fails only when accessed (runtime error)
builder.Services.Configure<SmtpSettings>(builder.Configuration.GetSection("Smtp"));

// ✅ GOOD: Fails at startup if config is missing/invalid
builder.Services.AddOptions<SmtpSettings>()
    .BindConfiguration("Smtp")
    .ValidateDataAnnotations()
    .ValidateOnStart(); // CRITICAL!
```

---

## 8. Detecting Captive Dependencies

**Captive Dependency:** A Singleton service holding a reference to a Scoped service.
**Result:** The Scoped service lives forever (memory leak, stale DB context).

**Solution:** Enable strict scope validation in Development.

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);

// Enabled by default in Development, but good to be explicit
builder.Host.UseDefaultServiceProvider((context, options) =>
{
    options.ValidateScopes = context.HostingEnvironment.IsDevelopment();
    options.ValidateOnBuild = context.HostingEnvironment.IsDevelopment();
});
```

---

## Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| Wrong middleware order | Follow ASP.NET Core conventions |
| Scoped in Singleton | Enable `ValidateScopes` in dev |
| Silent config failure | Use `ValidateOnStart()` |
| Service locator | Use constructor injection |
| Modifying response after started | Check Response.HasStarted |
| Blocking in middleware | Use async all the way |
