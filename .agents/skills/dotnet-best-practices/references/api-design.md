# RESTful API Design

**Source:** Mukesh Murugan's API best practices  
**Best for:** Web APIs, integrations, public APIs

## Rule Summary

| Rule | Impact | Description |
|------|--------|-------------|
| `api-versioning` | HIGH | Always version your API |
| `api-pagination` | HIGH | Paginate list endpoints |
| `api-problem-details` | MEDIUM | Use RFC 7807 for errors |
| `api-naming` | MEDIUM | Use plural nouns, not verbs |
| `api-status-codes` | MEDIUM | Return correct HTTP status codes |
| `api-async` | MEDIUM | All I/O operations async |

---

## 1. API Versioning (HIGH)

```csharp
// ✅ URL versioning (recommended)
[Route("api/v1/[controller]")]
public class ProductsController : ControllerBase { }

// Alternative: Header versioning
// X-API-Version: 1.0

// Setup
builder.Services.AddApiVersioning(options =>
{
    options.DefaultApiVersion = new ApiVersion(1, 0);
    options.AssumeDefaultVersionWhenUnspecified = true;
    options.ReportApiVersions = true;
});
```

---

## 2. Resource Naming

```csharp
// ❌ BAD: Verbs, inconsistent casing
[Route("api/getProducts")]
[Route("api/product/List")]
[Route("api/DeleteProduct")]

// ✅ GOOD: Plural nouns, kebab-case
[Route("api/v1/products")]         // Collection
[Route("api/v1/products/{id}")]    // Single item
[Route("api/v1/products/{id}/reviews")]  // Sub-resource
[Route("api/v1/order-items")]      // Multi-word resource
```

---

## 3. HTTP Methods & Status Codes

| Action | Method | Success Code | Error Codes |
|--------|--------|--------------|-------------|
| Get all | GET | 200 OK | 400, 401, 403 |
| Get one | GET | 200 OK | 400, 401, 403, 404 |
| Create | POST | 201 Created | 400, 401, 409 |
| Update (full) | PUT | 200/204 | 400, 401, 404 |
| Update (partial) | PATCH | 200/204 | 400, 401, 404 |
| Delete | DELETE | 204 No Content | 401, 403, 404 |

```csharp
[HttpPost]
[ProducesResponseType<ProductDto>(201)]
[ProducesResponseType<ProblemDetails>(400)]
public async Task<ActionResult<ProductDto>> Create(CreateProductRequest request)
{
    var product = await _service.CreateAsync(request);
    return CreatedAtAction(nameof(GetById), new { id = product.Id }, product);
}

[HttpGet("{id:guid}")]
[ProducesResponseType<ProductDto>(200)]
[ProducesResponseType(404)]
public async Task<ActionResult<ProductDto>> GetById(Guid id)
{
    var product = await _service.GetByIdAsync(id);
    return product is null ? NotFound() : Ok(product);
}

[HttpDelete("{id:guid}")]
[ProducesResponseType(204)]
[ProducesResponseType(404)]
public async Task<IActionResult> Delete(Guid id)
{
    var deleted = await _service.DeleteAsync(id);
    return deleted ? NoContent() : NotFound();
}
```

---

## 4. Pagination (HIGH)

```csharp
// Request
public record GetProductsRequest(int Page = 1, int PageSize = 20, string? Search = null);

// Response
public record PagedResult<T>(
    IEnumerable<T> Items,
    int TotalCount,
    int Page,
    int PageSize)
{
    public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
    public bool HasPrevious => Page > 1;
    public bool HasNext => Page < TotalPages;
}

// Endpoint
[HttpGet]
public async Task<ActionResult<PagedResult<ProductDto>>> GetAll(
    [FromQuery] int page = 1,
    [FromQuery] int pageSize = 20,
    [FromQuery] string? search = null)
{
    pageSize = Math.Min(pageSize, 100); // Cap page size
    var result = await _service.GetPagedAsync(page, pageSize, search);
    return Ok(result);
}
```

---

## 5. Error Handling - ProblemDetails (RFC 7807)

```csharp
// Setup global exception handler
builder.Services.AddProblemDetails();

// Custom exception handler
app.UseExceptionHandler(exceptionApp =>
{
    exceptionApp.Run(async context =>
    {
        var exception = context.Features.Get<IExceptionHandlerFeature>()?.Error;
        
        var problemDetails = exception switch
        {
            NotFoundException e => new ProblemDetails
            {
                Status = 404,
                Title = "Resource not found",
                Detail = e.Message
            },
            ValidationException e => new ProblemDetails
            {
                Status = 400,
                Title = "Validation failed",
                Detail = string.Join("; ", e.Errors)
            },
            _ => new ProblemDetails
            {
                Status = 500,
                Title = "An error occurred"
            }
        };
        
        context.Response.StatusCode = problemDetails.Status ?? 500;
        await context.Response.WriteAsJsonAsync(problemDetails);
    });
});

// Response example:
{
    "type": "https://tools.ietf.org/html/rfc7807",
    "title": "Validation failed",
    "status": 400,
    "detail": "Name is required; Price must be positive",
    "instance": "/api/v1/products"
}
```

