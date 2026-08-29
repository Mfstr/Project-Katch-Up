# Project Katch-Up

> A unified productivity platform combining multi-source task aggregation with an integrated Pomodoro focus timer.

---

## Table of Contents
- [Project Overview](#project-overview)
- [Quick Start & Setup](#quick-start--setup)
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

### Single-Command Launch (Recommended)

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/your-org/project-katch-up.git](https://github.com/your-org/project-katch-up.git)
   cd project-katch-up
   ```

2. **Initialize environment variables:**
   ```bash
   cp .env.example .env
   ```

3. **Start all services:**
   > **TODO:** Docker Compose configuration and containerized startup script in progress.

4. **Access the application:**
   * **Web Client:** `http://localhost:3000`
   * **API Gateway / Health Check:** `http://localhost:4000/api/health`

---

## Environment Configuration

Copy `.env.example` to `.env` in the root directory before running the application.

| Variable Name | Type | Default Value | Description |
| --- | --- | --- | --- |
| `DATABASE_URL` | String | `postgresql://postgres:postgres@db:5432/katchup_dev` | PostgreSQL connection string |

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