import { formatTime, calculateBreakTime } from '../src/utils/timer.js';

describe ('Pomodoro Timer Ulitities', () => {
    // Time Formatting Tests
    test('formats seconds into MM:SS format', () => {
        expect(formatTime(0)).toBe('00:00');
        expect(formatTime(5)).toBe('00:05');
        expect(formatTime(65)).toBe('01:05');
        expect(formatTime(1500)).toBe('25:00');
    });

    // Calculating Break Time Tests
    test('returns 5 min break for standard sessions, 15 min for every 4th session', () => {
        expect(calculateBreakTime(1)).toBe(5);
        expect(calculateBreakTime(2)).toBe(5);
        expect(calculateBreakTime(3)).toBe(5);
        expect(calculateBreakTime(4)).toBe(15);
        expect(calculateBreakTime(5)).toBe(5);
        expect(calculateBreakTime(8)).toBe(15);
    });
});