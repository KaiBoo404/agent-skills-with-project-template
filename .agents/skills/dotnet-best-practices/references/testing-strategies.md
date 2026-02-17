# Testing Strategies

**Source:** Milan Jovanovic's testing pyramid approach  
**Best for:** Ensuring production reliability

## Test Types Overview

| Type | Speed | Scope | When to Use |
|------|-------|-------|-------------|
| Unit | Fast | Single class/method | Domain logic, algorithms |
| Integration | Medium | Multiple components | Database, external APIs |
| Architecture | Fast | Full codebase | Dependency rules, conventions |
| End-to-End | Slow | Full system | Critical user flows |

---

## 1. Unit Tests

Test isolated business logic without dependencies.

```csharp
// Domain entity test
public class OrderTests
{
    [Fact]
    public void AddItem_WhenOrderPending_ShouldUpdateTotal()
    {
        // Arrange
        var order = Order.Create(Guid.NewGuid());
        
        // Act
        order.AddItem(productId: Guid.NewGuid(), quantity: 2, price: Money.From(10));
        
        // Assert
        order.TotalAmount.Should().Be(Money.From(20));
        order.Items.Should().HaveCount(1);
    }

    [Fact]
    public void AddItem_WhenOrderConfirmed_ShouldThrow()
    {
        // Arrange
        var order = Order.Create(Guid.NewGuid());
        order.AddItem(Guid.NewGuid(), 1, Money.From(10));
        order.Confirm();
        
        // Act
        var act = () => order.AddItem(Guid.NewGuid(), 1, Money.From(10));
        
        // Assert
        act.Should().Throw<DomainException>()
            .WithMessage("Cannot modify confirmed order");
    }
}

// Value Object test
public class MoneyTests
{
    [Theory]
    [InlineData(10, 5, 15)]
    [InlineData(0, 10, 10)]
    [InlineData(100, 0, 100)]
    public void Add_ShouldReturnCorrectSum(decimal a, decimal b, decimal expected)
    {
        var result = Money.From(a) + Money.From(b);
        result.Amount.Should().Be(expected);
    }

    [Fact]
    public void Add_DifferentCurrencies_ShouldThrow()
    {
        var usd = new Money(10, "USD");
        var eur = new Money(10, "EUR");
        
        var act = () => usd + eur;
        
        act.Should().Throw<DomainException>();
    }
}
```

---

## 2. Integration Tests

Test components working together, especially database operations.

```csharp
// WebApplicationFactory for API tests
public class OrdersApiTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public OrdersApiTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureTestServices(services =>
            {
                // Replace real DB with in-memory
                services.RemoveAll<DbContextOptions<AppDbContext>>();
                services.AddDbContext<AppDbContext>(options =>
                    options.UseInMemoryDatabase("TestDb"));
            });
        }).CreateClient();
    }

    [Fact]
    public async Task CreateOrder_ValidRequest_ReturnsCreated()
    {
        // Arrange
        var request = new CreateOrderRequest(CustomerId: Guid.NewGuid(), Items: [...]);
        
        // Act
        var response = await _client.PostAsJsonAsync("/api/v1/orders", request);
        
        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var orderId = await response.Content.ReadFromJsonAsync<Guid>();
        orderId.Should().NotBeEmpty();
    }

    [Fact]
    public async Task CreateOrder_InvalidRequest_ReturnsBadRequest()
    {
        var request = new CreateOrderRequest(CustomerId: Guid.Empty, Items: []); // Invalid
        
        var response = await _client.PostAsJsonAsync("/api/v1/orders", request);
        
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}

// Repository integration test with real database
public class OrderRepositoryTests : IAsyncLifetime
{
    private readonly AppDbContext _context;
    private readonly OrderRepository _repository;

    public OrderRepositoryTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlServer("Server=localhost;Database=TestDb;...")
            .Options;
        _context = new AppDbContext(options);
        _repository = new OrderRepository(_context);
    }

    public async Task InitializeAsync() => await _context.Database.EnsureCreatedAsync();
    public async Task DisposeAsync() => await _context.Database.EnsureDeletedAsync();

    [Fact]
    public async Task Add_ShouldPersistOrder()
    {
        var order = Order.Create(Guid.NewGuid());
        
        _repository.Add(order);
        await _context.SaveChangesAsync();
        
        var retrieved = await _repository.GetByIdAsync(order.Id);
        retrieved.Should().NotBeNull();
    }
}
```

