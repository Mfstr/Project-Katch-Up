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

const PHASE_DURATIONS_MS: Record<TimerPhase, number> = {
    FOCUS: 25 * 60 * 1000,
    SHORT_BREAK: 5 * 60 * 1000,
    LONG_BREAK: 15 * 60 * 1000,
};

export class PomodoroTimer {
    private endTime: number | null = null;
    private isActive: boolean = false;
    private currentPhase: TimerPhase = 'FOCUS';
    private pomodoroCount: number = 0;
    private remainingMs: number;

    private readonly phaseDurations: Record<TimerPhase, number>;
    private readonly sessionsUntilLongBreak: number;

    constructor(config: TimerConfig = {}) {
        this.sessionsUntilLongBreak = config.sessionsUntilLongBreak ?? 4;
        this.phaseDurations = {
            FOCUS: (config.focusMinutes ?? 25) * 60 * 1000,
            SHORT_BREAK: (config.shortBreakMinutes ?? 5) * 60 * 1000,
            LONG_BREAK: (config.longBreakMinutes ?? 15) * 60 * 1000,
        };
        this.remainingMs = this.phaseDurations.FOCUS;
    }

    public start(): number | null {
        if (!this.isActive) {
            this.endTime = Date.now() + this.remainingMs;
            this.isActive = true;
        }
        return this.endTime;
    }

    public pause(): number | null {
        if (this.isActive && this.endTime !== null) {
            this.remainingMs = Math.max(0, this.endTime - Date.now());
            this.endTime = null;
            this.isActive = false;
            return Math.floor(this.remainingMs / 1000);
        }
        return null;
    }

    /**
     * Called when a phase naturally completes. Advances to the next phase and
     * increments the pomodoro count after each FOCUS session.
     * Returns the new phase so callers can notify clients.
     */
    public complete(): TimerPhase {
        this.isActive = false;
        this.endTime = null;

        if (this.currentPhase === 'FOCUS') {
            this.pomodoroCount += 1;
            this.currentPhase =
                this.pomodoroCount % this.sessionsUntilLongBreak === 0
                    ? 'LONG_BREAK'
                    : 'SHORT_BREAK';
        } else {
            this.currentPhase = 'FOCUS';
        }

        this.remainingMs = this.phaseDurations[this.currentPhase];
        return this.currentPhase;
    }

    public getStatus(): TimerStatus {
        let remaining = this.remainingMs;

        if (this.isActive && this.endTime !== null) {
            remaining = Math.max(0, this.endTime - Date.now());
            if (remaining === 0) {
                this.isActive = false;
                this.endTime = null;
                this.remainingMs = 0;
            }
        }

        return {
            phase: this.currentPhase,
            remainingSeconds: Math.floor(remaining / 1000),
            isActive: this.isActive,
            endTime: this.endTime,
            pomodoroCount: this.pomodoroCount,
            sessionsUntilLongBreak: this.sessionsUntilLongBreak,
        };
    }

    public reset(): void {
        this.endTime = null;
        this.isActive = false;
        this.currentPhase = 'FOCUS';
        this.pomodoroCount = 0;
        this.remainingMs = this.phaseDurations.FOCUS;
    }
}
