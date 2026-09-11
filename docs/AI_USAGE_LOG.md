# AI Usage Log

## Entry 1: Prototype 1 — Database & Docker Orchestration

- **Date:** August 28, 2026
- **Team Member:** Michael Foster (`@Mfstr`)
- **Tool Used:** Gemini
- **Associated Git Issue:** Closes `#1` (Set up Local PostgreSQL via Docker)
- **Associated Feature Branch:** `feature/database-setup-script`

### Exact Prompt Submitted:

> "I am setting up a local development environment for my Node.js backend using PostgreSQL and Docker Compose. I want to automatically run my schema and seed SQL files when the container starts for the first time. What is the standard way to map initialization scripts into a postgres container without mounting my entire local directory?"

### AI Output Summary & Code Generated:

Gemini explained the `/docker-entrypoint-initdb.d/` directory mechanism built into the official Postgres image. It provided a sample `docker-compose.yml` snippet demonstrating how to use read-only volume binds (`:ro`) to map local `.sql` files directly into that directory.

### Human Review, Refactoring & Modifications Made:

- **Security & Portability:** I took the AI's volume mapping concept but completely rewrote the compose file to include a named volume (`docker_db_data`) so data persists between restarts. 
- **Configuration:** I added a healthcheck block to ensure the database is fully ready to accept connections before any backend services attempt to connect to it.

### Verification & Testing Method:

- Executed `docker compose up -d db` and monitored `docker compose logs db` to verify that `01_up.sql` and `02_seed.sql` executed in sequential order successfully.

---

## Entry 2: Prototype 1 — Express Timer API Endpoints

- **Date:** September 3, 2026
- **Team Member:** Michael Foster (`@Mfstr`)
- **Tool Used:** Gemini
- **Associated Git Issue:** Closes `#3` (Implement Timer Start/Stop Routes)
- **Associated Feature Branch:** `feature/timer-API-endpoints`

### Exact Prompt Submitted:

> "I am migrating my Express server to use ES Modules (`type: module` in package.json) instead of CommonJS. I am getting ReferenceErrors when trying to use `require()` and `module.exports`. Can you provide a quick reference on how to properly export and import an Express Router using ES modules?"

### AI Output Summary & Code Generated:

The AI provided a brief syntax reference explaining that `import express from 'express';` replaces `require('express')`, and `export default router;` replaces `module.exports = router;`. It provided a 5-line boilerplate router file.

### Human Review, Refactoring & Modifications Made:

- **Architecture:** I used the syntax knowledge to restructure my entire backend. I manually extracted the monolithic routing logic from `index.js` into modular files (`routes/timerRoutes.js` and `routes/calendarRoutes.js`).
- **Error Handling:** I implemented `try/catch` blocks within the asynchronous route handlers to ensure standard `500` HTTP status codes are returned on failure, preventing unhandled promise rejections.

### Verification & Testing Method:

- Spun up the server via `node index.js` and executed the `curl` commands documented in the README to verify standard `200 OK` JSON responses.

---

## Entry 3: Prototype 1 — CI/CD Secret Scanning (Trufflehog)

- **Date:** September 10, 2026
- **Team Member:** Michael Foster (`@Mfstr`)
- **Tool Used:** GitHub Copilot / Gemini
- **Associated Git Issue:** Closes `#23` (Implement Secret Scanning in GitHub Actions)
- **Associated Feature Branch:** `chore/automate-ci`

### Exact Prompt Submitted:

> "I need to add a secret scanner to my GitHub repository. How can I run TruffleHog using GitHub Actions on all pull requests targeting the develop branch?"

### AI Output Summary & Code Generated:

The AI provided a basic YAML configuration using the `trufflesecurity/trufflehog@main` GitHub Action, showing how to trigger it `on: pull_request`.

### Human Review, Refactoring & Modifications Made:

- **Pipeline Optimization:** I took the baseline workflow and manually configured the `base` and `head` arguments dynamically using `${{ github.event.repository.default_branch }}` and `HEAD`. This ensures TruffleHog only scans the git diff of the specific pull request rather than scanning the entire repository history on every push, saving GitHub Action compute minutes.
- **Workflow configuration:** Adjusted the extra_args to strictly include `--only-verified` to prevent the workflow from failing on false positive secrets.

### Verification & Testing Method:

- Opened a test Pull Request on GitHub and verified the Actions runner successfully spawned the TruffleHog container and passed the diff scan successfully.

---

## Entry 4: Prototype 1 — Project Documentation (README)

- **Date:** September 10, 2026
- **Team Member:** Michael Foster (`@Mfstr`)
- **Tool Used:** Gemini
- **Associated Git Issue:** Closes `#25` (Create Project Documentation)
- **Associated Feature Branch:** `docs/readme`

### Exact Prompt Submitted:

> "I need to write a comprehensive README.md for my project. What is a standard structure or template for a full-stack open-source project that includes setup instructions, environment variables, and git branching standards?"

### AI Output Summary & Code Generated:

The AI provided a basic Markdown template outlining standard sections like 'Overview', 'Quick Start', 'Environment', and 'License'.

### Human Review, Refactoring & Modifications Made:

- **Content Creation:** I discarded the AI's filler text and fully authored the project overview to specifically describe Project Katch-Up's architecture and task aggregation engine.
- **Onboarding Formatting:** I manually documented the `docker compose` startup commands, built a Markdown table detailing the `DATABASE_URL` environment variables, and established our team's specific Conventional Commits workflow.

### Verification & Testing Method:

- Previewed the Markdown file directly in WebStorm to ensure standard GitHub formatting, tables, and code blocks rendered correctly.
