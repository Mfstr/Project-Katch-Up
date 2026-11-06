import { useCallback, useEffect, useMemo, useState } from 'react';
import { getTasks } from '../services/apiClient.js';
import FocusStatisicsChart from './FocusStatisticsChart.jsx';

function normalizeTasks(task) {
    return {
        id: task?.id ?? task?.taskId,
        title: task?.title ?? task?.name ?? 'Untitled Task',
        description: task?.description ?? '',
        dueDate: task?.dueDate ?? task?.due_date ?? null,
        createdAt: task?.createdAt ?? task?.created_at ?? null,
        isComplete: Boolean(task?.isComplete ?? task?.is_complete ?? false),
        durationSeconds: task?.durationSeconds ?? task?.duration_seconds ?? 20 * 60,
    };
}

const EMPTY_EDIT_FORM = { title: '', description: '', dueDate: '' };
const DAYS_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

function getDateOnly(value) {
    if (!value) return null;

    const datePart = String(value).slice(0, 10);
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day);

    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) {
        return null;
    }

    return date;
}

function getLocalDayNumber(date) {
    return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAYS_IN_MILLISECONDS;
}

function getDaysUntilDue(value) {
    const dueDate = getDateOnly(value);
    if (!dueDate) return null;

    const today = new Date();
    return getLocalDayNumber(dueDate) - getLocalDayNumber(today);
}

function formatDueDate(value) {
    const date = getDateOnly(value);
    return date ? date.toLocaleDateString() : null;
}

function toDateInputValue(value) {
    if (!value) return '';
    const datePart = String(value).slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : '';
}

function getCreatedTimestamp(value) {
    if (!value) return null;
    const timestamp = Date.parse(value);
    return Number.isNaN(timestamp) ? null : timestamp;
}

function compareTasks(a, b, sortBy) {
    if (sortBy === 'created-newest' || sortBy === 'created-oldest') {
        const aCreated = getCreatedTimestamp(a.createdAt);
        const bCreated = getCreatedTimestamp(b.createdAt);

        if (aCreated == null && bCreated != null) return 1;
        if (aCreated != null && bCreated == null) return -1;

        if (aCreated != null && bCreated != null && aCreated !== bCreated) {
            return sortBy === 'created-newest'
                ? bCreated - aCreated
                : aCreated - bCreated;
        }
    } else {
        const aDue = getDateOnly(a.dueDate);
        const bDue = getDateOnly(b.dueDate);

        if (!aDue && bDue) return 1;
        if (aDue && !bDue) return -1;

        if (aDue && bDue) {
            const difference = getLocalDayNumber(aDue) - getLocalDayNumber(bDue);
            if (difference !== 0) return difference;
        }
    }

    return String(a.title).localeCompare(String(b.title), undefined, { sensitivity: 'base'});
}

const TASK_GROUPS = [
    { id: 'overdue', title: 'Overdue', description: 'Tasks that are past their due date' },
    { id: 'today', title: 'Today', description: 'Tasks that are due today' },
    { id: 'upcoming', title: 'Upcoming', description: 'Tasks that are due within a week' },
    { id: 'later', title: 'Later', description: 'Tasks that are due after a week or are without a due date' },
];

function getTaskGroup(task) {
    const daysUntilDue = getDaysUntilDue(task.dueDate);

    if (daysUntilDue == null || daysUntilDue > 7) return 'later';
    if (daysUntilDue < 0) return task.isComplete ? 'later' : 'overdue';
    if (daysUntilDue === 0) return 'today';
    return 'upcoming';
}

