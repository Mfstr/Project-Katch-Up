import express from 'express';
import type { Request, Response } from 'express';
import { syncCalendar } from "./icalParser.js";
import { PomodoroTimer } from "./pomodoroLogic.js";

const app = express();
app.use(express.json());

// Initialize the timer logic
const timer = new PomodoroTimer();

// --- Calendar Sync Route ---
app.post('/api/sync', async (req: Request, res: Response) => {
    const { calendarUrl } = req.body;
    try {
        await syncCalendar(calendarUrl);
        res.status(200).json({ message: "Sync success." });
    } catch (error) {
        res.status(500).json({ error: "Sync failed." });
    }
});

// --- Pomodoro Timer Routes ---

app.post('/api/timer/start', (req: Request, res: Response) => {
    const endTime = timer.start();
    res.json({ message: "Timer started", endTime });
});

app.get('/api/timer/status', (req: Request, res: Response) => {
    const status = timer.getStatus();
    res.json(status);
});

app.post('/api/timer/reset', (req: Request, res: Response) => {
    timer.reset();
    res.json({ message: "Timer reset" });
});

// --- Server Init ---
const PORT = 5050;
app.listen(PORT, () => console.log(`Host online on port ${PORT}.`));

// Debugging/Startup test
const test_url = 'https://ics.calendarlabs.com/76/16fc2839/US_Holidays.ics';
console.log("Startup... running initial sync test.");

syncCalendar(test_url).catch((err) => console.error('Initial Sync Failed:', err));