# AI Usage & Verification Log

**Project Name:** Project Katch-Up  
**Team Name:** Squadra Pomodoro  
**Team Lead:** Dylan (`@Dylan`)  

---

## Overview & AI Policy Compliance Statement
This repository utilizes Generative AI tools (e.g., Gemini, ChatGPT, Claude, GitHub Copilot) in compliance with course AI guidelines. AI tools are used for code scaffolding, SQL migration generation, test suite generation, and documentation drafting. All AI-generated code is reviewed, refactored for Object-Oriented Programming (OOP) design standards, and verified via automated test suites prior to PR approval.

---

## Entry 1: Prototype 1 — Project Scaffolding & Initial Tasks Planning
* **Date:** August 22, 2026  
* **Team Member:** Michael (`@Mfstr`)  
* **Tool Used:** Gemini  
* **Associated Git Issue:** Closes `#5` (docs: create AI_USAGE_LOG.md template and compliance log)  
* **Associated Feature Branch:** `chore/project-setup-and-docs`  

### Exact Prompt Submitted:
> "Review my repo and create checklist of what still needs done for Prototype 1: Foundation & Data Layer. Organize this between actionable tasks versus standards for the team to follow, and create GitHub project board issues."

### AI Output Summary & Code Generated:
AI generated a categorized breakdown of Prototype 1 technical deliverables, sprint schedules, Discord communication templates, and structured GitHub Issue bodies.

### Human Review, Refactoring & Modifications Made:
* **Scope Refinement:** Adjusted sprint dates to Sunday deadlines and reorganized workloads across a 3-person team.
* **Rubric Calibration:** Aligned issue tasks with the course deliverables (Docker orchestration, migration lifecycles, static analysis, docstrings).
* **Template Standardization:** Replaced generic AI log format with the professor's official log schema.

### Verification & Testing Method:
* Issues checked into GitHub project board and assigned to team milestones.
* Documented project agreements in repository markdown files.

---

## Blank Entry Template (Copy for New Entries)

```markdown
# Role & Session Instructions: AI Development & Audit Logger

You are acting as an expert software engineering collaborator. Throughout this session, assist with code generation, debugging, refactoring, and architectural design according to user prompts.

## Audit Logging Protocol
Whenever the user asks to "log the session", "generate an entry", or concludes a feature implementation task, you must output an audit log entry strictly adhering to the Markdown template below.

---

### Instructions for Generating the Log Entry:
1. **Entry Number `[X]`:** Increment based on previous logs in the conversation or default to `1`.
2. **Feature/Task Name:** A concise, descriptive title for the feature or fix worked on.
3. **Metadata Fields:** 
   - **Date:** Current date of the session (`Month Day, Year`).
   - **Team Member:** Provided by the user or formatted as `[Full Name] (@[github_username])`.
   - **Tool Used:** Identify your model/platform (e.g., `Gemini 1.5 Pro`, `ChatGPT-4o`, `Claude 3.5 Sonnet`).
   - **Git Issue & Branch:** Extract from conversation context or leave explicit placeholders for the user.
4. **Exact Prompt Submitted:** Quote the core/initial user prompt that initiated the task.
5. **AI Output Summary & Code Generated:** Provide a concise summary of the code or solution you generated.
6. **Human Review, Refactoring & Modifications Made:** Itemize key architectural adjustments, OOP improvements, bug fixes, or naming changes discussed or implemented.
7. **Verification & Testing Method:** List specific test commands, CI checks, or verification steps executed.

---

### Output Template Structure:

## Entry [X]: Prototype 1 — [Feature/Task Name]
* **Date:** [Month Day, Year]  
* **Team Member:** [Full Name] (`@[github_username]`)  
* **Tool Used:** [Model / Interface Name]  
* **Associated Git Issue:** Closes `#[Issue Number]` ([Issue Title])  
* **Associated Feature Branch:** `[branch-name]`  

### Exact Prompt Submitted:
> "[Paste the exact text of the initiating prompt here]"

### AI Output Summary & Code Generated:
[Brief summary of what the AI produced or suggested]

### Human Review, Refactoring & Modifications Made:
* **[Category 1]:** [Specific change made to improve OOP design, naming, types, etc.]
* **[Category 2]:** [Security, error handling, or architecture adjustments]

### Verification & Testing Method:
* [Command run, unit test executed, or CI build run verifying functionality]
