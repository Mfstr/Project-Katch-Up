## Entry [1]: Prototype 2 — [chore/GitHubAction-for-SecurityAudits-&-Dependabot]

- **Date:** [Sept 13, 2026]
- **Team Member:** Ashdon Kice (`@materialsteam13`)
- **Tool Used:** Gemini
- **Associated Git Issue:** Closes `#43` (Task 7.1 GitHub Action for Security Audtis & Dependabot)
                            Closes `#44` (Task 7.2 GitHub Action for Linting & Tests)
- **Associated Feature Branch:** `chore/GitHubAction-for-SecurityAudits-&-Dependabot`

### Exact Prompt Submitted:

> "My head dev gave me this list to break down what needs down for the next prototype. Can I start working on Task 7.1 and 7.2 right away or does something else need down before I should begin making them?

# Midterm Alpha Release Schedule & Issues (v0.5.0-alpha)

This document contains fully fleshed-out Git Issues based on the project's core goal: an intelligent, frictionless study session application using React, TypeScript, and Supabase.

---## Epic 1: Supabase Database & TypeScript Alignment### Task 1.1: Fix `tasks` table constraints in Supabase**User Story:** As a backend developer, I need the database schema to accurately reflect data relationships so that a single user can have multiple tasks.**Description:** The current Supabase schema applies a `UNIQUE` constraint on `tasks.profile_id`, inadvertently limiting users to a single task. Furthermore, dates require precision.**Acceptance Criteria:*** [ ] The `UNIQUE` constraint is removed from `tasks.profile_id`.* [ ] The `due_date` column type is updated from `time` to `timestamp with time zone`.**Technical Notes:** Run the following in the Supabase SQL editor: `ALTER TABLE public.tasks DROP CONSTRAINT tasks_profile_id_key;`### Task 1.2: Expand Database Schema for Soft-Delete & Future Analytics**User Story:** As a data privacy advocate, I want records to be soft-deleted. As a data scientist, I need Pomodoro sessions logged in detail today so that we have historical data for the "Smart Insights" engine in the future.**Acceptance Criteria:*** [ ] A `deleted_at` (timestamp, nullable) column is added to `tasks`, `calendar`, and `profiles`.* [ ] A new `pomodoro_sessions` table is created.**Technical Notes:*** **Future-proofing for Smart Insights:** The `pomodoro_sessions` table must capture *planned* vs *actual* behavior.* **Columns:** `id` (uuid PK), `profile_id` (FK), `task_id` (FK), `session_type` (VARCHAR: 'focus', 'short_break', 'long_break'), `planned_duration_seconds` (int), `actual_duration_seconds` (int), `was_interrupted` (boolean), `created_at` (timestamp).### Task 1.3: Generate/Define TypeScript Interfaces for Supabase**User Story:** As a backend developer, I want type safety when querying the database so I can catch schema mismatch errors at compile time.**Acceptance Criteria:*** [ ] A `backend/src/types/supabase.ts` file exists with exported interfaces for `profiles`, `tasks`, `calendar`, and `pomodoro_sessions`.**Technical Notes:** Use the Supabase CLI to auto-generate these types.### Task 1.4: Configure Backend Supabase Client**User Story:** As a developer, I need the Express backend connected to Supabase so that API endpoints can perform database CRUD operations.**Acceptance Criteria:*** [ ] `backend/src/utils/db.ts` exports a configured Supabase client using `@supabase/supabase-js`.

---## Epic 2: Intelligent Features & Calendar Aggregation (Core Value)### Task 2.1: Implement iCal/ics Parsing Engine (Backend)**User Story:** As a student, I want to provide a link to my university/personal calendar so that my deadlines are automatically imported into the app.**Acceptance Criteria:*** [ ] `POST /api/calendar/sync` endpoint exists, accepting an `ical_url`.* [ ] Uses the `node-ical` library to fetch and parse the live calendar feed.* [ ] Upserts the parsed events into the `tasks` or `calendar` table in Supabase.**Technical Notes:** Ensure duplicate events aren't created on consecutive syncs.### Task 2.2: Implement Intelligent Task Selection Algorithm (Backend)**User Story:** As a user, I want the system to automatically pick what I should work on next so I don't waste time suffering from decision fatigue.**Acceptance Criteria:*** [ ] `GET /api/tasks/next` endpoint exists.* [ ] Queries the `tasks` table for incomplete tasks, ordering by `due_date ASC` (soonest first).* [ ] Returns the single most urgent task to the client.### Task 2.3: Build "Smart Focus" UI (Frontend)**User Story:** As a user, I want a one-click button to start studying immediately against my most urgent deadline.**Acceptance Criteria:*** [ ] React UI includes a prominent "Start Smart Session" button.* [ ] Clicking it fetches `/api/tasks/next` and automatically populates the Pomodoro timer with that task's details.

