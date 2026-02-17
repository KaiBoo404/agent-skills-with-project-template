# Clean Architecture

**Source:** Milan Jovanovic's Pragmatic Clean Architecture  
**Best for:** Medium complexity projects, teams of 2-5, complex domain logic

## When to Use Clean Architecture

| Scenario | Clean Architecture | Alternative |
|----------|-------------------|-------------|
| Complex business rules | ✅ Yes | - |
| Multiple integrations | ✅ Yes | - |
| Team 2-5 developers | ✅ Yes | - |
| Simple CRUD app | ❌ No | Simple Layered |
| 10+ developers | Consider | Modular Monolith |

---

## Quick Structure

```
src/
├── Domain/                # Entities, Value Objects, Domain Events, Interfaces
│   ├── Entities/
│   ├── ValueObjects/
│   ├── Events/
│   └── Repositories/      # Interfaces only
├── Application/           # Use Cases, Commands, Queries, DTOs
│   ├── Commands/
│   ├── Queries/
│   ├── Behaviors/         # Cross-cutting (validation, logging)
│   └── Interfaces/        # External service interfaces
├── Infrastructure/        # EF Core, External Services, Repositories
│   ├── Persistence/
│   ├── Services/
│   └── DependencyInjection.cs
└── Presentation/          # Controllers, Minimal APIs
    └── Controllers/
```

**Dependency Rule:** Dependencies flow inward. Domain has no dependencies. Outer layers depend on inner layers.

```
Presentation → Application → Domain
      ↓              ↓
Infrastructure ────────┘
```

---

## Quick Pattern

### Domain Layer (Core)

```csharp
// Entity with encapsulated behavior
public class Order : Entity
{
    private readonly List<OrderItem> _items = new();
    
    public Guid CustomerId { get; private set; }
    public OrderStatus Status { get; private set; }
    public Money TotalAmount { get; private set; }
    public IReadOnlyList<OrderItem> Items => _items.AsReadOnly();

    private Order() { } // EF Core

    public static Order Create(Guid customerId)
    {
        var order = new Order
        {
            Id = Guid.NewGuid(),
            CustomerId = customerId,
            Status = OrderStatus.Pending,
            TotalAmount = Money.Zero
        };
        
        order.RaiseDomainEvent(new OrderCreatedEvent(order.Id));
        return order;
    }

    public void AddItem(Guid productId, int quantity, Money price)
    {
        if (Status != OrderStatus.Pending)
            throw new DomainException("Cannot modify confirmed order");
            
        var item = new OrderItem(productId, quantity, price);
        _items.Add(item);
        RecalculateTotal();
    }

    public void Confirm()
    {
        if (!_items.Any())
            throw new DomainException("Cannot confirm empty order");
            
        Status = OrderStatus.Confirmed;
        RaiseDomainEvent(new OrderConfirmedEvent(Id));
    }

    private void RecalculateTotal()
    {
        TotalAmount = _items.Aggregate(Money.Zero, (sum, item) => sum + item.Total);
    }
}

// Value Object (immutable)
public record Money(decimal Amount, string Currency)
{
    public static Money Zero => new(0, "USD");
    
    public static Money operator +(Money a, Money b)
    {
        if (a.Currency != b.Currency)
            throw new DomainException("Currency mismatch");
        return new Money(a.Amount + b.Amount, a.Currency);
    }
}

// Domain Event
public record OrderCreatedEvent(Guid OrderId) : IDomainEvent;
```

### Application Layer (Use Cases)

