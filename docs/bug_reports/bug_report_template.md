# Bug Report Template

This file gives a description of the order of which to report a bug.

## Instructions

1. **Copy this template into a file titled "mmddyyyy_whatIsBroken"**
```
---
name: Bug report
about: Report something that isn't working as expected
title: "[Bug]: "
labels: bug
assignees: ""
---

## Describe the bug
A clear, concise description of what went wrong.

## Steps to reproduce
1. Go to '...'
2. Click '...'
3. Enter '...'
4. Observe the issue

## Expected behavior
What did you expect to happen?

## Actual behavior
What happened instead?

## Environment
- App version or commit:
- Browser/device:
- Operating system:
- Relevant environment (local, staging, production):

## Screenshots or logs
Add screenshots or relevant error messages. Remove secrets, tokens, and personal data before posting.

## Additional context
Anything else that may help diagnose the issue.
```

2. **Fill out above text and save into docs/bug_reports**

3. **Commit Bug Report on current branch**
    ```bash
    git commit -m "bug/bugDescription"
    ```

4. **Fixing Bugs**
    - Create a branch off of the bugged branch
    ```bash
    git checkout -b "bugFix/buggedBranch_issue"
    ```
    - Fix the bug
    - Create a Pull Request and make sure the merge points to the bugged branch