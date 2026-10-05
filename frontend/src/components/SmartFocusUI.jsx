import {
    useCallback,
    useEffect,
    useState
} from 'react';

import {
    getNextTask,
} from '../services/api.js';

import StartSessionButton from './StartSessionButton.jsx';

function getTaskID(task) {
    return task?.id ?? task?.taskID ?? null;
}

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
            
            const taskID = getTaskID(nextTask);
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


    <main className="smart-focus-ui">
        <div className="smart-focus-session-button">
            <StartSessionButton
                onClick={startSession}
                loading={isLoading}
                disabled={isActive}
            />
        </div>
    </main>
}