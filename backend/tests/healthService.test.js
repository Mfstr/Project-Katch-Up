import { jest } from '@jest/globals';

const mockChain = {
  from: jest.fn(),
  select: jest.fn(),
  limit: jest.fn(),
};

mockChain.from.mockReturnValue(mockChain);
mockChain.select.mockReturnValue(mockChain);

jest.unstable_mockModule('../src/supabaseClient.js', () => ({
  supabase: mockChain,
}));

jest.unstable_mockModule('../src/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
  },
  httpLogger: (_req, _res, next) => next(),
}));

const { pingSupabase, checkReadiness } = await import('../src/healthService.js');

describe('Health & Readiness Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChain.from.mockReturnValue(mockChain);
    mockChain.select.mockReturnValue(mockChain);
  });

  describe('pingSupabase', () => {
    it('returns ok: true when Supabase query succeeds', async () => {
      mockChain.limit.mockResolvedValueOnce({ data: [{ id: 1 }], error: null });

      const result = await pingSupabase();

      expect(mockChain.from).toHaveBeenCalledWith('tasks');
      expect(mockChain.select).toHaveBeenCalledWith('id');
      expect(mockChain.limit).toHaveBeenCalledWith(1);
      expect(result).toEqual({ ok: true });
    });

    it('returns ok: false with error message when Supabase query returns an error', async () => {
      mockChain.limit.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection timeout' },
      });

      const result = await pingSupabase();
      expect(result).toEqual({ ok: false, error: 'Database connection timeout' });
    });

    it('returns ok: false when Supabase call throws an unhandled exception', async () => {
      mockChain.limit.mockRejectedValueOnce(new Error('Network offline'));

      const result = await pingSupabase();
      expect(result).toEqual({ ok: false, error: 'Network offline' });
    });
  });

  describe('checkReadiness', () => {
    it('returns ready status and connected database when ping succeeds', async () => {
      mockChain.limit.mockResolvedValueOnce({ data: [], error: null });

      const result = await checkReadiness();

      expect(result.status).toBe('ready');
      expect(result.database).toBe('connected');
      expect(typeof result.timestamp).toBe('string');
      expect(result.error).toBeUndefined();
    });

    it('returns unavailable status and disconnected database when ping fails', async () => {
      mockChain.limit.mockResolvedValueOnce({
        data: null,
        error: { message: 'Connection refused' },
      });

      const result = await checkReadiness();

      expect(result.status).toBe('unavailable');
      expect(result.database).toBe('disconnected');
      expect(result.error).toBe('Connection refused');
      expect(typeof result.timestamp).toBe('string');
    });
  });
});