const EMPTY_GROUPS = TASK_GROUPS.map((group) => ({ ...group, tasks: [] }));

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
    onLogout,
    calendars = [],
    onOpenCalendarManager = () => {},
}) {
    const [tasks, setTasks] = useState([]);
    const [isLoading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [taskView, setTaskView] = useState('active');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('due-date');
    const [editingTaskId, setEditingTaskId] = useState(null);
    const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);
    const [editError, setEditError] = useState('');

    const loadTasks = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const responseTasks = await getTasks();
            const nextTasks = Array.isArray(responseTasks)
                ? responseTasks.map(normalizeTasks)
                : [];
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

    useEffect(() => { loadTasks(); }, [loadTasks, refreshSignal]);

    const activeTasks = useMemo(
        () => tasks.filter((task) => !task.isComplete), [tasks]
    );

    const completedTasks = useMemo(
        () => tasks.filter((task) => task.isComplete), [tasks]
    );

    const overdueTasks = useMemo(
        () => activeTasks.filter((task) => {
            const daysUntilDue = getDaysUntilDue(task.dueDate);
            return daysUntilDue !== null && daysUntilDue < 0;
        }),
        [activeTasks],
    );

    const visibleTasks = useMemo(() => {
        let result;

        if (taskView === 'completed') {
            result = completedTasks;
        } else if (taskView === 'overdue') {
            result = overdueTasks;
        } else {
            result = activeTasks;
        }

        const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
        if (normalizedQuery) {
            result = result.filter((task) =>
                String(task.title).toLocaleLowerCase().includes(normalizedQuery),
            );
        }

        return [...result].sort((a, b) => compareTasks(a, b, sortBy));
    }, [activeTasks, completedTasks, overdueTasks, searchQuery, sortBy, taskView]);

    const groupedTasks = useMemo(() => {
        if (taskView === 'completed') {
            return [{ id: 'completed', title: 'Completed Tasks', tasks: visibleTasks}];
        }

        const groups = EMPTY_GROUPS.map((group) => ({ ...group, tasks: [] }));
        const groupsById = new Map(groups.map((group) => [group.id, group]));

        visibleTasks.forEach((task) => {
            const groupId = getTaskGroup(task);
            groupsById.get(groupId)?.tasks.push(task);
        });

        return groups.filter((group) => group.tasks.length > 0);
    }, [taskView, visibleTasks]);

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

    const hasSearchQuery = searchQuery.trim().length > 0;

    return (
        <section className="dashboard">
            <div className="dashboard-header">
                <div>
                    <h1 id="dashboard-heading">Your Tasks</h1>
                </div>

                <div className="dashboard-header-actions">
                    <button
                        type="button"
                        className="refresh-tasks"
                        onClick={loadTasks}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Loading...' : 'Refresh Tasks'}
                    </button>
                    <button
                        type="button"
                        className="logout-button"
                        onClick={onLogout}
                    >
                        Log Out
                    </button>
                </div>
            </div>

            <div className="calendar-dashboard-bar">
                <div className="calendar-dashboard-info">
                    <span className="calendar-dashboard-icon">📅</span>
                    <span className="calendar-dashboard-label">
                        <strong>Calendars ({calendars.length}):</strong>{' '}
                        {calendars.length > 0 ? calendars.map((c) => c.name).join(' • ') : 'No external calendar feeds synced'}
                    </span>
                </div>
                <button
                    type="button"
                    className="calendar-dashboard-btn"
                    onClick={onOpenCalendarManager}
                    title="View or add calendars"
                >
                    {calendars.length > 0 ? 'Manage Calendars' : '+ Add Calendar'}
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
                    Active
                </button>
                <button
                    type="button"
                    role="tab"
                    id="completed-tasks-tab"
                    className={`task-view-tab${taskView === 'completed' ? ' is-active' : ''}`}
                    onClick={() => setTaskView('completed')}
                >
                    Completed
                </button>
                <button
                    type="button"
                    role="tab"
                    id="overdue-tasks-tab"
                    className={`task-view-tab${taskView === 'overdue' ? ' is-active' : ''}`}
                    onClick={() => setTaskView('overdue')}
                >
                    Overdue
                </button>
            </div>

            <div className="task-filter-toolbar">
                <label className="task-search-field">
                    <span>Search by Task Title</span>
                    <input
                        type="search"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search your tasks..."
                    />
                </label>

                <label className="task-sort-field">
                    <span>Sort By</span>
                    <select
                        value={sortBy}
                        onChange={(event) => setSortBy(event.target.value)}
                    >
                        <option value="due-date">Due Date (Descending Order)</option>
                        <option value="created-newest">Creation Date (Descending Order)</option>
                        <option value="created-oldest">Creation Date (Ascending Order)</option>
                    </select>
                </label>
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

            <div className="task-list-panel" id="task-list-panel" role="tabpanel">
                {isLoading && (
                    <p className="empty-state" role="status">Loading tasks...</p>
                )}

                {!isLoading && !error && visibleTasks.length === 0 && (
                    <p className="empty-state">
                        {hasSearchQuery
                            ? `No ${taskView} tasks match "${searchQuery.trim()}".`
                            : taskView === 'active'
                                ? 'No active tasks were found.'
                                : taskView === 'completed'
                                    ? 'No completed tasks were found.'
                                    : 'You have no overdue tasks.'}
                    </p>
                )}

                {!isLoading && !error && groupedTasks.map((group) => (
                    <section className={`task-group${group.id === 'overdue-view' ? ' is-overdue-group' : ''}`} key={group.id}>
                        {group.title && (
                            <div className={`task-group-header${group.id === 'overdue-view' ? ' is-overdue' : ''}`}>
                                <div>
                                    <h2>{group.title}</h2>
                                    {group.description && <p>{group.description}</p>}
                                </div>
                                <span className="task-group-count">{group.tasks.length}</span>
                            </div>
                        )}

                        {group.tasks.length === 0 && group.id === 'completed-view' && (
                            <p className="empty-state">
                                {hasSearchQuery
                                    ? `No completed tasks match "${searchQuery.trim()}".`
                                    : 'You have no completed tasks.'}
                            </p>
                        )}

                        {group.tasks.length === 0 && group.id === 'overdue-view' && (
                            <p className="empty-state">
                                {hasSearchQuery
                                    ? `No overdue tasks match "${searchQuery.trim()}".`
                                    : 'You have no overdue tasks.'}
                            </p>
                        )}

                        <div className="task-list" role="list">
                            {group.tasks.map((task, index) => {
                                const dueDate = formatDueDate(task.dueDate);
                                const isSelected = task.id != null && String(selectedTask?.id) === String(task.id);
                                const isDeleting = String(deletingTaskId) === String(task.id) && deletingTaskId !== null;
                                const isUpdating = updatingTaskId != null && String(updatingTaskId) === String(task.id);
                                const isEditing = editingTaskId != null && String(editingTaskId) === String(task.id);
                                const taskKey = task.id ?? `${group.id}-task-${index}`;

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
                    </section>
                ))}
            </div>

            <FocusStatisicsChart />

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