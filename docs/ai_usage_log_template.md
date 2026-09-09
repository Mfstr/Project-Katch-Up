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
## Entry [X]: Prototype 1 — [Feature/Task Name]

- **Date:** [Sept 09, 2026]
- **Team Member:** [Ashdon Kice] (`@materialsteam13`)
- **Tool Used:** Duck.ai (GPT 5.6)
- **Associated Git Issue:** Closes `#14` ([Linter & CI/CD Pipeline])
- **Associated Feature Branch:** `chore/ci-linter`

### Exact Prompt Submitted:

> "I'm working on the linter for CI/CD on my senior design project using GitHub. Is there a way to set this up using GitHub actions and will I be doing that
> in the website or on a file to commit to our GitHub? "

### AI Output Summary & Code Generated:

The Linter process for the CI/CD would be made in a yaml file that would be commited to our GitHub repo. To do so I needed to create a new branch in GitHub
and create a lint.yml file that would include a trigger to run on Pull Requests.

### Human Review, Refactoring & Modifications Made:

- **Organize:** Instead of having a floating file called lint.yml I set up a folder within our github that would contain all the workflows for similar files.
- **Designated versions:** Set our lint.yml to run on ubuntu-latest while we develop in WSL and Ubuntu, had node version set to 20.

### Verification & Testing Method:

- npm run lint was used to test the lint test. Only flagged issue was not connected to React.

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
