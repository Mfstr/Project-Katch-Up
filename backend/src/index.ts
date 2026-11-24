import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request, Response, NextFunction } from 'express';
import { PomodoroTimer } from './pomodoroLogic.js';
import { addCalendar, listCalendars, deleteCalendar, syncCalendarById } from './calendarService.js';
import { softDeleteTask, getNextTask, getAllTasks, createTask, updateTask } from './taskService.js';
import { registerUser, loginUser, logoutUser, refreshUserSession } from './authService.js';
import {
  getTimerInsights,
  applyRecommendation,
  recordSession,
  getUserSessions,
  getUserPreferences,
} from './insightsService.js';
import { verifyToken } from './verifyToken.js';
import { featureFlag } from './featureFlag.js';
import { logger, httpLogger } from './logger.js';
import { checkReadiness } from './healthService.js';
import { assertPublicHttpUrl, UnsafeUrlError } from './safeFetch.js';

// ===========================================================================
// Process-Level Safety Nets (Catch unhandled background crashes)
// ===========================================================================
process.on('unhandledRejection', (reason: unknown) => {
  console.error('[Fatal] Unhandled Promise Rejection detected:', reason);
  // In a full production environment, you might initiate a graceful shutdown here
});

process.on('uncaughtException', (error: Error) => {
  console.error('[Fatal] Uncaught Synchronous Exception detected:', error);
  // Perform synchronous cleanup if needed before exiting
  process.exit(1);
});

const app = express();
app.disable('x-powered-by');

// Render (like most hosts) puts one reverse proxy in front of the app. Trusting it makes req.ip the
// real client address, so rate limits apply per visitor instead of to everyone at once.
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS ?? 1));

// Only the deployed frontend (and local dev) may call the API from a browser.
// Set CORS_ORIGINS to a comma-separated list, e.g. "https://project-katch-up.vercel.app".
const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Requests without an Origin header (curl, health checks, server-to-server) are not browser CORS requests.
      callback(null, !origin || allowedOrigins.includes(origin));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  }),
);
app.use(express.json({ limit: '100kb' }));
app.use(httpLogger);

// General per-visitor limit for the whole API (generous: the UI makes a handful of calls per action).
app.use(
  '/api',
  rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many requests, please slow down.' },
  }),
);

/** Logs the real error server-side and returns a generic message so internal details never reach clients. */
const sendServerError = (res: Response, err: unknown, context: string): void => {
  logger.error({ err }, context);
  res.status(500).json({ error: 'Internal Server Error' });
};

const MAX_TITLE_LENGTH = 500;
const MAX_TEXT_LENGTH = 5000;

/** Copies only the task fields a client is allowed to set. Ownership always comes from the verified token. */
const pickTaskFields = (body: Record<string, unknown>): Record<string, unknown> => {
  const allowed = ['title', 'description', 'due_date', 'dueDate', 'is_complete', 'isComplete'];
  const picked: Record<string, unknown> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) picked[key] = body[key];
  }
  return picked;
};

/** Returns an error message if user-editable task text fields are malformed, otherwise null. */
const validateTaskText = (fields: Record<string, unknown>): string | null => {
  if (fields['title'] !== undefined && (typeof fields['title'] !== 'string' || fields['title'].length > MAX_TITLE_LENGTH)) {
    return `title must be a string of at most ${MAX_TITLE_LENGTH} characters.`;
  }
  if (
    fields['description'] !== undefined &&
    fields['description'] !== null &&
    (typeof fields['description'] !== 'string' || fields['description'].length > MAX_TEXT_LENGTH)
  ) {
    return `description must be a string of at most ${MAX_TEXT_LENGTH} characters.`;
  }
  return null;
};

// ---------------------------------------------------------------------------
// Health Routes (unauthenticated; used by the host and to wake a sleeping free instance)
// ---------------------------------------------------------------------------
app.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'project-katch-up-api' });
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.get('/api/health/ready', async (_req: Request, res: Response) => {
  const readiness = await checkReadiness();
  const { error: _detail, ...publicStatus } = readiness; // eslint-disable-line @typescript-eslint/no-unused-vars
  res.status(readiness.status === 'ready' ? 200 : 503).json(publicStatus);
});

