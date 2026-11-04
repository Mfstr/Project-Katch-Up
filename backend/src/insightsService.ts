import { supabase } from './supabaseClient.js';

export type SessionType = 'focus' | 'short_break' | 'long_break';

export interface NormalizedSession {
  id: string | number;
  profileId: string;
  taskId: number | null;
  sessionType: SessionType;
  startedAt: Date;
  completedAt: Date | null;
  plannedDurationSeconds: number;
  actualDurationSeconds: number;
  isInterrupted: boolean;
  isCompleted: boolean;
}

export interface SuggestedAction {
  type: string;
  target: 'break_interval' | 'focus_interval' | 'pomodoro_cycles';
  value: number;
  currentValue?: number;
  unit: string;
}

export interface InsightRecommendation {
  id: string;
  type:
    | 'break_duration'
    | 'focus_duration'
    | 'break_reminder'
    | 'optimal_time'
    | 'streak_motivation'
    | 'getting_started';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'tip';
  suggestedAction?: SuggestedAction;
}

export interface DailyFocusStat {
  date: string;
  dayOfWeek: string;
  focusMinutes: number;
  breakMinutes: number;
  completedSessions: number;
  interruptedSessions: number;
}

export interface FocusStatistics {
  totalFocusMinutes: number;
  totalBreakMinutes: number;
  totalSessions: number;
  completedSessions: number;
  interruptedSessions: number;
  completionRate: number;
  averageFocusDurationMinutes: number;
  dailyBreakdown: DailyFocusStat[];
  weekdayDistribution: Record<string, number>;
}

export interface StreakCounter {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  todayCompleted: boolean;
}

export interface UserPreferences {
  focusInterval: number;
  breakInterval: number;
  pomodoroCycles: number;
}

export interface TimerInsights {
  recommendations: InsightRecommendation[];
  statistics: FocusStatistics;
  streak: StreakCounter;
  preferences: UserPreferences;
}

export interface CreateSessionInput {
  sessionType?: string;
  plannedDurationSeconds?: number;
  actualDurationSeconds?: number;
  isInterrupted?: boolean;
  isCompleted?: boolean;
  taskId?: number | null;
  startedAt?: string | Date;
  completedAt?: string | Date | null;
}

/**
 * Normalizes a database row from pomodoro_sessions into a standard NormalizedSession.
 */
export function normalizeSessionRow(row: Record<string, unknown>): NormalizedSession {
  const rawType = String(row['session_type'] ?? 'focus').toLowerCase();
  let sessionType: SessionType = 'focus';
  if (rawType.includes('long')) {
    sessionType = 'long_break';
  } else if (rawType.includes('break')) {
    sessionType = 'short_break';
  }

  let plannedDurationSeconds = 25 * 60;
  if (typeof row['planned_duration_seconds'] === 'number') {
    plannedDurationSeconds = row['planned_duration_seconds'];
  } else if (typeof row['planned_duraton_seconds'] === 'number') {
    plannedDurationSeconds = row['planned_duraton_seconds'];
  } else if (typeof row['duration_minutes'] === 'number') {
    plannedDurationSeconds = row['duration_minutes'] * 60;
  }

  const rawStarted = row['started_at'] ?? row['created_at'];
  const startedAt = rawStarted ? new Date(String(rawStarted)) : new Date();

  const rawCompleted = row['completed_at'] ?? row['ended_at'];
  const completedAt = rawCompleted ? new Date(String(rawCompleted)) : null;

  let actualDurationSeconds = plannedDurationSeconds;
  if (typeof row['actual_duration_seconds'] === 'number') {
    actualDurationSeconds = row['actual_duration_seconds'];
  } else if (completedAt && startedAt) {
    actualDurationSeconds = Math.max(
      0,
      Math.round((completedAt.getTime() - startedAt.getTime()) / 1000),
    );
  } else if (typeof row['duration_minutes'] === 'number') {
    actualDurationSeconds = row['duration_minutes'] * 60;
  }

  let isInterrupted = false;
  if (row['is_interrupted'] !== undefined && row['is_interrupted'] !== null) {
    isInterrupted = Boolean(row['is_interrupted']);
  } else if (row['was_interrupted'] !== undefined && row['was_interrupted'] !== null) {
    isInterrupted = Boolean(row['was_interrupted']);
  } else if (row['is_completed'] !== undefined && row['is_completed'] !== null) {
    isInterrupted = !row['is_completed'];
  } else {
    isInterrupted = actualDurationSeconds < plannedDurationSeconds * 0.85;
  }

  const isCompleted = !isInterrupted;

  return {
    id: (row['id'] as string | number) ?? Math.random(),
    profileId: String(row['profile_id'] ?? ''),
    taskId: typeof row['task_id'] === 'number' ? row['task_id'] : null,
    sessionType,
    startedAt,
    completedAt,
    plannedDurationSeconds,
    actualDurationSeconds,
    isInterrupted,
    isCompleted,
  };
}

