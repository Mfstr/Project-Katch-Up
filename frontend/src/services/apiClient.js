const API_BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:5050';
const AUTH_TOKEN_KEY = 'authToken';

export function getAuthToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
}

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

function normalizeTasks(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.tasks)) return payload.tasks;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
}

export async function getTasks() {
    return normalizeTasks(await apiClient('/api/tasks'));
}

export async function getNextTask() {
    return apiClient('/api/tasks/next');
}

export async function startTimer() {
    return apiClient('/api/timer/start', { method: 'POST'});
}

export async function pauseTimer() {
    return apiClient('/api/timer/pause', { method: 'POST'});
}

export async function resetTimer() {
    return apiClient('/api/timer/reset', { method: 'POST'});
}

export async function getTimerStatus() {
    return apiClient('/api/timer/status');
}

export default apiClient;