const getToken = (req: Request): string | undefined => (req as Request & { token?: string }).token;

const userTimers = new Map<string, PomodoroTimer>();

export function getTimerForUser(profileId: string): PomodoroTimer {
  let userTimer = userTimers.get(profileId);
  if (!userTimer) {
    userTimer = new PomodoroTimer();
    userTimers.set(profileId, userTimer);
  }
  return userTimer;
}

// ---------------------------------------------------------------------------
// Pomodoro Timer Routes
// ---------------------------------------------------------------------------
app.use('/api/timer', verifyToken);

app.post('/api/timer/start', (req: Request, res: Response) => {
  const profileId = req.user?.id ?? 'default';
  const userTimer = getTimerForUser(profileId);
  const { taskId, durationSeconds } = req.body ?? {};
  const endTime = userTimer.start({
    taskId: typeof taskId === 'number' ? taskId : undefined,
    durationSeconds: typeof durationSeconds === 'number' ? durationSeconds : undefined,
  });
  res.json({ message: 'Timer started.', endTime });
});

app.post('/api/timer/pause', (req: Request, res: Response) => {
  const profileId = req.user?.id ?? 'default';
  const userTimer = getTimerForUser(profileId);
  const remainingSeconds = userTimer.pause();
  res.json({ message: 'Timer paused.', remainingSeconds });
});

app.post('/api/timer/complete', async (req: Request, res: Response) => {
  try {
    const profileId = req.user?.id ?? 'default';
    const userTimer = getTimerForUser(profileId);
    const nextPhase = userTimer.complete();
    const completedSession = userTimer.getLastCompletedSession();

    let recordedSession = null;
    if (completedSession && profileId !== 'default') {
      try {
        recordedSession = await recordSession(profileId, completedSession, getToken(req));
      } catch (dbErr) {
        logger.error({ err: dbErr }, 'Failed to record completed session in database');
      }
    }

    res.json({ message: 'Phase complete.', nextPhase, session: recordedSession });
  } catch (err: unknown) {
    sendServerError(res, err, 'Error completing timer phase');
  }
});

app.post('/api/timer/reset', async (req: Request, res: Response) => {
  try {
    const profileId = req.user?.id ?? 'default';
    const userTimer = getTimerForUser(profileId);
    const interruptedSession = userTimer.reset();

    let recordedSession = null;
    if (interruptedSession && profileId !== 'default') {
      try {
        recordedSession = await recordSession(profileId, interruptedSession, getToken(req));
      } catch (dbErr) {
        logger.error({ err: dbErr }, 'Failed to record interrupted session in database');
      }
    }

    res.json({ message: 'Timer reset.', session: recordedSession });
  } catch (err: unknown) {
    sendServerError(res, err, 'Error resetting timer');
  }
});

app.get('/api/timer/status', (req: Request, res: Response) => {
  const profileId = req.user?.id ?? 'default';
  const userTimer = getTimerForUser(profileId);
  res.json(userTimer.getStatus());
});

app.get('/api/timer/insights', async (req: Request, res: Response) => {
  try {
    const profileId = req.user!.id;
    const days = req.query['days'] ? parseInt(String(req.query['days']), 10) : 7;
    const insights = await getTimerInsights(profileId, isNaN(days) ? 7 : days, new Date(), getToken(req));
    res.json(insights);
  } catch (err: unknown) {
    sendServerError(res, err, 'Error generating timer insights');
  }
});