/**
 * Pure function: Calculates daily streak metrics based on completed focus sessions.
 */
export function calculateStreak(
  sessions: NormalizedSession[],
  referenceDate: Date = new Date(),
): StreakCounter {
  const completedFocusSessions = sessions.filter(
    (s) => s.sessionType === 'focus' && s.isCompleted,
  );

  if (completedFocusSessions.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      todayCompleted: false,
    };
  }

  const dateToIsoDay = (d: Date): string => d.toISOString().slice(0, 10);
  const activeDates = new Set<string>();

  for (const session of completedFocusSessions) {
    activeDates.add(dateToIsoDay(session.startedAt));
  }

  const sortedDates = Array.from(activeDates).sort();
  const lastActiveDate = sortedDates[sortedDates.length - 1] ?? null;

  const todayStr = dateToIsoDay(referenceDate);

  const yesterdayDate = new Date(referenceDate);
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
  const yesterdayStr = dateToIsoDay(yesterdayDate);

  const todayCompleted = activeDates.has(todayStr);

  let currentStreak = 0;
  if (todayCompleted) {
    currentStreak = 1;
    const checkDate = new Date(referenceDate);
    while (true) {
      checkDate.setUTCDate(checkDate.getUTCDate() - 1);
      const prevDayStr = dateToIsoDay(checkDate);
      if (activeDates.has(prevDayStr)) {
        currentStreak += 1;
      } else {
        break;
      }
    }
  } else if (activeDates.has(yesterdayStr)) {
    currentStreak = 1;
    const checkDate = new Date(yesterdayDate);
    while (true) {
      checkDate.setUTCDate(checkDate.getUTCDate() - 1);
      const prevDayStr = dateToIsoDay(checkDate);
      if (activeDates.has(prevDayStr)) {
        currentStreak += 1;
      } else {
        break;
      }
    }
  }

  // Calculate longest streak across all recorded days
  let longestStreak = 0;
  let runningStreak = 0;
  let previousDateTime: number | null = null;

  for (const dateStr of sortedDates) {
    const currentDateTime = new Date(`${dateStr}T00:00:00.000Z`).getTime();
    if (previousDateTime === null) {
      runningStreak = 1;
    } else {
      const diffDays = Math.round((currentDateTime - previousDateTime) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        runningStreak += 1;
      } else if (diffDays > 1) {
        runningStreak = 1;
      }
    }
    if (runningStreak > longestStreak) {
      longestStreak = runningStreak;
    }
    previousDateTime = currentDateTime;
  }

  longestStreak = Math.max(longestStreak, currentStreak);

  return {
    currentStreak,
    longestStreak,
    lastActiveDate,
    todayCompleted,
  };
}

/**
 * Pure function: Computes focus statistics and daily chart breakdowns.
 */
