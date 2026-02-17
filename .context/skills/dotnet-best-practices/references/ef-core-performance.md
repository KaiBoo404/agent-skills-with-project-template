# Entity Framework Core Performance

**Source:** Julie Lerman (EF Core expert, Pluralsight author) & Community  
**Best for:** Data access optimization, DDD integration, production queries

> [!TIP]
> **"EF Core is a mapper between your domain and the database."** Design your domain first, then configure EF Core to match. — Julie Lerman

## Rule Summary

| Rule | Impact | Description |
|------|--------|-------------|
| `ef-notracking` | CRITICAL | Use `.AsNoTracking()` for read-only queries |
| `ef-projection` | CRITICAL | Use `.Select()` to fetch only needed columns |
| `ef-n+1` | CRITICAL | Prevent N+1 with `.Include()` or projection |
| `ef-batch` | HIGH | Use `AddRange()`, single `SaveChanges()` |
| `ef-split-query` | HIGH | Use `.AsSplitQuery()` for complex includes |
| `ef-ddd-mapping` | HIGH | Configure EF to respect aggregate boundaries |
| `ef-compiled` | MEDIUM | Compiled queries for hot paths |
| `ef-global-notracking` | MEDIUM | Configure read-heavy apps globally |

---

## 1. AsNoTracking (CRITICAL)

```csharp
// ❌ BAD: Tracks all entities (memory + CPU overhead)
var orders = await _context.Orders.ToListAsync();

// ✅ GOOD: No change tracking for read-only queries
var orders = await _context.Orders
    .AsNoTracking()
    .ToListAsync();

// ✅ BETTER: Global configuration for read-heavy apps
protected override void OnConfiguring(DbContextOptionsBuilder options)
{
    options.UseQueryTrackingBehavior(QueryTrackingBehavior.NoTracking);
}
```

**When to use:**
- List endpoints
- Dashboard queries
- Reports
- Any query where you don't call `SaveChanges()`

---

## 2. Projections (CRITICAL)

```csharp
// ❌ BAD: Fetches ALL columns, ALL navigation properties
var customer = await _context.Customers
    .Include(c => c.Orders)
    .FirstOrDefaultAsync(c => c.Id == id);
return new CustomerDto { Name = customer.Name, OrderCount = customer.Orders.Count };

// ✅ GOOD: Fetches only needed data
var customer = await _context.Customers
    .Where(c => c.Id == id)
    .Select(c => new CustomerDto
    {
        Name = c.Name,
        OrderCount = c.Orders.Count // Computed in SQL
    })
    .FirstOrDefaultAsync();
```

**SQL Generated:**
```sql
-- BAD: SELECT * FROM Customers; SELECT * FROM Orders WHERE CustomerId = @id
-- GOOD: SELECT Name, (SELECT COUNT(*) FROM Orders WHERE CustomerId = c.Id) FROM Customers WHERE Id = @id
```

---

## 3. N+1 Prevention (CRITICAL)

```csharp
// ❌ BAD: N+1 queries (1 for orders + N for customers)
var orders = await _context.Orders.ToListAsync();
foreach (var order in orders)
{
    Console.WriteLine(order.Customer.Name); // Lazy load = extra query per order!
}

// ✅ GOOD: Eager loading with Include
var orders = await _context.Orders
    .Include(o => o.Customer)
    .ToListAsync();

// ✅ BETTER: Projection (no need to load full entities)
var orders = await _context.Orders
    .Select(o => new OrderDto
    {
        Id = o.Id,
        CustomerName = o.Customer.Name,
        Total = o.Total
    })
    .ToListAsync();
```

---

## 4. Batch Operations (HIGH)

```csharp
// ❌ BAD: N database roundtrips
foreach (var item in items)
{
    _context.Products.Add(new Product { Name = item.Name });
    await _context.SaveChangesAsync(); // DON'T save in loop!
}

// ✅ GOOD: Single batch insert
_context.Products.AddRange(items.Select(i => new Product { Name = i.Name }));
await _context.SaveChangesAsync();
```

