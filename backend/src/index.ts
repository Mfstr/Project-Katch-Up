import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';
import { PomodoroTimer } from './pomodoroLogic.js';
import { addCalendar, listCalendars, deleteCalendar, syncCalendarById } from './calendarService.js';
import { softDeleteTask, getNextTask, getAllTasks } from './taskService.js';
import { registerUser, loginUser } from './authService.js';
import { verifyToken } from './verifyToken.js';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

const timer = new PomodoroTimer();

// ---------------------------------------------------------------------------
// Pomodoro Timer Routes
// ---------------------------------------------------------------------------
app.use('/api/timer', verifyToken);

app.post('/api/timer/start', (_req: Request, res: Response) => {
  const endTime = timer.start();
  res.json({ message: 'Timer started.', endTime });
});

app.post('/api/timer/pause', (_req: Request, res: Response) => {
  const remainingSeconds = timer.pause();
  res.json({ message: 'Timer paused.', remainingSeconds });
});

app.post('/api/timer/complete', (_req: Request, res: Response) => {
  const nextPhase = timer.complete();
  res.json({ message: 'Phase complete.', nextPhase });
});

app.post('/api/timer/reset', (_req: Request, res: Response) => {
  timer.reset();
  res.json({ message: 'Timer reset.' });
});

app.get('/api/timer/status', (_req: Request, res: Response) => {
  res.json(timer.getStatus());
});

// ---------------------------------------------------------------------------
// Calendar Management Routes
// ---------------------------------------------------------------------------
app.use('/api/calendars', verifyToken);

app.get('/api/calendars', async (_req: Request, res: Response) => {
  try {
    const calendars = await listCalendars();
    res.json(calendars);
  } catch (err: unknown) {
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
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.delete('/api/calendars/:id', async (req: Request, res: Response) => {
  try {
    await deleteCalendar(req.params['id'] as string);
    res.status(204).send();
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.post('/api/calendars/:id/sync', async (req: Request, res: Response) => {
  try {
    const count = await syncCalendarById(req.params['id'] as string);
    res.json({ message: `Synced ${count} task(s).`, count });
  } catch (err: unknown) {
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
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get('/api/tasks/next', async (req: Request, res: Response) => {
  try {
    const profileId = req.user!.id;
    const task = await getNextTask(profileId);
    
    if (!task) {
      res.status(404).json({ error: 'No upcoming tasks found.' });
      return;
    }
    
    res.json(task);
  } catch (err: unknown) {
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
    res.status(401).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ---------------------------------------------------------------------------
// Server Init
// ---------------------------------------------------------------------------

const PORT = process.env.PORT ?? 5050;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}.`));
}

export default app;