export function calculateFocusStatistics(
  sessions: NormalizedSession[],
  daysCount: number = 7,
  referenceDate: Date = new Date(),
): FocusStatistics {
  const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayAbbrevs = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const weekdayDistribution: Record<string, number> = {
    Monday: 0,
    Tuesday: 0,
    Wednesday: 0,
    Thursday: 0,
    Friday: 0,
    Saturday: 0,
    Sunday: 0,
  };

  let totalFocusSeconds = 0;
  let totalBreakSeconds = 0;
  let completedSessions = 0;
  let interruptedSessions = 0;
  let focusSessionCount = 0;

  for (const s of sessions) {
    if (s.sessionType === 'focus') {
      focusSessionCount += 1;
      totalFocusSeconds += s.actualDurationSeconds;

      const dayName = weekdayNames[s.startedAt.getUTCDay()] ?? 'Monday';
      const focusMins = Math.round(s.actualDurationSeconds / 60);
      weekdayDistribution[dayName] = (weekdayDistribution[dayName] ?? 0) + focusMins;
    } else {
      totalBreakSeconds += s.actualDurationSeconds;
    }

    if (s.isCompleted) {
      completedSessions += 1;
    } else {
      interruptedSessions += 1;
    }
  }

  const totalSessions = sessions.length;
  const totalFocusMinutes = Math.round(totalFocusSeconds / 60);
  const totalBreakMinutes = Math.round(totalBreakSeconds / 60);
  const completionRate =
    totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 1000) / 10 : 0;
  const averageFocusDurationMinutes =
    focusSessionCount > 0 ? Math.round((totalFocusMinutes / focusSessionCount) * 10) / 10 : 0;

  // Build daily breakdown for the requested window ending on referenceDate
  const dailyBreakdown: DailyFocusStat[] = [];
  const dayMs = 24 * 60 * 60 * 1000;

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(referenceDate.getTime() - i * dayMs);
    const dateStr = d.toISOString().slice(0, 10);
    const dayOfWeek = dayAbbrevs[d.getUTCDay()] ?? 'Mon';

    const daySessions = sessions.filter((s) => s.startedAt.toISOString().slice(0, 10) === dateStr);

    let dayFocusSeconds = 0;
    let dayBreakSeconds = 0;
    let dayCompleted = 0;
    let dayInterrupted = 0;

    for (const ds of daySessions) {
      if (ds.sessionType === 'focus') {
        dayFocusSeconds += ds.actualDurationSeconds;
      } else {
        dayBreakSeconds += ds.actualDurationSeconds;
      }
      if (ds.isCompleted) {
        dayCompleted += 1;
      } else {
        dayInterrupted += 1;
      }
    }

    dailyBreakdown.push({
      date: dateStr,
      dayOfWeek,
      focusMinutes: Math.round(dayFocusSeconds / 60),
      breakMinutes: Math.round(dayBreakSeconds / 60),
      completedSessions: dayCompleted,
      interruptedSessions: dayInterrupted,
    });
  }

  return {
    totalFocusMinutes,
    totalBreakMinutes,
    totalSessions,
    completedSessions,
    interruptedSessions,
    completionRate,
    averageFocusDurationMinutes,
    dailyBreakdown,
    weekdayDistribution,
  };
}

/**
 * Pure function: Analyzes session patterns and generates actionable recommendations.
 */