app.post('/api/timer/insights/apply', async (req: Request, res: Response) => {
  try {
    const profileId = req.user!.id;
    const { target, value, action } = req.body ?? {};
    const applyTarget = target ?? action?.target;
    const applyValue = value ?? action?.value;

    if (!applyTarget || applyValue === undefined) {
      res.status(400).json({ error: 'target and value are required to apply insight recommendation.' });
      return;
    }

    const result = await applyRecommendation(profileId, { target: applyTarget, value: applyValue }, getToken(req));
    res.json({ message: 'Recommendation applied successfully.', ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (/^(Invalid preference target|Value must be)/.test(message)) {
      res.status(400).json({ error: message });
      return;
    }
    sendServerError(res, err, 'Error applying insight recommendation');
  }
});

app.post('/api/timer/sessions', async (req: Request, res: Response) => {
  try {
    const profileId = req.user!.id;
    const session = await recordSession(profileId, req.body ?? {}, getToken(req));
    res.status(201).json(session);
  } catch (err: unknown) {
    sendServerError(res, err, 'Error recording pomodoro session');
  }
});

app.get('/api/timer/sessions', async (req: Request, res: Response) => {
  try {
    const profileId = req.user!.id;
    const limit = req.query['limit'] ? parseInt(String(req.query['limit']), 10) : 100;
    const sessions = await getUserSessions(profileId, isNaN(limit) ? 100 : limit, getToken(req));
    res.json(sessions);
  } catch (err: unknown) {
    sendServerError(res, err, 'Error retrieving pomodoro sessions');
  }
});

app.get('/api/timer/preferences', async (req: Request, res: Response) => {
  try {
    const profileId = req.user!.id;
    const preferences = await getUserPreferences(profileId, getToken(req));
    res.json(preferences);
  } catch (err: unknown) {
    sendServerError(res, err, 'Error retrieving timer preferences');
  }
});

app.put('/api/timer/preferences', async (req: Request, res: Response) => {
  try {
    const profileId = req.user!.id;
    const updates = req.body ?? {};
    const results: Record<string, unknown> = {};

    for (const [key, val] of Object.entries(updates)) {
      if (
        [
          'focusInterval',
          'focus_interval',
          'breakInterval',
          'break_interval',
          'pomodoroCycles',
          'pomodoro_cycles',
        ].includes(key)
      ) {
        const updateRes = await applyRecommendation(profileId, { target: key, value: Number(val) }, getToken(req));
        Object.assign(results, updateRes.updatedSettings);
      }
    }

    res.json({ message: 'Preferences updated successfully.', updatedSettings: results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (/^(Invalid preference target|Value must be)/.test(message)) {
      res.status(400).json({ error: message });
      return;
    }
    sendServerError(res, err, 'Error updating timer preferences');
  }
});

// ---------------------------------------------------------------------------
// Calendar Management Routes
// ---------------------------------------------------------------------------
app.use('/api/calendars', featureFlag('ENABLE_CALENDAR'));
app.use('/api/calendars', verifyToken);

app.get('/api/calendars', async (req: Request, res: Response) => {
  try {
    const profileId = req.user?.id;
    const token = getToken(req);
    const calendars = await (token ? listCalendars(profileId, token) : listCalendars());
    res.json(calendars);
  } catch (err: unknown) {
    sendServerError(res, err, 'Error retrieving calendars');
  }
});

app.post('/api/calendars', async (req: Request, res: Response) => {
  const { url, name, description } = req.body ?? {};
  if (!url || !name || typeof url !== 'string' || typeof name !== 'string') {
    res.status(400).json({ error: 'url and name are required.' });
    return;
  }
  if (url.length > 2048 || name.length > MAX_TITLE_LENGTH || (description !== undefined && description !== null && (typeof description !== 'string' || description.length > MAX_TEXT_LENGTH))) {
    res.status(400).json({ error: 'url, name or description is too long.' });
    return;
  }
  try {
    await assertPublicHttpUrl(url);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid calendar URL.' });
    return;
  }
  try {
    const profileId = req.user?.id;
    const token = getToken(req);
    const calendar = await (token
      ? addCalendar(url, name, description, profileId, token)
      : addCalendar(url, name, description));
    // Auto-sync calendar so tasks are immediately generated upon calendar import
    let syncedTasksCount = 0;
    try {
      syncedTasksCount = await (token
        ? syncCalendarById(calendar.id, profileId, token)
        : syncCalendarById(calendar.id as string));
    } catch (syncErr) {
      logger.warn({ err: syncErr }, 'Initial calendar auto-sync skipped/failed');
    }
    res.status(201).json({ ...calendar, syncedTasksCount });
  } catch (err: unknown) {
    sendServerError(res, err, 'Error adding calendar');
  }
});

app.delete('/api/calendars/:id', async (req: Request, res: Response) => {
  try {
    const profileId = req.user?.id;
    const token = getToken(req);
    await (token
      ? deleteCalendar(req.params['id'] as string, profileId, token)
      : deleteCalendar(req.params['id'] as string));
    res.status(204).send();
  } catch (err: unknown) {
    sendServerError(res, err, 'Error deleting calendar');
  }
});

app.post('/api/calendars/:id/sync', async (req: Request, res: Response) => {
  try {
    const profileId = req.user?.id;
    const token = getToken(req);
    const count = await (token
      ? syncCalendarById(req.params['id'] as string, profileId, token)
      : syncCalendarById(req.params['id'] as string));
    res.json({ message: `Synced ${count} task(s).`, count });
  } catch (err: unknown) {
    if (err instanceof UnsafeUrlError) {
      res.status(400).json({ error: err.message });
      return;
    }
    sendServerError(res, err, 'Error syncing calendar');
  }
});

// ---------------------------------------------------------------------------
// Task Management Routes
// ---------------------------------------------------------------------------
app.use('/api/tasks', verifyToken);

app.get('/api/tasks', async (req: Request, res: Response) => {
  try {
    const profileId = req.user!.id;
    const token = getToken(req);
    const tasks = await (token ? getAllTasks(profileId, token) : getAllTasks(profileId));
    res.json(tasks);
  } catch (err: unknown) {
    sendServerError(res, err, 'Error retrieving tasks');
  }
});

app.get('/api/tasks/next', async (req: Request, res: Response) => {
  try {
    const profileId = req.user?.id;
    const token = getToken(req);
    const task = await (token ? getNextTask(profileId, token) : getNextTask(profileId));

    if (!task) {
      res.status(404).json({ error: 'No upcoming tasks found.' });
      return;
    }

    res.json(task);
  } catch (err: unknown) {
    sendServerError(res, err, 'Error retrieving next task');
  }
});

app.post('/api/tasks', async (req: Request, res: Response) => {
  const { title } = req.body ?? {};
  if (!title || typeof title !== 'string' || !title.trim()) {
    res.status(400).json({ error: 'title is required.' });
    return;
  }

  try {
    const profileId = req.user!.id;
    const fields = pickTaskFields(req.body ?? {});
    const invalid = validateTaskText(fields);
    if (invalid) {
      res.status(400).json({ error: invalid });
      return;
    }
    // The owner is always the authenticated user; a client-supplied profile_id is ignored.
    const taskData = { ...fields, title: (fields['title'] as string).trim(), profile_id: profileId };
    const token = getToken(req);
    const task = await (token ? createTask(taskData, token) : createTask(taskData));
    res.status(201).json(task);
  } catch (err: unknown) {
    sendServerError(res, err, 'Unhandled route error');
  }
});

app.put('/api/tasks/:id', async (req: Request, res: Response) => {
  try {
    const taskId = parseInt(req.params['id'] as string, 10);
    if (isNaN(taskId)) {
      res.status(400).json({ error: 'Invalid task ID' });
      return;
    }

    const updates = pickTaskFields(req.body ?? {});
    const invalid = validateTaskText(updates);
    if (invalid) {
      res.status(400).json({ error: invalid });
      return;
    }
    const token = getToken(req);
    const task = await updateTask(taskId, updates, token, req.user!.id);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    res.json(task);
  } catch (err: unknown) {
    sendServerError(res, err, 'Error updating task');
  }
});

app.delete('/api/tasks/:id', async (req: Request, res: Response) => {
  try {
    const taskId = parseInt(req.params['id'] as string, 10);
    if (isNaN(taskId)) {
      res.status(400).json({ error: 'Invalid task ID' });
      return;
    }
    await softDeleteTask(taskId, getToken(req), req.user!.id);
    res.status(204).send();
  } catch (err: unknown) {
    sendServerError(res, err, 'Error deleting task');
  }
});

// ---------------------------------------------------------------------------
// Auth Routes
// ---------------------------------------------------------------------------

// Per-visitor limit on all auth endpoints. Kept generous because many showcase visitors
// can share one campus Wi-Fi address.
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  message: { error: 'Too many requests, please try again after a minute.' },
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
app.use('/api/auth', authLimiter);

// Per-account limit on password attempts, which stops password guessing even from many addresses.
const loginAttemptLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 10,
  message: { error: 'Too many login attempts for this account. Please wait a few minutes and try again.' },
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    return email ? `login:${email}` : `login-ip:${ipKeyGenerator(req.ip ?? '')}`;
  },
});

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Returns an error message when credentials are malformed, otherwise null. */
const validateCredentials = (email: unknown, password: unknown, isRegistration: boolean): string | null => {
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    return 'email and password are required.';
  }
  if (email.length > 254 || !EMAIL_PATTERN.test(email.trim())) {
    return 'Please enter a valid email address.';
  }
  if (password.length > 72) {
    return 'Password must be at most 72 characters.';
  }
  if (isRegistration && password.length < 8) {
    return 'Password must be at least 8 characters.';
  }
  return null;
};

