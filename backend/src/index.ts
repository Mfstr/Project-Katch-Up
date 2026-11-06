import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import type { Request, Response, NextFunction } from 'express';
import { PomodoroTimer } from './pomodoroLogic.js';
import { addCalendar, listCalendars, deleteCalendar, syncCalendarById } from './calendarService.js';
import { softDeleteTask, getNextTask, getAllTasks, createTask, updateTask } from './taskService.js';
import { registerUser, loginUser, logoutUser } from './authService.js';
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
import { checkReadiness } from './healthService.js'; // eslint-disable-line @typescript-eslint/no-unused-vars

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
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(httpLogger);

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
        recordedSession = await recordSession(profileId, completedSession);
      } catch (dbErr) {
        logger.error({ err: dbErr }, 'Failed to record completed session in database');
      }
    }

    res.json({ message: 'Phase complete.', nextPhase, session: recordedSession });
  } catch (err: unknown) {
    logger.error({ err }, 'Error completing timer phase');
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
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
        recordedSession = await recordSession(profileId, interruptedSession);
      } catch (dbErr) {
        logger.error({ err: dbErr }, 'Failed to record interrupted session in database');
      }
    }

    res.json({ message: 'Timer reset.', session: recordedSession });
  } catch (err: unknown) {
    logger.error({ err }, 'Error resetting timer');
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
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
    const insights = await getTimerInsights(profileId, isNaN(days) ? 7 : days);
    res.json(insights);
  } catch (err: unknown) {
    logger.error({ err }, 'Error generating timer insights');
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
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

    const result = await applyRecommendation(profileId, { target: applyTarget, value: applyValue });
    res.json({ message: 'Recommendation applied successfully.', ...result });
  } catch (err: unknown) {
    logger.error({ err }, 'Error applying insight recommendation');
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post('/api/timer/sessions', async (req: Request, res: Response) => {
  try {
    const profileId = req.user!.id;
    const session = await recordSession(profileId, req.body ?? {});
    res.status(201).json(session);
  } catch (err: unknown) {
    logger.error({ err }, 'Error recording pomodoro session');
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get('/api/timer/sessions', async (req: Request, res: Response) => {
  try {
    const profileId = req.user!.id;
    const limit = req.query['limit'] ? parseInt(String(req.query['limit']), 10) : 100;
    const sessions = await getUserSessions(profileId, isNaN(limit) ? 100 : limit);
    res.json(sessions);
  } catch (err: unknown) {
    logger.error({ err }, 'Error retrieving pomodoro sessions');
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get('/api/timer/preferences', async (req: Request, res: Response) => {
  try {
    const profileId = req.user!.id;
    const preferences = await getUserPreferences(profileId);
    res.json(preferences);
  } catch (err: unknown) {
    logger.error({ err }, 'Error retrieving timer preferences');
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
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
        const updateRes = await applyRecommendation(profileId, { target: key, value: Number(val) });
        Object.assign(results, updateRes.updatedSettings);
      }
    }

    res.json({ message: 'Preferences updated successfully.', updatedSettings: results });
  } catch (err: unknown) {
    logger.error({ err }, 'Error updating timer preferences');
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ---------------------------------------------------------------------------
// Calendar Management Routes
// ---------------------------------------------------------------------------
app.use('/api/calendars', featureFlag('ENABLE_CALENDAR'));
app.use('/api/calendars', verifyToken);

app.get('/api/calendars', async (_req: Request, res: Response) => {
  try {
    const calendars = await listCalendars();
    res.json(calendars);
  } catch (err: unknown) {
    logger.error({ err }, 'Error retrieving calendars');
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post('/api/calendars', async (req: Request, res: Response) => {
  const { url, name, description } = req.body ?? {};
  if (!url || !name) {
    res.status(400).json({ error: 'url and name are required.' });
    return;
  }
  try {
    const calendar = await addCalendar(url, name, description);
    res.status(201).json(calendar);
  } catch (err: unknown) {
    logger.error({ err }, 'Error adding calendar');
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.delete('/api/calendars/:id', async (req: Request, res: Response) => {
  try {
    await deleteCalendar(req.params['id'] as string);
    res.status(204).send();
  } catch (err: unknown) {
    logger.error({ err }, 'Error deleting calendar');
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post('/api/calendars/:id/sync', async (req: Request, res: Response) => {
  try {
    const count = await syncCalendarById(req.params['id'] as string);
    res.json({ message: `Synced ${count} task(s).`, count });
  } catch (err: unknown) {
    logger.error({ err }, 'Error syncing calendar');
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ---------------------------------------------------------------------------
// Task Management Routes
// ---------------------------------------------------------------------------
app.use('/api/tasks', verifyToken);

app.get('/api/tasks', async (req: Request, res: Response) => {
  try {
    const profileId = req.user!.id;
    const tasks = await getAllTasks(profileId);
    res.json(tasks);
  } catch (err: unknown) {
    logger.error({ err }, 'Error retrieving tasks');
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get('/api/tasks/next', async (req: Request, res: Response) => {
  try {
    const profileId = req.user?.id;
    const task = await getNextTask(profileId);

    if (!task) {
      res.status(404).json({ error: 'No upcoming tasks found.' });
      return;
    }

    res.json(task);
  } catch (err: unknown) {
    logger.error({ err }, 'Error retrieving next task');
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post('/api/tasks', async (req: Request, res: Response) => {
  const { title } = req.body ?? {};
  if (!title || typeof title !== 'string' || !title.trim()) {
    res.status(400).json({ error: 'title is required.' });
    return;
  }

  try {
    const profileId = req.user?.id;
    const taskData = {
      ...req.body,
      profile_id: req.body?.profile_id ?? profileId,
    };
    const task = await createTask(taskData);
    res.status(201).json(task);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.put('/api/tasks/:id', async (req: Request, res: Response) => {
  try {
    const taskId = parseInt(req.params['id'] as string, 10);
    if (isNaN(taskId)) {
      res.status(400).json({ error: 'Invalid task ID' });
      return;
    }

    const task = await updateTask(taskId, req.body ?? {});
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    res.json(task);
  } catch (err: unknown) {
    logger.error({ err }, 'Error retrieving next task');
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.delete('/api/tasks/:id', async (req: Request, res: Response) => {
  try {
    const taskId = parseInt(req.params['id'] as string, 10);
    if (isNaN(taskId)) {
      res.status(400).json({ error: 'Invalid task ID' });
      return;
    }
    await softDeleteTask(taskId);
    res.status(204).send();
  } catch (err: unknown) {
    logger.error({ err }, 'Error deleting task');
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ---------------------------------------------------------------------------
// Auth Routes
// ---------------------------------------------------------------------------

const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 requests per windowMs
  message: { error: 'Too many requests, please try again after a minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth', authLimiter);

app.post('/api/auth/register', async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required.' });
    return;
  }
  try {
    const data = await registerUser(email, password);
    res.status(201).json(data);
  } catch (err: unknown) {
    logger.error({ err }, 'Error registering user');
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required.' });
    return;
  }
  try {
    const data = await loginUser(email, password);
    res.status(200).json(data);
  } catch (err: unknown) {
    logger.warn({ err }, 'User login failed');
    res.status(401).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post('/api/auth/logout', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;
    const data = await logoutUser(token);
    res.status(200).json(data);
  } catch (err: unknown) {
    logger.warn({ err }, 'User logout failed');
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
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
