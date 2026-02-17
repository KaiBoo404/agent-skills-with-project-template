# 🧠 AI Context Layer & Spec-Driven Development

## Purpose
This directory (`/.context`) is the **Single Source of Truth** for this project. It is designed to be ingested by AI agents (Cursor, Windsurf, Trae, Copilot) to ensure they write code that matches our architecture, tech stack, and quality standards.

**Rule Zero:** If it's not in this folder, the AI doesn't know about it.

## 📂 Structure & Responsibilities

| File | Purpose | When to Edit? |
| :--- | :--- | :--- |
| **`00_system_role.md`** | **The Persona.** Defines *how* the AI behaves (tone, caution level, strictness). | Rarely. Only if you want to change the AI's "personality." |
| **`01_project_map.md`** | **The Blueprint.** Defines directory structure and high-level architecture. | When you add new modules, change folder structures, or refactor the system design. |
| **`02_tech_stack.md`** | **The Tools.** Defines libraries, versions, and DB schema. | When you install a new package (`npm install`) or change the database schema. |
| **`03_conventions.md`** | **The Rules.** Defines coding style, naming patterns, and testing rules. | When the team agrees on a new coding standard (e.g., "Switch to Tailwind"). |
| **`active_specs/`** | **The Tasks.** Folder for atomic feature specifications. | Every time you start a new feature. |

---

## ⚡ Workflow: How to "Vibe Code"

### 1. Starting a New Feature
1.  Copy the template: `cp .context/templates/feature_template.md .context/active_specs/feature_[name].md`
2.  Fill in the "User Story," "Requirements," and "Plan" sections. **Do not write code yet.**
3.  Open your AI Chat and type:
    > "Read @.context/00_system_role.md and the new spec @.context/active_specs/feature_[name].md. Create a plan."

### 2. During Development
* **Don't fight the AI.** If the AI generates code that violates our patterns, **STOP**.
* Check `03_conventions.md`. Does it explicitly forbid that pattern?
    * **Yes:** Tell the AI: "Read @03_conventions.md again. You violated rule #2."
    * **No:** Update `03_conventions.md` to include the new rule, then try again.

### 3. Definition of Done (DoD)
A feature is not done until:
1.  The code is merged.
2.  The `active_specs/feature_[name].md` status is updated to `Completed`.
3.  Any new architectural decisions (e.g., a new library) are recorded in `02_tech_stack.md`.

---

## 🚫 Conflict Prevention (The Golden Rules)

To avoid conflicting instructions, strictly separate concerns:

1.  **Map vs. Content:**
    * `01_project_map.md` decides **WHERE** a file goes.
    * `03_conventions.md` decides **WHAT** goes inside the file.
    * *Example:* The Map says "Auth goes in `/src/auth`". The Conventions say "Use `zod` for validation".

2.  **Role vs. Stack:**
    * `00_system_role.md` is for **Behavior** ("Write tests").
    * `02_tech_stack.md` is for **Technology** ("Use Vitest").

---

## 🤖 System Prompt for AI
*If you are using Cursor/Windsurf/Github Copilot, paste this into your `.cursorrules` or `.github/copilot-instructions.md` or global prompt:*

```
This project uses a centralized context system.

1.  **Primary Knowledge Base:** Look in the `.context/` directory.
2.  **Role Definition:** Always prioritize instructions found in `.context/00_system_role.md`.
3.  **Coding Standards:** Before generating code, cross-reference `.context/03_conventions.md`.
4.  **Project Map:** Always refer to `.context/01_project_map.md` for project structure."
```