```csharp
// Command
public record CreateOrderCommand(Guid CustomerId, List<OrderItemDto> Items) : ICommand<Guid>;

// Command Handler
public class CreateOrderCommandHandler : ICommandHandler<CreateOrderCommand, Guid>
{
    private readonly IOrderRepository _orderRepository;
    private readonly IProductRepository _productRepository;
    private readonly IUnitOfWork _unitOfWork;

    public CreateOrderCommandHandler(
        IOrderRepository orderRepository,
        IProductRepository productRepository,
        IUnitOfWork unitOfWork)
    {
        _orderRepository = orderRepository;
        _productRepository = productRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Guid> Handle(CreateOrderCommand command, CancellationToken ct)
    {
        var order = Order.Create(command.CustomerId);
        
        foreach (var item in command.Items)
        {
            var product = await _productRepository.GetByIdAsync(item.ProductId, ct)
                ?? throw new NotFoundException($"Product {item.ProductId} not found");
                
            order.AddItem(product.Id, item.Quantity, product.Price);
        }
        
        _orderRepository.Add(order);
        await _unitOfWork.SaveChangesAsync(ct);
        
        return order.Id;
    }
}

// Query (separate from commands)
public record GetOrderQuery(Guid OrderId) : IQuery<OrderDto>;

public class GetOrderQueryHandler : IQueryHandler<GetOrderQuery, OrderDto>
{
    private readonly IOrderReadRepository _repository;

    public async Task<OrderDto> Handle(GetOrderQuery query, CancellationToken ct)
    {
        return await _repository.GetByIdAsync(query.OrderId, ct)
            ?? throw new NotFoundException($"Order {query.OrderId} not found");
    }
}
```

### Infrastructure Layer

```csharp
// Repository Implementation
public class OrderRepository : IOrderRepository
{
    private readonly AppDbContext _context;

    public OrderRepository(AppDbContext context) => _context = context;

    public async Task<Order?> GetByIdAsync(Guid id, CancellationToken ct)
    {
        return await _context.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == id, ct);
    }

    public void Add(Order order) => _context.Orders.Add(order);
}

// Read Repository (optimized for queries)
public class OrderReadRepository : IOrderReadRepository
{
    private readonly ISqlConnectionFactory _connectionFactory;

    public async Task<OrderDto?> GetByIdAsync(Guid id, CancellationToken ct)
    {
        using var connection = _connectionFactory.Create();
        
        const string sql = """
            SELECT o.Id, o.CustomerId, o.Status, o.TotalAmount
            FROM Orders o
            WHERE o.Id = @Id
            """;
            
        return await connection.QueryFirstOrDefaultAsync<OrderDto>(sql, new { Id = id });
    }
}
```

### Presentation Layer

```csharp
[ApiController]
[Route("api/orders")]
public class OrdersController : ControllerBase
{
    private readonly ISender _sender;

    public OrdersController(ISender sender) => _sender = sender;

    [HttpPost]
    public async Task<ActionResult<Guid>> Create(CreateOrderRequest request, CancellationToken ct)
    {
        var command = new CreateOrderCommand(request.CustomerId, request.Items);
        var orderId = await _sender.Send(command, ct);
        return CreatedAtAction(nameof(Get), new { id = orderId }, orderId);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<OrderDto>> Get(Guid id, CancellationToken ct)
    {
        var order = await _sender.Send(new GetOrderQuery(id), ct);
        return Ok(order);
    }
}
```

---

## Cross-Cutting Concerns (Behaviors)

```csharp
// Validation Behavior
public class ValidationBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    private readonly IEnumerable<IValidator<TRequest>> _validators;

    public ValidationBehavior(IEnumerable<IValidator<TRequest>> validators)
        => _validators = validators;

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken ct)
    {
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

// Logging Behavior  
public class LoggingBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    private readonly ILogger<LoggingBehavior<TRequest, TResponse>> _logger;

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken ct)
    {
        var requestName = typeof(TRequest).Name;
        _logger.LogInformation("Handling {RequestName}", requestName);
        
        var response = await next();
        
        _logger.LogInformation("Handled {RequestName}", requestName);
        return response;
    }
}
```

---

## Production Optimization

```csharp
// Outbox Pattern for reliable messaging
public class Order : Entity
{
    public void Confirm()
    {
        Status = OrderStatus.Confirmed;
        
        // Domain event stored in outbox, processed async
        RaiseDomainEvent(new OrderConfirmedEvent(Id));
    }
}

// Outbox saves events with entity changes (atomic)
public class UnitOfWork : IUnitOfWork
{
    public async Task SaveChangesAsync(CancellationToken ct)
    {
        // Collect domain events from entities
        var events = _context.ChangeTracker
            .Entries<Entity>()
            .SelectMany(e => e.Entity.DomainEvents)
            .ToList();
            
        // Save to outbox table
        foreach (var @event in events)
            _context.OutboxMessages.Add(OutboxMessage.Create(@event));
            
        await _context.SaveChangesAsync(ct);
    }
}
```
