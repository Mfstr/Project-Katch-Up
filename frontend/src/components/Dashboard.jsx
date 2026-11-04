import { useCallback, useEffect, useMemo, useState } from 'react';
import { getTasks } from '../services/apiClient.js';

function normalizeTasks(task) {
    return {
        id: task?.id ?? task?.taskId,
        title: task?.title ?? task?.name ?? 'Untitled Task',
        description: task?.description ?? '',
        dueDate: task?.dueDate ?? task?.due_date ?? null,
        isComplete: Boolean(task?.isComplete ?? task?.is_complete ?? false),
        durationSeconds: task?.durationSeconds ?? task?.duration_seconds ?? 20 * 60,
    };
}

const EMPTY_EDIT_FORM = { title: '', description: '', dueDate: '' };

function formatDueDate(value) {
    if (!value) return null;

    const dateValue = typeof value === 'string' ? value.slice(0, 10) : value; 
    const date = new Date(`${dateValue}T00:00:00`);
    if (Number.isNaN(date.getTime())) return null;

    return date.toLocaleDateString();
}

function toDateInputValue(value) {
    if (!value) return '';
    const datePart = String(value).slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : '';
}

export default function Dashboard({
    selectedTask,
    onSelectTask,
    taskSelectionDisabled = false,
    refreshSignal = 0,
    onDeleteTask,
    deletingTaskId = null,
    onUpdateTask,
    updatingTaskId = null,
    taskActionError = '',
    taskActionNotice = '',
    taskActionNoticeFading = false,
    isYoutubePlayerEnabled = true,
}) {
    const [tasks, setTasks] = useState([]);
    const [isLoading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [taskView, setTaskView] = useState('active');
    const [editingTaskId, setEditingTaskId] = useState(null);
    const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);
    const [editError, setEditError] = useState('');

    const loadTasks = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const responseTasks = await getTasks();
            setTasks(responseTasks.map(normalizeTasks));
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

    useEffect(() => { loadTasks(); }, [loadTasks, refreshSignal]);

    const activeTasks = useMemo(() => tasks.filter((task) => !task.isComplete), [tasks]);
    const completedTasks = useMemo(() => tasks.filter((task) => task.isComplete), [tasks]);
    const visibleTasks = taskView === 'completed' ? completedTasks : activeTasks;

    const handleCompletionChange = async (task, isComplete) => {
        if (!onUpdateTask || task.id == null) return;
        await onUpdateTask(task, { is_complete: isComplete });
    };

    const handleEditOpen = (task) => {
        setEditingTaskId(task.id);
        setEditForm({
            title: task.title ?? '',
            description: task.description ?? '',
            dueDate: toDateInputValue(task.dueDate),
        });
        setEditError('');
    };

    const handleEditCancel = () => {
        setEditingTaskId(null);
        setEditForm(EMPTY_EDIT_FORM);
        setEditError('');
    };

    const handleEditSave = async (event,task) => {
        event.preventDefault();

        const title = editForm.title.trim();
        if (!title) {
            setEditError('A task must have a title.');
            return;
        }

        if (!onUpdateTask || task.id == null) {
            setEditError('The task cannot be updated as it has no task ID.');
            return;
        }

        setEditError('');
        const wasUpdated = await onUpdateTask(task, { 
            title,
            description: editForm.description.trim() || null,
            due_date: editForm.dueDate || null,
        });

        if (wasUpdated) handleEditCancel();
    };

    return (
        <section className="dashboard">
            <div className="dashboard-header">
                <div>
                    <h1 id="dashboard-heading">Your Tasks</h1>
                </div>

                <button
                    type="button"
                    className="refresh-tasks"
                    onClick={loadTasks}
                    disabled={isLoading}
                >
                    {isLoading ? 'Loading...' : 'Refresh Tasks'}
                </button>
            </div>

            <div className="task-view-tabs" role="tablist">
                <button
                    type="button"
                    role="tab"
                    id="active-tasks-tab"
                    className={`task-view-tab${taskView === 'active' ? ' is-active' : ''}`}
                    onClick={() => setTaskView('active')}
                >
                    Active <span>{activeTasks.length}</span>
                </button>
                <button
                    type="button"
                    role="tab"
                    id="completed-tasks-tab"
                    className={`task-view-tab${taskView === 'completed' ? ' is-active' : ''}`}
                    onClick={() => setTaskView('completed')}
                >
                    Completed <span>{completedTasks.length}</span>
                </button>
            </div>

            {error && (
                <div className ="dashboard-error" role="alert">
                    {error}
                </div>
            )}

            {taskActionError && (
                <div className="dashboard-error" role="alert">
                    {taskActionError}
                </div>
            )}

            {taskActionNotice && (
                <div className={`dashboard-notice auto-dismiss-notice${taskActionNoticeFading ? ' is-fading' : ''}`} role="status">
                    {taskActionNotice}
                </div>
            )}

            {!isLoading && !error && tasks.length === 0 && (
                <p className="empty-state">No incomplete tasks were found.</p>
            )}

            <div
                className="task-list-panel"
                id="task-list-panel"
                role="tabpanel"
            >
                <div className="task-list" role="list">
                    {!isLoading && !error && visibleTasks.length === 0 && (
                        <p className="empty-state">
                            {taskView === 'active'
                                ? 'No active tasks were found.'
                                : 'No completed tasks were found.'
                            }
                        </p>
                    )}

                    {visibleTasks.map((task, index) => {
                        const dueDate = formatDueDate(task.dueDate);
                        const isSelected = task.id != null && String(selectedTask?.id) === String(task.id);
                        const isDeleting = String(deletingTaskId) === String(task.id) && deletingTaskId !== null;
                        const isUpdating = updatingTaskId != null && String(updatingTaskId) === String(task.id);
                        const isEditing = editingTaskId != null && String(editingTaskId) === String(task.id);
                        const taskKey = task.id ?? `task-${index}`;

                        return (
                            <div className={`task-list-item${task.isComplete ? ' is-complete' : ''}${isSelected ? ' is-selected' : ''}`} key={taskKey} role="listitem">
                                <label className="task-completion-control">
                                    <input
                                        type="checkbox"
                                        checked={task.isComplete}
                                        onChange={(event) => handleCompletionChange(task, event.target.checked)}
                                        disabled={!onUpdateTask || task.id == null || isUpdating || isDeleting}
                                        title={task.isComplete ? 'Reopen Task' : 'Mark as Complete'}
                                    />

                                    <span className="task-completion-indicator"/>
                                </label>
                                
                                <button
                                    type="button"
                                    className={`task-card${isSelected ? ' selected' : ''}${task.isComplete ? ' completed' : ''}`}
                                    onClick={() => onSelectTask?.(task)}
                                    disabled={taskSelectionDisabled || task.isComplete}
                                    title={task.isComplete
                                        ? 'Reopen this task before selecting it for a focus session.'
                                        : taskSelectionDisabled
                                            ? 'Finish or reset the current session before selecting another task.'
                                            : `Select ${task.title}`}
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

                                <div className="task-actions">
                                    <button
                                        type="button"
                                        className="task-edit-button"
                                        onClick={() => isEditing ? handleEditCancel() : handleEditOpen(task)}
                                        disabled={isUpdating || isDeleting}
                                    >
                                        {isEditing ? 'Cancel' : 'Edit'}
                                    </button>
                                    <button
                                        type="button"
                                        className="task-delete-button"
                                        onClick={() => onDeleteTask?.(task)}
                                        disabled={!onDeleteTask || task.id == null || isDeleting || isUpdating}
                                        title={`Delete ${task.title}`}
                                    >
                                        {isDeleting ? 'Deleting...' : 'Delete'}
                                    </button>
                                </div>

                                {isEditing && (
                                    <form className="task-edit-form" onSubmit={(event) => handleEditSave(event, task)}>
                                        <div className="task-edit-grid">
                                            <div className="task-edit-field task-edit-title-field">
                                                <label htmlFor={`edit-task-title-${taskKey}`}>Task Title</label>
                                                <input
                                                    id={`edit-task-title-${taskKey}`}
                                                    type="text"
                                                    value={editForm.title}
                                                    onChange={(event) => setEditForm((current) => ({ ...current, title: event.target.value }))}
                                                    maxLength={120}
                                                    required
                                                />
                                            </div>
                                            <div className="task-edit-field">
                                                <label htmlFor={`edit-task-due-${taskKey}`}>Due Date</label>
                                                <input
                                                    id={`edit-task-due-${taskKey}`}
                                                    type="date"
                                                    value={editForm.dueDate}
                                                    onChange={(event) => setEditForm((current) => ({ ...current, dueDate: event.target.value }))}
                                                />
                                            </div>
                                            <div className="task-edit-field task-edit-description-field">
                                                <label htmlFor={`edit-task-description-${taskKey}`}>Description</label>
                                                <textarea
                                                    id={`edit-task-description-${taskKey}`}
                                                    value={editForm.description}
                                                    onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))}
                                                    rows={2}
                                                />
                                            </div>
                                        </div>

                                        {editError && (
                                            <p className="task-edit-error" role="alert">{editError}</p>
                                        )}

                                        <div className="task-edit-actions">
                                            <button
                                                type="button"
                                                className="task-edit-cancel-button"
                                                onClick={handleEditCancel}
                                                disabled={isUpdating}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                className="task-edit-save-button"
                                                disabled={isUpdating}
                                            >
                                                {isUpdating ? 'Saving...' : 'Save'}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {isYoutubePlayerEnabled && (
                <section className="dashboard-youtube-music">
                    <div className="dashboard-youtube-music-header">
                        <h2 id="dashboard-youtube-music-heading">Lo-fi YouTube Study Stream</h2>
                        <p>Play background music while you work on your tasks.</p>
                    </div>

                    <div className="youtube-player-frame">
                        <iframe
                            src="https://www.youtube-nocookie.com/embed/qGohtGC5Rtk?rel=0&playsinline=1"
                            title="Study With Me 📚 Pomodoro"
                            loading="lazy"
                            referrerPolicy='strict-origin-when-cross-origin'
                            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                        />
                    </div>
                </section>
            )}
        </section>
    );
}