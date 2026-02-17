# Simple API / Traditional Layered Architecture

**Best for:** MVPs, internal tools, small teams (1-2 developers), POCs, CRUD-heavy applications

## When to Use Simple Architecture

| Scenario | Use Simple | Consider Clean |
|----------|------------|----------------|
| Team size 1-2 | ✅ Yes | Overkill |
| MVP/POC | ✅ Yes | Too slow |
| CRUD-heavy, little logic | ✅ Yes | Unnecessary |
| Complex domain rules | ❌ No | ✅ Yes |
| Multiple integrations | ❌ No | ✅ Yes |

> [!TIP]
> **Start simple. Refactor when pain points emerge.** A well-organized simple API handles 80% of business needs.

---

## Quick Structure

```
MyApi/
├── Controllers/          # HTTP layer
├── Services/             # Business logic
├── Models/               # DTOs + Entities (or separate)
├── Data/                 # DbContext + Repositories (optional)
└── Program.cs            # Composition root
```

---

## Quick Pattern

```csharp
// ❌ BAD: Fat controller with business logic
[HttpPost]
public async Task<IActionResult> Create(CreateProductRequest request)
{
    if (string.IsNullOrEmpty(request.Name)) 
        return BadRequest("Name required");
    if (request.Price < 0) 
        return BadRequest("Price must be positive");
    
    var product = new Product { Name = request.Name, Price = request.Price };
    _context.Products.Add(product);
    await _context.SaveChangesAsync();
    
    // Send email, log audit, update cache...
    return Ok(product.Id);
}

// ✅ GOOD: Thin controller, logic in service
[HttpPost]
public async Task<ActionResult<Guid>> Create(CreateProductRequest request)
{
    var result = await _productService.CreateAsync(request);
    return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Error);
}
```

---

## Recommended Structure

### 1. Controllers (Thin)

```csharp
[ApiController]
[Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly IProductService _service;

    public ProductsController(IProductService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<List<ProductDto>>> GetAll() 
        => Ok(await _service.GetAllAsync());

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ProductDto>> Get(Guid id)
    {
        var product = await _service.GetByIdAsync(id);
        return product is null ? NotFound() : Ok(product);
    }

    [HttpPost]
    public async Task<ActionResult<Guid>> Create(CreateProductRequest request)
    {
        var id = await _service.CreateAsync(request);
        return CreatedAtAction(nameof(Get), new { id }, id);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateProductRequest request)
    {
        var success = await _service.UpdateAsync(id, request);
        return success ? NoContent() : NotFound();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var success = await _service.DeleteAsync(id);
        return success ? NoContent() : NotFound();
    }
}
```

### 2. Services (Business Logic)

```csharp
public interface IProductService
{
    Task<List<ProductDto>> GetAllAsync();
    Task<ProductDto?> GetByIdAsync(Guid id);
    Task<Guid> CreateAsync(CreateProductRequest request);
    Task<bool> UpdateAsync(Guid id, UpdateProductRequest request);
    Task<bool> DeleteAsync(Guid id);
}

public class ProductService : IProductService
{
    private readonly AppDbContext _context;
    private readonly ILogger<ProductService> _logger;

    public ProductService(AppDbContext context, ILogger<ProductService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<List<ProductDto>> GetAllAsync()
    {
        return await _context.Products
            .AsNoTracking()
            .Select(p => new ProductDto(p.Id, p.Name, p.Price))
            .ToListAsync();
    }

    public async Task<ProductDto?> GetByIdAsync(Guid id)
    {
        return await _context.Products
            .AsNoTracking()
            .Where(p => p.Id == id)
            .Select(p => new ProductDto(p.Id, p.Name, p.Price))
            .FirstOrDefaultAsync();
    }

    public async Task<Guid> CreateAsync(CreateProductRequest request)
    {
        // Validation can use FluentValidation or manual
        var product = new Product
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Price = request.Price,
            CreatedAt = DateTime.UtcNow
        };

        _context.Products.Add(product);
        await _context.SaveChangesAsync();
        
        _logger.LogInformation("Created product {ProductId}", product.Id);
        return product.Id;
    }

    public async Task<bool> UpdateAsync(Guid id, UpdateProductRequest request)
    {
        var product = await _context.Products.FindAsync(id);
        if (product is null) return false;

        product.Name = request.Name;
        product.Price = request.Price;
        product.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var product = await _context.Products.FindAsync(id);
        if (product is null) return false;

        _context.Products.Remove(product);
        await _context.SaveChangesAsync();
        return true;
    }
}
```

### 3. Models

```csharp
// Entity (maps to DB)
public class Product
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

// DTOs (API contracts)
public record ProductDto(Guid Id, string Name, decimal Price);
public record CreateProductRequest(string Name, decimal Price);
public record UpdateProductRequest(string Name, decimal Price);
```

### 4. DbContext

```csharp
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Product> Products => Set<Product>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Product>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Price).HasPrecision(18, 2);
        });
    }
}
```

### 5. Program.cs (Minimal API style)

```csharp
var builder = WebApplication.CreateBuilder(args);

// Services
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("Default")));
builder.Services.AddScoped<IProductService, ProductService>();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.MapControllers();
app.Run();
```

---

## Common Pitfalls in Simple APIs

| Pitfall | Solution |
|---------|----------|
| Fat controllers | Extract logic to services |
| No logging | Add structured logging with Serilog |
| No validation | Use FluentValidation or DataAnnotations |
| Returning entities directly | Always use DTOs |
| No error handling | Add global exception handler |
| Hardcoded connection strings | Use configuration/secrets |

---

## When to Evolve to Clean Architecture

Migrate when you experience:
- [ ] Business logic duplicated across services
- [ ] Difficulty writing unit tests
- [ ] Services growing beyond 500 lines
- [ ] Multiple external integrations
- [ ] Team growing beyond 3 developers
- [ ] Need for domain events or complex workflows

> [!NOTE]
> Evolution path: Simple → Clean Architecture (add Domain layer, separate concerns) → Modular Monolith (when team/features grow)
