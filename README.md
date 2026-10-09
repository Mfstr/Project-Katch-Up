# Project Katch-Up

> A unified productivity platform combining multi-source task aggregation with an integrated Pomodoro focus timer.

---

## Table of Contents
- [Project Overview](#project-overview)
- [Quick Start & Setup](#quick-start--setup)
- [Testing Endpoints Locally](#testing-endpoints-locally)
- [Environment Configuration](#environment-configuration)
- [Development & Git Standards](#development--git-standards)
- [License](#license)

---

## Project Overview

**Project Katch-Up** bridges the gap between task management and focused execution. Instead of context-switching between disjointed to-do lists and standalone timer apps, Katch-Up centralizes tasks into a unified backlog and pairs them directly with structured focus sessions.

### Core Feature Set
* **Task Aggregation Engine:** Collects, organizes, and prioritizes tasks across distinct workspaces and tags.
* **Integrated Pomodoro Focus Timer:** Customizable work/break intervals with session binding to specific tasks.
* **Focus Analytics & Session Logs:** Real-time metrics tracking task completion rates, focus duration, and break adherence.

---

## Quick Start & Setup

### Prerequisites
* [Node.js](https://nodejs.org/) (v20 LTS or later)
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) (v24.0+)
* [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started) (Installed globally or via npx)

### Single-Command Launch (Recommended)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Mfstr/Project-Katch-Up.git
   cd Project-Katch-Up
   ```

2. **Initialize environment variables:**
   ```bash
   cp .env.example .env
   ```
   *Note: Update the `.env` with the URL and Anon Key provided by the Supabase CLI in the next step.*

3. **Start the Local Supabase Environment (Database, API, Auth):**
   ```bash
   npx supabase start
   ```
   *(This automatically spins up the Supabase stack in Docker and seeds dummy data into your local database).*

4. **Start the Backend Server:**
   ```bash
   cd backend
   npm install
   npm run dev
   ```

5. **Start the Frontend Client:**
   Open a new terminal window:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

6. **Access the application:**
   * **Web Client:** `http://localhost:5173`
   * **Local Backend API:** `http://localhost:5050`
   * **Local Supabase Studio:** `http://localhost:54323` (Manage your local DB & users here)

### Testing Endpoints Locally

### Timer Routes (Requires Auth Token)

**Start Timer**
```bash
curl -X POST http://localhost:5050/api/timer/start \
  -H "Authorization: Bearer <token>"
```

**Pause Timer**
```bash
curl -X POST http://localhost:5050/api/timer/pause \
  -H "Authorization: Bearer <token>"
```

**Stop/Complete Timer**
```bash
curl -X POST http://localhost:5050/api/timer/complete \
  -H "Authorization: Bearer <token>"
```

**Reset Timer**
```bash
curl -X POST http://localhost:5050/api/timer/reset \
  -H "Authorization: Bearer <token>"
```

### Calendar Routes (Requires Auth Token)

**Sync Calendar**
```bash
curl -X POST http://localhost:5050/api/calendars/123/sync \
  -H "Authorization: Bearer <token>"
```

---

## Environment Configuration

Copy `.env.example` to `.env` in the root directory before running the application.

| Variable Name | Type | Default Value | Description |
| --- | --- | --- | --- |
| `SUPABASE_URL` | String | `http://127.0.0.1:54321` | The REST API URL of your Supabase project |
| `SUPABASE_ANON_KEY` | String | `your_local_anon_key` | The anonymous publishable key |
| `PORT` | Number | `5050` | The backend Express server port |

---

## Development & Git Standards

### Branching Strategy

All work must originate from an up-to-date `main` branch using structured naming prefixes:

* `feature/<issue-number>-<short-description>`: New application features (e.g., `feature/12-pomodoro-timer-state`)
* `bugfix/<issue-number>-<short-description>`: Fixes for reported issues (e.g., `bugfix/34-fix-task-drag-drop`)
* `chore/<short-description>`: Build tasks, tooling, or dependency updates (e.g., `chore/docker-compose-tuning`)
* `docs/<short-description>`: Documentation changes (e.g., `docs/update-api-spec`)

### Commit Message Conventions

Commits must follow the **Conventional Commits** specification:

```
<type>(<optional scope>): <description>

[optional body]

[optional footer(s)]
```

#### Common Types

* `feat`: A new user-facing feature or API endpoint.
* `fix`: A bug fix.
* `docs`: Documentation modifications only.
* `refactor`: Code changes that neither fix a bug nor add a feature.
* `test`: Adding missing unit, integration, or E2E tests.
* `chore`: Tooling, build scripts, or package manager updates.

#### Examples

```bash
git commit -m "feat(timer): implement auto-pause on window blur"
git commit -m "fix(db): handle unique constraint collision on user registration"
git commit -m "chore(deps): bump pg driver to v8.11.0"
```

### Pull Request & Review Workflow

1. **Pull Request Creation:**
   * Target branch must always be `main`.
   * Fill out all required fields in the PR template (linked issue, description, verification steps).

2. **Automated Checks:**
   * All PRs must pass linting (`npm run lint`), type-checking (`npm run typecheck`), and unit test suites before merge.

3. **Peer Review:**
   * At least **one approving review** from a team member is required.
   * Address all comments directly or resolve open discussions before requesting re-review.

4. **Merge Method:**
   * Use **Squash and Merge** to maintain a linear and clean `main` history.

---

## License

Distributed under the MIT License. See `LICENSE` for more information.
## System Architecture

To understand the high-level system architecture, you can refer to the following diagrams:
- [Database Entity-Relationship Diagram (ERD)](docs/architecture/database-erd.png) - Represents the Supabase database schema (`profiles`, `tasks`, `calendar`, `pomodoro_sessions`).
- [UML Component Data Flow Diagram](docs/architecture/component-diagram.png) - Illustrates the interaction and data flow between the React frontend, Express API Server backend, and Supabase.