app.post('/api/auth/register', async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};
  const invalid = validateCredentials(email, password, true);
  if (invalid) {
    res.status(400).json({ error: invalid });
    return;
  }
  try {
    const data = await registerUser(email.trim(), password);
    res.status(201).json(data);
  } catch (err: unknown) {
    logger.warn({ err }, 'User registration failed');
    // Supabase Auth messages here are user-facing (e.g. "User already registered", weak password).
    const message = err instanceof Error ? err.message.replace(/^Registration failed:\s*/, '') : 'Registration failed.';
    res.status(400).json({ error: message || 'Registration failed.' });
  }
});

app.post('/api/auth/login', loginAttemptLimiter, async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};
  const invalid = validateCredentials(email, password, false);
  if (invalid) {
    res.status(400).json({ error: invalid });
    return;
  }
  try {
    const data = await loginUser(email.trim(), password);
    res.status(200).json(data);
  } catch (err: unknown) {
    logger.warn({ err }, 'User login failed');
    const message = err instanceof Error ? err.message : '';
    res.status(401).json({
      error: message.includes('Email not confirmed')
        ? 'Please confirm your email address before logging in.'
        : 'Invalid email or password.',
    });
  }
});

app.post('/api/auth/refresh', async (req: Request, res: Response) => {
  const refreshToken = req.body?.refresh_token;
  if (typeof refreshToken !== 'string' || !refreshToken || refreshToken.length > 1024) {
    res.status(400).json({ error: 'refresh_token is required.' });
    return;
  }
  try {
    const data = await refreshUserSession(refreshToken);
    res.status(200).json(data);
  } catch (err: unknown) {
    logger.warn({ err }, 'Session refresh failed');
    res.status(401).json({ error: 'Session expired. Please log in again.' });
  }
});

