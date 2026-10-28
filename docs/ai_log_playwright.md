# AI Usage & Verification Log

**Project Name:** Project Katch-Up  
**Team Name:** Squadra Pomodoro  
**Team Lead:** Dylan (`@Dylan`)

---

## Overview & AI Policy Compliance Statement

This repository utilizes Generative AI tools (e.g., Gemini, ChatGPT, Claude, GitHub Copilot) in compliance with course AI guidelines. AI tools are used for code scaffolding, SQL migration generation, test suite generation, and documentation drafting. All AI-generated code is reviewed, refactored for Object-Oriented Programming (OOP) design standards, and verified via automated test suites prior to PR approval.

---

## Entry [1]: Prototype 1 — [Feature/Task Name]

- **Date:** [Oct 27, 2026]
- **Team Member:** Ashdon Kice (`@materialsteam13`)
- **Tool Used:** Gemini
- **Associated Git Issue:** Closes `107` (Task 6.1: E2E Testing Framework)
- **Associated Feature Branch:** `test/Playwright_E2E`

### Exact Prompt Submitted:

> "I want to tackle a new task tonight, Task 6.2 Setup E2E testing framework: Install Playwright and set up npm run e2e test command. What are the terminal commands to download and setup Playwright? "

### AI Output Summary & Code Generated:

Gemini outputed bash scripts for npm install and playwright install with dependencies. It outputed a sample file for playwright.config in typescript with temp data for directory, port numbers, and recommened adding a section to automatically start the frontend server before running tests. Lastly it gave me note to update package.json to include test:e2e.

### Human Review, Refactoring & Modifications Made:

- **Human Review:** Reviewed code outline for mistakes.
- **Refactoring:** Rewrote code in JavaScript to match my other tests.
- **Modifications:** Updated the temp data to match our port numbers, the directory I set up, and included the webServer section recommended. 

### Verification & Testing Method:

- Ran npm run test to see if it messed with other files.
- Ran npm run test:e2e and checked the created file to see if test returned any issues.
- Ran npm run lint to check for any linting errors.

---

## Entry [2]: Prototype 1 — [Feature/Task Name]

- **Date:** [Oct 27, 2026]
- **Team Member:** Ashdon Kice (`@materialsteam13`)
- **Tool Used:** Gemini
- **Associated Git Issue:** Closes `107` (Task 6.1: E2E Testing Framework)
- **Associated Feature Branch:** `test/Playwright_E2E`

### Exact Prompt Submitted:

> "Can you make a Playwright read me file that explains how to run the end 2 end tests and add a section for updates for each time in the future I add something to it "

### AI Output Summary & Code Generated:

Gemini outputed a structed readme that shows where files are, prerequisites to running the tests, what the commands are, and a quick guide for adding new tests in the future. That last part also includes a section for versions to note future updates.

### Human Review, Refactoring & Modifications Made:

- **Human Review:** Reviewed guide grammar before copying.
- **Human Review:** Compared commands to those our team runs.

### Verification & Testing Method:

- Markdown file, no tests run.
