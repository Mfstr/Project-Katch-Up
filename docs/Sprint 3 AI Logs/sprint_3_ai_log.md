# AI Usage & Verification Log

**Project Name:** Project Katch-Up  
**Team Name:** Squadra Pomodoro  
**Team Lead:** Dylan (`@Dylan`)

---

## Overview & AI Policy Compliance Statement

This repository utilizes Generative AI tools (e.g., Gemini, ChatGPT, Claude, GitHub Copilot) in compliance with course AI guidelines. AI tools are used for code scaffolding, SQL migration generation, test suite generation, and documentation drafting. All AI-generated code is reviewed, refactored for Object-Oriented Programming (OOP) design standards, and verified via automated test suites prior to PR approval.

---

## Entry 1: Prototype 3 — Task Management CRUD & Soft Deletion Pattern

- **Date:** October 17, 2026
- **Team Member:** Michael Foster (`@Mfstr`)
- **Tool Used:** Gemini
- **Associated Git Issue:** Closes `#37` (Epic 4: Implement Task Management CRUD & Soft Delete)
- **Associated Feature Branch:** `feature/37-task-management-endpoints`

### Exact Prompt Submitted:

> "In a RESTful Node.js/PostgreSQL application, what are the best practices for implementing soft deletion over hard deletion for user tasks? Specifically, how should API endpoints handle HTTP response codes for soft deletes (e.g., 200 vs 204), and what index strategies prevent slow queries when filtering out `deleted_at IS NOT NULL` across growing tables?"

### AI Output Summary & Code Generated:

The AI outlined standard database patterns for soft deletion. It explained that `200 OK` (with the updated record status) or `204 No Content` are standard depending on client needs, and recommended partial indexing (`CREATE INDEX ... WHERE deleted_at IS NULL`) in PostgreSQL so that read queries filtering active records remain performant as soft-deleted rows accumulate.

### Human Review, Refactoring & Modifications Made:

- **Service Layer Architecture:** Handled the database interaction inside `backend/src/taskService.ts`, implementing custom SQL update queries that set `deleted_at = new Date().toISOString()` instead of executing SQL `DELETE`.
- **Query Hardening:** Manually updated all task retrieval and query endpoints to enforce `WHERE deleted_at IS NULL` to prevent data leakage.
- **Unit & Integration Testing:** Wrote test suites in `backend/tests/taskService.test.js` and `backend/tests/integration/api.integration.test.js` validating that soft-deleted tasks return 404 on single-item retrieval but remain intact in the database table.

### Verification & Testing Method:

- Executed `npm test backend/tests/taskService.test.js` and verified soft deletion sets timestamps without deleting rows.
- Tested endpoints using curl to confirm `DELETE /api/tasks/:id` returns `204` and subsequent `GET /api/tasks` omits the deleted task.

---

## Entry 2: Prototype 3 — Pomodoro Session Telemetry & Analytic Schema

- **Date:** October 24, 2026
- **Team Member:** Michael Foster (`@Mfstr`)
- **Tool Used:** Gemini
- **Associated Git Issue:** Closes `#41` (Task 1.2: Expand Database Schema for Pomodoro Analytics)
- **Associated Feature Branch:** `feat/database-schema-analytics`

### Exact Prompt Submitted:

> "We are designing a database schema in PostgreSQL/Supabase to log Pomodoro focus sessions so that we can build productivity insights and trend analysis later. What specific metrics should a telemetry table capture to measure planned vs actual session time and interruptions without over-complicating the schema?"

### AI Output Summary & Code Generated:

The AI recommended capturing categorical session types (`focus`, `short_break`, `long_break`), integer durations for planned vs actual seconds, a boolean flag for interruption tracking, and foreign key references linking records to user profiles and optional task IDs.

### Human Review, Refactoring & Modifications Made:

- **Migration Authoring:** Handled schema definitions myself, writing the SQL migration creating `pomodoro_sessions` with appropriate `uuid`, `foreign key` constraints, and default timestamps.
- **Data Integrity:** Added SQL `CHECK` constraints to ensure `planned_duration_seconds` and `actual_duration_seconds` are positive integers.
- **Service Layer Alignment:** Updated TypeScript database interfaces to enforce strong typing across timer and session logging endpoints.

### Verification & Testing Method:

- Applied the migration against the local database container and verified schema structure using `\d pomodoro_sessions` in `psql`.
- Verified foreign key cascade behavior by creating and soft-deleting test records.

---

## Entry 3: Prototype 3 — Intelligent Task Selection Algorithm

- **Date:** November 01, 2026
- **Team Member:** Michael Foster (`@Mfstr`)
- **Tool Used:** Gemini
- **Associated Git Issue:** Closes `#87` (Task 1.1: Implement Intelligent Task Selection Algorithm)
- **Associated Feature Branch:** `feature/87-intelligent-task-selection`

