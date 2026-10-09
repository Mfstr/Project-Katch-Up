## Entry [1]: Prototype 2 — [Backend Tests]

- **Date:** [Oct 03, 2026]
- **Team Member:** [Ashdon Kice] (`@materialsteam13`)
- **Tool Used:** Gemini
- **Associated Git Issue:** Closes `#42` (Write Tasks API Integration Test & Coverage Limits)
- **Associated Feature Branch:** `test: add comprehensive unit test suite for authService.ts`

### Exact Prompt Submitted:

> "I'm looking at what backend tests I should add to my senior design project. In our backend we have  "authService.ts" "calendarService.ts" "icalParser.ts" "index.ts" "supabaseClient.ts" and "taskService.ts", which of these should I make tests for? "

### AI Output Summary & Code Generated:

Priotize authService.ts, then taskService.ts & calendarService.ts, and lastly icalParser.ts. The supabaseClient.ts doesn't normally require a dedicated test file, instead the authService and taskService will mock or interact with it. Lastly, index.ts can have integration tests written using supertest to hit your API endpoints.

### Human Review, Refactoring & Modifications Made:

- **[Category 1]:** Reviewed Prototype 2 requirements and compared tasks.

### Verification & Testing Method:

- N/A

## Entry [2]: Prototype 2 — [Backend Tests]

- **Date:** [Oct 04, 2026]
- **Team Member:** [Ashdon Kice] (`@materialsteam13`)
- **Tool Used:** Gemini
- **Associated Git Issue:** Closes `#42` (Write Tasks API Integration Test & Coverage Limits)
- **Associated Feature Branch:** `test: add comprehensive unit test suite for authService.ts`

### Exact Prompt Submitted:

> "When I run npm test authService.test.js I get this error:
npm test authService.test.js

> project-katch-up@1.0.0 test
> node --experimental-vm-modules node_modules/jest/bin/jest.js authService.test.js