---## Epic 3: User Authentication & Security (OWASP)### Task 3.1: Implement Registration Endpoint (TS)**User Story:** As a new user, I want to create an account so that I can save my tasks and timer settings.**Acceptance Criteria:*** [ ] `POST /api/auth/register` endpoint exists and registers the user via `supabase.auth.signUp()`.**Technical Notes:** Supabase natively handles the Bcrypt/Argon2 hashing requirement securely.### Task 3.2: Implement Login Endpoint (TS)**User Story:** As a returning user, I want to log in so that I can access my private data.**Acceptance Criteria:*** [ ] `POST /api/auth/login` endpoint authenticates via `supabase.auth.signInWithPassword()` and returns the JWT token.### Task 3.3: Create JWT Verification Middleware**User Story:** As a security auditor, I want protected routes to require a valid token so that unauthorized users cannot access private APIs.**Acceptance Criteria:*** [ ] `verifyToken.ts` Express middleware is created, verifying the JWT using `supabase.auth.getUser(token)`.### Task 3.4: Implement Global Rate Limiting & HTTP Security**User Story:** As a DevOps engineer, I need the API protected from brute-force and XSS attacks to pass the OWASP audit.**Acceptance Criteria:*** [ ] `helmet` and `cors` are configured in `index.ts`.* [ ] `express-rate-limit` is applied (e.g., max 10 requests/min for auth routes).

---## Epic 4: Core MVP Backend Logic (CRUD)### Task 4.1: Implement Task Management Endpoints (TS)**User Story:** As a user, I want to manually create, view, and update tasks so that I can manage ad-hoc work outside of my calendar.**Acceptance Criteria:*** [ ] `GET /api/tasks` endpoint fetches tasks (excluding those where `deleted_at IS NOT NULL`).* [ ] `POST /api/tasks` endpoint inserts a new task.* [ ] `PUT /api/tasks/:id` endpoint updates task details (e.g., setting `is_complete = true`).### Task 4.2: Implement `DELETE /api/tasks/:id` (Soft Delete)**User Story:** As a user, I want to delete a task safely without permanently wiping the database record.**Acceptance Criteria:*** [ ] Endpoint updates the `tasks` record by setting `deleted_at = NOW()` instead of hard-deleting the row.

---## Epic 5: Environment Toggles & Error Handling### Task 5.1: Implement Feature Flag Middleware**User Story:** As a product manager, I want incomplete features disabled in production so that users don't encounter broken flows.**Acceptance Criteria:*** [ ] A reusable middleware function can wrap routes (e.g., `app.use('/api/calendar', featureFlag('ENABLE_CALENDAR'))`). Returns `503` if disabled via `.env`.### Task 5.2: Implement Centralized Error Handling**User Story:** As a security auditor, I need to ensure the API never leaks stack traces to the client so that internal architecture remains hidden (PII/Security).**Acceptance Criteria:*** [ ] Global error handler added to the Express pipeline. Returns sanitized JSON `{ error: "Internal Server Error" }` to the client while logging the full trace internally.

---## Epic 6: Automated Integration Testing### Task 6.1: Write Auth Flow Integration Test (Jest/Supertest)**User Story:** As a QA engineer, I want automated tests covering login/registration so that auth isn't accidentally broken in future PRs.**Acceptance Criteria:*** [ ] Test successfully registers a mock user, logs them in, and asserts the presence of a JWT token in the response.### Task 6.2: Write Tasks API Integration Test & Coverage Limits**User Story:** As a reviewer, I want to ensure test coverage is strictly enforced before merging code.**Acceptance Criteria:*** [ ] Test covers creating, fetching, and soft-deleting a task.* [ ] `jest.config.js` is updated to enforce a `60%` global coverage threshold.

