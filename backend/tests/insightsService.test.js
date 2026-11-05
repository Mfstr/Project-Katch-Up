import { jest } from '@jest/globals';

const mockChain = {
  from: jest.fn(),
  select: jest.fn(),
  insert: jest.fn(),
  upsert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  eq: jest.fn(),
  order: jest.fn(),
  limit: jest.fn(),
  single: jest.fn(),
};

mockChain.from.mockReturnValue(mockChain);
mockChain.select.mockReturnValue(mockChain);
mockChain.insert.mockReturnValue(mockChain);
mockChain.upsert.mockReturnValue(mockChain);
mockChain.update.mockReturnValue(mockChain);
mockChain.delete.mockReturnValue(mockChain);
mockChain.eq.mockReturnValue(mockChain);
mockChain.order.mockReturnValue(mockChain);
mockChain.limit.mockReturnValue(mockChain);

jest.unstable_mockModule('../src/supabaseClient.js', () => ({
  supabase: mockChain,
}));

const {
  calculateStreak,
  calculateFocusStatistics,
  analyzeSessionPatterns,
  getUserSessions,
  getUserPreferences,
  applyRecommendation,
  recordSession,
  getTimerInsights,
  normalizeSessionRow,
} = await import('../src/insightsService.js');
const { supabase } = await import('../src/supabaseClient.js');

