# CQRS Patterns

**Source:** Milan Jovanovic's CQRS implementation patterns  
**Best for:** Applications with different read/write optimization needs

## When to Use CQRS

| Scenario | CQRS | Traditional |
|----------|------|-------------|
| Read-heavy applications | ✅ Yes | Bottleneck |
| Complex queries + simple writes | ✅ Yes | - |
| Different read/write models | ✅ Yes | Awkward |
| Simple CRUD | ❌ No | Simpler |
| Same model for read/write | ❌ No | Sufficient |

---

## Quick Pattern

```csharp
// Command: Changes state, returns ID or Result
public record CreateOrderCommand(Guid CustomerId, List<OrderItemDto> Items) : ICommand<Guid>;

// Query: Reads state, returns DTO
public record GetOrderQuery(Guid OrderId) : IQuery<OrderDto>;
```

---

## Command/Query Interfaces

```csharp
// Marker interfaces
public interface ICommand<TResult> : IRequest<TResult> { }
public interface IQuery<TResult> : IRequest<TResult> { }

// Handler interfaces
public interface ICommandHandler<TCommand, TResult> : IRequestHandler<TCommand, TResult>
    where TCommand : ICommand<TResult> { }

public interface IQueryHandler<TQuery, TResult> : IRequestHandler<TQuery, TResult>
    where TQuery : IQuery<TResult> { }
```

---

## Implementation Patterns

### Pattern 1: MediatR-based (Quick Start)

```csharp
// Program.cs
builder.Services.AddMediatR(cfg => 
    cfg.RegisterServicesFromAssembly(typeof(Program).Assembly));

// Command Handler
public class CreateOrderHandler : IRequestHandler<CreateOrderCommand, Guid>
{
    private readonly AppDbContext _context;
    
    public async Task<Guid> Handle(CreateOrderCommand cmd, CancellationToken ct)
    {
        var order = Order.Create(cmd.CustomerId, cmd.Items);
        _context.Orders.Add(order);
        await _context.SaveChangesAsync(ct);
        return order.Id;
    }
}

// Controller
[HttpPost]
public async Task<ActionResult<Guid>> Create(CreateOrderRequest request)
{
    var orderId = await _sender.Send(new CreateOrderCommand(request.CustomerId, request.Items));
    return CreatedAtAction(nameof(Get), new { id = orderId }, orderId);
}
```

### Pattern 2: Custom Interfaces (No MediatR)

```csharp
// Interfaces
public interface ICommandDispatcher
{
    Task<TResult> DispatchAsync<TResult>(ICommand<TResult> command, CancellationToken ct = default);
}

public interface IQueryDispatcher
{
    Task<TResult> DispatchAsync<TResult>(IQuery<TResult> query, CancellationToken ct = default);
}

// Implementation
public class CommandDispatcher : ICommandDispatcher
{
    private readonly IServiceProvider _provider;
    
    public async Task<TResult> DispatchAsync<TResult>(ICommand<TResult> command, CancellationToken ct)
    {
        var handlerType = typeof(ICommandHandler<,>).MakeGenericType(command.GetType(), typeof(TResult));
        dynamic handler = _provider.GetRequiredService(handlerType);
        return await handler.Handle((dynamic)command, ct);
    }
}

// Registration
builder.Services.AddScoped<ICommandDispatcher, CommandDispatcher>();
builder.Services.AddScoped<IQueryDispatcher, QueryDispatcher>();
builder.Services.Scan(scan => scan
    .FromAssembliesOf(typeof(Program))
    .AddClasses(c => c.AssignableTo(typeof(ICommandHandler<,>)))
    .AsImplementedInterfaces()
    .WithScopedLifetime());
```

---

## Optimized Read/Write Separation

### Commands: EF Core (Rich Domain)

```csharp
public class CreateOrderHandler : ICommandHandler<CreateOrderCommand, Guid>
{
    private readonly AppDbContext _context;
    private readonly IUnitOfWork _unitOfWork;

    public async Task<Guid> Handle(CreateOrderCommand cmd, CancellationToken ct)
    {
        // Use EF Core for commands - change tracking + domain logic
        var customer = await _context.Customers.FindAsync(cmd.CustomerId, ct)
            ?? throw new NotFoundException("Customer not found");
            
        var order = customer.PlaceOrder(cmd.Items); // Domain logic in entity
        
        _context.Orders.Add(order);
        await _unitOfWork.SaveChangesAsync(ct); // Handles domain events
        
        return order.Id;
    }
}
```

