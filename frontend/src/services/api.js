const API_BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:5050';

async function request(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        },
    });

    let body = null;
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
        body = await response.json();
    } else if (response.status !== 204){
        body = await response.text();
    }

    if (!response.ok) {
        const message = body && typeof body === 'object' && body.error ? body.error : response.statusText;
        throw new Error(message);
    }

    return body;
}

export async function getNext() {
    return request('/api/tasks/next');
}

export async function startTimer() {
    return request('/api/timer/start', { method: 'POST'});
}

export async function pauseTimer() {
    return request('/api/timer/pause', { method: 'POST'});
}

export async function resetTimer() {
    return request('/api/timer/reset', { method: 'POST'});
}

export async function getTimerStatus() {
    return request('/api/timer/status');
}