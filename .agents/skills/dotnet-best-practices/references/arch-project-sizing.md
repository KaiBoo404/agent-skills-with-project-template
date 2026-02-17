# Project Sizing Guide

Guidance for choosing the right architecture based on project complexity, team size, and growth trajectory.

## Decision Matrix

| Factor | Simple API | Clean Architecture | Modular Monolith |
|--------|------------|-------------------|------------------|
| **Team size** | 1-2 devs | 2-5 devs | 5+ devs |
| **Time to MVP** | Days-Weeks | Weeks-Months | Months |
| **Domain complexity** | CRUD-heavy | Complex rules | Multiple domains |
| **Expected lifespan** | <1 year | 1-5 years | 5+ years |
| **Integrations** | Few | Several | Many |
| **Testing needs** | Basic | Comprehensive | Extensive |

---

## Quick Decision Tree

```
Is this a POC/MVP/internal tool?
├── Yes → Simple API
└── No → Does it have complex business rules?
    ├── No → Simple API  
    └── Yes → Is team > 5 developers OR multiple bounded contexts?
        ├── No → Clean Architecture
        └── Yes → Modular Monolith
```

---

## Project Type Examples

### Simple API (Use `arch-simple.md`)
- Internal admin tools
- MVP prototypes
- CRUD-heavy applications
- Single developer projects
- Report generators
- Webhook receivers
- Simple integrations

### Clean Architecture (Use `arch-clean.md`)
- E-commerce backends
- SaaS applications
- Financial services
- Healthcare systems
- Complex scheduling systems
- Multi-tenant applications

### Modular Monolith (Use `arch-modular-monolith.md`)
- Enterprise resource planning (ERP)
- Large e-commerce platforms
- Banking systems
- Insurance platforms
- Systems with planned microservices migration

---

## Red Flags: When to Upgrade

### Simple → Clean Architecture
- [ ] Business logic duplicated across controllers
- [ ] Difficulty mocking dependencies for tests
- [ ] Service classes exceeding 500 lines
- [ ] Adding 3rd+ external integration
- [ ] Domain rules spread across multiple services

### Clean Architecture → Modular Monolith
- [ ] Team exceeding 5 developers
- [ ] Clear bounded contexts emerging
- [ ] Deployments blocking other teams
- [ ] Need for independent module ownership
- [ ] Performance requires separate scaling

---

## Cost-Benefit Analysis

| Architecture | Setup Cost | Maintenance Cost | Flexibility | Testability |
|--------------|------------|------------------|-------------|-------------|
| Simple | ⭐ Low | ⭐⭐ Medium | ⭐ Low | ⭐⭐ Medium |
| Clean | ⭐⭐⭐ High | ⭐⭐ Medium | ⭐⭐⭐ High | ⭐⭐⭐ High |
| Modular | ⭐⭐⭐⭐ Very High | ⭐ Low | ⭐⭐⭐⭐ Very High | ⭐⭐⭐ High |

> [!WARNING]
> **Over-engineering alert:** Don't use Clean Architecture for a weekend project. Don't use Modular Monolith for a 2-person team.
