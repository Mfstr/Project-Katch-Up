import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { PomodoroTimer } from './pomodoroLogic.js';
import { addCalendar, listCalendars, deleteCalendar, syncCalendarById, } from './calendarService.js';
const app = express();
app.use(cors());
app.use(express.json());
const timer = new PomodoroTimer();
// ---------------------------------------------------------------------------
// Pomodoro Timer Routes
// ---------------------------------------------------------------------------
app.post('/api/timer/start', (_req, res) => {
    const endTime = timer.start();
    res.json({ message: 'Timer started.', endTime });
});
app.post('/api/timer/pause', (_req, res) => {
    const remainingSeconds = timer.pause();
    res.json({ message: 'Timer paused.', remainingSeconds });
});
app.post('/api/timer/complete', (_req, res) => {
    const nextPhase = timer.complete();
    res.json({ message: 'Phase complete.', nextPhase });
});
app.post('/api/timer/reset', (_req, res) => {
    timer.reset();
    res.json({ message: 'Timer reset.' });
});
app.get('/api/timer/status', (_req, res) => {
    res.json(timer.getStatus());
});
// ---------------------------------------------------------------------------
// Calendar Management Routes
// ---------------------------------------------------------------------------
app.get('/api/calendars', async (_req, res) => {
    try {
        const calendars = await listCalendars();
        res.json(calendars);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/api/calendars', async (req, res) => {
    const { url, name, description } = req.body ?? {};
    if (!url || !name) {
        res.status(400).json({ error: 'url and name are required.' });
        return;
    }
    try {
        const calendar = await addCalendar(url, name, description);
        res.status(201).json(calendar);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.delete('/api/calendars/:id', async (req, res) => {
    try {
        await deleteCalendar(req.params['id']);
        res.status(204).send();
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/api/calendars/:id/sync', async (req, res) => {
    try {
        const count = await syncCalendarById(req.params['id']);
        res.json({ message: `Synced ${count} task(s).`, count });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ---------------------------------------------------------------------------
// Server Init
// ---------------------------------------------------------------------------
const PORT = process.env.PORT ?? 5050;
app.listen(PORT, () => console.log(`Server running on port ${PORT}.`));
//# sourceMappingURL=index.js.map