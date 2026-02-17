# Event Sourcing with Wolverine

**Source:** Jeremy D. Miller (Creator of Wolverine & Marten)  
**Best for:** Complex domains, audit logging, "time-travel" debugging

> [!TIP]
> **"Decider Pattern"** - Separate the *decision* (pure logic) from the *effect* (state change).

## 1. The Decider Pattern

Instead of "State + Command => New State", think "State + Command => Events".

```csharp
public static class OrderLogic
{
    // Pure function! No DB, no side effects.
    // Easy to unit test with simple inputs/outputs.
    public static IEnumerable<object> Decide(Order state, ShipOrder command)
    {
        if (state.IsShipped)
            throw new DomainException("Already shipped");
            
        yield return new OrderShipped { ShippedAt = command.ShippedAt };
        
        if (state.Total > 1000)
            yield return new HighValueOrderShipped();
    }
    
    // Apply event to rebuild state
    public static Order Apply(Order state, OrderShipped @event)
    {
        state.IsShipped = true;
        state.ShippedAt = @event.ShippedAt;
        return state;
    }
}
```

## 2. Wolverine Aggregate Handler

Wolverine + Marten automates the "Load -> Decide -> Append" cycle.

```csharp
public static class ShipOrderHandler
{
    // Wolverine automatically:
    // 1. Loads 'Order' aggregate from Marten (using command.OrderId)
    // 2. Calls this method
    // 3. Takes returned events and appends to stream
    // 4. Saves changes
    [Wolverine.AggregateHandler]
    public static IEnumerable<object> Handle(ShipOrder command, Order aggregate)
    {
        return OrderLogic.Decide(aggregate, command);
    }
}
```

## 3. Compound Handlers (A-Frame Architecture)

Break handlers into "Load", "Validate", and "Handle" phases. Wolverine pipelines them.

```csharp
public static class CreateOrderMiddleware
{
    // Phase 1: Load related data
    public static async Task<Product> LoadAsync(CreateOrder cmd, IDocumentSession session)
    {
        return await session.LoadAsync<Product>(cmd.ProductId);
    }
    
    // Phase 2: Validate (Pure logic if possible)
    public static void Validate(CreateOrder cmd, Product product)
    {
        if (product.Stock < cmd.Quantity)
             throw new DomainException("Out of stock");
    }
    
    // Phase 3: Handle (The core logic)
    public static OrderCreated Handle(CreateOrder cmd, Product product)
    {
        return new OrderCreated(cmd.OrderId, product.Price * cmd.Quantity);
    }
}
```

**Why?**
- **Testability:** You can unit test `Validate` and `Handle` without mocking the DB.
- **Readability:** Distinct phases of execution.
- **Performance:** Wolverine compiles this into efficient code.

## Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| Side effects in Decider | KEEP IT PURE. No DB calls, no HTTP. |
| Huge Aggregates | Keep streams short. Use "Snapshotting" if needed. |
| Event Schema Changes | Use "Upcasting" in Marten to handle versioning. |
| Querying Event Streams | Don't. Project to Read Models (Projections). |
