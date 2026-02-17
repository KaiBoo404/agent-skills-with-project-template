# Project Map & Architecture
## 1. Project Overview
**Name:** {PROJECT_NAME}

**Core Value Proposition:** .NET 9.0 RESTful API service that serves as the backend for **{PROJECT_NAME}**, a mobile HR application. It provides employee self-service (ESS) functionality for workforce management.
**Current Phase:** Maintain and scaling

## 2. Key User Flows
- **User:** [Actor] -> **Action:** [Trigger] -> **Outcome:** [Result]
- **System:** [Input] -> **Process:** [Logic] -> **Output:** [Data]

### Target Users
- **Employees**: Self-service access to HR functions via mobile app
- **Managers**: Approval workflows and team management
- **HR Staff**: Administrative oversight through connected web systems

## 3. Directory Structure (Mental Model)

```text
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

## 4. Key Files & Modules
*   **Program.cs**: Service registrations, middleware setup, auth configuration.
*   **Controllers/v1/**: Main API endpoints (e.g., `CheckInController.cs`).
*   **Services/**: Business logic (e.g., `CheckInService.cs` handles GPS validation).
*   **Repositories/**: Data access (e.g., `CheckInRepository.cs` with Dapper queries).
*   **appsettings.json**: Configuration hierarchy.

## 5. Critical Rules
- **DO NOT** modify files outside of the scope of the active spec.
- **ALWAYS** check `02_tech_stack.md` before importing new packages.

---

# Project Background & Vision
Onebook HR is an all-in-one Human Resource Information System (HRIS) and Employee/Manager Self-Service (ESS/MSS) platform. It consists of:

* **Onebook HR (Web)**: A responsive web application covering full HRM and HRD features alongside employee and manager self-service capabilities.
* **Onebook Workspace (Mobile Apps)**: Native iOS and Android applications enabling ESS/MSS for time tracking, leave requests, employee data access, performance evaluations, and goal management.
* **MySpace (Legacy Mobile Apps)**: Legacy mobile applications (iOS and Android) that provide basic ESS features. *Cannot be updated any more*.

## 1. Core Modules
1. **Employee Management (HR Core)**: Real-time employee profiles, role-based permissions, and comprehensive audit logs.
2. **Time & Attendance**: Mobile check-in/out support (GPS-based), shift and roster management, cross-site attendance, and work-from-home options.
3. **Payroll**: Automated salary calculations integrated with attendance, benefits, and overtime data.
4. **Benefits Administration**: Configurable benefit plans with automatic eligibility calculations.
5. **Manpower & Organizational Planning**: Workforce analytics and headcount forecasting aligned with organizational structure.
6. **Recruitment**: End-to-end hiring workflows from requisitions to applicant analytics.
7. **Training & Development**: Training planning, budget tracking, scheduling, and outcome evaluations.
8. **Performance Management**: Goal setting, performance reviews, and detailed reporting dashboards.
9. **Career & IDP**: Individual Development Plans for clear career pathways and growth tracking.

## 2. Related Project
*  **OnebookWeb**: Full HRM web application
*  **OnebookWebSTP**: Stored Procedures for Database operations of **OnebookWeb**.
*  **OnebookWebAPI**: Future Web API Service for **OnebookWeb**.
*  **OnebookMobile**: Mobile Application Frontend Project with ReactNative framework. Connected with *OnebookMobileAPI* for retreiving data for each screen. Mostly ESS Module only (No HR screen). Frontend for **Onebook Workspace**
*  **OnebookMobileAPI**: .NET-based RESTful API service designed to support a mobile application for employee management, attendance tracking, leave management, and other HR-related functionalities. The API serves as a backend for a mobile application that allows employees to manage their work-related activities. Backend for **Onebook Workspace**
*  **OnebookMobileStoredProcedure**: Stored Procedures for Database operations. Also Backend for **Onebook Workspace**

## 3. Target Users
- **Employees**: Self-service access to HR functions via mobile app
- **Managers**: Approval workflows and team management
- **HR Staff**: Administrative oversight through connected web systems