### Exact Prompt Submitted:

> "In Supabase / PostgreSQL query building using the JavaScript SDK, how can I construct an efficient query to select the single most urgent task for a user? Specifically, I need to filter out completed and soft-deleted items, sort primarily by due date ascending, and ensure tasks with NULL due dates appear at the end of the list rather than the beginning."

### AI Output Summary & Code Generated:

Gemini explained the `.order()` options in the Supabase query builder, specifically using `{ ascending: true, nullsFirst: false }` to push null deadline tasks to the end of the priority queue, combined with `.eq('is_complete', false)` and `.is('deleted_at', null)`.

### Human Review, Refactoring & Modifications Made:

- **Algorithm Implementation:** Authored `getNextTask()` in `backend/src/taskService.ts`, incorporating the query logic while adding fallback handling in case no active deadlines exist.
- **Endpoint Exposition:** Exposed the `GET /api/tasks/next` route in `backend/src/index.ts` with authenticated user context.
- **Edge-Case Testing:** Wrote unit tests in `backend/tests/taskService.test.js` asserting correct ordering when tasks have past deadlines, same-day deadlines, and null deadlines.

### Verification & Testing Method:

- Executed `npm test backend/tests/taskService.test.js` to ensure sorting edge cases pass.
- Sent `GET /api/tasks/next` requests with a test JWT to verify the earliest deadline is returned.

---

## Entry 4: Prototype 3 — Container Liveness & Readiness Health Probes

- **Date:** November 01, 2026
- **Team Member:** Michael Foster (`@Mfstr`)
- **Tool Used:** Gemini
- **Associated Git Issue:** Closes `#105` (Task 5.1: Implement Liveness and Readiness Probes)
- **Associated Feature Branch:** `feature/105-liveness-readiness-probes`

### Exact Prompt Submitted:

> "What is the industry standard difference between a liveness probe (`/healthz` or `/livez`) and a readiness probe (`/readyz`) in microservices? When implementing these in an Express app that connects to a database like Supabase/PostgreSQL, what lightweight check should be done on the readiness endpoint to verify DB connectivity without overloading the database?"

### AI Output Summary & Code Generated:

The AI explained that liveness probes indicate whether the process is alive (restarting the container if failed), whereas readiness probes indicate whether the service is ready to accept incoming traffic (removing it from load balancers if failed). For readiness, it suggested running a shallow query like `SELECT 1` or a lightweight head check on the client.

### Human Review, Refactoring & Modifications Made:

- **Service Architecture:** Created `backend/src/healthService.ts` from scratch to encapsulate probe checks and system uptime reporting.
- **Type Safety & Status Mapping:** Defined explicit TypeScript return types (`ReadinessStatus`) and ensured transient errors return HTTP `503 Service Unavailable` with diagnostic JSON without crashing the Node process.
- **Routing & Tests:** Mounted `/livez` and `/readyz` in `backend/src/index.ts` and wrote isolated unit tests in `backend/tests/healthService.test.js` simulating both connected and disconnected database states.

### Verification & Testing Method:

- Ran `npm test backend/tests/healthService.test.js` verifying 100% coverage on probe endpoints.
- Tested locally via `curl -i http://localhost:5050/readyz` to verify `200 OK` with database status reported as `connected`.

---

## Entry 5: Prototype 3 — Feature Flag Middleware Architecture

- **Date:** November 03, 2026
- **Team Member:** Michael Foster (`@Mfstr`)
- **Tool Used:** Gemini
- **Associated Git Issue:** Closes `#89` (Task 1.3: Implement Feature Flag Middleware)
- **Associated Feature Branch:** `feature/89-feature-flag-middleware-resolved`

### Exact Prompt Submitted:

> "I want to implement a route-level feature flag middleware in Express with TypeScript that reads toggle flags from environment variables. What is the recommended HTTP status code to return when a feature is disabled (is 503 Service Unavailable or 404 Not Found preferred?), and what is the standard higher-order function pattern to wrap routes cleanly without polluting route handlers?"

### AI Output Summary & Code Generated:

The AI discussed REST conventions, explaining that HTTP `503 Service Unavailable` with an informative JSON payload is preferred for temporarily disabled features, while `404` is typically reserved for non-existent routes. It provided a conceptual explanation of a higher-order middleware factory pattern that accepts an environment variable name and returns an Express `(req, res, next)` handler.

### Human Review, Refactoring & Modifications Made:

- **Type Safety & Parsing:** Built `backend/src/featureFlag.ts` from scratch, adding robust boolean string parsing (handling `'true'`, `'1'`, case-insensitivity, and fallback defaults).
- **Architecture & Error Standardization:** Structured the middleware to return a sanitized JSON error response (`{ error: "Feature disabled", message: "..." }`) and integrated it into the Express routing table in `backend/src/index.ts`.
- **Comprehensive Testing:** Manually authored unit and integration tests in `backend/tests/featureFlag.test.js` and `backend/tests/integration/api.integration.test.js`, testing enabled flags, disabled flags, missing environment variables, and bypass behavior.

### Verification & Testing Method:

- Ran `node --experimental-vm-modules node_modules/jest/bin/jest.js backend/tests/featureFlag.test.js` confirming all unit test assertions pass.
- Verified route behavior using `curl -i http://localhost:5050/api/calendar` with `ENABLE_CALENDAR=false` to verify the `503 Service Unavailable` response.

---

## Entry 6: Prototype 3 — Graceful Server Termination & Connection Draining

- **Date:** November 05, 2026
- **Team Member:** Michael Foster (`@Mfstr`)
- **Tool Used:** Gemini
- **Associated Git Issue:** Closes `#105` (fix: server graceful shutdown on SIGINT and SIGTERM)
- **Associated Feature Branch:** `feat/backend-supabase-integration`

### Exact Prompt Submitted:

> "In a Node.js/Express service deployed in Docker or automated CI runners, what is the best-practice pattern to handle POSIX termination signals (SIGINT and SIGTERM)? Specifically, how do I ensure inflight HTTP requests finish draining through server.close() while preventing the process from hanging indefinitely if a keep-alive socket stays open?"

### AI Output Summary & Code Generated:

Gemini outlined the standard Node.js termination lifecycle: binding `process.on('SIGTERM', ...)` and `process.on('SIGINT', ...)`, invoking `http.Server.close()`, and using a safety fallback timeout with `.unref()` so the process exits cleanly if sockets do not terminate within a designated grace period.

### Human Review, Refactoring & Modifications Made:

- **Environment Isolation:** Integrated the shutdown handler directly into `backend/src/index.ts`, ensuring it is strictly wrapped inside `if (process.env.NODE_ENV !== 'test')` so test runners (Jest/Supertest) are not interrupted.
- **Structured Logging:** Replaced standard console output with our Pino `logger.info()` call to maintain structured JSON output during container shutdown.
- **Resource Management:** Added an unreferenced 1-second forced exit timer to prevent hung worker processes during automated test teardown and CI runs.

### Verification & Testing Method:

- Started the server locally with `npm --prefix backend run dev` and issued `kill -SIGINT <pid>` and `kill -SIGTERM <pid>`, verifying the console logs `Shutting down server gracefully...` and terminates with status code 0.
- Executed `npm test` to ensure integration tests shut down without leaving open handles.

---

## Entry 7: Prototype 3 — Critical Function Documentation & JSDoc/TSDoc Standards

- **Date:** November 05, 2026
- **Team Member:** Michael Foster (`@Mfstr`)
- **Tool Used:** Gemini
- **Associated Git Issue:** Closes `#114` (Task 9.1: Comprehensive JSDoc/TSDoc Annotations for Critical Functions)
- **Associated Feature Branch:** `feature/114-jsdoc-tsdoc-annotation`

### Exact Prompt Submitted:

> "What is the recommended specification syntax for documenting asynchronous service functions in TypeScript using TSDoc vs traditional JSDoc? Specifically, how should `@throws`, `@param`, and `@returns` tags be structured for functions interacting with an external database client (like Supabase) to ensure automated IDE hints display both resolved types and potential rejection errors?"

### AI Output Summary & Code Generated:

The AI detailed the TSDoc standard supported by TypeScript language tooling. It explained that `@param` should document parameter purpose without redundant type assertions (which TypeScript infers), `@returns` should detail the resolved Promise payload structure, and `@throws` should enumerate known CustomError or PostgrestError instances that callers must handle.

### Human Review, Refactoring & Modifications Made:

- **Service Layer Annotations:** Manually documented critical service functions across `backend/src/authService.ts`, `backend/src/calendarService.ts`, `backend/src/taskService.ts`, `backend/src/pomodoroLogic.ts`, `backend/src/healthService.ts`, and `backend/src/insightsService.ts`.
- **Frontend Client Documentation:** Authored thorough JSDoc annotations across `frontend/src/services/apiClient.js` documenting expected query arguments, JWT header injection, and API response contracts.
- **Linter Alignment:** Formatted all comment blocks to adhere to strict ESLint and TypeScript docstring rules.

### Verification & Testing Method:

- Executed `npm --prefix backend run typecheck` confirming zero documentation or type check discrepancies.
- Executed `npm run lint` across the repository to verify that all comment blocks pass formatting and linting rules cleanly.
