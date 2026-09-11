export type TimerPhase = 'FOCUS' | 'SHORT_BREAK' | 'LONG_BREAK';
export interface TimerConfig {
    focusMinutes?: number;
    shortBreakMinutes?: number;
    longBreakMinutes?: number;
    sessionsUntilLongBreak?: number;
}
export interface TimerStatus {
    phase: TimerPhase;
    remainingSeconds: number;
    isActive: boolean;
    endTime: number | null;
    pomodoroCount: number;
    sessionsUntilLongBreak: number;
}
export declare class PomodoroTimer {
    private endTime;
    private isActive;
    private currentPhase;
    private pomodoroCount;
    private remainingMs;
    private readonly phaseDurations;
    private readonly sessionsUntilLongBreak;
    constructor(config?: TimerConfig);
    start(): number | null;
    pause(): number | null;
    /**
     * Called when a phase naturally completes. Advances to the next phase and
     * increments the pomodoro count after each FOCUS session.
     * Returns the new phase so callers can notify clients.
     */
    complete(): TimerPhase;
    getStatus(): TimerStatus;
    reset(): void;
}
//# sourceMappingURL=pomodoroLogic.d.ts.map