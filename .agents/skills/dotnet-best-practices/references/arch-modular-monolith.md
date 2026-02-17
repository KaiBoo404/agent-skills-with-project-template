# Modular Monolith Architecture

**Source:** Julio Casal's Modular Monolith patterns  
**Best for:** Large teams (5+), enterprise applications, future microservices migration

## When to Use Modular Monolith

| Scenario | Modular Monolith | Alternative |
|----------|-----------------|-------------|
| 5+ developers | ✅ Yes | - |
| Multiple business domains | ✅ Yes | - |
| Need for future microservices | ✅ Yes | - |
| Simple CRUD | ❌ No | Simple Layered |
| Small team (1-3) | ❌ No | Clean Architecture |

> [!TIP]
> **Modular Monolith = Microservices benefits without operational complexity.** Deploy as one, evolve modules independently.

---

## Quick Structure

```
src/
├── Modules/
│   ├── Catalog/                    # Module 1
│   │   ├── Catalog.Domain/
│   │   ├── Catalog.Application/
│   │   ├── Catalog.Infrastructure/
│   │   ├── Catalog.Contracts/      # Public API for other modules
│   │   └── Catalog.Api/
│   ├── Orders/                     # Module 2
│   │   ├── Orders.Domain/
│   │   ├── Orders.Application/
│   │   ├── Orders.Infrastructure/
│   │   ├── Orders.Contracts/
│   │   └── Orders.Api/
│   └── Notifications/              # Module 3
│       └── ...
├── Shared/
│   ├── Shared.Kernel/              # Base entities, interfaces
│   └── Shared.Infrastructure/      # Common infra (messaging, logging)
└── Host/
    └── Api/                        # Single host, composes all modules
```

---

## Key Principles

### 1. Module Independence

Each module owns its:
- **Domain logic** - Business rules isolated per bounded context
- **Database schema** - Separate schema or database per module
- **API contracts** - What it exposes to other modules

```csharp
// ❌ BAD: Direct cross-module database access
public class OrderService
{
    private readonly CatalogDbContext _catalogDb; // Don't access other module's DB!
}

// ✅ GOOD: Use contracts/integration services
public class OrderService
{
    private readonly ICatalogIntegrationService _catalog; // Interface from Catalog.Contracts
}
```

### 2. Module Communication

**Option A: Synchronous (integration services)**
```csharp
// Catalog.Contracts/ICatalogIntegrationService.cs
public interface ICatalogIntegrationService
{
    Task<ProductDto?> GetProductByIdAsync(Guid productId, CancellationToken ct);
    Task<bool> ReserveStockAsync(Guid productId, int quantity, CancellationToken ct);
}

// Catalog.Infrastructure/CatalogIntegrationService.cs
public class CatalogIntegrationService : ICatalogIntegrationService
{
    private readonly CatalogDbContext _context;
    
    public async Task<ProductDto?> GetProductByIdAsync(Guid productId, CancellationToken ct)
    {
        return await _context.Products
            .AsNoTracking()
            .Where(p => p.Id == productId)
            .Select(p => new ProductDto(p.Id, p.Name, p.Price, p.Stock))
            .FirstOrDefaultAsync(ct);
    }
}

// Orders module uses it
public class CreateOrderHandler
{
    private readonly ICatalogIntegrationService _catalog;
    
    public async Task Handle(CreateOrderCommand cmd, CancellationToken ct)
    {
        var product = await _catalog.GetProductByIdAsync(cmd.ProductId, ct);
        if (product is null) throw new NotFoundException("Product not found");
        
        var reserved = await _catalog.ReserveStockAsync(cmd.ProductId, cmd.Quantity, ct);
        if (!reserved) throw new DomainException("Insufficient stock");
        
        // Create order...
    }
}
```

**Option B: Async (integration events)**
```csharp
// Shared.Kernel/IIntegrationEvent.cs
public interface IIntegrationEvent
{
    Guid Id { get; }
    DateTime OccurredAt { get; }
}

// Orders.Contracts/Events/OrderConfirmedIntegrationEvent.cs
public record OrderConfirmedIntegrationEvent(
    Guid OrderId,
    Guid CustomerId,
    decimal TotalAmount) : IIntegrationEvent
{
    public Guid Id { get; } = Guid.NewGuid();
    public DateTime OccurredAt { get; } = DateTime.UtcNow;
}

// Orders module publishes
public class ConfirmOrderHandler
{
    private readonly IIntegrationEventPublisher _publisher;
    
    public async Task Handle(ConfirmOrderCommand cmd, CancellationToken ct)
    {
        // Confirm order...
        
        await _publisher.PublishAsync(new OrderConfirmedIntegrationEvent(
            order.Id, order.CustomerId, order.Total), ct);
    }
}

// Notifications module handles
public class OrderConfirmedHandler : IIntegrationEventHandler<OrderConfirmedIntegrationEvent>
{
    private readonly IEmailService _email;
    
    public async Task Handle(OrderConfirmedIntegrationEvent @event, CancellationToken ct)
    {
        await _email.SendOrderConfirmationAsync(@event.CustomerId, @event.OrderId);
    }
}
```