export function analyzeSessionPatterns(
  sessions: NormalizedSession[],
  preferences: UserPreferences,
  referenceDate: Date = new Date(),
): InsightRecommendation[] {
  const recommendations: InsightRecommendation[] = [];

  const focusSessions = sessions.filter((s) => s.sessionType === 'focus');
  const breakSessions = sessions.filter(
    (s) => s.sessionType === 'short_break' || s.sessionType === 'long_break',
  );

  const currentBreak = preferences.breakInterval || 5;
  const currentFocus = preferences.focusInterval || 25;

  // 0. New user check
  if (sessions.length === 0) {
    recommendations.push({
      id: 'welcome_first_session',
      type: 'getting_started',
      title: 'Welcome to Focus Insights',
      message:
        'Complete your first Pomodoro session to begin tracking focus statistics, streaks, and personalized habit recommendations.',
      severity: 'info',
    });
    return recommendations;
  }

  // 1. Shorter breaks if often ended early (Acceptance Criteria requirement)
  if (breakSessions.length >= 2) {
    const earlyBreakCount = breakSessions.filter(
      (s) => s.isInterrupted || s.actualDurationSeconds < s.plannedDurationSeconds * 0.75,
    ).length;
    const earlyBreakRatio = earlyBreakCount / breakSessions.length;

    const totalActualBreakSec = breakSessions.reduce((acc, s) => acc + s.actualDurationSeconds, 0);
    const avgActualBreakSec = totalActualBreakSec / breakSessions.length;
    const avgActualBreakMin = Math.round(avgActualBreakSec / 60);

    if (earlyBreakRatio >= 0.5 || (breakSessions.length >= 3 && avgActualBreakMin < currentBreak)) {
      const suggestedBreak = Math.max(2, Math.min(avgActualBreakMin || 3, currentBreak - 1));
      if (suggestedBreak < currentBreak) {
        recommendations.push({
          id: 'shorten_break_duration',
          type: 'break_duration',
          title: 'Shorter Break Recommended',
          message: `You often end breaks early (averaging ${avgActualBreakMin} min vs ${currentBreak} min planned). Consider setting your break interval to ${suggestedBreak} minutes to keep momentum.`,
          severity: 'tip',
          suggestedAction: {
            type: 'SET_BREAK_INTERVAL',
            target: 'break_interval',
            value: suggestedBreak,
            currentValue: currentBreak,
            unit: 'minutes',
          },
        });
      }
    }
  }

  // 2. Shorter focus sessions if frequently interrupted
  if (focusSessions.length >= 3) {
    const interruptedFocus = focusSessions.filter((s) => s.isInterrupted).length;
    const interruptionRate = interruptedFocus / focusSessions.length;

    if (interruptionRate >= 0.4) {
      const avgActualSec =
        focusSessions.reduce((acc, s) => acc + s.actualDurationSeconds, 0) / focusSessions.length;
      const avgActualMin = Math.round(avgActualSec / 60);
      const suggestedFocus = Math.max(10, Math.min(avgActualMin || 15, currentFocus - 5));

      if (suggestedFocus < currentFocus) {
        recommendations.push({
          id: 'shorten_focus_duration',
          type: 'focus_duration',
          title: 'Try Shorter Focus Sessions',
          message: `${Math.round(interruptionRate * 100)}% of your focus sessions were cut short. A ${suggestedFocus}-minute interval can help build consistent stamina without fatigue.`,
          severity: 'warning',
          suggestedAction: {
            type: 'SET_FOCUS_INTERVAL',
            target: 'focus_interval',
            value: suggestedFocus,
            currentValue: currentFocus,
            unit: 'minutes',
          },
        });
      }
    }
  }

  // 3. Lengthen focus duration if high completion rate (ready for deep work)
  if (focusSessions.length >= 5) {
    const completedCount = focusSessions.filter((s) => s.isCompleted).length;
    const completionRate = completedCount / focusSessions.length;

    if (completionRate >= 0.85 && currentFocus <= 25) {
      const suggestedFocus = Math.min(50, currentFocus + 10);
      recommendations.push({
        id: 'lengthen_focus_duration',
        type: 'focus_duration',
        title: 'Deepen Your Focus',
        message: `Great focus! You have successfully completed ${Math.round(completionRate * 100)}% of your sessions. Consider extending your interval to ${suggestedFocus} minutes for deeper flow.`,
        severity: 'tip',
        suggestedAction: {
          type: 'SET_FOCUS_INTERVAL',
          target: 'focus_interval',
          value: suggestedFocus,
          currentValue: currentFocus,
          unit: 'minutes',
        },
      });
    }
  }

  // 4. Missing breaks reminder (back-to-back sessions)
  if (focusSessions.length >= 4 && breakSessions.length === 0) {
    recommendations.push({
      id: 'schedule_regular_breaks',
      type: 'break_reminder',
      title: 'Remember Regular Breaks',
      message:
        'You have completed multiple focus sessions without taking breaks. Short 5-minute pauses help prevent cognitive fatigue.',
      severity: 'warning',
      suggestedAction: {
        type: 'SET_BREAK_INTERVAL',
        target: 'break_interval',
        value: 5,
        currentValue: currentBreak,
        unit: 'minutes',
      },
    });
  }

  // 5. Peak productivity window
  if (focusSessions.length >= 3) {
    const windows = {
      Morning: { label: 'Morning (6 AM - 12 PM)', minutes: 0 },
      Afternoon: { label: 'Afternoon (12 PM - 6 PM)', minutes: 0 },
      Evening: { label: 'Evening (6 PM - 12 AM)', minutes: 0 },
      Night: { label: 'Night (12 AM - 6 AM)', minutes: 0 },
    };

    for (const fs of focusSessions) {
      if (!fs.isCompleted) continue;
      const hour = fs.startedAt.getUTCHours();
      const mins = Math.round(fs.actualDurationSeconds / 60);
      if (hour >= 6 && hour < 12) windows.Morning.minutes += mins;
      else if (hour >= 12 && hour < 18) windows.Afternoon.minutes += mins;
      else if (hour >= 18 && hour < 24) windows.Evening.minutes += mins;
      else windows.Night.minutes += mins;
    }

    const sortedWindows = Object.entries(windows).sort(([, a], [, b]) => b.minutes - a.minutes);
    const topWindow = sortedWindows[0];

    if (topWindow && topWindow[1].minutes > 0) {
      recommendations.push({
        id: 'peak_focus_hours',
        type: 'optimal_time',
        title: 'Peak Productivity Window',
        message: `Your most productive window is the ${topWindow[0].toLowerCase()} (${topWindow[1].minutes} focus minutes). Schedule your most demanding tasks during this period!`,
        severity: 'info',
      });
    }
  }

  // 6. Streak encouragement
  const streak = calculateStreak(sessions, referenceDate);
  if (streak.currentStreak >= 3) {
    recommendations.push({
      id: 'streak_momentum',
      type: 'streak_motivation',
      title: `${streak.currentStreak}-Day Streak!`,
      message: `You are on a ${streak.currentStreak}-day focus streak. Keep up the consistent effort!`,
      severity: 'tip',
    });
  }

  return recommendations;
}