app.post('/api/auth/logout', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;
  try {
    const data = await logoutUser(token);
    res.status(200).json(data);
  } catch (err: unknown) {
    // An already-expired session is effectively logged out; the client clears its tokens either way.
    logger.warn({ err }, 'User logout failed');
    res.status(200).json({ message: 'Logged out' });
  }
});

// ---------------------------------------------------------------------------
// Global Error Handling
// ---------------------------------------------------------------------------
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  void _next; // Explicitly mark _next as unused to avoid TypeScript warnings
  // Prevent sending a response if headers were already sent downstream
  if (res.headersSent) {
    return;
  }

  const message = err instanceof Error ? err.message : String(err);

  // Extract custom status codes (e.g., 400, 404, 401) or default to 500
  const rawStatus =
    typeof err === 'object' && err !== null && 'status' in err
      ? Number((err as Record<string, unknown>).status)
      : 500;

  const statusCode = !isNaN(rawStatus) && rawStatus >= 400 && rawStatus < 600 ? rawStatus : 500;

  // Use structured logging instead of console.error
  logger.error({ err, statusCode }, message);

  res.status(statusCode).json({
    error: statusCode === 500 ? 'Internal Server Error' : message,
  });
});

// ---------------------------------------------------------------------------
// Server Init
// ---------------------------------------------------------------------------

const PORT = process.env.PORT ?? 5050;

if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, () => logger.info({ port: PORT }, `Server running on port ${PORT}.`));

  const handleShutdown = () => {
    logger.info('Shutting down server gracefully...');
    server.close(() => {
      process.exit(0);
    });
    // Force close if still hanging after 1s
    setTimeout(() => process.exit(0), 1000).unref();
  };

  process.on('SIGINT', handleShutdown);
  process.on('SIGTERM', handleShutdown);
}

export default app;
