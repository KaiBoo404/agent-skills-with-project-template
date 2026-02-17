# Distributed Systems & Resilience

**Source:** Dr. Milan Milanovic  
**Best for:** Microservices, Cloud-Native Apps, Breaking "Distributed Monoliths"

> [!CAUTION]
> **"A Distributed Monolith is the worst of both worlds."**
> You get the complexity of microservices with the tight coupling of a monolith.

## 1. Anti-Pattern: The Distributed Monolith

**Signs you have one:**
1. **Chatty Services:** Service A calls B, which calls C, just to return data to A.
2. **Shared Database:** Multiple services reading/writing the same usage tables.
3. **Lockstep Deployment:** "We have to deploy Service A and B together."
4. **Cascading Failures:** A fails -> B fails -> C fails.

**Solution:**
- **Decouple:** Use Async Messaging (Events) instead of Sync HTTP where possible.
- **Data Ownership:** Each service OWNS its data. Others must ask (API) or listen (Events).
- **Versioning:** Contracts must be backward compatible.

## 2. Resilience with Polly

Don't just "retry". Be smart about failure.

### The "Retry Storm" Risk
If Service B is overloaded and Service A retries aggressively, Service B will crash harder.

**Correct Strategy:**
1. **Exponential Backoff:** Wait 1s, then 2s, then 4s, etc.
2. **Jitter:** Add random noise so all instances don't retry at the exact same millisecond.
3. **Circuit Breaker:** Stop calling if failures > 50%. Give it time to recover.

### .NET 8+ Resilience Pipeline

```csharp
// Define a standard pipeline
services.AddResiliencePipeline("default-api", builder =>
{
    builder
        .AddRetry(new RetryStrategyOptions
        {
            MaxRetryAttempts = 3,
            BackoffType = DelayBackoffType.Exponential, // Wait longer each time
            UseJitter = true, // Prevent synchronized retries
            Delay = TimeSpan.FromSeconds(2)
        })
        .AddCircuitBreaker(new CircuitBreakerStrategyOptions
        {
            SamplingDuration = TimeSpan.FromSeconds(10),
            FailureRatio = 0.5, // Break if 50% fail
            MinimumThroughput = 10 // ...and at least 10 requests
        })
        .AddTimeout(TimeSpan.FromSeconds(5)); // Total timeout
});

// Use in HttpClient
services.AddHttpClient("MyClient")
    .AddResilienceHandler("base-handler", builder => 
    {
        // Use the pre-configured pipeline
        builder.AddPipeline("default-api");
    });
```

## 3. Bulkhead Isolation

Prevent one slow downstream service from eating all your threads.

```csharp
// Limit concurrent calls to "Service X" to 10.
// If 11th request comes, it fails FAST (or queues) instead of blocking a thread forever.
builder.AddBulkhead(new BulkheadStrategyOptions
{
    MaxConcurrency = 10,
    MaxQueueSize = 50
});
```

## Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| Retrying 404/400 errors | Only retry 5xx or network errors (Transient) |
| Infinite retries | Set a max count (e.g., 3) |
| No timeout | Always set a timeout (shorter than caller's timeout) |
| Synchronous chains | Use async messaging (Outbox/Inbox) |
| Shared DB | Split schema per service |
