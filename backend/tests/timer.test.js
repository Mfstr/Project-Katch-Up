import { PomodoroTimer } from '../src/pomodoroLogic.ts';

describe('Pomodoro Timer Logic', () => {
    let timer;

    beforeEach(() => {
        // Initialize a new timer before each test with default settings
        timer = new PomodoroTimer({
            focusMinutes: 25,
            shortBreakMinutes: 5,
            longBreakMinutes: 15,
            sessionsUntilLongBreak: 4
        });
    });

    test('initializes with correct default state', () => {
        const status = timer.getStatus();
        expect(status.phase).toBe('FOCUS');
        expect(status.remainingSeconds).toBe(25 * 60);
        expect(status.isActive).toBe(false);
        expect(status.pomodoroCount).toBe(0);
        expect(status.sessionsUntilLongBreak).toBe(4);
    });

    test('start() begins the timer and sets endTime', () => {
        const endTime = timer.start();
        expect(endTime).toBeGreaterThan(Date.now());
        
        const status = timer.getStatus();
        expect(status.isActive).toBe(true);
        expect(status.endTime).toBe(endTime);
    });

    test('pause() stops the timer and calculates remaining time', () => {
        timer.start();
        const remaining = timer.pause();
        
        expect(remaining).toBeLessThanOrEqual(25 * 60);
        
        const status = timer.getStatus();
        expect(status.isActive).toBe(false);
        expect(status.endTime).toBe(null);
    });

    test('complete() advances phase to SHORT_BREAK after 1 focus session', () => {
        const nextPhase = timer.complete();
        expect(nextPhase).toBe('SHORT_BREAK');
        
        const status = timer.getStatus();
        expect(status.phase).toBe('SHORT_BREAK');
        expect(status.pomodoroCount).toBe(1);
        expect(status.remainingSeconds).toBe(5 * 60);
        expect(status.isActive).toBe(false);
    });

    test('complete() advances phase to LONG_BREAK after 4 focus sessions', () => {
        // Session 1
        timer.complete(); // FOCUS -> SHORT_BREAK
        timer.complete(); // SHORT_BREAK -> FOCUS
        // Session 2
        timer.complete(); // FOCUS -> SHORT_BREAK
        timer.complete(); // SHORT_BREAK -> FOCUS
        // Session 3
        timer.complete(); // FOCUS -> SHORT_BREAK
        timer.complete(); // SHORT_BREAK -> FOCUS
        
        // Session 4
        const nextPhase = timer.complete(); // FOCUS -> LONG_BREAK
        expect(nextPhase).toBe('LONG_BREAK');
        
        const status = timer.getStatus();
        expect(status.phase).toBe('LONG_BREAK');
        expect(status.pomodoroCount).toBe(4);
        expect(status.remainingSeconds).toBe(15 * 60);
    });

    test('reset() restores the initial state', () => {
        timer.start();
        timer.complete(); // completes first focus session
        timer.reset();
        
        const status = timer.getStatus();
        expect(status.phase).toBe('FOCUS');
        expect(status.isActive).toBe(false);
        expect(status.pomodoroCount).toBe(0);
        expect(status.remainingSeconds).toBe(25 * 60);
    });
});