### 3. Separate Database Schemas

```csharp
// Each module has its own DbContext
public class CatalogDbContext : DbContext
{
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("catalog");
        // ...
    }
}

public class OrdersDbContext : DbContext
{
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("orders");
        // ...
    }
}
```

---

## Module Registration

```csharp
// Catalog.Api/CatalogModule.cs
public static class CatalogModule
{
    public static IServiceCollection AddCatalogModule(
        this IServiceCollection services, 
        IConfiguration configuration)
    {
        services.AddDbContext<CatalogDbContext>(options =>
            options.UseSqlServer(configuration.GetConnectionString("Catalog")));
            
        services.AddScoped<ICatalogIntegrationService, CatalogIntegrationService>();
        services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(CatalogModule).Assembly));
        
        return services;
    }
    
    public static IEndpointRouteBuilder MapCatalogEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("api/catalog").WithTags("Catalog");
        
        group.MapGet("products", GetProducts);
        group.MapGet("products/{id:guid}", GetProductById);
        group.MapPost("products", CreateProduct);
        
        return app;
    }
}

// Host/Api/Program.cs
var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddCatalogModule(builder.Configuration)
    .AddOrdersModule(builder.Configuration)
    .AddNotificationsModule(builder.Configuration);

var app = builder.Build();

app.MapCatalogEndpoints();
app.MapOrdersEndpoints();
app.MapNotificationsEndpoints();

app.Run();
```

---

## 4. Communication Between Modules

**Rule:** Modules cannot access each other's databases or internal classes.

### Option A: Public Interface (Synchoronous)
Best for read-only data or simple commands.

```csharp
// In Modules/Catalog/PublicApi/ICatalogService.cs
public interface ICatalogService
{
    Task<ProductDto?> GetProductAsync(Guid id);
}

// In Modules/Orders (Injecting the interface)
public class CreateOrderHandler(ICatalogService catalog)
{
    public async Task Handle(...)
    {
        var product = await catalog.GetProductAsync(id); // Direct call
    }
}
```

### Option B: Domain Events (Asynchronous/Decoupled)
Best for side effects (e.g., "When Order Placed, Reduce Stock").

1. **Order Module** publishes `OrderPlacedEvent` (integration event).
2. **Catalog Module** subscribes to `OrderPlacedEvent`.
3. **Execution:** Can be in-memory (MediatR) or distinct process (RabbitMQ) depending on scale.

### Contracts (Sharing)
Do **NOT** share "Domain Entities" between modules.
**DO** share "Integration Events" or "Public DTOs" in a `Shared.Contracts` project (or inside the PublicApi folder of the module).

---

## Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| Shared Database Tables | Each module owns its schema (Schema per module) |
| Leaking Domain Objects | Return strict DTOs from Public API |
| Circular Dependencies | Use Events or refactor boundaries |
| Massive "Shared" Kernel | Keep shared code minimal (contracts only) |
| Single DbContext for all modules | Separate DbContext per module |
| Tight coupling via shared DB tables | Module owns its tables exclusively |
| Not versioning contracts | Version integration events and DTOs |

---

## Migration Path to Microservices

When a module needs independent scaling:

1. **Extract module** - Module already has clear boundaries
2. **Replace integration service** - Swap in-process call with HTTP/gRPC
3. **Replace integration events** - Swap in-memory bus with message broker (RabbitMQ/Kafka)
4. **Deploy independently** - Module becomes a microservice

```csharp
// Before: In-process
public class CatalogIntegrationService : ICatalogIntegrationService
{
    private readonly CatalogDbContext _context;
    // Direct DB access
}

// After: HTTP client
public class CatalogHttpClient : ICatalogIntegrationService
{
    private readonly HttpClient _http;
    
    public async Task<ProductDto?> GetProductByIdAsync(Guid id, CancellationToken ct)
    {
        return await _http.GetFromJsonAsync<ProductDto>($"api/products/{id}", ct);
    }
}
```
