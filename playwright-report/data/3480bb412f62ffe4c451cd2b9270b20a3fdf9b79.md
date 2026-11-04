# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tasks.spec.js >> Task Management E2E Flow >> should allow a user to open task manager, add a task, view it, and delete it
- Location: backend/tests/e2e/tasks.spec.js:8:3

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/(dashboard)?$/
Received string:  "http://localhost:5173/login"
Timeout: 5000ms

Call log:
  - Expect "toHaveURL" with timeout 5000ms
    14 × locator resolved to <html lang="en">…</html>
       - unexpected value "http://localhost:5173/login"

```

```yaml
- main:
  - heading "Login" [level=1]
  - alert: "Login failed: Invalid login credentials"
  - text: Email
  - textbox "Email": e2e-tester@example.com
  - text: Password
  - textbox "Password": TestPassword123!
  - button "Login"
  - paragraph:
    - text: Don't have an account?
    - link "Register":
      - /url: /register
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Task Management E2E Flow', () => {
  4  |   const testEmail = 'e2e-tester@example.com';
  5  |   const testPassword = 'TestPassword123!';
  6  |   const taskTitle = `E2E Test Task - ${Date.now()}`;
  7  | 
  8  |   test('should allow a user to open task manager, add a task, view it, and delete it', async ({ page }) => {
  9  |     // 1. Log in with an existing dedicated test user account
  10 |     await page.goto('/login'); // Adjust URL if your login route is different (e.g., '/' or '/signin')
  11 |     
  12 |     // If your app logs in directly on the home page or a login page, adjust accordingly:
  13 |     const emailInput = page.locator('input[type="email"]');
  14 |     if (await emailInput.isVisible()) {
  15 |       await emailInput.fill(testEmail);
  16 |       await page.fill('input[type="password"]', testPassword);
  17 |       await page.click('button[type="submit"]:has-text("Sign In"), button[type="submit"]:has-text("Login")');
  18 |     }
  19 | 
  20 |     // Verify successful redirection to dashboard
> 21 |     await expect(page).toHaveURL(/\/(dashboard)?$/);
     |                        ^ Error: expect(page).toHaveURL(expected) failed
  22 | 
  23 |     // 2. Open the task manager panel via the settings trigger button
  24 |     await page.click('.settings-task-trigger');
  25 | 
  26 |     // Wait for the panel and form to become visible
  27 |     const taskInput = page.locator('#new-task-title');
  28 |     await expect(taskInput).toBeVisible();
  29 | 
  30 |     // 3. Fill out the task details and submit while waiting for the API response
  31 |     await taskInput.fill(taskTitle);
  32 |     
  33 |     const [response] = await Promise.all([
  34 |       page.waitForResponse(res => res.url().includes('/api/tasks') && (res.status() === 201 || res.status() === 200)),
  35 |       page.click('.task-manager-add-button'),
  36 |     ]);
  37 | 
  38 |     expect(response.ok()).toBeTruthy();
  39 | 
  40 |     // 4. Close the task manager panel
  41 |     await page.click('.task-manager-close');
  42 | 
  43 |     // 5. Verify the task appears in the dashboard task list
  44 |     const taskCardTitle = page.locator('.task-card-title', { hasText: taskTitle });
  45 |     await expect(taskCardTitle).toBeVisible();
  46 | 
  47 |     // 6. Delete the task using the dashboard's delete button
  48 |     const taskListItem = page.locator('.task-list-item', { has: taskCardTitle });
  49 |     const deleteButton = taskListItem.locator('.task-delete-button');
  50 |     await deleteButton.click();
  51 | 
  52 |     // 7. Verify the task is successfully removed from the DOM
  53 |     await expect(taskCardTitle).not.toBeVisible();
  54 |   });
  55 | });
```