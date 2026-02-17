This project uses a centralized layered context system. You MUST follow this priority order when generating code:

### HARD CONSTRAINTS (Highest Priority)
* **Primary Knowledge Base:** Look in the `.context/` directory.
* **Role Definition:** Always prioritize instructions found in `.context/00_system_role.md`.
* **Coding Standards:** Before generating code, cross-reference `.context/03_conventions.md`.
* **Project Map:** Always refer to `.context/01_project_map.md` for project structure.

### ENGINEERING STANDARDS (Medium Priority - The "How-To")
* **Imported Skills & Domain Expertise (`.context/skills/*`):**
	* **Dynamic Ingestion:** Treat all files and subdirectories within `.context/skills/` as your active knowledge base for implementation patterns (whether they are for React Native, Backend, or UI/UX) to optimize code quality, performance, and maintainability..
	* **Conflict Resolution:** if a skill suggests a specific library or architectural change that conflicts with the **Hard Constraints (Layer 1)**, the **Hard Constraints always win**.