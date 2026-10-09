import {
    useState
} from 'react';

import {
    getNextTask,
} from '../services/apiClient.js';

import StartSessionButton from './StartSessionButton.jsx';
import Dashboard from './Dashboard.jsx';

function getTaskTitle(task) {
    return task?.title ?? task?.name ?? 'Next Task';
}

export default function SmartFocusUI() {
    const [task, setTask] = useState(null);
    const [isActive, setActive] = useState(false);
    const [isLoading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const startSession = async () => {
        setLoading(true);
        setMessage('');
        setError('');

        try {
            const nextTask = await getNextTask();

            if (!nextTask) {
                throw new Error('Next task was not returned from the server.');
            }

            setTask(nextTask);
            setActive(true);
            setMessage(`Session Started: ${getTaskTitle(nextTask)}`);
        } catch (requestError) {
            setError(
                requestError instanceof Error
                ? requestError.message
                : 'Session was unable to start.',
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="smart-focus-ui">
            <div className="smart-focus-session-button">
                <StartSessionButton
                    onClick={startSession}
                    loading={isLoading}
                    disabled={isActive}
                />
            </div>

            {error && (
                <div className="smart-focus-error" role="alert">
                    {error}
                </div>
            )}

            {message && !error && (
                <div className="smart-focus-message" role="status">
                    {message}
                </div>
            )}

            <div className="smart-focus-table-info">
                <Dashboard task={task} />
            </div>
        </main>
    );
}