---

## 6. Request Validation

```csharp
// FluentValidation
public class CreateProductValidator : AbstractValidator<CreateProductRequest>
{
    public CreateProductValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Name is required")
            .MaximumLength(200).WithMessage("Name too long");
            
        RuleFor(x => x.Price)
            .GreaterThan(0).WithMessage("Price must be positive");
            
        RuleFor(x => x.Sku)
            .Matches("^[A-Z]{3}-[0-9]{4}$").WithMessage("Invalid SKU format");
    }
}

// Registration
builder.Services.AddValidatorsFromAssemblyContaining<CreateProductValidator>();
builder.Services.AddFluentValidationAutoValidation();
```

---

## 7. DTOs and Contracts

```csharp
// Request DTOs
public record CreateProductRequest(
    string Name,
    decimal Price,
    string? Description,
    Guid CategoryId);

public record UpdateProductRequest(
    string Name,
    decimal Price,
    string? Description);

// Response DTOs
public record ProductDto(
    Guid Id,
    string Name,
    decimal Price,
    string? Description,
    string CategoryName,
    DateTime CreatedAt);

// Never expose entities directly!
// ❌ BAD: return Ok(product);  // Product entity
// ✅ GOOD: return Ok(product.ToDto()); // ProductDto
```

---

## 8. OpenAPI/Swagger

```csharp
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Products API",
        Version = "v1",
        Description = "API for managing products"
    });
    
    // JWT authentication
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });
});

// Endpoint documentation
/// <summary>
/// Creates a new product
/// </summary>
/// <param name="request">Product creation data</param>
/// <returns>The created product</returns>
/// <response code="201">Product created successfully</response>
/// <response code="400">Invalid input data</response>
[HttpPost]
[ProducesResponseType<ProductDto>(201)]
[ProducesResponseType<ProblemDetails>(400)]
public async Task<ActionResult<ProductDto>> Create(CreateProductRequest request) 
    => CreatedAtAction(nameof(GetById), ...);
```

---

## 9. Minimal APIs Alternative

```csharp
var app = builder.Build();

var products = app.MapGroup("api/v1/products").WithTags("Products");

products.MapGet("/", async (IProductService service, [AsParameters] GetProductsRequest request) =>
    Results.Ok(await service.GetPagedAsync(request)));

products.MapGet("/{id:guid}", async (Guid id, IProductService service) =>
    await service.GetByIdAsync(id) is { } product 
        ? Results.Ok(product) 
        : Results.NotFound());

products.MapPost("/", async (CreateProductRequest request, IProductService service) =>
{
    var product = await service.CreateAsync(request);
    return Results.Created($"/api/v1/products/{product.Id}", product);
});

products.MapDelete("/{id:guid}", async (Guid id, IProductService service) =>
    await service.DeleteAsync(id) ? Results.NoContent() : Results.NotFound());
```

---

## 9. Idempotency (Mukesh Murugan)

**Idempotency:** safely retrying a request without side effects.
**Mechanic:** Client sends `Idempotency-Key` header. Server checks if key exists.

```csharp
// 1. Client sends header: Idempotency-Key: "uuid-123"
// 2. Middleware checks Redis/DB for key
// 3. If found -> return cached response
// 4. If not found -> process -> cache response -> return
```

**Libraries:** `IdempotentAPI` or build custom middleware.

---

## 10. Global Exception Handling (.NET 8+)

Use `IExceptionHandler` instead of custom middleware (cleaner, standard).

```csharp
public class GlobalExceptionHandler : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext, 
        Exception exception, 
        CancellationToken cancellationToken)
    {
        var problemDetails = new ProblemDetails
        {
            Status = StatusCodes.Status500InternalServerError,
            Title = "Server Error",
            Detail = exception.Message // Sanitize in production!
        };

        httpContext.Response.StatusCode = problemDetails.Status.Value;
        await httpContext.Response.WriteAsJsonAsync(problemDetails, cancellationToken);

        return true; // Exception handled
    }
}

// Program.cs
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();
app.UseExceptionHandler();
```

---

## Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| Returning entities | Always use DTOs |
| No versioning | Add from day 1 |
| Unbounded list queries | Always paginate |
| Generic error responses | Use ProblemDetails |
| No input validation | Use FluentValidation |
| Missing CancellationToken | Add to all async endpoints |
