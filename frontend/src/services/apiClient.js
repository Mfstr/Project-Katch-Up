const API_BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:5050';
const AUTH_TOKEN_KEY = 'authToken';

/**
 * Retrieves the stored JWT authentication token from browser localStorage.
 *
 * @returns {string|null} The stored authentication token, or null if unauthenticated.
 */
export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

/**
 * Universal fetch wrapper for the Project Katch-Up REST API.
 * Automatically attaches Authorization header if user is logged in and handles JSON/text parsing.
 *
 * @param {string} path - API endpoint path (e.g. '/api/tasks').
 * @param {RequestInit} [options={}] - Standard fetch configuration options.
 * @returns {Promise<any>} Parsed response JSON or text body.
 * @throws {Error} If the HTTP response status is not ok (4xx or 5xx).
 */
export async function apiClient(path, options = {}) {
  const authToken = getAuthToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  let body = null;
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    body = await response.json();
  } else if (response.status !== 204) {
    body = await response.text();
  }

  if (!response.ok) {
    const message =
      body && typeof body === 'object' && (body.error || body.message)
        ? body.error || body.message
        : response.statusText || `Request failed with status ${response.status}.`;

    throw new Error(message);
  }

  return body;
}

/**
 * Normalizes task list responses from various array or envelope formats.
 *
 * @param {any} payload - Raw API response payload.
 * @returns {Array<object>} Normalized array of task objects.
 */
function normalizeTasks(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.tasks)) return payload.tasks;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

/**
 * Fetches all non-deleted tasks for the authenticated user.
 *
 * @returns {Promise<Array<object>>} List of task objects.
 */
export async function getTasks() {
  return normalizeTasks(await apiClient('/api/tasks'));
}

/**
 * Creates a new task.
 *
 * @param {object} task - Task details including title, optional description, and dueDate.
 * @returns {Promise<object>} The created task object.
 */
export async function createTask(task) {
  return apiClient('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(task),
  });
}

/**
 * Updates an existing task by its ID.
 *
 * @param {string|number} id - Unique identifier of the task.
 * @param {object} updates - Fields to update on the task.
 * @returns {Promise<object>} The updated task object.
 */
export async function updateTask(id, updates) {
  return apiClient(`/api/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

/**
 * Soft deletes a task by its ID.
 *
 * @param {string|number} id - Unique identifier of the task.
 * @returns {Promise<any>} API response payload.
 */
export async function deleteTask(id) {
  return apiClient(`/api/tasks/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Fetches the next priority task for the authenticated user.
 *
 * @returns {Promise<object|null>} The next scheduled task or null.
 */
export async function getNextTask() {
  return apiClient('/api/tasks/next');
}

/**
 * Starts or resumes the Pomodoro timer.
 *
 * @param {object} [options={}] - Timer options.
 * @param {number} [options.taskId] - Optional ID of the task being worked on.
 * @param {number} [options.durationSeconds] - Optional planned duration override in seconds.
 * @returns {Promise<object>} Response with timer endTime and confirmation message.
 */
export async function startTimer({ taskId, durationSeconds } = {}) {
  return apiClient('/api/timer/start', {
    method: 'POST',
    body: JSON.stringify({ taskId, durationSeconds }),
  });
}

/**
 * Pauses the active Pomodoro timer.
 *
 * @returns {Promise<object>} Response with paused status and remaining seconds.
 */
export async function pauseTimer() {
  return apiClient('/api/timer/pause', { method: 'POST' });
}

/**
 * Completes the active timer phase and advances to the next phase.
 *
 * @returns {Promise<object>} Response containing the next phase.
 */
export async function stopTimer() {
  return apiClient('/api/timer/complete', { method: 'POST' });
}

/**
 * Resets the Pomodoro timer back to initial focus state.
 *
 * @returns {Promise<object>} Confirmation message.
 */
export async function resetTimer() {
  return apiClient('/api/timer/reset', { method: 'POST' });
}

/**
 * Retrieves the current real-time Pomodoro timer status from the server.
 *
 * @returns {Promise<object>} Status object with phase, remainingSeconds, isActive, and endTime.
 */
export async function getTimerStatus() {
  return apiClient('/api/timer/status');
}

/**
 * Signs the user out, invalidates the session, and clears the local auth token.
 *
 * @returns {Promise<void>} Resolves when logout completes.
 */
export async function logout() {
  try {
    await apiClient('/api/auth/logout', { method: 'POST' });
  } finally {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

/**
 * Retrieves timer habit insights, recommendations, and streaks.
 *
 * @param {object} [options={}] - Query options.
 * @param {number} [options.days=7] - Number of trailing days to analyze.
 * @returns {Promise<object>} Timer insights response.
 */
export async function getTimerInsights({ days = 7 } = {}) {
  const query = days ? `?days=${encodeURIComponent(days)}` : '';
  return apiClient(`/api/timer/insights${query}`);
}

/**
 * Applies a productivity recommendation to the user's timer preferences.
 *
 * @param {object} [options={}] - Setting target and value to apply.
 * @param {string} [options.target] - Setting identifier (e.g. 'break_interval').
 * @param {number} [options.value] - New numeric value.
 * @param {object} [options.action] - Optional action object envelope.
 * @returns {Promise<object>} Result confirming the updated settings.
 */
export async function applyTimerInsight({ target, value, action } = {}) {
  return apiClient('/api/timer/insights/apply', {
    method: 'POST',
    body: JSON.stringify({ target, value, action }),
  });
}

/**
 * Records a completed or interrupted Pomodoro session to the database.
 *
 * @param {object} sessionData - Session attributes.
 * @returns {Promise<object>} Persisted session record.
 */
export async function recordTimerSession(sessionData) {
  return apiClient('/api/timer/sessions', {
    method: 'POST',
    body: JSON.stringify(sessionData),
  });
}

/**
 * Fetches recent Pomodoro session history for the authenticated user.
 *
 * @param {object} [options={}] - Query options.
 * @param {number} [options.limit=50] - Maximum sessions to return.
 * @returns {Promise<Array<object>>} List of historical session records.
 */
export async function getTimerSessions({ limit = 50 } = {}) {
  const query = limit ? `?limit=${encodeURIComponent(limit)}` : '';
  return apiClient(`/api/timer/sessions${query}`);
}

/**
 * Fetches user timer interval preferences.
 *
 * @returns {Promise<object>} Object with focusInterval, breakInterval, and pomodoroCycles.
 */
export async function getTimerPreferences() {
  return apiClient('/api/timer/preferences');
}

/**
 * Updates user timer interval preferences.
 *
 * @param {object} preferences - Dictionary of updated preferences.
 * @returns {Promise<object>} Confirmation message and updatedSettings.
 */
export async function updateTimerPreferences(preferences) {
  return apiClient('/api/timer/preferences', {
    method: 'PUT',
    body: JSON.stringify(preferences),
  });
}

export default apiClient;