describe('Insights & Session Pattern Analysis Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChain.eq.mockReturnValue(mockChain);
    mockChain.order.mockReturnValue(mockChain);
    mockChain.single.mockReset();
  });

  describe('normalizeSessionRow', () => {
    it('correctly maps standard pomodoro_sessions fields', () => {
      const row = {
        id: 1,
        profile_id: 'user-123',
        session_type: 'focus',
        planned_duration_seconds: 1500,
        actual_duration_seconds: 1500,
        is_interrupted: false,
        started_at: '2026-11-03T10:00:00.000Z',
        completed_at: '2026-11-03T10:25:00.000Z',
      };

      const normalized = normalizeSessionRow(row);
      expect(normalized.id).toBe(1);
      expect(normalized.profileId).toBe('user-123');
      expect(normalized.sessionType).toBe('focus');
      expect(normalized.plannedDurationSeconds).toBe(1500);
      expect(normalized.actualDurationSeconds).toBe(1500);
      expect(normalized.isCompleted).toBe(true);
      expect(normalized.isInterrupted).toBe(false);
    });

    it('handles legacy column names gracefully (duration_minutes, was_interrupted)', () => {
      const row = {
        id: 2,
        profile_id: 'user-123',
        session_type: 'short_break',
        duration_minutes: 5,
        was_interrupted: true,
        created_at: '2026-11-03T10:30:00.000Z',
      };

      const normalized = normalizeSessionRow(row);
      expect(normalized.sessionType).toBe('short_break');
      expect(normalized.plannedDurationSeconds).toBe(300);
      expect(normalized.isInterrupted).toBe(true);
      expect(normalized.isCompleted).toBe(false);
    });
  });

  describe('calculateStreak', () => {
    const fixedNow = new Date('2026-11-03T15:00:00.000Z');

    it('returns 0 streak when there are no completed focus sessions', () => {
      const streak = calculateStreak([], fixedNow);
      expect(streak.currentStreak).toBe(0);
      expect(streak.longestStreak).toBe(0);
      expect(streak.lastActiveDate).toBeNull();
      expect(streak.todayCompleted).toBe(false);
    });

    it('ignores interrupted sessions when calculating streak', () => {
      const sessions = [
        {
          id: 1,
          profileId: 'user-1',
          taskId: null,
          sessionType: 'focus',
          startedAt: new Date('2026-11-03T10:00:00.000Z'),
          completedAt: null,
          plannedDurationSeconds: 1500,
          actualDurationSeconds: 300,
          isInterrupted: true,
          isCompleted: false,
        },
      ];

      const streak = calculateStreak(sessions, fixedNow);
      expect(streak.currentStreak).toBe(0);
      expect(streak.todayCompleted).toBe(false);
    });

    it('calculates consecutive active streak including today', () => {
      const sessions = [
        {
          id: 1,
          profileId: 'user-1',
          taskId: null,
          sessionType: 'focus',
          startedAt: new Date('2026-11-03T10:00:00.000Z'),
          completedAt: null,
          plannedDurationSeconds: 1500,
          actualDurationSeconds: 1500,
          isInterrupted: false,
          isCompleted: true,
        },
        {
          id: 2,
          profileId: 'user-1',
          taskId: null,
          sessionType: 'focus',
          startedAt: new Date('2026-11-02T10:00:00.000Z'),
          completedAt: null,
          plannedDurationSeconds: 1500,
          actualDurationSeconds: 1500,
          isInterrupted: false,
          isCompleted: true,
        },
        {
          id: 3,
          profileId: 'user-1',
          taskId: null,
          sessionType: 'focus',
          startedAt: new Date('2026-11-01T10:00:00.000Z'),
          completedAt: null,
          plannedDurationSeconds: 1500,
          actualDurationSeconds: 1500,
          isInterrupted: false,
          isCompleted: true,
        },
      ];

      const streak = calculateStreak(sessions, fixedNow);
      expect(streak.currentStreak).toBe(3);
      expect(streak.longestStreak).toBe(3);
      expect(streak.todayCompleted).toBe(true);
      expect(streak.lastActiveDate).toBe('2026-11-03');
    });

    it('preserves streak from yesterday when today has not been completed yet', () => {
      const sessions = [
        {
          id: 2,
          profileId: 'user-1',
          taskId: null,
          sessionType: 'focus',
          startedAt: new Date('2026-11-02T10:00:00.000Z'),
          completedAt: null,
          plannedDurationSeconds: 1500,
          actualDurationSeconds: 1500,
          isInterrupted: false,
          isCompleted: true,
        },
        {
          id: 3,
          profileId: 'user-1',
          taskId: null,
          sessionType: 'focus',
          startedAt: new Date('2026-11-01T10:00:00.000Z'),
          completedAt: null,
          plannedDurationSeconds: 1500,
          actualDurationSeconds: 1500,
          isInterrupted: false,
          isCompleted: true,
        },
      ];

      const streak = calculateStreak(sessions, fixedNow);
      expect(streak.currentStreak).toBe(2);
      expect(streak.todayCompleted).toBe(false);
      expect(streak.lastActiveDate).toBe('2026-11-02');
    });

    it('resets current streak to 0 if last session was 2 or more days ago', () => {
      const sessions = [
        {
          id: 3,
          profileId: 'user-1',
          taskId: null,
          sessionType: 'focus',
          startedAt: new Date('2026-10-31T10:00:00.000Z'),
          completedAt: null,
          plannedDurationSeconds: 1500,
          actualDurationSeconds: 1500,
          isInterrupted: false,
          isCompleted: true,
        },
      ];

      const streak = calculateStreak(sessions, fixedNow);
      expect(streak.currentStreak).toBe(0);
      expect(streak.longestStreak).toBe(1);
      expect(streak.todayCompleted).toBe(false);
      expect(streak.lastActiveDate).toBe('2026-10-31');
    });
  });

  describe('calculateFocusStatistics', () => {
    const fixedNow = new Date('2026-11-03T15:00:00.000Z');

    it('calculates totals, averages, and chart breakdown', () => {
      const sessions = [
        {
          id: 1,
          profileId: 'u1',
          taskId: null,
          sessionType: 'focus',
          startedAt: new Date('2026-11-03T10:00:00.000Z'),
          completedAt: null,
          plannedDurationSeconds: 1500,
          actualDurationSeconds: 1500, // 25 mins
          isInterrupted: false,
          isCompleted: true,
        },
        {
          id: 2,
          profileId: 'u1',
          taskId: null,
          sessionType: 'short_break',
          startedAt: new Date('2026-11-03T10:25:00.000Z'),
          completedAt: null,
          plannedDurationSeconds: 300,
          actualDurationSeconds: 300, // 5 mins
          isInterrupted: false,
          isCompleted: true,
        },
        {
          id: 3,
          profileId: 'u1',
          taskId: null,
          sessionType: 'focus',
          startedAt: new Date('2026-11-02T14:00:00.000Z'),
          completedAt: null,
          plannedDurationSeconds: 1500,
          actualDurationSeconds: 900, // 15 mins (interrupted)
          isInterrupted: true,
          isCompleted: false,
        },
      ];

      const stats = calculateFocusStatistics(sessions, 7, fixedNow);

      expect(stats.totalSessions).toBe(3);
      expect(stats.completedSessions).toBe(2);
      expect(stats.interruptedSessions).toBe(1);
      expect(stats.totalFocusMinutes).toBe(40); // 25 + 15
      expect(stats.totalBreakMinutes).toBe(5);
      expect(stats.completionRate).toBe(66.7);
      expect(stats.averageFocusDurationMinutes).toBe(20);
      expect(stats.dailyBreakdown.length).toBe(7);

      const todayBreakdown = stats.dailyBreakdown.find((d) => d.date === '2026-11-03');
      expect(todayBreakdown).toBeDefined();
      expect(todayBreakdown.focusMinutes).toBe(25);
      expect(todayBreakdown.breakMinutes).toBe(5);
      expect(todayBreakdown.completedSessions).toBe(2);
    });
  });

  describe('analyzeSessionPatterns', () => {
    const preferences = {
      focusInterval: 25,
      breakInterval: 5,
      pomodoroCycles: 4,
    };

    it('returns welcome recommendation for new user with 0 sessions', () => {
      const recs = analyzeSessionPatterns([], preferences);
      expect(recs.length).toBe(1);
      expect(recs[0].id).toBe('welcome_first_session');
      expect(recs[0].type).toBe('getting_started');
    });

    it('Acceptance Criteria: recommends shorter breaks if breaks are often ended early', () => {
      const sessions = [
        {
          id: 1,
          profileId: 'u1',
          taskId: null,
          sessionType: 'short_break',
          startedAt: new Date('2026-11-01T10:00:00.000Z'),
          completedAt: null,
          plannedDurationSeconds: 300, // 5 min planned
          actualDurationSeconds: 120, // ended after 2 min
          isInterrupted: true,
          isCompleted: false,
        },
        {
          id: 2,
          profileId: 'u1',
          taskId: null,
          sessionType: 'short_break',
          startedAt: new Date('2026-11-02T10:00:00.000Z'),
          completedAt: null,
          plannedDurationSeconds: 300,
          actualDurationSeconds: 150, // ended after 2.5 min
          isInterrupted: true,
          isCompleted: false,
        },
      ];

      const recs = analyzeSessionPatterns(sessions, preferences);
      const breakRec = recs.find((r) => r.id === 'shorten_break_duration');

      expect(breakRec).toBeDefined();
      expect(breakRec.type).toBe('break_duration');
      expect(breakRec.title).toBe('Shorter Break Recommended');
      expect(breakRec.message).toContain('often end breaks early');
      expect(breakRec.suggestedAction).toEqual({
        type: 'SET_BREAK_INTERVAL',
        target: 'break_interval',
        value: 2,
        currentValue: 5,
        unit: 'minutes',
      });
    });

    it('recommends shorter focus sessions if frequently interrupted', () => {
      const sessions = [
        {
          id: 1,
          profileId: 'u1',
          taskId: null,
          sessionType: 'focus',
          startedAt: new Date('2026-11-01T10:00:00.000Z'),
          completedAt: null,
          plannedDurationSeconds: 1500,
          actualDurationSeconds: 900,
          isInterrupted: true,
          isCompleted: false,
        },
        {
          id: 2,
          profileId: 'u1',
          taskId: null,
          sessionType: 'focus',
          startedAt: new Date('2026-11-02T10:00:00.000Z'),
          completedAt: null,
          plannedDurationSeconds: 1500,
          actualDurationSeconds: 900,
          isInterrupted: true,
          isCompleted: false,
        },
        {
          id: 3,
          profileId: 'u1',
          taskId: null,
          sessionType: 'focus',
          startedAt: new Date('2026-11-03T10:00:00.000Z'),
          completedAt: null,
          plannedDurationSeconds: 1500,
          actualDurationSeconds: 1500,
          isInterrupted: false,
          isCompleted: true,
        },
      ];

      const recs = analyzeSessionPatterns(sessions, preferences);
      const focusRec = recs.find((r) => r.id === 'shorten_focus_duration');

      expect(focusRec).toBeDefined();
      expect(focusRec.type).toBe('focus_duration');
      expect(focusRec.severity).toBe('warning');
      expect(focusRec.suggestedAction.target).toBe('focus_interval');
    });

    it('recommends deepening focus duration for disciplined users with high completion rate', () => {
      const sessions = Array.from({ length: 6 }, (_, i) => ({
        id: i + 1,
        profileId: 'u1',
        taskId: null,
        sessionType: 'focus',
        startedAt: new Date(`2026-11-0${i + 1}T10:00:00.000Z`),
        completedAt: null,
        plannedDurationSeconds: 1500,
        actualDurationSeconds: 1500,
        isInterrupted: false,
        isCompleted: true,
      }));

      const recs = analyzeSessionPatterns(sessions, preferences);
      const lengthenRec = recs.find((r) => r.id === 'lengthen_focus_duration');

      expect(lengthenRec).toBeDefined();
      expect(lengthenRec.suggestedAction.target).toBe('focus_interval');
      expect(lengthenRec.suggestedAction.value).toBe(35);
    });

    it('warns user when skipping breaks between multiple focus sessions', () => {
      const sessions = Array.from({ length: 4 }, (_, i) => ({
        id: i + 1,
        profileId: 'u1',
        taskId: null,
        sessionType: 'focus',
        startedAt: new Date(`2026-11-01T${10 + i}:00:00.000Z`),
        completedAt: null,
        plannedDurationSeconds: 1500,
        actualDurationSeconds: 1500,
        isInterrupted: false,
        isCompleted: true,
      }));

      const recs = analyzeSessionPatterns(sessions, preferences);
      const breakReminder = recs.find((r) => r.id === 'schedule_regular_breaks');

      expect(breakReminder).toBeDefined();
      expect(breakReminder.type).toBe('break_reminder');
      expect(breakReminder.severity).toBe('warning');
    });
  });

  describe('Database Operations', () => {
    it('getUserSessions retrieves sessions from Supabase', async () => {
      const mockRows = [
        {
          id: 1,
          profile_id: 'user-xyz',
          session_type: 'focus',
          planned_duration_seconds: 1500,
          actual_duration_seconds: 1500,
          is_interrupted: false,
          started_at: '2026-11-03T10:00:00.000Z',
        },
      ];
      mockChain.limit.mockResolvedValueOnce({ data: mockRows, error: null });

      const sessions = await getUserSessions('user-xyz', 10);

      expect(supabase.from).toHaveBeenCalledWith('pomodoro_sessions');
      expect(supabase.eq).toHaveBeenCalledWith('profile_id', 'user-xyz');
      expect(sessions.length).toBe(1);
      expect(sessions[0].sessionType).toBe('focus');
    });

    it('getUserPreferences returns defaults when no row exists', async () => {
      mockChain.single.mockResolvedValueOnce({ data: null, error: null });

      const prefs = await getUserPreferences('user-xyz');
      expect(prefs).toEqual({
        focusInterval: 25,
        breakInterval: 5,
        pomodoroCycles: 4,
      });
    });

    it('applyRecommendation updates profiles in Supabase', async () => {
      mockChain.upsert.mockResolvedValueOnce({ error: null });

      const result = await applyRecommendation('user-xyz', {
        target: 'break_interval',
        value: 3,
      });

      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(supabase.upsert).toHaveBeenCalledWith(
        { id: 'user-xyz', break_interval: 3 },
        { onConflict: 'id' },
      );
      expect(result.success).toBe(true);
      expect(result.updatedSettings).toEqual({ breakInterval: 3 });
    });

    it('applyRecommendation rejects invalid targets or values', async () => {
      await expect(
        applyRecommendation('user-xyz', { target: 'invalid_field', value: 5 }),
      ).rejects.toThrow('Invalid preference target');

      await expect(
        applyRecommendation('user-xyz', { target: 'break_interval', value: 0 }),
      ).rejects.toThrow('Value must be an integer between 1 and 180.');
    });

    it('recordSession inserts session into pomodoro_sessions', async () => {
      const row = {
        id: 10,
        profile_id: 'user-xyz',
        session_type: 'focus',
        planned_duration_seconds: 1500,
        actual_duration_seconds: 1500,
        is_interrupted: false,
        started_at: '2026-11-03T10:00:00.000Z',
        completed_at: '2026-11-03T10:25:00.000Z',
      };
      mockChain.single.mockResolvedValueOnce({ data: row, error: null });

      const session = await recordSession('user-xyz', {
        sessionType: 'focus',
        plannedDurationSeconds: 1500,
        actualDurationSeconds: 1500,
        isInterrupted: false,
      });

      expect(supabase.from).toHaveBeenCalledWith('pomodoro_sessions');
      expect(supabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          profile_id: 'user-xyz',
          session_type: 'focus',
          planned_duration_seconds: 1500,
        }),
      );
      expect(session.id).toBe(10);
    });

    it('getTimerInsights combines session fetching and insights generation', async () => {
      mockChain.limit.mockResolvedValueOnce({ data: [], error: null });
      mockChain.single.mockResolvedValueOnce({
        data: { focus_interval: 25, break_interval: 5, pomodoro_cycles: 4 },
        error: null,
      });

      const insights = await getTimerInsights('user-xyz');

      expect(insights).toHaveProperty('recommendations');
      expect(insights).toHaveProperty('statistics');
      expect(insights).toHaveProperty('streak');
      expect(insights).toHaveProperty('preferences');
    });
  });
});