### Bulk Operations (EF Core 7+)

```csharp
// Bulk update without loading entities
await _context.Products
    .Where(p => p.Category == "Electronics")
    .ExecuteUpdateAsync(p => p.SetProperty(x => x.Price, x => x.Price * 1.1m));

// Bulk delete without loading entities
await _context.Products
    .Where(p => p.IsDiscontinued)
    .ExecuteDeleteAsync();
```

---

## 5. Split Queries (HIGH)

```csharp
// ❌ BAD: Cartesian explosion with multiple includes
var order = await _context.Orders
    .Include(o => o.Items)
    .Include(o => o.Payments)
    .Include(o => o.ShippingHistory)
    .FirstOrDefaultAsync(o => o.Id == id);
// Result: Items × Payments × ShippingHistory rows!

// ✅ GOOD: Split into separate queries
var order = await _context.Orders
    .Include(o => o.Items)
    .Include(o => o.Payments)
    .Include(o => o.ShippingHistory)
    .AsSplitQuery()
    .FirstOrDefaultAsync(o => o.Id == id);
// Result: 3 separate queries, no cartesian explosion
```

---

## 6. Compiled Queries (MEDIUM)

```csharp
// Define once (static)
private static readonly Func<AppDbContext, Guid, Task<Order?>> GetOrderById =
    EF.CompileAsyncQuery((AppDbContext context, Guid id) =>
        context.Orders
            .Include(o => o.Items)
            .FirstOrDefault(o => o.Id == id));

// Use in handler
public async Task<Order?> Handle(GetOrderQuery query, CancellationToken ct)
{
    return await GetOrderById(_context, query.OrderId);
}
```

**When to use:**
- Hot paths (frequently called)
- When profiler shows query compilation overhead

---

## 7. Indexing

```csharp
// Define indexes in OnModelCreating
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    modelBuilder.Entity<Order>(entity =>
    {
        // Single column index
        entity.HasIndex(e => e.CustomerId);
        
        // Composite index
        entity.HasIndex(e => new { e.Status, e.CreatedAt });
        
        // Unique index
        entity.HasIndex(e => e.OrderNumber).IsUnique();
        
        // Filtered index (partial)
        entity.HasIndex(e => e.CreatedAt)
            .HasFilter("[Status] = 'Pending'");
    });
}
```

---

## 8. Pagination

```csharp
// ❌ BAD: Loads all then paginates in memory
var allOrders = await _context.Orders.ToListAsync();
var page = allOrders.Skip(20).Take(10).ToList();

// ✅ GOOD: Pagination in SQL
var orders = await _context.Orders
    .OrderByDescending(o => o.CreatedAt)
    .Skip((pageNumber - 1) * pageSize)
    .Take(pageSize)
    .ToListAsync();
```

---

## 9. DbContext Pooling

```csharp
// Program.cs - Use pooling for high-traffic apps
builder.Services.AddDbContextPool<AppDbContext>(options =>
    options.UseSqlServer(connectionString),
    poolSize: 128); // Default pool size
```

---

## 10. Connection Resiliency

```csharp
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString, sqlOptions =>
    {
        sqlOptions.EnableRetryOnFailure(
            maxRetryCount: 5,
            maxRetryDelay: TimeSpan.FromSeconds(30),
            errorNumbersToAdd: null);
    }));
```

---

## Query Logging (Development)

```csharp
// appsettings.Development.json
{
  "Logging": {
    "LogLevel": {
      "Microsoft.EntityFrameworkCore.Database.Command": "Information"
    }
  }
}
```

---

## 11. EF Core + DDD (Julie Lerman)

### Aggregate Configuration

```csharp
// Configure aggregate root and owned entities
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    modelBuilder.Entity<Order>(entity =>
    {
        entity.HasKey(o => o.Id);
        
        // Value Objects as owned entities
        entity.OwnsOne(o => o.ShippingAddress, address =>
        {
            address.Property(a => a.Street).HasMaxLength(200);
            address.Property(a => a.City).HasMaxLength(100);
        });
        
        // Aggregate boundary - OrderItems belong to Order
        entity.HasMany(o => o.Items)
            .WithOne()
            .OnDelete(DeleteBehavior.Cascade);
            
        // Private collection field mapping
        entity.Navigation(o => o.Items)
            .UsePropertyAccessMode(PropertyAccessMode.Field);
    });
}
```