ts-jest[config] (WARN) message TS151001: If you have issues related to imports, you should consider setting `esModuleInterop` to `true` in your TypeScript configuration file (usually `tsconfig.json`). See blogs.msdn.microsoft.com/typescript/2018/01/31/announcing-typescript-2-7/#easier-ecmascript-module-interoperability for more information.
(node:45331) ExperimentalWarning: VM Modules is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
 FAIL  backend/tests/authService.test.js
  Auth Service
    registerUser
      ✕ successfully registers a user when valid credentials are provided (2 ms)
      ✕ throws an error when registration fails
    loginUser
      ✕ successfully logs in a user with correct credentials
      ✕ throws an error when login fails

  ● Auth Service › registerUser › successfully registers a user when valid credentials are provided

    TypeError: supabase.auth.signUp.mockResolvedValueOnce is not a function

      24 |             
      25 |             // Directly target the imported mock function
    > 26 |             supabase.auth.signUp.mockResolvedValueOnce({ data: mockUser, error: null });
         |                                  ^
      27 |
      28 |             const result = await registerUser('test@example.com', 'securePassword123');
      29 |

      at Object.<anonymous> (backend/tests/authService.test.js:26:34)

  ● Auth Service › registerUser › throws an error when registration fails

    TypeError: supabase.auth.signUp.mockResolvedValueOnce is not a function

      38 |             const mockError = { message: 'User already registered' };
      39 |             
    > 40 |             supabase.auth.signUp.mockResolvedValueOnce({ data: null, error: mockError });
         |                                  ^
      41 |
      42 |             await expect(
      43 |                 registerUser('test@example.com', 'short')

      at Object.<anonymous> (backend/tests/authService.test.js:40:34)

  ● Auth Service › loginUser › successfully logs in a user with correct credentials

    TypeError: supabase.auth.signInWithPassword.mockResolvedValueOnce is not a function

      50 |             const mockSession = { session: { access_token: 'fake-jwt-token' }, user: { id: '123' } };
      51 |             
    > 52 |             supabase.auth.signInWithPassword.mockResolvedValueOnce({ data: mockSession, error: null });
         |                                              ^
      53 |
      54 |             const result = await loginUser('test@example.com', 'securePassword123');
      55 |

      at Object.<anonymous> (backend/tests/authService.test.js:52:46)

  ● Auth Service › loginUser › throws an error when login fails

    TypeError: supabase.auth.signInWithPassword.mockResolvedValueOnce is not a function

      64 |             const mockError = { message: 'Invalid login credentials' };
      65 |             
    > 66 |             supabase.auth.signInWithPassword.mockResolvedValueOnce({ data: null, error: mockError });
         |                                              ^
      67 |
      68 |             await expect(
      69 |                 loginUser('wrong@example.com', 'wrongpassword')

      at Object.<anonymous> (backend/tests/authService.test.js:66:46)

Test Suites: 1 failed, 1 total
Tests:       4 failed, 4 total
Snapshots:   0 total
Time:        1.008 s, estimated 2 s
Ran all test suites matching authService.test.js."

### AI Output Summary & Code Generated:

This is an ESM mocking issue. jest.mock() doesn't hoist and replace static ES module imports the way it does in CommonJS. As a result authService.js is using the real Supabase client whose methods aren't jest mocks. Register the mock with jest.unstable_mockModule() before dynamically importing either module.

* Gave first 10 lines of code for the file showing how to line up jest.unstable_mockModule() *

### Human Review, Refactoring & Modifications Made:

- **[Category 1]:** Visited jestjs.io and read through a guide on jest.unstable_mockModule(). 
- **[Category 2]:** Reviewed code to follow logic before implementing.

### Verification & Testing Method:

- Ran npm test on the individual file
- Ran npm run lint to check for any linting issues

## Entry [3]: Prototype 2 — [Backend Tests]

- **Date:** [Oct 04, 2026]
- **Team Member:** [Ashdon Kice] (`@materialsteam13`)
- **Tool Used:** Gemini
- **Associated Git Issue:** Closes `#42` (Write Tasks API Integration Test & Coverage Limits)
- **Associated Feature Branch:** `test: add comprehensive unit test suite for authService.ts`

### Exact Prompt Submitted:

> "Working on my authService.test.js file I got this error code:
npm test authService.test.js

> project-katch-up@1.0.0 test
> node --experimental-vm-modules node_modules/jest/bin/jest.js authService.test.js

ts-jest[config] (WARN) message TS151001: If you have issues related to imports, you should consider setting `esModuleInterop` to `true` in your TypeScript configuration file (usually `tsconfig.json`). See https://blogs.msdn.microsoft.com/typescript/2018/01/31/announcing-typescript-2-7/#easier-ecmascript-module-interoperability for more information.
 FAIL  backend/tests/authService.test.js
  ● Test suite failed to run

    Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment.

       6 |
       7 | if (!supabaseUrl || !supabaseKey) {
    >  8 |     throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment.');
         |           ^
       9 | }
      10 |
      11 | export const supabase = createClient(supabaseUrl, supabaseKey);

      at Object.<anonymous> (backend/src/supabaseClient.ts:8:11)
      at Object.<anonymous> (backend/src/authService.ts:1:1)

Test Suites: 1 failed, 1 total
Tests:       0 total
Snapshots:   0 total
Time:        1.057 s
Ran all test suites matching authService.test.js.
(node:42990) ExperimentalWarning: VM Modules is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)"

### AI Output Summary & Code Generated:

Jest automatically hoists jest.mcok() calls, but because of ESM module resolution order in TypeScript, supabaseCLient.ts is still getting evaluated before the mock takes effect. You have 2 options to fix this:

Provide the environment variables in a jest.setup.js
Or
Update supabaseClient.ts to allow missing envs during tests

*Gave me a sample of jest.setup.js and shows how it connects to jest.config*

### Human Review, Refactoring & Modifications Made:

- **[Category 1]:** Weighed options of changing backend code vs updating testing. Decided to update testing to include jest.setup.js
- **[Category 2]:** Reviewed code to follow logic before implementing.

### Verification & Testing Method:

- npm test authService.test.js
- npm run lint
- npm run test