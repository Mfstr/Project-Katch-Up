# AI Usage & Verification Log

**Project Name:** Project Katch-Up  
**Team Name:** Squadra Pomodoro  
**Team Lead:** Dylan (`@Dylan`)

---

## Overview & AI Policy Compliance Statement

This repository utilizes Generative AI tools (e.g., Gemini, ChatGPT, Claude, GitHub Copilot) in compliance with course AI guidelines. AI tools are used for code scaffolding, SQL migration generation, test suite generation, and documentation drafting. All AI-generated code is reviewed, refactored for Object-Oriented Programming (OOP) design standards, and verified via automated test suites prior to PR approval.

---

## Entry 1: Prototype 1 — Project Scaffolding & Initial Tasks Planning

- **Date:** August 22, 2026
- **Team Member:** Michael (`@Mfstr`)
- **Tool Used:** Gemini
- **Associated Git Issue:** Closes `#5` (docs: create AI_USAGE_LOG.md template and compliance log)
- **Associated Feature Branch:** `chore/project-setup-and-docs`

### Exact Prompt Submitted:

> "Review my repo and create checklist of what still needs done for Prototype 1: Foundation & Data Layer. Organize this between actionable tasks versus standards for the team to follow, and create GitHub project board issues."

### AI Output Summary & Code Generated:

AI generated a categorized breakdown of Prototype 1 technical deliverables, sprint schedules, Discord communication templates, and structured GitHub Issue bodies.

### Human Review, Refactoring & Modifications Made:

- **Scope Refinement:** Adjusted sprint dates to Sunday deadlines and reorganized workloads across a 3-person team.
- **Rubric Calibration:** Aligned issue tasks with the course deliverables (Docker orchestration, migration lifecycles, static analysis, docstrings).
- **Template Standardization:** Replaced generic AI log format with the professor's official log schema.

### Verification & Testing Method:

- Issues checked into GitHub project board and assigned to team milestones.
- Documented project agreements in repository markdown files.

---
## Entry [X]: Prototype 1 — Pomodoro Timer Unit Tests (TDD Setup)

- **Date:** [Sept. 09, 2026]
- **Team Member:** Ashdon Kice (`@materialsteam13`)
- **Tool Used:** Gemini
- **Associated Git Issue:** Closes `#15` Basic Unit Test
- **Associated Feature Branch:** `feature/timer-units-tests`

### Exact Prompt Submitted:

> "The code for the timer doesn't exist yet, but I was wondering if I can create the unit test for it before it exists? If so how should I go about doing it? Include information about creating a new git branch inside the project and creating a git Pull Request at the end"

### AI Output Summary & Code Generated:

The AI outlined a Test-Driven Development (TDD) "Red-Green-Refactor" workflow specifically tailored to the project stack. It provided:

    Jest test assertions (timer.test.js) testing time formatting (formatTime) and break time calculations (calculateBreakTime).

    Minimal stub implementation code (timer.js) to trigger the initial failing state.

    Guidance on Git branching (git checkout -b feature/timer-unit-tests) and creating Pull Requests on GitHub.

    Diagnostic support to transition Jest to native ES Modules using --experimental-vm-modules and "type": "module" in package.json under Node 22.

### Human Review, Refactoring & Modifications Made:

- **Module Resolution & Architecture:** Configured package.json with "type": "module" and updated the Jest test runner script (node --experimental-vm-modules node_modules/jest/bin/jest.js) to support modern ES import/export syntax without introducing Babel dependencies.
- **Import Paths:** Corrected file path specifiers in tests/timer.test.js to include explicit .js file extensions (import ... from '../src/utils/timer.js') as required by native ES Modules in Node.js.

### Verification & Testing Method:

- Executed npm test inside WSL (Ubuntu) to verify the TDD lifecycle: initial failure (Received: undefined) followed by passing assertions (2 passed, 2 total) once the timer logic was implemented.

- Ran git push -u origin feature/timer-unit-tests to verify repository protection rules and submitted the Pull Request to main.

## Blank Entry Template (Copy for New Entries)

```markdown
## Entry [X]: Prototype 1 — [Feature/Task Name]

- **Date:** [Month Day, Year]
- **Team Member:** [Full Name] (`@[github_username]`)
- **Tool Used:** [e.g., Gemini, ChatGPT, GitHub Copilot, Claude]
- **Associated Git Issue:** Closes `#[Issue Number]` ([Issue Title])
- **Associated Feature Branch:** `[branch-name]`

### Exact Prompt Submitted:

> "[Paste the exact text of your prompt here]"

### AI Output Summary & Code Generated:

[Brief summary of what the AI produced or suggested]

### Human Review, Refactoring & Modifications Made:

- **[Category 1]:** [Specific change made to improve OOP design, naming, types, etc.]
- **[Category 2]:** [Security, error handling, or architecture adjustments]

### Verification & Testing Method:

- [Command run, unit test executed, or CI build run verifying functionality]
```
