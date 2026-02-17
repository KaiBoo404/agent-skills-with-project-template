# OnebookMobileAPI Project Technical Documentation
## Overview
OnebookMobileAPI is a .NET-based RESTful API service designed to support a mobile application for employee management, attendance tracking, leave management, and other HR-related functionalities. The API serves as a backend for a mobile application that allows employees to manage their work-related activities.

## Core Technologies
- **Framework**: .NET 7.0 Web API
- **Language**: C# with nullable reference types enabled
- **Database**: SQL Server with dual ORM approach
  - **Entity Framework Core 7.0.4**: Configuration data and migrations
  - **Dapper 2.0.123**: High-performance queries for legacy database operations
- **Authentication**: Custom multi-scheme authentication (OnebookAuth + ApiKey)
- **Logging**: Serilog with structured logging

## Architecture
The application follows a layered architecture pattern:

### 1. Presentation Layer
- Controllers: Handle HTTP requests and responses
    - Organized by version (v1) and functionality
    - Return standardized API responses using ApiResponseModel
### 2. Service Layer
- Services: Implement business logic and orchestrate data access
    - Each service focuses on a specific domain (e.g., ConfigService, AttendanceService)
    - Services are registered as singletons or transients based on their state requirements
### 3. Data Access Layer
- Repositories: Handle data access operations
    - Use Dapper for efficient SQL queries
    - Entity Framework Core for configuration data
    - Custom SQL connection factories for connection management
### 4. Cross-Cutting Concerns
- Filters: Global exception handling, API response standardization
- Extensions: Reusable functionality like caching, logging, and connection management
- Providers: Authentication handlers and identity management
## Key Libraries & Packages
### Data & ORM
- `Microsoft.EntityFrameworkCore.SqlServer` (7.0.4)
- `Dapper` (2.0.123) 
- `NodaTime` (3.1.6) - Better date/time handling

### API & Web
- `Swashbuckle.AspNetCore` (6.4.0) - Swagger/OpenAPI
- `Microsoft.AspNetCore.Mvc.NewtonsoftJson` (7.0.2)
- `AutoMapper.Extensions.Microsoft.DependencyInjection` (12.0.0)

### External Services
- `FirebaseAdmin` (2.4.1) - Push notifications
- `GeoCoordinate.NetCore` (1.0.0.1) - GPS calculations
- `Polly` (8.4.2) - Resilience patterns

### Logging & Monitoring
- `Serilog.AspNetCore` (6.1.0)
- `AspNetCore.HealthChecks.SqlServer` (6.0.2)

## Extensions and Custom Components
### API Response Standardization
- ApiResponseFilter: Ensures consistent API response format
- ApiResponseModel: Standard response wrapper
### Authentication
- ApiKeyHandler: Handles API key authentication
- OnebookAuthHandler: Custom authentication for user sessions
### Caching
- DistributedCache Extensions: Object caching in distributed cache
### Localization
- JsonStringLocalizer: JSON-based localization
### Database
- SqlServerConnection: Connection management
- NodaSqlMapper: Custom type handlers for NodaTime
### Logging
- SerilogRequestLogger: HTTP request logging
- RequestLogHandler: Logs HTTP client requests


## Multilingual Support
The application supports multiple languages through:

- JSON-based localization resources
- Culture-specific response handling
- Separate resource files for English and Thai
## Deployment and CI/CD
The project includes:

- GitHub Actions workflows for CI/CD (.github/workflows)
- Ansible scripts for deployment automation
- Health check endpoints for monitoring
## Database Migrations
Entity Framework Core migrations are used to manage the configuration database schema:

- Multiple migrations for feature additions and schema changes
- Command-line support for running migrations
```bash
# Run EF migrations
dotnet ef database update --project OnebookMobileAPI

# Create new migration
dotnet ef migrations add MigrationName --project OnebookMobileAPI
```

## Security Features
- API key authentication for service-to-service communication
- Claims-based user authentication
- SQL injection protection through parameterized queries
- HTTPS enforcement in production

## Configuration Management
- **Base**: `appsettings.json`
- **Environment**: `appsettings.Development.json`
- **Runtime**: Environment variables override JSON settings
- **Connection Strings**: Configured per environment
- **Service Endpoints**: External API URLs in Services section

## Development Environment
- **Database**: SQL Server (LocalDB for development)
- **Health Checks**: Available at `/healthz` endpoint
- **Swagger UI**: Available in Development environment
- **Logging**: Console + File + Seq (structured logging)