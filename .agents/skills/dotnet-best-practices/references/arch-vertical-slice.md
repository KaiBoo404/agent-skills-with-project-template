# Vertical Slice Architecture

**Source:** Jeremy D. Miller (Wolverine/Marten creator)  
**Best for:** Rapid development, simple-to-medium complexity, pragmatic teams

> [!TIP]
> **"Vertical Slice = organizing code by feature, not by technical layer."** Keep related code together. — Jeremy D. Miller

## When to Use Vertical Slice

| Scenario | Vertical Slice | Alternative |
|----------|---------------|-------------|
| Rapid development needed | ✅ Yes | - |
| Simple-medium complexity | ✅ Yes | - |
| Feature-focused teams | ✅ Yes | - |
| Complex domain rules | Consider | Clean Architecture |
| Shared domain logic | Consider | Clean Architecture |

---

## Core Philosophy

### Traditional Layered (Horizontal)
```
Controllers/
    ProductController.cs
    OrderController.cs
Services/
    ProductService.cs
    OrderService.cs
Repositories/
    ProductRepository.cs
    OrderRepository.cs
```

### Vertical Slice (Feature-focused)
```
Features/
    Products/
        CreateProduct.cs      # Handler + Request + Response
        GetProduct.cs
        UpdateProduct.cs
    Orders/
        CreateOrder.cs
        GetOrder.cs
        CancelOrder.cs
```

---

## Quick Pattern

Each "slice" contains everything it needs:

```csharp
// Features/Products/CreateProduct.cs
public static class CreateProduct
{
    // Request
    public record Command(string Name, decimal Price, Guid CategoryId);
    
    // Response
    public record Result(Guid Id, string Name);
    
    // Validator
    public class Validator : AbstractValidator<Command>
    {
        public Validator()
        {
            RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
            RuleFor(x => x.Price).GreaterThan(0);
        }
    }
    
    // Handler
    public class Handler : IRequestHandler<Command, Result>
    {
        private readonly AppDbContext _db;
        
        public Handler(AppDbContext db) => _db = db;
        
        public async Task<Result> Handle(Command cmd, CancellationToken ct)
        {
            var product = new Product
            {
                Id = Guid.NewGuid(),
                Name = cmd.Name,
                Price = cmd.Price,
                CategoryId = cmd.CategoryId
            };
            
            _db.Products.Add(product);
            await _db.SaveChangesAsync(ct);
            
            return new Result(product.Id, product.Name);
        }
    }
}

// Endpoint (Minimal API)
app.MapPost("/api/products", async (CreateProduct.Command cmd, ISender sender) 
    => Results.Created($"/api/products/{(await sender.Send(cmd)).Id}", await sender.Send(cmd)));
```

---

## Wolverine Implementation

Jeremy D. Miller's Wolverine takes vertical slices further with zero-ceremony handlers:

```csharp
// Features/Products/CreateProduct.cs - Wolverine style
public record CreateProductCommand(string Name, decimal Price);
public record ProductCreated(Guid Id, string Name);

// Handler is just a static method - no interfaces!
public static class CreateProductHandler
{
    public static async Task<ProductCreated> Handle(
        CreateProductCommand command,
        AppDbContext db,
        CancellationToken ct)
    {
        var product = new Product
        {
            Id = Guid.NewGuid(),
            Name = command.Name,
            Price = command.Price
        };
        
        db.Products.Add(product);
        await db.SaveChangesAsync(ct);
        
        return new ProductCreated(product.Id, product.Name);
    }
}

// Wolverine HTTP endpoint
public static class ProductEndpoints
{
    [WolverinePost("/api/products")]
    public static Task<ProductCreated> Create(CreateProductCommand command, IMessageBus bus)
        => bus.InvokeAsync<ProductCreated>(command);
}
```

---

## Key Principles (Jeremy D. Miller)

### 1. Co-locate Related Code

```csharp
// ❌ BAD: Related code scattered
Controllers/ProductController.cs    // 500 lines away
Services/ProductService.cs          // Different folder
Validators/CreateProductValidator.cs // Another folder
DTOs/CreateProductRequest.cs        // Yet another

// ✅ GOOD: Everything together
Features/Products/CreateProduct.cs  // All in one place
```

### 2. Skip Unnecessary Abstractions

```csharp
// ❌ BAD: Repository abstraction that adds no value
public interface IProductRepository
{
    Task<Product> GetByIdAsync(Guid id);
    void Add(Product product);
}

public class ProductRepository : IProductRepository
{
    private readonly AppDbContext _db;
    public Task<Product> GetByIdAsync(Guid id) => _db.Products.FindAsync(id);
    public void Add(Product product) => _db.Products.Add(product);
}

// ✅ GOOD: Use DbContext directly in handlers
public class Handler
{
    private readonly AppDbContext _db;
    
    public async Task Handle(Command cmd, CancellationToken ct)
    {
        var product = await _db.Products.FindAsync(cmd.Id);
        // Direct, simple, testable
    }
}
```

### 3. Isolated Testing

```csharp
// Each slice is easily testable in isolation
public class CreateProductTests
{
    [Fact]
    public async Task Handle_ValidCommand_CreatesProduct()
    {
        // Arrange
        var db = CreateInMemoryDb();
        var handler = new CreateProduct.Handler(db);
        var command = new CreateProduct.Command("Widget", 9.99m, categoryId);
        
        // Act
        var result = await handler.Handle(command, CancellationToken.None);
        
        // Assert
        result.Id.Should().NotBeEmpty();
        db.Products.Should().ContainSingle(p => p.Name == "Widget");
    }
}
```

---

## Folder Structure

```
src/
├── Features/
│   ├── Products/
│   │   ├── CreateProduct.cs
│   │   ├── GetProduct.cs
│   │   ├── UpdateProduct.cs
│   │   ├── DeleteProduct.cs
│   │   └── ListProducts.cs
│   ├── Orders/
│   │   ├── CreateOrder.cs
│   │   ├── GetOrder.cs
│   │   └── CancelOrder.cs
│   └── _Shared/              # Truly shared code only
│       └── PagedResult.cs
├── Domain/                    # Optional: Rich domain if needed
│   └── Product.cs
├── Infrastructure/
│   └── AppDbContext.cs
└── Program.cs
```

---

## When to Extract Shared Code

Only extract when:
- Used by 3+ slices
- Truly the same behavior (not just similar)
- Stable and unlikely to diverge

```csharp
// Features/_Shared/PagedResult.cs
public record PagedResult<T>(
    IEnumerable<T> Items,
    int TotalCount,
    int Page,
    int PageSize);
```

---

## Vertical Slice vs Clean Architecture

| Aspect | Vertical Slice | Clean Architecture |
|--------|---------------|-------------------|
| Code organization | By feature | By technical layer |
| Abstractions | Minimal | Many interfaces |
| Learning curve | Low | Higher |
| Rapid development | Excellent | Slower |
| Complex domain | Harder | Natural fit |
| Team scaling | Feature teams | Layer teams |

---

## Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| Duplicating code across slices | Extract only after 3+ usages |
| Making slices too big | One handler = one use case |
| Premature abstraction | Start concrete, abstract later |
| Ignoring shared domain rules | Extract to Domain layer when needed |
