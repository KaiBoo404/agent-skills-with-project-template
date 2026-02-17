# Async/Await Best Practices

**Source:** David Fowler (Microsoft Partner Architect) & Stephen Cleary  
**Critical for:** Application stability, avoiding deadlocks, proper resource management

> [!IMPORTANT]
> **"Asynchrony is viral"** - Once async, always async. Partial async is worse than fully sync. — David Fowler

## Rule Summary

| Rule | Impact | Description |
|------|--------|-------------|
| `async-all-way` | CRITICAL | Never mix sync and async (deadlock risk) |
| `async-no-result` | CRITICAL | Never use `.Result` or `.Wait()` |
| `async-always-await` | CRITICAL | Always await Tasks (don't elide unless pure pass-through) |
| `async-cancellation` | HIGH | Always accept and respect CancellationToken |
| `async-dispose-cts` | HIGH | Always dispose CancellationTokenSource |
| `async-no-async-void` | HIGH | Avoid async void except for event handlers |
| `async-configureawait` | MEDIUM | Use `ConfigureAwait(false)` in libraries |
| `async-parallelism` | MEDIUM | Use `Task.WhenAll` for independent operations |
| `async-prefer-await` | MEDIUM | Prefer await over ContinueWith |

---

## 1. Async All The Way (CRITICAL)

```csharp
// ❌ BAD: Mixing sync and async = DEADLOCK
public string GetData()
{
    // This WILL deadlock in ASP.NET Classic and WinForms/WPF
    return GetDataAsync().Result;
}

public async Task<string> GetDataAsync()
{
    var data = await _httpClient.GetStringAsync(url);
    return data;
}

// ✅ GOOD: Async all the way
public async Task<string> GetDataAsync()
{
    var data = await _httpClient.GetStringAsync(url);
    return data;
}

// Controller
[HttpGet]
public async Task<ActionResult<string>> Get()
{
    return await _service.GetDataAsync();
}
```

---

## 2. Never Use .Result or .Wait() (CRITICAL)

```csharp
// ❌ BAD: Blocks thread, deadlock risk
var result = GetDataAsync().Result;
GetDataAsync().Wait();

// ❌ BAD: GetAwaiter().GetResult() is also blocking
var result = GetDataAsync().GetAwaiter().GetResult();

// ✅ GOOD: Await properly
var result = await GetDataAsync();
```

**Exception:** Console app `Main` before C# 7.1
```csharp
// Only acceptable in Main() of console apps
public static void Main(string[] args)
{
    MainAsync(args).GetAwaiter().GetResult();
}

// Better: Use async Main (C# 7.1+)
public static async Task Main(string[] args)
{
    await MainAsync(args);
}
```

---

## 3. CancellationToken (HIGH)

```csharp
// ❌ BAD: No cancellation support
public async Task<List<Order>> GetOrdersAsync()
{
    return await _context.Orders.ToListAsync();
}

// ✅ GOOD: Accept and pass CancellationToken
public async Task<List<Order>> GetOrdersAsync(CancellationToken ct = default)
{
    ct.ThrowIfCancellationRequested();
    
    return await _context.Orders
        .ToListAsync(ct);
}

// Controller automatically provides token
[HttpGet]
public async Task<ActionResult<List<Order>>> Get(CancellationToken ct)
{
    return await _service.GetOrdersAsync(ct);
}
```

**Long-running operations:**
```csharp
public async Task ProcessBatchAsync(IEnumerable<Item> items, CancellationToken ct)
{
    foreach (var item in items)
    {
        ct.ThrowIfCancellationRequested(); // Check before each item
        await ProcessItemAsync(item, ct);
    }
}
```

---

## 4. ConfigureAwait (MEDIUM)

```csharp
// In APPLICATION code (ASP.NET Core): Don't need ConfigureAwait
public async Task<Data> GetDataAsync()
{
    return await _httpClient.GetAsync(url); // No ConfigureAwait needed
}

// In LIBRARY code: Use ConfigureAwait(false)
public async Task<Data> GetDataAsync()
{
    return await _httpClient.GetAsync(url).ConfigureAwait(false);
}
```

**Why?**
- ASP.NET Core has no SynchronizationContext — not needed
- WinForms/WPF have SynchronizationContext — `ConfigureAwait(false)` avoids deadlocks
- Libraries should work in any environment — always use `ConfigureAwait(false)`

---

## 5. Parallel Async Operations (MEDIUM)

```csharp
// ❌ BAD: Sequential when could be parallel
var user = await GetUserAsync(id);
var orders = await GetOrdersAsync(id);
var notifications = await GetNotificationsAsync(id);
// Total time: User + Orders + Notifications

// ✅ GOOD: Parallel independent operations
var userTask = GetUserAsync(id);
var ordersTask = GetOrdersAsync(id);
var notificationsTask = GetNotificationsAsync(id);

await Task.WhenAll(userTask, ordersTask, notificationsTask);

var user = await userTask;
var orders = await ordersTask;
var notifications = await notificationsTask;
// Total time: Max(User, Orders, Notifications)
```

**With results:**
```csharp
var (user, orders) = await (GetUserAsync(id), GetOrdersAsync(id)).WhenAll();

// Extension method
public static class TaskExtensions
{
    public static async Task<(T1, T2)> WhenAll<T1, T2>(this (Task<T1>, Task<T2>) tasks)
    {
        await Task.WhenAll(tasks.Item1, tasks.Item2);
        return (await tasks.Item1, await tasks.Item2);
    }
}
```

---

## 6. Avoid async void (MEDIUM)

```csharp
// ❌ BAD: Exceptions won't propagate, can't await
public async void ProcessOrder(Order order)
{
    await _repository.SaveAsync(order);
    throw new Exception("Oops"); // This crashes the app!
}

// ✅ GOOD: Return Task
public async Task ProcessOrderAsync(Order order)
{
    await _repository.SaveAsync(order);
}

// Exception: Event handlers must be async void
button.Click += async (sender, e) =>
{
    await ProcessOrderAsync(order);
};
```

---

## 7. Async Lazy Initialization

```csharp
public class ConfigService
{
    private readonly AsyncLazy<Config> _config;

    public ConfigService(IConfigLoader loader)
    {
        _config = new AsyncLazy<Config>(() => loader.LoadAsync());
    }

    public Task<Config> GetConfigAsync() => _config.Value;
}

// AsyncLazy implementation
public class AsyncLazy<T>
{
    private readonly Lazy<Task<T>> _lazy;
    
    public AsyncLazy(Func<Task<T>> factory)
    {
        _lazy = new Lazy<Task<T>>(factory);
    }
    
    public Task<T> Value => _lazy.Value;
}
```

---

## 8. Semaphore for Throttling

```csharp
public class RateLimitedClient
{
    private readonly SemaphoreSlim _semaphore = new(maxConcurrent: 10);
    private readonly HttpClient _client;

    public async Task<string> GetAsync(string url, CancellationToken ct)
    {
        await _semaphore.WaitAsync(ct);
        try
        {
            return await _client.GetStringAsync(url, ct);
        }
        finally
        {
            _semaphore.Release();
        }
    }
}
```

---

## 9. Timeout Pattern

```csharp
public async Task<T> WithTimeout<T>(Task<T> task, TimeSpan timeout)
{
    using var cts = new CancellationTokenSource();
    var delayTask = Task.Delay(timeout, cts.Token);
    
    var completedTask = await Task.WhenAny(task, delayTask);
    
    if (completedTask == delayTask)
    {
        throw new TimeoutException();
    }
    
    cts.Cancel(); // Cancel the delay
    return await task;
}

// Usage
var result = await WithTimeout(GetDataAsync(), TimeSpan.FromSeconds(30));
```

---

## 10. ASP.NET Core Specific (David Fowler)

### Avoid Synchronous I/O

```csharp
// ❌ BAD: Synchronous read blocks thread pool
public void ProcessRequest(HttpContext context)
{
    using var reader = new StreamReader(context.Request.Body);
    var body = reader.ReadToEnd(); // BLOCKS!
}

// ✅ GOOD: Async read
public async Task ProcessRequest(HttpContext context)
{
    using var reader = new StreamReader(context.Request.Body);
    var body = await reader.ReadToEndAsync();
}
```

### HttpRequest.Form vs ReadFormAsync

```csharp
// ❌ BAD: Synchronous form read
var form = httpContext.Request.Form; // Blocks!

// ✅ GOOD: Async form read
var form = await httpContext.Request.ReadFormAsync();
```

### HttpContext Thread Safety

```csharp
// ❌ BAD: Storing HttpContext in field
public class BadService
{
    private HttpContext _context; // DON'T store HttpContext!
}

// ❌ BAD: Accessing HttpContext from multiple threads
await Task.WhenAll(
    Task.Run(() => DoSomething(httpContext)), // NOT THREAD-SAFE!
    Task.Run(() => DoOther(httpContext))
);

// ❌ BAD: Using HttpContext after request completes
_ = Task.Run(async () =>
{
    await Task.Delay(1000);
    var user = httpContext.User; // Request may be complete!
});

// ✅ GOOD: Extract needed data before background work
var userId = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
_ = Task.Run(async () =>
{
    await Task.Delay(1000);
    await ProcessAsync(userId); // Use extracted data
});
```

### Use Task.FromResult for Cached Data

```csharp
// ❌ BAD: Task.Run for trivial computation
public Task<int> GetCountAsync() => Task.Run(() => _cache.Count);

// ✅ GOOD: Task.FromResult for pre-computed/cached
public Task<int> GetCountAsync() => Task.FromResult(_cache.Count);
```

### Always Await (Don't Elide)

```csharp
// ❌ BAD: Eliding await destroys stack traces
public Task<Data> GetDataAsync()
{
    return _repository.GetAsync(); // Lost stack trace on exception!
}

// ✅ GOOD: Always await
public async Task<Data> GetDataAsync()
{
    return await _repository.GetAsync();
}

// Exception: Pure pass-through with no try/catch/finally/using
public Task<Data> GetDataAsync() => _repository.GetAsync(); // OK if truly pass-through
```

### Dispose CancellationTokenSource

```csharp
// ❌ BAD: CTS not disposed (especially with timeout)
var cts = new CancellationTokenSource(TimeSpan.FromSeconds(30));
await DoWorkAsync(cts.Token);
// Memory leak!

// ✅ GOOD: Always dispose CTS
using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(30));
await DoWorkAsync(cts.Token);
```

---

## 11. Sync Over Async - The ThreadPool Killer (David Fowler)

> [!CAUTION]
> **"Sync over Async" is the #1 cause of ThreadPool starvation.**
> Calling `.Result` or `.Wait()` blocks a thread *and* needs a second thread to complete the task.

### The Math of Starvation
- **Scenario:** 50 requests/sec, service takes 1 second.
- **Async Implementation:** Uses ~1 thread (swapping tasks). High throughput.
- **Sync over Async:** Uses **2 threads per request** (1 blocked, 1 working).
- **Result:** ThreadPool limits reached instantly. Latency spikes, 503 errors.

### Detect It
Check `ThreadPool.GetAvailableThreads()`. if available < max, you have starvation.

### Fix It
1. **Top-Down:** Make controllers async first.
2. **Bottom-Up:** Replace sync I/O with async I/O.
3. **No Cheating:** Never use `.Result` even "just this once".

---

## 12. Do Not "Elide" Await

> [!WARNING]
> Returning a Task directly instead of `await` destroys the stack trace.

```csharp
// ❌ BAD: Returns Task directly (Optimization?)
public Task<User> GetUserAsync(int id)
{
    return _repo.GetUserAsync(id); // If this throws, stack trace points here, not inside _repo!
}

// ✅ GOOD: Always await
public async Task<User> GetUserAsync(int id)
{
    return await _repo.GetUserAsync(id); // Preserves full stack trace
}
```

**Exception:** You can elide await ONLY if:
1. It's a simple pass-through.
2. You are NOT inside a `using` block (disposal happens too early!).
3. You are NOT inside a `try/catch` block (exception bypasses catch!).

---

## Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| Sync over async (.Result) | Use `await` all the way up |
| Eliding await | Always `await` to potential exceptions |
| Async void | Return `Task` |
| Missing CancellationToken | Propagate `ct` to all methods |
| Sequential independent calls | Use Task.WhenAll |
| Forgetting ConfigureAwait in libs | Add .ConfigureAwait(false) |
| Not handling OperationCanceledException | Catch and handle gracefully |
| Not disposing CancellationTokenSource | Use `using` statement |
| Eliding await | Always await unless pure pass-through |
| Storing HttpContext in fields | Extract data, don't store context |
| Synchronous I/O in ASP.NET Core | Use async overloads always |
