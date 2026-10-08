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

function normalizeTasks(payload) {
    const task = payload?.task ?? payload?.data ?? payload;

    if (!task || typeof task !== 'object') {
        throw new Error('The next-task response did not contain a task.');
    }

    return {
        id: task.id ?? task.taskId,
        title: task.title ?? task.name ?? 'Untitled task',
        description: task.description ?? '',
        dueDate: task.dueDate ?? task.due_date ?? null,
        isComplete: Boolean(task.isComplete ?? task.is_complete),
    };
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
            const nextTask = normalizeTasks(await getNextTask());
            setTask(nextTask);

            setActive(true);
            setMessage(`Session Started: ${nextTask.title}`);
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

    const handleSelectTask = (selectedTask) => {
        setTask(selectedTask);
        setMessage('');
        setError('');
    };

    return (
        <main className="smart-focus-ui">
            <Dashboard
                selectedTask={task}
                onSelectTask={handleSelectTask}
            />
            
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