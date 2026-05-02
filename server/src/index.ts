import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import type { Request, Response } from 'express';
import { PomodoroTimer } from './pomodoroLogic.js';
import {
    addCalendar,
    listCalendars,
    deleteCalendar,
    syncCalendarById,
} from './calendarService.js';

const app = express();
app.use(cors());
app.use(express.json());

const timer = new PomodoroTimer();

// ---------------------------------------------------------------------------
// Pomodoro Timer Routes
// ---------------------------------------------------------------------------

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

app.get('/api/calendars', async (_req: Request, res: Response) => {
    try {
        const calendars = await listCalendars();
        res.json(calendars);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/calendars', async (req: Request, res: Response) => {
    const { url, name, description } = req.body;
    if (!url || !name) {
        res.status(400).json({ error: 'url and name are required.' });
        return;
    }
    try {
        const calendar = await addCalendar(url, name, description);
        res.status(201).json(calendar);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/calendars/:id', async (req: Request, res: Response) => {
    try {
        await deleteCalendar(req.params['id'] as string);
        res.status(204).send();
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/calendars/:id/sync', async (req: Request, res: Response) => {
    try {
        const count = await syncCalendarById(req.params['id'] as string);
        res.json({ message: `Synced ${count} task(s).`, count });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ---------------------------------------------------------------------------
// Server Init
// ---------------------------------------------------------------------------

const PORT = process.env.PORT ?? 5050;
app.listen(PORT, () => console.log(`Server running on port ${PORT}.`));
