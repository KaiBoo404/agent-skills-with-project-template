# Project Map & Architecture

## Project Overview
**Name:** [Project Name]  
**Core Value Proposition:** [1-sentence summary of what this app does]  
**Current Phase:** [MVP / Scaling / Refactoring]

## Key User Flows
- **User:** [Actor] -> **Action:** [Trigger] -> **Outcome:** [Result]
- **System:** [Input] -> **Process:** [Logic] -> **Output:** [Data]

### Target Users
- **Admins:** -
- **Users:** -

## Directory Structure (Mental Model)
```text
******************* EXAMPLE *******************
{PROJECT_NAME}/
├── {PROJECT_NAME}/           # Main Application Project
│   ├── Controllers/            # API Endpoints
│   │   ├── v1/                 # Current Version API
│   │   ├── Legacy/             # Legacy API Endpoints
│   │   └── Service/            # Internal Service APIs
│   ├── Services/               # Business Logic Layer
│   │   ├── Externals/          # External Integrations (Firebase, etc.)
│   │   └── [Domain]Service.cs  # Domain Services (e.g., CheckInService.cs)
│   ├── Repositories/           # Data Access Layer
│   │   ├── [Domain]Repository.cs # Dapper Repositories
│   │   └── ConfigDbContext.cs  # EF Core Context
│   ├── Models/                 # DTOs and Domain Objects
│   │   ├── [Domain]/           # Organized by Domain (e.g., CheckIn/)
│   │   └── Api/                # API Response Models
│   ├── Providers/              # Auth & Identity Providers
│   ├── Extensions/             # Middleware & Extensions
│   ├── Resources/              # Localization Files (.json)
│   └── Program.cs              # Entry Point & Configuration
├── .context/                   # AI Context & Documentation
├── .github/                    # CI/CD Workflows
└── {PROJECT_NAME}.sln        # Solution File
```

* `/.context`: AI Memory and Specs (You are here).
* `/src/core`: Domain logic and business rules.
* `/src/adapters`: External integrations (API, DB).
* `/src/ui`: Components and presentation.

## Critical Rules
- **DO NOT** modify files outside of the scope of the active spec.
- **ALWAYS** check `02_tech_stack.md` before importing new packages.

---