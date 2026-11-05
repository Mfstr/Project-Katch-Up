# AI Usage & Verification Log

**Project Name:** Project Katch-Up  
**Team Name:** Squadra Pomodoro  
**Team Lead:** Dylan (`@Dylan`)

---

## Overview & AI Policy Compliance Statement

This repository utilizes Generative AI tools (e.g., Gemini, ChatGPT, Claude, GitHub Copilot) in compliance with course AI guidelines. AI tools are used for code scaffolding, SQL migration generation, test suite generation, and documentation drafting. All AI-generated code is reviewed, refactored for Object-Oriented Programming (OOP) design standards, and verified via automated test suites prior to PR approval.

---

## Entry 1: Prototype 3 — k6 Load Testing

- **Date:** Nov 1, 2026
- **Team Member:** Ashdon Kice (`@materialsteam13`)
- **Tool Used:** Gemini
- **Associated Git Issue:** Closes `#110` (Configure k6 Load testing scripts)
- **Associated Feature Branch:** `test/k6-load-testing`

### Exact Prompt Submitted:

> "Looking at what I have left to tackle.

 - E2E Tests, Finalizing Logout for the Auth journey (waiting on other devs)
 - E2E Test Smart Pomodoro Timer
 - E2E tests Task Creation/Deletion (error with supabase needing to work out)
 - k6 Load Testing
 - Load Test and Document Latencies 


What is the best order of operations here for time efficiency and is there anything I can write ahead of the front end? Even if my teammates can't get everything done before the due date I want to have as much as possible. Due date Thursday "

### AI Output Summary & Code Generated:

Gemini recommended focusing on the k6 Load testing & Latency documentation first since it wouldn't require any additions to our frontend UI. It broke down an action plan to start with the k6 script targeting core endpoints, then run the laod test locally, and exporting the metrics into a markdown file.

Next it recommended setting up the Smart Pomodoro Timer E2E tests. It recommended writing a timer.spec.js using API seeding or existing dashboard elements to simulate starting and pausing the timer cycle.

Lastly, it recommended finalizing the E2E tests for Task Creation/Deletion and Logout E2E tests. This is because there wasn't a way to log out in the current version and the task creation with a generated user account was causing a foreign key issue.

### Human Review, Refactoring & Modifications Made:

- **Human review:** Double checked with my running open issues to make sure everything was included.

### Verification & Testing Method:

- N/A

---

## Entry 2: Prototype 3 — k6 Load Testing

- **Date:** Nov 4, 2026
- **Team Member:** Ashdon Kice (`@materialsteam13`)
- **Tool Used:** Gemini
- **Associated Git Issue:** Closes `#110` (Configure k6 Load testing scripts)
- **Associated Feature Branch:** `test/k6-load-testing`

### Exact Prompt Submitted:

> "should I use k6 test with ramping users for a website, or should I test with a large amount at once?"

### AI Output Summary & Code Generated:

AI suggested to split my k6 tests into a ramp test and a spike test. This would require 2 different files, one that gradually builds users and another that spikes user counts.

It recommended commands for files:
```bash
k6 run  load-tests/ramp-test.js
k6 run load-tests/spike-test.js
```
Then generated the spike-test.js file to show the difference between how they would look. Emphasis on stages with durations to show the build up versus spikes.
### Human Review, Refactoring & Modifications Made:

- **Human review:** Followed code differences in the stages: [], section.
- **Refactoring:** Updated code for local host URL and set thresholds to 95.

### Verification & Testing Method:

- **Testing:** Ran npm run test, npm run lint
- **Verification:** Made sure output showed tests passing and criteria met for team recommended standards.

---

## Entry 3: Prototype 3 — k6 Load Testing

- **Date:** Nov 4, 2026
- **Team Member:** Ashdon Kice (`@materialsteam13`)
- **Tool Used:** Gemini
- **Associated Git Issue:** Closes `#110` (Configure k6 Load testing scripts)
- **Associated Feature Branch:** `test/k6-load-testing`

### Exact Prompt Submitted:

> "Take this output from the k6 tests and interpret them into a LATENCY_REPORT.md log to go inside my Test Logs. *Copied and pasted the command line output from the tests from ramp-test.js and spike-test.js"

### AI Output Summary & Code Generated:

AI generated the LATENCY_LOAD_TESTING_REPORT.md filled out with metrics listed in the bash outputs.

### Human Review, Refactoring & Modifications Made:

- **Read:** Read through text to confirm accuracy.
- **Numbers:** Skimmed majority of numbers to check against output screen for accurate numbers.

### Verification & Testing Method:

- N/A

---