---## Epic 7: CI/CD & Supply Chain Security### Task 7.1: GitHub Action for Security Audits & Dependabot**User Story:** As a DevSecOps engineer, I want vulnerable dependencies blocked from entering the codebase.**Acceptance Criteria:*** [ ] `.github/dependabot.yml` is committed.* [ ] `.github/workflows/security.yml` runs `npm audit --audit-level=high` on every Pull Request and fails on vulnerabilities.### Task 7.2: GitHub Action for Linting & Tests**User Story:** As a team lead, I want code quality automatically verified on every PR so I don't have to manually check formatting.**Acceptance Criteria:*** [ ] `.github/workflows/ci.yml` runs `npm run lint` and `npm test`, integrating a tool like SonarCloud/CodeClimate for complexity limits.

---## Epic 8: Frontend Scaffolding & React MVP### Task 8.1: Scaffold React Application & API Client**User Story:** As a frontend dev, I need the base React app configured so that I can start building pages and talking to the backend.**Acceptance Criteria:*** [ ] React initialized in `/frontend` with `react-router-dom` for `/login`, `/register`, and `/dashboard`.* [ ] `apiClient.js` automatically pulls the JWT from `localStorage` and appends it to outgoing requests.### Task 8.2: Build Dashboard & Pomodoro Timer Components**User Story:** As a user, I want a visual interface to manage my tasks and run focus sessions.**Acceptance Criteria:*** [ ] Dashboard fetches and displays a list of tasks.* [ ] Timer component handles the default 20/5 workflow (4 cycles, 15m long break).* [ ] Timer includes Play/Pause/Stop controls that sync session data to the backend.

---## Epic 9: Documentation & Administration### Task 9.1: Generate Visual Architecture Diagrams**User Story:** As a project evaluator, I need to see a high-level view of the system architecture to understand how pieces connect.**Acceptance Criteria:*** [ ] Database ERD diagram exported as an image.* [ ] UML Component diagram showing React -> Express -> Supabase data flow.### Task 9.2: Create Issue Templates and AI Log**User Story:** As a team lead, I want standardized issue creation and AI tracking to adhere to grading rubrics.**Acceptance Criteria:*** [ ] `.github/ISSUE_TEMPLATE/` populated with Bug and Feature Request templates.* [ ] `AI_USAGE_LOG.md` created with a structured table format.### Task 9.3: Establish Structured AI Log Directory & Convention**User Story:** As a project lead, I want a standardized AI logging structure organized by project and sprint, with files named by feature branch and developer name, so that we maintain complete transparency and traceability of AI usage across all development phases.**Acceptance Criteria:*** [ ] Directory structure created under `docs/ai-logs/` (or root project tracking directory) supporting `projects/{project_name}/sprint-{sprint_number}/`.* [ ] Naming convention enforced: `{feature-branch}_{developer-name}.md` (e.g., `feature-auth-endpoints_michaelfoster.md`).* [ ] A template markdown file is provided in the base directory to guide team members on logging prompts, code modifications, and outcomes.

---"

### AI Output Summary & Code Generated:

AI stated Tasks 7.1 and 7.2 can be started right away since we have already built much of the underlying infrasctructure for Task 7.2.

Task 7.1 (Security Audits & Dependabot): You can implement this immediately. It requires no application features—it only needs .github/dependabot.yml created in your repository and a security workflow file that executes npm audit --audit-level=high.

Task 7.2 (Linting & Tests CI): You have already completed the primary components of this task by configuring your ESLint flat file, writing Jest tests, and building out the GitHub Actions workflow. To fully satisfy the acceptance criteria, you just need to ensure your active CI workflow runs npm run lint and npm test cleanly on pull requests targeting develop.

And recommended a checklist before starting including: checking package.json and making sure I had git pull done recently.

Gemini gave sample files for dependabot.yml and security.yml that looked like:
dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "daily"
    open-pull-requests-limit: 10

security.yml
name: Security Audit

on:
  pull_request:
    branches: [develop]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Run npm Audit
        run: npm audit --audit-level=high

### Human Review, Refactoring & Modifications Made:

- **Git Pull and File Check:** Made sure I was on the most recent version of the repo. Made sure package.json defined lint and test.
- **Updated Versions and intervals:** I changed the run interval of dependabot to weekly and updated the node-version to 22 to match our standard.
- **Streamlining and Updates to CI.yml** I went back and updated the files and ci.yml to include calls to the seperate tests.

### Verification & Testing Method:

- Executed npm install and npm run lint, and npm test locally to resolve missing dependency modules (prelude-ls) and verify clean syntax before pushing updates to the remote repository.