---

## 3. Architecture Tests

Enforce architectural rules and prevent violations.

```csharp
// Using NetArchTest
public class ArchitectureTests
{
    private static readonly Assembly DomainAssembly = typeof(Order).Assembly;
    private static readonly Assembly ApplicationAssembly = typeof(CreateOrderCommand).Assembly;
    private static readonly Assembly InfrastructureAssembly = typeof(AppDbContext).Assembly;

    [Fact]
    public void Domain_ShouldNotReference_Application()
    {
        var result = Types.InAssembly(DomainAssembly)
            .ShouldNot()
            .HaveDependencyOn(ApplicationAssembly.GetName().Name)
            .GetResult();

        result.IsSuccessful.Should().BeTrue();
    }

    [Fact]
    public void Domain_ShouldNotReference_Infrastructure()
    {
        var result = Types.InAssembly(DomainAssembly)
            .ShouldNot()
            .HaveDependencyOn(InfrastructureAssembly.GetName().Name)
            .GetResult();

        result.IsSuccessful.Should().BeTrue();
    }

    [Fact]
    public void Handlers_ShouldBeSealed()
    {
        var result = Types.InAssembly(ApplicationAssembly)
            .That()
            .ImplementInterface(typeof(IRequestHandler<,>))
            .Should()
            .BeSealed()
            .GetResult();

        result.IsSuccessful.Should().BeTrue();
    }

    [Fact]
    public void Controllers_ShouldHaveControllerSuffix()
    {
        var result = Types.InAssembly(typeof(Program).Assembly)
            .That()
            .Inherit(typeof(ControllerBase))
            .Should()
            .HaveNameEndingWith("Controller")
            .GetResult();

        result.IsSuccessful.Should().BeTrue();
    }
}
```

---

## 4. Test Doubles

### Mocking with NSubstitute

```csharp
public class OrderServiceTests
{
    private readonly IOrderRepository _repository;
    private readonly IEmailService _emailService;
    private readonly OrderService _sut;

    public OrderServiceTests()
    {
        _repository = Substitute.For<IOrderRepository>();
        _emailService = Substitute.For<IEmailService>();
        _sut = new OrderService(_repository, _emailService);
    }

    [Fact]
    public async Task ConfirmOrder_ShouldSendEmail()
    {
        // Arrange
        var order = Order.Create(Guid.NewGuid());
        _repository.GetByIdAsync(order.Id, Arg.Any<CancellationToken>())
            .Returns(order);

        // Act
        await _sut.ConfirmOrderAsync(order.Id);

        // Assert
        await _emailService.Received(1)
            .SendOrderConfirmationAsync(Arg.Is<Guid>(id => id == order.Id));
    }
}
```

### Test Data Builders

```csharp
public class OrderBuilder
{
    private Guid _customerId = Guid.NewGuid();
    private readonly List<(Guid, int, decimal)> _items = new();
    private bool _confirmed = false;

    public OrderBuilder WithCustomer(Guid customerId)
    {
        _customerId = customerId;
        return this;
    }

    public OrderBuilder WithItem(Guid productId, int quantity, decimal price)
    {
        _items.Add((productId, quantity, price));
        return this;
    }

    public OrderBuilder Confirmed()
    {
        _confirmed = true;
        return this;
    }

    public Order Build()
    {
        var order = Order.Create(_customerId);
        foreach (var (productId, qty, price) in _items)
            order.AddItem(productId, qty, Money.From(price));
        if (_confirmed) order.Confirm();
        return order;
    }
}

// Usage
var order = new OrderBuilder()
    .WithCustomer(customerId)
    .WithItem(productId, quantity: 2, price: 10m)
    .Confirmed()
    .Build();
```

---

## 5. Test Naming Conventions

```csharp
// Pattern: MethodName_StateUnderTest_ExpectedBehavior
[Fact]
public void AddItem_WhenOrderPending_ShouldIncreaseTotal()

[Fact]
public void Confirm_WhenNoItems_ShouldThrowDomainException()

[Fact]
public async Task CreateOrder_ValidRequest_ReturnsCreatedWithOrderId()
```

---

## Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| Testing implementation details | Test behavior, not internals |
| Too many mocks | Consider integration tests |
| Flaky tests | Avoid time-dependent tests, use deterministic data |
| No cleanup between tests | Use fresh database/context per test |
| Ignoring async | Always await, use async assertions |
