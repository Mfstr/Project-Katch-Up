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
  taskId: number | null;
}

export interface SessionRecord {
  sessionType: 'focus' | 'short_break' | 'long_break';
  taskId: number | null;
  plannedDurationSeconds: number;
  actualDurationSeconds: number;
  startedAt: Date;
  completedAt: Date;
  isInterrupted: boolean;
  isCompleted: boolean;
}

export class PomodoroTimer {
  private endTime: number | null = null;
  private isActive: boolean = false;
  private currentPhase: TimerPhase = 'FOCUS';
  private pomodoroCount: number = 0;
  private remainingMs: number;

  private currentTaskId: number | null = null;
  private currentSessionStartedAt: Date | null = null;
  private currentPlannedDurationSeconds: number = 25 * 60;
  private lastSessionRecord: SessionRecord | null = null;

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
    this.currentPlannedDurationSeconds = Math.round(this.remainingMs / 1000);
  }

  public start(options?: {
    taskId?: number | null | undefined;
    durationSeconds?: number | undefined;
  }): number | null {
    if (!this.isActive) {
      if (options?.durationSeconds && options.durationSeconds > 0) {
        this.remainingMs = options.durationSeconds * 1000;
      }
      if (options?.taskId !== undefined) {
        this.currentTaskId = options.taskId;
      }
      this.currentPlannedDurationSeconds = Math.round(this.remainingMs / 1000);
      this.currentSessionStartedAt = new Date();
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
    const completedPhase = this.currentPhase;
    const startedAt =
      this.currentSessionStartedAt ??
      new Date(Date.now() - this.phaseDurations[completedPhase]);
    const completedAt = new Date();
    const plannedSec =
      this.currentPlannedDurationSeconds ||
      Math.round(this.phaseDurations[completedPhase] / 1000);

    const sessionType =
      completedPhase === 'FOCUS'
        ? 'focus'
        : completedPhase === 'LONG_BREAK'
          ? 'long_break'
          : 'short_break';

    this.lastSessionRecord = {
      sessionType,
      taskId: this.currentTaskId,
      plannedDurationSeconds: plannedSec,
      actualDurationSeconds: plannedSec,
      startedAt,
      completedAt,
      isInterrupted: false,
      isCompleted: true,
    };

    this.isActive = false;
    this.endTime = null;
    this.currentSessionStartedAt = null;

    if (this.currentPhase === 'FOCUS') {
      this.pomodoroCount += 1;
      this.currentPhase =
        this.pomodoroCount % this.sessionsUntilLongBreak === 0 ? 'LONG_BREAK' : 'SHORT_BREAK';
    } else {
      this.currentPhase = 'FOCUS';
    }

    this.remainingMs = this.phaseDurations[this.currentPhase];
    this.currentPlannedDurationSeconds = Math.round(this.remainingMs / 1000);
    return this.currentPhase;
  }

  public getLastCompletedSession(): SessionRecord | null {
    return this.lastSessionRecord;
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
      taskId: this.currentTaskId,
    };
  }

  public reset(): SessionRecord | null {
    let interruptedRecord: SessionRecord | null = null;

    if (this.isActive && this.currentSessionStartedAt) {
      const actualDurationSeconds = Math.max(
        0,
        Math.round((Date.now() - this.currentSessionStartedAt.getTime()) / 1000),
      );

      if (actualDurationSeconds >= 5) {
        const sessionType =
          this.currentPhase === 'FOCUS'
            ? 'focus'
            : this.currentPhase === 'LONG_BREAK'
              ? 'long_break'
              : 'short_break';

        interruptedRecord = {
          sessionType,
          taskId: this.currentTaskId,
          plannedDurationSeconds: this.currentPlannedDurationSeconds,
          actualDurationSeconds,
          startedAt: this.currentSessionStartedAt,
          completedAt: new Date(),
          isInterrupted: true,
          isCompleted: false,
        };
      }
    }

    this.endTime = null;
    this.isActive = false;
    this.currentPhase = 'FOCUS';
    this.pomodoroCount = 0;
    this.remainingMs = this.phaseDurations.FOCUS;
    this.currentSessionStartedAt = null;
    this.currentTaskId = null;
    return interruptedRecord;
  }
}