### Private Setters and Constructor

```csharp
// Domain entity with encapsulation
public class Order
{
    public Guid Id { get; private set; }
    public OrderStatus Status { get; private set; }
    private readonly List<OrderItem> _items = new();
    public IReadOnlyList<OrderItem> Items => _items.AsReadOnly();
    
    private Order() { } // EF Core constructor
    
    public static Order Create(Guid customerId)
    {
        return new Order { Id = Guid.NewGuid(), Status = OrderStatus.Pending };
    }
}

// EF Core configuration
entity.Property(o => o.Status)
    .HasConversion<string>(); // Store enum as string

entity.HasField("_items"); // Map private field
```

### Separate Read Models (CQRS)

```csharp
// Write model: Rich domain entity with EF Core
public class Order { /* full domain logic */ }

// Read model: Simple DTO for queries
public class OrderReadModel
{
    public Guid Id { get; set; }
    public string CustomerName { get; set; }
    public decimal Total { get; set; }
    public string Status { get; set; }
}

// Use Dapper for reads (Julie Lerman recommendation for complex queries)
public async Task<OrderReadModel?> GetOrderAsync(Guid id)
{
    using var conn = _connectionFactory.Create();
    return await conn.QueryFirstOrDefaultAsync<OrderReadModel>(
        "SELECT o.Id, c.Name as CustomerName, o.Total, o.Status " +
        "FROM Orders o JOIN Customers c ON c.Id = o.CustomerId " +
        "WHERE o.Id = @Id", new { Id = id });
}
```

### JSON Columns (EF Core 7+)

```csharp
// Store complex value objects as JSON
public class Order
{
    public Guid Id { get; set; }
    public Money Price { get; set; }  // Complex value object
    public List<string> Tags { get; set; } = new();
}

protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    modelBuilder.Entity<Order>(entity =>
    {
        entity.OwnsOne(o => o.Price, price =>
        {
            price.ToJson();  // Stored as JSON column
        });
        
        entity.Property(o => o.Tags)
            .HasConversion(
                v => JsonSerializer.Serialize(v, (JsonSerializerOptions)null),
                v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions)null)!);
    });
}
```

---

## 12. Compiled Models (Julie Lerman)

**Impact:** Drastically reduces startup time for large models (hundreds of entities).

```bash
# Generate compiled model
dotnet ef dbcontext optimize
```

```csharp
// Use in application
protected override void OnConfiguring(DbContextOptionsBuilder options)
{
    options.UseModel(CompiledModels.AppDbContextModel.Instance);
}
```

**Trade-off:** Must regenerate model on every schema change.

---

## 13. Split Query Risks

> [!WARNING]
> **AsSplitQuery** is great for performance but dangerous for consistency.

**The Risk:** Data consistency (Snapshot Anomaly).
1. Query 1 fetches Orders.
2. *Concurrent update deletes an Item.*
3. Query 2 fetches Items.
4. **Result:** Order exists, but Items are missing/inconsistent.

**Solution:** Use Serializable transactions if consistency is critical, or accept eventual consistency for reports.

---

## Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| Lazy loading in loops | Disable lazy loading, use Include or projection |
| SaveChanges in loops | Batch with AddRange, single SaveChanges |
| Missing indexes | Profile queries, add indexes for filters/joins |
| Split query inconsistency | Be aware of snapshot anomalies |
| Slow startup | Consider Compiled Models for large contexts |
| Loading full entities for DTOs | Use Select projections |
| Not using AsNoTracking | Always use for read-only queries |
| Cartesian explosion | Use AsSplitQuery for multiple includes |
| Exposing entities in API | Return DTOs, not entities |
| Ignoring aggregate boundaries | Configure cascades, owned entities |
