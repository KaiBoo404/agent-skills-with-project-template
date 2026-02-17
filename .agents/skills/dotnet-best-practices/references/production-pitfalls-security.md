# Production Pitfalls - Security & Error Handling

Common security vulnerabilities and error handling mistakes in production .NET applications.

## Security Pitfalls

### 1. SQL Injection (CRITICAL)

```csharp
// ❌ BAD: String concatenation = SQL injection
var sql = $"SELECT * FROM Users WHERE Name = '{name}'";
await connection.QueryAsync(sql);

// ✅ GOOD: Parameterized queries
var sql = "SELECT * FROM Users WHERE Name = @Name";
await connection.QueryAsync(sql, new { Name = name });

// ✅ EF Core is safe by default
var users = await _context.Users.Where(u => u.Name == name).ToListAsync();
```

### 2. XSS (Cross-Site Scripting) (HIGH)

```csharp
// ❌ BAD: Raw HTML output
@Html.Raw(Model.UserComment) // Renders unescaped HTML

// ✅ GOOD: Razor encodes by default
@Model.UserComment // Automatically HTML-encoded

// ✅ For APIs: Encode untrusted input
var encoded = System.Web.HttpUtility.HtmlEncode(userInput);
```

### 3. Missing Authorization (HIGH)

```csharp
// ❌ BAD: No authorization check
[HttpDelete("{id}")]
public async Task<IActionResult> Delete(Guid id)
{
    await _service.DeleteAsync(id);
    return NoContent();
}

// ✅ GOOD: Authorization attribute
[Authorize(Roles = "Admin")]
[HttpDelete("{id}")]
public async Task<IActionResult> Delete(Guid id)
{
    await _service.DeleteAsync(id);
    return NoContent();
}

// ✅ BETTER: Resource-based authorization
[HttpDelete("{id}")]
public async Task<IActionResult> Delete(Guid id)
{
    var resource = await _service.GetByIdAsync(id);
    var authResult = await _authorizationService.AuthorizeAsync(User, resource, "DeletePolicy");
    
    if (!authResult.Succeeded)
        return Forbid();
        
    await _service.DeleteAsync(id);
    return NoContent();
}
```

### 4. IDOR (Insecure Direct Object Reference) (HIGH)

```csharp
// ❌ BAD: No ownership check
[HttpGet("{id}")]
public async Task<ActionResult<OrderDto>> GetOrder(Guid id)
{
    return await _context.Orders.FindAsync(id);
}

// ✅ GOOD: Verify ownership
[HttpGet("{id}")]
public async Task<ActionResult<OrderDto>> GetOrder(Guid id)
{
    var userId = User.GetUserId();
    var order = await _context.Orders
        .Where(o => o.Id == id && o.UserId == userId)
        .FirstOrDefaultAsync();
        
    return order is null ? NotFound() : Ok(order.ToDto());
}
```

### 5. Exposing Sensitive Data in Responses (HIGH)

```csharp
// ❌ BAD: Returning entity with all fields
return Ok(user); // Includes PasswordHash, internal IDs, etc.

// ✅ GOOD: Return DTO with only needed fields
return Ok(new UserDto(user.Id, user.Name, user.Email));
```

### 6. Missing HTTPS Redirect (MEDIUM)

```csharp
// Program.cs
if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}
app.UseHttpsRedirection();
```

### 7. CORS Misconfiguration (MEDIUM)

```csharp
// ❌ BAD: Allow all origins
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy => policy.AllowAnyOrigin());
});

// ✅ GOOD: Specific origins
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy => policy
        .WithOrigins("https://myapp.com", "https://admin.myapp.com")
        .AllowAnyMethod()
        .AllowAnyHeader()
        .AllowCredentials());
});
```

---

## Error Handling Pitfalls

### 8. Swallowing Exceptions (HIGH)

```csharp
// ❌ BAD: Silent failure
try
{
    await ProcessOrderAsync(order);
}
catch (Exception)
{
    // Swallowed - no one knows it failed
}

// ✅ GOOD: Log and handle appropriately
try
{
    await ProcessOrderAsync(order);
}
catch (Exception ex)
{
    _logger.LogError(ex, "Failed to process order {OrderId}", order.Id);
    throw; // Re-throw or return error
}
```

### 9. Exception for Control Flow (MEDIUM)

```csharp
// ❌ BAD: Exception as control flow
public User GetUser(Guid id)
{
    try
    {
        return _context.Users.First(u => u.Id == id);
    }
    catch (InvalidOperationException)
    {
        return null; // Expected "not found" case
    }
}

// ✅ GOOD: Avoid exception for expected cases
public User? GetUser(Guid id)
{
    return _context.Users.FirstOrDefault(u => u.Id == id);
}
```

### 10. No Global Exception Handler (MEDIUM)

```csharp
// ✅ Setup global exception handling
app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        var exception = context.Features.Get<IExceptionHandlerFeature>()?.Error;
        var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
        
        logger.LogError(exception, "Unhandled exception");
        
        context.Response.StatusCode = 500;
        context.Response.ContentType = "application/problem+json";
        
        await context.Response.WriteAsJsonAsync(new ProblemDetails
        {
            Status = 500,
            Title = "An error occurred",
            Detail = app.Environment.IsDevelopment() ? exception?.Message : null
        });
    });
});
```

---

## Validation Pitfalls

### 11. Missing Input Validation (HIGH)

```csharp
// ❌ BAD: No validation
[HttpPost]
public async Task<IActionResult> Create(CreateOrderRequest request)
{
    // Request could have null fields, negative quantities, etc.
    var order = Order.Create(request);
    //...
}

// ✅ GOOD: Validate with FluentValidation
public class CreateOrderValidator : AbstractValidator<CreateOrderRequest>
{
    public CreateOrderValidator()
    {
        RuleFor(x => x.CustomerId).NotEmpty();
        RuleFor(x => x.Items).NotEmpty();
        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.Quantity).GreaterThan(0);
            item.RuleFor(i => i.ProductId).NotEmpty();
        });
    }
}
```

### 12. Trusting Client-Side Validation Only (MEDIUM)

```csharp
// ❌ BAD: Only JavaScript validation
// Server trusts whatever comes from client

// ✅ GOOD: Always validate on server
// Client validation = UX
// Server validation = Security
```

---

## Security Summary

| Pitfall | Impact | Solution |
|---------|--------|----------|
| SQL Injection | CRITICAL | Parameterized queries |
| XSS | HIGH | Encode output, CSP |
| Missing Authorization | HIGH | [Authorize] + policies |
| IDOR | HIGH | Check ownership |
| Sensitive data in responses | HIGH | Use DTOs |
| Swallowing exceptions | HIGH | Log + re-throw |
| No input validation | HIGH | FluentValidation |
| Missing HTTPS | MEDIUM | UseHttpsRedirection |
| CORS misconfiguration | MEDIUM | Specific origins |
| No global error handler | MEDIUM | UseExceptionHandler |