### Queries: Dapper (Performance)

```csharp
public class GetOrdersHandler : IQueryHandler<GetOrdersQuery, PagedResult<OrderDto>>
{
    private readonly ISqlConnectionFactory _connectionFactory;

    public async Task<PagedResult<OrderDto>> Handle(GetOrdersQuery query, CancellationToken ct)
    {
        using var connection = _connectionFactory.Create();
        
        const string sql = """
            SELECT o.Id, o.OrderNumber, o.Total, c.Name as CustomerName, o.CreatedAt
            FROM Orders o
            JOIN Customers c ON c.Id = o.CustomerId
            WHERE (@CustomerId IS NULL OR o.CustomerId = @CustomerId)
            ORDER BY o.CreatedAt DESC
            OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;
            
            SELECT COUNT(*) FROM Orders WHERE (@CustomerId IS NULL OR CustomerId = @CustomerId);
            """;

        using var multi = await connection.QueryMultipleAsync(sql, new
        {
            query.CustomerId,
            Offset = (query.Page - 1) * query.PageSize,
            query.PageSize
        });
        
        var items = await multi.ReadAsync<OrderDto>();
        var totalCount = await multi.ReadFirstAsync<int>();
        
        return new PagedResult<OrderDto>(items, totalCount, query.Page, query.PageSize);
    }
}
```

---

## Cross-Cutting Behaviors

```csharp
// Validation
public class ValidationBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
{
    private readonly IEnumerable<IValidator<TRequest>> _validators;

    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken ct)
    {
        if (!_validators.Any()) return await next();
        
        var context = new ValidationContext<TRequest>(request);
        var failures = _validators
            .Select(v => v.Validate(context))
            .SelectMany(r => r.Errors)
            .Where(f => f != null)
            .ToList();

        if (failures.Any())
            throw new ValidationException(failures);

        return await next();
    }
}

// Logging
public class LoggingBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
{
    private readonly ILogger<LoggingBehavior<TRequest, TResponse>> _logger;

    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken ct)
    {
        var requestName = typeof(TRequest).Name;
        _logger.LogInformation("Executing {Request}", requestName);
        
        var stopwatch = Stopwatch.StartNew();
        var response = await next();
        stopwatch.Stop();
        
        _logger.LogInformation("Executed {Request} in {ElapsedMs}ms", requestName, stopwatch.ElapsedMilliseconds);
        return response;
    }
}
```

---

## 8. The Outbox Pattern (Reliable Messaging)

**Problem:** "Dual Write" - Saving to DB and publishing to Bus are two separate operations. If one fails, system is inconsistent.

**Solution:** Save message to DB *in the same transaction* as the entity.

```csharp
// 1. Transaction starts
using var transaction = _context.Database.BeginTransaction();

// 2. Save Entity
_context.Orders.Add(order);

// 3. Save Outbox Message (instead of publishing directly)
var outboxMessage = new OutboxMessage
{
    Id = Guid.NewGuid(),
    Type = "OrderCreated",
    Content = JsonSerializer.Serialize(new OrderCreatedEvent(order.Id)),
    OccurredOnUtc = DateTime.UtcNow
};
_context.OutboxMessages.Add(outboxMessage);

// 4. Commit (Atomic)
await _context.SaveChangesAsync();
await transaction.CommitAsync();

// 5. Background worker processes OutboxMessages -> Bus
```

**Tip:** Use Quartz.NET or MassTransit's built-in Outbox for implementation.

---

## Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| Dual Write issues | Use Outbox Pattern |
| Queries modifying state | Queries must be side-effect free |
| Commands returning data | Return only ID or Result, not DTOs |
| Using EF for complex queries | Use Dapper for reporting/dashboards |
| One handler per endpoint | One handler per use case (can be reused) |
| Not validating commands | Add validation behavior pipeline |
```