/**
 * Service function: Retrieves sessions for a user from Supabase.
 */
export async function getUserSessions(
  profileId: string,
  limit: number = 100,
): Promise<NormalizedSession[]> {
  const { data, error } = await supabase
    .from('pomodoro_sessions')
    .select('*')
    .eq('profile_id', profileId)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to retrieve pomodoro sessions: ${error.message}`);
  }

  if (!Array.isArray(data)) {
    return [];
  }

  return data.map((row) => normalizeSessionRow(row as Record<string, unknown>));
}

/**
 * Service function: Retrieves user profile preferences.
 */
export async function getUserPreferences(profileId: string): Promise<UserPreferences> {
  const { data, error } = await supabase
    .from('profiles')
    .select('focus_interval, break_interval, pomodoro_cycles')
    .eq('id', profileId)
    .single();

  if (error || !data) {
    return {
      focusInterval: 25,
      breakInterval: 5,
      pomodoroCycles: 4,
    };
  }

  return {
    focusInterval: data.focus_interval ?? 25,
    breakInterval: data.break_interval ?? 5,
    pomodoroCycles: data.pomodoro_cycles ?? 4,
  };
}

/**
 * Service function: Applies an insight recommendation or update to user profile settings.
 */
export async function applyRecommendation(
  profileId: string,
  action: { target: string; value: number },
): Promise<{ success: boolean; updatedSettings: Partial<UserPreferences> }> {
  const validTargets: Record<string, string> = {
    break_interval: 'break_interval',
    breakInterval: 'break_interval',
    focus_interval: 'focus_interval',
    focusInterval: 'focus_interval',
    pomodoro_cycles: 'pomodoro_cycles',
    pomodoroCycles: 'pomodoro_cycles',
  };

  const dbField = validTargets[action.target];
  if (!dbField) {
    throw new Error(`Invalid preference target: ${action.target}`);
  }

  const numericValue = Number(action.value);
  if (!Number.isInteger(numericValue) || numericValue < 1 || numericValue > 180) {
    throw new Error(`Value must be an integer between 1 and 180.`);
  }

  const { error } = await supabase
    .from('profiles')
    .upsert({ id: profileId, [dbField]: numericValue }, { onConflict: 'id' });

  if (error) {
    throw new Error(`Failed to update profile settings: ${error.message}`);
  }

  const targetMap: Record<string, keyof UserPreferences> = {
    break_interval: 'breakInterval',
    focus_interval: 'focusInterval',
    pomodoro_cycles: 'pomodoroCycles',
  };

  return {
    success: true,
    updatedSettings: {
      [targetMap[dbField] ?? 'breakInterval']: numericValue,
    },
  };
}

/**
 * Service function: Records a pomodoro session into the database.
 */
export async function recordSession(
  profileId: string,
  input: CreateSessionInput,
): Promise<NormalizedSession> {
  const plannedSeconds = input.plannedDurationSeconds ?? 25 * 60;
  const actualSeconds = input.actualDurationSeconds ?? plannedSeconds;
  const isInterrupted = input.isInterrupted ?? false;
  const startedAt = input.startedAt
    ? new Date(input.startedAt).toISOString()
    : new Date().toISOString();
  const completedAt = input.completedAt
    ? new Date(input.completedAt).toISOString()
    : new Date().toISOString();

  const sessionPayload: Record<string, unknown> = {
    profile_id: profileId,
    session_type: input.sessionType ?? 'focus',
    planned_duration_seconds: plannedSeconds,
    actual_duration_seconds: actualSeconds,
    is_interrupted: isInterrupted,
    started_at: startedAt,
    completed_at: completedAt,
  };

  if (input.taskId !== undefined && input.taskId !== null) {
    sessionPayload['task_id'] = input.taskId;
  }

  let { data, error } = await supabase
    .from('pomodoro_sessions')
    .insert(sessionPayload)
    .select()
    .single();

  // If column error occurs (e.g. task_id or planned_duration_seconds missing in unmigrated table), retry with fallback
  if (error && error.message && error.message.includes('column') && error.message.includes('does not exist')) {
    if (sessionPayload['task_id'] !== undefined && error.message.includes('task_id')) {
      delete sessionPayload['task_id'];
      const retryResult = await supabase
        .from('pomodoro_sessions')
        .insert(sessionPayload)
        .select()
        .single();
      data = retryResult.data;
      error = retryResult.error;
    } else if (error.message.includes('planned_duration_seconds')) {
      const legacyPayload = {
        profile_id: profileId,
        session_type: input.sessionType ?? 'focus',
        duration_minutes: Math.round(actualSeconds / 60),
        is_completed: !isInterrupted,
        started_at: startedAt,
        ended_at: completedAt,
        task_id: input.taskId ?? null,
      };
      const retryResult = await supabase
        .from('pomodoro_sessions')
        .insert(legacyPayload)
        .select()
        .single();
      data = retryResult.data;
      error = retryResult.error;
    }
  }

  if (error) {
    throw new Error(`Failed to record pomodoro session: ${error.message}`);
  }

  return normalizeSessionRow((data || sessionPayload) as Record<string, unknown>);
}

/**
 * Main insights orchestrator: analyzes sessions and returns recommendations, stats, and streak.
 */
export async function getTimerInsights(
  profileId: string,
  daysCount: number = 7,
  referenceDate: Date = new Date(),
): Promise<TimerInsights> {
  const [sessions, preferences] = await Promise.all([
    getUserSessions(profileId),
    getUserPreferences(profileId),
  ]);

  const recommendations = analyzeSessionPatterns(sessions, preferences, referenceDate);
  const statistics = calculateFocusStatistics(sessions, daysCount, referenceDate);
  const streak = calculateStreak(sessions, referenceDate);

  return {
    recommendations,
    statistics,
    streak,
    preferences,
  };
}
