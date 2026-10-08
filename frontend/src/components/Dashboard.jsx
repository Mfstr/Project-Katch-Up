import { useCallback, useEffect, useState } from 'react';
import { getTasks } from '../services/apiClient.js';

function normalizeTasks(task) {
    return {
        id: task?.id ?? task?.taskId,
        title: task?.title ?? task?.name ?? 'Untitled Task',
        description: task?.description ?? '',
        dueDate: task?.dueDate ?? task?.due_date ?? null,
        isComplete: Boolean(task?.isComplete ?? task?.is_complete ?? false),
    }
}

function formatDueDate(value) {
    if (!value) return null;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    return date.toLocaleDateString();
}

export default function Dashboard({ selectedTask, onSelectTask }) {
    const [tasks, setTasks] = useState([]);
    const [isLoading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const loadTasks = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const responseTasks = await getTasks();
            const nextTasks = responseTasks.map(normalizeTasks).filter((task) => !task.isComplete);
            setTasks(nextTasks);
        } catch (requestError) {
            setError( 
                requestError instanceof Error
                    ? requestError.message
                    : 'Unable to load tasks.', 
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadTasks(); }, [loadTasks]);

    return (
        <section className="dashboard">
            <div className="dashboard-header">
                <div>
                    <h1 id="dashboard-heading">Your Tasks</h1>
                </div>

                // When I have more time, I can probably make this its own component.
                <button
                    type="button"
                    className="refresh-tasks"
                    onClick={loadTasks}
                    disabled={isLoading}
                >
                    {isLoading ? 'Loading...' : 'Refresh Tasks'}
                </button>
            </div>

            {error && (
                <div className ="dashboard-error" role="alert">
                    {error}
                </div>
            )}

            {!isLoading && !error && tasks.length === 0 && (
                <p className="empty-state">No incomplete tasks were found.</p>
            )}

            <div className="task-list" role="list">
                {tasks.map((task) => {
                    const dueDate = formatDueDate(task.dueDate);
                    const isSelected = selectedTask?.id === task.id;

                    return (
                        <button
                            key={task.id}
                            type="button"
                            className={`task-card${isSelected ? ' selected' : ''}`}
                            onClick={() => onSelectTask?.(task)}
                            role="listitem"
                            >
                                <span className="task-card-title">{task.title}</span>

                                {task.description && (
                                    <span className="task-card-description">
                                        {task.description}
                                    </span>
                                )}

                                {dueDate && (
                                    <span className="task-card-due-date">
                                        Due {dueDate}
                                    </span>
                                )}
                            </button>
                    );
                })}
            </div>
        </section>
    );
}