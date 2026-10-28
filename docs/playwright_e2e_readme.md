# End-to-End (E2E) Testing Guide with Playwright
This document outlines how to set up, execute, and extend end-to-end (E2E) tests for Project Katch-Up using **Playwright**.

---

## Prerequisites
Before running E2E tests locally, ensure your environment and local services are running:

1. **Node.js** dependencies installed:
   ```bash
   npm install
   ```
2. **Supabase** local instance active:
   ```bash
   npx supabase start
   ```

> **Note:** Playwright's configuration automatically handles booting the frontend dev server (`npm --prefix frontend run dev`). If you already have your frontend server running locally, Playwright will reuse that running instance.

---

## Test Location & Structure
All E2E test files are written in JavaScript and located under the backend test directory:

```
backend/tests/e2e/
├── app.spec.js           # Smoke test verifying baseline site loads
└── [future-spec-files]  # New test suites will be added here
```

---

## Running Tests

### 1. Run All E2E Tests (Headless Mode)
Runs all tests silently in the background using the configured Chromium browser.
```bash
npm run test:e2e
```

### 2. Run Tests in Interactive UI Mode
Opens Playwright's interactive visual interface. Ideal for debugging, step-by-step execution, and DOM inspection.
```bash
npm run test:e2e:ui
```

### 3. View Last HTML Report
If a test fails or you want a full summary report:
```bash
npx playwright show-report
```

---

## Adding New Tests & Features (Future Changelog)

Use the templates below to record new E2E test additions as features are built out.

---

### [Template] Adding New Test Files

When adding a new E2E test suite:
1. Create a new file in `backend/tests/e2e/<feature-name>.spec.js`.
2. Follow standard Playwright ESM structure:
   ```javascript
   // @ts-check
   import { test, expect } from '@playwright/test';

   test.describe('Feature Name E2E Tests', () => {
     test('should perform expected user action', async ({ page }) => {
       await page.goto('/');
       // Perform actions & assertions
     });
   });
   ```

---

## Test Suite Changelog

### 🟢 Version 1.0 - Initial Setup & Smoke Test
- **Date:** October 2026
- **Added:** Initial Playwright configuration (`playwright.config.js`).
- **Tests Configured:** `backend/tests/e2e/app.spec.js`
- **Scope:** Verifies that the application loads successfully and matches the project title.

---

### ⚪ Version 1.1 - [Upcoming Feature]
*Status: Pending*
- **Date:** TBD
- **Added:** 
- **Tests Configured:** 
- **Scope:** 